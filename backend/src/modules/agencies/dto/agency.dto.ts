import { IsNotEmpty, IsString, IsEmail, IsNumber, IsOptional } from 'class-validator';

export class CreateAgencyDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  code: string;

  @IsNotEmpty()
  @IsString()
  managerEmail: string;

  @IsOptional()
  @IsString()
  whatsappNumber?: string;

  @IsOptional()
  @IsNumber()
  commissionPercent?: number;
}

export class BindHostDto {
  @IsNotEmpty()
  @IsString()
  hostId: string;

  @IsNotEmpty()
  @IsString()
  agencyCode: string;
}

