import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef, Logger } from '@nestjs/common';
import { usdToSarRate } from '../../common/pricing.config';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateUserStatusDto, AdjustWalletDto, UpdateProfileDto, CreateReportDto, ReportActionDto, SetVerificationDto } from './dto/user.dto';
import { SignalingGateway } from '../signaling/signaling.gateway';
import { TransactionType } from '@prisma/client';

@Injectable()
export class UsersService {
  private readonly logger = new Logger('UsersService');
  // In-memory master users registry synced with Admin Dashboard & Mobile App
  public static usersMap = new Map<string, any>();
  public static reportsMap = new Map<string, any>();

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => SignalingGateway))
    private readonly signalingGateway?: SignalingGateway,
  ) {
    UsersService.seedInitialUsers();
    UsersService.seedInitialReports();
  }

  private static seedInitialUsers() {
    // Zero dummy data. Only real registered users from PostgreSQL are loaded.
  }

  private static seedInitialReports() {
    // Zero dummy reports. Only real reports submitted by platform users are loaded.
  }

  /**
   * Search & filter users for Admin Management Console
   */
  async getAdminUsersList(search?: string, role?: string, status?: string) {
    try {
      const dbUsers = await this.prisma.user.findMany({
        include: {
          wallet: true,
          agencyBinding: {
            include: { agency: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      
      for (const dbUser of dbUsers) {
        const existing = UsersService.usersMap.get(dbUser.id);
        const agency = dbUser.agencyBinding?.agency
          ? {
              id: dbUser.agencyBinding.agency.id,
              name: dbUser.agencyBinding.agency.name,
              code: dbUser.agencyBinding.agency.code,
              commissionPercent: dbUser.agencyBinding.agency.commissionPercent,
              status: dbUser.agencyBinding.status,
              boundAt: dbUser.agencyBinding.boundAt ? dbUser.agencyBinding.boundAt.toISOString() : undefined,
            }
          : undefined;

        // Compute current moderation status & check auto-expiry (DB is the source of truth).
        let userStatus = (dbUser as any).status || existing?.status || (dbUser.isBanned ? 'BANNED' : 'ACTIVE');
        let suspensionUntil = (dbUser as any).suspensionUntil
          ? new Date((dbUser as any).suspensionUntil).toISOString()
          : existing?.suspensionUntil || null;
        let suspensionReason = (dbUser as any).suspensionReason || existing?.suspensionReason || null;

        if (dbUser.isBanned) {
          userStatus = 'BANNED';
          suspensionUntil = null;
        } else if (userStatus.startsWith('SUSPENDED_')) {
          const expireMs = suspensionUntil ? new Date(suspensionUntil).getTime() : 0;
          if (!suspensionUntil || Date.now() >= expireMs) {
            // Suspension has elapsed (or was stored without an expiry): auto-restore to ACTIVE.
            userStatus = 'ACTIVE';
            suspensionUntil = null;
            suspensionReason = null;
            this.prisma.user
              .update({
                where: { id: dbUser.id },
                data: { status: 'ACTIVE', suspensionUntil: null, suspensionReason: null },
              })
              .catch(() => null);
          }
        }

        UsersService.usersMap.set(dbUser.id, {
          id: dbUser.id,
          username: dbUser.username,
          displayName: dbUser.displayName,
          email: dbUser.email,
          phone: dbUser.phone,
          avatarUrl: dbUser.avatarUrl,
          bio: dbUser.bio,
          gender: dbUser.gender,
          birthday: (dbUser as any).birthday,
          country: (dbUser as any).country || 'Global',
          role: dbUser.role,
          level: dbUser.level || 1,
          vipLevel: (dbUser as any).vipLevel || 0,
          totalRechargedUSD: (dbUser as any).totalRechargedUSD || 0.0,
          customId: (dbUser as any).customId || null,
          customNameColor: (dbUser as any).customNameColor || null,
          vipSettings: (dbUser as any).vipSettings || {},
          coins: dbUser.wallet?.coins ?? 0,
          diamonds: dbUser.wallet?.diamonds ?? 0,
          status: userStatus,
          suspensionUntil,
          suspensionReason,
          isBanned: dbUser.isBanned || userStatus === 'BANNED',
          isVerified: (dbUser as any).isVerified || false,
          verifiedLabel: (dbUser as any).verifiedLabel || null,
          violationsCount: (dbUser as any).violationsCount || 0,
          agency,
          createdAt: dbUser.createdAt.toISOString(),
        });
      }
    } catch {
      // Prisma error fallback
    }

    let users = Array.from(UsersService.usersMap.values());

    if (search && search.trim().length > 0) {
      const query = search.trim().toLowerCase();
      users = users.filter(
        (u) =>
          (u.username && u.username.toLowerCase().includes(query)) ||
          (u.displayName && u.displayName.toLowerCase().includes(query)) ||
          (u.email && u.email.toLowerCase().includes(query)) ||
          (u.id && u.id.toLowerCase().includes(query)),
      );
    }

    if (role && role !== 'ALL') {
      users = users.filter((u) => u.role === role);
    }

    if (status && status !== 'ALL') {
      users = users.filter((u) => {
        if (status === 'ACTIVE') {
          return u.status === 'ACTIVE';
        }
        if (status === 'BANNED') {
          return u.status === 'BANNED' || u.isBanned === true;
        }
        if (status === 'SUSPENDED_24H') {
          return u.status === 'SUSPENDED_24H';
        }
        if (status === 'SUSPENDED_7D') {
          return u.status === 'SUSPENDED_7D';
        }
        return u.status === status;
      });
    }

    return users;
  }

  /**
   * Get single user profile by ID
   */
  async getUserById(id: string, viewer?: { id?: string; role?: string; isStaff?: boolean }) {
    const existing = UsersService.usersMap.get(id);

    try {
      const dbUser = await this.prisma.user.findUnique({
        where: { id },
        include: {
          wallet: true,
          agencyBinding: {
            include: { agency: true },
          },
        },
      });
      if (dbUser) {
        const agency = dbUser.agencyBinding?.agency
          ? {
              id: dbUser.agencyBinding.agency.id,
              name: dbUser.agencyBinding.agency.name,
              code: dbUser.agencyBinding.agency.code,
              commissionPercent: dbUser.agencyBinding.agency.commissionPercent,
              status: dbUser.agencyBinding.status,
              boundAt: dbUser.agencyBinding.boundAt ? dbUser.agencyBinding.boundAt.toISOString() : undefined,
            }
          : undefined;

        let userStatus = (dbUser as any).status || existing?.status || (dbUser.isBanned ? 'BANNED' : 'ACTIVE');
        let suspensionUntil = (dbUser as any).suspensionUntil
          ? new Date((dbUser as any).suspensionUntil).toISOString()
          : existing?.suspensionUntil || null;
        let suspensionReason = (dbUser as any).suspensionReason || existing?.suspensionReason || null;

        if (dbUser.isBanned) {
          userStatus = 'BANNED';
          suspensionUntil = null;
        } else if (userStatus.startsWith('SUSPENDED_')) {
          const expireMs = suspensionUntil ? new Date(suspensionUntil).getTime() : 0;
          if (!suspensionUntil || Date.now() >= expireMs) {
            userStatus = 'ACTIVE';
            suspensionUntil = null;
            suspensionReason = null;
            this.prisma.user
              .update({
                where: { id: dbUser.id },
                data: { status: 'ACTIVE', suspensionUntil: null, suspensionReason: null },
              })
              .catch(() => null);
          }
        }

        // Contact details are private: only the owner or staff may read them.
        const isSelfOrStaff =
          !viewer?.id ||
          viewer.id === dbUser.id ||
          viewer.isStaff === true ||
          ['SUPER_ADMIN', 'ADMIN', 'AGENCY_ADMIN'].includes(viewer.role || '');
        const privacy = ((dbUser as any).vipSettings || {}) as any;
        const hideCountry = privacy.hideCountry === true && ((dbUser as any).vipLevel || 0) >= 3;
        const hideLocation = privacy.hideLocationInRooms === true && ((dbUser as any).vipLevel || 0) >= 1;

        const u = {
          id: dbUser.id,
          username: dbUser.username,
          displayName: dbUser.displayName,
          email: isSelfOrStaff ? dbUser.email : null,
          phone: isSelfOrStaff ? dbUser.phone : null,
          avatarUrl: dbUser.avatarUrl,
          bio: dbUser.bio,
          gender: dbUser.gender,
          birthday: (dbUser as any).birthday,
          country: !isSelfOrStaff && (hideCountry || hideLocation)
            ? 'Hidden'
            : ((dbUser as any).country || 'Global'),
          role: dbUser.role,
          level: dbUser.level || 1,
          vipLevel: (dbUser as any).vipLevel || 0,
          totalRechargedUSD: (dbUser as any).totalRechargedUSD || 0.0,
          customId: (dbUser as any).customId || null,
          customNameColor: isSelfOrStaff || ((dbUser as any).vipLevel || 0) >= 2
            ? ((dbUser as any).customNameColor || null)
            : null,
          vipSettings: (dbUser as any).vipSettings || {},
          coins: dbUser.wallet?.coins ?? 0,
          diamonds: dbUser.wallet?.diamonds ?? 0,
          status: userStatus,
          suspensionUntil,
          suspensionReason,
          isBanned: dbUser.isBanned || userStatus === 'BANNED',
          isVerified: (dbUser as any).isVerified || false,
          verifiedLabel: (dbUser as any).verifiedLabel || null,
          violationsCount: (dbUser as any).violationsCount || 0,
          agency,
          createdAt: dbUser.createdAt.toISOString(),
        };
        UsersService.usersMap.set(u.id, { ...u, email: dbUser.email, phone: dbUser.phone });
        return u;
      }
    } catch {
      // fallback
    }

    if (!existing) {
      throw new NotFoundException(`User with ID ${id} not found.`);
    }
    
    // Auto-check expiry on existing memory user
    if (existing.suspensionUntil) {
      if (Date.now() >= new Date(existing.suspensionUntil).getTime()) {
        existing.status = 'ACTIVE';
        existing.suspensionUntil = null;
        existing.suspensionReason = null;
        UsersService.usersMap.set(id, existing);
      }
    }
    
    return existing;
  }

  /**
   * Admin updates user moderation status (Ban, Temp Suspension, Unblock)
   */
  async updateUserStatus(id: string, dto: UpdateUserStatusDto) {
    let user = UsersService.usersMap.get(id);
    if (!user) {
      user = await this.getUserById(id);
    }
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found.`);
    }

    user.status = dto.status;
    if (dto.reason) {
      user.suspensionReason = dto.reason;
    }

    if (dto.status.startsWith('SUSPENDED_')) {
      const hours = dto.suspensionHours || (dto.status === 'SUSPENDED_24H' ? 24 : dto.status === 'SUSPENDED_7D' ? 168 : 720);
      user.suspensionUntil = new Date(Date.now() + hours * 3600 * 1000).toISOString();
      user.violationsCount = (user.violationsCount || 0) + 1;
      user.isBanned = false;
    } else if (dto.status === 'ACTIVE') {
      user.suspensionUntil = null;
      user.suspensionReason = null;
      user.isBanned = false;
    } else if (dto.status === 'BANNED') {
      user.isBanned = true;
      user.suspensionUntil = null;
      user.violationsCount = (user.violationsCount || 0) + 1;
    }

    UsersService.usersMap.set(id, user);

    try {
      await this.prisma.user.update({
        where: { id },
        data: {
          isBanned: dto.status === 'BANNED',
          status: user.status,
          suspensionUntil: user.suspensionUntil ? new Date(user.suspensionUntil) : null,
          suspensionReason: user.suspensionReason ?? null,
          violationsCount: user.violationsCount ?? 0,
        },
      });
    } catch {
      // DB unavailable: keep the in-memory state so the UI stays consistent
    }

    // Broadcast instant real-time moderation action to mobile app and rooms
    try {
      const payload = {
        userId: id,
        status: user.status,
        isBanned: user.isBanned,
        reason: user.suspensionReason || (dto.status === 'BANNED' ? 'Account permanently banned for policy violation' : 'Account temporarily suspended'),
        suspensionUntil: user.suspensionUntil,
        timestamp: Date.now(),
      };
      this.signalingGateway?.server?.to(`user_${id}`).emit('user:moderation_action', payload);
      this.signalingGateway?.server?.emit('user:moderation_action', payload);
      this.signalingGateway?.server?.to('admin_dashboard').emit('admin:user_status_changed', payload);
    } catch {
      // safe fallback
    }

    return {
      success: true,
      message: `User ${user.displayName} status successfully updated to ${dto.status}.`,
      user,
    };
  }

  /**
   * Admin grants or removes a verification badge for any user or host.
   * Persists to PostgreSQL and broadcasts real-time updates to the app & admin panel.
   */
  async setUserVerification(id: string, dto: SetVerificationDto) {
    let user = UsersService.usersMap.get(id);
    if (!user) {
      user = await this.getUserById(id);
    }
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found.`);
    }

    const isVerified = dto.isVerified === true;
    const verifiedLabel = isVerified
      ? (dto.verifiedLabel && dto.verifiedLabel.trim()) || 'Verified'
      : null;

    user.isVerified = isVerified;
    user.verifiedLabel = verifiedLabel;
    UsersService.usersMap.set(id, user);

    try {
      await this.prisma.user.updateMany({
        where: { id },
        data: { isVerified, verifiedLabel } as any,
      });
    } catch {
      // in-memory fallback
    }

    // Broadcast instant real-time verification update
    try {
      const payload = {
        userId: id,
        isVerified,
        verifiedLabel,
        displayName: user.displayName,
        role: user.role,
        timestamp: Date.now(),
      };
      this.signalingGateway?.server?.to(`user_${id}`).emit('user:verification_changed', payload);
      this.signalingGateway?.server?.emit('user:verification_changed', payload);
      this.signalingGateway?.server?.to('admin_dashboard').emit('admin:user_verification_changed', payload);
    } catch {
      // safe fallback
    }

    return {
      success: true,
      message: isVerified
        ? `✅ ${user.displayName} is now verified (${verifiedLabel}).`
        : `Verification badge removed from ${user.displayName}.`,
      user,
    };
  }

  /**
   * Admin grants, edits, or clears a user's vanity Custom ID (and optional
   * username). Admins may assign a custom ID regardless of the user's VIP
   * status, so this bypasses the tier requirement while still enforcing
   * platform-wide uniqueness.
   */
  async setAdminUserCustomId(id: string, dto: { customId?: string; username?: string; customNameColor?: string }) {
    let user = UsersService.usersMap.get(id);
    if (!user) {
      user = await this.getUserById(id);
    }
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found.`);
    }

    const rawCustomId = dto.customId !== undefined ? String(dto.customId).trim() : undefined;
    let cleanCustomId: string | null | undefined = undefined;

    if (rawCustomId === undefined) {
      cleanCustomId = undefined;
    } else if (rawCustomId.length === 0) {
      cleanCustomId = null;
    } else {
      cleanCustomId = rawCustomId.toLowerCase().replace(/[^a-z0-9_]/g, '');
      if (cleanCustomId.length < 3 || cleanCustomId.length > 20) {
        throw new BadRequestException('Custom ID must be between 3 and 20 alphanumeric characters (letters, numbers, underscore).');
      }
    }

    const rawUsername = dto.username !== undefined ? String(dto.username).trim() : undefined;
    if (rawUsername !== undefined && rawUsername.length > 0 && rawUsername.length < 3) {
      throw new BadRequestException('Username must be at least 3 characters.');
    }

    // Uniqueness validation (both customId and username share one namespace)
    const orFilters: any[] = [];
    if (cleanCustomId) orFilters.push({ customId: cleanCustomId }, { username: cleanCustomId });
    if (rawUsername && rawUsername.length > 0) orFilters.push({ username: rawUsername }, { customId: rawUsername });

    if (orFilters.length > 0) {
      try {
        const conflict = await this.prisma.user.findFirst({
          where: { OR: orFilters, NOT: { id } },
        });
        if (conflict) {
          throw new BadRequestException('That Custom ID / username is already taken by another user.');
        }
      } catch (e) {
        if (e instanceof BadRequestException) throw e;
        // DB offline — fall back to in-memory uniqueness scan
        for (const u of Array.from(UsersService.usersMap.values())) {
          if (u.id === id) continue;
          const values = [cleanCustomId, rawUsername].filter(Boolean);
          if (
            values.includes((u as any).customId) ||
            values.includes((u as any).username)
          ) {
            throw new BadRequestException('That Custom ID / username is already taken by another user.');
          }
        }
      }
    }

    const data: any = {};
    if (cleanCustomId !== undefined) data.customId = cleanCustomId;
    if (rawUsername !== undefined && rawUsername.length > 0) data.username = rawUsername;
    if (dto.customNameColor !== undefined) data.customNameColor = dto.customNameColor;

    try {
      await this.prisma.user.updateMany({ where: { id }, data });
    } catch {
      // in-memory fallback
    }

    if (cleanCustomId !== undefined) (user as any).customId = cleanCustomId;
    if (rawUsername !== undefined && rawUsername.length > 0) (user as any).username = rawUsername;
    if (dto.customNameColor !== undefined) (user as any).customNameColor = dto.customNameColor;
    UsersService.usersMap.set(id, user);

    // Broadcast instant real-time identity update to the app and admin panel
    try {
      const payload = {
        userId: id,
        customId: (user as any).customId || null,
        username: (user as any).username,
        customNameColor: (user as any).customNameColor || null,
        timestamp: Date.now(),
      };
      this.signalingGateway?.server?.to(`user_${id}`).emit('user:identity_changed', payload);
      this.signalingGateway?.server?.to('admin_dashboard').emit('admin:user_identity_changed', payload);
    } catch {
      // safe fallback
    }

    const reloaded = await this.getUserById(id);
    return {
      success: true,
      message: cleanCustomId
        ? `Custom ID '@${cleanCustomId}' assigned to ${user.displayName}.`
        : 'Custom ID cleared successfully.',
      user: reloaded,
    };
  }

  /**
   * Admin manually credits, debits, or directly sets user wallet with audit log and real-time DB persistence
   */
  async adjustUserWallet(id: string, dto: AdjustWalletDto) {
    // 1. Fetch user from PostgreSQL
    let dbUser = await this.prisma.user.findUnique({
      where: { id },
      include: { wallet: true },
    });

    if (!dbUser) {
      throw new NotFoundException(`User with ID ${id} not found in database.`);
    }

    if (!dbUser.wallet) {
      dbUser.wallet = await this.prisma.wallet.create({
        data: { userId: dbUser.id, coins: 0, diamonds: 0 },
      });
    }

    const currentCoins = dbUser.wallet.coins ?? 0;
    const currentDiamonds = dbUser.wallet.diamonds ?? 0;

    let newCoins = currentCoins;
    let newDiamonds = currentDiamonds;

    if (dto.mode === 'SET') {
      if (dto.setCoins !== undefined && dto.setCoins !== null) {
        newCoins = Math.max(0, Number(dto.setCoins));
      }
      if (dto.setDiamonds !== undefined && dto.setDiamonds !== null) {
        newDiamonds = Math.max(0, Number(dto.setDiamonds));
      }
    } else {
      // Default: DELTA mode
      if (dto.coinDelta !== undefined && dto.coinDelta !== null) {
        newCoins = Math.max(0, currentCoins + Number(dto.coinDelta));
      }
      if (dto.diamondDelta !== undefined && dto.diamondDelta !== null) {
        newDiamonds = Math.max(0, currentDiamonds + Number(dto.diamondDelta));
      }
      if (dto.setCoins !== undefined && dto.setCoins !== null) {
        newCoins = Math.max(0, Number(dto.setCoins));
      }
      if (dto.setDiamonds !== undefined && dto.setDiamonds !== null) {
        newDiamonds = Math.max(0, Number(dto.setDiamonds));
      }
    }

    const coinDiff = newCoins - currentCoins;
    const diamondDiff = newDiamonds - currentDiamonds;
    const reason = dto.reason || 'Super Admin manual balance adjustment';

    // 2. Persist to PostgreSQL Prisma Wallet & Transaction Ledger
    const [updatedWallet, ledgerEntry] = await this.prisma.$transaction([
      this.prisma.wallet.update({
        where: { userId: dbUser.id },
        data: {
          coins: newCoins,
          diamonds: newDiamonds,
          ...(coinDiff > 0 && { totalCoinsPurchased: { increment: coinDiff } }),
          ...(diamondDiff > 0 && { totalDiamondsEarned: { increment: diamondDiff } }),
        },
      }),
      this.prisma.transactionLedger.create({
        data: {
          type: ('ADMIN_ADJUSTMENT' as any),
          recipientId: dbUser.id,
          coinsDebited: coinDiff < 0 ? Math.abs(coinDiff) : 0,
          diamondsCredited: diamondDiff > 0 ? diamondDiff : 0,
          amountUSD: parseFloat(((Math.abs(coinDiff) * 0.01) || (Math.abs(diamondDiff) * 0.01)).toFixed(4)),
          notes: `Admin adjustment: ${coinDiff >= 0 ? '+' : ''}${coinDiff} coins, ${diamondDiff >= 0 ? '+' : ''}${diamondDiff} diamonds. Reason: ${reason}`,
        },
      }),
    ]);

    // 3. Update memory registry
    const cached = UsersService.usersMap.get(id);
    if (cached) {
      cached.coins = updatedWallet.coins;
      cached.diamonds = updatedWallet.diamonds;
      UsersService.usersMap.set(id, cached);
    }

    // 4. Emit real-time WebSocket events to Mobile App and Admin Dashboard
    if (this.signalingGateway) {
      // Direct push to user's device/app
      this.signalingGateway.broadcastToUser(id, 'wallet:balance_update', {
        userId: id,
        coins: updatedWallet.coins,
        diamonds: updatedWallet.diamonds,
      });

      // Direct push to Admin Dashboard
      this.signalingGateway.broadcastAdminTelemetry('admin:wallet_updated', {
        userId: id,
        coins: updatedWallet.coins,
        diamonds: updatedWallet.diamonds,
        reason,
        timestamp: Date.now(),
      });

      this.signalingGateway.broadcastAdminTelemetry('admin:metrics_update', {
        type: 'ADMIN_WALLET_ADJUSTMENT',
        user: dbUser.displayName,
        userId: id,
        coins: updatedWallet.coins,
        diamonds: updatedWallet.diamonds,
        coinDiff,
        diamondDiff,
        reason,
        timestamp: Date.now(),
      });
    }

    return {
      success: true,
      message: `Wallet updated: ${coinDiff >= 0 ? '+' : ''}${coinDiff} coins, ${diamondDiff >= 0 ? '+' : ''}${diamondDiff} diamonds. Current: ${updatedWallet.coins} 🪙, ${updatedWallet.diamonds} 💎`,
      user: {
        id: dbUser.id,
        displayName: dbUser.displayName,
        username: dbUser.username,
        coins: updatedWallet.coins,
        diamonds: updatedWallet.diamonds,
      },
      coins: updatedWallet.coins,
      diamonds: updatedWallet.diamonds,
      transactionId: ledgerEntry.id,
    };
  }

  /**
   * User/Host self-service profile update
   */
  async updateUserProfile(userId: string, dto: UpdateProfileDto) {
    let user = UsersService.usersMap.get(userId);
    if (!user) {
      try {
        const dbUser = await this.prisma.user.findUnique({
          where: { id: userId },
          include: { wallet: true },
        });
        if (dbUser) {
          user = {
            id: dbUser.id,
            username: dbUser.username,
            displayName: dbUser.displayName,
            email: dbUser.email,
            phone: dbUser.phone,
            avatarUrl: dbUser.avatarUrl,
            bio: dbUser.bio,
            gender: dbUser.gender,
            birthday: (dbUser as any).birthday,
            country: (dbUser as any).country || 'Global',
            role: dbUser.role,
            level: dbUser.level || 1,
            coins: dbUser.wallet?.coins ?? 0,
            diamonds: dbUser.wallet?.diamonds ?? 0,
            status: dbUser.isBanned ? 'BANNED' : 'ACTIVE',
            createdAt: dbUser.createdAt.toISOString(),
          };
        }
      } catch {
        // ignore
      }
    }

    if (!user) {
      user = {
        id: userId,
        username: dto.username || `user_${userId.slice(-6)}`,
        displayName: dto.displayName || 'Live User',
        avatarUrl: dto.avatarUrl,
        bio: dto.bio || 'Enjoying Live 2030 ✨',
        gender: dto.gender || 'Other',
        birthday: dto.birthday || '2000-01-01',
        country: dto.country || 'Global',
        role: 'USER',
        level: 1,
        coins: 0,
        diamonds: 0,
        status: 'ACTIVE',
      };
    } else {
      if (dto.username) user.username = dto.username;
      if (dto.displayName) user.displayName = dto.displayName;
      if (dto.avatarUrl) user.avatarUrl = dto.avatarUrl;
      if (dto.bio !== undefined) user.bio = dto.bio;
      if (dto.gender) user.gender = dto.gender;
      if (dto.birthday) user.birthday = dto.birthday;
      if (dto.country) user.country = dto.country;
    }

    UsersService.usersMap.set(userId, user);

    try {
      await (this.prisma.user as any).upsert({
        where: { id: userId },
        update: {
          displayName: user.displayName,
          username: user.username,
          avatarUrl: user.avatarUrl,
          bio: user.bio,
          gender: user.gender,
          birthday: user.birthday,
          country: user.country,
        },
        create: {
          id: userId,
          username: user.username,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          bio: user.bio,
          gender: user.gender,
          birthday: user.birthday,
          country: user.country,
          role: 'USER',
          wallet: {
            create: { coins: 0, diamonds: 0 },
          },
        },
      });
    } catch {
      // in-memory fallback
    }

    return {
      success: true,
      message: 'Profile updated successfully.',
      user,
    };
  }

  /**
   * Submit violation report against a stream, user, post or comment.
   * Persisted to the `Report` table (moderation queue source of truth).
   */
  async createReport(reporterId: string, dto: CreateReportDto) {
    const reporter = UsersService.usersMap.get(reporterId);

    // Never trust client-supplied placeholders like "me"/"host_streamer".
    // Resolve the real offending account server-side: explicit valid user id,
    // the target user for USER reports, or the host of the reported room.
    const PLACEHOLDERS = new Set(['me', 'host_streamer', 'host', 'anonymous', 'unknown']);
    const provided = typeof (dto as any).reportedUserId === 'string'
      ? (dto as any).reportedUserId.trim()
      : '';
    let linkedUserId: string | undefined =
      provided && !PLACEHOLDERS.has(provided.toLowerCase())
        ? provided
        : dto.targetType === 'USER'
          ? dto.targetId
          : undefined;

    if (!linkedUserId && dto.targetType === 'STREAM' && dto.targetId) {
      const room = await this.prisma.liveRoom
        .findFirst({
          where: { OR: [{ id: dto.targetId }, { agoraChannelName: dto.targetId }] },
          select: { hostId: true },
        })
        .catch(() => null);
      linkedUserId = room?.hostId || undefined;
    }

    let reportedUserName = 'Live Stream';
    if (linkedUserId) {
      const reported = await this.prisma.user
        .findUnique({ where: { id: linkedUserId }, select: { displayName: true } })
        .catch(() => null);
      reportedUserName = reported?.displayName || 'Unknown';
    }

    const report = await this.prisma.report.create({
      data: {
        reporterId,
        reporterName: reporter?.displayName || 'Audience Member',
        targetType: dto.targetType as any,
        targetId: dto.targetId,
        linkedUserId: linkedUserId || null,
        category: dto.category,
        reason: dto.reason,
        evidenceUrl: dto.evidenceUrl || null,
      },
    });

    // Notify admins in real-time if the socket gateway is available.
    try {
      this.signalingGateway?.server?.to('admin_dashboard').emit('report:new', {
        ...report,
        reportedUserId: linkedUserId,
        reportedUserName,
      });
    } catch {}

    return {
      success: true,
      message: 'Thank you for reporting. Platform moderation will review this content.',
      report: { ...report, reportedUserId: linkedUserId, reportedUserName },
    };
  }

  /**
   * Get all violation reports for Safety Queue (newest first).
   */
  async getReportsList(status?: string) {
    const where: any = {};
    if (status) where.status = status;
    const reports = await this.prisma.report.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const linkedIds = Array.from(
      new Set(reports.map((r) => r.linkedUserId).filter(Boolean) as string[]),
    );
    const linkedUsers = linkedIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: linkedIds } },
          select: { id: true, displayName: true, username: true },
        })
      : [];
    const userMap = new Map(linkedUsers.map((u) => [u.id, u]));

    return reports.map((r) => ({
      id: r.id,
      targetType: r.targetType,
      targetId: r.targetId,
      reportedUserId: r.linkedUserId,
      reportedUserName:
        (r.linkedUserId && userMap.get(r.linkedUserId)?.displayName) || 'Live Stream',
      reporterId: r.reporterId,
      reporterName: r.reporterName || 'Audience Member',
      category: r.category,
      reason: r.reason,
      evidenceUrl: r.evidenceUrl || '',
      status: r.status,
      actionTaken: r.actionTaken,
      handledAt: r.handledAt,
      createdAt: r.createdAt,
    }));
  }

  /**
   * Admin executes action on report (persisted; enforces user status).
   */
  async actionReport(reportId: string, dto: ReportActionDto, adminId?: string, ipAddress?: string) {
    const report = await this.prisma.report.findUnique({ where: { id: reportId } });
    if (!report) {
      throw new NotFoundException(`Report with ID ${reportId} not found.`);
    }

    const resolvedStatus = dto.action === 'DISMISS' ? 'DISMISSED' : 'ACTIONED';

    if (report.linkedUserId) {
      if (dto.action === 'BAN_USER') {
        await this.updateUserStatus(report.linkedUserId, {
          status: 'BANNED',
          reason: dto.notes || `Permanently banned following safety report: ${report.category} - ${report.reason}`,
        });
      } else if (dto.action === 'SUSPEND_24H') {
        await this.updateUserStatus(report.linkedUserId, {
          status: 'SUSPENDED_24H',
          suspensionHours: 24,
          reason: dto.notes || `24-Hour Suspension following safety report: ${report.category} - ${report.reason}`,
        });
      } else if (dto.action === 'SUSPEND_7D') {
        await this.updateUserStatus(report.linkedUserId, {
          status: 'SUSPENDED_7D',
          suspensionHours: 168,
          reason: dto.notes || `7-Day Suspension following safety report: ${report.category} - ${report.reason}`,
        });
      }
    }

    const updated = await this.prisma.report.update({
      where: { id: reportId },
      data: {
        status: resolvedStatus as any,
        actionTaken: dto.action,
        handledById: adminId || null,
        handledAt: new Date(),
        details: dto.notes || report.details,
      },
    });

    if (adminId) {
      await this.prisma.auditLog
        .create({
          data: {
            adminId,
            action: `REPORT_${dto.action}`,
            targetType: 'REPORT',
            targetId: reportId,
            details: JSON.stringify({ action: dto.action, notes: dto.notes || null, linkedUserId: report.linkedUserId }),
            ipAddress: ipAddress || null,
          },
        })
        .catch(() => null);
    }

    return {
      success: true,
      message: `Report #${reportId} resolved with action [${dto.action}].`,
      report: updated,
    };
  }

  /**
   * Super Admin: Create new user account
   */
  async createAdminUser(dto: any) {
    const id = `user-${Date.now().toString().slice(-4)}`;
    const newUser = {
      id,
      username: dto.username || `user_${id.slice(-4)}`,
      displayName: dto.displayName || dto.username || 'New Live2030 Member',
      email: dto.email || `${dto.username || id}@live2030.com`,
      phone: dto.phone || '',
      avatarUrl: dto.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      bio: dto.bio || 'Live2030 Community Member',
      gender: dto.gender || 'Other',
      country: dto.country || 'Global',
      role: dto.role || 'USER',
      level: Number(dto.level) || 1,
      vipLevel: Number(dto.vipLevel) || 0,
      totalRechargedUSD: Number(dto.totalRechargedUSD) || 0.0,
      customId: dto.customId || null,
      coins: Number(dto.coins) || 1000,
      diamonds: Number(dto.diamonds) || 0,
      status: dto.status || 'ACTIVE',
      violationsCount: 0,
      createdAt: new Date().toISOString(),
    };
    UsersService.usersMap.set(id, newUser);

    try {
      await (this.prisma as any).user.create({
        data: {
          id,
          username: newUser.username,
          displayName: newUser.displayName,
          email: newUser.email,
          phone: newUser.phone,
          avatarUrl: newUser.avatarUrl,
          bio: newUser.bio,
          gender: newUser.gender,
          country: newUser.country,
          role: newUser.role,
          level: newUser.level,
          vipLevel: newUser.vipLevel,
          totalRechargedUSD: newUser.totalRechargedUSD,
          customId: newUser.customId,
          status: newUser.status,
          wallet: {
            create: {
              coins: newUser.coins,
              diamonds: newUser.diamonds,
            },
          },
        },
      });
    } catch (e) {
      this.logger.warn(`Could not persist user to DB: ${e.message}`);
    }

    return newUser;
  }

  /**
   * Super Admin: Edit user account details
   */
  async updateAdminUser(id: string, dto: any) {
    let user = UsersService.usersMap.get(id);
    if (!user) {
      user = await this.getUserById(id);
    }
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found.`);
    }

    // Validate username / customId uniqueness and normalise the custom ID
    if (dto.username !== undefined || dto.customId !== undefined) {
      const newUsername = dto.username !== undefined ? String(dto.username).trim() : undefined;
      let newCustomId: string | null | undefined;
      if (dto.customId !== undefined) {
        const raw = String(dto.customId).trim();
        newCustomId = raw.length === 0 ? null : raw.toLowerCase().replace(/[^a-z0-9_]/g, '');
        if (newCustomId && (newCustomId.length < 3 || newCustomId.length > 20)) {
          throw new BadRequestException('Custom ID must be between 3 and 20 alphanumeric characters.');
        }
      }

      const orFilters: any[] = [];
      if (newCustomId) orFilters.push({ customId: newCustomId }, { username: newCustomId });
      if (newUsername && newUsername.length > 0) orFilters.push({ username: newUsername }, { customId: newUsername });

      if (orFilters.length > 0) {
        const conflict = await this.prisma.user.findFirst({ where: { OR: orFilters, NOT: { id } } });
        if (conflict) {
          throw new BadRequestException('That username / Custom ID is already taken by another user.');
        }
      }

      dto = { ...dto };
      if (dto.customId !== undefined) dto.customId = newCustomId;
      if (newUsername !== undefined) dto.username = newUsername;
    }

    // 1. Persist User updates to PostgreSQL DB
    try {
      await this.prisma.user.update({
        where: { id },
        data: {
          ...(dto.displayName && { displayName: dto.displayName }),
          ...(dto.username && { username: dto.username }),
          ...(dto.email !== undefined && { email: dto.email }),
          ...(dto.phone !== undefined && { phone: dto.phone }),
          ...(dto.role && { role: dto.role }),
          ...(dto.level !== undefined && { level: Number(dto.level) }),
          ...(dto.vipLevel !== undefined && { vipLevel: Number(dto.vipLevel) }),
          ...(dto.totalRechargedUSD !== undefined && { totalRechargedUSD: Number(dto.totalRechargedUSD) }),
          ...(dto.customId !== undefined && { customId: dto.customId }),
          ...(dto.customNameColor !== undefined && { customNameColor: dto.customNameColor }),
          ...(dto.isVerified !== undefined && { isVerified: !!dto.isVerified }),
          ...(dto.verifiedLabel !== undefined && { verifiedLabel: dto.verifiedLabel }),
          ...(dto.status === 'BANNED' ? { isBanned: true } : dto.status === 'ACTIVE' ? { isBanned: false } : {}),
        },
      });
    } catch (e) {
      console.warn('Could not update user in DB:', e);
    }

    // 2. Persist Coins & Diamonds if adjusted directly
    if (dto.coins !== undefined || dto.diamonds !== undefined) {
      try {
        await this.adjustUserWallet(id, {
          mode: 'SET',
          setCoins: dto.coins !== undefined ? Number(dto.coins) : user.coins,
          setDiamonds: dto.diamonds !== undefined ? Number(dto.diamonds) : user.diamonds,
          reason: 'Updated directly from Super Admin User Management Console',
        });
      } catch (e) {
        console.warn('Could not adjust wallet in updateAdminUser:', e);
      }
    }

    const reloaded = await this.getUserById(id);
    return reloaded;
  }

  /**
   * Detailed Stream Earnings & Commission Report for Mobile App & Broadcasters
   */
  async getUserEarningsReport(userId: string) {
    const user = await this.getUserById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found.`);
    }

    // 1. Fetch user stream rooms from LiveRoom
    let rooms: any[] = [];
    try {
      rooms = await this.prisma.liveRoom.findMany({
        where: { hostId: userId },
        orderBy: { startedAt: 'desc' },
        include: {
          transactions: {
            where: { recipientId: userId, type: 'GIFT_TRANSACTION' },
            include: {
              sender: true,
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      });
    } catch {
      // fallback
    }

    // 2. Fetch all gift transactions received by user from TransactionLedger
    let transactions: any[] = [];
    try {
      transactions = await this.prisma.transactionLedger.findMany({
        where: { recipientId: userId },
        include: {
          sender: true,
          agency: true,
          room: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    } catch {
      // fallback
    }

    // 3. Calculate summary metrics
    const totalDiamondsEarned = user.diamonds || 0;
    const estimatedUsdValuation = parseFloat((totalDiamondsEarned * 0.01).toFixed(2));
    
    let totalCoinsReceived = 0;
    let totalAgencyCommissionUSD = 0;
    let totalPlatformRevenueUSD = 0;

    for (const t of transactions) {
      if (t.type === 'GIFT_TRANSACTION') {
        totalCoinsReceived += (t.coinsDebited || 0);
        totalAgencyCommissionUSD += (t.agencyCommissionUSD || 0);
        totalPlatformRevenueUSD += (t.platformRevenueUSD || 0);
      }
    }

    // Calculate commission tiers from the live REVENUE_ECONOMICS matrix
    const hasAgency = !!user.agency;
    let platformCutPercent = 45;
    try {
      const setting = await this.prisma.systemSetting.findUnique({ where: { key: 'REVENUE_ECONOMICS' } });
      if (setting?.value) {
        const parsed = JSON.parse(setting.value);
        if (parsed.platformShare !== undefined) platformCutPercent = Number(parsed.platformShare);
      }
    } catch {}
    const agencyCutPercent = hasAgency ? (user.agency.commissionPercent || 13) : 0;
    const hostCutPercent = hasAgency
      ? Math.max(0, 100 - platformCutPercent - agencyCutPercent)
      : Math.max(0, 100 - platformCutPercent);

    // 4. Map Stream Sessions
    const streamSessions = rooms.map((r) => {
      const durationMs = r.endedAt
        ? (new Date(r.endedAt).getTime() - new Date(r.startedAt).getTime())
        : (Date.now() - new Date(r.startedAt).getTime());
      const durationMinutes = Math.max(1, Math.round(durationMs / 60000));
      
      let sessionCoins = 0;
      let sessionDiamonds = r.totalDiamondsEarned || 0;
      let sessionAgencyCutUSD = 0;

      const giftItems = (r.transactions || []).map((t: any) => {
        sessionCoins += (t.coinsDebited || 0);
        sessionAgencyCutUSD += (t.agencyCommissionUSD || 0);
        return {
          id: t.id,
          senderName: t.sender?.displayName || t.sender?.username || 'Viewer',
          senderAvatar: t.sender?.avatarUrl,
          coins: t.coinsDebited,
          diamondsAwarded: t.diamondsCredited,
          agencyCutUSD: t.agencyCommissionUSD,
          createdAt: t.createdAt.toISOString(),
          notes: t.notes,
        };
      });

      return {
        id: r.id,
        title: r.title,
        roomType: r.roomType || 'VIDEO',
        status: r.status,
        startedAt: r.startedAt.toISOString(),
        endedAt: r.endedAt ? r.endedAt.toISOString() : null,
        durationMinutes,
        peakViewers: r.peakViewers || r.currentViewers || 0,
        diamondsEarned: sessionDiamonds,
        coinsDebitedTotal: sessionCoins,
        agencyCutUSD: parseFloat(sessionAgencyCutUSD.toFixed(2)),
        giftsCount: giftItems.length,
        gifts: giftItems,
      };
    });

    // 5. Map Transactions Ledger
    const recentTransactions = transactions.map((t) => ({
      id: t.id,
      type: t.type,
      senderName: t.sender?.displayName || t.sender?.username || 'Viewer',
      senderAvatar: t.sender?.avatarUrl,
      roomId: t.roomId,
      roomTitle: t.room?.title,
      agencyName: t.agency?.name,
      coinsDebited: t.coinsDebited,
      diamondsCredited: t.diamondsCredited,
      agencyCommissionUSD: t.agencyCommissionUSD,
      platformRevenueUSD: t.platformRevenueUSD,
      amountUSD: t.amountUSD,
      notes: t.notes,
      createdAt: t.createdAt.toISOString(),
    }));

    return {
      userId: user.id,
      displayName: user.displayName,
      username: user.username,
      avatarUrl: user.avatarUrl,
      role: user.role,
      level: user.level,
      agency: user.agency || null,
      summary: {
        totalDiamondsEarned,
        estimatedUsdValuation,
        totalStreamsHosted: rooms.length,
        totalGiftsReceived: transactions.filter((t) => t.type === 'GIFT_TRANSACTION').length,
        totalCoinsReceived,
        totalAgencyCommissionUSD: parseFloat(totalAgencyCommissionUSD.toFixed(2)),
        totalPlatformRevenueUSD: parseFloat(totalPlatformRevenueUSD.toFixed(2)),
      },
      commissionRates: {
        platformCutPercent,
        agencyCutPercent,
        hostCutPercent,
        isAgencyAffiliated: hasAgency,
      },
      streamSessions,
      recentTransactions,
    };
  }

  /**
   * Detailed Financial & Commission Reports for Super Admin Dashboard
   */
  async getAdminFinancialReport() {
    let allTransactions: any[] = [];
    let allRooms: any[] = [];
    let agencies: any[] = [];

    try {
      allTransactions = await this.prisma.transactionLedger.findMany({
        include: {
          sender: true,
          recipient: true,
          agency: true,
          room: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });

      allRooms = await this.prisma.liveRoom.findMany({
        include: {
          host: {
            include: {
              agencyBinding: {
                include: { agency: true },
              },
            },
          },
        },
        orderBy: { startedAt: 'desc' },
        take: 50,
      });

      agencies = await this.prisma.agency.findMany({
        where: { isActive: true },
        include: {
          _count: { select: { bindings: true } },
        },
      });
    } catch {
      // fallback
    }

    // Financial engine sources: recharge orders, agency wallets, withdrawals
    let paidOrders: any[] = [];
    let agencyWallets: any[] = [];
    let allWithdrawals: any[] = [];
    try {
      paidOrders = await this.prisma.paymentOrder.findMany({
        where: { status: 'PAID' as any },
        orderBy: { createdAt: 'desc' },
        take: 500,
      });
      agencyWallets = await this.prisma.agencyWallet.findMany({
        include: { agency: { select: { name: true, code: true } } },
        orderBy: { totalCommissionUSD: 'desc' },
      });
      allWithdrawals = await this.prisma.withdrawal.findMany({
        orderBy: { createdAt: 'desc' },
        take: 300,
      });
    } catch {
      // fallback
    }

    const USD_TO_SAR = usdToSarRate();
    const rechargeSAR = paidOrders.reduce((s, o: any) => s + (o.amountSAR || 0), 0);
    const rechargeUSD = parseFloat((rechargeSAR / USD_TO_SAR).toFixed(2));
    const coinsSold = paidOrders.reduce((s, o: any) => s + (o.totalCoins || 0), 0);
    const withdrawalsPaidUSD = parseFloat(
      allWithdrawals.filter((w: any) => w.status === 'APPROVED').reduce((s, w: any) => s + (w.amountUSD || 0), 0).toFixed(2),
    );
    const withdrawalsPendingUSD = parseFloat(
      allWithdrawals.filter((w: any) => w.status === 'PENDING').reduce((s, w: any) => s + (w.amountUSD || 0), 0).toFixed(2),
    );
    const agencyCommissionBalanceUSD = parseFloat(
      agencyWallets.reduce((s, a: any) => s + (a.commissionUSD || 0), 0).toFixed(2),
    );

    let totalCoinsSpent = 0;
    let totalDiamondsAwarded = 0;
    let totalAgencyCommissionUSD = 0;
    let totalPlatformRevenueUSD = 0;

    for (const t of allTransactions) {
      if (t.type === 'GIFT_TRANSACTION') {
        totalCoinsSpent += (t.coinsDebited || 0);
        totalDiamondsAwarded += (t.diamondsCredited || 0);
        totalAgencyCommissionUSD += (t.agencyCommissionUSD || 0);
        totalPlatformRevenueUSD += (t.platformRevenueUSD || 0);
      }
    }

    const streamsReport = allRooms.map((r) => {
      const hostAgency = r.host?.agencyBinding?.agency;
      return {
        id: r.id,
        title: r.title,
        roomType: r.roomType,
        status: r.status,
        hostId: r.hostId,
        hostName: r.host?.displayName || r.host?.username || 'Unknown Host',
        agencyName: hostAgency?.name || 'Independent (No Agency)',
        agencyCode: hostAgency?.code || null,
        agencyCommissionPercent: hostAgency?.commissionPercent || 0,
        diamondsEarned: r.totalDiamondsEarned || 0,
        viewers: r.currentViewers,
        peakViewers: r.peakViewers,
        startedAt: r.startedAt.toISOString(),
        endedAt: r.endedAt ? r.endedAt.toISOString() : null,
      };
    });

    const ledgerReport = allTransactions.map((t) => ({
      id: t.id,
      type: t.type,
      senderName: t.sender?.displayName || t.sender?.username || 'Viewer',
      senderId: t.senderId,
      recipientName: t.recipient?.displayName || t.recipient?.username || 'Host',
      recipientId: t.recipientId,
      agencyName: t.agency?.name || null,
      roomTitle: t.room?.title || null,
      coinsDebited: t.coinsDebited,
      diamondsCredited: t.diamondsCredited,
      agencyCommissionUSD: t.agencyCommissionUSD,
      platformRevenueUSD: t.platformRevenueUSD,
      amountUSD: t.amountUSD,
      notes: t.notes,
      createdAt: t.createdAt.toISOString(),
    }));

    return {
      kpi: {
        totalCoinsSpent,
        totalCoinsUSD: parseFloat((totalCoinsSpent * 0.01).toFixed(2)),
        totalDiamondsAwarded,
        totalDiamondsUSD: parseFloat((totalDiamondsAwarded * 0.01).toFixed(2)),
        totalAgencyCommissionUSD: parseFloat(totalAgencyCommissionUSD.toFixed(2)),
        totalPlatformRevenueUSD: parseFloat(totalPlatformRevenueUSD.toFixed(2)),
        totalStreamsCount: allRooms.length,
        totalTransactionsCount: allTransactions.length,
        // Recharge / payment revenue
        grossRechargeSAR: parseFloat(rechargeSAR.toFixed(2)),
        grossRechargeUSD: rechargeUSD,
        coinsSold,
        paidOrdersCount: paidOrders.length,
        // Withdrawals
        withdrawalsPaidUSD,
        withdrawalsPendingUSD,
        // Agency payable balances
        agencyCommissionBalanceUSD,
      },
      streams: streamsReport,
      ledger: ledgerReport,
      payments: paidOrders.map((o: any) => ({
        id: o.externalId,
        userId: o.userId,
        coins: o.totalCoins,
        amountSAR: o.amountSAR,
        amountUSD: o.amountUSD,
        provider: o.provider,
        reference: o.providerReference,
        creditedAt: o.creditedAt ? o.creditedAt.toISOString() : null,
      })),
      agencyWallets: agencyWallets.map((a: any) => ({
        agencyId: a.agencyId,
        agencyName: a.agency?.name || 'Agency',
        agencyCode: a.agency?.code || null,
        coins: a.coins,
        commissionBalanceUSD: a.commissionUSD,
        totalCommissionUSD: a.totalCommissionUSD,
      })),
      withdrawals: allWithdrawals.map((w: any) => ({
        id: w.id,
        userId: w.userId,
        amountDiamonds: w.amountDiamonds,
        amountUSD: w.amountUSD,
        paymentMethod: w.paymentMethod,
        status: w.status,
        payoutReference: w.payoutReference,
        createdAt: w.createdAt ? w.createdAt.toISOString() : null,
      })),
      agencies: agencies.map((a) => ({
        id: a.id,
        name: a.name,
        code: a.code,
        commissionPercent: a.commissionPercent,
        hostsCount: a._count?.bindings || 0,
      })),
    };
  }

  /**
   * Delete User Account & Cascade Personal Data (Apple Guideline 5.1.1(v) & GDPR Compliance)
   */
  async deleteAccount(id: string) {
    if (!id || id.trim().length === 0) {
      throw new BadRequestException('A valid user ID is required for account deletion.');
    }

    try {
      // 1. Disassociate financial transaction ledger references to preserve accounting integrity without personal data
      await this.prisma.transactionLedger.updateMany({
        where: { senderId: id },
        data: { senderId: null },
      });

      await this.prisma.transactionLedger.updateMany({
        where: { recipientId: id },
        data: { recipientId: null },
      });

      // 2. Cascade delete database user record (Prisma cascades Wallet, Rooms, Bindings, Reseller, Withdrawals, Posts, Comments, Follows)
      await this.prisma.user.delete({
        where: { id },
      }).catch((err) => {
        console.warn(`[UsersService] Prisma delete user warning (might be in-memory user only):`, err?.message);
      });
    } catch (err: any) {
      console.warn(`[UsersService] Account cleanup error during DB purge:`, err?.message);
    }

    // 3. Remove from in-memory registry
    UsersService.usersMap.delete(id);

    // 4. Invalidate signaling socket connections if active
    try {
      if (this.signalingGateway?.server) {
        this.signalingGateway.server.emit('account_deleted', { userId: id });
      }
    } catch (_) {}

    return {
      success: true,
      message: 'Account and associated personal data permanently deleted successfully.',
    };
  }

  /**
   * Super Admin: Delete user account
   */
  async deleteAdminUser(id: string) {
    return this.deleteAccount(id);
  }
}

