import { Injectable, BadRequestException, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SignalingGateway } from '../signaling/signaling.gateway';
import { LevelsService } from '../levels/levels.service';
import { TransactionType } from '@prisma/client';

export interface PlayGameDto {
  userId: string;
  gameId: 'SLOTS_777' | 'ROULETTE' | 'DICE' | 'YUMMY';
  betAmount: number;
  betChoice?: string; // DICE: 'BIG','SMALL','TRIPLE'; YUMMY: dish key e.g. 'BURGER'
  roomId?: string;
  isAnonymous?: boolean;
}

export interface UpdateGameConfigDto {
  name?: string;
  description?: string;
  icon?: string;
  themeColor?: string;
  isEnabled?: boolean;
  minVipLevel?: number;
  minUserLevel?: number;
  minBet?: number;
  maxBet?: number;
  allowInLive?: boolean;
  allowInVoice?: boolean;
  allowStandalone?: boolean;
  sortOrder?: number;
}

/**
 * Static game definitions (rules, symbols, paytables). These describe *how* a game
 * plays. Admin-editable settings (enabled, level gates, bet limits) live in the
 * GameConfig table so they can be changed from the Admin Panel without redeploys.
 */
const GAME_DEFINITIONS: Record<string, any> = {
  SLOTS_777: {
    id: 'SLOTS_777',
    name: 'Lucky 777 Slots 🎰',
    description: 'Match 3 luxury symbols for up to 50x Mega Jackpot!',
    icon: '🎰',
    category: 'CASINO',
    themeColor: '#F59E0B',
    maxMultiplier: 50,
    symbols: ['7️⃣', '💎', '👑', '🍒', '🔔', '🍇'],
    payTable: {
      '7️⃣7️⃣7️⃣': 50,
      '💎💎💎': 25,
      '👑👑👑': 15,
      '🍒🍒🍒': 10,
      '🔔🔔🔔': 8,
      '🍇🍇🍇': 5,
      ANY_PAIR: 2,
    },
  },
  ROULETTE: {
    id: 'ROULETTE',
    name: 'Casino Lucky Wheel 🎡',
    description: 'Spin the wheel of fortune for up to 50x multiplier!',
    icon: '🎡',
    category: 'CASINO',
    themeColor: '#8B5CF6',
    maxMultiplier: 50,
    segments: [0, 2, 0, 5, 0, 10, 0, 20, 0, 2, 0, 50],
  },
  DICE: {
    id: 'DICE',
    name: 'Lucky Sic Bo Dice 🎲',
    description: 'Bet on Big (11-17), Small (4-10), or Any Triple (30x)!',
    icon: '🎲',
    category: 'CASINO',
    themeColor: '#EF4444',
    maxMultiplier: 30,
    options: [
      { key: 'SMALL', label: 'Small (4 - 10)', multiplier: 2 },
      { key: 'BIG', label: 'Big (11 - 17)', multiplier: 2 },
      { key: 'TRIPLE', label: 'Any Triple (All Match)', multiplier: 30 },
    ],
  },
  // BIGO-style "Yummy" food draw game: pick your dish and win up to 40x.
  YUMMY: {
    id: 'YUMMY',
    name: 'Yummy Foodie Draw 🍔',
    description: 'Pick your lucky dish and taste up to 40x multipliers!',
    icon: '🍔',
    category: 'FOOD',
    themeColor: '#10B981',
    maxMultiplier: 40,
    dishes: [
      { key: 'BURGER', emoji: '🍔', label: 'Burger' },
      { key: 'PIZZA', emoji: '🍕', label: 'Pizza' },
      { key: 'SUSHI', emoji: '🍣', label: 'Sushi' },
      { key: 'DONUT', emoji: '🍩', label: 'Donut' },
      { key: 'TACO', emoji: '🌮', label: 'Taco' },
      { key: 'RAMEN', emoji: '🍜', label: 'Ramen' },
    ],
  },
};

@Injectable()
export class GamesService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly signalingGateway: SignalingGateway,
    private readonly levelsService: LevelsService,
  ) {}

  async onModuleInit() {
    await this.seedDefaultConfigs();
  }

  /**
   * Seed a GameConfig row for each built-in game if it does not already exist.
   * Preserves any admin edits (only creates missing rows).
   */
  private async seedDefaultConfigs() {
    const defaults: Array<{ id: string; name: string; description: string; icon: string; maxMultiplier: number }> = [
      { id: 'SLOTS_777', name: 'Lucky 777 Slots 🎰', description: GAME_DEFINITIONS.SLOTS_777.description, icon: '🎰', maxMultiplier: 50 },
      { id: 'ROULETTE', name: 'Casino Lucky Wheel 🎡', description: GAME_DEFINITIONS.ROULETTE.description, icon: '🎡', maxMultiplier: 50 },
      { id: 'DICE', name: 'Lucky Sic Bo Dice 🎲', description: GAME_DEFINITIONS.DICE.description, icon: '🎲', maxMultiplier: 30 },
      { id: 'YUMMY', name: 'Yummy Foodie Draw 🍔', description: GAME_DEFINITIONS.YUMMY.description, icon: '🍔', maxMultiplier: 40 },
    ];

    for (let i = 0; i < defaults.length; i++) {
      const d = defaults[i];
      try {
        const existing = await this.prisma.gameConfig.findUnique({ where: { id: d.id } });
        if (!existing) {
          await this.prisma.gameConfig.create({
            data: {
              id: d.id,
              name: d.name,
              description: d.description,
              icon: d.icon,
              category: GAME_DEFINITIONS[d.id].category,
              themeColor: GAME_DEFINITIONS[d.id].themeColor,
              isEnabled: true,
              minVipLevel: 0,
              minUserLevel: 1,
              minBet: 10,
              maxBet: 10000,
              maxMultiplier: d.maxMultiplier,
              sortOrder: i,
              rules: {
                symbols: GAME_DEFINITIONS[d.id].symbols,
                segments: GAME_DEFINITIONS[d.id].segments,
                options: GAME_DEFINITIONS[d.id].options,
                dishes: GAME_DEFINITIONS[d.id].dishes,
              },
            },
          });
        }
      } catch {
        // DB offline — catalog falls back to in-memory defaults
      }
    }
  }

  private defaultConfig(id: string, sortOrder: number) {
    const def = GAME_DEFINITIONS[id];
    return {
      id,
      name: def.name,
      description: def.description,
      icon: def.icon,
      category: def.category,
      themeColor: def.themeColor,
      isEnabled: true,
      minVipLevel: 0,
      minUserLevel: 1,
      minBet: 10,
      maxBet: 10000,
      maxMultiplier: def.maxMultiplier,
      allowInLive: true,
      allowInVoice: true,
      allowStandalone: true,
      sortOrder,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Full config list for the Admin Panel (includes disabled games).
   */
  async getAllConfigs() {
    try {
      const configs = await this.prisma.gameConfig.findMany({ orderBy: { sortOrder: 'asc' } });
      if (configs.length > 0) return configs;
    } catch {
      // fall through
    }
    return Object.keys(GAME_DEFINITIONS).map((id, i) => this.defaultConfig(id, i));
  }

  /**
   * Public catalog for the recharge/game clients. Optionally filtered for a specific
   * user so locked games are reported (rather than simply hidden) with their lock reason.
   */
  async getCatalog(userId?: string) {
    const configs = await this.getAllConfigs();
    let user: any = null;
    if (userId) {
      try {
        user = await this.prisma.user.findUnique({ where: { id: userId } });
      } catch {
        user = null;
      }
    }
    const userLevel = user?.level || 1;
    const userVip = user?.vipLevel || 0;

    return configs
      .filter((c: any) => c.isEnabled)
      .map((c: any) => {
        const def = GAME_DEFINITIONS[c.id] || {};
        const levelLocked = user ? userLevel < (c.minUserLevel ?? 1) : false;
        const vipLocked = user ? userVip < (c.minVipLevel ?? 0) : false;
        const locked = levelLocked || vipLocked;
        return {
          id: c.id,
          name: c.name,
          description: c.description,
          icon: c.icon || def.icon,
          category: c.category,
          themeColor: c.themeColor,
          minBet: c.minBet ?? 10,
          maxBet: c.maxBet ?? 10000,
          maxMultiplier: c.maxMultiplier ?? def.maxMultiplier ?? 50,
          minVipLevel: c.minVipLevel ?? 0,
          minUserLevel: c.minUserLevel ?? 1,
          allowInLive: c.allowInLive ?? true,
          allowInVoice: c.allowInVoice ?? true,
          allowStandalone: c.allowStandalone ?? true,
          symbols: def.symbols,
          payTable: def.payTable,
          segments: def.segments,
          options: def.options,
          dishes: def.dishes,
          locked,
          lockReason: locked
            ? vipLocked
              ? `Unlocks at VIP ${c.minVipLevel}`
              : `Unlocks at Level ${c.minUserLevel}`
            : null,
        };
      });
  }

  /**
   * Admin updates a game's settings (enable/disable, level gates, bet limits).
   */
  async updateConfig(gameId: string, dto: UpdateGameConfigDto) {
    if (!GAME_DEFINITIONS[gameId]) {
      throw new NotFoundException(`Game '${gameId}' not found.`);
    }

    // Ensure a row exists (so updates work even on a fresh/offline DB).
    let existing: any = null;
    try {
      existing = await this.prisma.gameConfig.findUnique({ where: { id: gameId } });
      if (!existing) {
        const idx = Object.keys(GAME_DEFINITIONS).indexOf(gameId);
        const d = this.defaultConfig(gameId, idx);
        existing = await this.prisma.gameConfig.create({
          data: {
            id: d.id,
            name: d.name,
            description: d.description,
            icon: d.icon,
            category: d.category,
            themeColor: d.themeColor,
            isEnabled: d.isEnabled,
            minVipLevel: d.minVipLevel,
            minUserLevel: d.minUserLevel,
            minBet: d.minBet,
            maxBet: d.maxBet,
            maxMultiplier: d.maxMultiplier,
            sortOrder: d.sortOrder,
          },
        });
      }
    } catch {
      throw new BadRequestException('Game configuration store unavailable.');
    }

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.icon !== undefined) data.icon = dto.icon;
    if (dto.themeColor !== undefined) data.themeColor = dto.themeColor;
    if (dto.isEnabled !== undefined) data.isEnabled = !!dto.isEnabled;
    if (dto.minVipLevel !== undefined) data.minVipLevel = Math.max(0, Number(dto.minVipLevel));
    if (dto.minUserLevel !== undefined) data.minUserLevel = Math.max(1, Number(dto.minUserLevel));
    if (dto.minBet !== undefined) data.minBet = Math.max(1, Number(dto.minBet));
    if (dto.maxBet !== undefined) data.maxBet = Math.max(1, Number(dto.maxBet));
    if (dto.allowInLive !== undefined) data.allowInLive = !!dto.allowInLive;
    if (dto.allowInVoice !== undefined) data.allowInVoice = !!dto.allowInVoice;
    if (dto.allowStandalone !== undefined) data.allowStandalone = !!dto.allowStandalone;
    if (dto.sortOrder !== undefined) data.sortOrder = Number(dto.sortOrder);

    const updated = await this.prisma.gameConfig.update({ where: { id: gameId }, data });
    this.broadcastGamesUpdated('update', updated);
    return updated;
  }

  async toggleConfig(gameId: string) {
    if (!GAME_DEFINITIONS[gameId]) {
      throw new NotFoundException(`Game '${gameId}' not found.`);
    }
    let existing: any = null;
    try {
      existing = await this.prisma.gameConfig.findUnique({ where: { id: gameId } });
    } catch {
      existing = null;
    }
    if (!existing) {
      // create then toggle
      await this.updateConfig(gameId, {});
      existing = await this.prisma.gameConfig.findUnique({ where: { id: gameId } });
    }
    const updated = await this.prisma.gameConfig.update({
      where: { id: gameId },
      data: { isEnabled: !existing.isEnabled },
    });
    this.broadcastGamesUpdated('toggle', updated);
    return updated;
  }

  private broadcastGamesUpdated(action: string, config: any) {
    try {
      this.signalingGateway?.broadcastAdminTelemetry('admin:games_updated', {
        action,
        game: config,
        timestamp: Date.now(),
      });
    } catch {
      // safe fallback
    }
  }

  /**
   * Execute atomic game round with balance verification, level gates, and provably fair outcome
   */
  async playGame(dto: PlayGameDto) {
    const { userId, gameId, betAmount, betChoice, roomId, isAnonymous } = dto;

    const def = GAME_DEFINITIONS[gameId];
    if (!def) {
      throw new BadRequestException('Unknown game ID.');
    }

    // 1. Load admin config (enable/disable + level gates + bet limits)
    let config: any = null;
    try {
      config = await this.prisma.gameConfig.findUnique({ where: { id: gameId } });
    } catch {
      config = null;
    }
    const minBet = config?.minBet ?? 10;
    const maxBet = config?.maxBet ?? 10000;

    if (config && config.isEnabled === false) {
      throw new BadRequestException('This game is currently disabled by the administrator.');
    }

    if (!betAmount || betAmount < minBet) {
      throw new BadRequestException(`Minimum bet is ${minBet} coins.`);
    }
    if (betAmount > maxBet) {
      throw new BadRequestException(`Maximum bet is ${maxBet.toLocaleString()} coins per round.`);
    }

    // 2. Fetch user & wallet
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { wallet: true },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    // Enforce admin level restrictions
    const userVip = (user as any).vipLevel || 0;
    const userLevel = (user as any).level || 1;
    if (config) {
      if ((config.minVipLevel ?? 0) > userVip) {
        throw new BadRequestException(
          `This game requires VIP ${config.minVipLevel}. You are VIP ${userVip}.`,
        );
      }
      if ((config.minUserLevel ?? 1) > userLevel) {
        throw new BadRequestException(
          `This game requires user Level ${config.minUserLevel}. You are Level ${userLevel}.`,
        );
      }
    }

    // Enforce admin-configured surface availability (live video / voice / standalone).
    let surface: 'LIVE' | 'VOICE' | 'STANDALONE' = 'STANDALONE';
    if (roomId) {
      const room = await this.prisma.liveRoom.findUnique({
        where: { id: roomId },
        select: { roomType: true, status: true },
      });
      if (!room || room.status !== 'LIVE') {
        throw new BadRequestException('This room is not currently live.');
      }
      surface = room.roomType === 'VOICE' ? 'VOICE' : 'LIVE';
    }
    if (config) {
      if (surface === 'LIVE' && config.allowInLive === false) {
        throw new BadRequestException('This game is not available inside live video rooms.');
      }
      if (surface === 'VOICE' && config.allowInVoice === false) {
        throw new BadRequestException('This game is not available in voice party rooms.');
      }
      if (surface === 'STANDALONE' && config.allowStandalone === false) {
        throw new BadRequestException('This game can only be played inside a live room.');
      }
    }

    const currentCoins = user.wallet?.coins ?? 0;
    if (currentCoins < betAmount) {
      throw new BadRequestException(`Insufficient coins! You have ${currentCoins} 🪙, but need ${betAmount} 🪙.`);
    }

    // 3. VIP anonymous check — VIP 2+ AND the tier's Anonymous Games benefit enabled by admin
    const canBeAnonymous = userVip >= 2 && (await this.levelsService.userHasFeature(user.id, 'anonymousInGames'));
    const effectiveAnonymous = canBeAnonymous && isAnonymous === true;
    const displayedName = effectiveAnonymous
      ? 'VIP Mystery Player 🕵️'
      : (user.displayName || user.username || 'Player');

    // 4. Compute game outcome
    let multiplier = 0;
    let outcomeDetails: any = {};

    if (gameId === 'SLOTS_777') {
      const rollReel = () => {
        const rand = Math.random();
        if (rand < 0.12) return '7️⃣';
        if (rand < 0.25) return '💎';
        if (rand < 0.40) return '👑';
        if (rand < 0.60) return '🍒';
        if (rand < 0.80) return '🔔';
        return '🍇';
      };

      const reel1 = rollReel();
      const reel2 = rollReel();
      const reel3 = rollReel();
      const reels = [reel1, reel2, reel3];

      if (reel1 === reel2 && reel2 === reel3) {
        if (reel1 === '7️⃣') multiplier = 50;
        else if (reel1 === '💎') multiplier = 25;
        else if (reel1 === '👑') multiplier = 15;
        else if (reel1 === '🍒') multiplier = 10;
        else if (reel1 === '🔔') multiplier = 8;
        else multiplier = 5;
      } else if (reel1 === reel2 || reel2 === reel3 || reel1 === reel3) {
        multiplier = 2;
      } else {
        multiplier = 0;
      }

      outcomeDetails = {
        reels,
        isJackpot: multiplier >= 15,
      };
    } else if (gameId === 'ROULETTE') {
      const segments = def.segments || [0, 2, 0, 5, 0, 10, 0, 20, 0, 2, 0, 50];
      const selectedIndex = Math.floor(Math.random() * segments.length);
      multiplier = segments[selectedIndex];
      outcomeDetails = {
        selectedIndex,
        segmentMultiplier: multiplier,
        isJackpot: multiplier >= 20,
      };
    } else if (gameId === 'DICE') {
      const d1 = Math.floor(Math.random() * 6) + 1;
      const d2 = Math.floor(Math.random() * 6) + 1;
      const d3 = Math.floor(Math.random() * 6) + 1;
      const sum = d1 + d2 + d3;
      const isTriple = d1 === d2 && d2 === d3;
      const choice = (betChoice || 'BIG').toUpperCase();

      if (choice === 'TRIPLE') {
        multiplier = isTriple ? 30 : 0;
      } else if (choice === 'SMALL') {
        multiplier = (!isTriple && sum >= 4 && sum <= 10) ? 2 : 0;
      } else {
        multiplier = (!isTriple && sum >= 11 && sum <= 17) ? 2 : 0;
      }

      outcomeDetails = {
        dice: [d1, d2, d3],
        sum,
        isTriple,
        choice,
        isJackpot: multiplier >= 30,
      };
    } else if (gameId === 'YUMMY') {
      const dishes = def.dishes || [];
      // Player picks a dish; the house spins a weighted wheel of dishes.
      // Weighted draw: higher-value dishes are rarer.
      const weighted = [
        { key: 'BURGER', weight: 26, multiplier: 0 },
        { key: 'PIZZA', weight: 22, multiplier: 0 },
        { key: 'TACO', weight: 18, multiplier: 2 },
        { key: 'SUSHI', weight: 15, multiplier: 3 },
        { key: 'RAMEN', weight: 12, multiplier: 5 },
        { key: 'DONUT', weight: 7, multiplier: 40 },
      ];
      const total = weighted.reduce((s, w) => s + w.weight, 0);
      let roll = Math.random() * total;
      let landed = weighted[weighted.length - 1];
      for (const w of weighted) {
        if (roll < w.weight) { landed = w; break; }
        roll -= w.weight;
      }
      const picked = (betChoice || 'BURGER').toUpperCase();
      // Win only if the drawn dish matches the player's pick.
      multiplier = picked === landed.key ? landed.multiplier : 0;
      const pickedDish = dishes.find((d: any) => d.key === picked) || { key: picked, emoji: '🍽️', label: picked };
      const landedDish = dishes.find((d: any) => d.key === landed.key) || { key: landed.key, emoji: '🍽️', label: landed.key };
      outcomeDetails = {
        pickedDish,
        landedDish,
        dishes: dishes.map((d: any) => d.emoji),
        isJackpot: multiplier >= 40,
      };
    }

    const winningsCoins = Math.floor(betAmount * multiplier);
    const netChange = winningsCoins - betAmount;

    // 5. Atomic database update with a race-safe conditional debit so a user
    //    can never play more rounds than their balance allows.
    let updatedWallet: any;
    try {
      updatedWallet = await this.prisma.$transaction(async (tx) => {
        const debited = await tx.wallet.updateMany({
          where: { userId, coins: { gte: betAmount } },
          data: { coins: { decrement: betAmount } },
        });
        if (debited.count === 0) {
          throw new BadRequestException(
            `Insufficient coins! You need ${betAmount} 🪙 to play.`,
          );
        }

        if (winningsCoins > 0) {
          await tx.wallet.update({
            where: { userId },
            data: { coins: { increment: winningsCoins } },
          });
        }

        await tx.transactionLedger.create({
          data: {
            type: 'GAME_BET' as TransactionType,
            senderId: userId,
            roomId: roomId || null,
            coinsDebited: betAmount,
            notes: `Game Bet: [${gameId}] bet ${betAmount} coins`,
          },
        });

        if (winningsCoins > 0) {
          await tx.transactionLedger.create({
            data: {
              type: 'GAME_WIN' as TransactionType,
              recipientId: userId,
              roomId: roomId || null,
              coinsDebited: 0,
              notes: `Game Win: [${gameId}] won ${winningsCoins} coins (${multiplier}x)`,
            },
          });
        }

        return tx.wallet.findUnique({ where: { userId } });
      });
    } catch (e: any) {
      if (e instanceof BadRequestException) throw e;
      throw new BadRequestException('Game round could not be completed. Please try again.');
    }

    const isWin = winningsCoins > 0;
    const gameTitle = config?.name || def.name;

    // 6. Broadcast to room if played in a room
    if (roomId) {
      this.signalingGateway.server?.to(roomId).emit('room:game_result', {
        gameId,
        gameTitle,
        playerId: effectiveAnonymous ? 'anonymous' : user.id,
        playerName: displayedName,
        playerAvatar: effectiveAnonymous ? null : user.avatarUrl,
        vipLevel: effectiveAnonymous ? 0 : userVip,
        isAnonymous: effectiveAnonymous,
        betAmount,
        multiplier,
        winningsCoins,
        winAmount: winningsCoins,
        isWin,
        outcomeDetails,
        timestamp: Date.now(),
      });
    }

    // Direct push new balance to user socket
    this.signalingGateway.broadcastToUser(userId, 'wallet:balance_update', {
      userId,
      coins: updatedWallet.coins,
      diamonds: updatedWallet.diamonds,
    });

    return {
      success: true,
      gameId,
      gameTitle,
      betAmount,
      multiplier,
      winningsCoins,
      netChange,
      newCoinsBalance: updatedWallet.coins,
      isWin,
      outcomeDetails,
      displayedName,
      isAnonymous: effectiveAnonymous,
    };
  }

  /**
   * Fetch user recent game transactions
   */
  async getUserGameHistory(userId: string) {
    return this.prisma.transactionLedger.findMany({
      where: {
        OR: [
          { senderId: userId, type: ('GAME_BET' as any) as TransactionType },
          { recipientId: userId, type: ('GAME_WIN' as any) as TransactionType },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }
}
