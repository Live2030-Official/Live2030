import { Injectable, Inject, forwardRef, BadRequestException, NotFoundException, ForbiddenException, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AgoraTokenService } from './agora-token.service';
import { StartRoomDto } from './dto/room.dto';
import { RoomStatus, Role } from '@prisma/client';
import { SignalingGateway } from '../signaling/signaling.gateway';

@Injectable()
export class RoomsService implements OnModuleInit, OnModuleDestroy {
  // Live in-memory rooms registry synced across Mobile & Admin
  private static liveRoomsMap = new Map<string, any>();
  private sweeperTimer?: ReturnType<typeof setInterval>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly agoraTokenService: AgoraTokenService,
    @Inject(forwardRef(() => SignalingGateway))
    private readonly signalingGateway: SignalingGateway,
  ) {}

  /**
   * Host starts a live stream or voice party room
   */
  async startRoom(hostId: string, dto: StartRoomDto) {
    const timestamp = Date.now();
    const isVoice = (dto.roomType || '').toUpperCase() === 'VOICE';
    const prefix = isVoice ? 'voice' : 'live';
    const agoraChannelName = `${prefix}_${hostId.replace(/-/g, '').slice(0, 8)}_${timestamp}`;

    // 1. Terminate any previous active rooms for this hostId to prevent duplicates
    for (const [existingId, existingRoom] of RoomsService.liveRoomsMap.entries()) {
      if (existingRoom.hostId === hostId || existingRoom.host?.id === hostId) {
        existingRoom.status = 'TERMINATED';
        RoomsService.liveRoomsMap.delete(existingId);
      }
    }
    try {
      await this.prisma.liveRoom.updateMany({
        where: { hostId, status: RoomStatus.LIVE },
        data: { status: RoomStatus.TERMINATED, endedAt: new Date() },
      });
    } catch {}

    // 2. Resolve real host details from DTO and DB
    const realDisplayName = dto.hostDisplayName?.trim() || 'Live Broadcaster';
    let hostInfo: any = {
      id: hostId,
      username: realDisplayName.toLowerCase().replace(/\s+/g, '_'),
      displayName: realDisplayName,
      avatarUrl: dto.hostAvatarUrl || null,
      level: 1,
      vipLevel: dto.hostVipLevel || 0,
      customId: dto.hostCustomId || null,
      customNameColor: null,
    };

    // Ensure host exists in DB so foreign key constraint in Prisma succeeds
    try {
      let dbHost: any = await (this.prisma.user as any).findUnique({ where: { id: hostId } });
      if (!dbHost) {
        // Create user in DB so foreign key constraint never fails
        try {
          dbHost = await (this.prisma.user as any).create({
            data: {
              id: hostId,
              username: hostInfo.username,
              displayName: realDisplayName,
              avatarUrl: dto.hostAvatarUrl,
              vipLevel: dto.hostVipLevel || 0,
              customId: dto.hostCustomId || null,
              role: Role.HOST,
              wallet: {
                create: {
                  coins: 0,
                  diamonds: 0,
                },
              },
            },
          });
        } catch {
          // If creation fails (e.g. duplicate username or id conflict), handle gracefully
        }
      } else {
        // DB host found: prioritize the active displayName sent by the mobile user
        if (dto.hostDisplayName && dto.hostDisplayName.trim().length > 0) {
          hostInfo.displayName = dto.hostDisplayName.trim();
          try {
            await (this.prisma.user as any).update({
              where: { id: hostId },
              data: {
                displayName: hostInfo.displayName,
                role: Role.HOST,
                ...(dto.hostAvatarUrl ? { avatarUrl: dto.hostAvatarUrl } : {}),
              },
            });
          } catch {}
        } else {
          hostInfo.displayName = dbHost.displayName || dbHost.username || realDisplayName;
        }
        hostInfo.username = dbHost.username;
        hostInfo.avatarUrl = dto.hostAvatarUrl || dbHost.avatarUrl;
        hostInfo.level = dbHost.level || 1;
        hostInfo.vipLevel = dbHost.vipLevel ?? dto.hostVipLevel ?? 0;
        hostInfo.customId = dbHost.customId || dto.hostCustomId || null;
        hostInfo.customNameColor = dbHost.customNameColor || null;
      }
    } catch {}

    const agoraAuth = this.agoraTokenService.generateRtcToken(
      agoraChannelName,
      0,
      true, // isPublisher = true (Broadcaster)
      86400,
    );

    const title = dto.title || (isVoice ? 'Live Voice Party 🎙️' : 'Live Video Stream 📹');
    const coverUrl = dto.coverUrl || (isVoice
      ? 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400'
      : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400');

    const category = (dto.category || 'ALL').trim().toUpperCase() || 'ALL';
    const language = (dto.language || 'Global').trim() || 'Global';
    const country = (dto.country || 'Global').trim() || 'Global';

    // VIP Room Privileges:
    // - VIP 1+: Lock rooms (PIN protection)
    // - VIP 5+: Hide room from trending / public discovery
    const isLocked = Boolean(dto.isLocked) && (hostInfo.vipLevel >= 1);
    const roomPin = isLocked ? (dto.roomPin?.trim() || null) : null;
    const isTrendingHidden = Boolean(dto.isTrendingHidden) && (hostInfo.vipLevel >= 5);

    // 3. Persist to PostgreSQL database first to ensure single authoritative ID
    let roomId = `${prefix}-${timestamp}`;
    try {
      const dbRoom: any = await (this.prisma.liveRoom as any).create({
        data: {
          hostId,
          title,
          coverUrl,
          agoraChannelName,
          roomType: isVoice ? 'VOICE' : 'VIDEO',
          status: RoomStatus.LIVE,
          startedAt: new Date(),
          isLocked,
          roomPin,
          isTrendingHidden,
          category,
          language,
          country,
        },
      });
      roomId = dbRoom.id;

      await this.prisma.user.update({
        where: { id: hostId },
        data: { role: Role.HOST },
      });
    } catch {
      // Handled gracefully via in-memory registry
    }

    const newRoom = {
      id: roomId,
      hostId,
      hostName: hostInfo.displayName,
      hostDisplayName: hostInfo.displayName,
      hostAvatarUrl: hostInfo.avatarUrl,
      hostCustomId: hostInfo.customId,
      hostVipLevel: hostInfo.vipLevel,
      title,
      coverUrl,
      agoraChannelName,
      roomType: isVoice ? 'VOICE' : 'VIDEO',
      status: 'LIVE',
      currentViewers: 1,
      totalDiamondsEarned: 0,
      occupiedSeats: isVoice ? 1 : 0,
      maxSeats: 8,
      startedAt: new Date().toISOString(),
      isLocked,
      roomPin,
      isTrendingHidden,
      category,
      language,
      country,
      host: hostInfo,
    };

    // Store single entry in map
    RoomsService.liveRoomsMap.set(roomId, newRoom);

    // 4. Broadcast to SignalingGateway and Admin Dashboard + all active mobile clients
    try {
      this.signalingGateway.broadcastAdminTelemetry('stream:started', {
        roomId: newRoom.id,
        title: newRoom.title,
        roomType: newRoom.roomType,
        agoraChannelName: newRoom.agoraChannelName,
        hostId,
        hostName: hostInfo.displayName,
        hostCustomId: hostInfo.customId,
        hostVipLevel: hostInfo.vipLevel,
        isLocked,
      });
      this.signalingGateway.broadcastGlobal('discovery:stream_started', {
        room: newRoom,
      });
    } catch {}

    return { room: newRoom, agora: agoraAuth };
  }

  /**
   * Audience viewer joins an active live room
   */
  async joinRoom(userId: string, roomId: string, requestedChannel?: string, roomPin?: string) {
    // 1. Try resolving room from in-memory map by id or by agoraChannelName
    let room = RoomsService.liveRoomsMap.get(roomId);
    if (!room) {
      for (const r of RoomsService.liveRoomsMap.values()) {
        if (r.id === roomId || r.agoraChannelName === roomId || (requestedChannel && r.agoraChannelName === requestedChannel)) {
          room = r;
          break;
        }
      }
    }

    // 2. If not found in memory, query PostgreSQL Prisma database for active LIVE room
    if (!room) {
      try {
        const dbRoom: any = await (this.prisma.liveRoom as any).findFirst({
          where: {
            OR: [
              { id: roomId },
              { agoraChannelName: roomId },
              ...(requestedChannel ? [{ agoraChannelName: requestedChannel }] : []),
            ],
            status: RoomStatus.LIVE,
          },
          include: {
            host: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
                level: true,
                vipLevel: true,
                customId: true,
                customNameColor: true,
              },
            },
          },
        });

        if (dbRoom) {
          const resolvedName = dbRoom.host?.displayName || dbRoom.host?.username || 'Live Broadcaster';
          room = {
            id: dbRoom.id,
            hostId: dbRoom.hostId,
            hostName: resolvedName,
            hostDisplayName: resolvedName,
            hostAvatarUrl: dbRoom.host?.avatarUrl,
            hostCustomId: dbRoom.host?.customId,
            hostVipLevel: dbRoom.host?.vipLevel || 0,
            title: dbRoom.title,
            coverUrl: dbRoom.coverUrl,
            agoraChannelName: dbRoom.agoraChannelName,
            roomType: dbRoom.roomType,
            status: 'LIVE',
            currentViewers: dbRoom.currentViewers || 1,
            totalDiamondsEarned: 0,
            isLocked: dbRoom.isLocked,
            roomPin: dbRoom.roomPin,
            isTrendingHidden: dbRoom.isTrendingHidden,
            category: dbRoom.category || 'ALL',
            language: dbRoom.language || 'Global',
            country: dbRoom.country || 'Global',
            host: dbRoom.host,
          };
          RoomsService.liveRoomsMap.set(dbRoom.id, room);
        }
      } catch {}
    }

    // 3. Verify Room Lock & PIN protection
    if (room && room.isLocked && room.roomPin) {
      if (room.hostId !== userId && roomPin !== room.roomPin) {
        throw new BadRequestException('LOCKED_ROOM_PIN_REQUIRED: Incorrect or missing room PIN');
      }
    }

    // 4. Resolve target Agora channel name
    const agoraChannelName = room?.agoraChannelName || requestedChannel || (roomId.startsWith('live_') || roomId.startsWith('voice_') ? roomId : `live_${roomId}`);
    
    // 5. Always issue valid Agora Subscriber RTC Token so viewer can join and stream
    const agoraAuth = this.agoraTokenService.generateRtcToken(
      agoraChannelName,
      0,
      false, // isPublisher = false (Audience)
      86400,
    );

    if (room && room.status === 'LIVE') {
      room.currentViewers = (room.currentViewers || 0) + 1;
      return { room, agora: agoraAuth };
    }

    return {
      room: {
        id: roomId,
        title: 'Live Stream Broadcast',
        agoraChannelName,
        roomType: agoraChannelName.startsWith('voice_') ? 'VOICE' : 'VIDEO',
        status: 'LIVE',
        currentViewers: 1,
      },
      agora: agoraAuth,
    };
  }

  /**
   * End room or Admin kill-switch (instant real-time termination across all users)
   */
  async endRoom(hostId: string, roomId: string) {
    // 1. Resolve room details from in-memory map or PostgreSQL Prisma
    let targetRoom = RoomsService.liveRoomsMap.get(roomId);
    if (!targetRoom) {
      for (const r of RoomsService.liveRoomsMap.values()) {
        if (r.id === roomId || r.agoraChannelName === roomId) {
          targetRoom = r;
          break;
        }
      }
    }

    if (!targetRoom) {
      try {
        const dbRoom = await this.prisma.liveRoom.findFirst({
          where: {
            OR: [
              { id: roomId },
              { agoraChannelName: roomId },
            ],
          },
        });
        if (dbRoom) {
          targetRoom = {
            id: dbRoom.id,
            hostId: dbRoom.hostId,
            agoraChannelName: dbRoom.agoraChannelName,
          } as any;
        }
      } catch {}
    }

    const actualDbId = targetRoom?.id || roomId;
    const channelName = targetRoom?.agoraChannelName || (roomId.startsWith('live_') ? roomId : undefined);
    const resolvedHostId = targetRoom?.hostId || hostId;

    // 2. Remove from in-memory map
    RoomsService.liveRoomsMap.delete(actualDbId);
    if (channelName) RoomsService.liveRoomsMap.delete(channelName);
    RoomsService.liveRoomsMap.delete(roomId);

    for (const [id, r] of RoomsService.liveRoomsMap.entries()) {
      if (id === actualDbId || id === roomId || (channelName && r.agoraChannelName === channelName) || (resolvedHostId && resolvedHostId !== 'admin' && r.hostId === resolvedHostId)) {
        r.status = 'TERMINATED';
        RoomsService.liveRoomsMap.delete(id);
      }
    }

    // 2b. Build an end-of-stream summary before terminating the room.
    let summary: any = null;
    try {
      const room = await this.prisma.liveRoom.findFirst({
        where: {
          OR: [
            { id: actualDbId },
            { id: roomId },
            ...(channelName ? [{ agoraChannelName: channelName }] : []),
          ],
        },
      });
      if (room) {
        const endedAt = new Date();
        const durationSeconds = Math.max(
          0,
          Math.floor((endedAt.getTime() - new Date(room.startedAt).getTime()) / 1000),
        );
        const [giftsReceived, newFollowers] = await Promise.all([
          this.prisma.transactionLedger
            .count({ where: { roomId: room.id, type: 'GIFT_TRANSACTION' } })
            .catch(() => 0),
          this.prisma.follow
            .count({ where: { followingId: room.hostId, createdAt: { gte: room.startedAt } } })
            .catch(() => 0),
        ]);
        summary = {
          roomId: room.id,
          title: room.title,
          hostId: room.hostId,
          durationSeconds,
          peakViewers: room.peakViewers,
          viewersAtEnd: room.currentViewers,
          totalDiamondsEarned: room.totalDiamondsEarned,
          giftsReceived,
          newFollowers,
        };
        // Push the summary to the host's personal channel.
        try {
          this.signalingGateway.broadcastToUser(room.hostId, 'stream:summary', summary);
        } catch {}
      }
    } catch {}

    // 3. Update PostgreSQL database
    try {
      await this.prisma.liveRoom.updateMany({
        where: {
          OR: [
            { id: actualDbId },
            { id: roomId },
            ...(channelName ? [{ agoraChannelName: channelName }] : []),
          ],
        },
        data: { status: RoomStatus.TERMINATED, endedAt: new Date() },
      });
    } catch {}

    // 4. Broadcast instant termination across ALL channels, clients, and admin
    try {
      const terminationReason = hostId === 'admin' ? 'This live stream was closed by administrator kill-switch.' : 'Host ended the live broadcast.';

      // Broadcast to room socket rooms
      if (channelName) {
        this.signalingGateway.broadcastRoomTermination(channelName, terminationReason);
      }
      if (actualDbId && actualDbId !== channelName) {
        this.signalingGateway.broadcastRoomTermination(actualDbId, terminationReason);
      }
      if (roomId && roomId !== channelName && roomId !== actualDbId) {
        this.signalingGateway.broadcastRoomTermination(roomId, terminationReason);
      }

      // Telemetry to Admin Dashboard
      this.signalingGateway.broadcastAdminTelemetry('stream:ended', {
        roomId: actualDbId,
        agoraChannelName: channelName,
        hostId: resolvedHostId,
        endedAt: new Date().toISOString(),
      });

      // Global feed removal
      this.signalingGateway.broadcastGlobal('discovery:stream_ended', {
        roomId: actualDbId,
        agoraChannelName: channelName,
      });
    } catch {}

    return { success: true, message: `Room #${roomId} ended successfully.`, summary };
  }

  /**
   * Discovery feed of all currently active live streams & voice party rooms.
   * Supports category / language / country filtering for the mobile discovery pills.
   */
  async getDiscoveryFeed(filters?: { category?: string; language?: string; country?: string; roomType?: string }) {
    const normCategory = filters?.category && filters.category.toUpperCase() !== 'ALL'
      ? filters.category.toUpperCase()
      : undefined;
    const normLanguage = filters?.language && filters.language.toLowerCase() !== 'all' && filters.language.toLowerCase() !== 'global'
      ? filters.language
      : undefined;
    const normCountry = filters?.country && filters.country.toLowerCase() !== 'all' && filters.country.toLowerCase() !== 'global'
      ? filters.country
      : undefined;
    const normRoomType = filters?.roomType && filters.roomType.toUpperCase() !== 'ALL'
      ? filters.roomType.toUpperCase()
      : undefined;

    try {
      const dbRooms: any[] = await (this.prisma.liveRoom as any).findMany({
        where: {
          status: RoomStatus.LIVE,
          isTrendingHidden: false,
          ...(normCategory ? { category: normCategory } : {}),
          ...(normLanguage ? { language: normLanguage } : {}),
          ...(normCountry ? { country: normCountry } : {}),
          ...(normRoomType ? { roomType: normRoomType } : {}),
        },
        orderBy: { currentViewers: 'desc' },
        include: {
          host: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
              level: true,
              vipLevel: true,
              customId: true,
              customNameColor: true,
            },
          },
        },
      });

      // Synchronize in-memory map cleanly with active DB rooms
      const activeDbIds = new Set(dbRooms.map((r) => r.id));
      for (const [id, r] of RoomsService.liveRoomsMap.entries()) {
        if (r.status === 'TERMINATED' || !activeDbIds.has(id)) {
          RoomsService.liveRoomsMap.delete(id);
        }
      }

      for (const r of dbRooms) {
        const existing = RoomsService.liveRoomsMap.get(r.id);
        const resolvedName = existing?.hostDisplayName ||
          existing?.hostName ||
          r.host?.displayName ||
          r.host?.username ||
          existing?.host?.displayName ||
          'Live Broadcaster';
        const resolvedAvatar = existing?.hostAvatarUrl || existing?.host?.avatarUrl || r.host?.avatarUrl;

        RoomsService.liveRoomsMap.set(r.id, {
          ...r,
          hostName: resolvedName,
          hostDisplayName: resolvedName,
          hostAvatarUrl: resolvedAvatar,
          hostCustomId: r.host?.customId || existing?.hostCustomId,
          hostVipLevel: r.host?.vipLevel || existing?.hostVipLevel || 0,
          currentViewers: existing?.currentViewers || r.currentViewers || 1,
          totalDiamondsEarned: existing?.totalDiamondsEarned || 0,
          status: 'LIVE',
          isLocked: r.isLocked || existing?.isLocked || false,
          isTrendingHidden: r.isTrendingHidden || existing?.isTrendingHidden || false,
          host: {
            id: r.host?.id || r.hostId,
            username: r.host?.username,
            displayName: resolvedName,
            avatarUrl: resolvedAvatar,
            level: r.host?.level || 1,
            vipLevel: r.host?.vipLevel || existing?.host?.vipLevel || 0,
            customId: r.host?.customId || existing?.host?.customId,
            customNameColor: r.host?.customNameColor || existing?.host?.customNameColor,
          },
        });
      }
    } catch {
      // fallback to liveRoomsMap
    }

    // Deduplicate by hostId and agoraChannelName so no duplicates EVER exist
    const seen = new Set<string>();
    const activeList: any[] = [];
    for (const r of RoomsService.liveRoomsMap.values()) {
      if (r.status === 'LIVE' && !r.isTrendingHidden) {
        if (normCategory && (r.category || 'ALL').toUpperCase() !== normCategory) continue;
        if (normLanguage && (r.language || 'Global') !== normLanguage) continue;
        if (normCountry && (r.country || 'Global') !== normCountry) continue;
        if (normRoomType && (r.roomType || 'VIDEO').toUpperCase() !== normRoomType) continue;
        const uniqueKey = `${r.hostId || r.host?.id}_${r.agoraChannelName}`;
        if (!seen.has(uniqueKey) && !seen.has(r.id)) {
          seen.add(uniqueKey);
          seen.add(r.id);
          activeList.push(r);
        }
      }
    }

    return activeList;
  }

  /**
   * Audience viewer leaves a room: decrement the live viewer count and
   * persist it so discovery "popular" sorting stays accurate.
   */
  async leaveRoom(roomId: string) {
    let room = RoomsService.liveRoomsMap.get(roomId);
    if (!room) {
      for (const r of RoomsService.liveRoomsMap.values()) {
        if (r.id === roomId || r.agoraChannelName === roomId) {
          room = r;
          break;
        }
      }
    }

    if (room) {
      room.currentViewers = Math.max(0, (room.currentViewers || 1) - 1);
      try {
        await (this.prisma.liveRoom as any).updateMany({
          where: { id: room.id, status: RoomStatus.LIVE },
          data: { currentViewers: room.currentViewers },
        });
      } catch {}
      return { success: true, currentViewers: room.currentViewers };
    }
    return { success: true, currentViewers: 0 };
  }

  // ---------------- Room moderators ----------------

  private async findRoomRecord(roomId: string) {
    return this.prisma.liveRoom.findFirst({
      where: { OR: [{ id: roomId }, { agoraChannelName: roomId }] },
      select: { id: true, hostId: true, moderatorIds: true, status: true },
    });
  }

  async listModerators(roomId: string) {
    const room = await this.findRoomRecord(roomId);
    if (!room) throw new NotFoundException('Room not found');
    const ids = room.moderatorIds || [];
    const users = ids.length
      ? await this.prisma.user.findMany({
          where: { id: { in: ids } },
          select: { id: true, username: true, displayName: true, avatarUrl: true, level: true, vipLevel: true },
        })
      : [];
    return { hostId: room.hostId, moderators: users };
  }

  async addModerator(roomId: string, hostId: string, targetUserId: string) {
    const room = await this.findRoomRecord(roomId);
    if (!room) throw new NotFoundException('Room not found');
    if (room.hostId !== hostId) {
      throw new ForbiddenException('Only the room host can assign moderators.');
    }
    if (!targetUserId || targetUserId === room.hostId) {
      throw new BadRequestException('Invalid moderator target.');
    }
    const moderatorIds = Array.from(new Set([...(room.moderatorIds || []), targetUserId]));
    const updated = await this.prisma.liveRoom.update({
      where: { id: room.id },
      data: { moderatorIds },
      select: { id: true, moderatorIds: true },
    });
    this.signalingGateway?.broadcastRoom(room.id, 'room:moderator_added', {
      roomId: room.id,
      moderatorId: targetUserId,
    });
    return { success: true, moderatorIds: updated.moderatorIds };
  }

  async removeModerator(roomId: string, hostId: string, targetUserId: string) {
    const room = await this.findRoomRecord(roomId);
    if (!room) throw new NotFoundException('Room not found');
    if (room.hostId !== hostId) {
      throw new ForbiddenException('Only the room host can remove moderators.');
    }
    const moderatorIds = (room.moderatorIds || []).filter((id) => id !== targetUserId);
    const updated = await this.prisma.liveRoom.update({
      where: { id: room.id },
      data: { moderatorIds },
      select: { id: true, moderatorIds: true },
    });
    this.signalingGateway?.broadcastRoom(room.id, 'room:moderator_removed', {
      roomId: room.id,
      moderatorId: targetUserId,
    });
    return { success: true, moderatorIds: updated.moderatorIds };
  }

  async canModerate(roomId: string, userId: string): Promise<{ ok: boolean; roomId?: string }> {
    if (!roomId || !userId) return { ok: false };
    const room = await this.findRoomRecord(roomId);
    if (!room) return { ok: false };
    const ok = room.hostId === userId || (room.moderatorIds || []).includes(userId);
    return { ok, roomId: room.id };
  }

  onModuleInit() {
    // Sweeper removes zombie rooms left behind when a host app is force-closed.
    this.sweeper = setInterval(() => {
      this.sweepStaleRooms().catch(() => undefined);
    }, 5 * 60 * 1000);
  }

  onModuleDestroy() {
    if (this.sweeper) clearInterval(this.sweeper);
  }

  private sweeper?: ReturnType<typeof setInterval>;

  private async sweepStaleRooms() {
    try {
      const cutoff = new Date(Date.now() - 12 * 60 * 60 * 1000);
      const stale: any[] = await (this.prisma.liveRoom as any).findMany({
        where: { status: RoomStatus.LIVE, startedAt: { lt: cutoff } },
        select: { id: true },
      });
      if (stale.length > 0) {
        const ids = stale.map((r) => r.id);
        await (this.prisma.liveRoom as any).updateMany({
          where: { id: { in: ids } },
          data: { status: RoomStatus.TERMINATED, endedAt: new Date() },
        });
        for (const id of ids) {
          RoomsService.liveRoomsMap.delete(id);
          this.signalingGateway.broadcastGlobal('discovery:stream_ended', { roomId: id });
        }
      }
    } catch {}
  }
}
