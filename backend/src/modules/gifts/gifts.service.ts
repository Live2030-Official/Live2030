import { Injectable, BadRequestException, NotFoundException, ForbiddenException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SignalingGateway } from '../signaling/signaling.gateway';
import { LevelsService } from '../levels/levels.service';
import { SendGiftDto, CreateGiftDto, UpdateEconomicsDto } from './dto/gift.dto';
import { TransactionType } from '@prisma/client';

@Injectable()
export class GiftsService implements OnModuleInit {
  private economics = {
    platformShare: 45,
    hostShare: 42,
    agencyShare: 13,
  };

  private static giftsList = [
    { id: 'g1', name: 'Rose 🌹', costCoins: 10, diamondsAwarded: 4, category: 'Classic', iconUrl: '🌹', minVipLevel: 0, isActive: true, sortOrder: 1 },
    { id: 'g2', name: 'Diamond Ring 💍', costCoins: 100, diamondsAwarded: 42, category: 'Classic', iconUrl: '💍', minVipLevel: 0, isActive: true, sortOrder: 2 },
    { id: 'g3', name: 'Sports Car 🏎️', costCoins: 1000, diamondsAwarded: 420, category: 'Luxury', iconUrl: '🏎️', minVipLevel: 0, isActive: true, sortOrder: 3 },
    { id: 'g4', name: 'Luxury Yacht 🛥️', costCoins: 5000, diamondsAwarded: 2100, category: 'Luxury', iconUrl: '🛥️', minVipLevel: 0, isActive: true, sortOrder: 4 },
    { id: 'g5', name: 'Golden Dragon 🐉', costCoins: 10000, diamondsAwarded: 4200, category: 'Mythic', iconUrl: '🐉', minVipLevel: 0, isActive: true, sortOrder: 5 },
    { id: 'g6', name: 'Space Rocket 🚀', costCoins: 50000, diamondsAwarded: 21000, category: 'Mythic', iconUrl: '🚀', minVipLevel: 0, isActive: true, sortOrder: 6 },
    { id: 'g_vip1_yacht', name: 'VIP 1 Royal Yacht 🛥️', costCoins: 500, diamondsAwarded: 210, category: 'VIP Exclusive', iconUrl: '🛥️', minVipLevel: 1, isActive: true, sortOrder: 7 },
    { id: 'g_vip2_lambo', name: 'VIP 2 Cyber Lambo 🏎️', costCoins: 1000, diamondsAwarded: 420, category: 'VIP Exclusive', iconUrl: '🏎️', minVipLevel: 2, isActive: true, sortOrder: 8 },
    { id: 'g_vip3_jet', name: 'VIP 3 Private Jet ✈️', costCoins: 2000, diamondsAwarded: 840, category: 'VIP Exclusive', iconUrl: '✈️', minVipLevel: 3, isActive: true, sortOrder: 9 },
    { id: 'g_vip4_castle', name: 'VIP 4 Crystal Castle 🏰', costCoins: 3500, diamondsAwarded: 1470, category: 'VIP Exclusive', iconUrl: '🏰', minVipLevel: 4, isActive: true, sortOrder: 10 },
    { id: 'g_vip5_phoenix', name: 'VIP 5 Mythic Phoenix 🔥', costCoins: 5000, diamondsAwarded: 2100, category: 'VIP Exclusive', iconUrl: '🔥', minVipLevel: 5, isActive: true, sortOrder: 11 },
    { id: 'g_vip6_dragon', name: 'VIP 6 Celestial Dragon 🐉', costCoins: 7500, diamondsAwarded: 3150, category: 'VIP Exclusive', iconUrl: '🐉', minVipLevel: 6, isActive: true, sortOrder: 12 },
    { id: 'g_vip7_galaxy', name: 'VIP 7 Cosmic Galaxy 🌌', costCoins: 10000, diamondsAwarded: 4200, category: 'VIP Exclusive', iconUrl: '🌌', minVipLevel: 7, isActive: true, sortOrder: 13 },
    { id: 'g_vip8_sovereign', name: 'VIP 8 God of Wealth 👑', costCoins: 15000, diamondsAwarded: 6300, category: 'VIP Exclusive', iconUrl: '👑', minVipLevel: 8, isActive: true, sortOrder: 14 },
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly signalingGateway: SignalingGateway,
    private readonly levelsService: LevelsService,
  ) {}

  async onModuleInit() {
    await this.seedDefaultGifts();
    await this.getEconomics();
  }

  private async seedDefaultGifts() {
    try {
      // Seed only on a fresh install. Re-creating "missing" defaults would
      // resurrect gifts an admin deliberately deleted from the dashboard.
      const existingCount = await this.prisma.gift.count();
      if (existingCount > 0) return;
      await this.prisma.gift.createMany({ data: GiftsService.giftsList as any });
    } catch {
      // ignore
    }
  }

  /**
   * Get all active virtual gifts for the in-app gift tray and admin dashboard
   */
  async getGifts() {
    try {
      const gifts = await this.prisma.gift.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      });
      if (gifts.length > 0) return gifts;
    } catch {
      // fallback
    }

    return GiftsService.giftsList.filter((g) => g.isActive !== false);
  }

  /**
   * Atomic Virtual Gifting Transaction with Revenue Split & Real-time Ledger
   * - Deducts Coins from Sender Wallet
   * - Credits Diamonds to Host Wallet (42% diamond conversion)
   * - Calculates Agency Commission (e.g. 12% if Host is bound to Agency)
   * - Logs full transaction in TransactionLedger
   * - Pushes real-time WebSocket events to Room, Sender, Host & Admin Dashboard
   */
  async sendGift(senderId: string, dto: SendGiftDto) {
    const { roomId, giftId, quantity = 1, recipientId, targetSeatIndex, targetHost } = dto;

    // 1. Fetch gift from database or default list
    let gift: any = null;
    try {
      gift = await this.prisma.gift.findUnique({ where: { id: giftId } });
    } catch {
      // fallback
    }

    if (!gift) {
      gift = GiftsService.giftsList.find((g) => g.id === giftId) || null;
    }

    if (!gift) {
      throw new NotFoundException(`Gift "${giftId}" does not exist.`);
    }
    if (gift.isActive === false) {
      throw new BadRequestException(`Gift "${gift.name}" is not currently available.`);
    }

    const totalCostCoins = (gift.costCoins || 10) * quantity;

    // 2. Fetch Sender User & Wallet
    let sender = await this.prisma.user.findUnique({
      where: { id: senderId },
      include: { wallet: true },
    });

    if (!sender) {
      throw new NotFoundException('Sender user account not found');
    }

    // VIP Gift Check: If gift is VIP exclusive, sender must meet minimum VIP level
    if (gift.minVipLevel && gift.minVipLevel > 0) {
      const senderStatus = await this.levelsService.getUserVipStatus(sender.id);
      if ((senderStatus.vipLevel || 0) < gift.minVipLevel) {
        throw new ForbiddenException(
          `Exclusive VIP ${gift.minVipLevel} Gift! You must be at least VIP ${gift.minVipLevel} to send "${gift.name}". Upgrade to VIP to unlock!`,
        );
      }
    }

    // Ensure sender has wallet
    if (!sender.wallet) {
      sender.wallet = await this.prisma.wallet.create({
        data: { userId: sender.id, coins: 0, diamonds: 0 },
      });
    }

    if (sender.wallet.coins < totalCostCoins) {
      throw new BadRequestException(
        `Insufficient coins! Balance: ${sender.wallet.coins} 🪙, Needed: ${totalCostCoins} 🪙. Please top up coins.`,
      );
    }

    // 3. Determine Recipient (The Host)
    let recipient: any = null;
    let room: any = null;

    if (recipientId) {
      recipient = await this.prisma.user.findUnique({
        where: { id: recipientId },
        include: {
          wallet: true,
          agencyBinding: {
            include: { agency: true },
          },
        },
      });
    }

    if (!recipient && roomId) {
      room = await this.prisma.liveRoom.findFirst({
        where: {
          OR: [{ agoraChannelName: roomId }, { id: roomId }],
        },
        include: {
          host: {
            include: {
              wallet: true,
              agencyBinding: {
                include: { agency: true },
              },
            },
          },
        },
      });
      if (room?.host) {
        recipient = room.host;
      }
    }

    if (!recipient) {
      throw new NotFoundException('No active broadcaster or host recipient found for this gift.');
    }

    // Ensure recipient has wallet
    if (!recipient.wallet) {
      recipient.wallet = await this.prisma.wallet.create({
        data: { userId: recipient.id, coins: 0, diamonds: 0 },
      });
    }

    // 4. Calculate Dynamic Economic Revenue Split
    // Total gross USD value (100 coins = $1.00 USD)
    const amountUSD = parseFloat((totalCostCoins * 0.01).toFixed(4));

    let agencyCommissionUSD = 0.0;
    let agencyId: string | null = null;
    let platformCutPercent = this.economics.platformShare; // e.g. 45%
    let hostCutPercent = this.economics.hostShare; // e.g. 42%
    let agencyCutPercent = 0.0;

    const hasActiveAgency = recipient.agencyBinding && recipient.agencyBinding.status === 'APPROVED' && recipient.agencyBinding.agency;

    if (hasActiveAgency) {
      agencyId = recipient.agencyBinding.agencyId;
      agencyCutPercent = recipient.agencyBinding.agency.commissionPercent !== undefined && recipient.agencyBinding.agency.commissionPercent !== null
        ? Number(recipient.agencyBinding.agency.commissionPercent)
        : this.economics.agencyShare;
      hostCutPercent = Math.max(0, 100 - platformCutPercent - agencyCutPercent);
      agencyCommissionUSD = parseFloat(((amountUSD * agencyCutPercent) / 100).toFixed(4));
    } else {
      // Independent Host: No agency cut, remaining non-platform share routes directly to host streamer!
      hostCutPercent = Math.max(0, 100 - platformCutPercent);
      agencyCutPercent = 0.0;
      agencyCommissionUSD = 0.0;
    }

    const platformRevenueUSD = Math.max(0, parseFloat(((amountUSD * platformCutPercent) / 100).toFixed(4)));

    // Diamonds: honour the gift's configured award when set, otherwise derive from Host Cut %.
    const configuredDiamonds = Number(gift.diamondsAwarded || 0);
    const totalDiamonds =
      configuredDiamonds > 0
        ? Math.max(1, Math.round(configuredDiamonds * quantity))
        : Math.max(1, Math.round((totalCostCoins * hostCutPercent) / 100));

    // 5. Execute Atomic Database Transaction (interactive so failures roll back cleanly)
    const updatedSenderWallet: any = await this.prisma.$transaction(async (tx) => {
      // Conditional debit prevents concurrent sends from overdrawing the wallet.
      const debit = await tx.wallet.updateMany({
        where: { userId: sender.id, coins: { gte: totalCostCoins } },
        data: { coins: { decrement: totalCostCoins } },
      });
      if (debit.count === 0) {
        throw new BadRequestException(
          `Insufficient coins! Balance: ${sender.wallet.coins} 🪙, Needed: ${totalCostCoins} 🪙. Please top up coins.`,
        );
      }

      const hostWallet = await tx.wallet.update({
        where: { userId: recipient.id },
        data: {
          diamonds: { increment: totalDiamonds },
          totalDiamondsEarned: { increment: totalDiamonds },
        },
      });

      const ledger = await tx.transactionLedger.create({
        data: {
          type: TransactionType.GIFT_TRANSACTION,
          senderId: sender.id,
          recipientId: recipient.id,
          agencyId,
          roomId: room?.id || null,
          giftId: gift.id,
          coinsDebited: totalCostCoins,
          diamondsCredited: totalDiamonds,
          agencyCommissionUSD,
          platformRevenueUSD,
          amountUSD,
          notes: `Gift [${gift.name}] x${quantity} from ${sender.displayName} to ${recipient.displayName} (Host Cut: ${hostCutPercent}%, Agency: ${agencyCutPercent}%, Platform: ${platformCutPercent}%)`,
        },
      });

      // Credit the agency's payable commission wallet (durable balance)
      if (agencyId && agencyCommissionUSD > 0) {
        await tx.agencyWallet.upsert({
          where: { agencyId },
          create: {
            agencyId,
            commissionUSD: agencyCommissionUSD,
            totalCommissionUSD: agencyCommissionUSD,
          },
          update: {
            commissionUSD: { increment: agencyCommissionUSD },
            totalCommissionUSD: { increment: agencyCommissionUSD },
          },
        });
      }

      return { wallet: hostWallet, ledger };
    });
    const updatedHostWallet = updatedSenderWallet.wallet;
    const ledgerEntry = updatedSenderWallet.ledger;

    // Update LiveRoom total diamonds if room is tracked
    if (room?.id) {
      await this.prisma.liveRoom.update({
        where: { id: room.id },
        data: { totalDiamondsEarned: { increment: totalDiamonds } },
      }).catch(() => null);
    }

    // 6. Broadcast Real-time Events
    const giftPayload = {
      id: `gift_${Date.now()}`,
      name: gift.name,
      coins: totalCostCoins,
      diamondsAwarded: totalDiamonds,
      targetSeatIndex: targetSeatIndex !== undefined ? targetSeatIndex : null,
      targetHost: targetHost || 'host1',
      sender: {
        id: sender.id,
        displayName: sender.displayName,
        avatarUrl: sender.avatarUrl,
        level: sender.level,
      },
      recipient: {
        id: recipient.id,
        displayName: recipient.displayName,
      },
      hostDiamondsTotal: updatedHostWallet.diamonds,
      timestamp: Date.now(),
    };

    // Broadcast overlay to live room
    this.signalingGateway.server?.to(roomId).emit('gift:broadcast', giftPayload);

    // If room is in active PK Battle, push score update to the selected host
    const pkTarget: 'host1' | 'host2' = targetHost === 'host2' ? 'host2' : 'host1';
    this.signalingGateway.recordPKScore(roomId, pkTarget, totalDiamonds);

    // Direct push balance updates to sender & host sockets
    this.signalingGateway.broadcastToUser(sender.id, 'wallet:balance_update', {
      userId: sender.id,
      coins: updatedSenderWallet.coins,
      diamonds: updatedSenderWallet.diamonds,
    });
    this.signalingGateway.broadcastToUser(recipient.id, 'wallet:balance_update', {
      userId: recipient.id,
      coins: updatedHostWallet.coins,
      diamonds: updatedHostWallet.diamonds,
    });

    // Real-time Level XP progression: Award 10 XP per Coin to Sender, 10 XP per Diamond to Host
    try {
      await this.levelsService.awardXp(sender.id, totalCostCoins * 10, `GIFT_SENT_${gift.name}`);
      await this.levelsService.awardXp(recipient.id, totalDiamonds * 10, `GIFT_RECEIVED_${gift.name}`);
    } catch {
      // Non-blocking level update
    }

    // Push instant telemetry and wallet updates to Admin Dashboard
    this.signalingGateway.broadcastAdminTelemetry('admin:wallet_updated', {
      userId: sender.id,
      coins: updatedSenderWallet.coins,
      diamonds: updatedSenderWallet.diamonds,
    });
    this.signalingGateway.broadcastAdminTelemetry('admin:wallet_updated', {
      userId: recipient.id,
      coins: updatedHostWallet.coins,
      diamonds: updatedHostWallet.diamonds,
    });
    this.signalingGateway.broadcastAdminTelemetry('admin:metrics_update', {
      type: 'GIFT_TRANSACTION',
      giftName: gift.name,
      sender: sender.displayName,
      recipient: recipient.displayName,
      coinsDebited: totalCostCoins,
      diamondsCredited: totalDiamonds,
      agencyCommissionUSD,
      platformRevenueUSD,
      hostCutPercent,
      agencyCutPercent,
      platformCutPercent,
      hasAgency: Boolean(hasActiveAgency),
      roomId,
      timestamp: Date.now(),
    });

    return {
      success: true,
      gift: gift.name,
      quantity,
      coinsDebited: totalCostCoins,
      remainingCoins: updatedSenderWallet.coins,
      diamondsCreditedToHost: totalDiamonds,
      hostTotalDiamonds: updatedHostWallet.diamonds,
      agencyCommissionUSD,
      platformRevenueUSD,
      transactionId: ledgerEntry.id,
    };
  }

  /**
   * Super Admin: Get active revenue economics split matrix
   */
  async getEconomics() {
    try {
      const setting = await this.prisma.systemSetting.findUnique({
        where: { key: 'REVENUE_ECONOMICS' },
      });
      if (setting?.value) {
        const parsed = JSON.parse(setting.value);
        this.economics = {
          platformShare: Number(parsed.platformShare) ?? 45,
          hostShare: Number(parsed.hostShare) ?? 42,
          agencyShare: Number(parsed.agencyShare) ?? 13,
        };
      }
    } catch {
      // fallback
    }
    return this.economics;
  }

  /**
   * Super Admin: Update revenue economics split matrix in real-time
   */
  async updateEconomics(dto: UpdateEconomicsDto) {
    const platform = Number(dto.platformShare) || 0;
    const host = Number(dto.hostShare) || 0;
    const agency = Number(dto.agencyShare) || 0;

    if (platform < 0 || host < 0 || agency < 0) {
      throw new BadRequestException('Cut percentages cannot be negative.');
    }

    if (platform + host + agency !== 100) {
      throw new BadRequestException(`Revenue split must sum up to 100%. Current sum: ${platform + host + agency}%`);
    }

    this.economics = { platformShare: platform, hostShare: host, agencyShare: agency };

    try {
      await this.prisma.systemSetting.upsert({
        where: { key: 'REVENUE_ECONOMICS' },
        create: {
          key: 'REVENUE_ECONOMICS',
          value: JSON.stringify(this.economics),
          description: 'Live 2030 Platform Revenue Distribution Split Matrix',
        },
        update: {
          value: JSON.stringify(this.economics),
        },
      });
    } catch {
      // ignore
    }

    this.signalingGateway.broadcastAdminTelemetry('admin:economics_updated', {
      economics: this.economics,
      timestamp: Date.now(),
    });

    return {
      success: true,
      message: 'Platform revenue distribution matrix updated successfully in real-time!',
      economics: this.economics,
    };
  }

  /**
   * Create a new gift (Super Admin)
   */
  async createGift(dto: CreateGiftDto) {
    const newGift = {
      id: `g${Date.now()}`,
      name: dto.name,
      costCoins: Number(dto.costCoins),
      diamondsAwarded: Number(dto.diamondsAwarded) || Math.floor(Number(dto.costCoins) * 0.42),
      iconUrl: dto.iconUrl || '🎁',
      animationUrl: dto.animationUrl || null,
      category: dto.category || 'Standard',
      minVipLevel: Number(dto.minVipLevel) || 0,
      isActive: true,
      sortOrder: GiftsService.giftsList.length + 1,
    };

    GiftsService.giftsList.push(newGift);

    try {
      await this.prisma.gift.create({
        data: newGift,
      });
    } catch {
      // handled via in-memory list
    }

    return newGift;
  }

  /**
   * Update an existing gift (Super Admin)
   */
  async updateGift(id: string, dto: Partial<CreateGiftDto> & { isActive?: boolean; sortOrder?: number }) {
    const existing = await this.prisma.gift.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Gift #${id} not found.`);
    }

    const updated = await this.prisma.gift.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.costCoins !== undefined && { costCoins: Number(dto.costCoins) }),
        ...(dto.diamondsAwarded !== undefined && { diamondsAwarded: Number(dto.diamondsAwarded) }),
        ...(dto.iconUrl !== undefined && { iconUrl: dto.iconUrl }),
        ...(dto.animationUrl !== undefined && { animationUrl: dto.animationUrl }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.minVipLevel !== undefined && { minVipLevel: Number(dto.minVipLevel) }),
        ...(dto.isActive !== undefined && { isActive: !!dto.isActive }),
        ...(dto.sortOrder !== undefined && { sortOrder: Number(dto.sortOrder) }),
      },
    });

    const index = GiftsService.giftsList.findIndex((g) => g.id === id);
    if (index !== -1) {
      GiftsService.giftsList[index] = { ...GiftsService.giftsList[index], ...dto };
    }

    return updated;
  }

  /**
   * Delete a gift (Super Admin)
   */
  async deleteGift(id: string) {
    GiftsService.giftsList = GiftsService.giftsList.filter((g) => g.id !== id);

    const existing = await this.prisma.gift.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Gift #${id} not found.`);
    }
    await this.prisma.gift.delete({ where: { id } });

    return { success: true, message: `Gift #${id} deleted successfully.` };
  }
}
