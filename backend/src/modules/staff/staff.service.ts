import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStaffDto, UpdateStaffDto } from './dto/staff.dto';
import {
  PERMISSION_CATALOG,
  ROLE_PERMISSION_PRESETS,
  STAFF_ROLES,
  resolvePermissions,
} from '../auth/permissions';

@Injectable()
export class StaffService implements OnModuleInit {
  private readonly logger = new Logger(StaffService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.bootstrapSuperAdmin();
  }

  /**
   * Ensure a default super-admin exists so the Admin Panel can always be accessed.
   * Credentials come from env (ADMIN_EMAIL / ADMIN_PASSWORD) with safe defaults.
   */
  async bootstrapSuperAdmin() {
    try {
      const existing = await this.prisma.user.findFirst({
        where: { OR: [{ role: 'SUPER_ADMIN' }, { staffRole: 'SUPER_ADMIN' as any }] },
      });
      if (existing) return;

      const email = process.env.ADMIN_EMAIL || 'admin@live2030.com';
      const password = process.env.ADMIN_PASSWORD || 'Admin@2026';
      const username = process.env.ADMIN_USERNAME || 'superadmin';

      const clash = await this.prisma.user.findFirst({
        where: { OR: [{ email }, { username }] },
      });
      if (clash) {
        // Promote the existing account to super admin
        await this.prisma.user.update({
          where: { id: clash.id },
          data: {
            isStaff: true,
            staffRole: 'SUPER_ADMIN' as any,
            role: 'SUPER_ADMIN',
            passwordHash: await bcrypt.hash(password, 10),
          },
        });
        this.logger.log(`👑 Promoted existing account '${clash.username}' to SUPER_ADMIN.`);
        return;
      }

      await this.prisma.user.create({
        data: {
          username,
          email,
          displayName: 'Super Admin',
          passwordHash: await bcrypt.hash(password, 10),
          isStaff: true,
          staffRole: 'SUPER_ADMIN' as any,
          role: 'SUPER_ADMIN',
          permissions: [],
        },
      });
      this.logger.log(
        `👑 Seeded default Super Admin account (${email}). Change ADMIN_PASSWORD in production!`,
      );
    } catch (err: any) {
      this.logger.warn(`Could not bootstrap super admin: ${err.message}`);
    }
  }

  getCatalog() {
    return {
      permissions: PERMISSION_CATALOG,
      roles: STAFF_ROLES,
      presets: ROLE_PERMISSION_PRESETS,
    };
  }

  private shapeStaff(u: any) {
    return {
      id: u.id,
      username: u.username,
      email: u.email,
      displayName: u.displayName,
      avatarUrl: u.avatarUrl,
      role: u.role,
      staffRole: u.staffRole,
      permissions: u.permissions || [],
      effectivePermissions: resolvePermissions(u),
      isActive: !u.isBanned,
      lastLoginAt: u.lastLoginAt,
      createdAt: u.createdAt,
    };
  }

  async listStaff() {
    const users = await this.prisma.user.findMany({
      where: {
        OR: [
          { isStaff: true },
          { role: 'SUPER_ADMIN' },
          { role: 'AGENCY_ADMIN' },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });
    return users.map((u) => this.shapeStaff(u));
  }

  async createStaff(dto: CreateStaffDto) {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ username: dto.username }, ...(dto.email ? [{ email: dto.email }] : [])] },
    });
    if (existing) {
      throw new BadRequestException('A user with that username or email already exists.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const created = await this.prisma.user.create({
      data: {
        username: dto.username,
        email: dto.email || undefined,
        displayName: dto.displayName || dto.username,
        passwordHash,
        isStaff: true,
        staffRole: dto.staffRole as any,
        role: (dto.staffRole === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'USER') as any,
        permissions: dto.permissions || [],
      },
    });
    return { success: true, message: 'Staff account created.', staff: this.shapeStaff(created) };
  }

  async updateStaff(id: string, dto: UpdateStaffDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Staff account not found.');

    const data: any = {};
    if (dto.displayName !== undefined) data.displayName = dto.displayName;
    if (dto.email !== undefined) data.email = dto.email || null;
    if (dto.staffRole !== undefined) {
      data.staffRole = dto.staffRole;
      data.role = dto.staffRole === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'USER';
    }
    if (dto.permissions !== undefined) data.permissions = dto.permissions;
    if (dto.isActive !== undefined) data.isBanned = !dto.isActive;
    if (dto.password) data.passwordHash = await bcrypt.hash(dto.password, 10);

    const updated = await this.prisma.user.update({ where: { id }, data });
    return { success: true, message: 'Staff account updated.', staff: this.shapeStaff(updated) };
  }

  async deleteStaff(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Staff account not found.');
    await this.prisma.user.update({
      where: { id },
      data: { isStaff: false, staffRole: null, permissions: [], role: 'USER' },
    });
    return { success: true, message: 'Staff access revoked.' };
  }
}
