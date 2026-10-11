import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsEmail } from 'class-validator';

export class GuestLoginDto {
  @ApiPropertyOptional({ example: 'Guest_9921' })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional({ example: 'device-uuid-12345' })
  @IsOptional()
  @IsString()
  deviceId?: string;
}

export class GoogleLoginDto {
  @ApiPropertyOptional({ example: 'google-oauth2-token-string' })
  @IsOptional()
  @IsString()
  idToken?: string;

  @ApiPropertyOptional({ example: 'user@gmail.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional({ example: 'https://lh3.googleusercontent.com/a/avatar.jpg' })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional({ example: 'device-uuid-12345' })
  @IsOptional()
  @IsString()
  deviceId?: string;
}

export class PhoneLoginStubDto {
  @ApiProperty({ example: '+1234567890' })
  @IsNotEmpty()
  @IsString()
  phoneNumber: string;

  @ApiProperty({ example: '123456' })
  @IsNotEmpty()
  @IsString()
  otpCode: string;
}

export class AppleLoginDto {
  @ApiProperty({ example: '001234.abcdef1234567890.1234' })
  @IsNotEmpty()
  @IsString()
  appleId: string;

  @ApiPropertyOptional({ example: 'user@privaterelay.appleid.com' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ example: 'John Appleseed' })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.jpg' })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional({ example: 'eyJhbGciOiJSUzI1NiIs...' })
  @IsOptional()
  @IsString()
  idToken?: string;

  @ApiPropertyOptional({ example: 'device-uuid-12345' })
  @IsOptional()
  @IsString()
  deviceId?: string;
}

