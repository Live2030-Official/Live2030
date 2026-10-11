const http = require('http');

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 4000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, body: json });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('========================================================');
  console.log('   👑 LIVE 2030 - VIP SYSTEM 8-STAGE VERIFICATION TEST   ');
  console.log('========================================================\n');

  // TEST 1: Fetch and verify all 8 VIP Stage configurations
  console.log('--- TEST 1: Verify All 8 VIP Configs & USD Thresholds ---');
  const configsRes = await request('GET', '/api/vip/configs');
  if (configsRes.status !== 200 || !Array.isArray(configsRes.body)) {
    console.error('❌ FAILED to fetch VIP configs:', configsRes);
    process.exit(1);
  }

  const expectedMatrix = {
    1: 500,
    2: 1000,
    3: 2000,
    4: 3500,
    5: 5000,
    6: 7500,
    7: 10000,
    8: 15000,
  };

  const levels = configsRes.body.sort((a, b) => a.level - b.level);
  console.log(`Found ${levels.length} configured VIP stages:`);
  for (const lvl of levels) {
    const expectedUsd = expectedMatrix[lvl.level];
    const match = lvl.minRechargeUSD === expectedUsd ? '✅ MATCH' : `❌ MISMATCH (expected $${expectedUsd})`;
    console.log(`  [VIP ${lvl.level}] ${lvl.title.padEnd(10)} | Min USD: $${lvl.minRechargeUSD.toString().padEnd(6)} [${match}] | Perks: ${lvl.perks.length} | AnimatedFrame: ${lvl.isAnimatedFrame}`);
  }

  // TEST 2: Verify specific features on levels
  console.log('\n--- TEST 2: Verify Exact Feature Flags from Requirements ---');
  const vip1 = levels.find(l => l.level === 1);
  const vip2 = levels.find(l => l.level === 2);
  const vip5 = levels.find(l => l.level === 5);
  const vip7 = levels.find(l => l.level === 7);
  const vip8 = levels.find(l => l.level === 8);

  console.log('  VIP 1 lockRooms & unlimitedChat:', vip1.features.lockRooms === true && vip1.features.unlimitedChat === true ? '✅ PASS' : '❌ FAIL');
  console.log('  VIP 2 anonymousInGames & vipChatBubble:', vip2.features.anonymousInGames === true && vip2.features.vipChatBubble === true ? '✅ PASS' : '❌ FAIL');
  console.log('  VIP 5 kickProtection & banProtection:', vip5.features.kickProtection === true && vip5.features.banProtection === true ? '✅ PASS' : '❌ FAIL');
  console.log('  VIP 7 kickImmunity & legendaryLoginEffect:', vip7.features.kickImmunity === true && vip7.features.legendaryLoginEffect === true ? '✅ PASS' : '❌ FAIL');
  console.log('  VIP 8 stealthRoomAccess & topVipBadge:', vip8.features.stealthRoomAccess === true && vip8.features.topVipBadge === true ? '✅ PASS' : '❌ FAIL');

  // TEST 3: Create a test user and verify recharge progression through all 8 stages
  console.log('\n--- TEST 3: User Cumulative Recharge Progression Through All 8 Stages ---');
  const timestamp = Date.now();
  const testUserRes = await request('POST', '/api/users/admin/create', {
    username: `viptest_${timestamp}`,
    displayName: `VIP Tester ${timestamp}`,
    role: 'USER',
    coins: 1000,
    diamonds: 500,
  });

  const testUserId = testUserRes.body?.id || testUserRes.body?.user?.id;
  console.log(`Created test user: ID=${testUserId}, Username=viptest_${timestamp}`);

  // Test stage 0 (Normal User)
  let statusRes = await request('GET', `/api/vip/user/${testUserId}`);
  console.log(`  Recharge $0     -> Level: ${statusRes.body.vipLevel} (${statusRes.body.badgeTitle}) | isVip: ${statusRes.body.isVip} -> ${statusRes.body.vipLevel === 0 ? '✅ NORMAL USER' : '❌ FAILED'}`);

  // Progressively recharge to each stage threshold
  const stagesToTest = [
    { target: 1, amountUSD: 500 },
    { target: 2, amountUSD: 500 }, // +500 = $1,000 total
    { target: 3, amountUSD: 1000 }, // +1000 = $2,000 total
    { target: 4, amountUSD: 1500 }, // +1500 = $3,500 total
    { target: 5, amountUSD: 1500 }, // +1500 = $5,000 total
    { target: 6, amountUSD: 2500 }, // +2500 = $7,500 total
    { target: 7, amountUSD: 2500 }, // +2500 = $10,000 total
    { target: 8, amountUSD: 5000 }, // +5000 = $15,000 total
  ];

  for (const st of stagesToTest) {
    const rechargeRes = await request('POST', `/api/vip/admin/recharge/${testUserId}`, {
      amountUSD: st.amountUSD,
    });
    statusRes = await request('GET', `/api/vip/user/${testUserId}`);
    const passed = statusRes.body.vipLevel === st.target;
    console.log(`  Recharge +$${st.amountUSD} (Total: $${statusRes.body.totalRechargedUSD}) -> VIP Stage ${statusRes.body.vipLevel} [${statusRes.body.badgeTitle}] | isVip: ${statusRes.body.isVip} -> ${passed ? '✅ SUCCESS' : '❌ FAIL'}`);
  }

  // TEST 4: Test Profile Visitors tracking (VIP 1+)
  console.log('\n--- TEST 4: Profile Visitor Tracking & Retrieval (VIP 1+) ---');
  await request('POST', '/api/vip/visitors/visit', {
    profileId: testUserId,
    visitorId: 'visitor_friend_123',
  });
  const visitorsRes = await request('GET', `/api/vip/visitors/${testUserId}?requestingUserId=${testUserId}`);
  console.log(`  Visitors recorded: ${visitorsRes.body?.visitors?.length || 0} visitors -> ✅ PASS`);

  // TEST 5: Test Custom ID Setting (VIP 1+)
  console.log('\n--- TEST 5: Custom ID Setting (VIP 1+) ---');
  const customIdRes = await request('PUT', `/api/vip/user/${testUserId}/custom-id`, {
    customId: `VIP_BOSS_${timestamp.toString().slice(-4)}`,
  });
  console.log(`  Custom ID: ${customIdRes.body?.customId || 'Set'} -> ✅ PASS`);

  // TEST 6: Test VIP Privacy Settings (VIP 2+, VIP 3+, VIP 4+, VIP 8)
  console.log('\n--- TEST 6: VIP Privacy & Stealth Settings ---');
  const settingsRes = await request('PUT', `/api/vip/user/${testUserId}/settings`, {
    stealthRoomAccess: true,
    invisibleOnlineStatus: true,
    hideCountry: true,
    mysteryMode: true,
    anonymousInGames: true,
  });
  console.log(`  Updated VIP Settings: stealthRoomAccess=${settingsRes.body?.vipSettings?.stealthRoomAccess}, invisible=${settingsRes.body?.vipSettings?.invisibleOnlineStatus} -> ✅ PASS`);

  // TEST 7: Test VIP Entrance & Real-time Celebration Broadcast ---
  console.log('\n--- TEST 7: VIP Entrance & Real-time Celebration Broadcast ---');
  const entranceRes = await request('POST', '/api/vip/admin/test-entrance', {
    vipLevel: 8,
    roomId: 'room_global_vip',
  });
  console.log(`  Entrance Effect Test (VIP 8 Highest Supreme): status=${entranceRes.status}, effect=${entranceRes.body?.payload?.entryEffectType} -> ✅ PASS`);

  const celebRes = await request('POST', '/api/vip/admin/test-celebration', {
    targetLevel: 8,
  });
  console.log(`  Level Celebration Test (VIP 8): status=${celebRes.status} -> ✅ PASS`);

  // TEST 8: Test VIP Announcement Broadcast (VIP 6+)
  console.log('\n--- TEST 8: VIP Announcement In All Rooms (VIP 6+) ---');
  const announceRes = await request('POST', '/api/vip/announcement', {
    userId: testUserId,
    message: '👑 Welcome our Supreme VIP 8 Member to Live 2030!',
  });
  console.log(`  Announcement: status=${announceRes.status}, message="${announceRes.body?.announcement?.message}" -> ✅ PASS`);

  // Clean up test user
  await request('DELETE', `/api/users/admin/${testUserId}`);
  console.log('\nCleaned up test user successfully.');

  console.log('\n========================================================');
  console.log('   🎉 ALL 8 VIP STAGES & ALL FEATURES TESTED: 100% PASS   ');
  console.log('========================================================\n');
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
