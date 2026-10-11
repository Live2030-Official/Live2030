import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SignalingGateway } from '../signaling/signaling.gateway';
import { UpdateSupportContactDto } from './dto/support.dto';

export interface SupportContactData {
  whatsappNumber: string;
  helplineEmail: string;
  helplinePhone: string;
  operatingHours: string;
  announcement: string;
  updatedAt: string;
}

const CONTACT_KEY = 'support_contact';

const DEFAULT_CONTACT: SupportContactData = {
  whatsappNumber: '+91 98765 43210',
  helplineEmail: 'support@live2030.com',
  helplinePhone: '+1 800 555 0199',
  operatingHours: '24/7 Global Live Support',
  announcement:
    'Official Live 2030 Help Center & Appeal Desk. Contact our support team for account appeals, payment inquiries, or streaming issues.',
  updatedAt: new Date().toISOString(),
};

@Injectable()
export class SupportService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => SignalingGateway))
    private readonly signalingGateway?: SignalingGateway,
  ) {}

  /** Public contact details (persisted; falls back to defaults). */
  async getContactDetails(): Promise<SupportContactData> {
    try {
      const setting = await this.prisma.systemSetting.findUnique({ where: { key: CONTACT_KEY } });
      if (setting?.value) {
        return { ...DEFAULT_CONTACT, ...JSON.parse(setting.value) };
      }
    } catch {
      // fall through to defaults
    }
    return { ...DEFAULT_CONTACT };
  }

  /** Admin: persist updated contact details and broadcast live. */
  async updateContactDetails(dto: UpdateSupportContactDto): Promise<SupportContactData> {
    const current = await this.getContactDetails();
    const updated: SupportContactData = {
      whatsappNumber: dto.whatsappNumber?.trim() || current.whatsappNumber,
      helplineEmail: dto.helplineEmail?.trim() || current.helplineEmail,
      helplinePhone: dto.helplinePhone?.trim() || current.helplinePhone,
      operatingHours: dto.operatingHours?.trim() || current.operatingHours,
      announcement: dto.announcement?.trim() || current.announcement,
      updatedAt: new Date().toISOString(),
    };

    try {
      await this.prisma.systemSetting.upsert({
        where: { key: CONTACT_KEY },
        create: { key: CONTACT_KEY, value: JSON.stringify(updated) },
        update: { value: JSON.stringify(updated) },
      });
    } catch {
      // best-effort persistence
    }

    this.signalingGateway?.broadcastAdminTelemetry('admin:support_contact_updated', updated);
    return updated;
  }
}
