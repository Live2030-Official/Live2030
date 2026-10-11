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
import { Logger, Inject, forwardRef } from '@nestjs/common';
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
    this.logger.log(`⚡ WebSocket client connected: ${client.id}`);
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
    const userId = data?.userId;
    if (!userId) return;
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
  handleTokenRequest(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelName: string; isPublisher?: boolean },
  ) {
    const channelName = data?.channelName || `live_${Date.now()}`;
    const agoraAuth = this.agoraTokenService.generateRtcToken(
      channelName,
      0,
      data?.isPublisher || false,
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
    if (data?.userId) {
      if (!this.userSockets.has(data.userId)) {
        this.userSockets.set(data.userId, new Set());
      }
      this.userSockets.get(data.userId)!.add(client.id);
      this.logger.log(`👤 User socket registered: User ${data.userId} -> Socket ${client.id}`);
      client.emit('user:registered', { userId: data.userId, socketId: client.id });
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
  handleJoinRoom(
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
    const { roomId, userId, displayName, avatarUrl, isVoice } = data;
    if (!roomId) return;

    client.join(roomId);

    if (!this.roomViewers.has(roomId)) {
      this.roomViewers.set(roomId, new Map());
    }

    const vipLevel = Number(data.vipLevel) || 0;
    const isStealth = Boolean(data.stealthRoomAccess) && vipLevel >= 8;

    const viewersMap = this.roomViewers.get(roomId)!;
    viewersMap.set(client.id, {
      odSocketId: client.id,
      userId: userId || `user_${client.id.slice(0, 4)}`,
      displayName: displayName || 'Audience Member',
      avatarUrl,
      vipLevel,
      customId: data.customId,
      level: data.level || 1,
      frameUrl: data.frameUrl,
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
        text: `${data.customId ? `👑 [ID: ${data.customId}] ` : ''}${displayName || 'A viewer'} joined the room! ✨`,
        isSystem: true,
        timestamp: Date.now(),
      });
    }

    // VIP Entrance Animation Effect (VIP 4+)
    if (vipLevel >= 4 && !isStealth) {
      const entryType = data.entryEffectType || (vipLevel >= 8 ? 'HIGHEST' : vipLevel >= 7 ? 'LEGENDARY' : 'SPECIAL');
      this.server.to(roomId).emit('room:vip_entrance', {
        roomId,
        userId,
        displayName,
        customId: data.customId,
        avatarUrl,
        vipLevel,
        badgeColor: data.badgeColor || '#F59E0B',
        frameUrl: data.frameUrl,
        entryEffectType: entryType,
        entryEffectUrl: data.entryEffectUrl,
        timestamp: Date.now(),
      });

      // VIP 8 Global Platform Marquee announcement
      if (vipLevel >= 8) {
        this.server.emit('room:global_marquee', {
          message: `👑 Supreme VIP 8 Sovereign ${data.customId ? `[ID: ${data.customId}] ` : ''}${displayName} has entered the room!`,
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
  handleOccupySeat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; seatIndex: number; user: { id: string; displayName: string; avatarUrl?: string; level?: number } },
  ) {
    const { roomId, seatIndex, user } = data;
    if (!roomId || seatIndex === undefined) return;

    const seats = this.initVoiceSeats(roomId);
    if (seatIndex < 0 || seatIndex >= seats.length) return;

    const targetSeat = seats[seatIndex];
    if (targetSeat.isLocked) {
      client.emit('voice:seat:error', { message: 'This seat is currently locked by the host.' });
      return;
    }

    // Assign user to seat
    targetSeat.user = user;
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
  handleLeaveSeat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; seatIndex: number },
  ) {
    const { roomId, seatIndex } = data;
    if (!roomId || seatIndex === undefined) return;

    const seats = this.initVoiceSeats(roomId);
    if (seatIndex < 0 || seatIndex >= seats.length) return;

    const user = seats[seatIndex].user;
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
  handleMuteSeat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; seatIndex: number; isMuted: boolean },
  ) {
    const { roomId, seatIndex, isMuted } = data;
    if (!roomId || seatIndex === undefined) return;

    const seats = this.initVoiceSeats(roomId);
    if (seatIndex >= 0 && seatIndex < seats.length) {
      seats[seatIndex].isMuted = isMuted;
      this.server.to(roomId).emit('voice:seats:sync', { roomId, seats });
    }
  }

  /**
   * Voice Party: Host locks / unlocks an empty seat
   */
  @SubscribeMessage('voice:seat:lock')
  handleLockSeat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; seatIndex: number; isLocked: boolean },
  ) {
    const { roomId, seatIndex, isLocked } = data;
    if (!roomId || seatIndex === undefined) return;

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
  handleKickSeat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; seatIndex: number },
  ) {
    const { roomId, seatIndex } = data;
    if (!roomId || seatIndex === undefined) return;

    const seats = this.initVoiceSeats(roomId);
    if (seatIndex >= 0 && seatIndex < seats.length) {
      const seatedUser = seats[seatIndex].user as any;
      if (seatedUser && (seatedUser.vipLevel || 0) >= 5) {
        client.emit('voice:seat:action_failed', {
          seatIndex,
          message: `Cannot kick ${seatedUser.displayName || 'Guest'}! User has VIP ${seatedUser.vipLevel} Kick Protection & Immunity! 🛡️`,
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
  @SubscribeMessage('chat:direct')
  handleDirectMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { senderId: string; receiverId: string; content?: string; imageUrl?: string; sender?: any },
  ) {
    if (!data?.receiverId || (!data?.content && !data?.imageUrl)) return;
    const payload = {
      id: `dm_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      senderId: data.senderId,
      receiverId: data.receiverId,
      content: data.content || '',
      imageUrl: data.imageUrl || null,
      sender: data.sender,
      createdAt: new Date().toISOString(),
    };
    this.server.to(`user_${data.receiverId}`).emit('chat:direct', payload);
    this.server.to(`user_${data.senderId}`).emit('chat:direct', payload);
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

    const requesterId = data.requesterId || data.hostId;
    const room = await this.prisma.liveRoom
      .findFirst({
        where: { OR: [{ id: roomId }, { agoraChannelName: roomId }] },
        select: { id: true, hostId: true, moderatorIds: true },
      })
      .catch(() => null);
    if (room) {
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


    // VIP 5+ Kick Protection and VIP 7+ Kick Immunity
    if (vipLevel >= 5) {
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

    const requesterId = data.requesterId || data.hostId;
    const room = await this.prisma.liveRoom
      .findFirst({
        where: { OR: [{ id: roomId }, { agoraChannelName: roomId }] },
        select: { id: true, hostId: true, moderatorIds: true },
      })
      .catch(() => null);
    if (room) {
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

    // VIP 5+ Ban Protection
    if (vipLevel >= 5) {
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
  }

  /**
   * Real-time Gift Send Event via WebSocket (Supports target seat or room host)
   */
  @SubscribeMessage('gift:send')
  handleGiftSend(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; gift: { name: string; coins: number; icon?: string }; sender: { displayName: string; level?: number }; targetSeatIndex?: number },
  ) {
    const { roomId, gift, sender, targetSeatIndex } = data;
    if (!roomId || !gift) return;

    const diamondsAwarded = Math.floor((gift.coins || 10) * 0.42);

    const giftPayload = {
      id: `gift_${Date.now()}`,
      name: gift.name,
      coins: gift.coins,
      diamondsAwarded,
      targetSeatIndex: targetSeatIndex !== undefined ? targetSeatIndex : null,
      sender: {
        id: client.id,
        displayName: sender?.displayName || 'Supporter',
        level: sender?.level || 12,
      },
      timestamp: Date.now(),
    };

    // Broadcast animated gift to every participant in the room
    this.server.to(roomId).emit('gift:broadcast', giftPayload);

    // If active PK Battle, increment score
    this.recordPKScore(roomId, 'host1', diamondsAwarded);

    // Broadcast instant telemetry update to Admin Dashboard WebSocket
    this.broadcastAdminTelemetry('admin:metrics_update', {
      type: 'GIFT_TRANSACTION',
      giftName: gift.name,
      sender: giftPayload.sender.displayName,
      coinsDebited: gift.coins,
      diamondsCredited: diamondsAwarded,
      roomId,
      timestamp: Date.now(),
    });

    // Broadcast into chat
    const targetLabel = targetSeatIndex !== undefined && targetSeatIndex !== null
      ? ` to Seat #${targetSeatIndex}`
      : '';

    this.server.to(roomId).emit('chat:broadcast', {
      id: `msg_gift_${Date.now()}`,
      sender: giftPayload.sender,
      text: `sent luxury gift [${gift.name}]${targetLabel}! 🎉`,
      isGift: true,
      timestamp: Date.now(),
    });

    this.logger.log(`🎁 Gift ${gift.name} (${gift.coins} coins) sent in room ${roomId}`);
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

  @SubscribeMessage('pk:gift')
  handlePKGift(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; targetHost: 'host1' | 'host2'; score: number },
  ) {
    const { roomId, targetHost, score } = data;
    this.recordPKScore(roomId, targetHost, score);
  }

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
