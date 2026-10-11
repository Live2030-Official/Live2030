import {
  IsOptional,
  IsString,
  IsNumber,
  IsIn,
  Min,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AccountDetailsDto {
  @IsOptional()
  @IsString()
  accountName?: string;

  @IsOptional()
  @IsString()
  accountNumberOrIBAN?: string;

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  swiftCode?: string;

  @IsOptional()
  @IsString()
  paypalEmail?: string;

  @IsOptional()
  @IsString()
  usdtTrc20Address?: string;
}

export class RequestWithdrawalDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsNumber()
  @Min(1)
  amountDiamonds: number;

  @IsIn(['BANK', 'PAYPAL', 'USDT'])
  paymentMethod: 'BANK' | 'PAYPAL' | 'USDT';

  @IsObject()
  @ValidateNested()
  @Type(() => AccountDetailsDto)
  accountDetails: AccountDetailsDto;
}

export class ReviewWithdrawalDto {
  @IsOptional()
  @IsString()
  rejectionReason?: string;

  @IsOptional()
  @IsString()
  adminNotes?: string;
}

export class ApproveWithdrawalDto {
  @IsOptional()
  @IsString()
  payoutReference?: string;

  @IsOptional()
  @IsString()
  adminNotes?: string;
}
