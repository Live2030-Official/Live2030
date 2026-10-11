import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * Verifies a normal (mobile/user) JWT and attaches the user to `req.user`.
 * Used to protect user-facing endpoints that previously accepted raw IDs.
 */
@Injectable()
export class UserAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
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

    req.user = user;
    return true;
  }
}
