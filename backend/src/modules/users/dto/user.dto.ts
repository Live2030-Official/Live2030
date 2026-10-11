import { IsOptional, IsString, IsNumber, IsEnum, IsBoolean } from 'class-validator';

export class UpdateUserStatusDto {
  @IsString()
  status: 'ACTIVE' | 'SUSPENDED_24H' | 'SUSPENDED_7D' | 'SUSPENDED_30D' | 'BANNED' | 'VIOLATION_FLAGGED';

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsNumber()
  suspensionHours?: number;
}

export class AdjustWalletDto {
  @IsOptional()
  @IsNumber()
  coinDelta?: number;

  @IsOptional()
  @IsNumber()
  diamondDelta?: number;

  @IsOptional()
  @IsNumber()
  setCoins?: number;

  @IsOptional()
  @IsNumber()
  setDiamonds?: number;

  @IsOptional()
  @IsString()
  mode?: 'DELTA' | 'SET';

  @IsOptional()
  @IsString()
  reason?: string;
}


export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  birthday?: string;

  @IsOptional()
  @IsString()
  country?: string;
}

export class CreateReportDto {
  @IsString()
  targetType: 'STREAM' | 'USER';

  @IsString()
  targetId: string;

  @IsOptional()
  @IsString()
  reportedUserId?: string;

  @IsOptional()
  @IsString()
  roomId?: string;

  @IsString()
  category: 'NUDITY' | 'HARASSMENT' | 'VIOLENCE' | 'FRAUD' | 'UNDERAGE' | 'PROFANITY_ILLEGAL_CONTENT' | 'INAPPROPRIATE_CONTENT' | 'OTHER';

  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  evidenceUrl?: string;
}

export class ReportActionDto {
  @IsString()
  action: 'DISMISS' | 'WARN' | 'KILL_STREAM' | 'BAN_USER' | 'SUSPEND_24H' | 'SUSPEND_7D';

  @IsOptional()
  @IsString()
  notes?: string;
}

export class SetVerificationDto {
  @IsBoolean()
  isVerified: boolean;

  @IsOptional()
  @IsString()
  verifiedLabel?: string;
}

export class AdminSetCustomIdDto {
  @IsOptional()
  @IsString()
  customId?: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  customNameColor?: string;
}
