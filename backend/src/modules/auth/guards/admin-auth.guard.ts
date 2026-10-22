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
import { PERMISSIONS_KEY, PUBLIC_KEY } from '../permissions.decorator';
import { hasAllPermissions, resolvePermissions } from '../permissions';

/**
 * Global guard that enforces staff RBAC.
 *
 * - Routes with no `@RequirePermissions` (and not marked otherwise) are public.
 * - Routes with `@RequirePermissions(...)` require a valid admin JWT whose user
 *   is a staff account (isStaff / SUPER_ADMIN / AGENCY_ADMIN) holding the keys.
 * - Attaches the authenticated staff user to `req.user` (+ `req.staff`).
 */
@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required =
      this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) || [];

    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const req: any = context.switchToHttp().getRequest();

    // Safety net: any route that lives under an administrative path must be
    // called by a staff account even when it forgot its @RequirePermissions
    // decorator. Public mobile APIs keep working because they are not routed
    // through an `/admin` path segment.
    const path = String(req.path || req.originalUrl || '');
    const pathImpliesStaff =
      /(^|\/)admin(\/|$)/.test(path) || /(^|\/)staff(\/|$)/.test(path);

    // No permission requirement → public route (mobile/user APIs).
    if (required.length === 0 && !pathImpliesStaff) return true;

    if (isPublic) return true;
    const authHeader: string = req.headers['authorization'] || req.headers['Authorization'] || '';
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : (req.query?.admin_token as string) || '';

    if (!token) {
      throw new UnauthorizedException('Admin authentication required.');
    }

    let payload: any;
    try {
      payload = await this.jwtService.verifyAsync(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired admin session. Please sign in again.');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      throw new UnauthorizedException('Staff account not found.');
    }
    const isStaffish =
      (user as any).isStaff === true ||
      user.role === 'SUPER_ADMIN' ||
      user.role === 'AGENCY_ADMIN';
    if (!isStaffish) {
      throw new ForbiddenException('This account does not have Admin Panel access.');
    }
    if ((user as any).isBanned) {
      throw new ForbiddenException('This staff account has been suspended.');
    }

    const effective = resolvePermissions(user as any);
    if (required.length > 0 && !hasAllPermissions(effective, required)) {
      throw new ForbiddenException('Insufficient permissions for this action.');
    }

    req.user = user;
    req.staff = { ...user, permissions: effective };
    return true;
  }
}
