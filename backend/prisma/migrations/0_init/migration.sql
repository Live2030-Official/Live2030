-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'HOST', 'COIN_RESELLER', 'AGENCY_ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'SUPPORT', 'FINANCE', 'MARKETING');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('RSOMPAY', 'SIMULATOR', 'MANUAL', 'AGENCY');

-- CreateEnum
CREATE TYPE "RoomStatus" AS ENUM ('LIVE', 'ENDED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "WithdrawalStatus" AS ENUM ('PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('COIN_PURCHASE', 'RESELLER_BULK_CREDIT', 'RESELLER_TRANSFER', 'GIFT_TRANSACTION', 'AGENCY_COMMISSION', 'WITHDRAWAL_HOLD', 'WITHDRAWAL_PAYOUT', 'WITHDRAWAL_REFUND', 'ADMIN_ADJUSTMENT', 'GAME_BET', 'GAME_WIN');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'REVIEWED', 'ACTIONED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "ReportTargetType" AS ENUM ('USER', 'STREAM', 'POST', 'COMMENT', 'MESSAGE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "passwordHash" TEXT,
    "displayName" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "bio" TEXT,
    "gender" TEXT DEFAULT 'unspecified',
    "birthday" TEXT,
    "country" TEXT DEFAULT 'Global',
    "role" "Role" NOT NULL DEFAULT 'USER',
    "level" INTEGER NOT NULL DEFAULT 1,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "vipLevel" INTEGER NOT NULL DEFAULT 0,
    "totalRechargedUSD" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "monthlyRechargedUSD" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "vipBillingMonth" TEXT,
    "customId" TEXT,
    "customNameColor" TEXT,
    "vipSettings" JSONB,
    "isBanned" BOOLEAN NOT NULL DEFAULT false,
    "warningCount" INTEGER NOT NULL DEFAULT 0,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedLabel" TEXT,
    "isStaff" BOOLEAN NOT NULL DEFAULT false,
    "staffRole" "StaffRole",
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorMethod" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "deviceId" TEXT,
    "appleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "coins" INTEGER NOT NULL DEFAULT 0,
    "diamonds" INTEGER NOT NULL DEFAULT 0,
    "totalCoinsPurchased" INTEGER NOT NULL DEFAULT 0,
    "totalDiamondsEarned" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agency" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "managerEmail" TEXT NOT NULL,
    "commissionPercent" DOUBLE PRECISION NOT NULL DEFAULT 12.0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HostBinding" (
    "id" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'APPROVED',
    "boundAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "canTransferAfter" TIMESTAMP(3),

    CONSTRAINT "HostBinding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoinReseller" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "whatsappNumber" TEXT NOT NULL,
    "whatsappUrl" TEXT NOT NULL,
    "region" TEXT NOT NULL DEFAULT 'Global',
    "badgeTitle" TEXT NOT NULL DEFAULT 'Authorized Vendor',
    "coinStock" INTEGER NOT NULL DEFAULT 0,
    "isVerified" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoinReseller_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveRoom" (
    "id" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "coverUrl" TEXT,
    "agoraChannelName" TEXT NOT NULL,
    "status" "RoomStatus" NOT NULL DEFAULT 'LIVE',
    "currentViewers" INTEGER NOT NULL DEFAULT 0,
    "peakViewers" INTEGER NOT NULL DEFAULT 0,
    "totalDiamondsEarned" INTEGER NOT NULL DEFAULT 0,
    "roomType" TEXT NOT NULL DEFAULT 'VIDEO',
    "category" TEXT NOT NULL DEFAULT 'ALL',
    "language" TEXT NOT NULL DEFAULT 'Global',
    "country" TEXT NOT NULL DEFAULT 'Global',
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "roomPin" TEXT,
    "isTrendingHidden" BOOLEAN NOT NULL DEFAULT false,
    "moderatorIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "bannedUserIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "LiveRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Gift" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "costCoins" INTEGER NOT NULL,
    "diamondsAwarded" INTEGER NOT NULL,
    "iconUrl" TEXT NOT NULL,
    "animationUrl" TEXT,
    "category" TEXT NOT NULL DEFAULT 'Standard',
    "minVipLevel" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Gift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransactionLedger" (
    "id" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "senderId" TEXT,
    "recipientId" TEXT,
    "agencyId" TEXT,
    "roomId" TEXT,
    "giftId" TEXT,
    "coinsDebited" INTEGER NOT NULL DEFAULT 0,
    "diamondsCredited" INTEGER NOT NULL DEFAULT 0,
    "agencyCommissionUSD" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "platformRevenueUSD" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "amountUSD" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "notes" TEXT,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransactionLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Withdrawal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "agencyId" TEXT,
    "amountDiamonds" INTEGER NOT NULL,
    "amountUSD" DOUBLE PRECISION NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "accountDetails" TEXT NOT NULL,
    "status" "WithdrawalStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "payoutReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "Withdrawal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "details" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentOrder" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "packageId" TEXT,
    "packageName" TEXT,
    "coins" INTEGER NOT NULL DEFAULT 0,
    "bonusCoins" INTEGER NOT NULL DEFAULT 0,
    "totalCoins" INTEGER NOT NULL DEFAULT 0,
    "amountSAR" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "amountUSD" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "currency" TEXT NOT NULL DEFAULT 'SAR',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "provider" "PaymentProvider" NOT NULL DEFAULT 'RSOMPAY',
    "checkoutUrl" TEXT,
    "providerReference" TEXT,
    "webhookPayload" JSONB,
    "simulatorPaid" BOOLEAN NOT NULL DEFAULT false,
    "creditedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgencyWallet" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "coins" INTEGER NOT NULL DEFAULT 0,
    "commissionUSD" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "totalCommissionUSD" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "passwordHash" TEXT,
    "whatsappNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgencyWallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "CoinPackage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Coin Package',
    "coins" INTEGER NOT NULL,
    "bonusCoins" INTEGER NOT NULL DEFAULT 0,
    "totalCoins" INTEGER NOT NULL,
    "amountUSD" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "amountSAR" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "badge" TEXT,
    "popular" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoinPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'PHOTO',
    "caption" TEXT,
    "mediaUrl" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "likesCount" INTEGER NOT NULL DEFAULT 0,
    "commentsCount" INTEGER NOT NULL DEFAULT 0,
    "sharesCount" INTEGER NOT NULL DEFAULT 0,
    "viewsCount" INTEGER NOT NULL DEFAULT 0,
    "visibility" TEXT NOT NULL DEFAULT 'ACTIVE',
    "moderationReason" TEXT,
    "moderatedById" TEXT,
    "moderatedAt" TIMESTAMP(3),
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostLike" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostComment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "parentId" TEXT,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Follow" (
    "id" TEXT NOT NULL,
    "followerId" TEXT NOT NULL,
    "followingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Follow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LevelConfig" (
    "level" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "minXp" INTEGER NOT NULL DEFAULT 0,
    "minRechargeUSD" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "badgeColor" TEXT NOT NULL DEFAULT '#64748B',
    "badgeIconUrl" TEXT,
    "badgeTitle" TEXT,
    "frameUrl" TEXT,
    "animatedFrameUrl" TEXT,
    "isAnimatedFrame" BOOLEAN NOT NULL DEFAULT false,
    "chatBubbleColor" TEXT DEFAULT '#1E293B',
    "chatBubbleStyle" TEXT DEFAULT 'standard',
    "nameColor" TEXT DEFAULT '#FFFFFF',
    "lottieUrl" TEXT,
    "entryEffectUrl" TEXT,
    "entryEffectType" TEXT DEFAULT 'NONE',
    "perks" TEXT[],
    "features" JSONB,
    "isVip" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LevelConfig_pkey" PRIMARY KEY ("level")
);

-- CreateTable
CREATE TABLE "VipConfig" (
    "level" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "minRechargeUSD" DOUBLE PRECISION NOT NULL,
    "badgeColor" TEXT NOT NULL DEFAULT '#F59E0B',
    "badgeIconUrl" TEXT,
    "badgeTitle" TEXT,
    "frameUrl" TEXT,
    "animatedFrameUrl" TEXT,
    "isAnimatedFrame" BOOLEAN NOT NULL DEFAULT false,
    "chatBubbleColor" TEXT DEFAULT '#1E293B',
    "chatBubbleStyle" TEXT DEFAULT 'standard',
    "nameColor" TEXT DEFAULT '#FFFFFF',
    "entryEffectUrl" TEXT,
    "entryEffectType" TEXT DEFAULT 'SPECIAL',
    "lottieUrl" TEXT,
    "perks" TEXT[],
    "features" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VipConfig_pkey" PRIMARY KEY ("level")
);

-- CreateTable
CREATE TABLE "ProfileVisitor" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "visitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfileVisitor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VipAnnouncement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vipLevel" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VipAnnouncement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DirectMessage" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "imageUrl" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DirectMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameConfig" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "icon" TEXT NOT NULL DEFAULT '🎮',
    "category" TEXT NOT NULL DEFAULT 'CASINO',
    "themeColor" TEXT NOT NULL DEFAULT '#7C3AED',
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "minVipLevel" INTEGER NOT NULL DEFAULT 0,
    "minUserLevel" INTEGER NOT NULL DEFAULT 1,
    "minBet" INTEGER NOT NULL DEFAULT 10,
    "maxBet" INTEGER NOT NULL DEFAULT 10000,
    "maxMultiplier" INTEGER NOT NULL DEFAULT 50,
    "allowInLive" BOOLEAN NOT NULL DEFAULT true,
    "allowInVoice" BOOLEAN NOT NULL DEFAULT true,
    "allowStandalone" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "rules" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reporterName" TEXT,
    "targetType" "ReportTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "linkedUserId" TEXT,
    "category" TEXT,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "evidenceUrl" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "actionTaken" TEXT,
    "handledById" TEXT,
    "handledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "data" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserBlock" (
    "id" TEXT NOT NULL,
    "blockerId" TEXT NOT NULL,
    "blockedId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserWarning" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserWarning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TwoFactorOtp" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'EMAIL',
    "purpose" TEXT NOT NULL DEFAULT 'ADMIN_LOGIN',
    "consumed" BOOLEAN NOT NULL DEFAULT false,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TwoFactorOtp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "User_customId_key" ON "User"("customId");

-- CreateIndex
CREATE UNIQUE INDEX "User_appleId_key" ON "User"("appleId");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_username_idx" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_vipLevel_idx" ON "User"("vipLevel");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_userId_key" ON "Wallet"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Agency_code_key" ON "Agency"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Agency_managerEmail_key" ON "Agency"("managerEmail");

-- CreateIndex
CREATE UNIQUE INDEX "HostBinding_hostId_key" ON "HostBinding"("hostId");

-- CreateIndex
CREATE INDEX "HostBinding_agencyId_idx" ON "HostBinding"("agencyId");

-- CreateIndex
CREATE UNIQUE INDEX "CoinReseller_userId_key" ON "CoinReseller"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "LiveRoom_agoraChannelName_key" ON "LiveRoom"("agoraChannelName");

-- CreateIndex
CREATE INDEX "LiveRoom_status_idx" ON "LiveRoom"("status");

-- CreateIndex
CREATE INDEX "LiveRoom_hostId_idx" ON "LiveRoom"("hostId");

-- CreateIndex
CREATE UNIQUE INDEX "TransactionLedger_idempotencyKey_key" ON "TransactionLedger"("idempotencyKey");

-- CreateIndex
CREATE INDEX "TransactionLedger_senderId_idx" ON "TransactionLedger"("senderId");

-- CreateIndex
CREATE INDEX "TransactionLedger_recipientId_idx" ON "TransactionLedger"("recipientId");

-- CreateIndex
CREATE INDEX "TransactionLedger_agencyId_idx" ON "TransactionLedger"("agencyId");

-- CreateIndex
CREATE INDEX "TransactionLedger_type_idx" ON "TransactionLedger"("type");

-- CreateIndex
CREATE INDEX "Withdrawal_status_idx" ON "Withdrawal"("status");

-- CreateIndex
CREATE INDEX "Withdrawal_userId_idx" ON "Withdrawal"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_adminId_idx" ON "AuditLog"("adminId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentOrder_externalId_key" ON "PaymentOrder"("externalId");

-- CreateIndex
CREATE INDEX "PaymentOrder_status_idx" ON "PaymentOrder"("status");

-- CreateIndex
CREATE INDEX "PaymentOrder_userId_idx" ON "PaymentOrder"("userId");

-- CreateIndex
CREATE INDEX "PaymentOrder_createdAt_idx" ON "PaymentOrder"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AgencyWallet_agencyId_key" ON "AgencyWallet"("agencyId");

-- CreateIndex
CREATE INDEX "CoinPackage_isActive_idx" ON "CoinPackage"("isActive");

-- CreateIndex
CREATE INDEX "CoinPackage_sortOrder_idx" ON "CoinPackage"("sortOrder");

-- CreateIndex
CREATE INDEX "Post_authorId_idx" ON "Post"("authorId");

-- CreateIndex
CREATE INDEX "Post_type_idx" ON "Post"("type");

-- CreateIndex
CREATE INDEX "Post_visibility_idx" ON "Post"("visibility");

-- CreateIndex
CREATE INDEX "Post_createdAt_idx" ON "Post"("createdAt");

-- CreateIndex
CREATE INDEX "PostLike_userId_idx" ON "PostLike"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PostLike_postId_userId_key" ON "PostLike"("postId", "userId");

-- CreateIndex
CREATE INDEX "PostComment_postId_idx" ON "PostComment"("postId");

-- CreateIndex
CREATE INDEX "PostComment_parentId_idx" ON "PostComment"("parentId");

-- CreateIndex
CREATE INDEX "Follow_followerId_idx" ON "Follow"("followerId");

-- CreateIndex
CREATE INDEX "Follow_followingId_idx" ON "Follow"("followingId");

-- CreateIndex
CREATE UNIQUE INDEX "Follow_followerId_followingId_key" ON "Follow"("followerId", "followingId");

-- CreateIndex
CREATE INDEX "ProfileVisitor_profileId_idx" ON "ProfileVisitor"("profileId");

-- CreateIndex
CREATE INDEX "ProfileVisitor_visitorId_idx" ON "ProfileVisitor"("visitorId");

-- CreateIndex
CREATE INDEX "ProfileVisitor_visitedAt_idx" ON "ProfileVisitor"("visitedAt");

-- CreateIndex
CREATE INDEX "VipAnnouncement_userId_idx" ON "VipAnnouncement"("userId");

-- CreateIndex
CREATE INDEX "VipAnnouncement_createdAt_idx" ON "VipAnnouncement"("createdAt");

-- CreateIndex
CREATE INDEX "DirectMessage_senderId_receiverId_idx" ON "DirectMessage"("senderId", "receiverId");

-- CreateIndex
CREATE INDEX "DirectMessage_receiverId_idx" ON "DirectMessage"("receiverId");

-- CreateIndex
CREATE INDEX "DirectMessage_createdAt_idx" ON "DirectMessage"("createdAt");

-- CreateIndex
CREATE INDEX "GameConfig_isEnabled_idx" ON "GameConfig"("isEnabled");

-- CreateIndex
CREATE INDEX "GameConfig_sortOrder_idx" ON "GameConfig"("sortOrder");

-- CreateIndex
CREATE INDEX "Report_status_idx" ON "Report"("status");

-- CreateIndex
CREATE INDEX "Report_targetType_idx" ON "Report"("targetType");

-- CreateIndex
CREATE INDEX "Report_reporterId_idx" ON "Report"("reporterId");

-- CreateIndex
CREATE INDEX "Report_createdAt_idx" ON "Report"("createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_isRead_idx" ON "Notification"("isRead");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "UserBlock_blockerId_idx" ON "UserBlock"("blockerId");

-- CreateIndex
CREATE INDEX "UserBlock_blockedId_idx" ON "UserBlock"("blockedId");

-- CreateIndex
CREATE UNIQUE INDEX "UserBlock_blockerId_blockedId_key" ON "UserBlock"("blockerId", "blockedId");

-- CreateIndex
CREATE INDEX "UserWarning_userId_idx" ON "UserWarning"("userId");

-- CreateIndex
CREATE INDEX "UserWarning_createdAt_idx" ON "UserWarning"("createdAt");

-- CreateIndex
CREATE INDEX "TwoFactorOtp_userId_idx" ON "TwoFactorOtp"("userId");

-- CreateIndex
CREATE INDEX "TwoFactorOtp_expiresAt_idx" ON "TwoFactorOtp"("expiresAt");

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HostBinding" ADD CONSTRAINT "HostBinding_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HostBinding" ADD CONSTRAINT "HostBinding_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoinReseller" ADD CONSTRAINT "CoinReseller_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveRoom" ADD CONSTRAINT "LiveRoom_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionLedger" ADD CONSTRAINT "TransactionLedger_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionLedger" ADD CONSTRAINT "TransactionLedger_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionLedger" ADD CONSTRAINT "TransactionLedger_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionLedger" ADD CONSTRAINT "TransactionLedger_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "LiveRoom"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Withdrawal" ADD CONSTRAINT "Withdrawal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Withdrawal" ADD CONSTRAINT "Withdrawal_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentOrder" ADD CONSTRAINT "PaymentOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgencyWallet" ADD CONSTRAINT "AgencyWallet_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostLike" ADD CONSTRAINT "PostLike_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostLike" ADD CONSTRAINT "PostLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostComment" ADD CONSTRAINT "PostComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostComment" ADD CONSTRAINT "PostComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostComment" ADD CONSTRAINT "PostComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "PostComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileVisitor" ADD CONSTRAINT "ProfileVisitor_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileVisitor" ADD CONSTRAINT "ProfileVisitor_visitorId_fkey" FOREIGN KEY ("visitorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectMessage" ADD CONSTRAINT "DirectMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectMessage" ADD CONSTRAINT "DirectMessage_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

