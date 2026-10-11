import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsInt, Min, IsOptional } from 'class-validator';

export class SendGiftDto {
  @ApiProperty({ example: 'room-uuid-12345' })
  @IsNotEmpty()
  @IsString()
  roomId: string;

  @ApiProperty({ example: 'gift_car' })
  @IsNotEmpty()
  @IsString()
  giftId: string;

  @ApiProperty({ example: 1, default: 1 })
  @IsInt()
  @Min(1)
  quantity: number = 1;

  @ApiProperty({ example: 'user-uuid-sender', required: false })
  @IsOptional()
  @IsString()
  senderId?: string;

  @ApiProperty({ example: 'user-uuid-recipient', required: false })
  @IsOptional()
  @IsString()
  recipientId?: string;

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsInt()
  targetSeatIndex?: number;

  @ApiProperty({ example: 'host1', required: false, enum: ['host1', 'host2'] })
  @IsOptional()
  @IsString()
  targetHost?: 'host1' | 'host2';
}

export class CreateGiftDto {
  @ApiProperty({ example: 'Golden Dragon 🐉' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: 1000 })
  @IsInt()
  @Min(1)
  costCoins: number;

  @ApiProperty({ example: 420 })
  @IsInt()
  @Min(1)
  diamondsAwarded: number;

  @ApiProperty({ example: 'https://cdn.live2030.com/gifts/dragon.png' })
  @IsNotEmpty()
  @IsString()
  iconUrl: string;

  @ApiProperty({ example: 'https://cdn.live2030.com/gifts/dragon.svga', required: false })
  @IsOptional()
  @IsString()
  animationUrl?: string;

  @ApiProperty({ example: 'Luxury', default: 'Standard' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ example: 1, default: 0, description: 'Minimum VIP Level required (0 = all, 1 = VIP 1+)' })
  @IsOptional()
  @IsInt()
  minVipLevel?: number;
}

export class UpdateEconomicsDto {
  @ApiProperty({ example: 45, description: 'Platform gross margin cut percentage' })
  @IsNotEmpty()
  platformShare: number;

  @ApiProperty({ example: 42, description: 'Host streamer diamond earnings percentage' })
  @IsNotEmpty()
  hostShare: number;

  @ApiProperty({ example: 13, description: 'Talent agency commission cut percentage' })
  @IsNotEmpty()
  agencyShare: number;
}

