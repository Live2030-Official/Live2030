import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AgenciesService } from '../agencies/agencies.service';

const VENDORS_KEY = 'coin_resellers';

@Injectable()
export class ResellersService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => AgenciesService))
    private readonly agenciesService?: AgenciesService,
  ) {}

  /** Persisted admin-created vendors (stored as JSON in SystemSetting). */
  private async loadVendors(): Promise<any[]> {
    try {
      const setting = await this.prisma.systemSetting.findUnique({ where: { key: VENDORS_KEY } });
      if (setting?.value) return JSON.parse(setting.value);
    } catch {
      // ignore
    }
    return [];
  }

  private async saveVendors(vendors: any[]): Promise<void> {
    try {
      await this.prisma.systemSetting.upsert({
        where: { key: VENDORS_KEY },
        create: { key: VENDORS_KEY, value: JSON.stringify(vendors) },
        update: { value: JSON.stringify(vendors) },
      });
    } catch {
      // best-effort persistence
    }
  }

  /**
   * Get list of verified coin vendors for the in-app recharge directory.
   * Dynamic: registered agencies with live coin balance + admin vendors from DB.
   */
  async getVerifiedResellers() {
    let agencyMerchants: any[] = [];
    try {
      if (this.agenciesService) {
        const agencies = await this.agenciesService.getAgencies();
        agencyMerchants = (agencies || []).map((a: any) => ({
          id: a.id,
          businessName: a.name,
          whatsappNumber: a.whatsappNumber || '+91 98765 43210',
          whatsappUrl: `https://wa.me/${(a.whatsappNumber || '').replace(/[^0-9]/g, '')}?text=Hello%20I%20want%20to%20buy%20coins%20for%20Live%202030`,
          coinStock: a.coinBalance ?? a.coins ?? 0,
          region: a.region || 'Global',
          badgeTitle: 'Agency Recharge Partner',
          isVerified: true,
          isActive: true,
        }));
      }
    } catch {
      // ignore
    }

    let dbVendors: any[] = [];
    try {
      const list = await this.prisma.coinReseller.findMany({ where: { isActive: true } });
      dbVendors = list;
    } catch {
      // ignore
    }

    const persistedVendors = await this.loadVendors();

    const combined = [...agencyMerchants, ...dbVendors, ...persistedVendors];
    const seen = new Set<string>();
    const deduped: any[] = [];
    for (const v of combined) {
      if (!v || !v.id) continue;
      if (seen.has(v.id)) continue;
      if (v.isActive === false) continue;
      seen.add(v.id);
      deduped.push(v);
    }
    return deduped;
  }

  /** Create a new coin vendor (Admin). */
  async createReseller(dto: any) {
    const cleanNumber = (dto.whatsappNumber || '').replace(/[^0-9]/g, '');
    const newVendor = {
      id: `reseller-${Date.now()}`,
      businessName: dto.businessName || 'Authorized Coin Vendor',
      whatsappNumber: dto.whatsappNumber || '+1 555 000 0000',
      whatsappUrl: `https://wa.me/${cleanNumber}?text=Hello%20I%20want%20to%20buy%20coins%20for%20Live%202030`,
      coinStock: Number(dto.coinStock) || 1000000,
      region: dto.region || 'Global',
      badgeTitle: dto.badgeTitle || 'Authorized Vendor',
      isVerified: true,
      isActive: true,
    };

    const vendors = await this.loadVendors();
    vendors.push(newVendor);
    await this.saveVendors(vendors);
    return newVendor;
  }

  /** Update a vendor (Admin). */
  async updateReseller(id: string, dto: any) {
    const vendors = await this.loadVendors();
    const index = vendors.findIndex((v) => v.id === id);
    if (index === -1) return null;
    const v = vendors[index];
    const cleanNumber = (dto.whatsappNumber || v.whatsappNumber).replace(/[^0-9]/g, '');
    vendors[index] = {
      ...v,
      ...dto,
      whatsappUrl: `https://wa.me/${cleanNumber}?text=Hello%20I%20want%20to%20buy%20coins%20for%20Live%202030`,
      coinStock: dto.coinStock !== undefined ? Number(dto.coinStock) : v.coinStock,
    };
    await this.saveVendors(vendors);
    return vendors[index];
  }

  /** Delete a vendor (Admin). */
  async deleteReseller(id: string) {
    const vendors = await this.loadVendors();
    const next = vendors.filter((v) => v.id !== id);
    await this.saveVendors(next);
    return { success: true, id };
  }

  /** Top up vendor coin inventory (Admin). */
  async topUpStock(id: string, amount: number) {
    const vendors = await this.loadVendors();
    const index = vendors.findIndex((v) => v.id === id);
    if (index === -1) return null;
    vendors[index].coinStock = Number(vendors[index].coinStock || 0) + (Number(amount) || 0);
    await this.saveVendors(vendors);
    return vendors[index];
  }
}
