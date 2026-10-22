import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../../prisma/prisma.service';
import { PUBLIC_KEY } from '../permissions.decorator';

/**
 * Verifies a normal (mobile/user) JWT and attaches the user to `req.user`.
 * Used to protect user-facing endpoints that previously accepted raw IDs.
 *
 * Routes explicitly marked with `@Public()` bypass this guard.
 */
@Injectable()
export class UserAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest();
    const header = req.headers['authorization'] || req.headers['Authorization'];
    const token =
      typeof header === 'string' && header.startsWith('Bearer ')
        ? header.slice(7)
        : req.query?.token || req.query?.access_token;

    if (!token) {
      throw new UnauthorizedException('Authentication required. Please sign in again.');
    }

    let payload: any;
    try {
      payload = this.jwtService.verify(token);
    } catch {
      throw new UnauthorizedException('Your session has expired. Please sign in again.');
    }
    if (!payload?.sub) {
      throw new UnauthorizedException('Invalid session token.');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      throw new UnauthorizedException('Account not found.');
    }
    if ((user as any).isBanned) {
      throw new ForbiddenException('This account has been suspended.');
    }

    // Temporary suspensions are persisted; honour the expiry instead of
    // keeping the account locked forever.
    const status = String((user as any).status || 'ACTIVE');
    if (status.startsWith('SUSPENDED_')) {
      const until = (user as any).suspensionUntil
        ? new Date((user as any).suspensionUntil).getTime()
        : 0;
      if (!until || until > Date.now()) {
        throw new ForbiddenException(
          (user as any).suspensionReason || 'This account is temporarily suspended.',
        );
      }
      await this.prisma.user
        .update({
          where: { id: user.id },
          data: { status: 'ACTIVE', suspensionUntil: null, suspensionReason: null },
        })
        .catch(() => null);
    }

    req.user = user;
    return true;
  }
}
