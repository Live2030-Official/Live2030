import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import {
  BadRequestException,
  ForbiddenException,
  Logger,
  Inject,
  UnauthorizedException,
  forwardRef,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { AgoraTokenService } from '../rooms/agora-token.service';
import { UsersService } from '../users/users.service';

interface RoomViewer {
  odSocketId: string;
  userId: string;
  displayName: string;
  avatarUrl?: string;
  vipLevel?: number;
  customId?: string;
  level?: number;
  frameUrl?: string;
  isVerified?: boolean;
  verifiedLabel?: string | null;
  stealthRoomAccess?: boolean;
}

export interface VoiceSeat {
  seatIndex: number;
  user: {
    id: string;
    displayName: string;
    avatarUrl?: string;
    level?: number;
  } | null;
  isMuted: boolean;
  isLocked: boolean;
}

export interface PKBattleState {
  battleId: string;
  room1Id: string;
  room2Id?: string;
  host1: {
    id: string;
    displayName: string;
    avatarUrl?: string;
    level?: number;
  };
  host2: {
    id: string;
    displayName: string;
    avatarUrl?: string;
    level?: number;
  };
  host1Score: number;
  host2Score: number;
  progressHost1: number; // 0 - 100 percentage
  durationSeconds: number;
  remainingSeconds: number;
  status: 'BATTLE' | 'PUNISHMENT' | 'ENDED';
  winnerId: string | null;
  timer?: NodeJS.Timeout;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/live',
})
export class SignalingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(SignalingGateway.name);
  
  // Prohibited dictionary covering vulgarities, severe profanity, hate speech, and illegal activities
  private static readonly PROHIBITED_WORDS = [
    'fuck', 'fucking', 'fucker', 'motherfucker', 'bitch', 'bitches', 'asshole', 'bastard', 'cunt', 'dick', 'pussy', 'whore', 'slut', 'shit',
    'nigger', 'nigga', 'faggot', 'retard', 'kill yourself', 'kys', 'nazi', 'hitler',
    'cocaine', 'heroin', 'meth', 'weed for sale', 'buy drugs', 'ecstasy', 'fentanyl',
    'credit card fraud', 'hack account', 'child porn', 'underage sex', 'terrorist', 'bomb threat',
  ];

  // In-memory room presence registry (backed by Redis in production)
  private readonly roomViewers = new Map<string, Map<string, RoomViewer>>();

  // 8-seat voice party stage registry
  private readonly voiceSeats = new Map<string, VoiceSeat[]>();

  // Active PK Battles mapped by roomId and battleId
  private readonly pkBattles = new Map<string, PKBattleState>();

  // User ID -> Set of Socket IDs mapping for direct notifications
  private readonly userSockets = new Map<string, Set<string>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    @Inject(forwardRef(() => AgoraTokenService))
    private readonly agoraTokenService: AgoraTokenService,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
  ) {}

  handleConnection(client: Socket) {
    // Authenticate the socket handshake so privileged room actions (kick/ban/gifts)
    // can never be spoofed by simply passing somebody else's userId in the payload.
    const token =
      (client.handshake?.auth as any)?.token ||
      (client.handshake?.query as any)?.token ||
      String((client.handshake?.headers as any)?.authorization || '').replace(/^Bearer\s+/i, '');

    if (token) {
      try {
        const payload: any = this.jwtService.verify(token);
        if (payload?.sub) {
          client.data.userId = payload.sub;
          client.data.jwt = payload;
        }
      } catch {
        client.data.userId = undefined;
      }
    }

    this.logger.log(
      `⚡ WebSocket client connected: ${client.id}${client.data?.userId ? ` (auth user ${client.data.userId})` : ' (unauthenticated)'}`,
    );
  }

  /** Returns the authenticated user id bound to this socket, if any. */
  private getAuthenticatedUserId(client: Socket): string | undefined {
    return client.data?.userId || undefined;
  }

  /**
   * Central room access policy shared by the join/token/kick/ban handlers:
   *  - banned users can never enter
   *  - PIN protected rooms require the correct PIN (host always allowed)
   */
  /** Reads a benefit toggle from the admin-configured VIP tier config. */
  private async tierHasFeature(vipLevel: number, featureKey: string): Promise<boolean> {
    if (!vipLevel || vipLevel < 1) return false;
    try {
      const config = await (this.prisma as any).levelConfig.findUnique({ where: { level: vipLevel } });
      const features = (config?.features || {}) as Record<string, boolean | undefined>;
      return features[featureKey] === true;
    } catch {
      return false;
    }
  }

  private async checkRoomAccess(
    roomId: string,
    userId?: string,
    roomPin?: string,
  ): Promise<{ allowed: boolean; message?: string; room?: any }> {
    let room: any = null;
    try {
      room = await this.prisma.liveRoom.findFirst({
        where: { OR: [{ id: roomId }, { agoraChannelName: roomId }] },
        select: {
          id: true,
          hostId: true,
          isLocked: true,
          roomPin: true,
          bannedUserIds: true,
          moderatorIds: true,
        },
      });
    } catch {
      return { allowed: true };
    }
    if (!room) return { allowed: true };

    if (userId && (room.bannedUserIds || []).includes(userId)) {
      return { allowed: false, message: 'You have been banned from this room.', room };
    }
    if (room.isLocked && room.roomPin && room.hostId !== userId) {
      if (String(roomPin || '') !== String(room.roomPin)) {
        return { allowed: false, message: 'LOCKED_ROOM_PIN_REQUIRED', room };
      }
    }
    return { allowed: true, room };
  }

  /** Loads the authoritative (server-side) viewer profile; client payloads cannot spoof VIP level. */
  private async resolveViewerProfile(userId: string | undefined, data: any) {
    let vipLevel = 0;
    let customId: string | undefined = undefined;
    let avatarUrl: string | undefined = undefined;
    let level = 1;
    let customNameColor: string | undefined = undefined;
    let isBanned = false;
    let isVerified = false;
    let verifiedLabel: string | null = null;
    let vipSettings: any = {};

    if (userId) {
      const dbUser = await this.prisma.user
        .findUnique({
          where: { id: userId },
          select: {
            vipLevel: true,
            customId: true,
            avatarUrl: true,
            level: true,
            customNameColor: true,
            isBanned: true,
            isVerified: true,
            verifiedLabel: true,
            vipSettings: true,
            status: true,
            suspensionUntil: true,
          },
        })
        .catch(() => null);
      if (dbUser) {
        vipLevel = (dbUser as any).vipLevel || 0;
        customId = (dbUser as any).customId || undefined;
        avatarUrl = (dbUser as any).avatarUrl || undefined;
        level = (dbUser as any).level || 1;
        customNameColor = (dbUser as any).customNameColor || undefined;
        const suspendedUntil = (dbUser as any).suspensionUntil
          ? new Date((dbUser as any).suspensionUntil).getTime()
          : 0;
        const temporarilySuspended =
          ((dbUser as any).status || '').startsWith('SUSPENDED_') &&
          (!suspendedUntil || suspendedUntil > Date.now());
        isBanned = (dbUser as any).isBanned === true || temporarilySuspended;
        isVerified = (dbUser as any).isVerified === true;
        verifiedLabel = (dbUser as any).verifiedLabel || null;
        vipSettings = ((dbUser as any).vipSettings || {}) as any;
      }
    }

    return {
      vipLevel,
      customId,
      avatarUrl,
      level,
      customNameColor,
      isBanned,
      isVerified,
      verifiedLabel,
      // VIP 8 stealth room access is a per-user privacy setting.
      vipSettingsHidden: vipSettings?.stealthRoomAccess === true,
      // Cosmetic frame/effect data can still come from the client payload.
      frameUrl: data?.frameUrl,
      badgeColor: data?.badgeColor,
      entryEffectType: data?.entryEffectType,
      entryEffectUrl: data?.entryEffectUrl,
    };
  }

  /** True when the user owns the room or is one of its moderators. */
  private async isRoomModerator(roomId: string, userId?: string): Promise<boolean> {
    if (!userId) return false;
    const room = await this.prisma.liveRoom
      .findFirst({
        where: { OR: [{ id: roomId }, { agoraChannelName: roomId }] },
        select: { hostId: true, moderatorIds: true },
      })
      .catch(() => null);
    if (!room) return false;
    return room.hostId === userId || (room.moderatorIds || []).includes(userId);
  }

  /** Removes a viewer from a room (used by kick / ban enforcement). */
  private evictFromRoom(roomId: string, targetUserId: string, reason: string) {
    const viewers = this.roomViewers.get(roomId);
    if (viewers) {
      for (const [socketId, viewer] of viewers.entries()) {
        if (viewer.userId === targetUserId) {
          const socket = this.server?.sockets?.sockets?.get(socketId);
          try {
            socket?.leave(roomId);
            socket?.emit('room:user_removed', { roomId, targetUserId, reason });
          } catch {}
          viewers.delete(socketId);
        }
      }
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`❌ WebSocket client disconnected: ${client.id}`);
    this.removeSocketFromAllRooms(client.id);

    // Clean up user sockets
    for (const [uid, sockets] of this.userSockets.entries()) {
      sockets.delete(client.id);
      if (sockets.size === 0) this.userSockets.delete(uid);
    }
  }

  /**
   * Admin Dashboard WebSocket Subscription
   */
  @SubscribeMessage('admin:join')
  async handleAdminJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data?: { token?: string },
  ) {
    const token =
      data?.token ||
      (client.handshake?.auth as any)?.token ||
      (client.handshake?.query as any)?.token;

    let payload: any;
    try {
      payload = this.jwtService.verify(token);
    } catch {
      client.emit('admin:error', { message: 'Admin authentication required for telemetry.' });
      this.logger.warn(`⛔ Rejected admin:join from ${client.id}: invalid/missing token.`);
      return;
    }

    const user = await this.prisma.user
      .findUnique({ where: { id: payload?.sub } })
      .catch(() => null);
    const isStaffish =
      !!user && ((user as any).isStaff === true || user.role === 'SUPER_ADMIN' || user.role === 'AGENCY_ADMIN');
    if (!isStaffish) {
      client.emit('admin:error', { message: 'This account cannot access admin telemetry.' });
      this.logger.warn(`⛔ Rejected admin:join from ${client.id}: not a staff account.`);
      return;
    }

    client.join('admin_dashboard');
    this.logger.log(`🛡️ Admin dashboard client ${client.id} joined admin_dashboard room.`);
    client.emit('admin:connected', { status: 'CONNECTED', timestamp: Date.now() });
  }

  /**
   * User Personal Notification Channel Subscription (for moderation & direct alerts)
   */
  @SubscribeMessage('user:join')
  handleUserJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string },
  ) {
    const authenticatedId = this.getAuthenticatedUserId(client);
    const userId = authenticatedId || data?.userId;
    if (!userId) return;
    // A socket may only subscribe to its own personal notification channel.
    if (authenticatedId && data?.userId && data.userId !== authenticatedId) {
      client.emit('user:join_failed', { message: 'Cannot subscribe to another user channel.' });
      return;
    }
    client.join(`user_${userId}`);
    let set = this.userSockets.get(userId);
    if (!set) {
      set = new Set();
      this.userSockets.set(userId, set);
    }
    set.add(client.id);
    this.logger.log(`👤 User joined personal notification channel: user_${userId} (socket ${client.id})`);
    client.emit('user:joined', { userId, status: 'CONNECTED', timestamp: Date.now() });
  }

  /**
   * Real-Time WebSocket Token Provider (Ultra-resilient fallback bypassing HTTP)
   */
  @SubscribeMessage('room:token:request')
  async handleTokenRequest(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelName: string; isPublisher?: boolean; roomPin?: string },
  ) {
    const channelName = data?.channelName || `live_${Date.now()}`;
    const userId = this.getAuthenticatedUserId(client);

    const access = await this.checkRoomAccess(channelName, userId, data?.roomPin);
    if (!access.allowed) {
      client.emit('room:token:error', {
        channelName,
        message: access.message || 'You cannot join this room.',
      });
      return;
    }

    // Publishing rights are reserved for the room host and its moderators.
    let isPublisher = Boolean(data?.isPublisher);
    if (isPublisher) {
      const room = access.room;
      const isHost = room && userId && room.hostId === userId;
      const isModerator = room && userId && (room.moderatorIds || []).includes(userId);
      if (!isHost && !isModerator) {
        client.emit('room:token:error', {
          channelName,
          message: 'Only the host or a moderator can publish in this room.',
        });
        return;
      }
    }

    const agoraAuth = this.agoraTokenService.generateRtcToken(
      channelName,
      0,
      isPublisher,
      86400,
    );
    this.logger.log(`⚡ [WebSocket] Issued Agora Token for client ${client.id} in channel ${channelName}`);
    client.emit('room:token:response', {
      channelName,
      agora: agoraAuth,
    });
  }

  /**
   * User Socket Registration (for real-time wallet & notification delivery outside rooms)
   */
  @SubscribeMessage('user:register')
  handleUserRegister(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string },
  ) {
    const authenticatedId = this.getAuthenticatedUserId(client);
    const userId = authenticatedId || data?.userId;
    if (userId) {
      if (authenticatedId && data?.userId && data.userId !== authenticatedId) {
        client.emit('user:register_failed', { message: 'Cannot register another user.' });
        return;
      }
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(client.id);
      this.logger.log(`👤 User socket registered: User ${userId} -> Socket ${client.id}`);
      client.emit('user:registered', { userId, socketId: client.id });
    }
  }

  broadcastAdminTelemetry(event: string, payload: any) {
    try {
      this.server?.to('admin_dashboard').emit(event, payload);
    } catch (e) {
      this.logger.error(`Error broadcasting admin telemetry: ${e}`);
    }
  }

  broadcastRoom(roomId: string, event: string, payload: any) {
    try {
      this.server?.to(roomId).emit(event, payload);
    } catch (e) {
      this.logger.error(`Error broadcasting to room ${roomId}: ${e}`);
    }
  }

  broadcastGlobal(event: string, payload: any) {
    try {
      this.server?.emit(event, payload);
      this.server?.to('admin_dashboard').emit(event, payload);
    } catch (e) {
      this.logger.error(`Error broadcasting global event ${event}: ${e}`);
    }
  }

  broadcastRoomTermination(roomId: string, reason: string = 'Live stream ended') {
    this.broadcastRoom(roomId, 'room:terminated', { roomId, reason });
    this.broadcastGlobal('stream:ended', { roomId, reason });
    this.broadcastGlobal('discovery:stream_ended', { roomId, reason });
  }

  broadcastToUser(userId: string, event: string, payload: any) {
    try {
      const sockets = this.userSockets.get(userId);
      if (sockets && sockets.size > 0) {
        for (const socketId of sockets) {
          this.server?.to(socketId).emit(event, payload);
        }
      }
      // Also emit targeted event with userId
      this.server?.emit(`${event}:${userId}`, payload);
      // And broadcast to admin dashboard
      this.server?.to('admin_dashboard').emit(event, { ...payload, userId });
    } catch (e) {
      this.logger.error(`Error broadcasting to user ${userId}: ${e}`);
    }
  }

  private initVoiceSeats(roomId: string, hostUser?: any): VoiceSeat[] {
    if (!this.voiceSeats.has(roomId)) {
      const seats: VoiceSeat[] = [];
      // Seat 0 is Room Host
      seats.push({
        seatIndex: 0,
        user: hostUser || {
          id: 'host-01',
          displayName: 'Room Host 👑',
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
          level: 25,
        },
        isMuted: false,
        isLocked: false,
      });

      // Seats 1 to 7 are co-hosts
      for (let i = 1; i <= 7; i++) {
        seats.push({
          seatIndex: i,
          user: null,
          isMuted: false,
          isLocked: false,
        });
      }

      this.voiceSeats.set(roomId, seats);
    }
    return this.voiceSeats.get(roomId)!;
  }

  /**
   * Client joins a live room (Video or Voice Party)
   */
  @SubscribeMessage('room:join')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      roomId: string;
      userId: string;
      displayName: string;
      avatarUrl?: string;
      isVoice?: boolean;
      vipLevel?: number;
      customId?: string;
      level?: number;
      stealthRoomAccess?: boolean;
      badgeColor?: string;
      frameUrl?: string;
      entryEffectType?: string;
      entryEffectUrl?: string;
    },
  ) {
    const { roomId, displayName, isVoice } = data;
    if (!roomId) return;

    const authenticatedId = this.getAuthenticatedUserId(client);
    const userId = authenticatedId || data.userId;

    const access = await this.checkRoomAccess(roomId, userId, (data as any).roomPin);
    if (!access.allowed) {
      client.emit('room:join_failed', { roomId, message: access.message || 'Access denied.' });
      this.logger.warn(`⛔ Rejected room:join for ${userId || 'unknown'} in ${roomId}: ${access.message}`);
      return;
    }

    const profile = await this.resolveViewerProfile(userId, data);
    if (profile.isBanned) {
      client.emit('room:join_failed', { roomId, message: 'This account has been suspended.' });
      return;
    }

    const avatarUrl = profile.avatarUrl || data.avatarUrl;
    const customId = profile.customId || data.customId;
    const level = profile.level || data.level || 1;

    client.join(roomId);

    if (!this.roomViewers.has(roomId)) {
      this.roomViewers.set(roomId, new Map());
    }

    // VIP level always comes from the database - never from the client payload.
    const vipLevel = profile.vipLevel;
    const isStealth = vipLevel >= 8 && profile.vipSettingsHidden !== true;

    const viewersMap = this.roomViewers.get(roomId)!;
    viewersMap.set(client.id, {
      odSocketId: client.id,
      userId: userId || `user_${client.id.slice(0, 4)}`,
      displayName: displayName || 'Audience Member',
      avatarUrl,
      vipLevel,
      customId,
      level,
      frameUrl: profile.frameUrl,
      isVerified: profile.isVerified,
      verifiedLabel: profile.verifiedLabel,
      stealthRoomAccess: isStealth,
    });

    const currentViewerCount = viewersMap.size;

    // Track user socket for targeted balance updates
    if (userId) {
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(client.id);
    }

    // Acknowledge join to the sender
    client.emit('room:joined', {
      roomId,
      viewerCount: currentViewerCount,
      timestamp: Date.now(),
    });

    // If active PK Battle is occurring in this room, sync state to new joiner
    const activePK = this.pkBattles.get(roomId);
    if (activePK && activePK.status !== 'ENDED') {
      client.emit('pk:started', {
        battleId: activePK.battleId,
        host1: activePK.host1,
        host2: activePK.host2,
        durationSeconds: activePK.durationSeconds,
        remainingSeconds: activePK.remainingSeconds,
        host1Score: activePK.host1Score,
        host2Score: activePK.host2Score,
        progressHost1: activePK.progressHost1,
        status: activePK.status,
      });
    }

    // If Voice Party room, synchronize current 8-seat stage
    const seats = this.initVoiceSeats(roomId);
    client.emit('voice:seats:sync', { roomId, seats });

    // Broadcast updated viewer count to everyone in the room
    this.server.to(roomId).emit('room:viewer_count', {
      roomId,
      viewerCount: currentViewerCount,
    });

    // System announcement in chat (suppressed if stealth mode VIP 8 is active)
    if (!isStealth) {
      this.server.to(roomId).emit('chat:broadcast', {
        id: `sys_${Date.now()}`,
        sender: {
          id: 'system',
          displayName: 'System',
          level: 99,
        },
        text: `${customId ? `👑 [ID: ${customId}] ` : ''}${displayName || 'A viewer'} joined the room! ✨`,
        isSystem: true,
        timestamp: Date.now(),
      });
    }

    // VIP Entrance Animation Effect (VIP 4+)
    if (vipLevel >= 4 && !isStealth) {
      const entryType = profile.entryEffectType || (vipLevel >= 8 ? 'HIGHEST' : vipLevel >= 7 ? 'LEGENDARY' : 'SPECIAL');
      this.server.to(roomId).emit('room:vip_entrance', {
        roomId,
        userId,
        displayName,
        customId,
        avatarUrl,
        vipLevel,
        badgeColor: profile.badgeColor || profile.customNameColor || '#F59E0B',
        frameUrl: profile.frameUrl,
        entryEffectType: entryType,
        entryEffectUrl: profile.entryEffectUrl,
        timestamp: Date.now(),
      });

      // VIP 8 Global Platform Marquee announcement
      if (vipLevel >= 8) {
        this.server.emit('room:global_marquee', {
          message: `👑 Supreme VIP 8 Sovereign ${customId ? `[ID: ${customId}] ` : ''}${displayName} has entered the room!`,
          vipLevel: 8,
          userId,
          displayName,
        });
      }
    }

    this.logger.log(`👤 User ${displayName} (${client.id}) joined room ${roomId}. Total: ${currentViewerCount} [VIP: ${vipLevel}${isStealth ? ', Stealth Mode' : ''}]`);
  }

  /**
   * Voice Party: Occupy a mic seat (Seat #1 - #7)
   */
  @SubscribeMessage('voice:seat:occupy')
  async handleOccupySeat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; seatIndex: number; user: { id: string; displayName: string; avatarUrl?: string; level?: number } },
  ) {
    const { roomId, seatIndex, user } = data;
    if (!roomId || seatIndex === undefined) return;

    const authenticatedId = this.getAuthenticatedUserId(client);
    const occupantId = authenticatedId || user?.id;
    if (!occupantId) return;

    const access = await this.checkRoomAccess(roomId, occupantId, (data as any).roomPin);
    if (!access.allowed) {
      client.emit('voice:seat:error', { message: access.message || 'Access denied.' });
      return;
    }

    const seats = this.initVoiceSeats(roomId);
    if (seatIndex < 0 || seatIndex >= seats.length) return;

    const targetSeat = seats[seatIndex];
    if (targetSeat.isLocked) {
      client.emit('voice:seat:error', { message: 'This seat is currently locked by the host.' });
      return;
    }

    // A seat can only be taken when it is free - or by the person already sitting there.
    const currentOccupantId = (targetSeat.user as any)?.id;
    if (currentOccupantId && currentOccupantId !== occupantId) {
      const isModerator = await this.isRoomModerator(roomId, occupantId);
      if (!isModerator) {
        client.emit('voice:seat:error', { message: 'This mic seat is already taken.' });
        return;
      }
    }

    // Assign user to seat
    targetSeat.user = {
      id: occupantId,
      displayName: user?.displayName || 'Guest',
      avatarUrl: user?.avatarUrl,
      level: user?.level || 1,
    };
    targetSeat.isMuted = false;

    // Broadcast updated seats to all participants
    this.server.to(roomId).emit('voice:seats:sync', { roomId, seats });

    // Announcement in chat
    this.server.to(roomId).emit('chat:broadcast', {
      id: `seat_${Date.now()}`,
      sender: { id: 'system', displayName: 'System', level: 99 },
      text: `🎤 ${user.displayName} took mic seat #${seatIndex}!`,
      isSystem: true,
      timestamp: Date.now(),
    });

    this.logger.log(`🎤 User ${user.displayName} took seat #${seatIndex} in room ${roomId}`);
  }

  /**
   * Voice Party: Step down from mic seat
   */
  @SubscribeMessage('voice:seat:leave')
  async handleLeaveSeat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; seatIndex: number },
  ) {
    const { roomId, seatIndex } = data;
    if (!roomId || seatIndex === undefined) return;

    const authenticatedId = this.getAuthenticatedUserId(client);
    const seats = this.initVoiceSeats(roomId);
    if (seatIndex < 0 || seatIndex >= seats.length) return;

    const user = seats[seatIndex].user;
    const occupantId = (user as any)?.id;
    if (occupantId && authenticatedId && occupantId !== authenticatedId) {
      const isModerator = await this.isRoomModerator(roomId, authenticatedId);
      if (!isModerator) {
        client.emit('voice:seat:action_failed', {
          seatIndex,
          message: 'You can only step down from your own seat.',
        });
        return;
      }
    }

    seats[seatIndex].user = null;
    seats[seatIndex].isMuted = false;

    this.server.to(roomId).emit('voice:seats:sync', { roomId, seats });

    if (user) {
      this.server.to(roomId).emit('chat:broadcast', {
        id: `seat_leave_${Date.now()}`,
        sender: { id: 'system', displayName: 'System', level: 99 },
        text: `${user.displayName} stepped down from mic #${seatIndex}.`,
        isSystem: true,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Voice Party: Host mutes / unmutes a seat
   */
  @SubscribeMessage('voice:seat:mute')
  async handleMuteSeat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; seatIndex: number; isMuted: boolean },
  ) {
    const { roomId, seatIndex, isMuted } = data;
    if (!roomId || seatIndex === undefined) return;

    const authenticatedId = this.getAuthenticatedUserId(client);
    if (!authenticatedId) {
      client.emit('voice:seat:action_failed', { seatIndex, message: 'Authentication required.' });
      return;
    }

    const seats = this.initVoiceSeats(roomId);
    if (seatIndex < 0 || seatIndex >= seats.length) return;

    // Either the host/moderator, or the person occupying the seat (self-mute).
    const occupantId = (seats[seatIndex].user as any)?.id;
    const isModerator = await this.isRoomModerator(roomId, authenticatedId);
    if (!isModerator && occupantId !== authenticatedId) {
      client.emit('voice:seat:action_failed', {
        seatIndex,
        message: 'Only the host, a moderator or the seat owner can mute this seat.',
      });
      return;
    }

    seats[seatIndex].isMuted = isMuted;
    this.server.to(roomId).emit('voice:seats:sync', { roomId, seats });
  }

  /**
   * Voice Party: Host locks / unlocks an empty seat
   */
  @SubscribeMessage('voice:seat:lock')
  async handleLockSeat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; seatIndex: number; isLocked: boolean },
  ) {
    const { roomId, seatIndex, isLocked } = data;
    if (!roomId || seatIndex === undefined) return;

    const authenticatedId = this.getAuthenticatedUserId(client);
    if (!authenticatedId || !(await this.isRoomModerator(roomId, authenticatedId))) {
      client.emit('voice:seat:action_failed', {
        seatIndex,
        message: 'Only the host or a moderator can lock seats.',
      });
      return;
    }

    const seats = this.initVoiceSeats(roomId);
    if (seatIndex >= 0 && seatIndex < seats.length) {
      seats[seatIndex].isLocked = isLocked;
      if (isLocked) seats[seatIndex].user = null; // Kick if occupied
      this.server.to(roomId).emit('voice:seats:sync', { roomId, seats });
    }
  }

  /**
   * Voice Party: Host kicks user from seat
   */
  @SubscribeMessage('voice:seat:kick')
  async handleKickSeat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; seatIndex: number },
  ) {
    const { roomId, seatIndex } = data;
    if (!roomId || seatIndex === undefined) return;

    const authenticatedId = this.getAuthenticatedUserId(client);
    if (!authenticatedId || !(await this.isRoomModerator(roomId, authenticatedId))) {
      client.emit('voice:seat:action_failed', {
        seatIndex,
        message: 'Only the host or a moderator can remove users from a seat.',
      });
      return;
    }

    const seats = this.initVoiceSeats(roomId);
    if (seatIndex >= 0 && seatIndex < seats.length) {
      const seatedUser = seats[seatIndex].user as any;
      const seatedVipLevel = seatedUser?.id
        ? (await this.prisma.user
            .findUnique({ where: { id: seatedUser.id }, select: { vipLevel: true } })
            .catch(() => null))?.vipLevel || 0
        : seatedUser?.vipLevel || 0;
      const seatKickProtected =
        seatedUser != null &&
        ((await this.tierHasFeature(seatedVipLevel, 'kickProtection')) ||
          (await this.tierHasFeature(seatedVipLevel, 'kickImmunity')));
      if (seatKickProtected) {
        client.emit('voice:seat:action_failed', {
          seatIndex,
          message: `Cannot kick ${seatedUser.displayName || 'Guest'}! User has VIP ${seatedVipLevel} Kick Protection & Immunity! 🛡️`,
        });
        return;
      }
      seats[seatIndex].user = null;
      seats[seatIndex].isMuted = false;
      this.server.to(roomId).emit('voice:seats:sync', { roomId, seats });
    }
  }

  /**
   * Client leaves a live room
   */
  @SubscribeMessage('room:leave')
  handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    const { roomId } = data;
    if (!roomId) return;

    client.leave(roomId);
    this.removeSocketFromRoom(roomId, client.id);
  }

  /**
   * Live chat message broadcast with automated profanity & illegal content moderation
   */
  @SubscribeMessage('chat:send')
  handleChatMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; sender: { id: string; displayName: string; level?: number; avatarUrl?: string }; text: string },
  ) {
    const { roomId, sender, text } = data;
    if (!roomId || !text || text.trim().length === 0) return;

    const rawText = (text || '').trim();
    const imageUrl = (data as any)?.imageUrl || null;
    if (!roomId || (rawText.length === 0 && !imageUrl)) return;

    const lower = rawText.toLowerCase();

    // Check against prohibited dictionary
    const matchedWord = SignalingGateway.PROHIBITED_WORDS.find((pw) => {
      if (pw.includes(' ')) return lower.includes(pw);
      const rootWords = ['fuck', 'bitch', 'cunt', 'nigger', 'nigga', 'faggot', 'whore', 'slut', 'pussy'];
      if (rootWords.includes(pw)) {
        return lower.includes(pw);
      }
      const re = new RegExp(`\\b${pw}\\b`, 'i');
      return re.test(lower);
    });

    if (matchedWord) {
      const offendingUserId = sender?.id || client.id;
      const offendingUserName = sender?.displayName || 'Live User';
      this.logger.warn(`🚨 [SAFETY VIOLATION] Prohibited keyword "${matchedWord}" from user ${offendingUserId} (${offendingUserName}) in room ${roomId}: "${rawText}"`);

      // 1. Automatically file a violation report in the Admin Safety Reports Queue
      const reportId = `rep-${Date.now().toString().slice(-4)}`;
      const report = {
        id: reportId,
        targetType: 'USER',
        targetId: offendingUserId,
        reportedUserId: offendingUserId,
        reportedUserName: offendingUserName,
        reporterId: 'SYSTEM_AI_AUTO_MOD',
        reporterName: 'Automated Room Safety Monitor',
        category: 'PROFANITY_ILLEGAL_CONTENT',
        reason: `Prohibited language / illegal content violation in live room [${roomId}]: "${rawText}" (Detected keyword: "${matchedWord}")`,
        evidenceUrl: `Live Room: ${roomId}`,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      };
      UsersService.reportsMap.set(reportId, report);

      // 2. Persist to the moderation queue (best-effort) & alert Admin Dashboard
      this.prisma.report
        .create({
          data: {
            reporterId: 'SYSTEM_AI_AUTO_MOD',
            reporterName: 'Automated Room Safety Monitor',
            targetType: 'USER',
            targetId: offendingUserId,
            linkedUserId: offendingUserId,
            category: 'PROFANITY_ILLEGAL_CONTENT',
            reason: report.reason,
            evidenceUrl: `Live Room: ${roomId}`,
          },
        })
        .then((saved) => {
          try {
            this.server.to('admin_dashboard').emit('report:new', { ...report, id: saved.id });
          } catch {}
        })
        .catch(() => {});
      try {
        this.server.to('admin_dashboard').emit('admin:safety_violation', {
          reportId,
          userId: offendingUserId,
          userName: offendingUserName,
          roomId,
          text: rawText,
          matchedKeyword: matchedWord,
          timestamp: Date.now(),
        });
      } catch {
        // safe fallback
      }

      // 3. Send immediate warning back to the offending user
      client.emit('chat:warning', {
        message: 'Your message contained prohibited language and has been flagged for platform moderation review.',
        flaggedKeyword: matchedWord,
      });

      // 4. Mask the prohibited word in the room broadcast so other viewers see asterisks
      const maskedText = rawText.replace(new RegExp(matchedWord, 'gi'), '***').slice(0, 200);
      const messagePayload = {
        id: `msg_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        sender: {
          id: offendingUserId,
          displayName: offendingUserName,
          level: sender?.level || 1,
          avatarUrl: sender?.avatarUrl,
        },
        text: maskedText,
        imageUrl,
        timestamp: Date.now(),
        isFlagged: true,
      };

      this.server.to(roomId).emit('chat:broadcast', messagePayload);
      return;
    }

    const sanitizedText = rawText.slice(0, 200);
    const vipLevel = (sender as any)?.vipLevel || 0;
    const customId = (sender as any)?.customId || null;

    const messagePayload = {
      id: `msg_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      sender: {
        id: sender?.id || client.id,
        displayName: sender?.displayName || 'Viewer',
        customId,
        level: sender?.level || 1,
        vipLevel,
        badgeColor: (sender as any)?.badgeColor,
        badgeTitle: (sender as any)?.badgeTitle,
        nameColor: (sender as any)?.nameColor,
        chatBubbleStyle: (sender as any)?.chatBubbleStyle || (vipLevel > 0 ? `vip_bubble_level${vipLevel}` : 'standard'),
        frameUrl: (sender as any)?.frameUrl,
        avatarUrl: sender?.avatarUrl,
      },
      text: sanitizedText,
      imageUrl,
      timestamp: Date.now(),
    };

    this.server.to(roomId).emit('chat:broadcast', messagePayload);

    // VIP 6+ Room Announcement benefit
    if (vipLevel >= 6) {
      this.server.to(roomId).emit('room:vip_announcement', {
        roomId,
        senderId: sender?.id,
        senderName: sender?.displayName,
        customId,
        vipLevel,
        text: sanitizedText,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Real-time 1-on-1 Direct Messaging event broadcast
   */
  /**
   * Subscribe to the personal direct-message channel of the signed-in user.
   * The mobile chat screen emits `chat:join` right after connecting so it can
   * receive live messages; without this handler DMs were never delivered.
   */
  @SubscribeMessage('chat:join')
  handleChatJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId?: string },
  ) {
    const authenticatedId = this.getAuthenticatedUserId(client);
    if (authenticatedId && data?.userId && data.userId !== authenticatedId) {
      client.emit('chat:join_failed', { message: 'Cannot join another user chat channel.' });
      return;
    }
    const userId = authenticatedId || data?.userId;
    if (!userId) return;

    client.join(`user_${userId}`);
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(client.id);
    this.logger.log(`💬 User ${userId} joined the direct-message channel.`);
    client.emit('chat:joined', { userId, timestamp: Date.now() });
  }

  /**
   * Direct messages are persisted and broadcast by the REST endpoint
   * (`POST /api/social/chats/send`) which enforces block rules and VIP privacy.
   * Clients may therefore only READ from this channel - sending over the socket
   * would create messages that bypass moderation and are never stored.
   */
  @SubscribeMessage('chat:direct')
  handleDirectMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { senderId?: string; receiverId?: string; content?: string; imageUrl?: string; sender?: any },
  ) {
    client.emit('chat:direct_rejected', {
      message: 'Direct messages must be sent through POST /api/social/chats/send.',
    });
  }

  /**
   * Kick user from live room with VIP Kick Protection & Immunity
   */
  @SubscribeMessage('room:kick')
  handleKickRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; targetUserId: string; targetUserName?: string; hostId?: string; requesterId?: string },
  ) {
    return this.handleKickAction(client, data);
  }

  private async handleKickAction(
    client: Socket,
    data: { roomId: string; targetUserId: string; targetUserName?: string; hostId?: string; requesterId?: string },
  ) {
    const { roomId, targetUserId, targetUserName } = data;
    if (!roomId || !targetUserId) return;

    const authenticatedId = this.getAuthenticatedUserId(client);
    // The authenticated socket identity wins over anything supplied in the payload.
    const requesterId = authenticatedId || data.requesterId || data.hostId;
    const room = await this.prisma.liveRoom
      .findFirst({
        where: { OR: [{ id: roomId }, { agoraChannelName: roomId }] },
        select: { id: true, hostId: true, moderatorIds: true },
      })
      .catch(() => null);
    if (room) {
      if (!authenticatedId) {
        client.emit('room:kick_failed', {
          targetUserId,
          message: 'Authentication required to moderate a room.',
        });
        return;
      }
      const allowed = requesterId === room.hostId || (room.moderatorIds || []).includes(requesterId);
      if (!allowed) {
        client.emit('room:kick_failed', {
          targetUserId,
          message: 'Only the host or a moderator can remove viewers.',
        });
        return;
      }
      if (targetUserId === room.hostId) {
        client.emit('room:kick_failed', {
          targetUserId,
          message: 'The room host cannot be removed.',
        });
        return;
      }
    }

    const targetUser = await this.prisma.user
      .findUnique({ where: { id: targetUserId }, select: { vipLevel: true } })
      .catch(() => null);
    const user = targetUser || UsersService.usersMap.get(targetUserId);
    const vipLevel = user?.vipLevel || 0;


    // Kick protection / immunity is a per-tier admin-configurable VIP benefit.
    const hasKickProtection =
      (await this.tierHasFeature(vipLevel, 'kickProtection')) ||
      (await this.tierHasFeature(vipLevel, 'kickImmunity'));
    if (hasKickProtection) {
      client.emit('room:kick_failed', {
        targetUserId,
        message: `Kick action rejected! ${targetUserName || 'User'} has VIP ${vipLevel} Kick Protection & Immunity! 👑`,
      });
      return;
    }

    this.server.to(roomId).emit('room:user_kicked', {
      roomId,
      targetUserId,
      message: `${targetUserName || 'A viewer'} was kicked from the stream.`,
    });

    // Actually remove the viewer from the room instead of only announcing it.
    this.evictFromRoom(roomId, targetUserId, 'kicked');
  }

  /**
   * Ban user from commenting with VIP Ban Protection
   */
  @SubscribeMessage('room:ban')
  handleRoomBan(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; targetUserId: string; targetUserName?: string; hostId?: string; requesterId?: string },
  ) {
    return this.handleBanAction(client, data);
  }

  private async handleBanAction(
    client: Socket,
    data: { roomId: string; targetUserId: string; targetUserName?: string; hostId?: string; requesterId?: string },
  ) {
    const { roomId, targetUserId, targetUserName } = data;
    if (!roomId || !targetUserId) return;

    const authenticatedId = this.getAuthenticatedUserId(client);
    const requesterId = authenticatedId || data.requesterId || data.hostId;
    const room = await this.prisma.liveRoom
      .findFirst({
        where: { OR: [{ id: roomId }, { agoraChannelName: roomId }] },
        select: { id: true, hostId: true, moderatorIds: true },
      })
      .catch(() => null);
    if (room) {
      if (!authenticatedId) {
        client.emit('room:ban_failed', {
          targetUserId,
          message: 'Authentication required to moderate a room.',
        });
        return;
      }
      const allowed = requesterId === room.hostId || (room.moderatorIds || []).includes(requesterId);
      if (!allowed) {
        client.emit('room:ban_failed', {
          targetUserId,
          message: 'Only the host or a moderator can mute viewers.',
        });
        return;
      }
    }

    const targetUser = await this.prisma.user
      .findUnique({ where: { id: targetUserId }, select: { vipLevel: true } })
      .catch(() => null);
    const user = targetUser || UsersService.usersMap.get(targetUserId);
    const vipLevel = user?.vipLevel || 0;

    // Ban protection is a per-tier admin-configurable VIP benefit.
    const hasBanProtection = await this.tierHasFeature(vipLevel, 'banProtection');
    if (hasBanProtection) {
      client.emit('room:ban_failed', {
        targetUserId,
        message: `Ban action rejected! ${targetUserName || 'User'} has VIP ${vipLevel} Ban Protection! 👑`,
      });
      return;
    }

    this.server.to(roomId).emit('room:user_banned', {
      roomId,
      targetUserId,
      message: `${targetUserName || 'A viewer'} has been muted/banned by stream moderator.`,
    });

    // Persist the ban so it survives a backend restart and blocks re-entry.
    if (room?.id) {
      await this.prisma.liveRoom
        .update({
          where: { id: room.id },
          data: { bannedUserIds: { push: targetUserId } },
        })
        .catch(() => null);
    }

    // Remove the banned viewer from the room immediately.
    this.evictFromRoom(roomId, targetUserId, 'banned');
  }

  /**
   * Room reaction (heart emoji).
   *
   * Gifts are intentionally NOT handled over the socket any more: the legacy
   * `gift:send` event credited diamonds without ever debiting the sender's
   * wallet (free-gift exploit). The authoritative path is `POST /api/gifts/send`,
   * which deducts the balance atomically and then broadcasts the animation,
   * the PK score and the wallet updates.
   */
  @SubscribeMessage('reaction:heart')
  handleReactionHeart(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    const roomId = data?.roomId;
    if (!roomId) return;

    const viewer = this.roomViewers.get(roomId)?.get(client.id);
    this.server.to(roomId).emit('reaction:heart', {
      roomId,
      userId: viewer?.userId || this.getAuthenticatedUserId(client) || null,
      displayName: viewer?.displayName || 'Viewer',
      avatarUrl: viewer?.avatarUrl || null,
      timestamp: Date.now(),
    });
  }

  // ==========================================
  // ⚔️ 1v1 PK BATTLE SHOWDOWN ENGINE
  // ==========================================

  /**
   * Get list of active viewers joined in a live room (for inviting to PK Battle)
   */
  @SubscribeMessage('room:viewers:get')
  handleGetRoomViewers(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; excludeUserId?: string },
  ) {
    const { roomId, excludeUserId } = data || {};
    const viewers: any[] = [];
    if (roomId) {
      let viewersMap = this.roomViewers.get(roomId);
      if (!viewersMap) {
        // Check if matching by channel name or id
        for (const [key, map] of this.roomViewers.entries()) {
          if (key === roomId || key.includes(roomId) || roomId.includes(key)) {
            viewersMap = map;
            break;
          }
        }
      }

      if (viewersMap) {
        for (const [sId, v] of viewersMap.entries()) {
          if (excludeUserId && v.userId === excludeUserId) continue;
          if (v.stealthRoomAccess) continue; // VIP 8 Stealth Mode: invisible in room viewers list
          viewers.push({
            socketId: sId,
            userId: v.userId,
            displayName: v.displayName || 'Audience Member',
            avatarUrl: v.avatarUrl,
            vipLevel: v.vipLevel || 0,
            customId: v.customId || null,
            level: v.level || 1,
            frameUrl: v.frameUrl,
            isVerified: v.isVerified === true,
            verifiedLabel: v.verifiedLabel || null,
          });
        }
        // VIP members sorted to top of viewer list
        viewers.sort((a, b) => (b.vipLevel || 0) - (a.vipLevel || 0));
      }
    }
    client.emit('room:viewers:data', { roomId: roomId || '', viewers });
  }

  /**
   * Host sends 1v1 PK Battle Invitation to an in-room viewer
   */
  @SubscribeMessage('pk:invite:send')
  handlePKInviteSend(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      roomId: string;
      host: { id: string; displayName: string; avatarUrl?: string; level?: number };
      targetUserId: string;
      targetSocketId?: string;
    },
  ) {
    const { roomId, host, targetUserId, targetSocketId } = data;
    if (!roomId || !targetUserId) return;

    this.logger.log(`⚔️ Host ${host.displayName} inviting user ${targetUserId} to PK Battle in room ${roomId}`);

    const invitation = {
      invitationId: `pkinv_${Date.now()}`,
      roomId,
      host,
      timestamp: Date.now(),
    };

    let delivered = false;

    // Send to target socket ID if provided and alive
    if (targetSocketId && this.server?.sockets?.sockets?.has(targetSocketId)) {
      this.server.to(targetSocketId).emit('pk:invite:received', invitation);
      delivered = true;
    }

    // Also look up in userSockets map
    const sockets = this.userSockets.get(targetUserId);
    if (sockets && sockets.size > 0) {
      for (const sId of sockets) {
        this.server?.to(sId).emit('pk:invite:received', invitation);
        delivered = true;
      }
    }

    // Fallback: check roomViewers for the target user ID
    if (!delivered) {
      const viewersMap = this.roomViewers.get(roomId);
      if (viewersMap) {
        for (const [sId, v] of viewersMap.entries()) {
          if (v.userId === targetUserId) {
            this.server?.to(sId).emit('pk:invite:received', invitation);
            delivered = true;
          }
        }
      }
    }

    if (delivered) {
      client.emit('pk:invite:sent', { success: true, targetUserId, invitationId: invitation.invitationId });
    } else {
      client.emit('pk:invite:error', { message: 'Target user is no longer connected to this stream.' });
    }
  }

  /**
   * Invited viewer responds to 1v1 PK Battle Invitation (Accept or Decline)
   */
  @SubscribeMessage('pk:invite:respond')
  handlePKInviteRespond(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      roomId: string;
      invitationId?: string;
      accepted: boolean;
      host: { id: string; displayName: string; avatarUrl?: string; level?: number };
      rival: { id: string; displayName: string; avatarUrl?: string; level?: number };
    },
  ) {
    const { roomId, accepted, host, rival } = data;
    if (!roomId) return;

    this.logger.log(`⚔️ PK Invite response in ${roomId}: accepted=${accepted} by ${rival?.displayName}`);

    if (!accepted) {
      // Notify host and room that invitation was declined
      if (host?.id) {
        this.broadcastToUser(host.id, 'pk:invite:declined', {
          roomId,
          rival,
          message: `${rival?.displayName || 'Viewer'} declined your PK Battle challenge.`,
        });
      }
      this.server.to(roomId).emit('pk:invite:declined', {
        roomId,
        rival,
        message: `${rival?.displayName || 'Viewer'} declined the PK Battle challenge.`,
      });
      return;
    }

    // Accepted! Start PK Battle immediately with the actual host and actual rival
    this.handlePKStart(client, {
      roomId,
      host,
      rival,
      durationSeconds: 180,
    });
  }

  /**
   * Start a 1v1 PK Battle Showdown
   */
  @SubscribeMessage('pk:start')
  handlePKStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: {
      roomId: string;
      host: { id: string; displayName: string; avatarUrl?: string; level?: number };
      rival?: { id: string; displayName: string; avatarUrl?: string; level?: number };
      durationSeconds?: number;
    },
  ) {
    const { roomId, host, rival, durationSeconds = 180 } = data;
    if (!roomId) return;

    // End existing battle if active
    this.endPKBattle(roomId, false);

    const battleId = `pk_${Date.now()}`;
    const rivalHost = rival || {
      id: 'rival_champion',
      displayName: 'Valkyrie Queen 👑',
      avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200',
      level: 38,
    };

    const battle: PKBattleState = {
      battleId,
      room1Id: roomId,
      host1: host || { id: 'host1', displayName: 'Broadcaster 1', level: 25 },
      host2: rivalHost,
      host1Score: 0,
      host2Score: 0,
      progressHost1: 50,
      durationSeconds,
      remainingSeconds: durationSeconds,
      status: 'BATTLE',
      winnerId: null,
    };

    // 1-second countdown interval
    battle.timer = setInterval(() => {
      battle.remainingSeconds--;
      if (battle.remainingSeconds <= 0) {
        this.finishPKBattle(roomId);
      } else {
        this.server.to(roomId).emit('pk:tick', {
          battleId: battle.battleId,
          remainingSeconds: battle.remainingSeconds,
          status: battle.status,
          host1Score: battle.host1Score,
          host2Score: battle.host2Score,
          progressHost1: battle.progressHost1,
        });
      }
    }, 1000);

    this.pkBattles.set(roomId, battle);
    this.pkBattles.set(battleId, battle);

    this.server.to(roomId).emit('pk:started', {
      battleId,
      host1: battle.host1,
      host2: battle.host2,
      durationSeconds: battle.durationSeconds,
      remainingSeconds: battle.remainingSeconds,
      host1Score: 0,
      host2Score: 0,
      progressHost1: 50,
      status: 'BATTLE',
    });

    this.broadcastAdminTelemetry('pk:battle_active', {
      battleId,
      roomId,
      host1: battle.host1.displayName,
      host2: battle.host2.displayName,
    });

    this.logger.log(`⚔️ PK Battle ${battleId} started between ${battle.host1.displayName} and ${battle.host2.displayName}`);
  }

  private finishPKBattle(roomId: string) {
    const battle = this.pkBattles.get(roomId);
    if (!battle) return;

    if (battle.timer) clearInterval(battle.timer);

    let winnerId: string | null = null;
    let winnerName = 'Draw 🤝';
    if (battle.host1Score > battle.host2Score) {
      winnerId = battle.host1.id;
      winnerName = battle.host1.displayName;
    } else if (battle.host2Score > battle.host1Score) {
      winnerId = battle.host2.id;
      winnerName = battle.host2.displayName;
    }

    battle.status = 'PUNISHMENT';
    battle.winnerId = winnerId;
    battle.remainingSeconds = 60; // 60s penalty phase

    this.server.to(roomId).emit('pk:ended', {
      battleId: battle.battleId,
      winnerId,
      winnerName,
      isDraw: winnerId === null,
      host1Score: battle.host1Score,
      host2Score: battle.host2Score,
      punishmentSeconds: 60,
    });

    this.logger.log(`🏁 PK Battle ended in room ${roomId}. Winner: ${winnerName} (${battle.host1Score} vs ${battle.host2Score})`);

    // Punishment phase 60s countdown
    battle.timer = setInterval(() => {
      battle.remainingSeconds--;
      if (battle.remainingSeconds <= 0) {
        this.endPKBattle(roomId, true);
      } else {
        this.server.to(roomId).emit('pk:punishment_tick', {
          battleId: battle.battleId,
          punishmentSeconds: battle.remainingSeconds,
        });
      }
    }, 1000);
  }

  endPKBattle(roomId: string, notify = true) {
    const battle = this.pkBattles.get(roomId);
    if (!battle) return;

    if (battle.timer) clearInterval(battle.timer);
    this.pkBattles.delete(roomId);
    this.pkBattles.delete(battle.battleId);

    if (notify) {
      this.server.to(roomId).emit('pk:closed', { battleId: battle.battleId });
    }
  }

  @SubscribeMessage('pk:close')
  handlePKClose(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string }) {
    if (data?.roomId) {
      this.endPKBattle(data.roomId, true);
      this.broadcastAdminTelemetry('pk:battle_ended', {
        roomId: data.roomId,
        status: 'CLOSED',
        timestamp: Date.now(),
      });
    }
  }

  /**
   * PK scores are only ever increased by the server through `recordPKScore()`
   * after a real gift transaction - clients cannot award themselves points.
   */

  recordPKScore(roomId: string, targetHost: 'host1' | 'host2', score: number) {
    const battle = this.pkBattles.get(roomId);
    if (!battle || battle.status !== 'BATTLE') return;

    if (targetHost === 'host1') {
      battle.host1Score += score;
    } else {
      battle.host2Score += score;
    }

    const total = battle.host1Score + battle.host2Score;
    if (total > 0) {
      battle.progressHost1 = Math.round((battle.host1Score / total) * 100);
    }

    this.server.to(roomId).emit('pk:score_update', {
      battleId: battle.battleId,
      host1Score: battle.host1Score,
      host2Score: battle.host2Score,
      progressHost1: battle.progressHost1,
    });
  }

  /**
   * Emergency Admin Kill-Switch / Stream Termination
   */
  @SubscribeMessage('room:terminate')
  async handleAdminTerminate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; reason?: string },
  ) {
    const { roomId, reason } = data;
    if (!roomId) return;

    this.logger.warn(`🚨 Admin terminating live room ${roomId}: ${reason}`);

    try {
      await this.prisma.liveRoom.updateMany({
        where: { id: roomId },
        data: {
          status: 'TERMINATED',
          endedAt: new Date(),
        },
      });
    } catch {
      // ignore
    }

    this.server.to(roomId).emit('room:terminated', {
      roomId,
      reason: reason || 'Violation of platform community safety policies.',
      timestamp: Date.now(),
    });

    this.server.to(roomId).emit('stream:ended', {
      roomId,
      reason: reason || 'Violation of platform community safety policies.',
      timestamp: Date.now(),
    });

    this.broadcastGlobal('discovery:stream_ended', { roomId });

    this.roomViewers.delete(roomId);
    this.voiceSeats.delete(roomId);
  }

  /**
   * Broadcaster ends live room via WebSocket
   */
  @SubscribeMessage('stream:ended')
  async handleStreamEnded(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; hostId?: string; reason?: string },
  ) {
    const { roomId, reason } = data;
    if (!roomId) return;
    this.logger.log(`🛑 Broadcaster ended live room ${roomId}`);
    try {
      await this.prisma.liveRoom.updateMany({
        where: {
          OR: [{ id: roomId }, { agoraChannelName: roomId }],
        },
        data: {
          status: 'TERMINATED',
          endedAt: new Date(),
        },
      });
    } catch {}
    this.broadcastRoomTermination(roomId, reason || 'Host ended the live broadcast.');
    this.roomViewers.delete(roomId);
    this.voiceSeats.delete(roomId);
  }

  private removeSocketFromRoom(roomId: string, socketId: string) {
    const viewersMap = this.roomViewers.get(roomId);
    if (!viewersMap) return;

    viewersMap.delete(socketId);
    const remainingCount = viewersMap.size;

    this.server.to(roomId).emit('room:viewer_count', {
      roomId,
      viewerCount: remainingCount,
    });

    if (remainingCount === 0) {
      this.roomViewers.delete(roomId);
    }
  }

  private removeSocketFromAllRooms(socketId: string) {
    for (const [roomId, viewersMap] of this.roomViewers.entries()) {
      if (viewersMap.has(socketId)) {
        this.removeSocketFromRoom(roomId, socketId);
      }
    }
  }
}
