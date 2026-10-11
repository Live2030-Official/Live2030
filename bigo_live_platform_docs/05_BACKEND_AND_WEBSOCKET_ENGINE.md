# 05 — Backend & WebSocket Signaling Engine

This document defines the backend architecture, module breakdown, real-time WebSocket protocol, and caching strategies built using **NestJS (Node.js/TypeScript)**, **Redis**, and **PostgreSQL**.

---

## 1. Modular Backend Architecture

The backend is structured as a high-performance **modular monolith** that is ready for horizontal containerization:

```
src/
├── app.module.ts
├── common/
│   ├── decorators/           # CurrentUser, Roles, Idempotency
│   ├── filters/              # GlobalExceptionFilter (Structured JSON)
│   ├── guards/               # JwtAuthGuard, RolesGuard
│   ├── interceptors/         # LoggingInterceptor (Request ID, Latency)
│   └── prisma/               # Prisma Database Service & Client
└── modules/
    ├── auth/                 # Sign up, Login, OTP, JWT Refresh
    ├── users/                # User profiles, Follow/Block, Search
    ├── agencies/             # Agency management, invite codes, targets
    ├── rooms/                # Live stream lifecycle & RTC Token Gen
    ├── signaling/            # WebSocket Gateway, Presence, Redis Pub/Sub
    ├── gifts/                # Gift catalog, Sending logic, Animations
    ├── wallet/               # Coin recharge, Diamond balance, Ledger
    ├── withdrawals/          # Payout requests & Approval workflow
    └── admin/                # Moderation, Room termination, Audit logs
```

---

## 2. Real-Time WebSocket Protocol Specification

All live room events (chat, viewer counts, interactive gifts, and moderation alerts) flow through the high-throughput WebSocket gateway.

### Connection & Authentication
* **Endpoint**: `wss://api.platform.com/live`
* **Query Parameters**: `?token={JWT_BEARER_TOKEN}&deviceId={DEVICE_UUID}`
* **Heartbeat**: Ping-pong every 25 seconds. Connection drops if no response within 60 seconds.

### Client-to-Server Events (Inbound)

| Event Name | Payload Schema | Description |
| :--- | :--- | :--- |
| `room:join` | `{"roomId": "uuid"}` | Subscribes socket to room; registers presence in Redis. |
| `room:leave` | `{"roomId": "uuid"}` | Unsubscribes socket; decrements viewer count in Redis. |
| `chat:send` | `{"roomId": "uuid", "message": "string"}` | Sends a live chat message; runs profanity filter. |
| `ping` | `{"timestamp": 1726300000}` | Heartbeat check; server responds with `pong`. |

### Server-to-Client Events (Outbound Broadcast)

| Event Name | Payload Schema | Description |
| :--- | :--- | :--- |
| `room:joined` | `{"roomId": "uuid", "viewerCount": 420, "host": {...}}` | Initial room state sent to newly joined viewer. |
| `room:viewer_count` | `{"roomId": "uuid", "viewerCount": 421}` | Periodic throttled viewer count broadcast (every 2s). |
| `chat:broadcast` | `{"id": "uuid", "sender": {...}, "text": "Hello!"}` | Live chat message delivered to room audience. |
| `gift:broadcast` | `{"giftId": "g12", "name": "Sports Car", "animationUrl": "...", "sender": {...}, "quantity": 1}` | Triggers animated gift across all viewer screens. |
| `room:moderation` | `{"action": "MUTE" \| "KICK" \| "TERMINATE", "reason": "string"}` | Force-closes abusive room or mutes user. |

---

## 3. High-Concurrency Redis Caching Schema

To avoid hitting PostgreSQL for millions of real-time read operations:

```
# Active Room Viewers (Sorted Set)
Key:   room:{roomId}:viewers
Score: Unix Timestamp of join
Value: userId

# Room Real-Time Statistics (Hash)
Key:   room:{roomId}:stats
Fields: 
  - current_viewers:  1420
  - total_diamonds:   352000
  - stream_start_time: 1726301200

# Top 10 Room Gifters (Sorted Set)
Key:   room:{roomId}:top_gifters
Score: Total coins gifted in this stream
Value: userId

# User Fast Balance Cache (Hash)
Key:   user:{userId}:wallet
Fields:
  - coins:    5400
  - diamonds: 120500
```

---

## 4. Atomic Gift Sending via Redis Lua Script

To prevent double-spending and guarantee instant execution without database lock contention:

```lua
-- KEYS[1]: user:{senderId}:wallet
-- ARGV[1]: requiredCoins (e.g., 500)
local currentCoins = tonumber(redis.call('HGET', KEYS[1], 'coins') or 0)

if currentCoins < tonumber(ARGV[1]) then
    return -1 -- Insufficient balance
end

-- Atomic deduction
local remainingCoins = redis.call('HINCRBY', KEYS[1], 'coins', -tonumber(ARGV[1]))
return remainingCoins
```

* If the script returns `>= 0`, the transaction succeeds in `< 2ms`.
* The server enqueues a background job to commit the persistent transaction in PostgreSQL.
* The WebSocket gateway broadcasts the `gift:broadcast` event to all room viewers immediately.
