# 04 — Flutter Mobile Application Specification

This document defines the architecture, state management patterns, live streaming UI layout, and lifecycle handling for the Flutter mobile application.

---

## 1. Architecture & State Management

The Flutter mobile application follows **Clean Architecture** combined with the **BLoC (Business Logic Component)** pattern and **Freezed** immutable data models:

```
┌────────────────────────────────────────────────────────┐
│                   PRESENTATION LAYER                   │
│   • Reusable Widgets    • BLoC Consumer / Builders     │
│   • Screen Layouts      • SVGA Animation Overlay       │
└───────────────────────────┬────────────────────────────┘
                            │ Dispatches Events / Listens to States
                            ▼
┌────────────────────────────────────────────────────────┐
│                     DOMAIN LAYER                       │
│   • Feature BLoCs       • Freezed States & Events      │
│   • Business Logic      • Use Cases / Entities         │
└───────────────────────────┬────────────────────────────┘
                            │ Calls Methods
                            ▼
┌────────────────────────────────────────────────────────┐
│                      DATA LAYER                        │
│   • Repositories        • RTC Streaming Engine Wrapper │
│   • REST API Client     • WebSocket Signaling Client   │
│   • Local Secure Cache  • DTO Mappers                  │
└────────────────────────────────────────────────────────┘
```

### Key Libraries & Packages
* `flutter_bloc`: Predictable, testable state management.
* `freezed` & `freezed_annotation`: Immutable state unions and zero-boilerplate model mapping.
* `dio`: Robust HTTP client with automated interceptors for JWT token refresh.
* `web_socket_channel` / `socket_io_client`: Persistent real-time signaling.
* `svgaplayer_flutter` / `lottie`: High-performance hardware-accelerated animated gifts.
* `permission_handler`: Graceful permission checks with custom explanation modals.

---

## 2. Live Streaming Room UI Layout

The live streaming screen uses a stacked, layered layout designed for maximum interactivity:

```
┌────────────────────────────────────────────────────────┐
│ [Avatar] HostName (Lv.35)  [+ Follow]    👁️ 12.4k  [✕] │ Top Bar: Host info,
│ 🥇 UserA   🥈 UserB   🥉 UserC                       │ viewer count, top gifters
├────────────────────────────────────────────────────────┤
│                                                        │
│                                                        │
│                  LIVE VIDEO SURFACE                    │ Middle: Video stream
│             (Broadcaster or Audience View)             │ (Hardware accelerated)
│                                                        │
│             [ SVGA / Lottie Animated Gift ]            │ Floating: Full-screen
│             (Sports Car / Golden Dragon / Crown)       │ luxury gift animation
│                                                        │
├────────────────────────────────────────────────────────┤
│ [System] Welcome to the live room! Be respectful.      │
│ [Lv.12] UserA: Hello host! You are amazing ✨          │ Bottom-Left: Real-time
│ [VIP] UserB sent [Rose 🌹 x 10]                        │ auto-scrolling chat
├────────────────────────────────────────────────────────┤
│ [Say something...]                 [🎤] [🔄] [🎁] [💎]│ Bottom Bar: Input, mic,
└────────────────────────────────────────────────────────┘ camera flip, gift tray
```

### Animated Gift Queue Engine
When viewers send multiple high-value gifts rapidly, the client must avoid overlapping animations:
* A dedicated **`GiftQueueManager`** receives incoming gift events from the WebSocket.
* High-tier gifts (SVGA animations) are pushed into a sequential queue.
* The next animation plays only after the current one completes its lifecycle (with sound effect).
* Low-tier gifts (e.g. single roses) trigger compact floating banner toasts on the left side of the screen without interrupting luxury animations.

---

## 3. Host Center & Agency Binding Screen

Hosts require clear visibility into their agency affiliation, performance metrics, and earnings:

```
┌────────────────────────────────────────────────────────┐
│                    HOST CREATOR CENTER                 │
├────────────────────────────────────────────────────────┤
│ Current Agency: Star Talent Guild (ID: AGY-8821)       │
│ Agency Status: Bound [Change Agency]                   │
├────────────────────────────────────────────────────────┤
│ MONTHLY PERFORMANCE TRACKER (September 2026)           │
│                                                        │
│ Valid Streaming Days:       18 / 20 Days [████████░░]  │
│ Total Streamed Hours:       54.5 / 60.0 Hrs [███████░░]│
│ Monthly Diamonds Earned:    284,500 / 300k [█████████░]│
│ Current Performance Tier:   Tier B (Growth)            │
├────────────────────────────────────────────────────────┤
│ TOTAL AVAILABLE BALANCE:                               │
│ 💎 420,800 Diamonds  (≈ $420.80 USD)                   │
│                                                        │
│ [ REQUEST WITHDRAWAL ]          [ EARNINGS HISTORY ]   │
└────────────────────────────────────────────────────────┘
```

---

## 4. App Lifecycle & Network Resilience

A common failure mode in streaming apps is crashes or frozen video when a phone call arrives, the app is backgrounded, or network switches between Wi-Fi and 5G.

### Lifecycle Management Protocol
```dart
class LiveRoomBloc extends Bloc<LiveRoomEvent, LiveRoomState> with WidgetsBindingObserver {
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    switch (state) {
      case AppLifecycleState.paused:
      case AppLifecycleState.inactive:
        // Pause local camera video track; maintain audio if background mode enabled;
        // Notify WebSocket of paused state to prevent dropped connection.
        add(const LiveRoomEvent.appBackgrounded());
        break;
      case AppLifecycleState.resumed:
        // Re-enable camera track; re-verify WebSocket heartbeat;
        // Fetch latest viewer count & state delta.
        add(const LiveRoomEvent.appResumed());
        break;
      case AppLifecycleState.detached:
        // Gracefully exit live room and release hardware camera/mic handles.
        add(const LiveRoomEvent.leaveRoom());
        break;
    }
  }
}
```

### Smart Reconnection Strategy
* If network connectivity drops:
  1. Show a non-blocking semi-transparent HUD: *"Reconnecting to live stream..."*.
  2. Perform exponential backoff retry ($1\text{s}, 2\text{s}, 4\text{s}, 8\text{s}$).
  3. Seamlessly reconnect the WebRTC media stream and WebSocket signaling without forcing the user out of the room.
  4. If disconnection exceeds 30 seconds, transition safely to the discovery feed with an informative toast.
