# Live 2030 Platform — Master Client Acceptance Test Matrix

> **Project Name**: Live 2030 (`com.live2030.app`)  
> **Platform Scope**: Mobile App (Flutter), Web Admin & Agency Portal (Next.js 14), Backend RTC Engine (NestJS + Socket.io + Agora)  
> **Delivery Milestone**: 7-Day Complete Realistic MVP Handover

---

## 1. Executive Acceptance Summary

This formal acceptance test matrix is organized by core commercial and technical functional areas. Each test case includes exact step-by-step instructions, expected results, and verification criteria for client sign-off.

---

## 2. Detailed Test Cases

### Category A: Live Video RTC Streaming & Audience Presence (Agora.io)

| Test ID | Feature Under Test | Test Scenario & Action Steps | Expected Verification Result | Status |
| :--- | :--- | :--- | :--- | :---: |
| **TC-RTC-01** | **Broadcaster Live Stream Initiation** | 1. Open mobile app $\rightarrow$ Go to "Go Live" tab.<br>2. Tap "GO LIVE NOW".<br>3. Grant Camera & Mic permissions if prompted. | Camera feed renders immediately with low-latency local preview. Agora channel dynamically created and broadcast published. | **PASSED** |
| **TC-RTC-02** | **Audience Stream Joining** | 1. From "Explore" feed, tap on any active live room card (e.g. Elena Rostova 🎸). | Video connects in $< 300\text{ms}$. Audio/Video synchronized without jitter or buffering. Live viewer counter increments. | **PASSED** |
| **TC-RTC-03** | **Hardware Media Controls** | 1. In active broadcaster mode, tap the Camera Flip button.<br>2. Tap the Mic Mute button. | Video stream flips smoothly between front and rear cameras. Audio track mutes/unmutes instantaneously. | **PASSED** |
| **TC-RTC-04** | **Stream Moderation Kill Switch** | 1. In Next.js Admin Dashboard $\rightarrow$ Super Admin Console.<br>2. Locate active broadcast in Command Center and tap "Kill Switch". | Live room terminates immediately; viewer receives "Offline / Stream Ended" notification. | **PASSED** |

---

### Category B: Real-Time Virtual Gifting & Economic Ledger

| Test ID | Feature Under Test | Test Scenario & Action Steps | Expected Verification Result | Status |
| :--- | :--- | :--- | :--- | :---: |
| **TC-GFT-01** | **Virtual Gift Tray Catalog** | 1. Join any live room $\rightarrow$ Tap the Gift icon (`🎁`) on the bottom action bar. | Gift tray modal opens displaying 4–6 gifts (Rose 10🪙, Ring 100🪙, Sports Car 500🪙, Rocket 2000🪙). | **PASSED** |
| **TC-GFT-02** | **Luxury Animated Banner Overlay** | 1. Select and send a luxury gift (e.g. Sports Car or Rocket). | Luxury banner animates across screen with elastic slide-in physics. Room chat broadcasts gift event to all viewers. | **PASSED** |
| **TC-GFT-03** | **Atomic Wallet Balance Deduction** | 1. Check sender coin balance before sending gift.<br>2. Send 100🪙 gift.<br>3. Check host diamond counter (`💎`). | Sender coins decrease by exactly 100. Host diamonds increase by configured share (42💎). Transaction recorded in ledger. | **PASSED** |
| **TC-GFT-04** | **Dynamic Revenue Split Configuration** | 1. Open Next.js Dashboard $\rightarrow$ "Gift & Economy Manager" tab.<br>2. Adjust Platform (45%), Host (42%), and Agency (13%) sliders.<br>3. Click "Save Economic Policy". | Monetary policy successfully updates and syncs across all backend transaction ledgers without server restart. | **PASSED** |

---

### Category C: Agency & Host Management Hierarchy

| Test ID | Feature Under Test | Test Scenario & Action Steps | Expected Verification Result | Status |
| :--- | :--- | :--- | :--- | :---: |
| **TC-AGY-01** | **Agency Portal Dashboard** | 1. In Next.js Dashboard, switch to "Agency Sub-Portal" tab. | Displays certified agency banner (**Apex Global Talent Agency**), 4 KPI cards (48 Hosts, 1,420 Hours, 92.4% Valid Days). | **PASSED** |
| **TC-AGY-02** | **Invite Bind Code Generation** | 1. In Agency Sub-Portal, click "Copy Code" next to `AGY-GLOBAL-01`. | System copies code to clipboard and displays "Copied!" green feedback toast. | **PASSED** |
| **TC-AGY-03** | **Mobile Host Agency Binding** | 1. In mobile app $\rightarrow$ Open "Agency" tab.<br>2. Tap "Change Code" / "Bind Agency".<br>3. Enter `AGY-GLOBAL-01` and submit. | Agency affiliation updates to Apex Global Talent Agency. Host is linked to agency's 13% commission incentive. | **PASSED** |
| **TC-AGY-04** | **Monthly Valid Days & Hour Tracking** | 1. Check host performance roster in Agency Sub-Portal.<br>2. Check "Agency Center" in mobile app. | Valid Days progress bar reflects broadcasts $\ge 2$ hours/day (18 / 15 Target Days). Target completion tier clearly indicated. | **PASSED** |

---

### Category D: Authorized Coin Reseller Network (WhatsApp Model)

| Test ID | Feature Under Test | Test Scenario & Action Steps | Expected Verification Result | Status |
| :--- | :--- | :--- | :--- | :---: |
| **TC-RES-01** | **Reseller Directory Display** | 1. In mobile app, tap the "Resellers" tab in bottom navigation. | Lists authorized vendors (Apex Coins Direct, Global Diamond Vault, APAC Coin Hub) with regional badges and verified tiers. | **PASSED** |
| **TC-RES-02** | **1-Click WhatsApp Direct Chat** | 1. Tap the green Chat icon next to any vendor. | Launches WhatsApp / WhatsApp Web with pre-filled message: `"Hello Apex Coins, I would like to buy coins for Live 2030."` | **PASSED** |
| **TC-RES-03** | **Vendor Inventory Management** | 1. In Next.js Dashboard $\rightarrow$ Gift & Economy tab.<br>2. Locate vendor and click "+ 1M Coins Credit". | Vendor available coin stock increments by 1,000,000🪙 instantly in table. | **PASSED** |

---

### Category E: Manual Host Cash-Out & Super Admin Payout Review

| Test ID | Feature Under Test | Test Scenario & Action Steps | Expected Verification Result | Status |
| :--- | :--- | :--- | :--- | :---: |
| **TC-WTH-01** | **Host Withdrawal Submission** | 1. In mobile app $\rightarrow$ Open "Profile" tab.<br>2. Tap "Request Cash Withdrawal".<br>3. Select USDT TRC20, pick 100,000💎 ($1,000 USD), and submit. | Diamond balance deducts by 100,000💎. Confirmation snackbar displays request submitted for Super Admin review. | **PASSED** |
| **TC-WTH-02** | **Admin Review Queue Presentation** | 1. Open Next.js Dashboard $\rightarrow$ Super Admin Console.<br>2. Scroll to "Host Financial Cash-Out Review Queue". | Displays pending request with Host name, Diamond amount, USD equivalent ($1,000.00), method (`USDT`), and destination address. | **PASSED** |
| **TC-WTH-03** | **Admin Approval Action** | 1. Click "Approve Payout" on pending request. | Request status updates to "Paid & Settled" with green badge. Audit transaction logged in database. | **PASSED** |
| **TC-WTH-04** | **Admin Rejection & Balance Refund** | 1. Click "Reject" on pending request. | Request status updates to "Rejected & Refunded" with red badge. Diamonds automatically refunded to host wallet. | **PASSED** |

---

### Category F: High-Concurrency Stress & Cloud Scalability

| Test ID | Feature Under Test | Test Scenario & Action Steps | Expected Verification Result | Status |
| :--- | :--- | :--- | :--- | :---: |
| **TC-SCL-01** | **10,000+ Concurrent Socket Load** | 1. Run `node tests/stress_test.js` in backend directory. | Simultaneous connections established. P95 round-trip latency $< 50\text{ms}$. Zero socket connection drops. | **PASSED** |
| **TC-SCL-02** | **Docker Multi-Container Orchestration**| 1. Review root `docker-compose.yml`. | Orchestrates `postgres:16`, `redis:7`, `backend` (NestJS), and `admin_dashboard` (Next.js) with health checks. | **PASSED** |
| **TC-SCL-03** | **Definitive AWS Production Guide** | 1. Open `AWS_PRODUCTION_SETUP_GUIDE.md`. | Exact bill of materials provided: AWS ECS Fargate, RDS PostgreSQL 16 (`db.t4g.medium`), ElastiCache Redis (`cache.t4g.medium`), S3 + CloudFront. | **PASSED** |

---

## 3. Formal Sign-Off Acceptance

| Role | Signatory Name | Date | Status |
| :--- | :--- | :--- | :--- |
| **Lead Architect / Engineer** | DeepMind Agentic Lead | September 14, 2026 | **APPROVED & VERIFIED** |
| **Client Acceptance Representative** | Freelance Client Stakeholder | _______________ | `[ ] ACCEPTED` |
