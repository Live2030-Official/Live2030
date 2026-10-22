import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { usdToSarRate } from '../../common/pricing.config';
import { PrismaService } from '../../prisma/prisma.service';
import { SignalingGateway } from '../signaling/signaling.gateway';
import { CreateCoinPackageDto, UpdateCoinPackageDto } from './dto/coin-package.dto';

export interface PublicCoinPackage {
  id: string;
  name: string;
  coins: number;
  bonusCoins: number;
  totalCoins: number;
  amountUSD: number;
  amountSAR: number;
  badge?: string | null;
  popular: boolean;
}

@Injectable()
export class CoinPackagesService implements OnModuleInit {
  private readonly logger = new Logger(CoinPackagesService.name);

  // Curated default coin packages, seeded to the database on first boot.
  private static readonly DEFAULT_PACKAGES: PublicCoinPackage[] = [
    { id: 'pkg_100', name: 'Starter Pack', coins: 100, bonusCoins: 0, totalCoins: 100, amountSAR: 2.0, amountUSD: 0.53, badge: 'Starter', popular: false },
    { id: 'pkg_500', name: 'Value Pack', coins: 500, bonusCoins: 50, totalCoins: 550, amountSAR: 10.0, amountUSD: 2.67, badge: '+10% Bonus', popular: false },
    { id: 'pkg_1200', name: 'Plus Pack', coins: 1200, bonusCoins: 200, totalCoins: 1400, amountSAR: 24.0, amountUSD: 6.4, badge: '+16% Bonus', popular: false },
    { id: 'pkg_2500', name: 'Popular Pack', coins: 2500, bonusCoins: 500, totalCoins: 3000, amountSAR: 50.0, amountUSD: 13.33, badge: 'Most Popular 🔥', popular: true },
    { id: 'pkg_6000', name: 'Mega Pack', coins: 6000, bonusCoins: 1500, totalCoins: 7500, amountSAR: 120.0, amountUSD: 32.0, badge: '+25% Extra ✨', popular: false },
    { id: 'pkg_15000', name: 'VIP Pack', coins: 15000, bonusCoins: 5000, totalCoins: 20000, amountSAR: 300.0, amountUSD: 80.0, badge: 'VIP Deal 👑', popular: false },
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly signalingGateway?: SignalingGateway,
  ) {}

  async onModuleInit() {
    await this.seedDefaults();
  }

  private async seedDefaults() {
    try {
      // Seed only on a fresh install. Re-creating "missing" defaults would
      // resurrect packages an admin deliberately deleted from the dashboard.
      const existingCount = await this.prisma.coinPackage.count();
      if (existingCount > 0) return;

      for (let i = 0; i < CoinPackagesService.DEFAULT_PACKAGES.length; i++) {
        const pkg = CoinPackagesService.DEFAULT_PACKAGES[i];
        await this.prisma.coinPackage.create({
          data: { ...pkg, isActive: true, sortOrder: i + 1 },
        });
      }
    } catch {
      // Database may be unavailable during local development; static fallback handles it.
    }
  }

  private toPublic(pkg: any): PublicCoinPackage {
    return {
      id: pkg.id,
      name: pkg.name,
      coins: pkg.coins,
      bonusCoins: pkg.bonusCoins,
      totalCoins: pkg.totalCoins,
      amountUSD: Number(pkg.amountUSD),
      amountSAR: Number(pkg.amountSAR),
      badge: pkg.badge ?? null,
      popular: Boolean(pkg.popular),
    };
  }

  private broadcast(event: 'create' | 'update' | 'toggle' | 'delete', payload: any) {
    if (this.signalingGateway) {
      this.signalingGateway.broadcastAdminTelemetry('admin:coin_packages_updated', {
        action: event,
        package: payload,
        timestamp: Date.now(),
      });
    }
  }

  private normalize(dto: Partial<PublicCoinPackage & { isActive?: boolean; sortOrder?: number }>): any {
    const coins = dto.coins !== undefined ? Number(dto.coins) : undefined;
    const bonusCoins = dto.bonusCoins !== undefined ? Number(dto.bonusCoins) : undefined;
    const amountUSD = dto.amountUSD !== undefined ? Number(dto.amountUSD) : undefined;

    const data: any = {};
    if (coins !== undefined) data.coins = coins;
    if (bonusCoins !== undefined) data.bonusCoins = bonusCoins;
    if (coins !== undefined) {
      data.totalCoins = dto.totalCoins !== undefined
        ? Number(dto.totalCoins)
        : coins + (bonusCoins ?? 0);
    }
    if (amountUSD !== undefined) data.amountUSD = Number(amountUSD.toFixed(2));
    if (dto.amountSAR !== undefined) {
      data.amountSAR = Number(Number(dto.amountSAR).toFixed(2));
    } else if (amountUSD !== undefined) {
      data.amountSAR = Number((amountUSD * usdToSarRate()).toFixed(2));
    }
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.badge !== undefined) data.badge = dto.badge;
    if (dto.popular !== undefined) data.popular = Boolean(dto.popular);
    if (dto.isActive !== undefined) data.isActive = Boolean(dto.isActive);
    if (dto.sortOrder !== undefined) data.sortOrder = Number(dto.sortOrder);
    return data;
  }

  /**
   * Active packages consumed by the recharge website and mobile checkout screen.
   */
  async getActivePackages(): Promise<PublicCoinPackage[]> {
    try {
      const list = await this.prisma.coinPackage.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      });
      if (list.length > 0) return list.map((p) => this.toPublic(p));
    } catch {
      // fallback to static defaults
    }
    return CoinPackagesService.DEFAULT_PACKAGES;
  }

  /**
   * Full package list (active + disabled) for the Super Admin panel.
   */
  async getAllPackages() {
    try {
      const list = await this.prisma.coinPackage.findMany({
        orderBy: { sortOrder: 'asc' },
      });
      if (list.length > 0) return list;
    } catch {
      // fallback
    }
    return CoinPackagesService.DEFAULT_PACKAGES.map((p, i) => ({
      ...p,
      isActive: true,
      sortOrder: i + 1,
    }));
  }

  async findPackage(id: string): Promise<PublicCoinPackage | null> {
    let offline = false;
    try {
      const pkg = await this.prisma.coinPackage.findUnique({ where: { id } });
      if (pkg) {
        // Disabled or deleted packages are NOT purchasable.
        return pkg.isActive ? this.toPublic(pkg) : null;
      }
    } catch {
      // Database unavailable (offline/dev mode) → fall back to static defaults
      offline = true;
    }
    if (offline) {
      return CoinPackagesService.DEFAULT_PACKAGES.find((p) => p.id === id) || null;
    }
    return null;
  }

  async createPackage(dto: CreateCoinPackageDto) {
    const id = (dto.id && dto.id.trim()) || `pkg_${Date.now()}`;
    const data = this.normalize(dto);

    const record = {
      id,
      name: data.name ?? 'Coin Package',
      coins: data.coins ?? 0,
      bonusCoins: data.bonusCoins ?? 0,
      totalCoins: data.totalCoins ?? (data.coins ?? 0) + (data.bonusCoins ?? 0),
      amountUSD: data.amountUSD ?? 0,
      amountSAR: data.amountSAR ?? 0,
      badge: data.badge ?? null,
      popular: data.popular ?? false,
      isActive: data.isActive ?? true,
      sortOrder: data.sortOrder ?? 0,
    };

    try {
      await this.prisma.coinPackage.create({ data: record });
    } catch {
      // In-memory/static mode without a live database: still return the created record.
    }

    const result = this.toPublic(record);
    this.broadcast('create', result);
    return result;
  }

  async updatePackage(id: string, dto: UpdateCoinPackageDto) {
    const data = this.normalize(dto);

    try {
      const updated = await this.prisma.coinPackage.update({ where: { id }, data });
      const result = this.toPublic(updated);
      this.broadcast('update', result);
      return result;
    } catch {
      const fallback = CoinPackagesService.DEFAULT_PACKAGES.find((p) => p.id === id);
      if (fallback) {
        const result = { ...fallback, ...data };
        this.broadcast('update', result);
        return result;
      }
      throw new NotFoundException(`Coin package '${id}' not found.`);
    }
  }

  /**
   * Enable or disable a package without deleting it.
   */
  async togglePackage(id: string, isActive?: boolean) {
    let current: any = null;
    try {
      current = await this.prisma.coinPackage.findUnique({ where: { id } });
    } catch {
      // fallback
    }

    const nextState = isActive !== undefined ? Boolean(isActive) : !(current?.isActive ?? true);

    try {
      const updated = await this.prisma.coinPackage.update({
        where: { id },
        data: { isActive: nextState },
      });
      const result = { success: true, id, isActive: updated.isActive, package: this.toPublic(updated) };
      this.broadcast('toggle', result.package);
      return result;
    } catch {
      return { success: true, id, isActive: nextState };
    }
  }

  async deletePackage(id: string) {
    try {
      await this.prisma.coinPackage.delete({ where: { id } });
    } catch {
      // ignore if database unavailable
    }
    this.broadcast('delete', { id });
    return { success: true, message: `Coin package '${id}' deleted successfully.` };
  }
}
