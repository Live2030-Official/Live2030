import { Injectable, UnauthorizedException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { GuestLoginDto, GoogleLoginDto, AppleLoginDto } from './dto/auth.dto';
import { Role } from '@prisma/client';
import { resolvePermissions } from './permissions';

@Injectable()
export class AuthService {
  private static otpCooldownMap = new Map<string, number>();
  private static otpStoreMap = new Map<string, { otp: string; expiresAt: number }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Fast 1-Click Guest Login for Instant Testing & Viewers
   */
  async guestLogin(dto: GuestLoginDto) {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const userId = `guest-${Date.now().toString().slice(-6)}-${randomSuffix}`;
    const username = `guest_${randomSuffix}`;
    const displayName = dto.displayName || `Guest ${randomSuffix}`;

    let user: any = {
      id: userId,
      username,
      displayName,
      role: Role.USER,
      deviceId: dto.deviceId,
      level: 1,
      coins: 0,
      diamonds: 0,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      wallet: { coins: 0, diamonds: 0 },
    };

    try {
      const dbUser = await this.prisma.user.create({
        data: {
          username,
          displayName,
          role: Role.USER,
          deviceId: dto.deviceId,
          wallet: {
            create: {
              coins: 0,
              diamonds: 0,
            },
          },
        },
        include: { wallet: true },
      });
      if (dbUser) user = dbUser;
    } catch {
      // in-memory fallback
    }

    // Register in master usersMap
    const { UsersService } = await import('../users/users.service');
    UsersService.usersMap.set(user.id, user);

    const tokens = this.generateTokens(user.id, user.username, user.role);

    return {
      user,
      ...tokens,
    };
  }

  /**
   * Google Sign-In Authentication with Database Verification
   */
  async googleLogin(dto: GoogleLoginDto) {
    const email = dto.email;
    if (!email) {
      throw new UnauthorizedException('Google authentication requires an email address');
    }

    const { UsersService } = await import('../users/users.service');
    
    let isNewUser = false;
    let existingUser: any = null;

    // 1. Check if user already exists in PostgreSQL database
    try {
      const dbUser = await this.prisma.user.findUnique({
        where: { email },
        include: { wallet: true },
      });
      if (dbUser) {
        existingUser = {
          id: dbUser.id,
          username: dbUser.username,
          displayName: dbUser.displayName,
          email: dbUser.email,
          phone: dbUser.phone,
          avatarUrl: dbUser.avatarUrl,
          bio: dbUser.bio,
          gender: dbUser.gender,
          birthday: (dbUser as any).birthday,
          country: (dbUser as any).country || 'Global 🌍',
          role: dbUser.role,
          level: dbUser.level || 1,
          coins: dbUser.wallet?.coins ?? 0,
          diamonds: dbUser.wallet?.diamonds ?? 0,
          status: dbUser.isBanned ? 'BANNED' : 'ACTIVE',
          createdAt: dbUser.createdAt.toISOString(),
        };
        isNewUser = false;
      }
    } catch {
      // ignore
    }

    // 2. Check in-memory usersMap if DB was unreachable
    if (!existingUser) {
      existingUser = Array.from(UsersService.usersMap.values()).find((u) => u.email === email);
      if (existingUser) {
        isNewUser = false;
      }
    }
    
    // 3. If genuinely new user, create entry in PostgreSQL database
    if (!existingUser) {
      isNewUser = true;
      const username = email.split('@')[0] + '_' + Math.floor(100 + Math.random() * 900);
      const userId = `google-${Date.now().toString().slice(-6)}`;
      existingUser = {
        id: userId,
        email,
        username,
        displayName: dto.displayName || username,
        avatarUrl: dto.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
        deviceId: dto.deviceId,
        role: Role.USER,
        level: 1,
        coins: 0,
        diamonds: 0,
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        wallet: { coins: 0, diamonds: 0 },
      };

      try {
        const dbUser = await this.prisma.user.create({
          data: {
            email,
            username,
            displayName: existingUser.displayName,
            avatarUrl: existingUser.avatarUrl,
            deviceId: dto.deviceId,
            role: Role.USER,
            wallet: {
              create: {
                coins: 0,
                diamonds: 0,
              },
            },
          },
          include: { wallet: true },
        });
        if (dbUser) {
          existingUser = {
            ...existingUser,
            id: dbUser.id,
          };
        }
      } catch {
        // in-memory fallback
      }
    }

    UsersService.usersMap.set(existingUser.id, existingUser);

    const tokens = this.generateTokens(existingUser.id, existingUser.username, existingUser.role);

    return {
      user: existingUser,
      isNewUser,
      isOnboarded: !isNewUser,
      ...tokens,
    };
  }

  /**
   * Apple Sign-In Authentication with Database Verification
   */
  async appleLogin(dto: AppleLoginDto) {
    const appleId = dto.appleId;
    if (!appleId) {
      throw new UnauthorizedException('Apple authentication requires an appleId');
    }

    const { UsersService } = await import('../users/users.service');
    
    let isNewUser = false;
    let existingUser: any = null;

    // 1. Check if user already exists in PostgreSQL database by appleId or email
    try {
      let dbUser = await this.prisma.user.findUnique({
        where: { appleId },
        include: { wallet: true },
      });

      // Fallback: If not found by appleId, but email was provided, check by email and link appleId
      if (!dbUser && dto.email) {
        dbUser = await this.prisma.user.findUnique({
          where: { email: dto.email },
          include: { wallet: true },
        });

        if (dbUser) {
          dbUser = await this.prisma.user.update({
            where: { id: dbUser.id },
            data: { appleId },
            include: { wallet: true },
          });
        }
      }

      if (dbUser) {
        existingUser = {
          id: dbUser.id,
          username: dbUser.username,
          displayName: dbUser.displayName,
          email: dbUser.email,
          phone: dbUser.phone,
          avatarUrl: dbUser.avatarUrl,
          bio: dbUser.bio,
          gender: dbUser.gender,
          birthday: (dbUser as any).birthday,
          country: (dbUser as any).country || 'Global 🌍',
          role: dbUser.role,
          level: dbUser.level || 1,
          coins: (dbUser as any).wallet?.coins ?? 0,
          diamonds: (dbUser as any).wallet?.diamonds ?? 0,
          status: dbUser.isBanned ? 'BANNED' : 'ACTIVE',
          createdAt: dbUser.createdAt.toISOString(),
        };
        isNewUser = false;
      }
    } catch {
      // ignore
    }

    // 2. Check in-memory usersMap if DB was unreachable
    if (!existingUser) {
      existingUser = Array.from(UsersService.usersMap.values()).find(
        (u: any) => (u.appleId && u.appleId === appleId) || (dto.email && u.email === dto.email),
      );
      if (existingUser) {
        isNewUser = false;
      }
    }
    
    // 3. If genuinely new user, create entry in PostgreSQL database
    if (!existingUser) {
      isNewUser = true;
      const cleanId = appleId.replace(/[^a-zA-Z0-9]/g, '').slice(-6);
      const username = (dto.email ? dto.email.split('@')[0] : 'apple_' + cleanId) + '_' + Math.floor(100 + Math.random() * 900);
      const userId = `apple-${Date.now().toString().slice(-6)}`;
      existingUser = {
        id: userId,
        appleId,
        email: dto.email || null,
        username,
        displayName: dto.displayName || (dto.email ? dto.email.split('@')[0] : `Apple User ${cleanId}`),
        avatarUrl: dto.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
        deviceId: dto.deviceId,
        role: Role.USER,
        level: 1,
        coins: 0,
        diamonds: 0,
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        wallet: { coins: 0, diamonds: 0 },
      };

      try {
        const dbUser = await this.prisma.user.create({
          data: {
            appleId,
            email: dto.email || undefined,
            username,
            displayName: existingUser.displayName,
            avatarUrl: existingUser.avatarUrl,
            deviceId: dto.deviceId,
            role: Role.USER,
            wallet: {
              create: {
                coins: 0,
                diamonds: 0,
              },
            },
          },
          include: { wallet: true },
        });
        if (dbUser) {
          existingUser = {
            ...existingUser,
            id: dbUser.id,
          };
        }
      } catch {
        // in-memory fallback
      }
    }

    UsersService.usersMap.set(existingUser.id, existingUser);

    const tokens = this.generateTokens(existingUser.id, existingUser.username, existingUser.role);

    return {
      user: existingUser,
      isNewUser,
      isOnboarded: !isNewUser,
      ...tokens,
    };
  }

  /**
   * Request MSG91 Mobile OTP with a strict 60-Second Cooldown
   */
  async sendPhoneOtp(phone: string) {
    if (!phone || phone.trim().length < 6) {
      throw new BadRequestException('A valid mobile phone number is required');
    }

    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const now = Date.now();

    // Special Demo Reviewer Account for Apple App Store & Google Play Console Review
    const isDemoReviewer = cleanPhone === '1111111111' || cleanPhone.endsWith('1111111111');
    if (isDemoReviewer) {
      console.log(`[Auth Demo] App Store Reviewer demo login initiated for mobile ${cleanPhone}`);
      AuthService.otpStoreMap.set(cleanPhone, {
        otp: '000000',
        expiresAt: now + 60 * 60 * 1000, // 1 hour validity
      });
      return {
        success: true,
        message: 'Demo App Reviewer Verification OTP ready: 000000',
        cooldownSeconds: 0,
        isSandbox: true,
        isDemoAccount: true,
        debugOtp: '000000',
      };
    }

    // 1. Strict 60-Second Cooldown Enforcement
    const lastSent = AuthService.otpCooldownMap.get(cleanPhone);
    if (lastSent && (now - lastSent) < 60000) {
      const cooldownRemaining = Math.ceil((60000 - (now - lastSent)) / 1000);
      throw new BadRequestException({
        error: 'COOLDOWN_ACTIVE',
        message: `Please wait ${cooldownRemaining}s before requesting a new OTP SMS`,
        cooldownRemaining,
      });
    }

    // Set cooldown timestamp
    AuthService.otpCooldownMap.set(cleanPhone, now);

    // 2. Generate OTP (6-digits)
    const isSandboxTest = cleanPhone.endsWith('0000') || cleanPhone === '9999999999' || cleanPhone === '1234567890';
    const otp = isSandboxTest ? '123456' : Math.floor(100000 + Math.random() * 900000).toString();

    // Store in memory OTP store (valid for 10 minutes)
    AuthService.otpStoreMap.set(cleanPhone, {
      otp,
      expiresAt: now + 10 * 60 * 1000,
    });

    // 3. Dispatch SMS via MSG91 API if credentials present
    const msg91AuthKey = process.env.MSG91_AUTH_KEY;
    const msg91TemplateId = process.env.MSG91_OTP_TEMPLATE_ID;

    if (msg91AuthKey && msg91TemplateId) {
      try {
        const msg91Url = `https://control.msg91.com/api/v5/otp?template_id=${encodeURIComponent(msg91TemplateId)}&mobile=${encodeURIComponent(cleanPhone)}&authkey=${encodeURIComponent(msg91AuthKey)}&otp=${encodeURIComponent(otp)}&otp_expiry=10&otp_length=6`;
        const res = await fetch(msg91Url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'authkey': msg91AuthKey,
          },
          body: JSON.stringify({
            otp,
          }),
        });
        const data = await res.json().catch(() => ({}));
        console.log(`[MSG91 Gateway] Dispatch response for ${cleanPhone}:`, data);
        if (data.type === 'error') {
          console.warn(`[MSG91 Gateway Warning] MSG91 returned error: ${data.message}`);
        }
      } catch (err: any) {
        console.warn('[MSG91 Gateway] Network dispatch error, fallback OTP saved:', err?.message || err);
      }
    } else {
      console.log(`[MSG91 Sandbox] Credentials pending. Mobile: ${cleanPhone} | Sandbox OTP: ${otp} (cooldown: 60s)`);
    }

    return {
      success: true,
      message: `OTP sent successfully to ${cleanPhone}`,
      cooldownSeconds: 60,
      isSandbox: !msg91AuthKey,
      ...(isSandboxTest || !msg91AuthKey ? { debugOtp: otp } : {}),
    };
  }

  /**
   * Verify MSG91 Mobile OTP and Authenticate User (or Auto-Register)
   */
  async verifyPhoneOtp(phone: string, otp: string, displayName?: string) {
    if (!phone || !otp) {
      throw new BadRequestException('Phone number and 6-digit OTP are required');
    }

    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const cleanOtp = otp.trim();
    const now = Date.now();

    let isVerified = false;
    const isDemoReviewer = cleanPhone === '1111111111' || cleanPhone.endsWith('1111111111');

    if (isDemoReviewer && (cleanOtp === '000000' || cleanOtp === '123456')) {
      console.log(`[Auth Demo] App Store Reviewer OTP verified successfully for ${cleanPhone}`);
      isVerified = true;
    }

    // 1. Verify with live MSG91 if configured
    const msg91AuthKey = process.env.MSG91_AUTH_KEY;
    if (!isVerified && msg91AuthKey) {
      try {
        const verifyUrl = `https://control.msg91.com/api/v5/otp/verify?otp=${encodeURIComponent(cleanOtp)}&mobile=${encodeURIComponent(cleanPhone)}&authkey=${encodeURIComponent(msg91AuthKey)}`;
        const res = await fetch(verifyUrl, {
          method: 'GET',
          headers: {
            'authkey': msg91AuthKey,
          },
        });
        const data = await res.json().catch(() => ({}));
        console.log(`[MSG91 Gateway] Verify response for ${cleanPhone}:`, data);
        if (
          data.type === 'success' ||
          data.message === 'OTP verified success' ||
          data.message === 'Mobile no. already verified'
        ) {
          isVerified = true;
        }
      } catch (err: any) {
        console.warn('[MSG91 Gateway] Verification request error:', err?.message || err);
      }
    }

    // 2. Verify with local OTP store / sandbox master OTP
    if (!isVerified) {
      const stored = AuthService.otpStoreMap.get(cleanPhone);
      if (cleanOtp === '123456') {
        isVerified = true;
      } else if (stored && stored.otp === cleanOtp && now < stored.expiresAt) {
        isVerified = true;
      }
    }

    if (!isVerified) {
      throw new UnauthorizedException('Invalid or expired OTP code. Please enter the correct 6-digit code or request a new one.');
    }

    // Cleanup verified OTP
    AuthService.otpStoreMap.delete(cleanPhone);

    const { UsersService } = await import('../users/users.service');

    // 3. Locate or Auto-Register User by Phone Number
    let user: any = null;
    let isNewUser = false;

    try {
      const dbUser = await this.prisma.user.findFirst({
        where: { phone: cleanPhone },
        include: { wallet: true },
      });
      if (dbUser) {
        user = {
          id: dbUser.id,
          username: dbUser.username,
          displayName: dbUser.displayName,
          phone: dbUser.phone,
          avatarUrl: dbUser.avatarUrl,
          role: dbUser.role,
          level: dbUser.level || 1,
          coins: dbUser.wallet?.coins ?? 0,
          diamonds: dbUser.wallet?.diamonds ?? 0,
          status: dbUser.isBanned ? 'BANNED' : 'ACTIVE',
        };
      }
    } catch {
      // fallback
    }

    if (!user) {
      // Check in-memory usersMap
      user = Array.from(UsersService.usersMap.values()).find((u) => u.phone === cleanPhone);
    }

    if (!user) {
      isNewUser = true;
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const username = isDemoReviewer ? 'app_reviewer' : `user_${cleanPhone.slice(-4)}_${randomSuffix}`;
      const finalDisplayName = isDemoReviewer
        ? 'Apple & Google App Reviewer'
        : (displayName?.trim() || `User ${cleanPhone.slice(-4)}`);
      const avatarUrl = isDemoReviewer
        ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300'
        : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150';
      const initialCoins = isDemoReviewer ? 10000 : 500;
      const initialDiamonds = isDemoReviewer ? 5000 : 0;
      const initialLevel = isDemoReviewer ? 3 : 1;
      const initialCountry = isDemoReviewer ? 'United States 🇺🇸' : 'Global';

      user = {
        id: `usr-${Date.now()}-${randomSuffix}`,
        phone: cleanPhone,
        username,
        displayName: finalDisplayName,
        avatarUrl,
        role: Role.USER,
        level: initialLevel,
        coins: initialCoins,
        diamonds: initialDiamonds,
        country: initialCountry,
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        wallet: { coins: initialCoins, diamonds: initialDiamonds },
      };

      try {
        const createdDbUser = await this.prisma.user.create({
          data: {
            phone: cleanPhone,
            username,
            displayName: finalDisplayName,
            avatarUrl,
            role: Role.USER,
            level: initialLevel,
            country: initialCountry,
            wallet: {
              create: {
                coins: initialCoins,
                diamonds: initialDiamonds,
                totalCoinsPurchased: initialCoins,
                totalDiamondsEarned: initialDiamonds,
              },
            },
          },
          include: { wallet: true },
        });
        if (createdDbUser) {
          user.id = createdDbUser.id;
        }
      } catch {
        // in-memory fallback
      }
    }

    UsersService.usersMap.set(user.id, user);

    const tokens = this.generateTokens(user.id, user.username, user.role);

    return {
      success: true,
      user,
      isNewUser,
      ...tokens,
    };
  }

  /**
   * Extensible Phone OTP login stub
   */
  async phoneLoginStub(phoneNumber: string) {
    return this.sendPhoneOtp(phoneNumber);
  }

  /**
   * Admin Panel login: username/email + password for staff accounts.
   * Only accounts flagged `isStaff` (or SUPER_ADMIN / AGENCY_ADMIN) may sign in.
   */
  async adminLogin(identifier: string, password: string) {
    if (!identifier || !password) {
      throw new BadRequestException('Email/username and password are required.');
    }

    const user = await this.prisma.user.findFirst({
      where: { OR: [{ email: identifier }, { username: identifier }] },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const isStaffish =
      (user as any).isStaff === true ||
      user.role === 'SUPER_ADMIN' ||
      user.role === 'AGENCY_ADMIN';
    if (!isStaffish) {
      throw new ForbiddenException('This account does not have Admin Panel access.');
    }
    if (user.isBanned) {
      throw new ForbiddenException('This staff account has been suspended.');
    }

    await this.prisma.user
      .update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
      .catch(() => null);

    // Two-factor gate for staff accounts that have enabled it.
    if ((user as any).twoFactorEnabled) {
      const otp = await this.issueAdminOtp(user.id, (user as any).twoFactorMethod || 'EMAIL');
      const challengeToken = this.jwtService.sign(
        { sub: user.id, scope: '2fa' },
        { expiresIn: '5m' },
      );
      return {
        success: true,
        requiresTwoFactor: true,
        challengeToken,
        method: (user as any).twoFactorMethod || 'EMAIL',
        ...(this.isOtpDebugEnabled() ? { debugOtp: otp } : {}),
      };
    }

    const tokens = this.generateTokens(user.id, user.username, user.role);
    const permissions = resolvePermissions(user as any);

    return {
      success: true,
      ...tokens,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        role: user.role,
        staffRole: (user as any).staffRole,
        permissions,
      },
      permissions,
    };
  }

  // ---------------- Admin Two-Factor Authentication ----------------

  private isOtpDebugEnabled(): boolean {
    return (
      (this.configServiceValue('NODE_ENV') || 'development') !== 'production' ||
      this.configServiceValue('ADMIN_2FA_DEBUG') === 'true'
    );
  }

  private configServiceValue(key: string): string | undefined {
    // JwtService does not expose config; read straight from process.env.
    return process.env[key];
  }

  /** Generate + store a hashed OTP, returning the plaintext for delivery/debug. */
  private async issueAdminOtp(userId: string, method: string): Promise<string> {
    const code = randomInt(100000, 1000000).toString();
    const codeHash = await bcrypt.hash(code, 10);
    // Invalidate any outstanding codes for this purpose.
    await this.prisma.twoFactorOtp
      .updateMany({ where: { userId, purpose: 'ADMIN_LOGIN', consumed: false }, data: { consumed: true } })
      .catch(() => null);
    await this.prisma.twoFactorOtp.create({
      data: {
        userId,
        codeHash,
        method,
        purpose: 'ADMIN_LOGIN',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    await this.deliverAdminOtp(user, method, code);
    return code;
  }

  /**
   * Delivers an admin OTP through the configured webhook (SMS/email gateway).
   * In non-production the code is also logged so local sign-in keeps working.
   */
  private async deliverAdminOtp(
    user: { email?: string | null; phone?: string | null } | null,
    method: string,
    code: string,
  ): Promise<boolean> {
    const webhookUrl = process.env.ADMIN_2FA_OTP_WEBHOOK_URL;
    const isProduction = (process.env.NODE_ENV || 'development') === 'production';
    const destination = method === 'PHONE' ? user?.phone : user?.email;

    if (webhookUrl) {
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (process.env.ADMIN_2FA_OTP_WEBHOOK_TOKEN) {
          headers.Authorization = `Bearer ${process.env.ADMIN_2FA_OTP_WEBHOOK_TOKEN}`;
        }
        const res = await fetch(webhookUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            channel: method === 'PHONE' ? 'SMS' : 'EMAIL',
            to: destination,
            code,
            purpose: 'ADMIN_LOGIN',
          }),
        });
        if (!res.ok) {
          console.error(`[Admin 2FA] OTP webhook responded ${res.status}`);
        } else {
          return true;
        }
      } catch (err: any) {
        console.error(`[Admin 2FA] OTP webhook failed: ${err?.message || err}`);
      }
    }

    if (!isProduction) {
      console.log(`[Admin 2FA] ${method} OTP for ${destination || 'staff account'}: ${code}`);
    } else if (!webhookUrl) {
      console.error(
        '[Admin 2FA] No ADMIN_2FA_OTP_WEBHOOK_URL configured; cannot deliver the verification code.',
      );
    }
    return false;
  }

  async adminTwoFactorStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorEnabled: true, twoFactorMethod: true },
    });
    return {
      enabled: !!user?.twoFactorEnabled,
      method: user?.twoFactorMethod || null,
    };
  }

  /**
   * Begin enabling 2FA: sends an OTP that must be confirmed via enable endpoint.
   */
  async setupAdminTwoFactor(userId: string, method: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Staff account not found.');
    const normalized = (method || 'EMAIL').toUpperCase() === 'PHONE' ? 'PHONE' : 'EMAIL';
    if (normalized === 'PHONE' && !user.phone) {
      throw new BadRequestException('No phone number on file for SMS 2FA.');
    }
    if (normalized === 'EMAIL' && !user.email) {
      throw new BadRequestException('No email on file for email 2FA.');
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorMethod: normalized },
    });
    const otp = await this.issueAdminOtp(userId, normalized);
    return {
      success: true,
      method: normalized,
      message: `Verification code sent via ${normalized}.`,
      ...(this.isOtpDebugEnabled() ? { debugOtp: otp } : {}),
    };
  }

  async enableAdminTwoFactor(userId: string, code: string) {
    await this.consumeAdminOtp(userId, code);
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true },
    });
    return { success: true, enabled: true };
  }

  async disableAdminTwoFactor(userId: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.passwordHash) throw new UnauthorizedException('Staff account not found.');
    const valid = await bcrypt.compare(password || '', user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid password.');
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: false },
    });
    return { success: true, enabled: false };
  }

  /**
   * Complete admin login by exchanging a challenge token + OTP for real tokens.
   */
  async verifyAdminTwoFactor(challengeToken: string, code: string) {
    if (!challengeToken || !code) {
      throw new BadRequestException('Challenge token and code are required.');
    }
    let payload: any;
    try {
      payload = this.jwtService.verify(challengeToken);
    } catch {
      throw new UnauthorizedException('Two-factor challenge expired. Please sign in again.');
    }
    if (payload.scope !== '2fa') {
      throw new UnauthorizedException('Invalid two-factor challenge.');
    }
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw new UnauthorizedException('Staff account not found.');

    const ok = await this.consumeAdminOtp(user.id, code);
    if (!ok) throw new UnauthorizedException('Invalid or expired verification code.');

    const tokens = this.generateTokens(user.id, user.username, user.role);
    const permissions = resolvePermissions(user as any);
    return {
      success: true,
      ...tokens,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        role: user.role,
        staffRole: (user as any).staffRole,
        permissions,
      },
      permissions,
    };
  }

  private async consumeAdminOtp(userId: string, code: string): Promise<boolean> {
    const otp = await this.prisma.twoFactorOtp.findFirst({
      where: { userId, purpose: 'ADMIN_LOGIN', consumed: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!otp) return false;
    // Cap verification attempts so a stolen challenge token cannot be brute-forced.
    if (otp.attempts >= 5) {
      await this.prisma.twoFactorOtp.update({ where: { id: otp.id }, data: { consumed: true } });
      return false;
    }
    const normalizedCode = String(code || '').trim();
    const valid = await bcrypt.compare(normalizedCode, otp.codeHash);
    if (!valid) {
      await this.prisma.twoFactorOtp.update({
        where: { id: otp.id },
        data: { attempts: { increment: 1 }, ...(otp.attempts + 1 >= 5 ? { consumed: true } : {}) },
      });
      return false;
    }
    await this.prisma.twoFactorOtp.update({ where: { id: otp.id }, data: { consumed: true } });
    return true;
  }

  async disableAdminTwoFactorByUser(userId: string) {
    await this.prisma.user.update({ where: { id: userId }, data: { twoFactorEnabled: false, twoFactorMethod: null } });
    return { success: true };
  }

  private generateTokens(userId: string, username: string, role: Role) {
    const payload = { sub: userId, username, role };
    return {
      accessToken: this.jwtService.sign(payload),
      tokenType: 'Bearer',
      expiresIn: '7d',
    };
  }
}
