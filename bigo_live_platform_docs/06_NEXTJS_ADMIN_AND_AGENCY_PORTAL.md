# 06 — Next.js Super Admin & Agency Web Portals

This document defines the architecture, screen layouts, and role-based permissions for the dual-portal web administration application built with **Next.js 14+**, **TailwindCSS**, and **Shadcn/UI**.

---

## 1. Dual-Portal Architecture & Access Control

The web portal application provides two distinct operational interfaces with strict Role-Based Access Control (RBAC):

```
┌─────────────────────────────────────────────────────────────┐
│                   NEXT.JS WEB APPLICATION                   │
├──────────────────────────────┬──────────────────────────────┤
│      SUPER ADMIN PORTAL      │      AGENCY SUB-PORTAL       │
│      Route: `/admin/*`       │      Route: `/agency/*`      │
├──────────────────────────────┼──────────────────────────────┤
│ Roles: SuperAdmin, Moderator,│ Roles: AgencyManager,        │
│ Financial Auditor, Support   │ Recruiter Scout              │
│ Scope: Entire Platform       │ Scope: Bound Agency Hosts    │
└──────────────────────────────┴──────────────────────────────┘
```

---

## 2. Super Admin Portal Features (`/admin`)

### A. Live Streams Monitor & Emergency Kill-Switch
* **Real-time Stream Wall**: A responsive grid showing live video thumbnails of active streams sorted by audience size.
* **Instant Moderation HUD**:
  * Hovering over any live stream reveals: Viewer Count, Host Name, Agency Affiliation, Diamonds Earned in Session.
  * **"Terminate Room" Button**: Prompts for termination reason (e.g., *Nudity/Inappropriate, Copyright Infringement, Fraud*), immediately revokes RTC broadcast tokens, notifies WebSocket cluster to disconnect all room viewers, and flags the host account.
  * **"Permanent Ban" Toggle**: One-click action to freeze host account and ban device hardware ID.

### B. User & Creator Management
* Searchable and filterable data table with server-side pagination.
* Inspect user profiles, transaction logs, followers, device fingerprints, and KYC status.
* Manual balance adjustment (with mandatory reason and audit logging).

### C. Agency Management Center
* Create new talent agencies, assign Agency Admin email credentials, and define custom commission rates (e.g. 10% to 15%).
* View aggregate performance: Total agency hosts, monthly diamonds generated, total agency commission owed.

### D. Withdrawal & Financial Approval Queue
* Comprehensive review table of all pending diamond withdrawal requests.
* Displays: Host Name, Agency, Diamond Amount, Fiat Equivalent ($ USD), Payment Method (Bank Transfer / PayPal / USDT), Account Details, and Risk Score.
* Confirmation modal before payout execution:
  * **"Approve & Execute Payout"**: Marks transaction as processed and releases funds.
  * **"Reject with Reason"**: Refunds diamonds back to host wallet and dispatches in-app push notification detailing the rejection cause.

---

## 3. Agency Sub-Portal Features (`/agency`)

The Agency Sub-Portal allows talent managers to oversee their hosts without accessing sensitive platform-wide data:

```
┌────────────────────────────────────────────────────────────────────────────┐
│ STAR TALENT AGENCY  |  Agency Code: AGY-8821  |  Manager: Alex (Log Out)  │
├────────────────────────────────────────────────────────────────────────────┤
│ [📊 Overview]   [🎥 Live Hosts (14)]   [⭐ Host Targets]   [💰 Commission]  │
├────────────────────────────────────────────────────────────────────────────┤
│ MONTHLY PERFORMANCE SUMMARY (September 2026)                              │
│ • Active Signed Hosts: 84            • Hosts Live Right Now: 14            │
│ • Cumulative Hours Streamed: 2,410h  • Cumulative Diamonds: 14,250,000     │
│ • Total Agency Commission: $1,710.00 USD                                   │
├────────────────────────────────────────────────────────────────────────────┤
│ HOST TARGET TRACKER                                                        │
│ [Search Host Name / ID...]                     [Filter by Tier: All ▾]     │
│ ┌──────────────┬─────────────┬───────────┬──────────────┬────────────────┐ │
│ │ Host Name    │ Valid Days  │ Stream Hrs│ Diamonds     │ Target Tier    │ │
│ ├──────────────┼─────────────┼───────────┼──────────────┼────────────────┤ │
│ │ Jessica Chen │ 21 / 22 Days│ 78.5 Hrs  │ 1,120,000 💎 │ Tier A [94%]   │ │
│ │ Marcus Roy   │ 16 / 20 Days│ 52.0 Hrs  │ 310,000 💎   │ Tier B [80%]   │ │
│ │ Elena Rostova│ 11 / 15 Days│ 34.0 Hrs  │ 85,000 💎    │ Tier C [73%]   │ │
│ └──────────────┴─────────────┴───────────┴──────────────┴────────────────┘ │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. UI/UX & Security Standards

1. **Responsive Across Form Factors**: Full mobile, tablet, and desktop layout responsiveness, enabling agency managers to monitor streams and approve requests on their phones.
2. **Immutable Audit Trail**: Every moderation action, user ban, parameter tweak, and financial approval is stored in PostgreSQL with timestamp, admin ID, IP address, and old/new state values.
3. **Optimistic UI with Instant Feedback**: Toast notifications and loading skeletons ensure a snappy, premium feel without page reloads.
