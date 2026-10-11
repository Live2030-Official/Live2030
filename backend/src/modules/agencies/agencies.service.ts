import { Injectable, BadRequestException, NotFoundException, UnauthorizedException, OnModuleInit, Inject, forwardRef } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAgencyDto, BindHostDto } from './dto/agency.dto';
import { UsersService } from '../users/users.service';
import { SignalingGateway } from '../signaling/signaling.gateway';

const AGENCY_CREDENTIALS_KEY = 'agency_credentials';

@Injectable()
export class AgenciesService implements OnModuleInit {
  private static agenciesList: any[] = [];
  private static agencyRevenueMap = new Map<string, number>();
  private static agencyTransfersList: any[] = [];

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => SignalingGateway))
    private readonly signalingGateway?: SignalingGateway,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService?: UsersService,
  ) {}

  async onModuleInit() {
    await this.seedDefaultAgencies();
  }

  private async seedDefaultAgencies() {
    const seedId = '530c9040-2338-4666-af5b-319c2b4f1218';
    const creds = await this.loadCredentials();
    if (!creds[seedId]) {
      creds[seedId] = { password: 'Agency@2026', whatsappNumber: '+91 98765 43210' };
      await this.saveCredentials(creds);
    }
    try {
      await this.prisma.agencyWallet.upsert({
        where: { agencyId: seedId },
        create: {
          agencyId: seedId,
          coins: 100000,
          whatsappNumber: '+91 98765 43210',
          passwordHash: await bcrypt.hash('Agency@2026', 10),
        },
        update: {},
      });
    } catch {
      // agency row may not exist yet; credentials remain persisted
    }
  }

  private async loadCredentials(): Promise<Record<string, { password?: string; whatsappNumber?: string }>> {
    try {
      const setting = await this.prisma.systemSetting.findUnique({ where: { key: AGENCY_CREDENTIALS_KEY } });
      if (setting?.value) return JSON.parse(setting.value);
    } catch {
      // ignore
    }
    return {};
  }

  private async saveCredentials(map: Record<string, any>): Promise<void> {
    try {
      await this.prisma.systemSetting.upsert({
        where: { key: AGENCY_CREDENTIALS_KEY },
        create: { key: AGENCY_CREDENTIALS_KEY, value: JSON.stringify(map) },
        update: { value: JSON.stringify(map) },
      });
    } catch {
      // best-effort persistence
    }
  }

  async getAgencies() {
    const combined: any[] = [...AgenciesService.agenciesList];
    const credentials = await this.loadCredentials();

    try {
      const agencies = await this.prisma.agency.findMany({
        where: { isActive: true },
        include: {
          wallet: true,
          _count: {
            select: { bindings: true },
          },
          bindings: {
            include: {
              host: {
                include: {
                  wallet: true,
                },
              },
            },
          },
          commissions: {
            select: {
              agencyCommissionUSD: true,
            },
          },
        },
      });

      for (const ag of agencies) {
        const existingIdx = combined.findIndex((a) => a.id === ag.id);
        if (existingIdx !== -1) {
          combined[existingIdx] = { ...combined[existingIdx], ...ag };
        } else {
          combined.push(ag);
        }
      }
    } catch {
      // fallback
    }

    // Augment each agency with live computed & admin-override revenue
    return combined.filter((a) => a.isActive !== false).map((agency) => {
      let totalHosts = agency._count?.bindings || 0;
      let hostsTotalDiamonds = 0;
      let calculatedCommUSD = 0;

      if (agency.commissions && Array.isArray(agency.commissions)) {
        calculatedCommUSD = agency.commissions.reduce((acc: number, c: any) => acc + (Number(c.agencyCommissionUSD) || 0), 0);
      }

      if (agency.bindings && Array.isArray(agency.bindings)) {
        totalHosts = agency.bindings.length;
        for (const b of agency.bindings) {
          const d = b.host?.wallet?.totalDiamondsEarned || b.host?.wallet?.diamonds || 0;
          hostsTotalDiamonds += d;
        }
      } else if (!agency._count) {
        for (const u of UsersService.usersMap.values()) {
          if (u.agency?.id === agency.id || u.agency?.code === agency.code) {
            hostsTotalDiamonds += u.diamonds || 0;
            totalHosts += 1;
          }
        }
      }

      // If no direct ledger entries, compute from host diamonds and commission rate
      if (calculatedCommUSD === 0 && hostsTotalDiamonds > 0) {
        calculatedCommUSD = parseFloat(((hostsTotalDiamonds * 0.01) * ((agency.commissionPercent || 12) / 100)).toFixed(2));
      }

      // Admin custom wallet balance override takes precedence if set
      const override = AgenciesService.agencyRevenueMap.get(agency.id);
      const storedCommission = agency.wallet ? Number(agency.wallet.commissionUSD) || 0 : undefined;
      const walletBalanceUSD =
        override !== undefined
          ? override
          : storedCommission !== undefined && storedCommission > 0
            ? storedCommission
            : parseFloat(calculatedCommUSD.toFixed(2));

      return {
        ...agency,
        totalHosts,
        _count: { bindings: totalHosts },
        hostsTotalDiamonds,
        walletBalanceUSD,
        coinBalance: agency.wallet ? agency.wallet.coins : 0,
        password: credentials[agency.id]?.password || agency.password || 'Agency@2026',
        whatsappNumber:
          credentials[agency.id]?.whatsappNumber ||
          agency.wallet?.whatsappNumber ||
          agency.whatsappNumber ||
          '+91 98765 43210',
      };
    });
  }

  async getAgencyHosts(agencyId: string) {
    try {
      const bindings = await this.prisma.hostBinding.findMany({
        where: { agencyId },
        include: {
          host: {
            include: {
              wallet: true,
            },
          },
        },
      });
      if (bindings.length > 0) {
        return bindings.map((b) => {
          const diamonds = b.host?.wallet?.totalDiamondsEarned || b.host?.wallet?.diamonds || 0;
          const hostCutUSD = (diamonds * 0.01).toFixed(2);
          return {
            ...b,
            hostDisplayName: b.host?.displayName || b.host?.username || 'Host',
            hostUsername: b.host?.username,
            hostAvatarUrl: b.host?.avatarUrl,
            hostLevel: b.host?.level || 1,
            diamondsEarned: diamonds,
            revenueContributedUSD: parseFloat(hostCutUSD),
          };
        });
      }
    } catch {
      // fallback
    }

    // In-memory fallback
    const boundHosts: any[] = [];
    for (const user of UsersService.usersMap.values()) {
      if (user.agency?.id === agencyId || user.agencyBinding?.agencyId === agencyId) {
        const diamonds = user.totalDiamondsEarned || user.diamonds || 0;
        boundHosts.push({
          id: `b-${user.id}`,
          hostId: user.id,
          agencyId,
          status: 'APPROVED',
          host: {
            id: user.id,
            displayName: user.displayName,
            username: user.username,
            avatarUrl: user.avatarUrl,
            level: user.level || 1,
            wallet: {
              diamonds,
              totalDiamondsEarned: diamonds,
            },
          },
          hostDisplayName: user.displayName,
          hostUsername: user.username,
          hostAvatarUrl: user.avatarUrl,
          hostLevel: user.level || 1,
          diamondsEarned: diamonds,
          revenueContributedUSD: parseFloat((diamonds * 0.01).toFixed(2)),
        });
      }
    }

    return boundHosts;
  }

  async updateAgencyRevenue(id: string, revenueUSD: number, notes?: string) {
    const safeAmount = Math.max(0, parseFloat(Number(revenueUSD).toFixed(2)));
    AgenciesService.agencyRevenueMap.set(id, safeAmount);

    try {
      await this.prisma.agencyWallet.upsert({
        where: { agencyId: id },
        create: { agencyId: id, commissionUSD: safeAmount },
        update: { commissionUSD: safeAmount },
      });
    } catch {
      // best-effort
    }

    const index = AgenciesService.agenciesList.findIndex((a) => a.id === id);
    if (index !== -1) {
      AgenciesService.agenciesList[index].walletBalanceUSD = safeAmount;
    }

    if (this.signalingGateway) {
      this.signalingGateway.broadcastAdminTelemetry('admin:agency_revenue_updated', {
        agencyId: id,
        revenueUSD: safeAmount,
        notes: notes || 'Admin balance adjustment',
        timestamp: Date.now(),
      });
    }

    return {
      success: true,
      agencyId: id,
      walletBalanceUSD: safeAmount,
      notes: notes || 'Updated successfully',
    };
  }

  async registerAgency(dto: CreateAgencyDto & { password?: string }) {
    const generatedPassword = dto.password || `LiveAgy@${Math.floor(100000 + Math.random() * 900000)}`;
    const whatsappNumber = dto.whatsappNumber?.trim() || '+91 98765 43210';
    const newAgency = {
      id: `agy-${Date.now()}`,
      name: dto.name,
      code: dto.code.toUpperCase(),
      managerEmail: dto.managerEmail,
      whatsappNumber,
      commissionPercent: Number(dto.commissionPercent) || 13.0,
      isActive: true,
      _count: { bindings: 0 },
      createdAt: new Date().toISOString(),
      password: generatedPassword,
      coinBalance: 0,
      walletBalanceUSD: 0,
    };

    AgenciesService.agenciesList.push(newAgency);

    const credentials = await this.loadCredentials();
    credentials[newAgency.id] = { password: generatedPassword, whatsappNumber };
    await this.saveCredentials(credentials);

    try {
      const created = await this.prisma.agency.create({
        data: {
          name: dto.name,
          code: dto.code.toUpperCase(),
          managerEmail: dto.managerEmail,
          commissionPercent: Number(dto.commissionPercent) || 13.0,
        },
      });
      newAgency.id = created.id;
      await this.prisma.agencyWallet.create({
        data: {
          agencyId: created.id,
          coins: 0,
          whatsappNumber,
          passwordHash: await bcrypt.hash(generatedPassword, 10),
        },
      });
      if (newAgency.id !== created.id) {
        // keep credential key aligned with the persisted id
        const creds = await this.loadCredentials();
        creds[created.id] = { password: generatedPassword, whatsappNumber };
        await this.saveCredentials(creds);
      }
    } catch {
      // fallback
    }

    return newAgency;
  }

  /**
   * Agency Login: Authenticate using Agency Code / Manager Email + Password
   */
  async loginAgency(codeOrEmail: string, password: string) {
    if (!codeOrEmail || !password) {
      throw new BadRequestException('Agency code/email and password are required');
    }

    const clean = codeOrEmail.trim().toLowerCase();
    const agencies = await this.getAgencies();
    const agency = agencies.find(
      (a) => a.code.toLowerCase() === clean || a.managerEmail.toLowerCase() === clean,
    );

    if (!agency) {
      throw new UnauthorizedException('No talent agency found matching code or email');
    }

    const expectedPassword = agency.password || 'Agency@2026';
    if (password.trim() !== String(expectedPassword).trim()) {
      throw new UnauthorizedException('Incorrect agency password. Please check your credentials.');
    }

    const coinBalance = agency.coinBalance ?? 0;
    const walletBalanceUSD = agency.walletBalanceUSD ?? 0;
    const whatsappNumber = agency.whatsappNumber || '+91 98765 43210';

    return {
      success: true,
      agency: {
        id: agency.id,
        name: agency.name,
        code: agency.code,
        managerEmail: agency.managerEmail,
        whatsappNumber,
        commissionPercent: agency.commissionPercent,
        coinBalance,
        walletBalanceUSD,
        totalHosts: agency.totalHosts || 0,
        hostsTotalDiamonds: agency.hostsTotalDiamonds || 0,
      },
    };
  }

  /**
   * Super Admin: Recharge / Deposit coins into an agency's wallet balance
   */
  async rechargeAgencyCoins(id: string, amount: number, notes?: string) {
    const safeAmount = Math.max(1, Math.floor(Number(amount)));
    let updated = safeAmount;
    try {
      const wallet = await this.prisma.agencyWallet.upsert({
        where: { agencyId: id },
        create: { agencyId: id, coins: safeAmount },
        update: { coins: { increment: safeAmount } },
      });
      updated = wallet.coins;
    } catch {
      // fallback
    }

    if (this.signalingGateway) {
      this.signalingGateway.broadcastAdminTelemetry('admin:agency_coins_recharged', {
        agencyId: id,
        rechargedCoins: safeAmount,
        newCoinBalance: updated,
        notes: notes || 'Admin manual recharge',
        timestamp: Date.now(),
      });
    }

    return {
      success: true,
      agencyId: id,
      rechargedCoins: safeAmount,
      coinBalance: updated,
      notes: notes || 'Recharge successful',
    };
  }

  /**
   * Super Admin: Update agency password
   */
  async updateAgencyPassword(id: string, newPassword: string) {
    if (!newPassword || newPassword.trim().length < 4) {
      throw new BadRequestException('Password must be at least 4 characters long');
    }
    const trimmed = newPassword.trim();

    try {
      const creds = await this.loadCredentials();
      creds[id] = { ...(creds[id] || {}), password: trimmed };
      await this.saveCredentials(creds);
      await this.prisma.agencyWallet.upsert({
        where: { agencyId: id },
        create: { agencyId: id, passwordHash: await bcrypt.hash(trimmed, 10) },
        update: { passwordHash: await bcrypt.hash(trimmed, 10) },
      });
    } catch {
      // best-effort
    }

    const index = AgenciesService.agenciesList.findIndex((a) => a.id === id);
    if (index !== -1) {
      AgenciesService.agenciesList[index].password = trimmed;
    }

    return {
      success: true,
      agencyId: id,
      password: trimmed,
    };
  }

  /**
   * Agency Action: Transfer coins from agency wallet to any user's wallet
   */
  async transferCoinsToUser(
    agencyId: string,
    targetUserIdOrUsername: string,
    amount: number,
    notes?: string,
  ) {
    const safeAmount = Math.floor(Number(amount));
    if (safeAmount <= 0) {
      throw new BadRequestException('Transfer amount must be greater than 0 coins');
    }

    const agencies = await this.getAgencies();
    const agency = agencies.find((a) => a.id === agencyId);
    if (!agency) {
      throw new NotFoundException('Agency not found');
    }

    let currentCoins = agency.coinBalance || 0;
    if (currentCoins < safeAmount) {
      throw new BadRequestException(
        `Insufficient coins in agency wallet. Your available balance is ${currentCoins.toLocaleString()} 🪙. Coins are over — please recharge through admin.`,
      );
    }

    // 1. Locate target user
    const targetIdentifier = targetUserIdOrUsername.trim();
    let targetUser: any = null;

    for (const u of UsersService.usersMap.values()) {
      if (
        u.id === targetIdentifier ||
        (u.username && u.username.toLowerCase() === targetIdentifier.toLowerCase()) ||
        (u.phone && u.phone === targetIdentifier)
      ) {
        targetUser = u;
        break;
      }
    }

    if (!targetUser) {
      try {
        const dbUser = await this.prisma.user.findFirst({
          where: {
            OR: [
              { id: targetIdentifier },
              { username: { equals: targetIdentifier, mode: 'insensitive' } },
              { phone: targetIdentifier },
            ],
          },
          include: { wallet: true },
        });
        if (dbUser) {
          targetUser = {
            id: dbUser.id,
            username: dbUser.username,
            displayName: dbUser.displayName,
            avatarUrl: dbUser.avatarUrl,
            role: dbUser.role,
            coins: dbUser.wallet?.coins ?? 0,
            diamonds: dbUser.wallet?.diamonds ?? 0,
          };
          UsersService.usersMap.set(dbUser.id, targetUser);
        }
      } catch {
        // fallback
      }
    }

    if (!targetUser) {
      throw new NotFoundException(
        `Target user "${targetUserIdOrUsername}" was not found on Live 2030. Please verify the User ID or Username.`,
      );
    }

    // 2. Deduct coins from agency wallet (race-safe conditional debit)
    let newAgencyCoins = currentCoins - safeAmount;
    try {
      const debit = await this.prisma.agencyWallet.updateMany({
        where: { agencyId, coins: { gte: safeAmount } },
        data: { coins: { decrement: safeAmount } },
      });
      if (debit.count === 0) {
        throw new BadRequestException('Insufficient coins in agency wallet. Please recharge through admin.');
      }
      const wallet = await this.prisma.agencyWallet.findUnique({ where: { agencyId } });
      newAgencyCoins = wallet?.coins ?? newAgencyCoins;
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      // best-effort fallback
    }

    // 3. Add coins to user wallet via UsersService
    if (this.usersService) {
      await this.usersService.adjustUserWallet(targetUser.id, {
        coinDelta: safeAmount,
        mode: 'DELTA',
        reason: `Agency ${agency.name} (${agency.code}) transfer: +${safeAmount} coins. ${notes || ''}`,
      });
    } else {
      // Fallback direct update
      try {
        await this.prisma.wallet.update({
          where: { userId: targetUser.id },
          data: {
            coins: { increment: safeAmount },
            totalCoinsPurchased: { increment: safeAmount },
          },
        });
      } catch {
        // fallback
      }
      targetUser.coins = (targetUser.coins || 0) + safeAmount;
      UsersService.usersMap.set(targetUser.id, targetUser);
    }

    // 4. Record transfer in history ledger (persisted)
    const transferRecord = {
      id: `tx-agy-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      agencyId,
      agencyName: agency.name,
      agencyCode: agency.code,
      targetUserId: targetUser.id,
      targetUsername: targetUser.username,
      targetDisplayName: targetUser.displayName || targetUser.username,
      targetAvatarUrl: targetUser.avatarUrl,
      amount: safeAmount,
      notes: notes || 'Agency coin distribution',
      timestamp: new Date().toISOString(),
      status: 'SUCCESS',
    };
    AgenciesService.agencyTransfersList.unshift(transferRecord);

    try {
      const ledger = await this.prisma.transactionLedger.create({
        data: {
          type: 'RESELLER_TRANSFER' as any,
          agencyId,
          recipientId: targetUser.id,
          coinsDebited: safeAmount,
          notes: notes || 'Agency coin distribution',
        },
      });
      transferRecord.id = ledger.id;
    } catch {
      // best-effort ledger persistence
    }

    // 5. Emit real-time telemetry
    if (this.signalingGateway) {
      this.signalingGateway.broadcastAdminTelemetry('agency:coins_transferred', transferRecord);
      this.signalingGateway.broadcastToUser(targetUser.id, 'wallet:coins_received', {
        amount: safeAmount,
        fromAgency: agency.name,
        notes: notes || 'Transferred by talent agency',
        timestamp: Date.now(),
      });
    }

    return {
      success: true,
      transfer: transferRecord,
      newAgencyCoinBalance: newAgencyCoins,
      deductedAmount: safeAmount,
      recipient: {
        id: targetUser.id,
        username: targetUser.username,
        displayName: targetUser.displayName,
      },
    };
  }

  /**
   * Get history of coin transfers initiated by an agency
   */
  async getAgencyTransfers(agencyId: string) {
    const inMemory = AgenciesService.agencyTransfersList.filter((t) => t.agencyId === agencyId);
    try {
      const ledger = await this.prisma.transactionLedger.findMany({
        where: { agencyId, type: 'RESELLER_TRANSFER' as any },
        orderBy: { createdAt: 'desc' },
        take: 200,
        include: { recipient: { select: { username: true, displayName: true, avatarUrl: true } } },
      });
      const persisted = ledger.map((l) => ({
        id: l.id,
        agencyId: l.agencyId,
        targetUserId: l.recipientId,
        targetUsername: l.recipient?.username,
        targetDisplayName: l.recipient?.displayName || l.recipient?.username,
        targetAvatarUrl: l.recipient?.avatarUrl,
        amount: l.coinsDebited,
        notes: l.notes || 'Agency coin distribution',
        timestamp: l.createdAt.toISOString(),
        status: 'SUCCESS',
      }));
      const seen = new Set<string>();
      return [...persisted, ...inMemory].filter((t) => {
        if (!t?.id || seen.has(t.id)) return false;
        seen.add(t.id);
        return true;
      });
    } catch {
      return inMemory;
    }
  }

  async updateAgency(id: string, dto: Partial<CreateAgencyDto>) {
    const index = AgenciesService.agenciesList.findIndex((a) => a.id === id);
    if (index !== -1) {
      AgenciesService.agenciesList[index] = {
        ...AgenciesService.agenciesList[index],
        ...dto,
        commissionPercent: dto.commissionPercent !== undefined ? Number(dto.commissionPercent) : AgenciesService.agenciesList[index].commissionPercent,
      };
    }

    try {
      await this.prisma.agency.update({
        where: { id },
        data: {
          ...(dto.name && { name: dto.name }),
          ...(dto.managerEmail && { managerEmail: dto.managerEmail }),
          ...(dto.commissionPercent !== undefined && { commissionPercent: Number(dto.commissionPercent) }),
        },
      });
    } catch {
      // ignore
    }

    return index !== -1 ? AgenciesService.agenciesList[index] : { success: true };
  }

  async deleteAgency(id: string) {
    try {
      await this.prisma.agency.deleteMany({ where: { id } });
    } catch {
      // ignore
    }
    AgenciesService.agenciesList = AgenciesService.agenciesList.filter((a) => a.id !== id);
    return { success: true, message: `Agency #${id} removed successfully.` };
  }

  async bindHost(dto: BindHostDto) {
    const code = dto.agencyCode.trim().toUpperCase();
    let agency = AgenciesService.agenciesList.find((a) => a.code === code);
    if (!agency) {
      try {
        agency = await this.prisma.agency.findUnique({ where: { code } });
      } catch {
        // ignore
      }
    }

    if (!agency) {
      throw new NotFoundException(`Agency with code "${code}" not found. Please verify the code with your talent manager.`);
    }

    try {
      // 1. Upgrade user role to HOST in database
      await this.prisma.user.updateMany({
        where: { id: dto.hostId },
        data: { role: 'HOST' as any },
      });

      // 2. Upsert HostBinding in database
      await this.prisma.hostBinding.upsert({
        where: { hostId: dto.hostId },
        create: {
          hostId: dto.hostId,
          agencyId: agency.id,
          status: 'APPROVED',
        },
        update: {
          agencyId: agency.id,
          status: 'APPROVED',
          boundAt: new Date(),
        },
      });

      // 3. Update in-memory registry
      const cached = UsersService.usersMap.get(dto.hostId);
      if (cached) {
        cached.role = 'HOST';
        cached.agency = {
          id: agency.id,
          name: agency.name,
          code: agency.code,
          commissionPercent: agency.commissionPercent,
        };
        UsersService.usersMap.set(dto.hostId, cached);
      }
    } catch (e) {
      console.warn('Could not persist host binding to DB, using in-memory state:', e);
    }

    const bindingPayload = {
      id: 'b-' + Date.now(),
      hostId: dto.hostId,
      agencyId: agency.id,
      agencyName: agency.name,
      agencyCode: agency.code,
      commissionPercent: agency.commissionPercent,
      status: 'APPROVED',
      boundAt: new Date().toISOString(),
    };

    // Broadcast Real-Time WebSocket Telemetry
    if (this.signalingGateway) {
      const cached = UsersService.usersMap.get(dto.hostId);
      this.signalingGateway.broadcastAdminTelemetry('admin:agency_host_bound', {
        hostId: dto.hostId,
        hostDisplayName: cached?.displayName || 'Host',
        agency: {
          id: agency.id,
          name: agency.name,
          code: agency.code,
          commissionPercent: agency.commissionPercent,
        },
        binding: bindingPayload,
      });

      this.signalingGateway.broadcastAdminTelemetry('admin:metrics_update', {
        eventType: 'HOST_AGENCY_BOUND',
        hostId: dto.hostId,
        agencyId: agency.id,
      });

      this.signalingGateway.broadcastToUser(dto.hostId, 'host:agency_bound', bindingPayload);
    }

    return {
      success: true,
      message: `Congratulations! You are now a certified Broadcaster Host affiliated with ${agency.name}! 🌟`,
      binding: bindingPayload,
    };
  }

  async getHostAgencyStatus(hostId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: hostId },
        include: {
          agencyBinding: {
            include: {
              agency: true,
            },
          },
        },
      });

      if (user) {
        return {
          isHost: user.role === 'HOST',
          role: user.role,
          agency: user.agencyBinding?.agency
            ? {
                id: user.agencyBinding.agency.id,
                name: user.agencyBinding.agency.name,
                code: user.agencyBinding.agency.code,
                commissionPercent: user.agencyBinding.agency.commissionPercent,
                boundAt: user.agencyBinding.boundAt.toISOString(),
              }
            : null,
        };
      }
    } catch {
      // fallback
    }

    const cached = UsersService.usersMap.get(hostId);
    return {
      isHost: cached?.role === 'HOST',
      role: cached?.role || 'USER',
      agency: null,
    };
  }
}
