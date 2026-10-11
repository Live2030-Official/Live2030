import { Body, Controller, Post, Get, HttpCode, HttpStatus, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RequirePermissions } from './permissions.decorator';
import { GuestLoginDto, GoogleLoginDto, AppleLoginDto, PhoneLoginStubDto } from './dto/auth.dto';

@ApiTags('Authentication')
@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('admin-login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Staff/Admin Panel login (email or username + password)' })
  @ApiResponse({ status: 200, description: 'Admin session created with JWT token' })
  async adminLogin(@Body('identifier') identifier: string, @Body('password') password: string) {
    return this.authService.adminLogin(identifier, password);
  }

  @Post('admin-2fa/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete an admin login that requires two-factor verification' })
  async adminTwoFactorVerify(
    @Body('challengeToken') challengeToken: string,
    @Body('code') code: string,
  ) {
    return this.authService.verifyAdminTwoFactor(challengeToken, code);
  }

  @Get('admin-2fa/status')
  @RequirePermissions('overview.view')
  @ApiOperation({ summary: 'Get the current admin account 2FA status' })
  async twoFactorStatus(@Request() req: any) {
    return this.authService.adminTwoFactorStatus(req.user?.id);
  }

  @Post('admin-2fa/setup')
  @RequirePermissions('overview.view')
  @ApiOperation({ summary: 'Begin enabling 2FA (sends a verification code)' })
  async twoFactorSetup(@Request() req: any, @Body('method') method: string) {
    return this.authService.setupAdminTwoFactor(req.user?.id, method);
  }

  @Post('admin-2fa/enable')
  @RequirePermissions('overview.view')
  @ApiOperation({ summary: 'Confirm 2FA enablement with the verification code' })
  async twoFactorEnable(@Request() req: any, @Body('code') code: string) {
    return this.authService.enableAdminTwoFactor(req.user?.id, code);
  }

  @Post('admin-2fa/disable')
  @RequirePermissions('overview.view')
  @ApiOperation({ summary: 'Disable 2FA (requires the account password)' })
  async twoFactorDisable(@Request() req: any, @Body('password') password: string) {
    return this.authService.disableAdminTwoFactor(req.user?.id, password);
  }

  @Post('guest-login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Instant 1-Click Guest Login for fast testing & viewers' })
  @ApiResponse({ status: 200, description: 'Guest session created with JWT token' })
  async guestLogin(@Body() dto: GuestLoginDto) {
    return this.authService.guestLogin(dto);
  }

  @Post('google-login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign in with Google OAuth / ID Token' })
  @ApiResponse({ status: 200, description: 'User authenticated with Google credentials' })
  async googleLogin(@Body() dto: GoogleLoginDto) {
    return this.authService.googleLogin(dto);
  }

  @Post('apple-login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign in with Apple OAuth / Firebase ID Token (iOS)' })
  @ApiResponse({ status: 200, description: 'User authenticated with Apple credentials' })
  async appleLogin(@Body() dto: AppleLoginDto) {
    return this.authService.appleLogin(dto);
  }

  @Post('phone-login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Extensible Phone Login stub (for future SMS gateway integration)' })
  async phoneLogin(@Body() dto: PhoneLoginStubDto) {
    return this.authService.phoneLoginStub(dto.phoneNumber);
  }

  @Post('otp/send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request MSG91 Mobile OTP with 60-second cooldown period' })
  async sendOtp(@Body('phone') phone: string) {
    return this.authService.sendPhoneOtp(phone);
  }

  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify MSG91 Mobile OTP and complete user login/registration' })
  async verifyOtp(
    @Body('phone') phone: string,
    @Body('otp') otp: string,
    @Body('displayName') displayName?: string,
  ) {
    return this.authService.verifyPhoneOtp(phone, otp, displayName);
  }
}

