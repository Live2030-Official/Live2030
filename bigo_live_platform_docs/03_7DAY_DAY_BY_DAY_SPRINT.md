# 03 — 7-Day Day-by-Day Sprint & Execution Plan

This document establishes the exact day-by-day execution roadmap for the 7-day development cycle, detailing technical tasks across Mobile (Flutter), Backend (NestJS), and Web Admin (Next.js), alongside the daily client demonstration schedule.

---

## 1. Daily Rhythm & Client Communication Protocol

To build maximum client confidence and prevent surprises:
* **09:00 AM (Morning Sprint Launch)**: Engineering alignment on daily targets.
* **02:00 PM (Midday Checkpoint)**: Integration check between Flutter mobile app, Backend APIs, and Admin portals.
* **06:00 PM (Daily Client Demo & Deliverable)**: Send client a short video demo / live staging URL link proving completion of that day's milestone.

---

## 2. Day-by-Day Execution Matrix

### Day 1: System Foundation, Database Schema & Streaming Token Engine
* **Backend (NestJS)**:
  * Initialize NestJS repository with TypeScript, Prisma/TypeORM, and Docker Compose for PostgreSQL & Redis.
  * Implement PostgreSQL schema: `Users`, `Wallets`, `Agencies`, `Rooms`, `Gifts`, `Transactions`.
  * User Auth module: Phone/Email signup, Login, JWT access/refresh tokens.
  * RTC Streaming Token Service: Integration with Agora / ZEGOCLOUD / AWS IVS SDK to generate dynamic room publisher/subscriber tokens.
* **Mobile (Flutter)**:
  * Initialize Flutter project with clean BLoC architecture, Freezed state models, and Dio networking.
  * Build Auth UI screens (Login, Signup, OTP input, Session persistence).
* **Web Admin (Next.js)**:
  * Initialize Next.js 14+ project with TailwindCSS and Shadcn/UI component library.
  * Super Admin and Agency authentication layout.
* **Evening Client Demo (Day 1)**:
  * Interactive Swagger / Postman documentation of all endpoints.
  * Video showing Mobile App authentication and dynamic generation of RTC live streaming tokens.

---

### Day 2: Core Video Live Streaming & Room Presence
* **Mobile (Flutter)**:
  * Implement Host Live Broadcast Screen: Camera switch (front/back), audio mute/unmute, beauty/torch toggles.
  * Implement Audience Viewer Screen: Video surface, low-latency live playback, pull-down to leave room.
  * Device permission handling (Camera, Microphone) with clear explanatory dialogs.
* **Backend (NestJS & WebSockets)**:
  * Room Management API: `POST /api/rooms/start`, `POST /api/rooms/end`.
  * WebSocket Gateway: Room join/leave events, live audience counter (`room:viewers`), Redis Sorted Set storage.
  * Stream duration tracking (starts timer when host goes live).
* **Evening Client Demo (Day 2)**:
  * Live demo on two real phones: Host phone starts broadcasting live; Viewer phone joins and streams in real-time with sub-300ms latency.

---

### Day 3: Real-Time Chat & Animated Virtual Gifting Engine
* **Backend & WebSocket**:
  * Real-time live room chat event broadcast (`chat:message`) with profanity filter.
  * Gifting Engine: `POST /api/rooms/send-gift`.
  * Redis Lua script for atomic wallet balance check and coin deduction.
  * Double-entry ledger update: Debit viewer coins $\rightarrow$ Credit host diamonds.
  * WebSocket broadcast of gift event to all room viewers (`gift:broadcast`).
* **Mobile (Flutter)**:
  * Live room transparent chat overlay with smooth auto-scroll.
  * Virtual Gift Tray (bottom sheet showing gift catalog, prices, and coin balance).
  * SVGA / Lottie animation overlay rendering full-screen luxury gifts (sports car, rocket, crowns) over the video.
* **Evening Client Demo (Day 3)**:
  * Viewer sends gift $\rightarrow$ Luxury animation plays on both Host and Viewer screens simultaneously $\rightarrow$ Host diamond counter updates live in real-time.

---

### Day 4: Full Agency, Agent & Host Hierarchy + Agency Portal
* **Backend**:
  * Agency API endpoints: `POST /api/agencies/register`, `POST /api/hosts/bind-agency`.
  * Host monthly target calculation engine (tracking daily stream minutes, valid days $\ge 120$ mins, and diamonds).
  * Commission split calculator: Automatically allocating percentage splits between Platform, Agency, Agent, and Host.
* **Web Agency Portal (Next.js)**:
  * Agency login, dashboard overview with total agency hosts and monthly earnings.
  * Live Host Monitor: Shows which agency hosts are currently live with instant preview.
  * Performance table: Detailed list of hosts with valid days, streaming hours, and diamond targets.
* **Mobile (Flutter)**:
  * "Host Center" screen: Shows the host their current agency binding, monthly valid days, streamed hours, and diamond balance.
  * "Bind Agency" modal allowing hosts to enter an agency invite code.
* **Evening Client Demo (Day 4)**:
  * Agency logs into web portal, gets invite code $\rightarrow$ Host binds code in mobile app $\rightarrow$ Agency portal immediately shows host live status and tracked stream hours.

---

### Day 5: Super Admin Console, Live Moderation & Withdrawal Approval
* **Web Super Admin Portal (Next.js)**:
  * User & Host Management: Search, ban, unban, suspend.
  * Live Room Command Center: View grid of all ongoing live streams with a one-click "Terminate Room" kill-switch.
  * Gift & Coin Management: Add new gifts, adjust diamond exchange rates.
  * Withdrawal Review Queue: Table of pending payout requests with KYC verification status, fraud risk score, and "Approve / Reject" action buttons.
* **Backend**:
  * Admin audit logging service (records every moderator action).
  * Withdrawal approval execution: Updates transaction ledger status from `PENDING` to `APPROVED` or `REJECTED` (with refund).
* **Mobile (Flutter)**:
  * Host Withdrawal Screen: Host enters payment details and submits diamond withdrawal request.
  * In-app status tracking: Shows `Pending Review`, `Approved`, or `Rejected with Reason`.
* **Evening Client Demo (Day 5)**:
  * Host submits withdrawal in mobile app $\rightarrow$ Super Admin sees request in web console, reviews details, and clicks "Approve" $\rightarrow$ Host app updates to "Approved".

---

### Day 6: AWS Cloud Staging Deployment & Concurrency Stress Test
* **Infrastructure & Cloud (AWS)**:
  * Containerize Backend and Web Portals with Docker.
  * Deploy to AWS ECS Fargate / EC2 behind Application Load Balancer with HTTPS (SSL).
  * Connect to AWS RDS PostgreSQL (Multi-AZ) and ElastiCache Redis.
* **Stress & Concurrency Testing**:
  * Execute automated k6 / autocannon load tests simulating 10,000 to 50,000 concurrent WebSocket connections and gift fan-out.
  * Verify zero database connection exhaustion and sub-50ms Redis pub/sub response times.
* **Evening Client Demo (Day 6)**:
  * Live AWS URLs provided to client.
  * Screen share walkthrough of AWS CloudWatch metrics and load test report demonstrating rock-solid stability under heavy simulated traffic.

---

### Day 7: Mobile Release APK, Device QA & Final Handover
* **Mobile Build & Device Hardening**:
  * Handle edge-case network dropouts, background-to-foreground app resume, and low-memory devices.
  * Compile signed Release Android APK (`live2030-release-v1.0.0.apk`).
* **Final Client Acceptance Walkthrough**:
  * Client installs APK on physical Android phones.
  * End-to-end user journey test: Host live streaming $\rightarrow$ Viewer gifting $\rightarrow$ Agency performance tracking $\rightarrow$ Admin moderation & withdrawal payout.
  * Complete source code repository handover with setup documentation and runbooks.
* **Evening Client Deliverable (Day 7)**:
  * Formal project sign-off and handover package delivery.
