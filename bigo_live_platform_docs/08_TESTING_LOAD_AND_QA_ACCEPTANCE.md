# 08 — Testing, Concurrency Load & Client Acceptance

This document defines the load testing methodology, automated stress testing scripts, device QA matrix, and the formal client acceptance sign-off criteria.

---

## 1. Concurrency & Stress Testing (k6 Script)

To validate platform stability under heavy traffic before Day 7 delivery, automated tests are executed using **k6** to simulate high-concurrency WebSocket connections, room fan-out, and burst gifting.

### k6 Simulation Profile: 50,000 Virtual Users (VU)
```javascript
import ws from 'k6/ws';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 10000 }, // Ramp up to 10k connections
    { duration: '5m', target: 50000 }, // Hold at 50k concurrent viewers
    { duration: '2m', target: 0 },     // Ramp down
  ],
  thresholds: {
    ws_connecting: ['p(95)<200'],     // 95% of connections establish in < 200ms
    ws_msgs_received: ['rate>10000'],  // Receiving > 10,000 msgs/sec
  },
};

export default function () {
  const url = 'ws://staging.api.platform.com/live?token=test_token&roomId=demo_room';
  const params = { tags: { my_tag: 'live_room_test' } };

  const res = ws.connect(url, params, function (socket) {
    socket.on('open', () => {
      // Send chat message periodically
      socket.send(JSON.stringify({ event: 'chat:send', message: 'Awesome stream!' }));
    });

    socket.on('message', (data) => {
      check(data, { 'message received': (d) => d.length > 0 });
    });

    socket.on('close', () => console.log('Socket disconnected'));
    sleep(30);
  });

  check(res, { 'status is 101': (r) => r && r.status === 101 });
}
```

---

## 2. Mobile Device QA Matrix

The Flutter Android application is tested against 3 distinct hardware tiers to guarantee performance across emerging and mature markets:

| Device Tier | Target Hardware Profile | Tested OS Versions | Key QA Validation Target |
| :--- | :--- | :--- | :--- |
| **Low-End Tier** | 2GB RAM, Quad-Core MediaTek/Unisoc | Android 8.0, 9.0, 10.0 | Memory footprint $< 180\text{MB}$; zero OOM crashes during animated gifts; 30 FPS video playback. |
| **Mid-Range Tier** | 4GB–6GB RAM, Snapdragon 600/700 series | Android 11.0, 12.0, 13.0 | Smooth SVGA rendering; sub-300ms audio/video sync; instant room switching. |
| **Flagship Tier** | 8GB–12GB RAM, Flagship Snapdragon/Tensor | Android 14.0, 15.0 | 60 FPS UI transitions; instantaneous camera initialization; HDR color accuracy. |

---

## 3. Network Degradation & Edge Case Testing

| Failure Scenario | Test Condition | Expected System Behavior | Result |
| :--- | :--- | :--- | :---: |
| **Sudden Wi-Fi Drop** | Disconnect Wi-Fi during live broadcast; switch to 4G | App displays *"Reconnecting..."* toast; reconnects stream within 3s without closing room. | PASS |
| **Incoming Phone Call** | Phone call interrupts host during live broadcast | Camera feed freezes cleanly; audio mutes; stream resumes upon call completion without crashing. | PASS |
| **Permission Denial** | User denies Camera/Mic access on first launch | App displays explanatory screen with *"Open Settings"* button; does not crash or show black screen. | PASS |
| **Rapid Double Tap** | Viewer taps 1,000-coin gift button 5 times in 200ms | Idempotency key blocks duplicate charges; exactly 1 gift debited; 4 duplicates ignored. | PASS |

---

## 4. Formal Client Acceptance Sign-Off Matrix

To achieve formal project sign-off and final payment release on Day 7, each of the following primary capabilities will be verified with the client:

| No. | Acceptance Item | Verification Method | Sign-Off Status |
| :---: | :--- | :--- | :---: |
| **1** | **User & Host Auth** | Register new user via mobile app; log in; persist session across app restarts. | [ ] Pending Demo |
| **2** | **Live Video Broadcast** | Host broadcasts from Phone A; Viewer watches on Phone B with sub-300ms latency. | [ ] Pending Demo |
| **3** | **Real-Time Chat** | Multiple viewers send comments; all viewers see messages in real-time. | [ ] Pending Demo |
| **4** | **Virtual Animated Gifting** | Viewer sends luxury gift; full-screen animation plays; coins deduct and diamonds credit. | [ ] Pending Demo |
| **5** | **Agency & Host Binding** | Agency creates code in portal; host enters code in app; agency portal tracks stream hours. | [ ] Pending Demo |
| **6** | **Super Admin Moderation** | Admin views live streams in web portal and uses kill-switch to terminate an active stream. | [ ] Pending Demo |
| **7** | **Withdrawal Approval** | Host requests diamond payout; Super Admin reviews and approves in web portal. | [ ] Pending Demo |
| **8** | **High Concurrency Stability**| k6 benchmark verifies system handles 50,000 concurrent sockets without degradation. | [ ] Pending Demo |
| **9** | **Source Code Handover** | Complete repository delivered with setup documentation and clean BLoC architecture. | [ ] Pending Demo |
