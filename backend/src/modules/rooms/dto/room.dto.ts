import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class StartRoomDto {
  @ApiProperty({ example: 'My First Live Stream! 🎉' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiPropertyOptional({ example: 'https://cdn.live2030.com/covers/cover1.jpg' })
  @IsOptional()
  @IsString()
  coverUrl?: string;

  @ApiPropertyOptional({ example: 'VIDEO', enum: ['VIDEO', 'VOICE'] })
  @IsOptional()
  @IsString()
  roomType?: string;

  @ApiPropertyOptional({ example: 'user-uuid-123' })
  @IsOptional()
  @IsString()
  hostId?: string;

  @ApiPropertyOptional({ example: 'Jay Soni' })
  @IsOptional()
  @IsString()
  hostDisplayName?: string;

  @ApiPropertyOptional({ example: 'https://cdn.live2030.com/avatars/user.jpg' })
  @IsOptional()
  @IsString()
  hostAvatarUrl?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  isLocked?: boolean;

  @ApiPropertyOptional({ example: '1234' })
  @IsOptional()
  @IsString()
  roomPin?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  isTrendingHidden?: boolean;

  @ApiPropertyOptional({ example: 'MUSIC', enum: ['ALL', 'MUSIC', 'CHAT', 'TALENT', 'PK', 'GAMING'] })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: 'Arabic' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ example: 'Saudi Arabia' })
  @IsOptional()
  @IsString()
  country?: string;


  @ApiPropertyOptional({ example: 'VIP_KING' })
  @IsOptional()
  @IsString()
  hostCustomId?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  hostVipLevel?: number;
}

export class JoinRoomDto {
  @ApiPropertyOptional({ example: 'uuid-room-id' })
  @IsOptional()
  @IsString()
  roomId?: string;

  @ApiPropertyOptional({ example: 'viewer-uuid-123' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ example: 'live_channel_123' })
  @IsOptional()
  @IsString()
  channelName?: string;

  @ApiPropertyOptional({ example: '1234' })
  @IsOptional()
  @IsString()
  roomPin?: string;
}

