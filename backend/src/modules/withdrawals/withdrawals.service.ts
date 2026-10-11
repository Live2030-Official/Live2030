import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  RequestWithdrawalDto,
  ReviewWithdrawalDto,
  ApproveWithdrawalDto,
} from './dto/withdrawal.dto';
import { WithdrawalStatus } from '@prisma/client';

@Injectable()
export class WithdrawalsService {
  private readonly MIN_WITHDRAWAL_DIAMONDS = 10000;
  private readonly DIAMONDS_PER_USD = 100;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Submit a withdrawal request. Atomically HOLDs the diamonds (decrements wallet)
   * and records a WITHDRAWAL_HOLD ledger entry so funds cannot be double-spent.
   */
  async requestWithdrawal(dto: RequestWithdrawalDto) {
    if (!dto.userId) {
      throw new BadRequestException('userId is required.');
    }
    if (!dto.amountDiamonds || dto.amountDiamonds < this.MIN_WITHDRAWAL_DIAMONDS) {
      throw new BadRequestException(
        `Minimum withdrawal amount is ${this.MIN_WITHDRAWAL_DIAMONDS.toLocaleString()} diamonds ($${(this.MIN_WITHDRAWAL_DIAMONDS / this.DIAMONDS_PER_USD).toFixed(2)} USD)`,
      );
    }

    const amountUSD = parseFloat((dto.amountDiamonds / this.DIAMONDS_PER_USD).toFixed(2));
    const accountDetailsStr = JSON.stringify(dto.accountDetails || {});

    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user) {
      throw new NotFoundException(`User ${dto.userId} not found.`);
    }

    const wallet = await this.prisma.wallet.findUnique({ where: { userId: dto.userId } });
    if (!wallet || wallet.diamonds < dto.amountDiamonds) {
      throw new BadRequestException(
        `Insufficient diamonds. Available: ${(wallet?.diamonds ?? 0).toLocaleString()} 💎, requested: ${dto.amountDiamonds.toLocaleString()} 💎.`,
      );
    }

    // Agency attribution if the host is bound to an agency
    let agencyId: string | null = null;
    try {
      const binding = await this.prisma.hostBinding.findUnique({ where: { hostId: dto.userId } });
      if (binding && binding.status === 'APPROVED') agencyId = binding.agencyId;
    } catch {}

    const withdrawal = await this.prisma.$transaction(async (tx) => {
      await tx.wallet.update({
        where: { userId: dto.userId },
        data: { diamonds: { decrement: dto.amountDiamonds } },
      });

      const created = await tx.withdrawal.create({
        data: {
          userId: dto.userId!,
          agencyId,
          amountDiamonds: dto.amountDiamonds,
          amountUSD,
          paymentMethod: dto.paymentMethod,
          accountDetails: accountDetailsStr,
          status: WithdrawalStatus.PENDING,
        },
      });

      await tx.transactionLedger.create({
        data: {
          type: 'WITHDRAWAL_HOLD' as any,
          senderId: dto.userId,
          agencyId: agencyId || undefined,
          diamondsCredited: 0,
          coinsDebited: 0,
          amountUSD,
          notes: `Withdrawal hold #${created.id} — ${dto.amountDiamonds} 💎 @ $${this.DIAMONDS_PER_USD}/USD`,
          idempotencyKey: `WITHDRAWAL_HOLD:${created.id}`,
        },
      });

      return created;
    });

    return {
      success: true,
      message: 'Withdrawal request submitted successfully for compliance review.',
      data: { withdrawal },
    };
  }

  async getPendingWithdrawals() {
    return this.prisma.withdrawal.findMany({
      where: { status: WithdrawalStatus.PENDING },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAllWithdrawals(status?: string) {
    const where = status ? { status: status as WithdrawalStatus } : undefined;
    return this.prisma.withdrawal.findMany({
      where,
      include: {
        user: {
          select: { id: true, username: true, displayName: true, avatarUrl: true, role: true },
        },
        agency: { select: { id: true, name: true, code: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 300,
    });
  }

  /**
   * Approve a pending withdrawal and mark it paid out (with optional payout reference).
   * Records a WITHDRAWAL_PAYOUT ledger entry. Diamonds were already held at request time.
   */
  async approveWithdrawal(id: string, dto?: ApproveWithdrawalDto) {
    const withdrawal = await this.prisma.withdrawal.findUnique({ where: { id } });
    if (!withdrawal) {
      throw new NotFoundException(`Withdrawal ${id} not found.`);
    }
    if (withdrawal.status === WithdrawalStatus.APPROVED) {
      return { success: true, message: 'Withdrawal already approved.', withdrawal };
    }
    if (withdrawal.status !== WithdrawalStatus.PENDING) {
      throw new BadRequestException(`Cannot approve a ${withdrawal.status} withdrawal.`);
    }

    const payoutReference =
      dto?.payoutReference || `PAYOUT-${Date.now().toString(36).toUpperCase()}`;

    const updated = await this.prisma.$transaction(async (tx) => {
      const w = await tx.withdrawal.update({
        where: { id },
        data: {
          status: WithdrawalStatus.APPROVED,
          reviewedAt: new Date(),
          payoutReference,
        },
      });

      await tx.transactionLedger.create({
        data: {
          type: 'WITHDRAWAL_PAYOUT' as any,
          senderId: withdrawal.userId,
          agencyId: withdrawal.agencyId || undefined,
          amountUSD: withdrawal.amountUSD,
          notes: `Withdrawal payout #${id} (${withdrawal.paymentMethod}) ref=${payoutReference}`,
          idempotencyKey: `WITHDRAWAL_PAYOUT:${id}`,
        },
      });

      return w;
    });

    return {
      success: true,
      message: `Withdrawal approved and marked paid (ref ${payoutReference}).`,
      withdrawal: updated,
    };
  }

  /**
   * Reject a pending withdrawal and REFUND the held diamonds back to the host wallet.
   * Records a WITHDRAWAL_REFUND ledger entry. Idempotent per withdrawal.
   */
  async rejectWithdrawal(id: string, dto: ReviewWithdrawalDto) {
    const withdrawal = await this.prisma.withdrawal.findUnique({ where: { id } });
    if (!withdrawal) {
      throw new NotFoundException(`Withdrawal ${id} not found.`);
    }
    if (withdrawal.status === WithdrawalStatus.REJECTED) {
      return { success: true, message: 'Withdrawal already rejected.', withdrawal };
    }
    if (withdrawal.status !== WithdrawalStatus.PENDING) {
      throw new BadRequestException(`Cannot reject a ${withdrawal.status} withdrawal.`);
    }

    const reason = dto.rejectionReason || 'Compliance review failed';

    const updated = await this.prisma.$transaction(async (tx) => {
      const w = await tx.withdrawal.update({
        where: { id },
        data: {
          status: WithdrawalStatus.REJECTED,
          rejectionReason: reason,
          reviewedAt: new Date(),
        },
      });

      // Refund the held diamonds to the host
      await tx.wallet.upsert({
        where: { userId: withdrawal.userId },
        create: { userId: withdrawal.userId, diamonds: withdrawal.amountDiamonds },
        update: { diamonds: { increment: withdrawal.amountDiamonds } },
      });

      await tx.transactionLedger.create({
        data: {
          type: 'WITHDRAWAL_REFUND' as any,
          recipientId: withdrawal.userId,
          amountUSD: withdrawal.amountUSD,
          notes: `Withdrawal refund #${id} — ${withdrawal.amountDiamonds} 💎 returned to host. Reason: ${reason}`,
          idempotencyKey: `WITHDRAWAL_REFUND:${id}`,
        },
      });

      return w;
    });

    return {
      success: true,
      message: 'Withdrawal rejected and diamonds refunded to host wallet.',
      withdrawal: updated,
    };
  }
}
