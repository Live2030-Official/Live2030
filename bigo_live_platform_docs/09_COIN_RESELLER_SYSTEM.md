# 09 — Coin Reseller & Merchant Vendor System

This document specifies the Official Coin Reseller / Merchant ecosystem (modeled after Bigo Live's global agency coin vendor network), enabling users to purchase coins directly through authorized local merchants via WhatsApp or chat, alongside future automated payment gateways.

---

## 1. System Overview & Workflow

Many global live-streaming markets rely on **Authorized Coin Resellers** rather than direct app store billing. This system allows authorized merchants to buy coins in bulk from the Platform Admin and resell them directly to users via local payment methods (UPI, Bank Transfer, JazzCash, EasyPaisa, bKash, Cash, etc.).

```
                      ┌───────────────────────────┐
                      │    PLATFORM SUPER ADMIN   │
                      └─────────────┬─────────────┘
                                    │ Sells bulk coins at discount
                                    │ (e.g., 10,000,000 coins @ 15% discount)
                                    ▼
                      ┌───────────────────────────┐
                      │ AUTHORIZED COIN RESELLER  │
                      │  (Vendor with web portal  │
                      │   & verified badge)       │
                      └───────┬───────────┬───────┘
                              │           │
       User contacts vendor   │           │ Vendor transfers coins to User ID
    via WhatsApp / phone chat │           │ via Reseller Transfer Tool
                              ▼           ▼
                      ┌───────────────────────────┐
                      │     USER / VIEWER APP     │
                      │ (Coins instantly credited │
                      │  ready to send gifts)     │
                      └───────────────────────────┘
```

---

## 2. Key Capabilities & User Flows

### A. Admin Reseller Management (Super Admin Portal)
1. **Onboard Resellers**: Super Admin creates vendor accounts, assigns authorized badges, and records business details.
2. **Bulk Coin Crediting**: Admin credits bulk coins to the Reseller's balance (e.g. 5,000,000 coins) with recorded fiat payment reference.
3. **Reseller Directory Controls**: Admin can toggle reseller visibility in the mobile app, set verified badges, and update reseller contact numbers.

### B. In-App Reseller Directory (Flutter Mobile App)
1. Under the **"Wallet & Recharge"** screen, users see two recharge options:
   * **"Online Payment Gateway"** (Future automated checkout via Stripe / Razorpay / In-App Billing).
   * **"Authorized Local Resellers / Agents"** (Active directory of verified vendors).
2. The Reseller directory displays:
   * Vendor Name & Official Verified Badge.
   * Region / Supported Local Currencies.
   * Direct **"Chat on WhatsApp"** button (launches `https://wa.me/{number}?text=Hello,%20I%20want%20to%20buy%20coins%20for%20User%20ID:%20{userId}`).
   * In-App direct messaging shortcut.

### C. Reseller-to-User Coin Transfer Tool (Web & App)
* Reseller enters the recipient's **User ID**.
* System displays the user's avatar and nickname for confirmation (prevents wrong transfers).
* Reseller enters coin amount and clicks **"Transfer Coins"**.
* **Atomic Settlement**: Coins are deducted from the Reseller's stock and credited to the User's wallet with instant push notification and ledger receipt.

---

## 3. Coexistence with Automated Payment Gateways

The backend wallet architecture is built using a unified interface (`PaymentProvider` / `RechargeChannel`), allowing:
* **Manual / Reseller Channel**: Zero gateway fees, high conversion in international cash-based markets.
* **Automated Gateway Channel**: Instant checkout via credit cards or Google Play Billing when enabled.
Both channels credit the exact same `user.coins` wallet balance and share the identical ledger auditing system.
