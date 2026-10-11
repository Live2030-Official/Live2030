# 02 — Agency, Agent & Host Talent Ecosystem

This document defines the complete multi-tier commercial hierarchy, host binding workflows, monthly streaming target rules, and commission settlement formulas for the Bigo Live–style platform.

---

## 1. Multi-Tier Ecosystem Hierarchy

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          PLATFORM SUPER ADMIN                            │
│  • Full system control      • Approves agencies      • Sets global splits│
│  • Gift catalog & pricing   • KYC approvals          • Final payouts     │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │
                                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                     AGENCIES (Talent Guilds)                             │
│  • Web Agency Portal access • Unique Agency Invite Code                  │
│  • Manages 10 to 1,000+ hosts                          • Recruits agents │
│  • Tracks monthly streaming hours & targets          • Agency Commission │
└──────────────────┬───────────────────────────────────────┬───────────────┘
                   │                                       │
                   ▼ (Direct Host Onboarding)              ▼ (Via Scouts)
┌─────────────────────────────────────────┐ ┌──────────────────────────────┐
│            HOSTS / CREATORS             │ │     SUB-AGENTS / SCOUTS      │
│  • Broadcasts live video                │ │ • Recruits new talent        │
│  • Receives virtual gifts               │ │ • Earns recruiter cut from   │
│  • Hits monthly valid day targets       │ │   parent agency commission   │
│  • Withdraws earned diamonds            │ └──────────────────────────────┘
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                        VIEWERS & GIFTERS (Users)                         │
│  • Purchases coin packages   • Sends virtual gifts   • VIP / Wealth Ranks│
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Onboarding & Host Binding Workflow

### Step 1: Agency Creation & Approval
1. An agency applies via the public onboarding form or is directly created by the Super Admin in the Next.js Admin Panel.
2. Super Admin configures the agency's custom commission rate (e.g., 10% to 15%) and payout details.
3. The agency receives login credentials to the **Agency Web Portal** and is issued an **Agency Invite Code** (e.g., `AGY-8821`).

### Step 2: Host Invitation & Binding Flow
1. A prospective host registers on the Flutter Mobile App.
2. In the app profile, the user navigates to **"Become a Host / Agency Center"** and enters the Agency Code (`AGY-8821`).
3. The system validates the code:
   - If the agency has **Auto-Accept** enabled: Host is immediately bound.
   - If **Manual Review** is enabled: Request appears in the Agency Portal under "Pending Host Approvals" for the Agency Manager to accept or reject.
4. Once bound:
   * The host's live streaming activity and diamond earnings are automatically credited to that agency's tracking metrics.
   * **Lock-in Policy**: A host is bound to an agency for a minimum of 60 days to prevent agency poaching. Transferring or releasing a host requires approval from the current Agency or the Super Admin.

---

## 3. Monthly Host Target System (Valid Days & Hours)

To qualify for maximum earnings and platform bonuses, hosts must meet standardized monthly performance criteria:

### The "Valid Day" Definition
* **A Valid Day** is defined as streaming for a **minimum of 120 cumulative minutes (2 hours)** within a single calendar day (00:00 to 23:59 UTC).
* Multiple short streams on the same day are summed together.

### Host Monthly Performance Tiers

| Tier Name | Minimum Valid Days | Minimum Stream Hours | Monthly Diamonds Target | Host Baseline Share | Agency Bonus Cut |
| :---: | :---: | :---: | :---: | :---: | :---: |
| **Tier D (New)** | 10 Days | 25 Hours | 10,000 Diamonds | 30% | 5% |
| **Tier C (Starter)**| 15 Days | 40 Hours | 50,000 Diamonds | 35% | 8% |
| **Tier B (Growth)** | 20 Days | 60 Hours | 250,000 Diamonds | 40% | 10% |
| **Tier A (Pro)** | 22 Days | 80 Hours | 1,000,000 Diamonds | 45% | 12% |
| **Tier S (Celebrity)**| 25 Days | 100 Hours | 5,000,000+ Diamonds | 50% | 15% |

> [!NOTE]
> If a host hits their diamond target but fails the minimum valid days/hours requirement, their earnings are calculated at the baseline rate without unlocking tier completion bonus pools.

---

## 4. Commission Split & Financial Mathematics

The platform operates on a **Two-Currency Model**:
* **Coins (Purchased by Viewers)**: 100 Coins $\approx$ $1.00 USD (nominal in-app value).
* **Diamonds (Earned by Hosts)**: Received when a viewer sends a virtual gift.

### Example: Viewer Sends a 1,000 Coin Gift ($10.00 USD Value)

```
                       [1,000 Coins Gift Sent ($10.00 USD)]
                                        │
             ┌──────────────────────────┴──────────────────────────┐
             ▼                                                     ▼
    [Platform Share: 45%]                               [Host & Agency Pool: 55%]
        ($4.50 USD)                                            ($5.50 USD)
  (Server, RTC & Profit)                                           │
                                                ┌──────────────────┴──────────────────┐
                                                ▼                                     ▼
                                       [Host Share: 42%]                    [Agency Cut: 13%]
                                          ($4.20 USD)                          ($1.30 USD)
                                     420 Diamonds Credited                  Agency Commission
                                        to Host Wallet                       Added to Agency
                                                                                    │
                                                                 (If recruited by Sub-Agent)
                                                                 ├── Sub-Agent: 3% ($0.30)
                                                                 └── Agency Net: 10% ($1.00)
```

* **Instant Ledger Settlement**:
  * Viewer balance: `-1,000 Coins` (instant atomic deduction).
  * Host wallet: `+420 Diamonds` (ready for withdrawal).
  * Agency wallet: `+$1.30 USD` commission pending monthly or bi-weekly settlement.
  * Platform revenue: `+$4.50 USD` recorded in audit reports.

---

## 5. Agency Web Portal Specifications

The Next.js Agency Sub-Portal provides Agency Managers with real-time operational tools:

### Key Agency Capabilities
1. **Live Host Monitor**:
   * Displays all agency hosts currently live with real-time viewer count and current stream duration.
   * "Watch Live" link to inspect room quality and conduct in-house compliance.
2. **Host Performance Analytics**:
   * Filterable table of all agency hosts.
   * Columns: `Host ID`, `Name`, `Status (Live/Offline)`, `Current Month Hours`, `Valid Days Count`, `Diamonds Earned`, `Current Target Tier`.
   * Real-time progress bar showing distance to next tier bonus.
3. **Sub-Agent / Recruiter Management**:
   * Issue unique sub-referral links to talent scouts.
   * Configure recruiter commission splits (e.g. 2% to 5%).
4. **Agency Earnings & Financial Settlement**:
   * Daily and monthly commission breakdown.
   * View settled vs. pending commission balances.
   * One-click withdrawal request submission to Platform Super Admin.
