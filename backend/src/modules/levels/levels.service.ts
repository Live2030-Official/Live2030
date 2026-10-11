import { Injectable, OnModuleInit, NotFoundException, BadRequestException, Logger, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SignalingGateway } from '../signaling/signaling.gateway';
import { UsersService } from '../users/users.service';
import {
  UpdateLevelConfigDto,
  SetUserVipDto,
  UpdateVipSettingsDto,
  TestEntranceDto,
  VipAnnouncementDto,
  RecordVisitDto,
  SetCustomIdDto,
} from './dto/level.dto';
import { VIP_FEATURE_CATALOG, VIP_FEATURE_CATEGORIES } from './vip-features';

export interface VipFeatureMap {
  unlimitedChat: boolean;
  unlimitedPrivateMedia: boolean;
  unlimitedComments: boolean;
  viewProfileVisitors: boolean;
  lockRooms: boolean;
  animatedAvatar: boolean;
  customRoomCover: boolean;
  rejectStrangerMessages: boolean;
  disableFollowing: boolean;
  hideLocationInRooms: boolean;
  specialVipGifts: boolean;
  customId: boolean;
  vipBadge: boolean;
  vipFrame: boolean;
  anonymousInGames?: boolean;
  customNameColor?: boolean;
  vipChatBubble?: boolean;
  invisibleOnlineStatus?: boolean;
  hideCountry?: boolean;
  mysteryMode?: boolean;
  hideFromVisitors?: boolean;
  specialEntryEffect?: boolean;
  hideRoomFromTrending?: boolean;
  kickProtection?: boolean;
  banProtection?: boolean;
  animatedFrame?: boolean;
  dailyGlobalRoomAnnouncement?: boolean;
  additionalGiftSet?: boolean;
  higherPriorityInLists?: boolean;
  kickImmunity?: boolean;
  appLoginNotification?: boolean;
  legendaryLoginEffect?: boolean;
  specialUniqueName?: boolean;
  higherPriorityInMenus?: boolean;
  exclusiveNameStyle?: boolean;
  stealthRoomAccess?: boolean;
  topVipFrame?: boolean;
  highestLoginEffect?: boolean;
  topVipBadge?: boolean;
  exclusiveVipIdentity?: boolean;
  maxSystemPriority?: boolean;
  [key: string]: boolean | undefined;
}

export interface VipConfigRecord {
  level: number;
  title: string;
  minXp: number;
  minRechargeUSD: number;
  badgeColor: string;
  badgeTitle: string;
  badgeIconUrl: string | null;
  frameUrl: string | null;
  animatedFrameUrl: string | null;
  isAnimatedFrame: boolean;
  chatBubbleColor: string;
  chatBubbleStyle: string;
  nameColor: string;
  entryEffectUrl: string | null;
  entryEffectType: 'NONE' | 'SPECIAL' | 'LEGENDARY' | 'HIGHEST';
  lottieUrl: string | null;
  perks: string[];
  features: VipFeatureMap;
  isVip: boolean;
}

// Complete 8 Independent VIP Stages (Per Exact Client Specification)
export const DEFAULT_VIP_LEVELS: VipConfigRecord[] = [
  {
    level: 1,
    title: 'VIP 1',
    minXp: 500,
    minRechargeUSD: 500,
    badgeColor: '#3B82F6',
    badgeTitle: 'VIP 1 Badge',
    badgeIconUrl: 'http://13.51.73.60:4000/uploads/levels/badge-vip1.png',
    frameUrl: 'http://13.51.73.60:4000/uploads/levels/level-asset-1789565660488-185009522.png',
    animatedFrameUrl: null,
    isAnimatedFrame: false,
    chatBubbleColor: '#1E293B',
    chatBubbleStyle: 'vip_blue',
    nameColor: '#60A5FA',
    entryEffectUrl: null,
    entryEffectType: 'NONE',
    lottieUrl: 'https://assets2.lottiefiles.com/packages/lf20_touohxv0.json',
    isVip: true,
    perks: [
      'Unlimited chat.',
      'Send private photos and comments without limits.',
      'View profile visitors.',
      'Lock rooms.',
      'Animated profile picture.',
      'Choose a room cover.',
      'Reject messages from strangers.',
      'Disable following.',
      'Hide your location in rooms.',
      'Special VIP gifts.',
      'Custom ID.',
      'VIP 1 badge.',
      'VIP 1 frame.',
    ],
    features: {
      unlimitedChat: true,
      unlimitedPrivateMedia: true,
      unlimitedComments: true,
      viewProfileVisitors: true,
      lockRooms: true,
      animatedAvatar: true,
      customRoomCover: true,
      rejectStrangerMessages: true,
      disableFollowing: true,
      hideLocationInRooms: true,
      specialVipGifts: true,
      customId: true,
      vipBadge: true,
      vipFrame: true,
    },
  },
  {
    level: 2,
    title: 'VIP 2',
    minXp: 1000,
    minRechargeUSD: 1000,
    badgeColor: '#06B6D4',
    badgeTitle: 'VIP 2 Badge',
    badgeIconUrl: 'http://13.51.73.60:4000/uploads/levels/badge-vip2.png',
    frameUrl: 'http://13.51.73.60:4000/uploads/levels/level-asset-1789565865199-265402577.png',
    animatedFrameUrl: null,
    isAnimatedFrame: false,
    chatBubbleColor: '#0E7490',
    chatBubbleStyle: 'vip_cyan',
    nameColor: '#22D3EE',
    entryEffectUrl: null,
    entryEffectType: 'NONE',
    lottieUrl: 'https://assets5.lottiefiles.com/packages/lf20_obhph3sh.json',
    isVip: true,
    perks: [
      'Unlimited chat.',
      'Send private photos and comments without limits.',
      'View profile visitors.',
      'Lock rooms.',
      'Animated profile picture.',
      'Choose a room cover.',
      'Reject messages from strangers.',
      'Disable following.',
      'Hide your location in rooms.',
      'Special VIP gifts.',
      'Custom ID.',
      'VIP 2 badge.',
      'VIP 2 frame.',
      'Anonymous mode during games.',
      'Custom name color.',
      'VIP chat bubble.',
    ],
    features: {
      unlimitedChat: true,
      unlimitedPrivateMedia: true,
      unlimitedComments: true,
      viewProfileVisitors: true,
      lockRooms: true,
      animatedAvatar: true,
      customRoomCover: true,
      rejectStrangerMessages: true,
      disableFollowing: true,
      hideLocationInRooms: true,
      specialVipGifts: true,
      customId: true,
      vipBadge: true,
      vipFrame: true,
      anonymousInGames: true,
      customNameColor: true,
      vipChatBubble: true,
    },
  },
  {
    level: 3,
    title: 'VIP 3',
    minXp: 2000,
    minRechargeUSD: 2000,
    badgeColor: '#10B981',
    badgeTitle: 'VIP 3 Badge',
    badgeIconUrl: 'http://13.51.73.60:4000/uploads/levels/badge-vip3.png',
    frameUrl: 'http://13.51.73.60:4000/uploads/levels/level-asset-1789565875894-321249276.png',
    animatedFrameUrl: null,
    isAnimatedFrame: false,
    chatBubbleColor: '#047857',
    chatBubbleStyle: 'vip_emerald',
    nameColor: '#34D399',
    entryEffectUrl: null,
    entryEffectType: 'NONE',
    lottieUrl: 'https://assets8.lottiefiles.com/packages/lf20_ky24iv3f.json',
    isVip: true,
    perks: [
      'Unlimited chat.',
      'Send private photos and comments without limits.',
      'View profile visitors.',
      'Lock rooms.',
      'Animated profile picture.',
      'Choose a room cover.',
      'Reject messages from strangers.',
      'Disable following.',
      'Hide your location in rooms.',
      'Special VIP gifts.',
      'Custom ID.',
      'VIP 3 badge.',
      'VIP 3 frame.',
      'Anonymous mode during games.',
      'Custom name color.',
      'VIP chat bubble.',
      'Invisible online status.',
      'Hide country.',
    ],
    features: {
      unlimitedChat: true,
      unlimitedPrivateMedia: true,
      unlimitedComments: true,
      viewProfileVisitors: true,
      lockRooms: true,
      animatedAvatar: true,
      customRoomCover: true,
      rejectStrangerMessages: true,
      disableFollowing: true,
      hideLocationInRooms: true,
      specialVipGifts: true,
      customId: true,
      vipBadge: true,
      vipFrame: true,
      anonymousInGames: true,
      customNameColor: true,
      vipChatBubble: true,
      invisibleOnlineStatus: true,
      hideCountry: true,
    },
  },
  {
    level: 4,
    title: 'VIP 4',
    minXp: 3500,
    minRechargeUSD: 3500,
    badgeColor: '#F59E0B',
    badgeTitle: 'VIP 4 Badge',
    badgeIconUrl: 'http://13.51.73.60:4000/uploads/levels/badge-vip4.png',
    frameUrl: 'http://13.51.73.60:4000/uploads/levels/level-asset-1789565884873-624191827.png',
    animatedFrameUrl: null,
    isAnimatedFrame: false,
    chatBubbleColor: '#B45309',
    chatBubbleStyle: 'vip_gold',
    nameColor: '#FBBF24',
    entryEffectUrl: 'https://assets10.lottiefiles.com/packages/lf20_l4xxtfd3.json',
    entryEffectType: 'SPECIAL',
    lottieUrl: 'https://assets10.lottiefiles.com/packages/lf20_l4xxtfd3.json',
    isVip: true,
    perks: [
      'Unlimited chat.',
      'Send private photos and comments without limits.',
      'View profile visitors.',
      'Lock rooms.',
      'Animated profile picture.',
      'Choose a room cover.',
      'Reject messages from strangers.',
      'Disable following.',
      'Hide your location in rooms.',
      'Special VIP gifts.',
      'Custom ID.',
      'VIP 4 badge.',
      'VIP 4 frame.',
      'Anonymous mode during games.',
      'Custom name color.',
      'VIP chat bubble.',
      'Invisible online status.',
      'Hide country.',
      'Mystery mode.',
      'Hide from profile visitors.',
      'Special entry effect.',
    ],
    features: {
      unlimitedChat: true,
      unlimitedPrivateMedia: true,
      unlimitedComments: true,
      viewProfileVisitors: true,
      lockRooms: true,
      animatedAvatar: true,
      customRoomCover: true,
      rejectStrangerMessages: true,
      disableFollowing: true,
      hideLocationInRooms: true,
      specialVipGifts: true,
      customId: true,
      vipBadge: true,
      vipFrame: true,
      anonymousInGames: true,
      customNameColor: true,
      vipChatBubble: true,
      invisibleOnlineStatus: true,
      hideCountry: true,
      mysteryMode: true,
      hideFromVisitors: true,
      specialEntryEffect: true,
    },
  },
  {
    level: 5,
    title: 'VIP 5',
    minXp: 5000,
    minRechargeUSD: 5000,
    badgeColor: '#EF4444',
    badgeTitle: 'VIP 5 Badge',
    badgeIconUrl: 'http://13.51.73.60:4000/uploads/levels/badge-vip5.png',
    frameUrl: 'http://13.51.73.60:4000/uploads/levels/level-asset-1789565894305-711738286.png',
    animatedFrameUrl: 'http://13.51.73.60:4000/uploads/levels/level-asset-1789565894305-711738286.png',
    isAnimatedFrame: true,
    chatBubbleColor: '#B91C1C',
    chatBubbleStyle: 'vip_ruby',
    nameColor: '#F87171',
    entryEffectUrl: 'https://assets3.lottiefiles.com/packages/lf20_wd1udlcz.json',
    entryEffectType: 'SPECIAL',
    lottieUrl: 'https://assets3.lottiefiles.com/packages/lf20_wd1udlcz.json',
    isVip: true,
    perks: [
      'Unlimited chat.',
      'Send private photos and comments without limits.',
      'View profile visitors.',
      'Lock room.',
      'Animated profile picture.',
      'Choose room cover.',
      'Reject messages from strangers.',
      'Disable following.',
      'Hide location within rooms.',
      'Special VIP gifts.',
      'Custom ID.',
      'VIP 5 badge.',
      'VIP 5 frame.',
      'Anonymous mode during games.',
      'Custom name color.',
      'VIP chat bubble.',
      'Invisible online status.',
      'Hide country.',
      'Mystery mode.',
      'Hide from profile visitors.',
      'Special entry effect.',
      'Hide room from trending topics.',
      'Kick Protection.',
      'Ban Protection (Cannot be banned from comments or rooms).',
      'Animated VIP frame.',
    ],
    features: {
      unlimitedChat: true,
      unlimitedPrivateMedia: true,
      unlimitedComments: true,
      viewProfileVisitors: true,
      lockRooms: true,
      animatedAvatar: true,
      customRoomCover: true,
      rejectStrangerMessages: true,
      disableFollowing: true,
      hideLocationInRooms: true,
      specialVipGifts: true,
      customId: true,
      vipBadge: true,
      vipFrame: true,
      anonymousInGames: true,
      customNameColor: true,
      vipChatBubble: true,
      invisibleOnlineStatus: true,
      hideCountry: true,
      mysteryMode: true,
      hideFromVisitors: true,
      specialEntryEffect: true,
      hideRoomFromTrending: true,
      kickProtection: true,
      banProtection: true,
      animatedFrame: true,
    },
  },
  {
    level: 6,
    title: 'VIP 6',
    minXp: 7500,
    minRechargeUSD: 7500,
    badgeColor: '#8B5CF6',
    badgeTitle: 'VIP 6 Badge',
    badgeIconUrl: 'http://13.51.73.60:4000/uploads/levels/badge-vip6.png',
    frameUrl: 'http://13.51.73.60:4000/uploads/levels/level-asset-1789565903067-430349264.png',
    animatedFrameUrl: 'http://13.51.73.60:4000/uploads/levels/level-asset-1789565903067-430349264.png',
    isAnimatedFrame: true,
    chatBubbleColor: '#6D28D9',
    chatBubbleStyle: 'vip_amethyst',
    nameColor: '#A78BFA',
    entryEffectUrl: 'https://assets9.lottiefiles.com/packages/lf20_puciaact.json',
    entryEffectType: 'SPECIAL',
    lottieUrl: 'https://assets9.lottiefiles.com/packages/lf20_puciaact.json',
    isVip: true,
    perks: [
      'Unlimited chat.',
      'Send private photos and comments without limits.',
      'View profile visitors.',
      'Lock room.',
      'Animated profile picture.',
      'Choose room cover.',
      'Reject messages from strangers.',
      'Disable following.',
      'Hide location within rooms.',
      'Special VIP gifts.',
      'Custom ID.',
      'VIP 6 badge.',
      'VIP 6 frame.',
      'Anonymous mode during games.',
      'Custom name color.',
      'VIP chat bubble.',
      'Invisible online status.',
      'Hide country.',
      'Mystery mode.',
      'Hide from profile visitors.',
      'Special entry effect.',
      'Hide room from trending topics.',
      'Kick Protection.',
      'Ban Protection (Cannot be banned from comments or rooms).',
      'Animated VIP frame.',
      'VIP announcement in all rooms (limited daily).',
      'Additional gift set.',
      'Higher priority in lists.',
    ],
    features: {
      unlimitedChat: true,
      unlimitedPrivateMedia: true,
      unlimitedComments: true,
      viewProfileVisitors: true,
      lockRooms: true,
      animatedAvatar: true,
      customRoomCover: true,
      rejectStrangerMessages: true,
      disableFollowing: true,
      hideLocationInRooms: true,
      specialVipGifts: true,
      customId: true,
      vipBadge: true,
      vipFrame: true,
      anonymousInGames: true,
      customNameColor: true,
      vipChatBubble: true,
      invisibleOnlineStatus: true,
      hideCountry: true,
      mysteryMode: true,
      hideFromVisitors: true,
      specialEntryEffect: true,
      hideRoomFromTrending: true,
      kickProtection: true,
      banProtection: true,
      animatedFrame: true,
      dailyGlobalRoomAnnouncement: true,
      additionalGiftSet: true,
      higherPriorityInLists: true,
    },
  },
  {
    level: 7,
    title: 'VIP 7',
    minXp: 10000,
    minRechargeUSD: 10000,
    badgeColor: '#EC4899',
    badgeTitle: 'VIP 7 Badge',
    badgeIconUrl: 'http://13.51.73.60:4000/uploads/levels/badge-vip7.png',
    frameUrl: 'http://13.51.73.60:4000/uploads/levels/level-asset-1789565915580-970870033.png',
    animatedFrameUrl: 'http://13.51.73.60:4000/uploads/levels/level-asset-1789565915580-970870033.png',
    isAnimatedFrame: true,
    chatBubbleColor: '#BE185D',
    chatBubbleStyle: 'vip_legendary',
    nameColor: '#F472B6',
    entryEffectUrl: 'https://assets4.lottiefiles.com/packages/lf20_tijmpky4.json',
    entryEffectType: 'LEGENDARY',
    lottieUrl: 'https://assets4.lottiefiles.com/packages/lf20_tijmpky4.json',
    isVip: true,
    perks: [
      'Unlimited chat.',
      'Send private photos and comments without limits.',
      'View profile visitors.',
      'Lock room.',
      'Animated profile picture.',
      'Choose room cover.',
      'Reject messages from strangers.',
      'Disable following.',
      'Hide location within rooms.',
      'Special VIP gifts.',
      'Custom ID.',
      'VIP 7 badge.',
      'VIP 7 frame.',
      'Anonymous mode during games.',
      'Custom name color.',
      'VIP chat bubble.',
      'Invisible online status.',
      'Hide country.',
      'Mystery mode.',
      'Hide from profile visitors.',
      'Special entry effect.',
      'Hide room from trending topics.',
      'Immunity from being kicked.',
      'Ban Protection (Cannot be banned from comments or rooms).',
      'Animated VIP frame.',
      'VIP announcement in all rooms.',
      'Higher priority in lists.',
      'App login notification.',
      'Legendary login effect.',
      'Special unique name.',
    ],
    features: {
      unlimitedChat: true,
      unlimitedPrivateMedia: true,
      unlimitedComments: true,
      viewProfileVisitors: true,
      lockRooms: true,
      animatedAvatar: true,
      customRoomCover: true,
      rejectStrangerMessages: true,
      disableFollowing: true,
      hideLocationInRooms: true,
      specialVipGifts: true,
      customId: true,
      vipBadge: true,
      vipFrame: true,
      anonymousInGames: true,
      customNameColor: true,
      vipChatBubble: true,
      invisibleOnlineStatus: true,
      hideCountry: true,
      mysteryMode: true,
      hideFromVisitors: true,
      specialEntryEffect: true,
      hideRoomFromTrending: true,
      kickProtection: true,
      banProtection: true,
      animatedFrame: true,
      dailyGlobalRoomAnnouncement: true,
      additionalGiftSet: true,
      higherPriorityInLists: true,
      kickImmunity: true,
      appLoginNotification: true,
      legendaryLoginEffect: true,
      specialUniqueName: true,
    },
  },
  {
    level: 8,
    title: 'VIP 8',
    minXp: 15000,
    minRechargeUSD: 15000,
    badgeColor: '#F59E0B',
    badgeTitle: 'Top VIP Badge',
    badgeIconUrl: 'http://13.51.73.60:4000/uploads/levels/badge-vip8.png',
    frameUrl: 'http://13.51.73.60:4000/uploads/levels/level-asset-1789565923165-521203170.png',
    animatedFrameUrl: 'http://13.51.73.60:4000/uploads/levels/level-asset-1789565923165-521203170.png',
    isAnimatedFrame: true,
    chatBubbleColor: '#78350F',
    chatBubbleStyle: 'vip_supreme',
    nameColor: '#FCD34D',
    entryEffectUrl: 'https://assets2.lottiefiles.com/packages/lf20_x62chJ.json',
    entryEffectType: 'HIGHEST',
    lottieUrl: 'https://assets2.lottiefiles.com/packages/lf20_x62chJ.json',
    isVip: true,
    perks: [
      'Unlimited chat.',
      'Send private photos and comments without limits.',
      'View profile visitors.',
      'Lock room.',
      'Animated profile picture.',
      'Choose room cover.',
      'Reject messages from strangers.',
      'Disable following.',
      'Hide location within rooms.',
      'Special VIP gifts.',
      'Custom ID.',
      'VIP 8 badge.',
      'VIP 8 frame.',
      'Anonymous mode during games.',
      'Custom name color.',
      'VIP chat bubble.',
      'Invisible online status.',
      'Hide country.',
      'Mystery mode.',
      'Hide from profile visitors.',
      'Special login effect.',
      'Hide room from trending topics.',
      'Immunity from being kicked.',
      'Ban Protection (Cannot be banned from comments or rooms).',
      'Animated VIP frame.',
      'VIP announcement in all rooms.',
      'Higher priority in menus.',
      'App login notification.',
      'Legendary login effect.',
      'Unique and exclusive name.',
      'Stealthy room access without notification.',
      'Top VIP frame.',
      'Highest login effect.',
      'Top VIP badge.',
      'Exclusive VIP identity.',
      'Maximum system priority.',
    ],
    features: {
      unlimitedChat: true,
      unlimitedPrivateMedia: true,
      unlimitedComments: true,
      viewProfileVisitors: true,
      lockRooms: true,
      animatedAvatar: true,
      customRoomCover: true,
      rejectStrangerMessages: true,
      disableFollowing: true,
      hideLocationInRooms: true,
      specialVipGifts: true,
      customId: true,
      vipBadge: true,
      vipFrame: true,
      anonymousInGames: true,
      customNameColor: true,
      vipChatBubble: true,
      invisibleOnlineStatus: true,
      hideCountry: true,
      mysteryMode: true,
      hideFromVisitors: true,
      specialEntryEffect: true,
      hideRoomFromTrending: true,
      kickProtection: true,
      banProtection: true,
      animatedFrame: true,
      dailyGlobalRoomAnnouncement: true,
      additionalGiftSet: true,
      higherPriorityInLists: true,
      kickImmunity: true,
      appLoginNotification: true,
      legendaryLoginEffect: true,
      specialUniqueName: true,
      higherPriorityInMenus: true,
      exclusiveNameStyle: true,
      stealthRoomAccess: true,
      topVipFrame: true,
      highestLoginEffect: true,
      topVipBadge: true,
      exclusiveVipIdentity: true,
      maxSystemPriority: true,
    },
  },
];

@Injectable()
export class LevelsService implements OnModuleInit {
  private readonly logger = new Logger(LevelsService.name);

  // In-memory runtime cache for lightning performance
  private static vipConfigsMap = new Map<number, VipConfigRecord>();
  private static userVipOverrides = new Map<string, number>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly signalingGateway: SignalingGateway,
  ) {}

  async onModuleInit() {
    await this.seedDefaultLevels();
    this.startVipScheduler();
  }

  private vipScheduler?: NodeJS.Timeout;

  /**
   * Automated monthly VIP evaluation. Runs a daily check; when the billing
   * month rolls over it applies the monthly reset/downgrade rules exactly once.
   * The very first run (no stored marker) only records the current month so an
   * existing month's recharge total is never wiped on first boot.
   */
  private startVipScheduler() {
    const run = async () => {
      try {
        const key = 'vip_last_eval_month';
        const current = this.getCurrentBillingMonth();
        const setting = await this.prisma.systemSetting.findUnique({ where: { key } });
        if (!setting) {
          await this.prisma.systemSetting
            .create({ data: { key, value: current } })
            .catch(() => null);
          return;
        }
        if (setting.value !== current) {
          this.logger.log(`⏳ Billing month rolled over (${setting.value} → ${current}). Running VIP evaluation.`);
          await this.runMonthlyVipEvaluation(current);
          await this.prisma.systemSetting.update({ where: { key }, data: { value: current } });
        }
      } catch (e: any) {
        this.logger.warn(`VIP scheduler error: ${e?.message}`);
      }
    };

    setTimeout(run, 10_000);
    this.vipScheduler = setInterval(run, 24 * 60 * 60 * 1000);
    if (this.vipScheduler.unref) this.vipScheduler.unref();
  }

  /**
   * Seeds default VIP 1 to 8 configurations if missing or updates them
   */
  async seedDefaultLevels() {
    try {
      // 1. Populate in-memory map first
      for (const lvl of DEFAULT_VIP_LEVELS) {
        LevelsService.vipConfigsMap.set(lvl.level, { ...lvl });
      }

      // 2. Create LevelConfig rows only when missing so admin edits persist across restarts
      for (const lvl of DEFAULT_VIP_LEVELS) {
        try {
          const existing = await (this.prisma as any).levelConfig.findUnique({ where: { level: lvl.level } });
          if (!existing) {
            await (this.prisma as any).levelConfig.create({
              data: {
                level: lvl.level,
                title: lvl.title,
                minXp: lvl.minXp,
                minRechargeUSD: lvl.minRechargeUSD,
                badgeColor: lvl.badgeColor,
                badgeTitle: lvl.badgeTitle,
                badgeIconUrl: lvl.badgeIconUrl,
                frameUrl: lvl.frameUrl,
                animatedFrameUrl: lvl.animatedFrameUrl,
                isAnimatedFrame: lvl.isAnimatedFrame,
                chatBubbleColor: lvl.chatBubbleColor,
                chatBubbleStyle: lvl.chatBubbleStyle,
                nameColor: lvl.nameColor,
                entryEffectUrl: lvl.entryEffectUrl,
                entryEffectType: lvl.entryEffectType,
                lottieUrl: lvl.lottieUrl,
                perks: lvl.perks,
                features: lvl.features as any,
                isVip: true,
              },
            });
          }
        } catch {
          // ignore column mismatch if migrating
        }

        // 3. Create VipConfig rows only when missing (legacy table)
        try {
          if ((this.prisma as any).vipConfig) {
            const existingVip = await (this.prisma as any).vipConfig.findUnique({ where: { level: lvl.level } });
            if (!existingVip) {
              await (this.prisma as any).vipConfig.create({
                data: {
                  level: lvl.level,
                  title: lvl.title,
                  minRechargeUSD: lvl.minRechargeUSD,
                  badgeColor: lvl.badgeColor,
                  badgeTitle: lvl.badgeTitle,
                  badgeIconUrl: lvl.badgeIconUrl,
                  frameUrl: lvl.frameUrl,
                  animatedFrameUrl: lvl.animatedFrameUrl,
                  isAnimatedFrame: lvl.isAnimatedFrame,
                  chatBubbleColor: lvl.chatBubbleColor,
                  chatBubbleStyle: lvl.chatBubbleStyle,
                  nameColor: lvl.nameColor,
                  entryEffectUrl: lvl.entryEffectUrl,
                  entryEffectType: lvl.entryEffectType,
                  lottieUrl: lvl.lottieUrl,
                  perks: lvl.perks,
                  features: lvl.features as any,
                },
              });
            }
          }
        } catch {
          // fallback
        }
      }

      // 4. Overlay persisted DB configs onto the in-memory map so admin edits
      // (thresholds, assets, perks, feature toggles) survive server restarts.
      try {
        const dbConfigs = await (this.prisma as any).levelConfig.findMany({ orderBy: { level: 'asc' } });
        for (const c of dbConfigs) {
          const base = LevelsService.vipConfigsMap.get(c.level) || DEFAULT_VIP_LEVELS[c.level - 1];
          LevelsService.vipConfigsMap.set(c.level, {
            ...(base || {}),
            ...c,
            features: { ...((base && base.features) || {}), ...((c.features as any) || {}) },
            perks: Array.isArray(c.perks) && c.perks.length > 0 ? c.perks : (base && base.perks) || [],
          } as VipConfigRecord);
        }
      } catch {
        // DB offline — keep DEFAULT in-memory configs
      }

      this.logger.log('👑 [VIP System] All 8 Independent VIP Stages initialized successfully ($500 -> $15,000)!');
    } catch (e) {
      this.logger.warn(`Failed seeding VIP levels: ${e.message}`);
    }
  }

  /**
   * Get all 8 VIP level configs (sorted 1 to 8)
   */
  async getLevels() {
    try {
      const configs = await (this.prisma as any).levelConfig.findMany({
        orderBy: { level: 'asc' },
      });
      if (configs.length >= 8) {
        return configs;
      }
    } catch (e) {
      this.logger.warn(`Error fetching LevelConfigs: ${e.message}`);
    }
    return Array.from(LevelsService.vipConfigsMap.values());
  }

  /**
   * Canonical list of every toggleable VIP benefit for the Admin Dashboard.
   */
  getFeatureCatalog() {
    return {
      categories: VIP_FEATURE_CATEGORIES,
      features: VIP_FEATURE_CATALOG,
    };
  }

  /**
   * Resolve whether a user currently has a specific VIP benefit active,
   * honouring both their tier and the admin's per-benefit toggles.
   */
  async userHasFeature(userId: string, featureKey: string): Promise<boolean> {
    if (!userId || !featureKey) return false;
    try {
      const status = await this.getUserVipStatus(userId);
      if (!status.isVip) return false;
      return status.activeFeatures?.[featureKey] !== false;
    } catch {
      return false;
    }
  }

  /**
   * Get single level config
   */
  async getLevel(level: number) {
    const targetLevel = Number(level);
    try {
      const config = await (this.prisma as any).levelConfig.findUnique({
        where: { level: targetLevel },
      });
      if (config) return config;
    } catch {}

    const cached = LevelsService.vipConfigsMap.get(targetLevel);
    if (!cached) {
      throw new NotFoundException(`VIP Level ${targetLevel} not found`);
    }
    return cached;
  }

  /**
   * Update level config from Admin Dashboard
   * Emits real-time Socket.io event: `level_config_updated` & `vip_config_updated`
   */
  async updateLevel(level: number, dto: UpdateLevelConfigDto) {
    const targetLevel = Number(level);
    if (targetLevel < 1 || targetLevel > 8) {
      throw new BadRequestException('VIP Level must be between 1 and 8');
    }

    let existing = LevelsService.vipConfigsMap.get(targetLevel) || DEFAULT_VIP_LEVELS[targetLevel - 1];

    const updatedData: VipConfigRecord = {
      ...existing,
      ...(dto.title !== undefined && { title: dto.title }),
      ...(dto.minXp !== undefined && { minXp: Number(dto.minXp) }),
      ...(dto.minRechargeUSD !== undefined && { minRechargeUSD: Number(dto.minRechargeUSD) }),
      ...(dto.badgeColor !== undefined && { badgeColor: dto.badgeColor }),
      ...(dto.badgeTitle !== undefined && { badgeTitle: dto.badgeTitle }),
      ...(dto.badgeIconUrl !== undefined && { badgeIconUrl: dto.badgeIconUrl }),
      ...(dto.frameUrl !== undefined && { frameUrl: dto.frameUrl }),
      ...(dto.animatedFrameUrl !== undefined && { animatedFrameUrl: dto.animatedFrameUrl }),
      ...(dto.isAnimatedFrame !== undefined && { isAnimatedFrame: Boolean(dto.isAnimatedFrame) }),
      ...(dto.chatBubbleColor !== undefined && { chatBubbleColor: dto.chatBubbleColor }),
      ...(dto.chatBubbleStyle !== undefined && { chatBubbleStyle: dto.chatBubbleStyle }),
      ...(dto.nameColor !== undefined && { nameColor: dto.nameColor }),
      ...(dto.entryEffectUrl !== undefined && { entryEffectUrl: dto.entryEffectUrl }),
      ...(dto.entryEffectType !== undefined && { entryEffectType: dto.entryEffectType as any }),
      ...(dto.lottieUrl !== undefined && { lottieUrl: dto.lottieUrl }),
      ...(dto.perks !== undefined && { perks: dto.perks }),
      ...(dto.features !== undefined && { features: { ...existing.features, ...dto.features } }),
      ...(dto.isVip !== undefined && { isVip: Boolean(dto.isVip) }),
    };

    LevelsService.vipConfigsMap.set(targetLevel, updatedData);

    // Persist to DB LevelConfig
    try {
      await (this.prisma as any).levelConfig.upsert({
        where: { level: targetLevel },
        update: {
          title: updatedData.title,
          minXp: updatedData.minXp,
          minRechargeUSD: updatedData.minRechargeUSD,
          badgeColor: updatedData.badgeColor,
          badgeTitle: updatedData.badgeTitle,
          badgeIconUrl: updatedData.badgeIconUrl,
          frameUrl: updatedData.frameUrl,
          animatedFrameUrl: updatedData.animatedFrameUrl,
          isAnimatedFrame: updatedData.isAnimatedFrame,
          chatBubbleColor: updatedData.chatBubbleColor,
          chatBubbleStyle: updatedData.chatBubbleStyle,
          nameColor: updatedData.nameColor,
          entryEffectUrl: updatedData.entryEffectUrl,
          entryEffectType: updatedData.entryEffectType,
          lottieUrl: updatedData.lottieUrl,
          perks: updatedData.perks,
          features: updatedData.features as any,
          isVip: updatedData.isVip,
        },
        create: {
          level: targetLevel,
          title: updatedData.title,
          minXp: updatedData.minXp,
          minRechargeUSD: updatedData.minRechargeUSD,
          badgeColor: updatedData.badgeColor,
          badgeTitle: updatedData.badgeTitle,
          badgeIconUrl: updatedData.badgeIconUrl,
          frameUrl: updatedData.frameUrl,
          animatedFrameUrl: updatedData.animatedFrameUrl,
          isAnimatedFrame: updatedData.isAnimatedFrame,
          chatBubbleColor: updatedData.chatBubbleColor,
          chatBubbleStyle: updatedData.chatBubbleStyle,
          nameColor: updatedData.nameColor,
          entryEffectUrl: updatedData.entryEffectUrl,
          entryEffectType: updatedData.entryEffectType,
          lottieUrl: updatedData.lottieUrl,
          perks: updatedData.perks,
          features: updatedData.features as any,
          isVip: updatedData.isVip,
        },
      });
    } catch (e) {
      this.logger.warn(`Could not update LevelConfig in DB: ${e.message}`);
    }

    // Broadcast real-time update to all connected apps & admin dashboards
    try {
      const payload = {
        level: updatedData.level,
        config: updatedData,
        timestamp: new Date().toISOString(),
      };
      this.signalingGateway.server?.emit('vip_config_updated', payload);
      this.signalingGateway.server?.emit('level_config_updated', payload);
    } catch (e) {
      this.logger.warn(`Failed emitting vip_config_updated: ${e.message}`);
    }

    return {
      success: true,
      message: `VIP Stage ${targetLevel} configuration updated successfully!`,
      level: updatedData,
    };
  }

  /**
   * Calculate User VIP Level based on total recharge amount in USD
   * Rule:
   * Level opening only when user recharge amount is equivalent to that amount in $!
   * VIP 1: $500
   * VIP 2: $1,000
   * VIP 3: $2,000
   * VIP 4: $3,500
   * VIP 5: $5,000
   * VIP 6: $7,500
   * VIP 7: $10,000
   * VIP 8: $15,000
   * If < $500 -> 0 (Normal User, Not VIP Member)
   */
  getCurrentBillingMonth(): string {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  calculateVipLevelFromRecharge(totalRechargedUSD: number): number {
    const usd = Number(totalRechargedUSD) || 0;
    const configs = Array.from(LevelsService.vipConfigsMap.values()).sort((a, b) => b.level - a.level);

    for (const cfg of configs) {
      if (usd >= (cfg.minRechargeUSD || 0)) {
        return cfg.level;
      }
    }
    return 0; // Normal User
  }

  /**
   * Get single user's comprehensive VIP status, monthly progression, unlocked perks, and privacy toggles
   */
  async getUserVipStatus(userId: string) {
    if (!userId) {
      throw new BadRequestException('userId is required');
    }

    let user: any = null;
    try {
      user = await (this.prisma as any).user.findUnique({
        where: { id: userId },
        include: { wallet: true },
      });
    } catch {}

    const memUser = UsersService.usersMap.get(userId);
    if (!user) {
      if (memUser) {
        user = { ...memUser };
      } else {
        user = {
          id: userId,
          displayName: 'Guest User',
          username: `user_${userId.slice(0, 6)}`,
          avatarUrl: null,
          totalRechargedUSD: 0.0,
          monthlyRechargedUSD: 0.0,
          vipBillingMonth: this.getCurrentBillingMonth(),
          vipLevel: 0,
          vipSettings: {},
        };
      }
    } else if (memUser) {
      user.vipSettings = memUser.vipSettings || user.vipSettings;
      user.customId = memUser.customId || user.customId;
      user.totalRechargedUSD = Math.max(Number(user.totalRechargedUSD) || 0, Number(memUser.totalRechargedUSD) || 0);
      user.monthlyRechargedUSD = Math.max(Number(user.monthlyRechargedUSD) || 0, Number(memUser.monthlyRechargedUSD) || 0);
      user.vipLevel = Math.max(Number(user.vipLevel) || 0, Number(memUser.vipLevel) || 0);
    }

    const currentBillingMonth = this.getCurrentBillingMonth();

    // Check if billing month rolled over -> Single-step downgrade logic
    if (user.vipBillingMonth && user.vipBillingMonth !== currentBillingMonth) {
      const currentLevel = user.vipLevel || 0;
      if (currentLevel > 0) {
        const reqConfig = LevelsService.vipConfigsMap.get(currentLevel) || DEFAULT_VIP_LEVELS[currentLevel - 1];
        const monthlySpend = Number(user.monthlyRechargedUSD) || 0;
        if (monthlySpend < (reqConfig?.minRechargeUSD || 500)) {
          // Professional single-step downgrade rule: Drop down by at most ONE level (e.g. VIP 4 -> VIP 3, VIP 1 -> 0)
          const downgradedLevel = Math.max(0, currentLevel - 1);
          user.vipLevel = downgradedLevel;
          this.logger.log(`📉 [VIP Monthly Downgrade] User ${user.displayName || user.username} dropped 1 step from VIP ${currentLevel} to VIP ${downgradedLevel} due to monthly spend ($${monthlySpend}/$${reqConfig?.minRechargeUSD}).`);
          try {
            await (this.prisma as any).user.update({
              where: { id: user.id },
              data: {
                vipLevel: downgradedLevel,
                monthlyRechargedUSD: 0,
                vipBillingMonth: currentBillingMonth,
              },
            });
          } catch {}
          user.monthlyRechargedUSD = 0;
          user.vipBillingMonth = currentBillingMonth;
        } else {
          // Maintained tier, reset monthly spend counter for the new month
          try {
            await (this.prisma as any).user.update({
              where: { id: user.id },
              data: {
                monthlyRechargedUSD: 0,
                vipBillingMonth: currentBillingMonth,
              },
            });
          } catch {}
          user.monthlyRechargedUSD = 0;
          user.vipBillingMonth = currentBillingMonth;
        }
      } else {
        user.monthlyRechargedUSD = 0;
        user.vipBillingMonth = currentBillingMonth;
      }
    }

    const totalRechargedUSD = Number(user.totalRechargedUSD) || 0.0;
    const monthlyRechargedUSD = Number(user.monthlyRechargedUSD) || 0.0;
    const adminOverride = LevelsService.userVipOverrides.get(userId);
    const calculatedLevel = adminOverride !== undefined
      ? adminOverride
      : (user.vipLevel !== undefined && user.vipLevel !== null && user.vipLevel > 0
          ? Math.max(user.vipLevel, this.calculateVipLevelFromRecharge(monthlyRechargedUSD))
          : this.calculateVipLevelFromRecharge(monthlyRechargedUSD));

    const isVip = calculatedLevel >= 1;
    const currentConfig = isVip
      ? (LevelsService.vipConfigsMap.get(calculatedLevel) || DEFAULT_VIP_LEVELS[calculatedLevel - 1])
      : null;

    const nextLevel = calculatedLevel < 8 ? calculatedLevel + 1 : 8;
    const nextConfig = LevelsService.vipConfigsMap.get(nextLevel) || DEFAULT_VIP_LEVELS[nextLevel - 1];

    const nextThresholdUSD = nextConfig?.minRechargeUSD || 500;
    const monthlyNeededUSD = Math.max(0, parseFloat((nextThresholdUSD - monthlyRechargedUSD).toFixed(2)));

    // Calculate progression percentage to next VIP level based on monthly spend
    let progressPercent = 100;
    if (calculatedLevel === 0) {
      progressPercent = Math.min(100, Math.round((monthlyRechargedUSD / 500) * 100));
    } else if (calculatedLevel < 8) {
      const prevThreshold = currentConfig?.minRechargeUSD || 0;
      const span = nextThresholdUSD - prevThreshold;
      if (span > 0) {
        progressPercent = Math.min(100, Math.round(((monthlyRechargedUSD - prevThreshold) / span) * 100));
      }
    }

    return {
      userId: user.id,
      displayName: user.displayName || user.username,
      username: user.username,
      avatarUrl: user.avatarUrl,
      vipLevel: calculatedLevel,
      isVip,
      vipStatusLabel: isVip ? `VIP ${calculatedLevel} Member 👑` : 'Normal User (Not VIP Member) 🛡️',
      totalRechargedUSD,
      monthlyRechargedUSD,
      vipBillingMonth: user.vipBillingMonth || currentBillingMonth,
      currentThresholdUSD: currentConfig?.minRechargeUSD || 0,
      nextThresholdUSD,
      rechargeNeededUSD: monthlyNeededUSD,
      monthlyNeededUSD,
      progressPercent,
      currentConfig,
      nextConfig,
      activeFeatures: (currentConfig?.features || {}) as VipFeatureMap,
      vipSettings: user.vipSettings || {},
      customId: user.customId || null,
      customNameColor: user.customNameColor || currentConfig?.nameColor || '#FFFFFF',
    };
  }

  /**
   * Update User VIP Privacy Toggles
   */
  async updateVipSettings(userId: string, dto: UpdateVipSettingsDto) {
    const status = await this.getUserVipStatus(userId);
    if (!status.isVip) {
      throw new ForbiddenException('VIP Member status required to configure VIP privacy settings.');
    }

    const currentSettings = status.vipSettings || {};
    const updatedSettings = {
      ...currentSettings,
      ...(dto.rejectStrangerMessages !== undefined && { rejectStrangerMessages: dto.rejectStrangerMessages }),
      ...(dto.disableFollowing !== undefined && { disableFollowing: dto.disableFollowing }),
      ...(dto.hideLocationInRooms !== undefined && { hideLocationInRooms: dto.hideLocationInRooms }),
      ...(dto.anonymousInGames !== undefined && { anonymousInGames: dto.anonymousInGames }),
      ...(dto.invisibleOnlineStatus !== undefined && { invisibleOnlineStatus: dto.invisibleOnlineStatus }),
      ...(dto.hideCountry !== undefined && { hideCountry: dto.hideCountry }),
      ...(dto.mysteryMode !== undefined && { mysteryMode: dto.mysteryMode }),
      ...(dto.hideFromVisitors !== undefined && { hideFromVisitors: dto.hideFromVisitors }),
      ...(dto.hideRoomFromTrending !== undefined && { hideRoomFromTrending: dto.hideRoomFromTrending }),
      ...(dto.stealthRoomAccess !== undefined && { stealthRoomAccess: dto.stealthRoomAccess }),
    };

    try {
      await (this.prisma as any).user.update({
        where: { id: userId },
        data: {
          vipSettings: updatedSettings,
          ...(dto.customNameColor && { customNameColor: dto.customNameColor }),
        },
      });
    } catch {}

    const memUser = UsersService.usersMap.get(userId);
    if (memUser) {
      memUser.vipSettings = updatedSettings;
      if (dto.customNameColor) memUser.customNameColor = dto.customNameColor;
    }

    return {
      success: true,
      message: 'VIP preferences updated successfully!',
      vipSettings: updatedSettings,
      customNameColor: dto.customNameColor || status.customNameColor,
    };
  }

  /**
   * Super Admin sets user VIP level directly or credits recharge USD
   */
  async setUserVip(dto: SetUserVipDto) {
    const { userId, vipLevel, rechargeUSD, reason } = dto;
    if (!userId) {
      throw new BadRequestException('userId is required');
    }

    let targetVipLevel = vipLevel !== undefined ? Number(vipLevel) : undefined;
    let addedUSD = Number(rechargeUSD) || 0;

    let user = await (this.prisma as any).user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    const currentRecharged = Number(user.totalRechargedUSD) || 0;
    const newRechargedUSD = currentRecharged + addedUSD;

    if (targetVipLevel === undefined && addedUSD > 0) {
      targetVipLevel = this.calculateVipLevelFromRecharge(newRechargedUSD);
    } else if (targetVipLevel !== undefined) {
      LevelsService.userVipOverrides.set(userId, targetVipLevel);
    }

    const finalLevel = targetVipLevel !== undefined ? targetVipLevel : (user.vipLevel || 0);

    try {
      await (this.prisma as any).user.update({
        where: { id: userId },
        data: {
          vipLevel: finalLevel,
          totalRechargedUSD: newRechargedUSD,
          ...(dto.customId !== undefined && { customId: dto.customId.trim().length > 0 ? dto.customId.trim() : null }),
        },
      });
    } catch {}

    // Emit real-time celebration if upgraded to VIP
    if (finalLevel >= 1) {
      const config = LevelsService.vipConfigsMap.get(finalLevel) || DEFAULT_VIP_LEVELS[finalLevel - 1];
      const payload = {
        userId: user.id,
        displayName: user.displayName || user.username,
        avatarUrl: user.avatarUrl,
        oldLevel: user.vipLevel || 0,
        newLevel: finalLevel,
        vipLevel: finalLevel,
        title: config.title,
        badgeColor: config.badgeColor,
        frameUrl: config.frameUrl,
        animatedFrameUrl: config.animatedFrameUrl,
        lottieUrl: config.lottieUrl,
        perks: config.perks,
        totalRechargedUSD: newRechargedUSD,
        reason: reason || 'ADMIN_VIP_UPGRADE',
        timestamp: new Date().toISOString(),
      };

      this.signalingGateway.server?.emit('user_vip_unlocked', payload);
      this.signalingGateway.server?.emit('user_level_up', payload);
      this.logger.log(`👑 VIP UPGRADE: ${user.displayName} is now ${config.title}!`);
    }

    return {
      success: true,
      message: `User ${user.displayName} updated: VIP Level ${finalLevel}, Total Recharge $${newRechargedUSD.toLocaleString()} USD`,
      vipLevel: finalLevel,
      totalRechargedUSD: newRechargedUSD,
    };
  }

  /**
   * Award XP to user, check thresholds, and emit real-time level up
   */
  async awardXp(userId: string, xpAmount: number, reason: string = 'PLATFORM_ACTIVITY') {
    if (!userId || xpAmount <= 0) return null;

    try {
      const user = await (this.prisma as any).user.findUnique({
        where: { id: userId },
        select: { id: true, displayName: true, avatarUrl: true, level: true, xp: true, vipLevel: true },
      });

      if (!user) return null;

      const currentXp = user.xp || 0;
      const currentLevel = user.level || 1;
      const newXp = currentXp + xpAmount;

      // XP -> level progression curve. XP needed to reach level L is
      // 50 * (L-1) * L (e.g. L2=100, L3=300, L10=4500, L25=30000).
      const MAX_LEVEL = 100;
      let newLevel = currentLevel;
      while (newLevel < MAX_LEVEL && newXp >= 50 * newLevel * (newLevel + 1)) {
        newLevel++;
      }

      const updatedUser = await (this.prisma as any).user.update({
        where: { id: userId },
        data: { xp: newXp, level: newLevel },
        select: { id: true, displayName: true, avatarUrl: true, level: true, xp: true, vipLevel: true },
      });

      // Emit a real-time level-up event when the user crosses a threshold.
      if (newLevel > currentLevel) {
        try {
          this.signalingGateway?.server?.emit('user:level_up', {
            userId: updatedUser.id,
            displayName: updatedUser.displayName,
            avatarUrl: updatedUser.avatarUrl,
            previousLevel: currentLevel,
            level: newLevel,
            xp: newXp,
            reason,
            timestamp: Date.now(),
          });
        } catch {}
      }

      return {
        userId: updatedUser.id,
        level: updatedUser.level,
        xp: updatedUser.xp,
        vipLevel: updatedUser.vipLevel,
        leveledUp: newLevel > currentLevel,
      };
    } catch (e) {
      this.logger.error(`Error in awardXp: ${e.message}`);
      return null;
    }
  }

  /**
   * Credit recharge amount in USD and automatically elevate VIP stage
   */
  async awardRechargeUSD(userId: string, amountUSD: number, reason: string = 'COIN_RECHARGE') {
    if (!userId || amountUSD <= 0) return null;

    try {
      let user = null;
      try {
        user = await (this.prisma as any).user.findUnique({
          where: { id: userId },
        });
      } catch {}

      const memUser = UsersService.usersMap.get(userId);
      if (!user && !memUser) return null;

      const currentBillingMonth = this.getCurrentBillingMonth();
      const prevTotal = Number(user?.totalRechargedUSD ?? memUser?.totalRechargedUSD) || 0;
      const newTotal = parseFloat((prevTotal + Number(amountUSD)).toFixed(2));

      // Calculate monthly recharge for the active billing cycle
      let prevMonthly = Number(user?.monthlyRechargedUSD ?? memUser?.monthlyRechargedUSD) || 0;
      const userBillingMonth = user?.vipBillingMonth ?? memUser?.vipBillingMonth;
      if (userBillingMonth !== currentBillingMonth) {
        prevMonthly = 0;
      }
      const newMonthly = parseFloat((prevMonthly + Number(amountUSD)).toFixed(2));

      const oldVipLevel = user?.vipLevel ?? memUser?.vipLevel ?? 0;
      // VIP Tier opens based on monthly recharge amount ($500 for VIP 1, $1000 for VIP 2, etc.)
      const calculatedVipLevel = this.calculateVipLevelFromRecharge(newMonthly);
      const newVipLevel = Math.max(oldVipLevel, calculatedVipLevel);
      const isUpgraded = newVipLevel > oldVipLevel;

      if (user) {
        try {
          await (this.prisma as any).user.update({
            where: { id: userId },
            data: {
              totalRechargedUSD: newTotal,
              monthlyRechargedUSD: newMonthly,
              vipBillingMonth: currentBillingMonth,
              ...(isUpgraded && { vipLevel: newVipLevel }),
            },
          });
        } catch {}
      }

      if (memUser) {
        memUser.totalRechargedUSD = newTotal;
        memUser.monthlyRechargedUSD = newMonthly;
        memUser.vipBillingMonth = currentBillingMonth;
        if (isUpgraded) memUser.vipLevel = newVipLevel;
      }

      if (isUpgraded && newVipLevel >= 1) {
        const config = LevelsService.vipConfigsMap.get(newVipLevel) || DEFAULT_VIP_LEVELS[newVipLevel - 1];
        const payload = {
          userId: user?.id || userId,
          displayName: user?.displayName || memUser?.displayName || 'VIP Member',
          avatarUrl: user?.avatarUrl || memUser?.avatarUrl,
          oldLevel: oldVipLevel,
          newLevel: newVipLevel,
          vipLevel: newVipLevel,
          title: config.title,
          badgeColor: config.badgeColor,
          frameUrl: config.frameUrl,
          animatedFrameUrl: config.animatedFrameUrl,
          lottieUrl: config.lottieUrl,
          perks: config.perks,
          totalRechargedUSD: newTotal,
          monthlyRechargedUSD: newMonthly,
          reason,
          timestamp: new Date().toISOString(),
        };

        this.signalingGateway.server?.emit('user_vip_unlocked', payload);
        this.signalingGateway.server?.emit('user_level_up', payload);
        this.logger.log(`🎉 VIP UNLOCKED: ${payload.displayName} achieved ${config.title} with $${newMonthly} monthly recharge!`);
      }

      return {
        userId,
        oldVipLevel,
        newVipLevel,
        totalRechargedUSD: newTotal,
        monthlyRechargedUSD: newMonthly,
        isUpgraded,
      };
    } catch (e) {
      this.logger.error(`Error in awardRechargeUSD: ${e.message}`);
      return null;
    }
  }

  /**
   * Run Monthly VIP Evaluation & Single-Step Downgrade Cycle
   * Rule:
   * Users who do not maintain their monthly spending threshold downgrade by at most ONE VIP step!
   * (e.g. VIP 4 -> VIP 3, VIP 3 -> VIP 2, VIP 1 -> VIP 0)
   */
  async runMonthlyVipEvaluation(targetMonth?: string) {
    const activeMonth = targetMonth || this.getCurrentBillingMonth();
    this.logger.log(`⏳ Running Monthly VIP Evaluation for cycle: ${activeMonth}`);

    try {
      const vipUsers = await (this.prisma as any).user.findMany({
        where: { vipLevel: { gt: 0 } },
      });

      const results = {
        evaluatedCount: vipUsers.length,
        maintainedCount: 0,
        downgradedCount: 0,
        upgradedCount: 0,
        details: [] as any[],
      };

      for (const u of vipUsers) {
        const curLvl = u.vipLevel;
        const monthlySpent = Number(u.monthlyRechargedUSD) || 0;
        const config = LevelsService.vipConfigsMap.get(curLvl) || DEFAULT_VIP_LEVELS[curLvl - 1];
        const minReq = config?.minRechargeUSD || 500;

        let finalLevel = curLvl;
        let action = 'MAINTAINED';

        if (monthlySpent >= minReq) {
          const higherTier = this.calculateVipLevelFromRecharge(monthlySpent);
          if (higherTier > curLvl) {
            finalLevel = higherTier;
            action = 'UPGRADED';
            results.upgradedCount++;
          } else {
            action = 'MAINTAINED';
            results.maintainedCount++;
          }
        } else {
          // Single-step downgrade only!
          finalLevel = Math.max(0, curLvl - 1);
          action = 'DOWNGRADED_1_STEP';
          results.downgradedCount++;
        }

        await (this.prisma as any).user.update({
          where: { id: u.id },
          data: {
            vipLevel: finalLevel,
            monthlyRechargedUSD: 0,
            vipBillingMonth: activeMonth,
          },
        });

        results.details.push({
          userId: u.id,
          username: u.username,
          displayName: u.displayName,
          previousLevel: curLvl,
          newLevel: finalLevel,
          monthlySpentUSD: monthlySpent,
          requiredThresholdUSD: minReq,
          action,
        });

        if (finalLevel !== curLvl) {
          this.signalingGateway.server?.emit('user_vip_unlocked', {
            userId: u.id,
            displayName: u.displayName,
            oldLevel: curLvl,
            newLevel: finalLevel,
            vipLevel: finalLevel,
            reason: `MONTHLY_VIP_CYCLE_${action}`,
            timestamp: new Date().toISOString(),
          });
        }
      }

      return {
        success: true,
        message: `Monthly VIP evaluation completed for ${vipUsers.length} VIP members. (${results.maintainedCount} maintained, ${results.downgradedCount} stepped down by 1 level, ${results.upgradedCount} elevated).`,
        summary: results,
      };
    } catch (e) {
      this.logger.error(`Error in runMonthlyVipEvaluation: ${e.message}`);
      return { success: false, error: e.message };
    }
  }

  /**
   * Test VIP Celebration broadcast for Admin Dashboard
   */
  async triggerTestCelebration(userId: string = 'test-vip-user', targetLevel: number = 5) {
    const lvl = Number(targetLevel) || 5;
    const config = LevelsService.vipConfigsMap.get(lvl) || DEFAULT_VIP_LEVELS[lvl - 1];

    const payload = {
      userId: userId || 'test-user',
      displayName: 'VIP Sovereign 👑',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      oldLevel: Math.max(0, lvl - 1),
      newLevel: lvl,
      vipLevel: lvl,
      title: config.title,
      badgeColor: config.badgeColor,
      frameUrl: config.frameUrl,
      animatedFrameUrl: config.animatedFrameUrl,
      lottieUrl: config.lottieUrl,
      perks: config.perks,
      totalRechargedUSD: config.minRechargeUSD,
      reason: 'ADMIN_TEST_VIP_CELEBRATION',
      timestamp: new Date().toISOString(),
    };

    this.signalingGateway.server?.emit('user_vip_unlocked', payload);
    this.signalingGateway.server?.emit('user_level_up', payload);

    return {
      success: true,
      message: `Test VIP celebration broadcast triggered for ${config.title} ($${config.minRechargeUSD.toLocaleString()} USD)!`,
      payload,
    };
  }

  /**
   * Test Room VIP Entrance Effect
   */
  async triggerTestEntrance(dto: TestEntranceDto) {
    const lvl = Number(dto.vipLevel) || 4;
    const config = LevelsService.vipConfigsMap.get(lvl) || DEFAULT_VIP_LEVELS[lvl - 1];

    const entrancePayload = {
      userId: dto.userId || 'test-vip',
      displayName: 'Royal VIP Member',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      vipLevel: lvl,
      title: config.title,
      badgeColor: config.badgeColor,
      frameUrl: config.frameUrl,
      animatedFrameUrl: config.animatedFrameUrl,
      entryEffectType: config.entryEffectType,
      entryEffectUrl: config.entryEffectUrl,
      lottieUrl: config.lottieUrl,
      chatBubbleStyle: config.chatBubbleStyle,
      roomId: dto.roomId || 'global_room',
      timestamp: Date.now(),
    };

    if (dto.roomId) {
      this.signalingGateway.server?.to(dto.roomId).emit('room:vip_entrance', entrancePayload);
    } else {
      this.signalingGateway.server?.emit('room:vip_entrance', entrancePayload);
    }

    return {
      success: true,
      message: `VIP Entrance animation emitted for ${config.title} (${config.entryEffectType})!`,
      payload: entrancePayload,
    };
  }

  /**
   * VIP 6+ Daily Global Announcement in all live rooms
   */
  async broadcastVipAnnouncement(dto: VipAnnouncementDto) {
    const status = await this.getUserVipStatus(dto.userId);
    if (status.vipLevel < 6) {
      throw new ForbiddenException('VIP 6 or higher required to broadcast global VIP room announcements.');
    }
    if (status.activeFeatures?.dailyGlobalRoomAnnouncement === false) {
      throw new ForbiddenException('The global room announcement benefit is currently disabled by the administrator.');
    }

    const payload = {
      id: `ann_${Date.now()}`,
      userId: dto.userId,
      displayName: status.displayName,
      vipLevel: status.vipLevel,
      badgeColor: status.currentConfig?.badgeColor || '#8B5CF6',
      message: dto.message.slice(0, 160),
      timestamp: Date.now(),
    };

    // Broadcast marquee across all rooms
    this.signalingGateway.server?.emit('room:global_announcement', payload);

    return {
      success: true,
      message: 'VIP Announcement broadcasted across all rooms!',
      announcement: payload,
    };
  }

  /**
   * Record profile visit with ghost / mystery mode check
   */
  async recordProfileVisit(dto: RecordVisitDto) {
    const { profileId, visitorId } = dto;
    if (!profileId || !visitorId || profileId === visitorId) {
      return { recorded: false };
    }

    // Check if visitor has mysteryMode or hideFromVisitors enabled
    const visitorStatus = await this.getUserVipStatus(visitorId);
    if (
      visitorStatus.vipSettings?.hideFromVisitors ||
      (visitorStatus.vipLevel >= 4 && visitorStatus.vipSettings?.mysteryMode)
    ) {
      return { recorded: false, reason: 'GHOST_MODE_ACTIVE' };
    }

    try {
      await (this.prisma as any).profileVisitor.create({
        data: {
          profileId,
          visitorId,
        },
      });
      return { recorded: true };
    } catch {
      return { recorded: false };
    }
  }

  /**
   * View Profile Visitors (Requires VIP 1+)
   */
  async getProfileVisitors(profileId: string, requestingUserId: string) {
    const reqStatus = await this.getUserVipStatus(requestingUserId);
    if (reqStatus.vipLevel < 1) {
      throw new ForbiddenException('VIP 1 status required to view your profile visitors.');
    }
    if (reqStatus.activeFeatures?.viewProfileVisitors === false) {
      throw new ForbiddenException('The profile visitors benefit is currently disabled for your tier.');
    }

    try {
      const visitors = await (this.prisma as any).profileVisitor.findMany({
        where: { profileId },
        orderBy: { visitedAt: 'desc' },
        take: 30,
        include: {
          visitor: {
            select: {
              id: true,
              displayName: true,
              username: true,
              avatarUrl: true,
              vipLevel: true,
              level: true,
              customId: true,
            },
          },
        },
      });

      return {
        profileId,
        visitorsCount: visitors.length,
        visitors: visitors.map((v: any) => ({
          visitorId: v.visitor?.id,
          displayName: v.visitor?.displayName || v.visitor?.username || 'Visitor',
          avatarUrl: v.visitor?.avatarUrl,
          vipLevel: v.visitor?.vipLevel || 0,
          visitedAt: v.visitedAt,
        })),
      };
    } catch (e) {
      return { profileId, visitorsCount: 0, visitors: [] };
    }
  }

  /**
   * Custom ID vanity setting (Requires VIP 1+)
   */
  async setCustomId(userId: string, dto: SetCustomIdDto) {
    const status = await this.getUserVipStatus(userId);
    if (status.vipLevel < 1) {
      throw new ForbiddenException('VIP 1 status required to set a custom ID.');
    }
    if (status.activeFeatures?.customId === false) {
      throw new ForbiddenException('The VIP Custom ID benefit is currently disabled for your tier.');
    }

    const cleanId = dto.customId.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (cleanId.length < 3 || cleanId.length > 20) {
      throw new BadRequestException('Custom ID must be between 3 and 20 alphanumeric characters.');
    }

    // Check if ID is already claimed
    const existing = await (this.prisma as any).user.findFirst({
      where: {
        OR: [{ customId: cleanId }, { username: cleanId }],
        NOT: { id: userId },
      },
    });

    if (existing) {
      throw new BadRequestException(`Custom ID '@${cleanId}' is already taken by another user.`);
    }

    try {
      await (this.prisma as any).user.update({
        where: { id: userId },
        data: {
          customId: cleanId,
          username: cleanId,
        },
      });
    } catch {}

    const memUser = UsersService.usersMap.get(userId);
    if (memUser) {
      memUser.customId = cleanId;
      memUser.username = cleanId;
    }

    return {
      success: true,
      message: `Custom ID '@${cleanId}' claimed successfully!`,
      customId: cleanId,
    };
  }
}
