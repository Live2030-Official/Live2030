import { IsOptional, IsString, IsNumber } from 'class-validator';

export class CreateOrderDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  packageId?: string;

  @IsOptional()
  @IsNumber()
  coins?: number;

  @IsOptional()
  @IsNumber()
  amountSAR?: number;

  @IsOptional()
  @IsString()
  paymentMethod?: 'mada' | 'credit_card' | 'apple_pay';

  @IsOptional()
  @IsString()
  returnUrl?: string;

  @IsOptional()
  @IsString()
  notificationUrl?: string;
}

export class VerifyPaymentDto {
  @IsString()
  orderId: string;
}

export class RsomPayWebhookDto {
  @IsString()
  event: string;

  @IsString()
  event_id: string;

  @IsOptional()
  @IsString()
  occurred_at?: string;

  @IsOptional()
  payment?: {
    external_id?: string;
    customer_external_id?: string;
    customer_name?: string;
    status?: string;
    amount?: number;
    currency_code?: string;
    brand?: string;
    paid_at?: string;
    [key: string]: any;
  };

  @IsOptional()
  invoice?: {
    external_id?: string;
    reference_number?: string;
    status?: string;
    amount?: number;
    payment_url?: string;
    [key: string]: any;
  };

  @IsOptional()
  transaction?: any;
}
