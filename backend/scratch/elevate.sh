#!/bin/bash
USER_ID="d2528625-e5f9-44a1-92e5-7dfbe30ddf1c"
curl -s -X POST http://localhost:4000/api/vip/admin/set-user-vip \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"$USER_ID\",\"vipLevel\":1,\"rechargeUSD\":500,\"reason\":\"Admin Elevation to VIP 1 for Live Verification\"}"
echo ""
curl -s "http://localhost:4000/api/vip/user/$USER_ID"
echo ""
