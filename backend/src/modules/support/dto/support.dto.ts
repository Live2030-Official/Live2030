import { IsString, IsOptional, IsEmail } from 'class-validator';

export class UpdateSupportContactDto {
  @IsOptional()
  @IsString()
  whatsappNumber?: string;

  @IsOptional()
  @IsEmail()
  helplineEmail?: string;

  @IsOptional()
  @IsString()
  helplinePhone?: string;

  @IsOptional()
  @IsString()
  operatingHours?: string;

  @IsOptional()
  @IsString()
  announcement?: string;
}
