# 07 — Wallet, Commission Splits & Withdrawal Engine

This document details the financial double-entry ledger architecture, automated commission calculations, multi-currency balance models, and anti-fraud withdrawal workflows.

---

## 1. Double-Entry Financial Ledger Architecture

To maintain zero financial discrepancy across millions of micro-transactions, the platform enforces a strict **Double-Entry Ledger**. Direct arbitrary balance mutations (`UPDATE wallet SET coins = coins - X`) are strictly prohibited. Every balance change requires an immutable ledger entry.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        LEDGER ENTRY STRUCTURE                          │
├───────────────────┬───────────────────┬─────────────────┬──────────────┤
│ Entry ID          │ Account Type      │ Direction       │ Amount       │
├───────────────────┼───────────────────┼─────────────────┼──────────────┤
│ uuid-101          │ ViewerCoins       │ DEBIT (-)       │ 1,000 Coins  │
│ uuid-102          │ HostDiamonds      │ CREDIT (+)      │ 420 Diamonds │
│ uuid-103          │ AgencyCommission  │ CREDIT (+)      │ $1.30 USD    │
│ uuid-104          │ PlatformRevenue   │ CREDIT (+)      │ $4.50 USD    │
└───────────────────┴───────────────────┴─────────────────┴──────────────┘
```

---

## 2. Real-Time Gifting & Split Math Engine

When a viewer sends a virtual gift (e.g. "Rocket" worth 1,000 coins), the transaction is processed inside a single atomic database transaction:

```typescript
// Transaction Execution Snippet (Prisma / NestJS)
await prisma.$transaction(async (tx) => {
  // 1. Verify and lock viewer wallet
  const viewerWallet = await tx.wallet.findUnique({
    where: { userId: viewerId },
  });
  if (viewerWallet.coins < gift.costCoins) {
    throw new BadRequestException('Insufficient coin balance');
  }

  // 2. Calculate revenue splits
  const hostDiamonds = Math.floor(gift.costCoins * (hostSplitPercent / 100)); // e.g. 420
  const agencyCommissionUSD = (gift.costCoins / 100) * (agencySplitPercent / 100); // e.g. $1.30
  const platformRevenueUSD = (gift.costCoins / 100) - (hostDiamonds / 100) - agencyCommissionUSD; // e.g. $4.50

  // 3. Update Balances
  await tx.wallet.update({
    where: { userId: viewerId },
    data: { coins: { decrement: gift.costCoins } },
  });

  await tx.wallet.update({
    where: { userId: hostId },
    data: { diamonds: { increment: hostDiamonds } },
  });

  if (agencyId) {
    await tx.agencyWallet.update({
      where: { agencyId },
      data: { pendingCommissionUSD: { increment: agencyCommissionUSD } },
    });
  }

  // 4. Record Immutable Ledger Row
  await tx.transactionLedger.create({
    data: {
      type: 'GIFT_SENT',
      senderId: viewerId,
      recipientId: hostId,
      agencyId,
      roomId,
      giftId: gift.id,
      coinsDebited: gift.costCoins,
      diamondsCredited: hostDiamonds,
      agencyCommissionUSD,
      platformRevenueUSD,
    },
  });
});
```

---

## 3. Host Withdrawal State Machine

```
              [Host Submits Withdrawal]
                          │
                          ▼
                 ┌─────────────────┐
                 │  STATUS: PENDING │ ◄── [Diamonds Frozen in Host Wallet]
                 └────────┬────────┘
                          │
                          ▼
            [Automated Anti-Fraud Checks]
             ├── Failed ──▶ [Auto-Flag for Manual Investigation]
             └── Passed
                          │
                          ▼
                 ┌───────────────────┐
                 │ STATUS: IN_REVIEW │ ◄── [Visible in Super Admin Queue]
                 └────────┬──────────┘
                          │
          ┌───────────────┴───────────────┐
          ▼                               ▼
    [Admin Approves]                [Admin Rejects]
          │                               │
          ▼                               ▼
┌──────────────────┐            ┌──────────────────┐
│ STATUS: APPROVED │            │ STATUS: REJECTED │
├──────────────────┤            ├──────────────────┤
│ Payout executed  │            │ Frozen diamonds  │
│ via Bank/Crypto  │            │ refunded to host │
└──────────────────┘            └──────────────────┘
```

### Automated Anti-Fraud & Risk Checks
Before a withdrawal request reaches the Admin queue, the system automatically runs 4 risk verifications:
1. **Self-Gifting Detection**: Verifies that the host did not receive >40% of their diamonds from accounts sharing the same IP subnet, Wi-Fi BSSID, or device hardware fingerprint.
2. **Chargeback Protection Buffer**: Ensures that gifters who contributed to the host's diamonds have not initiated credit card chargebacks within the last 72 hours.
3. **Minimum Withdrawal Threshold**: Enforces platform limit (e.g. minimum 10,000 Diamonds / $100 USD equivalent).
4. **Velocity Rule**: Restricts hosts to a maximum of 1 withdrawal request every 48 hours to prevent high-frequency cash-outs during active investigations.
