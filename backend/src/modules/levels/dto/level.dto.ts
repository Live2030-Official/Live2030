import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsString, IsOptional, IsBoolean, IsArray, IsObject, Min, Max } from 'class-validator';

export class UpdateLevelConfigDto {
  @ApiPropertyOptional({ example: 'VIP 1' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  minXp?: number;

  @ApiPropertyOptional({ example: 500 })
  @IsOptional()
  @IsNumber()
  minRechargeUSD?: number;

  @ApiPropertyOptional({ example: '#F59E0B' })
  @IsOptional()
  @IsString()
  badgeColor?: string;

  @ApiPropertyOptional({ example: 'VIP 1 Badge' })
  @IsOptional()
  @IsString()
  badgeTitle?: string;

  @ApiPropertyOptional({ example: 'http://13.51.73.60:4000/uploads/levels/badge-1.png' })
  @IsOptional()
  @IsString()
  badgeIconUrl?: string;

  @ApiPropertyOptional({ example: 'http://13.51.73.60:4000/uploads/levels/frame-1.png' })
  @IsOptional()
  @IsString()
  frameUrl?: string;

  @ApiPropertyOptional({ example: 'http://13.51.73.60:4000/uploads/levels/animated-frame-1.gif' })
  @IsOptional()
  @IsString()
  animatedFrameUrl?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isAnimatedFrame?: boolean;

  @ApiPropertyOptional({ example: '#1E293B' })
  @IsOptional()
  @IsString()
  chatBubbleColor?: string;

  @ApiPropertyOptional({ example: 'vip1' })
  @IsOptional()
  @IsString()
  chatBubbleStyle?: string;

  @ApiPropertyOptional({ example: '#FCD34D' })
  @IsOptional()
  @IsString()
  nameColor?: string;

  @ApiPropertyOptional({ example: 'http://13.51.73.60:4000/uploads/levels/lottie-1.json' })
  @IsOptional()
  @IsString()
  lottieUrl?: string;

  @ApiPropertyOptional({ example: 'http://13.51.73.60:4000/uploads/levels/entry-1.json' })
  @IsOptional()
  @IsString()
  entryEffectUrl?: string;

  @ApiPropertyOptional({ example: 'SPECIAL' })
  @IsOptional()
  @IsString()
  entryEffectType?: string;

  @ApiPropertyOptional({ example: ['Unlimited chat.', 'Lock rooms.'] })
  @IsOptional()
  @IsArray()
  perks?: string[];

  @ApiPropertyOptional({ example: { unlimitedChat: true, lockRooms: true } })
  @IsOptional()
  @IsObject()
  features?: Record<string, boolean>;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isVip?: boolean;
}

export class AwardXpDto {
  @ApiProperty({ example: 'user-uuid' })
  @IsString()
  userId: string;

  @ApiProperty({ example: 500 })
  @IsNumber()
  xpAmount: number;

  @ApiPropertyOptional({ example: 'GIFT_SENT' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class SetUserVipDto {
  @ApiProperty({ example: 'user-uuid' })
  @IsString()
  userId: string;

  @ApiPropertyOptional({ example: 3, description: 'VIP level (0 = normal user, 1..8 = VIP)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(8)
  vipLevel?: number;

  @ApiPropertyOptional({ example: 500.0, description: 'Directly add or set recharge amount in USD' })
  @IsOptional()
  @IsNumber()
  rechargeUSD?: number;

  @ApiPropertyOptional({ example: 'VIP_BOSS_2030', description: 'Assign or edit VIP custom vanity ID' })
  @IsOptional()
  @IsString()
  customId?: string;

  @ApiPropertyOptional({ example: 'ADMIN_MANUAL_OVERRIDE' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class UpdateVipSettingsDto {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  rejectStrangerMessages?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  disableFollowing?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  hideLocationInRooms?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  anonymousInGames?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  invisibleOnlineStatus?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  hideCountry?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  mysteryMode?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  hideFromVisitors?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  hideRoomFromTrending?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  stealthRoomAccess?: boolean;

  @ApiPropertyOptional({ example: '#FCD34D' })
  @IsOptional()
  @IsString()
  customNameColor?: string;
}

export class TestEntranceDto {
  @ApiPropertyOptional({ example: 'user-uuid' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ example: 4 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(8)
  vipLevel?: number;

  @ApiPropertyOptional({ example: 'room-channel-name' })
  @IsOptional()
  @IsString()
  roomId?: string;
}

export class VipAnnouncementDto {
  @ApiProperty({ example: 'user-uuid' })
  @IsString()
  userId: string;

  @ApiProperty({ example: 'VIP Member entered the royal court!' })
  @IsString()
  message: string;
}

export class RecordVisitDto {
  @ApiProperty({ example: 'profile-user-uuid' })
  @IsString()
  profileId: string;

  @ApiProperty({ example: 'visitor-user-uuid' })
  @IsString()
  visitorId: string;
}

export class SetCustomIdDto {
  @ApiProperty({ example: 'king_2030' })
  @IsString()
  customId: string;
}
