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
 * Protects agency-scoped endpoints. Accepts either:
 *  - an agency session JWT (signed at agency login, `type: 'agency'`), which
 *    must match the `:id` route param, or
 *  - a valid staff/admin JWT (SUPER_ADMIN / AGENCY_ADMIN / isStaff) so the
 *    admin dashboard can inspect any agency.
 */
@Injectable()
export class AgencyAuthGuard implements CanActivate {
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
        : req.query?.token || req.query?.agency_token;

    if (!token) {
      throw new UnauthorizedException('Agency authentication required. Please sign in again.');
    }

    let payload: any;
    try {
      payload = this.jwtService.verify(token);
    } catch {
      throw new UnauthorizedException('Your agency session has expired. Please sign in again.');
    }

    const paramId = req.params?.id || req.params?.agencyId;

    // 1. Agency session token
    if (payload?.type === 'agency' && payload?.agencyId) {
      if (paramId && String(paramId) !== String(payload.agencyId)) {
        throw new ForbiddenException('You are not authorized to access this agency.');
      }
      req.agencyId = payload.agencyId;
      req.agency = { id: payload.agencyId, code: payload.code };
      return true;
    }

    // 2. Staff / admin token fallback (dashboard access)
    if (payload?.sub) {
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      const isStaffish =
        user &&
        ((user as any).isStaff === true ||
          user.role === 'SUPER_ADMIN' ||
          user.role === 'AGENCY_ADMIN');
      if (isStaffish) {
        if ((user as any).isBanned) {
          throw new ForbiddenException('This staff account has been suspended.');
        }
        req.user = user;
        return true;
      }
    }

    throw new UnauthorizedException('Invalid agency or staff session.');
  }
}
