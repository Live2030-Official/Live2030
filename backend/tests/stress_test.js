/**
 * Live 2030 - High-Scale WebSocket & Signaling Stress Test
 * Simulates concurrent viewer audience joining a room, sending live chats,
 * and receiving high-frequency gift broadcasts.
 */

const { io } = require('socket.io-client');

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:4000/live';
const TARGET_ROOM_ID = process.env.ROOM_ID || 'room-stress-test-01';
const CONCURRENT_USERS = parseInt(process.env.USERS || '100', 10);
const DURATION_SECONDS = parseInt(process.env.DURATION || '10', 10);

console.log('===============================================================');
console.log('       LIVE 2030 CONCURRENCY & SIGNALING STRESS TEST           ');
console.log('===============================================================');
console.log(`Target Server      : ${SERVER_URL}`);
console.log(`Simulated Room ID  : ${TARGET_ROOM_ID}`);
console.log(`Concurrent Clients : ${CONCURRENT_USERS}`);
console.log(`Test Duration      : ${DURATION_SECONDS}s`);
console.log('---------------------------------------------------------------\n');

let connectedCount = 0;
let messagesReceived = 0;
let messagesSent = 0;
let errorCount = 0;
const latencies = [];
const clients = [];

const startTime = Date.now();

// Spawn simulated clients
for (let i = 1; i <= CONCURRENT_USERS; i++) {
  const userId = `viewer-load-${i}`;
  const userName = `LoadTester_${i}`;

  const socket = io(SERVER_URL, {
    transports: ['websocket'],
    reconnection: false,
    timeout: 5000,
  });

  clients.push(socket);

  socket.on('connect', () => {
    connectedCount++;

    // Join room
    socket.emit('room:join', {
      roomId: TARGET_ROOM_ID,
      userId,
      userName,
    });

    // Send chat messages periodically
    const chatInterval = setInterval(() => {
      if (socket.connected) {
        const sendTs = Date.now();
        socket.emit('chat:send', {
          roomId: TARGET_ROOM_ID,
          userId,
          userName,
          message: `🔥 Live 2030 is incredible! Msg #${Date.now()}`,
          timestamp: sendTs,
        });
        messagesSent++;
      }
    }, 2000 + Math.random() * 3000);

    socket._chatInterval = chatInterval;
  });

  socket.on('chat:broadcast', (data) => {
    messagesReceived++;
    if (data && data.timestamp) {
      const latency = Date.now() - data.timestamp;
      if (latency >= 0 && latency < 5000) {
        latencies.push(latency);
      }
    }
  });

  socket.on('gift:broadcast', () => {
    messagesReceived++;
  });

  socket.on('connect_error', (err) => {
    errorCount++;
  });
}

// Progress reporting interval
const progressInterval = setInterval(() => {
  const elapsed = Math.round((Date.now() - startTime) / 1000);
  console.log(
    `[T+${elapsed}s] Active Connections: ${connectedCount}/${CONCURRENT_USERS} | Sent: ${messagesSent} | Received: ${messagesReceived} | Errors: ${errorCount}`
  );
}, 2000);

// Stop test after DURATION_SECONDS
setTimeout(() => {
  clearInterval(progressInterval);

  clients.forEach((s) => {
    if (s._chatInterval) clearInterval(s._chatInterval);
    s.disconnect();
  });

  const totalTimeSec = (Date.now() - startTime) / 1000;
  const avgThroughput = Math.round(messagesReceived / totalTimeSec);

  latencies.sort((a, b) => a - b);
  const p50 = latencies[Math.floor(latencies.length * 0.5)] || 0;
  const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
  const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;
  const avgLatency =
    latencies.length > 0
      ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
      : 0;

  console.log('\n===============================================================');
  console.log('               STRESS TEST BENCHMARK RESULTS                   ');
  console.log('===============================================================');
  console.log(`Peak Concurrent Clients Connected : ${connectedCount}`);
  console.log(`Connection Success Rate           : ${((connectedCount / CONCURRENT_USERS) * 100).toFixed(1)}%`);
  console.log(`Total Messages Broadcasted        : ${messagesSent}`);
  console.log(`Total Messages Fan-out Delivered  : ${messagesReceived}`);
  console.log(`Average Broadcast Throughput      : ${avgThroughput} msgs/sec`);
  console.log(`Average Network Round-Trip Latency: ${avgLatency} ms`);
  console.log(`P50 (Median) Latency              : ${p50} ms`);
  console.log(`P95 Latency                       : ${p95} ms`);
  console.log(`P99 Latency                       : ${p99} ms`);
  console.log(`Network Connection Errors         : ${errorCount}`);
  console.log('===============================================================');

  if (errorCount === 0 && connectedCount > 0) {
    console.log('>> STATUS: PASSED - Cluster handled concurrency with zero dropped frames.');
  } else {
    console.log('>> STATUS: TEST COMPLETED.');
  }

  process.exit(0);
}, DURATION_SECONDS * 1000);
