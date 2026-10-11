import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, IsInt, IsBoolean, Min } from 'class-validator';

export class CreateCoinPackageDto {
  @ApiProperty({ example: 'pkg_2500', required: false })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({ example: 'Most Popular Bundle', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: 2500 })
  @IsInt()
  @Min(1)
  coins: number;

  @ApiProperty({ example: 500, default: 0, required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  bonusCoins?: number;

  @ApiProperty({ example: 3000, required: false, description: 'Auto-computed as coins + bonusCoins when omitted' })
  @IsOptional()
  @IsInt()
  @Min(1)
  totalCoins?: number;

  @ApiProperty({ example: 13.5, description: 'Package price in USD' })
  @IsNumber()
  @Min(0)
  amountUSD: number;

  @ApiProperty({ example: 50.0, required: false, description: 'Auto-converted from USD when omitted' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amountSAR?: number;

  @ApiProperty({ example: 'Most Popular 🔥', required: false })
  @IsOptional()
  @IsString()
  badge?: string;

  @ApiProperty({ example: true, default: false, required: false })
  @IsOptional()
  @IsBoolean()
  popular?: boolean;

  @ApiProperty({ example: true, default: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ example: 4, default: 0, required: false })
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class UpdateCoinPackageDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  coins?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  bonusCoins?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  totalCoins?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amountUSD?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amountSAR?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  badge?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  popular?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
