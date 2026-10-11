'use client';

import React, { useState, useEffect } from 'react';
import { 
  Radio, 
  Key, 
  Send, 
  Eye, 
  EyeOff, 
  Share2, 
  LogOut, 
  Users, 
  UserCog,
  Building2, 
  Phone, 
  Coins, 
  ShieldAlert, 
  ArrowUpRight, 
  CheckCircle2, 
  Activity, 
  Tv, 
  DollarSign,
  Gift,
  Plus,
  Sparkles,
  Sliders,
  Copy,
  Check,
  Clock,
  Calendar,
  XCircle,
  MessageCircle,
  TrendingUp,
  AlertCircle,
  ExternalLink,
  Wallet,
  ShieldCheck,
  Award,
  Edit2,
  Trash2,
  Mic,
  Video,
  X,
  RefreshCw,
  Search,
  UserX,
  UserCheck,
  UserPlus,
  Flag,
  AlertTriangle,
  Lock,
  Unlock,
  Shield,
  Menu,
  ChevronLeft,
  ChevronRight,
  Zap,
  Crown,
  Upload,
  FileUp,
  Mail,
  Headphones,
  LifeBuoy,
  Gamepad2,
  FileText,
  Bell,
  KeyRound,
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

const DEFAULT_BACKEND_URL = 'http://13.51.73.60:4000';

const ADMIN_TOKEN_KEY = 'live2030_admin_token';
const ADMIN_USER_KEY = 'live2030_admin_user';

function getStoredAdminToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(ADMIN_TOKEN_KEY) || '';
}

function getStoredAdminUser(): any | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(ADMIN_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function clearAdminSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ADMIN_TOKEN_KEY);
  localStorage.removeItem(ADMIN_USER_KEY);
}

/**
 * Authenticated fetch: attaches the staff Bearer token to every Admin Panel
 * request and redirects back to the login gate when the session expires.
 */
async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const token = getStoredAdminToken();
  const headers = new Headers(init.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const res = await fetch(input, { ...init, headers });
  if (res.status === 401 && typeof window !== 'undefined') {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(ADMIN_USER_KEY);
    window.location.reload();
  }
  return res;
}


const getInitialBackendUrl = (): string => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('live2030_backend_target');
    if (saved && saved.trim().length > 0) return saved.trim();
    if (window.location.hostname === '13.51.73.60') {
      return 'http://13.51.73.60:4000';
    }
  }
  return DEFAULT_BACKEND_URL;
};

let BACKEND_URL = getInitialBackendUrl();

const CoinIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <span className={`${className} inline-flex items-center justify-center shrink-0 align-middle`}>
    <svg 
      viewBox="0 0 24 24" 
      className="w-full h-full drop-shadow-sm" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer 3D Gold Ring */}
      <circle cx="12" cy="12" r="10" fill="#D97706" />
      <circle cx="12" cy="11.5" r="9.5" fill="#F59E0B" />
      <circle cx="12" cy="11" r="8.8" fill="#FBBF24" />
      {/* Inner Milled Rim with Dash */}
      <circle cx="12" cy="11" r="7.2" fill="#F59E0B" stroke="#FDE68A" strokeWidth="0.8" strokeDasharray="1.6 1.2" />
      <circle cx="12" cy="11" r="6" fill="#FBBF24" />
      {/* Embossed Currency 'C' Symbol */}
      <path 
        d="M14.5 8.2C13.8 7.5 12.8 7.2 11.8 7.3C9.4 7.6 8 9.5 8 11.5C8 13.5 9.4 15.4 11.8 15.7C12.8 15.8 13.8 15.5 14.5 14.8M14.5 8.2L14 9.5M14.5 14.8L14 13.5" 
        stroke="#78350F" 
        strokeWidth="1.8" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      {/* Top Specular Glint */}
      <ellipse cx="8.5" cy="7.5" rx="2.5" ry="1.2" fill="#FEF08A" opacity="0.85" transform="rotate(-30 8.5 7.5)" />
    </svg>
  </span>
);

const DiamondIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <span className={`${className} inline-flex items-center justify-center shrink-0 align-middle`}>
    <svg 
      viewBox="0 0 24 24" 
      className="w-full h-full drop-shadow-sm" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M6 3H18L22 9L12 21L2 9L6 3Z" fill="#06B6D4" stroke="#0891B2" strokeWidth="1.2" strokeLinejoin="round"/>
      <path d="M2 9H22M12 21L8 9M12 21L16 9M6 3L8 9M18 3L16 9M12 3V9" stroke="#E0F2FE" strokeWidth="0.9" strokeLinejoin="round"/>
    </svg>
  </span>
);
interface GiftItem {
  id: string;
  name: string;
  iconUrl: string;
  costCoins: number;
  diamondsAwarded: number;
  category: string;
  minVipLevel?: number;
}

interface CoinPackageItem {
  id: string;
  name?: string;
  coins: number;
  bonusCoins: number;
  totalCoins: number;
  amountUSD: number;
  amountSAR: number;
  badge?: string | null;
  popular?: boolean;
  isActive?: boolean;
  sortOrder?: number;
}

interface GameConfigItem {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  category?: string;
  themeColor?: string;
  isEnabled: boolean;
  minVipLevel: number;
  minUserLevel: number;
  minBet: number;
  maxBet: number;
  maxMultiplier: number;
  allowInLive?: boolean;
  allowInVoice?: boolean;
  allowStandalone?: boolean;
  sortOrder?: number;
}

interface ResellerItem {
  id: string;
  businessName: string;
  whatsappNumber: string;
  whatsappUrl: string;
  coinStock: number;
  region: string;
  badgeTitle: string;
}

interface AgencyItem {
  id: string;
  name: string;
  code: string;
  managerEmail: string;
  whatsappNumber?: string;
  commissionPercent: number;
  walletBalanceUSD?: number;
  coinBalance?: number;
  password?: string;
  hostsTotalDiamonds?: number;
  totalHosts?: number;
  _count?: { bindings: number };
}

interface StreamItem {
  id: string;
  host: {
    displayName: string;
    avatarUrl?: string;
  };
  title: string;
  agoraChannelName: string;
  roomType: 'VIDEO' | 'VOICE';
  currentViewers: number;
  totalDiamondsEarned: number;
  status: string;
}

interface WithdrawalItem {
  id: string;
  user: {
    id: string;
    displayName: string;
    avatarUrl?: string;
  };
  amountDiamonds: number;
  amountUSD: number;
  paymentMethod: string;
  accountDetails: string;
  createdAt: string;
  status: string;
}

interface UserItem {
  id: string;
  username: string;
  displayName: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  role: string;
  level: number;
  vipLevel?: number;
  totalRechargedUSD?: number;
  monthlyRechargedUSD?: number;
  vipBillingMonth?: string;
  customId?: string;
  customNameColor?: string;
  vipSettings?: any;
  coins: number;
  diamonds: number;
  status: string;
  isBanned?: boolean;
  isVerified?: boolean;
  verifiedLabel?: string;
  agency?: {
    id: string;
    name: string;
    code: string;
    commissionPercent: number;
    status?: string;
    boundAt?: string;
  };
  violationsCount?: number;
  suspensionUntil?: string;
  suspensionReason?: string;
  createdAt: string;
}

interface ReportItem {
  id: string;
  targetType: string;
  targetId: string;
  reportedUserId?: string;
  reportedUserName?: string;
  reporterName?: string;
  category: string;
  reason: string;
  evidenceUrl?: string;
  status: string;
  createdAt: string;
}

export default function AdminHomePage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'reports' | 'streams' | 'resellers' | 'agencies' | 'gifts' | 'coin_packages' | 'games' | 'payouts' | 'financial' | 'contact_support' | 'vip_features' | 'staff' | 'moderation' | 'audit_log' | 'notifications' | 'security'>('overview');
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // ==================== ADMIN AUTH (Staff RBAC) ====================
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [adminUser, setAdminUser] = useState<any>(null);
  const [authReady, setAuthReady] = useState(false);
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [adminPermissions, setAdminPermissions] = useState<string[]>([]);

  useEffect(() => {
    const token = getStoredAdminToken();
    let user: any = null;
    try {
      user = JSON.parse(localStorage.getItem(ADMIN_USER_KEY) || 'null');
    } catch {
      user = null;
    }
    setAdminToken(token || null);
    setAdminUser(user);
    setAdminPermissions(Array.isArray(user?.permissions) ? user.permissions : []);
    setAuthReady(true);
  }, []);

  const handleAdminLogin = async () => {
    if (!loginIdentifier.trim() || !loginPassword) {
      setLoginError('Enter your email/username and password.');
      return;
    }
    setIsLoggingIn(true);
    setLoginError('');
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/admin-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: loginIdentifier.trim(), password: loginPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.accessToken) {
        setLoginError(data.message || 'Invalid credentials.');
        return;
      }
      localStorage.setItem(ADMIN_TOKEN_KEY, data.accessToken);
      localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(data.user || {}));
      setAdminToken(data.accessToken);
      setAdminUser(data.user || {});
      setAdminPermissions(Array.isArray(data.permissions) ? data.permissions : []);
    } catch {
      setLoginError('Network error connecting to backend.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleAdminLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(ADMIN_TOKEN_KEY);
      localStorage.removeItem(ADMIN_USER_KEY);
    }
    setAdminToken(null);
    setAdminUser(null);
    setAdminPermissions([]);
    setLoginPassword('');
  };

  const can = (permission: string) =>
    adminPermissions.includes('*') || adminPermissions.includes(permission);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  // Toast notifications
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Dynamic Economics State (Sliders free editing)
  const [platformShare, setPlatformShare] = useState(45);
  const [hostShare, setHostShare] = useState(42);
  const [agencyShare, setAgencyShare] = useState(13);
  const [copiedCode, setCopiedCode] = useState(false);
  const isEditingEconomicsRef = React.useRef(false);
  const [isEditingEconomics, setIsEditingEconomics] = useState(false);

  // Financial & Commission Ledger Report State
  const [financialReport, setFinancialReport] = useState<any>(null);

  // Dynamic Helpdesk & Support Contact Info
  const [supportContact, setSupportContact] = useState({
    whatsappNumber: '+91 98765 43210',
    helplineEmail: 'support@live2030.com',
    helplinePhone: '+1 800 555 0199',
    operatingHours: '24/7 Global Live Support',
    announcement: 'Official Live 2030 Help Center & Appeal Desk. Reach our team for account unban appeals, payment inquiries, or live streaming support.',
  });
  const [isSavingSupport, setIsSavingSupport] = useState(false);

  // Live Data State from Backend
  const [streams, setStreams] = useState<StreamItem[]>([]);
  const [gifts, setGifts] = useState<GiftItem[]>([]);
  const [coinPackages, setCoinPackages] = useState<CoinPackageItem[]>([]);
  const [games, setGames] = useState<GameConfigItem[]>([]);
  const [editingGame, setEditingGame] = useState<GameConfigItem | null>(null);
  const [gameForm, setGameForm] = useState({ isEnabled: true, minVipLevel: 0, minUserLevel: 1, minBet: 10, maxBet: 10000, allowInLive: true, allowInVoice: true, allowStandalone: true });
  const [resellers, setResellers] = useState<ResellerItem[]>([]);
  const [agencies, setAgencies] = useState<AgencyItem[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [reports, setReports] = useState<ReportItem[]>([]);

  // STAFF & ROLES (RBAC) STATE
  const [staffList, setStaffList] = useState<any[]>([]);
  const [staffCatalog, setStaffCatalog] = useState<{ permissions: any[]; roles: string[]; presets: Record<string, string[]> } | null>(null);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any | null>(null);
  const [isSavingStaff, setIsSavingStaff] = useState(false);
  const [staffForm, setStaffForm] = useState({
    username: '',
    email: '',
    displayName: '',
    password: '',
    staffRole: 'SUPPORT',
    permissions: [] as string[],
    isActive: true,
  });

  // User Filter State
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // USER CRUD MODALS
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    username: '',
    displayName: '',
    email: '',
    role: 'USER',
    level: 1,
    coins: 1000,
    diamonds: 0,
    country: 'United States',
    gender: 'Other',
    bio: '',
  });

  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [suspensionModalUser, setSuspensionModalUser] = useState<UserItem | null>(null);
  const [suspensionDuration, setSuspensionDuration] = useState('24H');
  const [suspensionReason, setSuspensionReason] = useState('Harassment / Inappropriate Conduct');

  const [walletModalUser, setWalletModalUser] = useState<UserItem | null>(null);
  const [walletAdjustMode, setWalletAdjustMode] = useState<'DELTA' | 'SET'>('DELTA');
  const [walletCoinDelta, setWalletCoinDelta] = useState(1000);
  const [walletDiamondDelta, setWalletDiamondDelta] = useState(0);
  const [walletSetCoins, setWalletSetCoins] = useState(0);
  const [walletSetDiamonds, setWalletSetDiamonds] = useState(0);
  const [walletReason, setWalletReason] = useState('Super Admin reward adjustment');

  // Agency Roster State
  const [rosterAgency, setRosterAgency] = useState<AgencyItem | null>(null);
  const [rosterHosts, setRosterHosts] = useState<any[]>([]);
  const [isLoadingRoster, setIsLoadingRoster] = useState(false);

  // GIFT CRUD MODALS
  const [showAddGiftModal, setShowAddGiftModal] = useState(false);
  const [editingGift, setEditingGift] = useState<GiftItem | null>(null);
  const [giftForm, setGiftForm] = useState({
    name: '',
    iconUrl: '🎁',
    costCoins: 100,
    diamondsAwarded: 42,
    category: 'Luxury',
    minVipLevel: 0,
  });

  // COIN PACKAGE CRUD MODALS (Admin Panel → synchronized with recharge website)
  const USD_TO_SAR_RATE = 3.75;
  const [showAddCoinPackageModal, setShowAddCoinPackageModal] = useState(false);
  const [editingCoinPackage, setEditingCoinPackage] = useState<CoinPackageItem | null>(null);
  const [coinPackageForm, setCoinPackageForm] = useState({
    name: '',
    coins: 1000,
    bonusCoins: 100,
    amountUSD: 10,
    badge: '',
    popular: false,
  });

  // VIP SYSTEM STATES (8 INDEPENDENT TIERS)
  const [vipLevels, setVipLevels] = useState<any[]>([]);
  const [isEvaluatingVip, setIsEvaluatingVip] = useState(false);
  const [editingVipLevel, setEditingVipLevel] = useState<any | null>(null);
  const [vipUserModal, setVipUserModal] = useState<UserItem | null>(null);
  const [vipFeatureCatalog, setVipFeatureCatalog] = useState<{ key: string; label: string; description: string; category: string }[]>([]);
  const [vipFeatureCategories, setVipFeatureCategories] = useState<{ key: string; label: string }[]>([]);
  const [vipUserForm, setVipUserForm] = useState({
    vipLevel: 1,
    rechargeUSD: 0,
    customId: '',
  });
  const [selectedVipMatrixTier, setSelectedVipMatrixTier] = useState<number>(1);

  // RESELLER CRUD MODALS
  const [showAddResellerModal, setShowAddResellerModal] = useState(false);
  const [editingReseller, setEditingReseller] = useState<ResellerItem | null>(null);
  const [resellerForm, setResellerForm] = useState({
    businessName: '',
    whatsappNumber: '',
    coinStock: 2000000,
    region: 'Global',
    badgeTitle: 'Authorized Vendor',
  });

  // AGENCY CRUD MODALS
  const [showAddAgencyModal, setShowAddAgencyModal] = useState(false);
  const [editingAgency, setEditingAgency] = useState<AgencyItem | null>(null);
  const [agencyForm, setAgencyForm] = useState({
    name: '',
    code: '',
    managerEmail: '',
    whatsappNumber: '+91 ',
    commissionPercent: 13,
    password: '',
  });
  const [agencyHosts, setAgencyHosts] = useState<any[]>([]);

  // AGENCY REVENUE ADJUST MODAL
  const [showAdjustAgencyRevenueModal, setShowAdjustAgencyRevenueModal] = useState(false);

  // PORTAL ROLE SWITCHER: 'admin' vs 'agency'
  const [portalMode, setPortalMode] = useState<'admin' | 'agency'>('admin');
  const [agencySession, setAgencySession] = useState<AgencyItem | null>(null);
  const [showAgencyLoginModal, setShowAgencyLoginModal] = useState(false);
  const [agencyLoginCodeOrEmail, setAgencyLoginCodeOrEmail] = useState('');
  const [agencyLoginPassword, setAgencyLoginPassword] = useState('');
  const [agencyLoginLoading, setAgencyLoginLoading] = useState(false);

  // AGENCY COIN TRANSFER TO USER
  const [agencyTransferTargetUser, setAgencyTransferTargetUser] = useState('');
  const [agencyTransferAmount, setAgencyTransferAmount] = useState('');
  const [agencyTransferNotes, setAgencyTransferNotes] = useState('');
  const [agencyTransferLoading, setAgencyTransferLoading] = useState(false);
  const [agencyCoinTransfers, setAgencyCoinTransfers] = useState<any[]>([]);

  // SUPER ADMIN AGENCY COIN RECHARGE & PASSWORD MODALS
  const [showRechargeAgencyCoinsModal, setShowRechargeAgencyCoinsModal] = useState(false);
  const [selectedAgencyForCoins, setSelectedAgencyForCoins] = useState<AgencyItem | null>(null);
  const [rechargeCoinsAmount, setRechargeCoinsAmount] = useState('50000');
  const [rechargeCoinsNotes, setRechargeCoinsNotes] = useState('Super Admin official allocation');
  const [showResetAgencyPasswordModal, setShowResetAgencyPasswordModal] = useState(false);
  const [newAgencyPasswordInput, setNewAgencyPasswordInput] = useState('');
  const [showNewAgencyCreatedModal, setShowNewAgencyCreatedModal] = useState<any | null>(null);
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});
  const [selectedAgencyForRevenue, setSelectedAgencyForRevenue] = useState<AgencyItem | null>(null);
  const [agencyRevenueInput, setAgencyRevenueInput] = useState<string>('');
  const [agencyRevenueNotes, setAgencyRevenueNotes] = useState<string>('');

  // STREAM CRUD MODALS
  const [showAddStreamModal, setShowAddStreamModal] = useState(false);
  const [streamForm, setStreamForm] = useState({
    title: 'Superstar Live Broadcast 🌟',
    roomType: 'VIDEO' as 'VIDEO' | 'VOICE',
    category: 'Hot Featured',
  });

  // BACKEND TARGET SWITCHER
  const [currentBackendUrl, setCurrentBackendUrl] = useState<string>(getInitialBackendUrl());
  const [backendHealth, setBackendHealth] = useState<'CONNECTED' | 'OFFLINE' | 'CONNECTING'>('CONNECTING');
  const [isWsConnected, setIsWsConnected] = useState(false);
  const [liveEvents, setLiveEvents] = useState<Array<{
    id: string;
    type: string;
    title: string;
    subtitle: string;
    time: string;
    badge: string;
    badgeColor: string;
  }>>([]);

  const switchBackend = (newUrl: string) => {
    BACKEND_URL = newUrl;
    setCurrentBackendUrl(newUrl);
    if (typeof window !== 'undefined') {
      localStorage.setItem('live2030_backend_target', newUrl);
    }
    setBackendHealth('CONNECTING');
    fetchAllData();
  };

  // Fetch live state from backend
  const fetchAllData = async () => {
    try {
      // 1. Streams
      const resStreams = await apiFetch(`${BACKEND_URL}/api/rooms/discovery`).catch(() => null);
      if (resStreams && resStreams.ok) {
        const rawStreams: StreamItem[] = await resStreams.json();
        const seen = new Set<string>();
        const uniqueStreams: StreamItem[] = [];
        for (const s of rawStreams) {
          const key = `${s.id}_${s.agoraChannelName}`;
          if (!seen.has(key) && !seen.has(s.id)) {
            seen.add(key);
            seen.add(s.id);
            uniqueStreams.push(s);
          }
        }
        setStreams(uniqueStreams);
      }

      // 2. Gifts
      const resGifts = await apiFetch(`${BACKEND_URL}/api/gifts`).catch(() => null);
      if (resGifts && resGifts.ok) {
        setGifts(await resGifts.json());
      }

      // 2b. Coin Packages (synchronized with recharge website)
      const resCoinPackages = await apiFetch(`${BACKEND_URL}/api/coin-packages/admin/all`).catch(() => null);
      if (resCoinPackages && resCoinPackages.ok) {
        setCoinPackages(await resCoinPackages.json());
      }

      // 2c. Games configuration (enable/disable + level restrictions)
      const resGames = await apiFetch(`${BACKEND_URL}/api/games/admin/all`).catch(() => null);
      if (resGames && resGames.ok) {
        setGames(await resGames.json());
      }

      // 3. Resellers
      const resVendors = await apiFetch(`${BACKEND_URL}/api/resellers`).catch(() => null);
      if (resVendors && resVendors.ok) {
        setResellers(await resVendors.json());
      }

      // 4. Agencies
      const resAgencies = await apiFetch(`${BACKEND_URL}/api/agencies`).catch(() => null);
      if (resAgencies && resAgencies.ok) {
        setAgencies(await resAgencies.json());
      }

      // 5. Withdrawals
      const resWithdrawals = await apiFetch(`${BACKEND_URL}/api/withdrawals/pending`).catch(() => null);
      if (resWithdrawals && resWithdrawals.ok) {
        setWithdrawals(await resWithdrawals.json());
      }

      // 6. Users
      const resUsers = await apiFetch(`${BACKEND_URL}/api/users/admin/list?search=${encodeURIComponent(userSearch)}&role=${roleFilter}&status=${statusFilter}`).catch(() => null);
      if (resUsers && resUsers.ok) {
        setUsers(await resUsers.json());
        setBackendHealth('CONNECTED');
      } else {
        setBackendHealth('OFFLINE');
      }

      // 7. Reports
      const resReports = await apiFetch(`${BACKEND_URL}/api/reports/admin/list`).catch(() => null);
      if (resReports && resReports.ok) {
        setReports(await resReports.json());
      }

      // 8. Dynamic Economics Split (avoid overwriting while admin is adjusting sliders)
      if (!isEditingEconomicsRef.current) {
        const resEconomics = await apiFetch(`${BACKEND_URL}/api/gifts/economics`).catch(() => null);
        if (resEconomics && resEconomics.ok) {
          const econ = await resEconomics.json();
          if (econ.platformShare !== undefined) setPlatformShare(Number(econ.platformShare));
          if (econ.hostShare !== undefined) setHostShare(Number(econ.hostShare));
          if (econ.agencyShare !== undefined) setAgencyShare(Number(econ.agencyShare));
        }
      }

      // 9. Financial & Commission Ledger Report
      const resFin = await apiFetch(`${BACKEND_URL}/api/users/admin/financial-report`).catch(() => null);
      if (resFin && resFin.ok) {
        setFinancialReport(await resFin.json());
      }

      // 11. Support Contact Info
      const resSupport = await apiFetch(`${BACKEND_URL}/api/support/contact`).catch(() => null);
      if (resSupport && resSupport.ok) {
        setSupportContact(await resSupport.json());
      }

      // 12. VIP Tier Configurations (8 Independent Stages)
      const resVip = await apiFetch(`${BACKEND_URL}/api/levels`).catch(() => null);
      if (resVip && resVip.ok) {
        setVipLevels(await resVip.json());
      }

      // 13. VIP Benefit Catalog (single source of truth for per-tier toggles)
      const resVipFeatures = await apiFetch(`${BACKEND_URL}/api/levels/features`).catch(() => null);
      if (resVipFeatures && resVipFeatures.ok) {
        const data = await resVipFeatures.json();
        setVipFeatureCatalog(data?.features || []);
        setVipFeatureCategories(data?.categories || []);
      }

      // 14. Staff accounts & RBAC catalog (only for users allowed to view staff)
      if (can('staff.view')) {
        const resStaff = await apiFetch(`${BACKEND_URL}/api/staff/list`).catch(() => null);
        if (resStaff && resStaff.ok) {
          setStaffList(await resStaff.json());
        }
        const resStaffCatalog = await apiFetch(`${BACKEND_URL}/api/staff/catalog`).catch(() => null);
        if (resStaffCatalog && resStaffCatalog.ok) {
          setStaffCatalog(await resStaffCatalog.json());
        }
      }
    } catch {
      setBackendHealth('OFFLINE');
    }
  };

  // Real-time WebSocket Telemetry Connection
  useEffect(() => {
    if (!adminToken) return;
    const socket: Socket = io(`${currentBackendUrl}/live`, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
      auth: { token: adminToken },
    });

    socket.on('connect', () => {
      setIsWsConnected(true);
      socket.emit('admin:join', { token: adminToken });
    });

    socket.on('admin:error', (data: any) => {
      console.warn('Admin telemetry rejected:', data?.message);
    });

    socket.on('disconnect', () => {
      setIsWsConnected(false);
    });

    socket.on('admin:connected', () => {
      setIsWsConnected(true);
    });

    socket.on('admin:agency_host_bound', (data: any) => {
      if (data?.hostId && data?.agency) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === data.hostId
              ? { ...u, role: 'HOST', agency: data.agency }
              : u
          )
        );
        setAgencies((prev) =>
          prev.map((a) =>
            a.id === data.agency.id
              ? { ...a, _count: { bindings: (a._count?.bindings || 0) + 1 } }
              : a
          )
        );
        const newEvent = {
          id: `${Date.now()}-${Math.random()}`,
          type: 'AGENCY_BIND',
          title: `🏢 Host Affiliated: ${data.hostDisplayName || data.hostId}`,
          subtitle: `Joined Talent Agency: ${data.agency.name} (Code: ${data.agency.code} • ${data.agency.commissionPercent}% Cut)`,
          time: new Date().toLocaleTimeString(),
          badge: 'AGENCY BOUND',
          badgeColor: 'bg-pink-500/20 text-pink-400 border border-pink-500/40',
        };
        setLiveEvents((prev) => [newEvent, ...prev.slice(0, 19)]);
        showToast(`Host ${data.hostDisplayName || data.hostId} bound with Agency ${data.agency.name}! 🌟`, 'success');
      }
    });

    socket.on('admin:support_contact_updated', (data: any) => {
      if (data) {
        setSupportContact(data);
        showToast('Support & Helpdesk contact information updated in real-time! 💬', 'info');
      }
    });

    socket.on('admin:coin_packages_updated', (data: any) => {
      if (data?.action) {
        const action = String(data.action);
        const pkg = data?.package;
        if (action === 'create' && pkg?.id) {
          setCoinPackages((prev) => {
            if (prev.some((p) => p.id === pkg.id)) return prev;
            return [...prev, pkg];
          });
        } else if (action === 'delete' && pkg?.id) {
          setCoinPackages((prev) => prev.filter((p) => p.id !== pkg.id));
        } else if ((action === 'update' || action === 'toggle') && pkg?.id) {
          setCoinPackages((prev) => prev.map((p) => (p.id === pkg.id ? { ...p, ...pkg } : p)));
        }
        showToast(`Coin packages synchronized in real-time (${action}) 🪙`, 'info');
      }
    });

    socket.on('admin:games_updated', (data: any) => {
      const game = data?.game;
      if (game?.id) {
        setGames((prev) => {
          if (prev.some((g) => g.id === game.id)) {
            return prev.map((g) => (g.id === game.id ? { ...g, ...game } : g));
          }
          return [...prev, game];
        });
      }
      showToast(`Games configuration synchronized in real-time 🎮`, 'info');
    });

    socket.on('admin:user_verification_changed', (data: any) => {
      if (data?.userId) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === data.userId
              ? { ...u, isVerified: data.isVerified, verifiedLabel: data.verifiedLabel || undefined }
              : u,
          ),
        );
        showToast(
          `${data.displayName || 'User'} verification ${data.isVerified ? 'granted' : 'removed'} ✅`,
          'info',
        );
      }
    });

    socket.on('user_level_up', (data: any) => {
      showToast(`🎉 ${data.displayName} reached Level ${data.newLevel} (${data.title})!`, 'success');
      fetchAllData();
    });

    socket.on('admin:economics_updated', (data: any) => {
      if (data?.economics && !isEditingEconomicsRef.current) {
        if (data.economics.platformShare !== undefined) setPlatformShare(Number(data.economics.platformShare));
        if (data.economics.hostShare !== undefined) setHostShare(Number(data.economics.hostShare));
        if (data.economics.agencyShare !== undefined) setAgencyShare(Number(data.economics.agencyShare));
      }
    });

    socket.on('admin:wallet_updated', (data: any) => {
      if (data?.userId) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === data.userId
              ? {
                  ...u,
                  coins: data.coins !== undefined ? Number(data.coins) : u.coins,
                  diamonds: data.diamonds !== undefined ? Number(data.diamonds) : u.diamonds,
                }
              : u
          )
        );
      }
    });

    socket.on('wallet:balance_update', (data: any) => {
      if (data?.userId) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === data.userId
              ? {
                  ...u,
                  coins: data.coins !== undefined ? Number(data.coins) : u.coins,
                  diamonds: data.diamonds !== undefined ? Number(data.diamonds) : u.diamonds,
                }
              : u
          )
        );
      }
    });

    socket.on('admin:metrics_update', (data: any) => {
      fetchAllData();
      if (data?.eventType === 'GIFT_TRANSACTION') {
        const newEvent = {
          id: `${Date.now()}-${Math.random()}`,
          type: 'GIFT',
          title: `🎁 ${data.sender?.displayName || 'Viewer'} sent ${data.gift?.name || 'Gift'} (${data.gift?.costCoins || 0} Coins)`,
          subtitle: `Host: ${data.recipient?.displayName || 'Host'} | Platform Margin: $${data.economics?.platformGrossMarginUsd?.toFixed(2) || '0.00'} | Agency: $${data.economics?.agencyCommissionUsd?.toFixed(2) || '0.00'}`,
          time: new Date().toLocaleTimeString(),
          badge: 'LIVE GIFT',
          badgeColor: 'bg-pink-500/20 text-pink-400 border border-pink-500/40',
        };
        setLiveEvents((prev) => [newEvent, ...prev.slice(0, 19)]);
      }
    });

    socket.on('gift:broadcast', () => {
      fetchAllData();
    });

    socket.on('pk:battle_active', (data: any) => {
      fetchAllData();
      const host1Name = typeof data?.host1 === 'string' ? data.host1 : (data?.host1?.displayName || 'Host 1');
      const host2Name = typeof data?.host2 === 'string' ? data.host2 : (data?.host2?.displayName || 'Rival');
      const newEvent = {
        id: `${Date.now()}-${Math.random()}`,
        type: 'PK_BATTLE',
        title: `⚔️ PK Battle: ${host1Name} vs ${host2Name}`,
        subtitle: `Room: ${data?.roomId || 'Live'} | Real-time Showdown Active`,
        time: new Date().toLocaleTimeString(),
        badge: 'PK ACTIVE',
        badgeColor: 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/40',
      };
      setLiveEvents((prev) => [newEvent, ...prev.slice(0, 19)]);
    });

    socket.on('pk:battle_ended', (data: any) => {
      fetchAllData();
      const newEvent = {
        id: `${Date.now()}-${Math.random()}`,
        type: 'PK_BATTLE',
        title: `🏁 PK Battle Concluded in Room #${data?.roomId || 'Live'}`,
        subtitle: `Status: ${data?.status || 'CLOSED'}`,
        time: new Date().toLocaleTimeString(),
        badge: 'PK ENDED',
        badgeColor: 'bg-blue-500/20 text-blue-400 border border-blue-500/40',
      };
      setLiveEvents((prev) => [newEvent, ...prev.slice(0, 19)]);
    });

    socket.on('stream:started', (data: any) => {
      fetchAllData();
      const newEvent = {
        id: `${Date.now()}-${Math.random()}`,
        type: 'STREAM',
        title: `🔴 Broadcast Started: "${data?.title || 'Live Show'}"`,
        subtitle: `Type: ${data?.roomType || 'VIDEO'} | Host ID: ${data?.hostId || 'Live'}`,
        time: new Date().toLocaleTimeString(),
        badge: 'BROADCAST',
        badgeColor: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40',
      };
      setLiveEvents((prev) => [newEvent, ...prev.slice(0, 19)]);
    });

    socket.on('reconnect', () => {
      setIsWsConnected(true);
      fetchAllData();
    });

    socket.on('stream:ended', (data: any) => {
      const endedId = data?.roomId;
      const endedCh = data?.agoraChannelName;
      setStreams((prev) =>
        prev.map((s) =>
          s.id === endedId || s.agoraChannelName === endedCh || s.agoraChannelName === endedId
            ? { ...s, status: 'TERMINATED' }
            : s,
        ),
      );
      fetchAllData();
      const newEvent = {
        id: `${Date.now()}-${Math.random()}`,
        type: 'STREAM',
        title: `⏹️ Broadcast Terminated: Room #${data?.roomId || 'Live'}`,
        subtitle: `Host ID: ${data?.hostId || 'Live'} | Closed at: ${new Date().toLocaleTimeString()}`,
        time: new Date().toLocaleTimeString(),
        badge: 'ENDED',
        badgeColor: 'bg-rose-500/20 text-rose-400 border border-rose-500/40',
      };
      setLiveEvents((prev) => [newEvent, ...prev.slice(0, 19)]);
    });

    socket.on('report:new', (newReport: any) => {
      if (newReport && newReport.id) {
        setReports((prev) => [newReport, ...prev.filter((r) => r.id !== newReport.id)]);
        const newEvent = {
          id: `${Date.now()}-${Math.random()}`,
          type: 'SAFETY_VIOLATION',
          title: `🚨 SAFETY VIOLATION: ${newReport.reportedUserName || 'User'}`,
          subtitle: `${newReport.reason || 'Prohibited content detected'} (Room: ${newReport.evidenceUrl || 'Live'})`,
          time: new Date().toLocaleTimeString(),
          badge: 'SAFETY ALERT',
          badgeColor: 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse',
        };
        setLiveEvents((prev) => [newEvent, ...prev.slice(0, 19)]);
        showToast(`🚨 Safety Alert: ${newReport.reportedUserName || 'User'} flagged for violation!`, 'error');
      }
    });

    socket.on('admin:safety_violation', (data: any) => {
      fetchAllData();
    });

    socket.on('admin:user_status_changed', (data: any) => {
      if (data?.userId) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === data.userId
              ? {
                  ...u,
                  status: data.status,
                  suspensionUntil: data.suspensionUntil,
                  suspensionReason: data.suspensionReason,
                  isBanned: data.isBanned ?? (data.status === 'BANNED'),
                }
              : u
          )
        );
      }
      fetchAllData();
    });

    socket.on('admin:agency_revenue_updated', (data: any) => {
      if (data?.agencyId) {
        setAgencies((prev) =>
          prev.map((a) =>
            a.id === data.agencyId
              ? { ...a, walletBalanceUSD: data.revenueUSD }
              : a
          )
        );
      }
      fetchAllData();
    });

    return () => {
      socket.disconnect();
    };
  }, [currentBackendUrl, adminToken]);

  useEffect(() => {
    if (!adminToken) return;
    fetchAllData();
    const interval = setInterval(fetchAllData, 5000);
    return () => clearInterval(interval);
  }, [userSearch, roleFilter, statusFilter, adminToken]);

  // ==================== USER ACTIONS ====================
  const handleCreateUser = async () => {
    if (!newUserForm.username.trim()) {
      showToast('Username is required', 'error');
      return;
    }
    try {
      const res = await apiFetch(`${BACKEND_URL}/api/users/admin/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUserForm),
      });
      if (res.ok) {
        showToast(`User @${newUserForm.username} created successfully!`, 'success');
        setShowAddUserModal(false);
        setNewUserForm({ username: '', displayName: '', email: '', role: 'USER', level: 1, coins: 1000, diamonds: 0, country: 'United States', gender: 'Other', bio: '' });
        fetchAllData();
      } else {
        showToast('Failed to create user', 'error');
      }
    } catch {
      showToast('Network error connecting to backend', 'error');
    }
  };

  const handleUpdateUserDetails = async () => {
    if (!editingUser) return;
    try {
      const res = await apiFetch(`${BACKEND_URL}/api/users/admin/${editingUser.id}/details`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingUser),
      });
      if (res.ok) {
        showToast(`User @${editingUser.username} updated!`, 'success');
        setEditingUser(null);
        fetchAllData();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.message || 'Failed to update user', 'error');
      }
    } catch {
      showToast('Network error connecting to backend', 'error');
    }
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to permanently delete user "${name}"? This action cannot be undone.`)) return;
    try {
      const res = await apiFetch(`${BACKEND_URL}/api/users/admin/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast(`User "${name}" deleted!`, 'success');
        fetchAllData();
      } else {
        showToast('Failed to delete user', 'error');
      }
    } catch {
      showToast('Network error connecting to backend', 'error');
    }
  };

  // ==================== STAFF & ROLES (RBAC) ====================
  const openCreateStaff = () => {
    setEditingStaff(null);
    setStaffForm({ username: '', email: '', displayName: '', password: '', staffRole: 'SUPPORT', permissions: staffCatalog?.presets?.SUPPORT || [], isActive: true });
    setShowStaffModal(true);
  };

  const openEditStaff = (staff: any) => {
    setEditingStaff(staff);
    setStaffForm({
      username: staff.username || '',
      email: staff.email || '',
      displayName: staff.displayName || '',
      password: '',
      staffRole: staff.staffRole || 'SUPPORT',
      permissions: Array.isArray(staff.permissions) ? staff.permissions : [],
      isActive: staff.isActive !== false,
    });
    setShowStaffModal(true);
  };

  const toggleStaffPermission = (key: string) => {
    setStaffForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(key)
        ? prev.permissions.filter((p) => p !== key)
        : [...prev.permissions, key],
    }));
  };

  const applyStaffRolePreset = (role: string) => {
    const preset = staffCatalog?.presets?.[role] || [];
    setStaffForm((prev) => ({ ...prev, staffRole: role, permissions: preset }));
  };

  const handleSaveStaff = async () => {
    if (!staffForm.staffRole) {
      showToast('Select a staff role', 'error');
      return;
    }
    if (!editingStaff && (!staffForm.username.trim() || staffForm.password.length < 6)) {
      showToast('Username and a 6+ character password are required', 'error');
      return;
    }
    setIsSavingStaff(true);
    try {
      let res;
      if (editingStaff) {
        const payload: any = {
          displayName: staffForm.displayName,
          email: staffForm.email || undefined,
          staffRole: staffForm.staffRole,
          permissions: staffForm.permissions,
          isActive: staffForm.isActive,
        };
        if (staffForm.password) payload.password = staffForm.password;
        res = await apiFetch(`${BACKEND_URL}/api/staff/${editingStaff.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await apiFetch(`${BACKEND_URL}/api/staff/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: staffForm.username.trim(),
            email: staffForm.email || undefined,
            displayName: staffForm.displayName || undefined,
            password: staffForm.password,
            staffRole: staffForm.staffRole,
            permissions: staffForm.permissions,
          }),
        });
      }
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success !== false) {
        showToast(editingStaff ? 'Staff account updated ✅' : 'Staff account created ✅', 'success');
        setShowStaffModal(false);
        setEditingStaff(null);
        fetchAllData();
      } else {
        showToast(data.message || 'Failed to save staff account', 'error');
      }
    } catch {
      showToast('Network error saving staff account', 'error');
    } finally {
      setIsSavingStaff(false);
    }
  };

  const handleToggleStaffActive = async (staff: any) => {
    try {
      const res = await apiFetch(`${BACKEND_URL}/api/staff/${staff.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: staff.isActive === false }),
      });
      if (res.ok) {
        showToast(staff.isActive === false ? 'Staff access re-enabled' : 'Staff access suspended', 'success');
        fetchAllData();
      } else {
        showToast('Failed to update staff status', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    }
  };

  const handleDeleteStaff = async (staff: any) => {
    if (!confirm(`Revoke admin access for "${staff.displayName || staff.username}"?`)) return;
    try {
      const res = await apiFetch(`${BACKEND_URL}/api/staff/${staff.id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Staff access revoked', 'success');
        fetchAllData();
      } else {
        showToast('Failed to revoke access', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    }
  };

  const handleToggleUserBan = async (user: UserItem) => {
    const newStatus = user.status === 'BANNED' ? 'ACTIVE' : 'BANNED';
    try {
      await apiFetch(`${BACKEND_URL}/api/users/admin/${user.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, reason: newStatus === 'BANNED' ? 'Violation of platform community rules' : 'Account restored by admin' }),
      });
      showToast(newStatus === 'BANNED' ? `User @${user.username} has been BANNED!` : `User @${user.username} restored to ACTIVE!`, 'success');
      fetchAllData();
    } catch {
      showToast('Error updating ban status', 'error');
    }
  };

  const handleApplySuspension = async () => {
    if (!suspensionModalUser) return;
    const hours = suspensionDuration === '24H' ? 24 : suspensionDuration === '3D' ? 72 : suspensionDuration === '7D' ? 168 : 720;
    const status = suspensionDuration === '24H' ? 'SUSPENDED_24H' : suspensionDuration === '7D' ? 'SUSPENDED_7D' : 'SUSPENDED_30D';
    try {
      await apiFetch(`${BACKEND_URL}/api/users/admin/${suspensionModalUser.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, reason: suspensionReason, suspensionHours: hours }),
      });
      showToast(`User @${suspensionModalUser.username} suspended for ${suspensionDuration}!`, 'success');
      setSuspensionModalUser(null);
      fetchAllData();
    } catch {
      showToast('Error applying suspension', 'error');
    }
  };

  const handleApplyWalletAdjustment = async () => {
    if (!walletModalUser) return;
    try {
      const payload = walletAdjustMode === 'SET'
        ? { mode: 'SET', setCoins: walletSetCoins, setDiamonds: walletSetDiamonds, reason: walletReason }
        : { mode: 'DELTA', coinDelta: walletCoinDelta, diamondDelta: walletDiamondDelta, reason: walletReason };

      const res = await apiFetch(`${BACKEND_URL}/api/users/admin/${walletModalUser.id}/adjust-wallet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const result = await res.json();
        showToast(result.message || 'Wallet adjusted successfully!', 'success');
        setWalletModalUser(null);
        fetchAllData();
      } else {
        showToast('Error adjusting wallet balance', 'error');
      }
    } catch {
      showToast('Error adjusting wallet balance', 'error');
    }
  };

  const handleOpenWalletModal = (user: UserItem) => {
    setWalletModalUser(user);
    setWalletAdjustMode('DELTA');
    setWalletCoinDelta(1000);
    setWalletDiamondDelta(0);
    setWalletSetCoins(user.coins || 0);
    setWalletSetDiamonds(user.diamonds || 0);
    setWalletReason('Super Admin balance adjustment');
  };

  const handleOpenAgencyRoster = async (agency: AgencyItem) => {
    setRosterAgency(agency);
    setIsLoadingRoster(true);
    setRosterHosts([]);
    try {
      const res = await apiFetch(`${BACKEND_URL}/api/agencies/${agency.id}/hosts`).catch(() => null);
      if (res && res.ok) {
        setRosterHosts(await res.json());
      }
    } catch {
      // fallback
    } finally {
      setIsLoadingRoster(false);
    }
  };

  const handleSaveEconomics = async () => {
    const sum = platformShare + hostShare + agencyShare;
    if (sum !== 100) {
      showToast(`Percentages must sum to exactly 100%! Current sum: ${sum}%. Adjust the sliders or numbers and try again.`, 'error');
      return;
    }
    try {
      const res = await apiFetch(`${BACKEND_URL}/api/gifts/economics`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platformShare, hostShare, agencyShare }),
      });
      if (res.ok) {
        isEditingEconomicsRef.current = false;
        setIsEditingEconomics(false);
        showToast('Platform revenue matrix saved & applied live! 🚀', 'success');
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.message || 'Error saving revenue matrix', 'error');
      }
    } catch {
      showToast('Error communicating with backend', 'error');
    }
  };

  // ==================== GIFT ACTIONS ====================
  const handleCreateGift = async () => {
    if (!giftForm.name.trim()) {
      showToast('Gift name is required', 'error');
      return;
    }
    try {
      const res = await apiFetch(`${BACKEND_URL}/api/gifts/admin/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(giftForm),
      });
      if (res.ok) {
        showToast(`Gift "${giftForm.name}" added to catalog!`, 'success');
        setShowAddGiftModal(false);
        setGiftForm({ name: '', iconUrl: '🎁', costCoins: 100, diamondsAwarded: 42, category: 'Luxury', minVipLevel: 0 });
        fetchAllData();
      } else {
        showToast('Failed to add gift', 'error');
      }
    } catch {
      showToast('Network error adding gift', 'error');
    }
  };

  const handleUpdateGift = async () => {
    if (!editingGift) return;
    try {
      const res = await apiFetch(`${BACKEND_URL}/api/gifts/admin/${editingGift.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingGift),
      });
      if (res.ok) {
        showToast(`Gift "${editingGift.name}" updated!`, 'success');
        setEditingGift(null);
        fetchAllData();
      } else {
        showToast('Failed to update gift', 'error');
      }
    } catch {
      showToast('Network error updating gift', 'error');
    }
  };

  const handleDeleteGift = async (id: string, name: string) => {
    if (!confirm(`Delete gift "${name}" from catalog?`)) return;
    try {
      const res = await apiFetch(`${BACKEND_URL}/api/gifts/admin/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast(`Gift "${name}" removed!`, 'success');
        fetchAllData();
      } else {
        showToast('Failed to delete gift', 'error');
      }
    } catch {
      showToast('Network error deleting gift', 'error');
    }
  };

  // ==================== COIN PACKAGE ACTIONS ====================
  const handleCreateCoinPackage = async () => {
    if (!coinPackageForm.coins || coinPackageForm.coins <= 0) {
      showToast('Coin amount must be greater than 0', 'error');
      return;
    }
    if (!coinPackageForm.amountUSD || coinPackageForm.amountUSD <= 0) {
      showToast('USD price must be greater than 0', 'error');
      return;
    }
    try {
      const res = await apiFetch(`${BACKEND_URL}/api/coin-packages/admin/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: coinPackageForm.name || `${coinPackageForm.coins} Coin Pack`,
          coins: Number(coinPackageForm.coins),
          bonusCoins: Number(coinPackageForm.bonusCoins) || 0,
          totalCoins: Number(coinPackageForm.coins) + (Number(coinPackageForm.bonusCoins) || 0),
          amountUSD: Number(coinPackageForm.amountUSD),
          amountSAR: Number((Number(coinPackageForm.amountUSD) * USD_TO_SAR_RATE).toFixed(2)),
          badge: coinPackageForm.badge || null,
          popular: coinPackageForm.popular,
          isActive: true,
        }),
      });
      if (res.ok) {
        showToast('Coin package added and synced to recharge website! 🪙', 'success');
        setShowAddCoinPackageModal(false);
        setCoinPackageForm({ name: '', coins: 1000, bonusCoins: 100, amountUSD: 10, badge: '', popular: false });
        fetchAllData();
      } else {
        showToast('Failed to add coin package', 'error');
      }
    } catch {
      showToast('Network error adding coin package', 'error');
    }
  };

  const handleUpdateCoinPackage = async () => {
    if (!editingCoinPackage) return;
    if (editingCoinPackage.amountUSD <= 0) {
      showToast('USD price must be greater than 0', 'error');
      return;
    }
    try {
      const res = await apiFetch(`${BACKEND_URL}/api/coin-packages/admin/${editingCoinPackage.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingCoinPackage.name,
          coins: Number(editingCoinPackage.coins),
          bonusCoins: Number(editingCoinPackage.bonusCoins) || 0,
          totalCoins: Number(editingCoinPackage.coins) + (Number(editingCoinPackage.bonusCoins) || 0),
          amountUSD: Number(editingCoinPackage.amountUSD),
          badge: editingCoinPackage.badge || null,
          popular: editingCoinPackage.popular,
        }),
      });
      if (res.ok) {
        showToast('Coin package updated and synced to recharge website! 🪙', 'success');
        setEditingCoinPackage(null);
        fetchAllData();
      } else {
        showToast('Failed to update coin package', 'error');
      }
    } catch {
      showToast('Network error updating coin package', 'error');
    }
  };

  const handleToggleCoinPackage = async (pkg: CoinPackageItem) => {
    try {
      const res = await apiFetch(`${BACKEND_URL}/api/coin-packages/admin/${pkg.id}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !(pkg.isActive ?? true) }),
      });
      if (res.ok) {
        const nextState = !(pkg.isActive ?? true);
        showToast(`Package "${pkg.name || pkg.id}" ${nextState ? 'enabled ✅' : 'disabled ⛔'}`, nextState ? 'success' : 'info');
        setCoinPackages((prev) =>
          prev.map((p) => (p.id === pkg.id ? { ...p, isActive: nextState } : p))
        );
      } else {
        showToast('Failed to toggle coin package', 'error');
      }
    } catch {
      showToast('Network error toggling coin package', 'error');
    }
  };

  const handleDeleteCoinPackage = async (id: string, name?: string) => {
    if (!confirm(`Delete coin package "${name || id}"? This will remove it from the recharge website.`)) return;
    try {
      const res = await apiFetch(`${BACKEND_URL}/api/coin-packages/admin/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast(`Coin package "${name || id}" deleted!`, 'success');
        setCoinPackages((prev) => prev.filter((p) => p.id !== id));
        fetchAllData();
      } else {
        showToast('Failed to delete coin package', 'error');
      }
    } catch {
      showToast('Network error deleting coin package', 'error');
    }
  };

  // ==================== GAME CONFIG ACTIONS ====================
  const handleToggleGame = async (game: GameConfigItem) => {
    try {
      const res = await apiFetch(`${BACKEND_URL}/api/games/admin/${game.id}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const nextState = !game.isEnabled;
        showToast(`Game "${game.name}" ${nextState ? 'enabled ✅' : 'disabled ⛔'}`, nextState ? 'success' : 'info');
        setGames((prev) => prev.map((g) => (g.id === game.id ? { ...g, isEnabled: nextState } : g)));
      } else {
        showToast('Failed to toggle game', 'error');
      }
    } catch {
      showToast('Network error toggling game', 'error');
    }
  };

  const handleOpenEditGame = (game: GameConfigItem) => {
    setEditingGame(game);
    setGameForm({
      isEnabled: game.isEnabled,
      minVipLevel: game.minVipLevel ?? 0,
      minUserLevel: game.minUserLevel ?? 1,
      minBet: game.minBet ?? 10,
      maxBet: game.maxBet ?? 10000,
      allowInLive: game.allowInLive ?? true,
      allowInVoice: game.allowInVoice ?? true,
      allowStandalone: game.allowStandalone ?? true,
    });
  };

  const handleSaveGame = async () => {
    if (!editingGame) return;
    if (gameForm.minUserLevel > gameForm.minVipLevel && gameForm.minVipLevel > 0) {
      showToast('Note: games require BOTH the user level and VIP level to be met.', 'info');
    }
    try {
      const res = await apiFetch(`${BACKEND_URL}/api/games/admin/${editingGame.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isEnabled: gameForm.isEnabled,
          minVipLevel: Number(gameForm.minVipLevel),
          minUserLevel: Number(gameForm.minUserLevel),
          minBet: Number(gameForm.minBet),
          maxBet: Number(gameForm.maxBet),
          allowInLive: gameForm.allowInLive,
          allowInVoice: gameForm.allowInVoice,
          allowStandalone: gameForm.allowStandalone,
        }),
      });
      if (res.ok) {
        showToast(`Game "${editingGame.name}" settings saved! 🎮`, 'success');
        setEditingGame(null);
        fetchAllData();
      } else {
        showToast('Failed to save game settings', 'error');
      }
    } catch {
      showToast('Network error saving game settings', 'error');
    }
  };

  // ==================== VERIFICATION BADGE ACTIONS ====================
  const handleToggleVerification = async (user: UserItem) => {
    const nextState = !user.isVerified;
    let label = user.verifiedLabel || 'Verified';
    if (nextState) {
      const input = window.prompt(
        `Verification label for ${user.displayName} (e.g. Official, Verified Host, Agency):`,
        label,
      );
      if (input === null) return; // cancelled
      label = input.trim() || 'Verified';
    }
    try {
      const res = await apiFetch(`${BACKEND_URL}/api/users/admin/${user.id}/verification`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isVerified: nextState, verifiedLabel: label }),
      });
      if (res.ok) {
        showToast(
          nextState
            ? `✅ ${user.displayName} is now verified (${label}).`
            : `Verification badge removed from ${user.displayName}.`,
          nextState ? 'success' : 'info',
        );
        setUsers((prev) =>
          prev.map((u) =>
            u.id === user.id
              ? { ...u, isVerified: nextState, verifiedLabel: nextState ? label : undefined }
              : u,
          ),
        );
      } else {
        showToast('Failed to update verification badge', 'error');
      }
    } catch {
      showToast('Network error updating verification badge', 'error');
    }
  };

  // ==================== VIP TIER & PRIVILEGE ACTIONS ====================
  const handleSaveVipConfig = async (config: any) => {
    try {
      const res = await apiFetch(`${BACKEND_URL}/api/levels/${config.level}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        showToast(`VIP Tier ${config.level} configuration saved! 👑`, 'success');
        setEditingVipLevel(null);
        fetchAllData();
      } else {
        showToast('Failed to update VIP configuration', 'error');
      }
    } catch {
      showToast('Network error saving VIP config', 'error');
    }
  };

  const handleRunMonthlyVipEvaluation = async () => {
    setIsEvaluatingVip(true);
    try {
      const res = await apiFetch(`${BACKEND_URL}/api/levels/monthly-evaluation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Monthly evaluation complete! ${data.evaluatedCount || 0} users evaluated with single-step downgrade cushion. 🛡️`, 'success');
        fetchAllData();
      } else {
        showToast(data.message || 'Evaluation failed', 'error');
      }
    } catch {
      showToast('Error executing monthly VIP evaluation', 'error');
    } finally {
      setIsEvaluatingVip(false);
    }
  };

  const handleSaveUserVip = async () => {
    if (!vipUserModal) return;
    try {
      const res = await apiFetch(`${BACKEND_URL}/api/levels/admin/set-user-vip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: vipUserModal.id,
          vipLevel: Number(vipUserForm.vipLevel),
          rechargeUSD: Number(vipUserForm.rechargeUSD) || 0,
          reason: 'ADMIN_MANUAL_OVERRIDE',
        }),
      });

      const trimmedCustomId = vipUserForm.customId ? vipUserForm.customId.trim() : '';
      if (trimmedCustomId !== (vipUserModal.customId || '')) {
        const cidRes = await apiFetch(`${BACKEND_URL}/api/users/admin/${vipUserModal.id}/custom-id`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customId: trimmedCustomId }),
        });
        if (!cidRes.ok) {
          const cidErr = await cidRes.json().catch(() => ({}));
          showToast(cidErr.message || 'Custom ID could not be saved', 'error');
          return;
        }
      }

      if (res.ok) {
        showToast(`VIP status updated for @${vipUserModal.username}! 🌟`, 'success');
        setVipUserModal(null);
        fetchAllData();
      } else {
        const err = await res.json();
        showToast(err.message || 'Failed to update user VIP', 'error');
      }
    } catch {
      showToast('Network error updating user VIP', 'error');
    }
  };

  const handleTestVipEntrance = async (lvl: number) => {
    try {
      const res = await apiFetch(`${BACKEND_URL}/api/levels/test-entrance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'admin_test',
          userName: 'Admin VIP Preview',
          level: lvl,
          roomId: 'global_preview',
        }),
      });
      if (res.ok) {
        showToast(`VIP ${lvl} room entrance effect broadcasted to active streams! 🚀`, 'success');
      } else {
        showToast('Failed to trigger entrance effect', 'error');
      }
    } catch {
      showToast('Network error triggering VIP entrance', 'error');
    }
  };

  const handleTestVipCelebration = async (lvl: number) => {
    try {
      const res = await apiFetch(`${BACKEND_URL}/api/levels/test-celebration`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'admin_test',
          targetLevel: lvl,
        }),
      });
      if (res.ok) {
        showToast(`VIP ${lvl} level-up celebration broadcasted to connected apps! 🎉`, 'success');
      } else {
        showToast('Failed to trigger celebration effect', 'error');
      }
    } catch {
      showToast('Network error triggering celebration', 'error');
    }
  };

  // ==================== RESELLER ACTIONS ====================
  const handleCreateReseller = async () => {
    if (!resellerForm.businessName.trim() || !resellerForm.whatsappNumber.trim()) {
      showToast('Business Name and WhatsApp Number are required', 'error');
      return;
    }
    try {
      const res = await apiFetch(`${BACKEND_URL}/api/resellers/admin/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resellerForm),
      });
      if (res.ok) {
        showToast(`Vendor "${resellerForm.businessName}" registered!`, 'success');
        setShowAddResellerModal(false);
        setResellerForm({ businessName: '', whatsappNumber: '', coinStock: 2000000, region: 'Global', badgeTitle: 'Authorized Vendor' });
        fetchAllData();
      } else {
        showToast('Failed to register vendor', 'error');
      }
    } catch {
      showToast('Network error registering vendor', 'error');
    }
  };

  const handleUpdateReseller = async () => {
    if (!editingReseller) return;
    try {
      const res = await apiFetch(`${BACKEND_URL}/api/resellers/admin/${editingReseller.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingReseller),
      });
      if (res.ok) {
        showToast(`Vendor "${editingReseller.businessName}" updated!`, 'success');
        setEditingReseller(null);
        fetchAllData();
      } else {
        showToast('Failed to update vendor', 'error');
      }
    } catch {
      showToast('Network error updating vendor', 'error');
    }
  };

  const handleDeleteReseller = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove coin vendor "${name}"?`)) return;
    try {
      const res = await apiFetch(`${BACKEND_URL}/api/resellers/admin/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast(`Vendor "${name}" removed!`, 'success');
        fetchAllData();
      } else {
        showToast('Failed to delete vendor', 'error');
      }
    } catch {
      showToast('Network error deleting vendor', 'error');
    }
  };

  const handleTopupReseller = async (id: string) => {
    try {
      await apiFetch(`${BACKEND_URL}/api/resellers/admin/${id}/topup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 1000000 }),
      });
      showToast('+1,000,000 Coins credited to vendor stock!', 'success');
      fetchAllData();
    } catch {
      showToast('Error topping up reseller stock', 'error');
    }
  };

  // ==================== AGENCY ACTIONS ====================
  const handleCreateAgency = async () => {
    if (!agencyForm.name.trim() || !agencyForm.code.trim()) {
      showToast('Agency Name and Code are required', 'error');
      return;
    }
    try {
      const res = await apiFetch(`${BACKEND_URL}/api/agencies/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(agencyForm),
      });
      if (res.ok) {
        const createdAgency = await res.json();
        showToast(`Agency "${agencyForm.name}" registered successfully!`, 'success');
        setShowAddAgencyModal(false);
        setAgencyForm({ name: '', code: '', managerEmail: '', whatsappNumber: '+91 ', commissionPercent: 13, password: '' });
        setShowNewAgencyCreatedModal(createdAgency);
        fetchAllData();
      } else {
        showToast('Failed to register agency', 'error');
      }
    } catch {
      showToast('Network error registering agency', 'error');
    }
  };

  const handleOpenRechargeCoins = (agency: AgencyItem) => {
    setSelectedAgencyForCoins(agency);
    setRechargeCoinsAmount('50000');
    setRechargeCoinsNotes('Super Admin official allocation');
    setShowRechargeAgencyCoinsModal(true);
  };

  const handleSaveRechargeCoins = async () => {
    if (!selectedAgencyForCoins) return;
    const amount = parseInt(rechargeCoinsAmount, 10);
    if (isNaN(amount) || amount <= 0) {
      showToast('Please enter a valid coin recharge amount greater than 0', 'error');
      return;
    }
    try {
      const res = await apiFetch(`${BACKEND_URL}/api/agencies/admin/${selectedAgencyForCoins.id}/coins/recharge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, notes: rechargeCoinsNotes }),
      });
      if (res.ok) {
        const data = await res.json();
        showToast(`+${amount.toLocaleString()} Coins deposited to ${selectedAgencyForCoins.name}!`, 'success');
        setShowRechargeAgencyCoinsModal(false);
        setSelectedAgencyForCoins(null);
        setAgencies((prev) =>
          prev.map((ag) => ag.id === data.agencyId ? { ...ag, coinBalance: data.coinBalance } : ag)
        );
        fetchAllData();
      } else {
        showToast('Failed to recharge agency coins', 'error');
      }
    } catch {
      showToast('Network error recharging coins', 'error');
    }
  };

  const handleOpenResetPassword = (agency: AgencyItem) => {
    setSelectedAgencyForCoins(agency);
    setNewAgencyPasswordInput(agency.password || `Agency@${Math.floor(1000 + Math.random() * 9000)}`);
    setShowResetAgencyPasswordModal(true);
  };

  const handleSaveResetPassword = async () => {
    if (!selectedAgencyForCoins || !newAgencyPasswordInput.trim()) return;
    try {
      const res = await apiFetch(`${BACKEND_URL}/api/agencies/admin/${selectedAgencyForCoins.id}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newAgencyPasswordInput.trim() }),
      });
      if (res.ok) {
        showToast(`Password updated for "${selectedAgencyForCoins.name}"! 🔑`, 'success');
        setAgencies((prev) =>
          prev.map((ag) => ag.id === selectedAgencyForCoins.id ? { ...ag, password: newAgencyPasswordInput.trim() } : ag)
        );
        setShowResetAgencyPasswordModal(false);
        setSelectedAgencyForCoins(null);
      } else {
        showToast('Failed to update password', 'error');
      }
    } catch {
      showToast('Network error updating password', 'error');
    }
  };

  const copyToClipboardSafe = (text: string, successMsg?: string) => {
    let copied = false;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text);
        copied = true;
      }
    } catch {}

    if (!copied && typeof document !== 'undefined') {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-999999px';
        textarea.style.top = '-999999px';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        copied = document.execCommand('copy');
        textarea.remove();
      } catch {}
    }

    if (copied) {
      showToast(successMsg || 'Credentials copied! Ready to share on WhatsApp. 📋', 'success');
    } else {
      window.prompt('Copy credentials to clipboard: Ctrl+C, Enter', text);
    }
  };

  const handleCopyAgencyCredentials = (agency: AgencyItem) => {
    const text = `🌟 LIVE 2030 TALENT AGENCY PORTAL CREDENTIALS\n\nAgency Name: ${agency.name}\nAgency Code: ${agency.code}\nManager Email: ${agency.managerEmail}\nWhatsApp Contact: ${agency.whatsappNumber || '+91 98765 43210'}\nLogin Password: ${agency.password || 'Agency@2026'}\n\n👉 Official Agency Portal URL:\nhttp://13.51.73.60:3000/agency\n\n(Log in using your Agency Code & Password to manage coins, hosts, and transfer coins directly to users)`;
    copyToClipboardSafe(text, `Credentials for "${agency.name}" copied! Ready to paste in WhatsApp. 📋`);
  };

  const handleSwitchToAgencyPortal = async (agency: AgencyItem) => {
    setAgencySession(agency);
    setPortalMode('agency');
    try {
      const res = await apiFetch(`${BACKEND_URL}/api/agencies/${agency.id}/coin-transfers`);
      if (res.ok) setAgencyCoinTransfers(await res.json());
      const hostsRes = await apiFetch(`${BACKEND_URL}/api/agencies/${agency.id}/hosts`);
      if (hostsRes.ok) setAgencyHosts(await hostsRes.json());
    } catch {}
    showToast(`Switched to "${agency.name}" Agency Portal! 🏢`, 'info');
  };

  const handleAgencyLogin = async () => {
    if (!agencyLoginCodeOrEmail.trim() || !agencyLoginPassword.trim()) {
      showToast('Please enter your Agency Code/Email and Password', 'error');
      return;
    }
    setAgencyLoginLoading(true);
    try {
      const res = await apiFetch(`${BACKEND_URL}/api/agencies/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codeOrEmail: agencyLoginCodeOrEmail.trim(),
          password: agencyLoginPassword.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAgencySession(data.agency);
        setPortalMode('agency');
        setShowAgencyLoginModal(false);
        setAgencyLoginCodeOrEmail('');
        setAgencyLoginPassword('');
        showToast(`Welcome back, ${data.agency.name}! 🌟`, 'success');
        try {
          const transfersRes = await apiFetch(`${BACKEND_URL}/api/agencies/${data.agency.id}/coin-transfers`);
          if (transfersRes.ok) setAgencyCoinTransfers(await transfersRes.json());
          const hostsRes = await apiFetch(`${BACKEND_URL}/api/agencies/${data.agency.id}/hosts`);
          if (hostsRes.ok) setAgencyHosts(await hostsRes.json());
        } catch {}
      } else {
        showToast(data.message || 'Invalid agency credentials', 'error');
      }
    } catch {
      showToast('Network error logging in as agency', 'error');
    } finally {
      setAgencyLoginLoading(false);
    }
  };

  const handleAgencyTransferCoins = async () => {
    if (!agencySession) return;
    const amount = parseInt(agencyTransferAmount, 10);
    if (isNaN(amount) || amount <= 0) {
      showToast('Please enter a valid coin amount greater than 0', 'error');
      return;
    }
    if (!agencyTransferTargetUser.trim()) {
      showToast('Please enter target User ID or Username', 'error');
      return;
    }

    const available = agencySession.coinBalance || 0;
    if (available < amount || available <= 0) {
      showToast('Coins are over in your agency wallet! Please recharge through Admin.', 'error');
      return;
    }

    setAgencyTransferLoading(true);
    try {
      const res = await apiFetch(`${BACKEND_URL}/api/agencies/${agencySession.id}/transfer-coins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserIdOrUsername: agencyTransferTargetUser.trim(),
          amount,
          notes: agencyTransferNotes.trim() || 'Agency coin distribution',
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Transferred ${amount.toLocaleString()} Coins to @${data.recipient?.username || agencyTransferTargetUser}! ✨`, 'success');
        setAgencySession((prev) => prev ? { ...prev, coinBalance: data.newAgencyCoinBalance } : prev);
        setAgencies((prev) =>
          prev.map((ag) => ag.id === agencySession.id ? { ...ag, coinBalance: data.newAgencyCoinBalance } : ag)
        );
        if (data.transfer) {
          setAgencyCoinTransfers((prev) => [data.transfer, ...prev]);
        }
        setAgencyTransferAmount('');
        setAgencyTransferTargetUser('');
        setAgencyTransferNotes('');
        fetchAllData();
      } else {
        showToast(data.message || 'Transfer failed. Check balance and user ID.', 'error');
      }
    } catch {
      showToast('Network error executing coin transfer', 'error');
    } finally {
      setAgencyTransferLoading(false);
    }
  };

  const handleUpdateAgency = async () => {
    if (!editingAgency) return;
    try {
      const res = await apiFetch(`${BACKEND_URL}/api/agencies/admin/${editingAgency.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingAgency),
      });
      if (res.ok) {
        showToast(`Agency "${editingAgency.name}" updated!`, 'success');
        setEditingAgency(null);
        fetchAllData();
      } else {
        showToast('Failed to update agency', 'error');
      }
    } catch {
      showToast('Network error updating agency', 'error');
    }
  };

  const handleDeleteAgency = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete agency "${name}"?`)) return;
    try {
      const res = await apiFetch(`${BACKEND_URL}/api/agencies/admin/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast(`Agency "${name}" deleted!`, 'success');
        fetchAllData();
      } else {
        showToast('Failed to delete agency', 'error');
      }
    } catch {
      showToast('Network error deleting agency', 'error');
    }
  };

  const handleOpenAdjustAgencyRevenue = (agency: AgencyItem) => {
    setSelectedAgencyForRevenue(agency);
    setAgencyRevenueInput(String(agency.walletBalanceUSD || 0));
    setAgencyRevenueNotes('');
    setShowAdjustAgencyRevenueModal(true);
  };

  const handleSaveAgencyRevenue = async () => {
    if (!selectedAgencyForRevenue) return;
    const amount = parseFloat(agencyRevenueInput);
    if (isNaN(amount) || amount < 0) {
      showToast('Please enter a valid positive revenue amount ($ USD)', 'error');
      return;
    }
    try {
      const res = await apiFetch(`${BACKEND_URL}/api/agencies/admin/${selectedAgencyForRevenue.id}/revenue`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revenueUSD: amount, notes: agencyRevenueNotes }),
      });
      if (res.ok) {
        showToast(`Agency "${selectedAgencyForRevenue.name}" wallet revenue set to $${amount.toFixed(2)} USD! 💼`, 'success');
        setShowAdjustAgencyRevenueModal(false);
        setSelectedAgencyForRevenue(null);
        fetchAllData();
      } else {
        showToast('Failed to update agency revenue balance', 'error');
      }
    } catch {
      showToast('Network error updating agency revenue', 'error');
    }
  };

  // ==================== STREAM ACTIONS ====================
  const handleCreateStream = async () => {
    try {
      const res = await apiFetch(`${BACKEND_URL}/api/rooms/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: streamForm.title,
          roomType: streamForm.roomType,
          category: streamForm.category,
          hostId: users.find(u => u.role === 'HOST')?.id || users[0]?.id || 'host-admin',
        }),
      });
      if (res.ok) {
        showToast('Live Broadcast Room launched!', 'success');
        setShowAddStreamModal(false);
        fetchAllData();
      } else {
        showToast('Failed to launch stream', 'error');
      }
    } catch {
      showToast('Network error launching stream', 'error');
    }
  };

  const handleKillStream = async (id: string) => {
    try {
      await apiFetch(`${BACKEND_URL}/api/rooms/${id}/end`, { method: 'POST' });
      showToast('Emergency Kill-Switch triggered: Stream closed!', 'success');
      setStreams(prev => prev.map(s => s.id === id ? { ...s, status: 'TERMINATED' } : s));
    } catch {
      showToast('Error executing stream termination', 'error');
    }
  };

  // ==================== REPORT ACTIONS ====================
  const handleActionReport = async (reportId: string, action: 'DISMISS' | 'WARN' | 'KILL_STREAM' | 'BAN_USER' | 'SUSPEND_24H' | 'SUSPEND_7D') => {
    try {
      await apiFetch(`${BACKEND_URL}/api/reports/admin/${reportId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notes: `Resolved by Super Admin with action ${action}` }),
      });
      showToast(`Report #${reportId} processed with action: [${action}]`, 'success');
      fetchAllData();
    } catch {
      showToast('Error acting on report', 'error');
    }
  };

  // ==================== WITHDRAWAL ACTIONS ====================
  const handleApproveWithdrawal = async (id: string) => {
    try {
      await apiFetch(`${BACKEND_URL}/api/withdrawals/${id}/approve`, { method: 'POST' });
      showToast('Withdrawal approved and funds disbursed!', 'success');
      setWithdrawals(prev => prev.filter(w => w.id !== id));
    } catch {
      showToast('Error approving withdrawal', 'error');
    }
  };

  const handleRejectWithdrawal = async (id: string) => {
    try {
      await apiFetch(`${BACKEND_URL}/api/withdrawals/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejectionReason: 'Compliance verification failed' }),
      });
      showToast('Withdrawal rejected and diamonds refunded.', 'info');
      setWithdrawals(prev => prev.filter(w => w.id !== id));
    } catch {
      showToast('Error rejecting withdrawal', 'error');
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    showToast(`Code copied to clipboard: ${code}`, 'info');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleSaveSupportContact = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSavingSupport(true);
    try {
      const res = await apiFetch(`${BACKEND_URL}/api/support/admin/contact`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(supportContact),
      });
      if (res.ok) {
        const updated = await res.json();
        setSupportContact(updated);
        showToast('Support Contact Details saved and broadcasted to mobile users! 🚀', 'success');
      } else {
        const err = await res.json().catch(() => null);
        showToast(err?.message || 'Failed to save support contact', 'error');
      }
    } catch {
      showToast('Network error saving support details', 'error');
    } finally {
      setIsSavingSupport(false);
    }
  };

  const navSections = [
    {
      group: 'OPERATIONS & PLATFORM',
      items: [
        { 
          id: 'overview', 
          label: 'Platform Overview', 
          icon: Activity, 
          description: 'Live KPIs & economic split matrix' 
        },
        { 
          id: 'streams', 
          label: 'Live Stream Monitor', 
          icon: Tv, 
          badge: `${streams.filter(s => s.status === 'LIVE').length} Live`,
          badgeColor: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
          description: 'Video channels & voice lounges' 
        },
      ]
    },
    {
      group: 'TRUST & COMMUNITY SAFETY',
      items: [
        { 
          id: 'users', 
          label: 'User Moderation', 
          icon: Users, 
          badge: `${users.length}`,
          badgeColor: 'bg-slate-800 text-slate-300',
          description: 'Search, ban/unban, suspensions' 
        },
        { 
          id: 'reports', 
          label: 'Safety Reports Queue', 
          icon: ShieldAlert, 
          badge: `${reports.filter(r => r.status === 'PENDING').length} Pending`,
          badgeColor: reports.filter(r => r.status === 'PENDING').length > 0 
            ? 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse' 
            : 'bg-slate-800 text-slate-400',
          description: 'Community guideline violations' 
        },
        { 
          id: 'moderation', 
          label: 'Content Moderation', 
          icon: ShieldAlert, 
          badge: 'Live',
          badgeColor: 'bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold',
          description: 'Hide / remove posts & warn users' 
        },
      ]
    },
    {
      group: 'COMMERCE & TALENT',
      items: [
        { 
          id: 'vip_features', 
          label: 'VIP Privilege & Tiers', 
          icon: Crown, 
          badge: '8 Tiers',
          badgeColor: 'bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold',
          description: 'VIP 1-8 tiers, monthly spend, perks & downgrade' 
        },
        { 
          id: 'agencies', 
          label: 'Talent Agencies', 
          icon: Building2, 
          badge: `${agencies.length}`,
          badgeColor: 'bg-pink-500/20 text-pink-400',
          description: 'Host rosters & invite codes' 
        },
        { 
          id: 'gifts', 
          label: 'Virtual Gifts Catalog', 
          icon: Gift, 
          badge: `${gifts.length}`,
          badgeColor: 'bg-indigo-500/20 text-indigo-400',
          description: 'Virtual catalog & coin pricing' 
        },
        { 
          id: 'coin_packages', 
          label: 'Coin Packages', 
          icon: Coins, 
          badge: `${coinPackages.filter(p => p.isActive !== false).length}/${coinPackages.length}`,
          badgeColor: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
          description: 'Recharge pricing, USD & enable/disable' 
        },
        { 
          id: 'games', 
          label: 'Games & Mini-Games', 
          icon: Gamepad2, 
          badge: `${games.filter(g => g.isEnabled).length}/${games.length}`,
          badgeColor: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
          description: 'Lucky Wheel, Yummy, level & VIP restrictions' 
        },
        { 
          id: 'payouts', 
          label: 'Payout Review Desk', 
          icon: DollarSign, 
          badge: `${withdrawals.length} Review`,
          badgeColor: withdrawals.length > 0 
            ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-bold' 
            : 'bg-slate-800 text-slate-400',
          description: 'Diamond host cash-outs' 
        },
        { 
          id: 'financial', 
          label: 'Financial & Reports', 
          icon: TrendingUp, 
          badge: 'Live',
          badgeColor: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold',
          description: 'Stream cuts & commission ledger' 
        },
      ]
    },
    {
      group: 'SUPPORT & HELPDESK',
      items: [
        {
          id: 'contact_support',
          label: 'Helpdesk & Support Info',
          icon: Headphones,
          badge: 'Live',
          badgeColor: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold',
          description: 'WhatsApp, email & hotline support desk'
        }
      ]
    },
    {
      group: 'ADMINISTRATION',
      items: [
        {
          id: 'staff',
          label: 'Staff & Roles',
          icon: UserCog,
          badge: `${staffList.length} Accounts`,
          badgeColor: 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 font-bold',
          description: 'Create staff logins & assign permissions'
        },
        {
          id: 'notifications',
          label: 'Broadcast Notifications',
          icon: Bell,
          badge: 'Push',
          badgeColor: 'bg-purple-500/20 text-purple-400 border border-purple-500/30 font-bold',
          description: 'Send in-app notifications to users'
        },
        {
          id: 'audit_log',
          label: 'Admin Audit Log',
          icon: FileText,
          badge: 'Security',
          badgeColor: 'bg-slate-500/20 text-slate-300 border border-slate-500/30',
          description: 'Immutable trail of staff actions'
        },
        {
          id: 'security',
          label: 'Security & 2FA',
          icon: ShieldCheck,
          badge: 'Account',
          badgeColor: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
          description: 'Two-factor authentication settings'
        }
      ]
    }
  ];

  const TAB_PERMISSIONS: Record<string, string> = {
    overview: 'overview.view',
    streams: 'live.view',
    users: 'users.view',
    reports: 'support.view',
    vip_features: 'vip.view',
    agencies: 'agencies.view',
    gifts: 'gifts.view',
    coin_packages: 'coin_packages.view',
    games: 'games.view',
    payouts: 'withdrawals.view',
    financial: 'financial.view',
    contact_support: 'support.manage',
    resellers: 'resellers.view',
    staff: 'staff.view',
    moderation: 'content.view',
    notifications: 'notifications.manage',
    audit_log: 'audit.view',
    security: 'staff.view',
  };

  const visibleNavSections = navSections.map((section) => ({
    ...section,
    items: section.items.filter((item: any) => {
      const required = TAB_PERMISSIONS[item.id];
      return !required || can(required);
    }),
  }));

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0D14] text-slate-400">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-semibold">Loading Admin Panel…</span>
        </div>
      </div>
    );
  }

  if (!adminToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0D14] px-4">
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-fuchsia-600 flex items-center justify-center shadow-2xl shadow-indigo-900/40 mb-4">
              <ShieldAlert className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">Live 2030 Admin</h1>
            <p className="text-xs text-slate-500 font-semibold mt-1">Staff &amp; Operations Control Panel</p>
          </div>

          <div className="bg-zinc-900/70 border border-white/10 rounded-3xl p-7 backdrop-blur-xl shadow-2xl">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Email or Username
            </label>
            <input
              type="text"
              value={loginIdentifier}
              onChange={(e) => setLoginIdentifier(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
              placeholder="admin@live2030.com"
              autoComplete="username"
              className="w-full bg-zinc-950/70 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 outline-none focus:border-indigo-500 transition mb-4"
            />

            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Password
            </label>
            <div className="relative mb-4">
              <input
                type={showLoginPassword ? 'text' : 'password'}
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full bg-zinc-950/70 border border-white/10 rounded-xl px-4 py-3 pr-11 text-sm text-white placeholder-slate-600 outline-none focus:border-indigo-500 transition"
              />
              <button
                type="button"
                onClick={() => setShowLoginPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {loginError && (
              <div className="flex items-center gap-2 bg-red-950/60 border border-red-500/40 text-red-300 text-xs font-semibold rounded-xl px-3 py-2.5 mb-4">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <button
              onClick={handleAdminLogin}
              disabled={isLoggingIn}
              className="w-full bg-gradient-to-r from-indigo-600 to-fuchsia-600 hover:from-indigo-500 hover:to-fuchsia-500 disabled:opacity-50 text-white font-bold text-sm rounded-xl py-3.5 transition shadow-lg shadow-indigo-900/40 flex items-center justify-center gap-2"
            >
              {isLoggingIn ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  <Key className="w-4 h-4" />
                  Sign in to Admin Panel
                </>
              )}
            </button>
          </div>

          <p className="text-center text-[11px] text-slate-600 mt-6">
            Access is restricted to authorized staff accounts only.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#0A0D14] text-slate-100 overflow-hidden font-sans antialiased">
      
      {/* GLOBAL TOAST NOTIFICATION */}
      {toast && (
        <div className="fixed top-5 right-5 z-[100] transition-all animate-bounce">
          <div className={`px-4 py-3 rounded-2xl shadow-2xl border flex items-center gap-3 backdrop-blur-md ${
            toast.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-300'
              : toast.type === 'error'
                  ? 'bg-red-950/90 border-red-500/50 text-red-300'
                  : 'bg-indigo-950/90 border-indigo-500/50 text-indigo-300'
          }`}>
            {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
            {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-red-400" />}
            {toast.type === 'info' && <Sparkles className="w-5 h-5 text-indigo-400" />}
            <span className="text-xs font-bold">{toast.message}</span>
            <button onClick={() => setToast(null)} className="text-slate-400 hover:text-white ml-2">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* MOBILE DRAWER BACKDROP */}
      {isMobileDrawerOpen && (
        <div 
          onClick={() => setIsMobileDrawerOpen(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 lg:hidden transition-opacity"
        />
      )}

      {/* NAVIGATION DRAWER / SIDEBAR */}
      <aside 
        className={`
          fixed inset-y-0 left-0 z-50 flex flex-col bg-[#0F1420] border-r border-slate-800/80 transition-all duration-300 ease-in-out
          lg:static lg:translate-x-0
          ${isMobileDrawerOpen ? 'translate-x-0 shadow-2xl w-72' : '-translate-x-full lg:translate-x-0'}
          ${isSidebarCollapsed ? 'lg:w-20' : 'lg:w-72'}
        `}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800/80">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 via-pink-500 to-amber-400 p-[2px] shrink-0 shadow-lg shadow-indigo-500/20">
              <div className="w-full h-full bg-[#0F1420] rounded-[14px] flex items-center justify-center">
                <Radio className="w-5 h-5 text-indigo-400 animate-pulse" />
              </div>
            </div>
            {(!isSidebarCollapsed || isMobileDrawerOpen) && (
              <div className="flex flex-col">
                <span className="font-black text-sm tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-100 to-slate-400">
                  LIVE 2030
                </span>
                <span className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider">
                  Super Admin
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* Collapse toggle (desktop) */}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="hidden lg:flex p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
            {/* Close button (mobile) */}
            <button
              onClick={() => setIsMobileDrawerOpen(false)}
              className="lg:hidden p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {visibleNavSections.map((section, idx) => (
            <div key={idx} className="space-y-1.5">
              {(!isSidebarCollapsed || isMobileDrawerOpen) && (
                <p className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-300">
                  {section.group}
                </p>
              )}
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id as any);
                        setIsMobileDrawerOpen(false);
                      }}
                      title={isSidebarCollapsed && !isMobileDrawerOpen ? item.label : undefined}
                      className={`
                        w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition group relative
                        ${isActive 
                          ? 'bg-gradient-to-r from-indigo-600/90 to-indigo-700 text-white shadow-lg shadow-indigo-600/25' 
                          : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'}
                        ${isSidebarCollapsed && !isMobileDrawerOpen ? 'justify-center' : ''}
                      `}
                    >
                      <Icon className={`w-4 h-4 shrink-0 transition ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-400'}`} />
                      
                      {(!isSidebarCollapsed || isMobileDrawerOpen) && (
                        <div className="flex-1 flex items-center justify-between min-w-0">
                          <span className="truncate text-left">{item.label}</span>
                          {item.badge && (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${item.badgeColor}`}>
                              {item.badge}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Active indicator bar */}
                      {isActive && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-white rounded-r-full" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* User Card in Footer */}
        <div className="p-3 border-t border-slate-800/80 bg-[#0A0D14]/50">
          <div className={`flex items-center gap-3 p-2 rounded-xl bg-slate-900/60 border border-slate-800 ${isSidebarCollapsed && !isMobileDrawerOpen ? 'justify-center' : ''}`}>
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-xs text-white shrink-0">
              SA
            </div>
            {(!isSidebarCollapsed || isMobileDrawerOpen) && (
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-white truncate">{adminUser?.displayName || adminUser?.username || 'Super Admin'}</p>
                <p className="text-[10px] text-emerald-400 truncate flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" /> {adminUser?.email || 'staff@live2030.com'}
                </p>
                <button
                  onClick={handleAdminLogout}
                  className="mt-1.5 w-full text-left text-[10px] font-bold text-slate-500 hover:text-rose-400 transition flex items-center gap-1"
                >
                  <LogOut className="w-3 h-3" /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Top App Bar */}
        <header className="h-16 bg-[#0F1420]/90 backdrop-blur-md border-b border-slate-800/80 flex items-center justify-between px-4 lg:px-8 shrink-0 z-10">
          <div className="flex items-center gap-3">
            {/* Hamburger Button for Mobile Drawer */}
            <button
              onClick={() => setIsMobileDrawerOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Breadcrumb Trail */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 hidden sm:inline">Admin Console</span>
              <span className="text-slate-400 hidden sm:inline">/</span>
              <span className="font-bold text-white capitalize">
                {activeTab === 'overview' && 'Executive Overview & Financial Split'}
                {activeTab === 'users' && 'User Moderation & Account Console'}
                {activeTab === 'reports' && 'Trust & Safety Violation Reports'}
                {activeTab === 'streams' && 'Live Stream & Voice Party Monitor'}
                {activeTab === 'resellers' && 'Official Coin Reseller Merchant Directory'}
                {activeTab === 'agencies' && 'Certified Talent Agencies & Rosters'}
                {activeTab === 'gifts' && 'Virtual Gifts Catalog Management'}
                {activeTab === 'coin_packages' && 'Coin Packages & Recharge Pricing Management'}
                {activeTab === 'games' && 'Mini-Games Governance (Lucky Wheel, Yummy & More)'}
                {activeTab === 'payouts' && 'Host Diamond Cash-Out Review Desk'}
                {activeTab === 'financial' && 'Financial Engine, Stream Cuts & Commission Reports'}
                {activeTab === 'contact_support' && 'Helpdesk & Official Support Contact Management'}
    {activeTab === 'vip_features' && 'VIP Privilege & Tier Governance (8 Independent Tiers)'}
    {activeTab === 'staff' && 'Staff Accounts & Role-Based Access Control'}
    {activeTab === 'moderation' && 'Content Moderation & User Warnings'}
    {activeTab === 'notifications' && 'Broadcast In-App Notifications'}
    {activeTab === 'audit_log' && 'Admin Audit Trail'}
    {activeTab === 'security' && 'Account Security & Two-Factor Authentication'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Backend Target Selector */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs">
              <button
                onClick={() => switchBackend('http://13.51.73.60:4000')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition font-semibold text-[11px] ${
                  currentBackendUrl.includes('13.51.73.60')
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Connect to Live AWS Cloud Database (Real Mobile App Users)"
              >
                <span className={`w-2 h-2 rounded-full ${backendHealth === 'CONNECTED' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                <span>AWS Live (13.51.73.60)</span>
              </button>
              <button
                onClick={() => switchBackend('http://localhost:4000')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition font-semibold text-[11px] ${
                  currentBackendUrl.includes('localhost')
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Connect to Localhost Dev Backend"
              >
                <span className={`w-2 h-2 rounded-full ${currentBackendUrl.includes('localhost') ? (backendHealth === 'CONNECTED' ? 'bg-emerald-400' : 'bg-rose-500') : 'bg-slate-600'}`} />
                <span>Local (4000)</span>
              </button>
            </div>

            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-[11px]">
              <span className={`w-2 h-2 rounded-full ${isWsConnected ? 'bg-emerald-400 animate-ping' : (backendHealth === 'CONNECTED' ? 'bg-emerald-400' : 'bg-rose-500')}`} />
              <span className={isWsConnected ? 'text-emerald-400 font-bold flex items-center gap-1' : 'text-slate-400'}>
                {isWsConnected ? <><Zap className="w-3 h-3 text-emerald-400 fill-emerald-400" /> WebSocket Live</> : (backendHealth === 'CONNECTED' ? 'Polling 5s' : 'Offline')}
              </span>
            </div>

            <button
              onClick={fetchAllData}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition text-xs flex items-center gap-1.5"
              title="Refresh Data"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Refresh</span>
            </button>

            {/* Globalization Language Switcher */}
            <LanguageSwitcher />
          </div>
        </header>

        {/* Scrollable Viewport */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-6 bg-[#0A0D14]">

          {/* ========================================================= */}
          {/* DEDICATED TALENT AGENCY MANAGER PORTAL VIEW               */}
          {/* ========================================================= */}
          {portalMode === 'agency' && (
            <div className="space-y-6">
              {!agencySession ? (
                /* AGENCY LOGIN SCREEN (When not authenticated) */
                <div className="max-w-md mx-auto my-12 bg-[#111827] border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
                  <div className="text-center space-y-2">
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-pink-500 to-amber-400 p-[2px] shadow-lg shadow-pink-500/20">
                      <div className="w-full h-full bg-[#0F1420] rounded-[14px] flex items-center justify-center">
                        <Building2 className="w-7 h-7 text-pink-400" />
                      </div>
                    </div>
                    <h2 className="text-xl font-black text-white">Talent Agency Manager Portal</h2>
                    <p className="text-xs text-slate-400">
                      Enter your official agency credentials to manage coins, distribute to broadcasters, and view host revenue.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-slate-300 mb-1.5 block">Agency Code or Manager Email</label>
                      <input
                        type="text"
                        value={agencyLoginCodeOrEmail}
                        onChange={(e) => setAgencyLoginCodeOrEmail(e.target.value)}
                        placeholder="e.g. XYZ or manager@agency.com"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-pink-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-300 mb-1.5 block">Agency Password</label>
                      <input
                        type="password"
                        value={agencyLoginPassword}
                        onChange={(e) => setAgencyLoginPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-pink-500 outline-none"
                      />
                    </div>

                    <button
                      onClick={handleAgencyLogin}
                      disabled={agencyLoginLoading}
                      className="w-full py-3 bg-gradient-to-r from-pink-600 to-pink-500 hover:from-pink-500 hover:to-pink-400 text-white font-extrabold text-xs rounded-xl transition shadow-lg shadow-pink-600/30 flex items-center justify-center gap-2"
                    >
                      {agencyLoginLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                      <span>Login to Agency Portal</span>
                    </button>

                    {/* Quick Demo Login Preset */}
                    {agencies.length > 0 && (
                      <div className="pt-3 border-t border-slate-800/80 text-center">
                        <span className="text-[11px] text-slate-400 block mb-2">Or quick test with registered agency:</span>
                        <div className="flex flex-wrap gap-2 justify-center">
                          {agencies.slice(0, 2).map((ag) => (
                            <button
                              key={ag.id}
                              onClick={() => {
                                setAgencyLoginCodeOrEmail(ag.code);
                                setAgencyLoginPassword(ag.password || 'Agency@2026');
                              }}
                              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 font-semibold"
                            >
                              Fill {ag.name} ({ag.code})
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* AUTHENTICATED AGENCY PORTAL VIEW */
                <div className="space-y-6">
                  {/* Agency Header Banner */}
                  <div className="p-6 rounded-3xl bg-gradient-to-r from-[#111827] via-slate-900 to-[#1e1b4b] border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-500 via-purple-500 to-indigo-500 p-[2px] shadow-xl shadow-pink-500/20">
                        <div className="w-full h-full bg-[#0F1420] rounded-[14px] flex items-center justify-center">
                          <Building2 className="w-7 h-7 text-pink-400" />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h1 className="text-xl font-black text-white">{agencySession.name}</h1>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-pink-500/20 text-pink-400 border border-pink-500/30">
                            CERTIFIED TALENT AGENCY
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1 flex items-center gap-3">
                          <span>Code: <strong className="text-white font-mono">{agencySession.code}</strong></span>
                          <span>•</span>
                          <span>Manager: <strong className="text-white">{agencySession.managerEmail}</strong></span>
                          <span>•</span>
                          <span>Commission Cut: <strong className="text-emerald-400 font-bold">{agencySession.commissionPercent}%</strong></span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <button
                        onClick={() => {
                          setAgencySession(null);
                          setPortalMode('admin');
                          showToast('Switched back to Super Admin Console', 'info');
                        }}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                      >
                        <LogOut className="w-3.5 h-3.5" /> Exit to Admin Console
                      </button>
                    </div>
                  </div>

                  {/* Top Agency KPI Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* AVAILABLE COIN WALLET CARD */}
                    <div className="p-5 rounded-2xl bg-gradient-to-b from-amber-950/40 to-slate-900 border border-amber-500/40 relative overflow-hidden">
                      <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Coins className="w-4 h-4" /> Available Agency Coins
                      </span>
                      <p className="text-3xl font-black text-amber-300 mt-2">
                        {(agencySession.coinBalance || 0).toLocaleString()} <span className="text-sm font-bold text-amber-400">🪙 Coins</span>
                      </p>
                      
                      {/* CRITICAL WARNING WHEN COINS ARE OVER */}
                      {(agencySession.coinBalance || 0) <= 0 ? (
                        <div className="mt-3 p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                          <span>Coins are over! Please contact Super Admin to recharge your agency inventory.</span>
                        </div>
                      ) : (
                        <p className="text-xs text-amber-300/80 mt-2 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Available to transfer to any user
                        </p>
                      )}
                    </div>

                    {/* AGENCY WALLET REVENUE ($ USD) */}
                    <div className="p-5 rounded-2xl bg-gradient-to-b from-emerald-950/40 to-slate-900 border border-emerald-500/40 relative overflow-hidden">
                      <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                        <DollarSign className="w-4 h-4" /> Agency Wallet Revenue
                      </span>
                      <p className="text-3xl font-black text-white mt-2">
                        ${(agencySession.walletBalanceUSD || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-sm font-bold text-emerald-400">USD</span>
                      </p>
                      <p className="text-xs text-slate-400 mt-2">
                        Earned from connected host diamond commissions ({agencySession.commissionPercent}% cut)
                      </p>
                    </div>

                    {/* CONNECTED BROADCASTERS */}
                    <div className="p-5 rounded-2xl bg-gradient-to-b from-indigo-950/40 to-slate-900 border border-indigo-500/40 relative overflow-hidden">
                      <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Users className="w-4 h-4" /> Connected Broadcasters
                      </span>
                      <p className="text-3xl font-black text-white mt-2">
                        {agencySession.totalHosts || agencyHosts.length || 0} <span className="text-sm font-bold text-indigo-400">Hosts</span>
                      </p>
                      <p className="text-xs text-cyan-400 mt-2">
                        {(agencySession.hostsTotalDiamonds || 0).toLocaleString()} 💎 Broadcaster Diamonds
                      </p>
                    </div>
                  </div>

                  {/* COIN DISTRIBUTION SECTION & TRANSFER HISTORY */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* LEFT (5 COLS): TRANSFER COINS TOOL */}
                    <div className="lg:col-span-5 bg-[#111827] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                        <h3 className="font-bold text-white text-base flex items-center gap-2">
                          <Send className="w-5 h-5 text-amber-400" /> Transfer Coins to User
                        </h3>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
                          Direct Wallet Credit
                        </span>
                      </div>

                      <p className="text-xs text-slate-400">
                        Transfer coins from your available agency balance directly into any broadcaster or viewer's wallet.
                      </p>

                      {/* NOTICE ABOUT ZERO COINS */}
                      {(agencySession.coinBalance || 0) <= 0 && (
                        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 font-medium">
                          <strong>⚠️ Agency Coin Wallet Empty:</strong> You have 0 coins left in your agency wallet. Agencies cannot add coins themselves. Please contact Platform Super Admin to recharge coins.
                        </div>
                      )}

                      <div className="space-y-3.5">
                        <div>
                          <label className="text-xs font-bold text-slate-300 mb-1 block">Recipient User ID or Username *</label>
                          <input
                            type="text"
                            value={agencyTransferTargetUser}
                            onChange={(e) => setAgencyTransferTargetUser(e.target.value)}
                            placeholder="e.g. user_104 or user UUID"
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-amber-400 outline-none"
                          />
                        </div>

                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className="text-xs font-bold text-slate-300">Amount of Coins *</label>
                            <span className="text-[10px] text-amber-400">Available: {(agencySession.coinBalance || 0).toLocaleString()} Coins</span>
                          </div>
                          <input
                            type="number"
                            value={agencyTransferAmount}
                            onChange={(e) => setAgencyTransferAmount(e.target.value)}
                            placeholder="e.g. 5000"
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-amber-400 outline-none font-bold"
                          />

                          {/* Quick Amount Buttons */}
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {['1000', '5000', '10000', '25000', '50000'].map((amt) => (
                              <button
                                key={amt}
                                type="button"
                                onClick={() => setAgencyTransferAmount(amt)}
                                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-slate-300"
                              >
                                +{parseInt(amt, 10).toLocaleString()}
                              </button>
                            ))}
                            {(agencySession.coinBalance || 0) > 0 && (
                              <button
                                type="button"
                                onClick={() => setAgencyTransferAmount(String(agencySession.coinBalance))}
                                className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-[11px] font-bold text-amber-300"
                              >
                                Max (All)
                              </button>
                            )}
                          </div>
                        </div>

                        <div>
                          <label className="text-xs font-bold text-slate-300 mb-1 block">Transfer Note / Reason (Optional)</label>
                          <input
                            type="text"
                            value={agencyTransferNotes}
                            onChange={(e) => setAgencyTransferNotes(e.target.value)}
                            placeholder="e.g. Weekly broadcast reward / Stream bonus"
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-amber-400 outline-none"
                          />
                        </div>

                        <button
                          onClick={handleAgencyTransferCoins}
                          disabled={agencyTransferLoading || (agencySession.coinBalance || 0) <= 0}
                          className={`w-full py-3 rounded-xl font-extrabold text-xs transition shadow-lg flex items-center justify-center gap-2 ${
                            (agencySession.coinBalance || 0) <= 0
                              ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                              : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-amber-500/20 cursor-pointer'
                          }`}
                        >
                          {agencyTransferLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                          <span>
                            {(agencySession.coinBalance || 0) <= 0
                              ? 'Coins Over — Recharge via Admin'
                              : 'Transfer Coins Directly to User Wallet'}
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* RIGHT (7 COLS): TRANSFER LEDGER */}
                    <div className="lg:col-span-7 bg-[#111827] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                        <h3 className="font-bold text-white text-base flex items-center gap-2">
                          <Activity className="w-5 h-5 text-indigo-400" /> Agency Coin Transfer Ledger
                        </h3>
                        <span className="text-xs text-slate-400">
                          {agencyCoinTransfers.length} Total Disbursements
                        </span>
                      </div>

                      <div className="overflow-x-auto max-h-[440px] overflow-y-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-900/80 text-slate-400 sticky top-0 uppercase tracking-wider text-[10px]">
                            <tr>
                              <th className="p-2.5">Date & Time</th>
                              <th className="p-2.5">Recipient User</th>
                              <th className="p-2.5">Coins Transferred</th>
                              <th className="p-2.5">Reason / Note</th>
                              <th className="p-2.5">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60">
                            {agencyCoinTransfers.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="p-8 text-center text-slate-500">
                                  No coin transfers executed yet. Use the transfer tool to credit user wallets.
                                </td>
                              </tr>
                            ) : (
                              agencyCoinTransfers.map((tx: any) => (
                                <tr key={tx.id} className="hover:bg-slate-800/30 transition">
                                  <td className="p-2.5 text-slate-400 text-[11px] whitespace-nowrap">
                                    {new Date(tx.timestamp).toLocaleString()}
                                  </td>
                                  <td className="p-2.5 font-bold text-white">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-amber-400">@</span>
                                      <span>{tx.targetUsername || tx.targetDisplayName || tx.targetUserId}</span>
                                    </div>
                                  </td>
                                  <td className="p-2.5 font-black text-amber-300 whitespace-nowrap">
                                    +{tx.amount.toLocaleString()} Coins
                                  </td>
                                  <td className="p-2.5 text-slate-400 text-[11px] max-w-xs truncate">
                                    {tx.notes || 'Agency distribution'}
                                  </td>
                                  <td className="p-2.5">
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                      SUCCESS
                                    </span>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* CONNECTED HOST TALENT ROSTER */}
                  <div className="bg-[#111827] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                      <h3 className="font-bold text-white text-base flex items-center gap-2">
                        <Users className="w-5 h-5 text-pink-400" /> Agency Broadcaster Roster
                      </h3>
                      <span className="text-xs text-slate-400">
                        {agencyHosts.length} Recruited Broadcasters
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider text-[10px]">
                          <tr>
                            <th className="p-3">Broadcaster Host</th>
                            <th className="p-3">Status</th>
                            <th className="p-3">Diamonds Earned</th>
                            <th className="p-3">Gross Stream Cut ($ USD)</th>
                            <th className="p-3">Commission Cut ({agencySession.commissionPercent}%)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {agencyHosts.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="p-8 text-center text-slate-500">
                                No hosts bound to this agency yet. Hosts can bind using agency invite code <strong>{agencySession.code}</strong>.
                              </td>
                            </tr>
                          ) : (
                            agencyHosts.map((h: any) => {
                              const diamonds = h.diamondsEarned || h.host?.wallet?.diamonds || 0;
                              const hostCutUSD = (diamonds * 0.01).toFixed(2);
                              const agencyCutUSD = ((diamonds * 0.01) * ((agencySession.commissionPercent || 13) / 100)).toFixed(2);

                              return (
                                <tr key={h.id || h.hostId} className="hover:bg-slate-800/30 transition">
                                  <td className="p-3 font-bold text-white">
                                    <div className="flex items-center gap-2">
                                      <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-pink-500 to-indigo-500 flex items-center justify-center text-white font-bold text-xs">
                                        {(h.hostDisplayName || h.hostUsername || 'H')[0].toUpperCase()}
                                      </div>
                                      <div>
                                        <p className="text-white text-xs font-bold">{h.hostDisplayName || h.hostUsername}</p>
                                        <p className="text-[10px] text-slate-400">@{h.hostUsername}</p>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="p-3">
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
                                      Active
                                    </span>
                                  </td>
                                  <td className="p-3 font-bold text-cyan-400">
                                    {diamonds.toLocaleString()} 💎
                                  </td>
                                  <td className="p-3 font-semibold text-slate-300">
                                    ${hostCutUSD} USD
                                  </td>
                                  <td className="p-3 font-bold text-emerald-400">
                                    ${agencyCutUSD} USD
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* SUPER ADMIN CONSOLE TABS (When in admin mode)             */}
          {/* ========================================================= */}
          {portalMode === 'admin' && activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Macro KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-gradient-to-b from-indigo-950/40 to-slate-900 border border-indigo-900/40 relative overflow-hidden">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Registered Accounts</span>
                  <p className="text-2xl font-black text-white mt-1">{users.length}</p>
                  <p className="text-xs text-indigo-400 mt-2 flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5" /> Synchronized with live database
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-gradient-to-b from-emerald-950/40 to-slate-900 border border-emerald-900/40 relative overflow-hidden">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Broadcasts</span>
                  <p className="text-2xl font-black text-white mt-1">{streams.filter(s => s.status === 'LIVE').length}</p>
                  <p className="text-xs text-emerald-400 mt-2 flex items-center gap-1">
                    <Radio className="w-3.5 h-3.5 animate-pulse" /> Agora WebRTC Channels Live
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-gradient-to-b from-amber-950/40 to-slate-900 border border-amber-900/40 relative overflow-hidden">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Authorized Resellers</span>
                  <p className="text-2xl font-black text-white mt-1">{resellers.length}</p>
                  <p className="text-xs text-amber-400 mt-2 flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5" /> WhatsApp merchant network
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-gradient-to-b from-pink-950/40 to-slate-900 border border-pink-900/40 relative overflow-hidden">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending Cash-Out Reviews</span>
                  <p className="text-2xl font-black text-white mt-1">{withdrawals.length}</p>
                  <p className="text-xs text-pink-400 mt-2 flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5" /> Diamond conversion requests
                  </p>
                </div>
              </div>

              {/* Revenue Sharing Matrix */}
              <div className="p-6 rounded-2xl bg-[#111827] border border-slate-800 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <h3 className="font-bold text-white text-base flex items-center gap-2">
                      <Sliders className="w-5 h-5 text-indigo-400" /> Platform Revenue Distribution Split
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Adjust economic division of virtual gift revenue between platform gross margin, creator talent, and agency commissions.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-xl text-xs font-bold border transition ${
                      platformShare + hostShare + agencyShare === 100
                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                        : 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                    }`}>
                      Total: {platformShare + hostShare + agencyShare}% / 100%
                    </span>
                    <button
                      onClick={handleSaveEconomics}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-indigo-600/30 flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" /> Save Matrix
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  {/* PLATFORM MARGIN */}
                  <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-300">Platform Gross Margin</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={platformShare}
                          onChange={(e) => {
                            isEditingEconomicsRef.current = true;
                            setIsEditingEconomics(true);
                            setPlatformShare(Number(e.target.value));
                          }}
                          className="w-14 bg-slate-950 border border-slate-700 rounded-lg px-2 py-0.5 text-xs text-right font-extrabold text-indigo-400 focus:outline-none focus:border-indigo-500"
                        />
                        <span className="text-xs font-extrabold text-indigo-400">%</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={platformShare}
                      onChange={(e) => {
                        isEditingEconomicsRef.current = true;
                        setIsEditingEconomics(true);
                        setPlatformShare(Number(e.target.value));
                      }}
                      className="w-full accent-indigo-500 cursor-pointer"
                    />
                    <p className="text-[11px] text-slate-500">Retained for Agora video bandwidth, AWS cloud hosting & engine costs.</p>
                  </div>

                  {/* HOST CREATOR DIAMONDS */}
                  <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-300">Host Streamer Diamond Earnings</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={hostShare}
                          onChange={(e) => {
                            isEditingEconomicsRef.current = true;
                            setIsEditingEconomics(true);
                            setHostShare(Number(e.target.value));
                          }}
                          className="w-14 bg-slate-950 border border-slate-700 rounded-lg px-2 py-0.5 text-xs text-right font-extrabold text-emerald-400 focus:outline-none focus:border-emerald-500"
                        />
                        <span className="text-xs font-extrabold text-emerald-400">%</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={hostShare}
                      onChange={(e) => {
                        isEditingEconomicsRef.current = true;
                        setIsEditingEconomics(true);
                        setHostShare(Number(e.target.value));
                      }}
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                    <p className="text-[11px] text-slate-500">Standard cash-out conversion benchmark: 100 Diamonds = $1.00 USD.</p>
                  </div>

                  {/* TALENT AGENCY COMMISSION */}
                  <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-300">Talent Agency Commission</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={agencyShare}
                          onChange={(e) => {
                            isEditingEconomicsRef.current = true;
                            setIsEditingEconomics(true);
                            setAgencyShare(Number(e.target.value));
                          }}
                          className="w-14 bg-slate-950 border border-slate-700 rounded-lg px-2 py-0.5 text-xs text-right font-extrabold text-pink-400 focus:outline-none focus:border-pink-500"
                        />
                        <span className="text-xs font-extrabold text-pink-400">%</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={agencyShare}
                      onChange={(e) => {
                        isEditingEconomicsRef.current = true;
                        setIsEditingEconomics(true);
                        setAgencyShare(Number(e.target.value));
                      }}
                      className="w-full accent-pink-500 cursor-pointer"
                    />
                    <p className="text-[11px] text-slate-500">Automatically credited to affiliated talent agencies upon stream gift events.</p>
                  </div>
                </div>
              </div>

              {/* REAL-TIME WEBSOCKET TELEMETRY & ACTIVITY FEED */}
              <div className="p-6 rounded-2xl bg-[#111827] border border-slate-800 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div>
                    <h3 className="font-bold text-white text-base flex items-center gap-2">
                      <Zap className="w-5 h-5 text-emerald-400 fill-emerald-400/30" /> Real-Time Live Activity & Telemetry Feed
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Direct streaming event bus from mobile app users, gift transactions, PK battle scoring, and broadcast lifecycles.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      {isWsConnected ? 'Socket /live Connected' : 'Reconnecting...'}
                    </span>
                  </div>
                </div>

                {liveEvents.length === 0 ? (
                  <div className="p-8 rounded-xl bg-slate-900/50 border border-dashed border-slate-800 text-center space-y-2">
                    <Radio className="w-8 h-8 text-indigo-400/50 mx-auto animate-pulse" />
                    <p className="text-xs font-semibold text-slate-300">Listening for real-time live events...</p>
                    <p className="text-[11px] text-slate-500">
                      When users send virtual gifts, initiate PK battles, or launch broadcasts from the mobile app, live telemetry cards will stream here instantly.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {liveEvents.map((evt) => (
                      <div
                        key={evt.id}
                        className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-3 hover:border-slate-700 transition"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className={`text-[10px] font-black px-2.5 py-1 rounded-full shrink-0 ${evt.badgeColor}`}>
                            {evt.badge}
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-white truncate">{evt.title}</p>
                            <p className="text-[11px] text-slate-400 truncate">{evt.subtitle}</p>
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono shrink-0 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" /> {evt.time}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: USER MANAGEMENT & MODERATION */}
          {portalMode === 'admin' && activeTab === 'users' && (
            <div className="space-y-4">
              <div className="bg-[#111827] border border-slate-800/80 rounded-2xl p-5">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-5">
                  <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <Shield className="w-5 h-5 text-indigo-400" /> Platform User Management & Moderation Console
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Manage user registry, create new members, edit details, adjust wallets, and enforce suspensions or bans.
                    </p>
                  </div>

                  {/* Top Bar Actions: Search, Filters, Add User */}
                  <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                    <div className="relative flex-1 sm:w-64">
                      <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Search username, ID, email..."
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <select
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value)}
                      className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="ALL">All Roles</option>
                      <option value="HOST">Hosts</option>
                      <option value="USER">Viewers</option>
                      <option value="COIN_RESELLER">Resellers</option>
                      <option value="AGENCY_ADMIN">Agencies</option>
                    </select>

                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="ALL">All Statuses</option>
                      <option value="ACTIVE">Active</option>
                      <option value="SUSPENDED_24H">24h Suspended</option>
                      <option value="SUSPENDED_7D">7d Suspended</option>
                      <option value="BANNED">Permanently Banned</option>
                    </select>

                    {/* ADD USER BUTTON */}
                    <button
                      onClick={() => setShowAddUserModal(true)}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition shadow-lg shadow-indigo-600/30 flex items-center gap-1.5"
                    >
                      <UserPlus className="w-4 h-4" /> Add User
                    </button>
                  </div>
                </div>

                {/* Users Table */}
                {(() => {
                  const filteredUsers = users.filter((u) => {
                    if (userSearch.trim()) {
                      const q = userSearch.trim().toLowerCase();
                      const match = 
                        (u.username && u.username.toLowerCase().includes(q)) ||
                        (u.displayName && u.displayName.toLowerCase().includes(q)) ||
                        (u.email && u.email.toLowerCase().includes(q)) ||
                        (u.id && u.id.toLowerCase().includes(q));
                      if (!match) return false;
                    }
                    if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
                    if (statusFilter !== 'ALL') {
                      if (statusFilter === 'ACTIVE') return u.status === 'ACTIVE';
                      if (statusFilter === 'BANNED') return u.status === 'BANNED' || u.isBanned;
                      if (statusFilter === 'SUSPENDED_24H') return u.status === 'SUSPENDED_24H';
                      if (statusFilter === 'SUSPENDED_7D') return u.status === 'SUSPENDED_7D';
                      return u.status === statusFilter;
                    }
                    return true;
                  });

                  return (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                            <th className="py-3 px-4">User Details</th>
                            <th className="py-3 px-4">Role</th>
                            <th className="py-3 px-4">Wallet Balance</th>
                            <th className="py-3 px-4">Moderation Status</th>
                            <th className="py-3 px-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-500">
                            No users found matching search query.
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((user) => {
                          const isBanned = user.status === 'BANNED';
                          const isSuspended = user.status.startsWith('SUSPENDED_');

                          return (
                            <tr key={user.id} className="hover:bg-slate-800/30 transition">
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-sm shrink-0">
                                    {user.displayName ? user.displayName[0] : 'U'}
                                  </div>
                                  <div>
                                    <p className="font-bold text-white flex items-center gap-1.5 flex-wrap">
                                      {user.displayName}
                                      {user.customId && (
                                        <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono text-[10px] font-bold">
                                          ID: {user.customId}
                                        </span>
                                      )}
                                      {user.isVerified && (
                                        <span
                                          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-sky-500/20 border border-sky-500/40 text-sky-300 font-bold text-[10px]"
                                          title={user.verifiedLabel || 'Verified'}
                                        >
                                          <ShieldCheck className="w-3 h-3 text-sky-400" /> {user.verifiedLabel || 'Verified'}
                                        </span>
                                      )}
                                      <span className="text-[10px] text-slate-500 font-mono">({user.id})</span>
                                    </p>
                                    <p className="text-[11px] text-slate-400">@{user.username} {user.email && `• ${user.email}`}</p>
                                    {user.agency ? (
                                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-pink-500/20 border border-pink-500/40 text-pink-300 font-bold text-[10px]">
                                          <Building2 className="w-3 h-3 text-pink-400" />
                                          {user.agency.name} ({user.agency.code})
                                        </span>
                                        <span className="text-[10px] text-pink-400 font-mono font-bold">
                                          {user.agency.commissionPercent}% Agency Cut
                                        </span>
                                      </div>
                                    ) : user.role === 'HOST' ? (
                                      <span className="mt-1 inline-block text-[10px] text-slate-500 font-medium">
                                        Independent Host (No Agency)
                                      </span>
                                    ) : null}
                                  </div>
                                </div>
                              </td>

                              <td className="py-3 px-4">
                                <div className="flex flex-col gap-1 items-start">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      user.role === 'HOST'
                                        ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                                        : user.role === 'COIN_RESELLER'
                                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                            : 'bg-slate-800 text-slate-300'
                                    }`}>
                                      {user.role}
                                    </span>
                                    {user.vipLevel && user.vipLevel > 0 ? (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                                        <Crown className="w-2.5 h-2.5" /> VIP {user.vipLevel}
                                      </span>
                                    ) : null}
                                  </div>
                                  {user.agency && (
                                    <span className="text-[10px] text-pink-400 font-semibold">
                                      🏢 Agency Affiliated
                                    </span>
                                  )}
                                </div>
                              </td>

                              <td className="py-3 px-4">
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-amber-400 font-bold flex items-center gap-1.5">
                                    <CoinIcon className="w-3.5 h-3.5" /> {(user.coins || 0).toLocaleString()}
                                  </span>
                                  <span className="text-cyan-400 text-[11px] flex items-center gap-1.5">
                                    <DiamondIcon className="w-3.5 h-3.5" /> {(user.diamonds || 0).toLocaleString()}
                                  </span>
                                </div>
                              </td>

                              <td className="py-3 px-4">
                                <div className="flex flex-col gap-1">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold w-max ${
                                    isBanned
                                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                      : isSuspended
                                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  }`}>
                                    {user.status}
                                  </span>
                                  {isSuspended && user.suspensionUntil && (
                                    <span className="text-[10px] text-amber-300 font-semibold flex items-center gap-1">
                                      <Clock className="w-3 h-3 text-amber-400" /> Until: {new Date(user.suspensionUntil).toLocaleDateString()} {new Date(user.suspensionUntil).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  )}
                                  {user.suspensionReason && (
                                    <span className="text-[10px] text-slate-400 italic truncate max-w-xs" title={user.suspensionReason}>
                                      {user.suspensionReason}
                                    </span>
                                  )}
                                </div>
                              </td>

                              <td className="py-3 px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {/* VIP CONTROLS */}
                                  <button
                                    onClick={() => {
                                      setVipUserModal(user);
                                      setVipUserForm({
                                        vipLevel: user.vipLevel || 0,
                                        rechargeUSD: 0,
                                        customId: user.customId || '',
                                      });
                                    }}
                                    className="px-2 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition text-[11px] font-bold flex items-center gap-1 shadow-sm"
                                    title="Manage VIP Tier, Recharge Credit & Vanity ID"
                                  >
                                    <Crown className="w-3 h-3 text-amber-400" /> VIP
                                  </button>

                                  {/* VERIFICATION BADGE */}
                                  <button
                                    onClick={() => handleToggleVerification(user)}
                                    className={`px-2 py-1 rounded-lg transition text-[11px] font-bold flex items-center gap-1 border shadow-sm ${
                                      user.isVerified
                                        ? 'bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border-sky-500/40'
                                        : 'bg-slate-800 hover:bg-sky-600 hover:text-white text-slate-300 border-slate-700'
                                    }`}
                                    title={user.isVerified ? 'Remove verification badge' : 'Add verification badge'}
                                  >
                                    <ShieldCheck className="w-3 h-3" /> {user.isVerified ? 'Verified' : 'Verify'}
                                  </button>

                                  {/* EDIT USER */}
                                  <button
                                    onClick={() => setEditingUser({ ...user })}
                                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-300 transition text-[11px] font-semibold"
                                    title="Edit User Details"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>

                                  {/* ADJUST WALLET */}
                                  <button
                                    onClick={() => handleOpenWalletModal(user)}
                                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition text-[11px] font-semibold"
                                    title="Adjust Wallet"
                                  >
                                    Wallet
                                  </button>

                                  {/* SUSPEND */}
                                  <button
                                    onClick={() => setSuspensionModalUser(user)}
                                    className="px-2 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 transition text-[11px] font-semibold"
                                  >
                                    Suspend
                                  </button>

                                  {/* BAN / UNBAN */}
                                  <button
                                    onClick={() => handleToggleUserBan(user)}
                                    className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition ${
                                      isBanned
                                        ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                                        : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                                    }`}
                                  >
                                    {isBanned ? 'Unban' : 'Ban'}
                                  </button>

                                  {/* DELETE USER */}
                                  <button
                                    onClick={() => handleDeleteUser(user.id, user.displayName || user.username)}
                                    className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/30 text-red-400 transition"
                                    title="Delete User Permanently"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* TAB 3: COMMUNITY SAFETY & REPORTS QUEUE */}
          {portalMode === 'admin' && activeTab === 'reports' && (
            <div className="space-y-4">
              <div className="bg-[#111827] border border-slate-800/80 rounded-2xl p-5">
                <div className="flex justify-between items-center mb-5">
                  <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <ShieldAlert className="w-5 h-5 text-red-400" /> Trust & Safety Community Reports Queue
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Audience-flagged live rooms, harassment reports, and policy violations awaiting moderation triage.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {reports.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 bg-slate-900/50 rounded-xl border border-slate-800">
                      No active community violation reports. Platform safety clean! ✨
                    </div>
                  ) : (
                    reports.map((report) => (
                      <div
                        key={report.id}
                        className={`p-4 rounded-xl border transition flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${
                          report.status === 'RESOLVED'
                            ? 'bg-slate-900/40 border-slate-800/40 opacity-70'
                            : 'bg-slate-900/90 border-slate-800'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                              report.category === 'PROFANITY_ILLEGAL_CONTENT'
                                ? 'bg-rose-500/30 text-rose-300 border border-rose-500/50 animate-pulse font-mono'
                                : report.category === 'HARASSMENT'
                                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                    : report.category === 'FRAUD'
                                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                        : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                            }`}>
                              {report.category}
                            </span>
                            <span className="text-xs text-white font-bold">Report #{report.id}</span>
                            <span className="text-[10px] text-slate-500">• Reported by {report.reporterName || 'Audience'}</span>
                          </div>

                          <p className="text-xs text-slate-200 mt-1 font-medium">
                            Target: <span className="font-bold text-white">{report.reportedUserName}</span> ({report.targetType}: {report.targetId})
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5 italic">"{report.reason}"</p>
                        </div>

                        {/* Action buttons */}
                        {report.status === 'PENDING' ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              onClick={() => handleActionReport(report.id, 'DISMISS')}
                              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                            >
                              Dismiss
                            </button>
                            <button
                              onClick={() => handleActionReport(report.id, 'WARN')}
                              className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold transition"
                            >
                              Warn
                            </button>
                            <button
                              onClick={() => handleActionReport(report.id, 'SUSPEND_24H')}
                              className="px-3 py-1.5 rounded-xl bg-amber-600/30 hover:bg-amber-600/40 text-amber-200 border border-amber-500/40 text-xs font-bold transition shadow-sm"
                            >
                              24h Suspend
                            </button>
                            <button
                              onClick={() => handleActionReport(report.id, 'SUSPEND_7D')}
                              className="px-3 py-1.5 rounded-xl bg-orange-600/30 hover:bg-orange-600/40 text-orange-200 border border-orange-500/40 text-xs font-bold transition shadow-sm"
                            >
                              7d Suspend
                            </button>
                            <button
                              onClick={() => handleActionReport(report.id, 'KILL_STREAM')}
                              className="px-3 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs font-semibold transition flex items-center gap-1.5"
                            >
                              <XCircle className="w-3.5 h-3.5" /> Kill Stream
                            </button>
                            <button
                              onClick={() => handleActionReport(report.id, 'BAN_USER')}
                              className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition shadow-lg shadow-red-600/30"
                            >
                              Ban User
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4" /> Resolved
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: LIVE STREAMS & VOICE PARTIES MONITOR */}
          {portalMode === 'admin' && activeTab === 'streams' && (
            <div className="space-y-4">
              <div className="bg-[#111827] border border-slate-800/80 rounded-2xl p-5">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
                  <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <Tv className="w-5 h-5 text-indigo-400" /> Active Broadcasts & Kill-Switch Control Desk
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Direct oversight of active Agora RTC video streams and 8-seat voice party lounges.
                    </p>
                  </div>
                  
                  {/* LAUNCH DEMO STREAM BUTTON */}
                  <button
                    onClick={() => setShowAddStreamModal(true)}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition shadow-lg shadow-indigo-600/30 flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" /> Launch Live Stream
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {streams.length === 0 ? (
                    <div className="col-span-full p-8 text-center text-slate-500 bg-slate-900/50 rounded-xl border border-slate-800">
                      No active live rooms online. Broadcasts launched from the mobile app will appear here in real time.
                    </div>
                  ) : (
                    streams.map((stream) => {
                      const isVoice = stream.roomType === 'VOICE';
                      const isTerminated = stream.status === 'TERMINATED';

                      return (
                        <div
                          key={stream.id}
                          className={`p-5 rounded-2xl border transition relative overflow-hidden ${
                            isTerminated
                              ? 'bg-slate-900/40 border-slate-800/40 opacity-60'
                              : 'bg-slate-900/90 border-slate-800'
                          }`}
                        >
                          <div className="flex justify-between items-start mb-3">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold flex items-center gap-1.5 ${
                              isTerminated
                                ? 'bg-slate-800 text-slate-500'
                                : isVoice
                                    ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                                    : 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse'
                            }`}>
                              {isTerminated ? 'CLOSED' : isVoice ? '🎙️ VOICE PARTY' : '📹 LIVE VIDEO'}
                            </span>

                            <span className="text-xs text-slate-400 flex items-center gap-1">
                              <Users className="w-3.5 h-3.5" /> {stream.currentViewers || 0}
                            </span>
                          </div>

                          <h3 className="font-bold text-white text-sm truncate">{stream.title}</h3>
                          <p className="text-xs text-slate-400 mt-1">Host: {stream.host?.displayName || 'Talent Broadcaster'}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5 font-mono">Channel: {stream.agoraChannelName}</p>

                          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                            <span className="text-xs text-cyan-400 font-bold">💎 {(stream.totalDiamondsEarned || 0).toLocaleString()}</span>

                            {!isTerminated && (
                              <button
                                onClick={() => handleKillStream(stream.id)}
                                className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl text-xs font-bold transition flex items-center gap-1"
                              >
                                <XCircle className="w-3.5 h-3.5" /> Kill Switch
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: COIN RESELLERS */}
          {portalMode === 'admin' && activeTab === 'resellers' && (
            <div className="space-y-4">
              <div className="bg-[#111827] border border-slate-800/80 rounded-2xl p-5">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
                  <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <Coins className="w-5 h-5 text-amber-400" /> Authorized Coin Reseller Network (WhatsApp Hub)
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Third-party bulk coin vendors authorized to sell coins directly to mobile users via local payments.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowAddResellerModal(true)}
                    className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-extrabold text-xs rounded-xl transition shadow-lg shadow-amber-600/30 flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" /> Register Vendor
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {resellers.length === 0 ? (
                    <div className="col-span-full p-8 text-center text-slate-500 bg-slate-900/50 rounded-xl border border-slate-800">
                      No coin resellers registered yet. Click &quot;+ Register Vendor&quot; to add an authorized merchant.
                    </div>
                  ) : (
                    resellers.map((reseller) => (
                    <div key={reseller.id} className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            {reseller.badgeTitle}
                          </span>
                          <span className="text-[11px] text-slate-400">{reseller.region}</span>
                        </div>
                        <h3 className="font-bold text-white text-sm">{reseller.businessName}</h3>
                        <p className="text-xs text-slate-400 mt-1">{reseller.whatsappNumber}</p>
                        <p className="text-xs text-amber-400 font-extrabold mt-2">Stock: {(reseller.coinStock || 0).toLocaleString()} <CoinIcon className="w-3.5 h-3.5 ml-1" /></p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => handleTopupReseller(reseller.id)}
                            className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg text-xs font-semibold transition"
                          >
                            +1M Coins Credit
                          </button>
                          <a
                            href={reseller.whatsappUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-emerald-400 hover:underline flex items-center gap-1"
                          >
                            WhatsApp <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                        
                        {/* EDIT & DELETE RESELLER */}
                        <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-800/40">
                          <button
                            onClick={() => setEditingReseller({ ...reseller })}
                            className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition flex items-center gap-1"
                          >
                            <Edit2 className="w-3 h-3" /> Edit
                          </button>
                          <button
                            onClick={() => handleDeleteReseller(reseller.id, reseller.businessName)}
                            className="px-2 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/30 text-red-400 text-xs font-semibold transition flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" /> Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  )))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: AGENCIES */}
          {portalMode === 'admin' && activeTab === 'agencies' && (
            <div className="space-y-4">
              <div className="bg-[#111827] border border-slate-800/80 rounded-2xl p-5">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
                  <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-pink-400" /> Talent Agency Management & Host Rosters
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Manage certified talent agencies, invitation codes, commission cuts, and view recruited broadcaster talent.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowAddAgencyModal(true)}
                    className="px-3.5 py-2 bg-pink-600 hover:bg-pink-500 text-white font-extrabold text-xs rounded-xl transition shadow-lg shadow-pink-600/30 flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" /> Register Agency
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {agencies.length === 0 ? (
                    <div className="col-span-full p-8 text-center text-slate-500 bg-slate-900/50 rounded-xl border border-slate-800">
                      No talent agencies registered yet. Click &quot;+ Register Agency&quot; to onboard an agency network.
                    </div>
                  ) : (
                    agencies.map((agency) => (
                    <div key={agency.id} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition">
                      <div>
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-bold text-white text-base flex items-center gap-1.5">
                              <Building2 className="w-4 h-4 text-pink-400" />
                              {agency.name}
                            </h3>
                            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                              <span>{agency.managerEmail}</span>
                              <span>•</span>
                              <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                                <Phone className="w-3 h-3" /> {agency.whatsappNumber || '+91 98765 43210'}
                              </span>
                            </div>
                          </div>
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-pink-500/20 text-pink-400 border border-pink-500/30">
                            {agency.commissionPercent}% Cut
                          </span>
                        </div>

                        {/* AGENCY WALLET & REVENUE KPI BOX */}
                        <div className="mt-3.5 p-3.5 bg-gradient-to-r from-emerald-950/40 via-slate-950 to-slate-900/90 rounded-xl border border-emerald-500/30">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                                <Coins className="w-3.5 h-3.5" /> Agency Wallet Revenue
                              </span>
                              <p className="text-xl font-black text-white mt-0.5">
                                ${(agency.walletBalanceUSD || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs font-bold text-emerald-400">USD</span>
                              </p>
                            </div>
                            <button
                              onClick={() => handleOpenAdjustAgencyRevenue(agency)}
                              className="px-2.5 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-sm"
                              title="Edit / Adjust Agency Wallet Balance"
                            >
                              <Edit2 className="w-3 h-3" /> Edit Balance
                            </button>
                          </div>
                          
                          <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                            <span>Connected Hosts: <strong className="text-white">{agency.totalHosts ?? agency._count?.bindings ?? 0}</strong></span>
                            <span>Broadcaster Diamonds: <strong className="text-cyan-400 inline-flex items-center gap-1"><DiamondIcon className="w-3.5 h-3.5" /> {(agency.hostsTotalDiamonds || 0).toLocaleString()}</strong></span>
                          </div>
                        </div>

                        {/* AGENCY COIN WALLET INVENTORY */}
                        <div className="mt-3 p-3 bg-gradient-to-r from-amber-950/40 via-slate-950 to-slate-900 rounded-xl border border-amber-500/30">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                                <CoinIcon className="w-4 h-4 inline-block mr-1" /> Available Agency Coins
                              </span>
                              <p className="text-xl font-black text-amber-300 mt-0.5">
                                {(agency.coinBalance || 0).toLocaleString()} <span className="text-xs font-bold text-amber-400 inline-flex items-center gap-1"><CoinIcon className="w-4 h-4" /> Coins</span>
                              </p>
                            </div>
                            <button
                              onClick={() => handleOpenRechargeCoins(agency)}
                              className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-sm"
                              title="Recharge coins into agency inventory (Only Super Admin can do this)"
                            >
                              <Plus className="w-3.5 h-3.5" /> Recharge Coins
                            </button>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1.5">
                            Only Super Admin can recharge coins into agency inventory. Agency can distribute these to users.
                          </p>
                        </div>

                        {/* AGENCY LOGIN CREDENTIALS & INVITE CODE */}
                        <div className="mt-3 p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-400">Invite Code: <span className="font-mono text-white font-bold">{agency.code}</span></span>
                            <span className="text-slate-400">Password: <span className="font-mono text-pink-300 font-bold">{revealedPasswords[agency.id] ? (agency.password || 'Agency@2026') : '••••••••'}</span></span>
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => setRevealedPasswords(prev => ({ ...prev, [agency.id]: !prev[agency.id] }))}
                                className="p-1 rounded text-slate-400 hover:text-white"
                                title={revealedPasswords[agency.id] ? "Hide Password" : "Show Password"}
                              >
                                {revealedPasswords[agency.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                onClick={() => handleOpenResetPassword(agency)}
                                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold"
                                title="Reset Agency Password"
                              >
                                <Key className="w-3 h-3 inline mr-1" />Reset
                              </button>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between flex-wrap gap-2">
                            <button
                              onClick={() => handleCopyAgencyCredentials(agency)}
                              className="px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 text-xs font-semibold flex items-center gap-1 transition"
                              title="Copy full credentials for WhatsApp sharing"
                            >
                              <Share2 className="w-3 h-3" /> Copy WhatsApp Credentials
                            </button>
                            <a
                              href="/agency"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1 rounded-lg bg-pink-600/20 hover:bg-pink-600/40 text-pink-300 text-xs font-bold flex items-center gap-1 transition"
                              title="Open separate Agency Portal in new tab"
                            >
                              <ExternalLink className="w-3 h-3" /> Open Agency Portal ↗
                            </a>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-800 flex justify-between items-center text-xs">
                        <button
                          onClick={() => handleOpenAgencyRoster(agency)}
                          className="text-pink-400 hover:underline font-semibold flex items-center gap-1"
                        >
                          View Host Roster ({agency.totalHosts ?? agency._count?.bindings ?? 0}) →
                        </button>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditingAgency({ ...agency })}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition flex items-center gap-1"
                          >
                            <Edit2 className="w-3 h-3" /> Edit
                          </button>
                          <button
                            onClick={() => handleDeleteAgency(agency.id, agency.name)}
                            className="px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/30 text-red-400 text-xs font-semibold transition flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" /> Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  )))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: VIRTUAL GIFTS */}
          {portalMode === 'admin' && activeTab === 'gifts' && (
            <div className="space-y-4">
              <div className="bg-[#111827] border border-slate-800/80 rounded-2xl p-5">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
                  <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <Gift className="w-5 h-5 text-indigo-400" /> Virtual Gifts Catalog CRUD Engine
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Manage 3D luxury gifts, pricing in coins, and corresponding diamond awards for streamers.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowAddGiftModal(true)}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl transition shadow-lg shadow-indigo-600/30 flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" /> Add New Gift
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {gifts.map((gift) => (
                    <div key={gift.id} className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col items-center text-center relative group">
                      <span className="text-3xl mb-2">{gift.iconUrl}</span>
                      <p className="font-bold text-white text-xs truncate max-w-full">{gift.name}</p>
                      <p className="text-amber-400 font-extrabold text-xs mt-1">{gift.costCoins} <CoinIcon className="w-3.5 h-3.5 ml-1" /></p>
                      <p className="text-cyan-400 text-[10px] mt-0.5">+{gift.diamondsAwarded} 💎</p>
                      <span className="mt-2 text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-semibold">{gift.category}</span>
                      {gift.minVipLevel && gift.minVipLevel > 0 ? (
                        <span className="mt-1 text-[9px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold flex items-center gap-1">
                          <Crown className="w-2.5 h-2.5" /> VIP {gift.minVipLevel}+
                        </span>
                      ) : null}

                      {/* EDIT & DELETE BUTTONS ON HOVER / ALWAYS ON TOUCH */}
                      <div className="mt-3 pt-2 border-t border-slate-800/60 w-full flex justify-center gap-2">
                        <button
                          onClick={() => setEditingGift({ ...gift })}
                          className="p-1 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white transition"
                          title="Edit Gift"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteGift(gift.id, gift.name)}
                          className="p-1 rounded-lg bg-red-500/10 hover:bg-red-500/30 text-red-400 transition"
                          title="Delete Gift"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 7b: COIN PACKAGES */}
          {portalMode === 'admin' && activeTab === 'coin_packages' && (
            <div className="space-y-4">
              <div className="bg-[#111827] border border-slate-800/80 rounded-2xl p-5">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
                  <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <Coins className="w-5 h-5 text-amber-400" /> Coin Packages — Recharge Pricing Engine
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Add, edit, delete, enable or disable coin packages and set their USD prices. Every change is
                      instantly synchronized with the recharge website &amp; mobile checkout screen.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-300 border border-amber-500/30 font-bold flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5" /> Live Sync Active
                    </span>
                    <button
                      onClick={() => setShowAddCoinPackageModal(true)}
                      className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl transition shadow-lg shadow-amber-500/30 flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" /> Add Coin Package
                    </button>
                  </div>
                </div>

                {coinPackages.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 bg-slate-900/50 rounded-xl border border-slate-800">
                    No coin packages yet. Add your first recharge package above. 🪙
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-800">
                          <th className="pb-3 pr-3">Package</th>
                          <th className="pb-3 pr-3">Coins (Base + Bonus = Total)</th>
                          <th className="pb-3 pr-3">USD Price</th>
                          <th className="pb-3 pr-3">SAR Price</th>
                          <th className="pb-3 pr-3">Status</th>
                          <th className="pb-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {coinPackages.map((pkg) => {
                          const isActive = pkg.isActive !== false;
                          return (
                            <tr key={pkg.id} className={`${isActive ? '' : 'opacity-50'}`}>
                              <td className="py-3 pr-3">
                                <div className="flex items-center gap-2.5 min-w-[180px]">
                                  <span className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-lg shrink-0">
                                    🪙
                                  </span>
                                  <div>
                                    <p className="font-bold text-white text-xs flex items-center gap-1.5">
                                      {pkg.name || pkg.id}
                                      {pkg.popular && (
                                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-pink-500 text-slate-950 font-extrabold">
                                          POPULAR
                                        </span>
                                      )}
                                    </p>
                                    {pkg.badge && (
                                      <p className="text-[10px] text-amber-300 font-semibold truncate max-w-[190px]">{pkg.badge}</p>
                                    )}
                                    <p className="text-[10px] text-slate-500 font-mono">{pkg.id}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 pr-3">
                                <p className="text-xs font-bold text-white">
                                  {pkg.coins?.toLocaleString()} <CoinIcon className="w-3 h-3 ml-0.5" />
                                  <span className="text-emerald-400 ml-1.5">+{pkg.bonusCoins?.toLocaleString()} bonus</span>
                                </p>
                                <p className="text-[10px] text-slate-500">Total: <span className="font-bold text-amber-400">{pkg.totalCoins?.toLocaleString()} 🪙</span></p>
                              </td>
                              <td className="py-3 pr-3">
                                <p className="text-sm font-extrabold text-emerald-400">${Number(pkg.amountUSD)?.toFixed(2)}</p>
                                <p className="text-[10px] text-slate-500">USD</p>
                              </td>
                              <td className="py-3 pr-3">
                                <p className="text-xs font-bold text-white">{Number(pkg.amountSAR)?.toFixed(2)}</p>
                                <p className="text-[10px] text-slate-500">SAR</p>
                              </td>
                              <td className="py-3 pr-3">
                                <button
                                  onClick={() => handleToggleCoinPackage(pkg)}
                                  className={`flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1.5 rounded-xl border transition ${
                                    isActive
                                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/20'
                                      : 'bg-red-500/10 text-red-400 border-red-500/40 hover:bg-red-500/20'
                                  }`}
                                >
                                  {isActive ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                                  {isActive ? 'Active' : 'Disabled'}
                                </button>
                              </td>
                              <td className="py-3 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() =>
                                      setEditingCoinPackage({
                                        ...pkg,
                                        coins: pkg.coins,
                                        bonusCoins: pkg.bonusCoins,
                                        totalCoins: pkg.totalCoins,
                                        amountUSD: pkg.amountUSD,
                                        amountSAR: pkg.amountSAR,
                                      })
                                    }
                                    className="p-2 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white transition"
                                    title="Edit Coin Package"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteCoinPackage(pkg.id, pkg.name)}
                                    className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/30 text-red-400 transition"
                                    title="Delete Coin Package"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="bg-[#111827] border border-emerald-500/20 rounded-2xl p-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
                    <Send className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      Automatic Recharge Website Synchronization
                      <RefreshCw className="w-3.5 h-3.5 text-emerald-400 animate-spin" style={{ animationDuration: '3s' }} />
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      The recharge website reads packages live from <code className="text-emerald-400 font-mono">GET /api/payments/packages</code> and the
                      mobile checkout screen loads them through <code className="text-emerald-400 font-mono">GET /api/coin-packages</code>. Only{' '}
                      <span className="font-bold text-emerald-400">Active</span> packages are shown to users — disabled or deleted packages disappear
                      from checkout immediately, with no app release required.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7c: GAMES & MINI-GAMES GOVERNANCE */}
          {portalMode === 'admin' && activeTab === 'games' && (
            <div className="space-y-4">
              <div className="bg-[#111827] border border-slate-800/80 rounded-2xl p-5">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
                  <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <Gamepad2 className="w-5 h-5 text-emerald-400" /> Mini-Games Governance Center
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Enable or disable games and restrict them by VIP level or user level. Changes apply instantly
                      to live streams, audio rooms, and the standalone Games Center — no app release needed.
                    </p>
                  </div>
                  <span className="text-[11px] px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-bold flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5" /> Live Sync Active
                  </span>
                </div>

                {games.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 bg-slate-900/50 rounded-xl border border-slate-800">
                    No games found. 🎮
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {games.map((game) => (
                      <div
                        key={game.id}
                        className={`rounded-2xl border p-4 transition ${
                          game.isEnabled
                            ? 'bg-slate-900 border-slate-800'
                            : 'bg-slate-900/40 border-red-500/30 opacity-70'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span
                              className="w-12 h-12 rounded-2xl border flex items-center justify-center text-2xl shrink-0"
                              style={{
                                backgroundColor: `${game.themeColor || '#7C3AED'}22`,
                                borderColor: `${game.themeColor || '#7C3AED'}66`,
                              }}
                            >
                              {game.icon || '🎮'}
                            </span>
                            <div>
                              <p className="font-bold text-white text-sm flex items-center gap-2">{game.name}</p>
                              <p className="text-[10px] text-slate-500 font-mono">{game.id}</p>
                              {game.category && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-bold uppercase">
                                  {game.category}
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => handleToggleGame(game)}
                            className={`flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1.5 rounded-xl border transition shrink-0 ${
                              game.isEnabled
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/20'
                                : 'bg-red-500/10 text-red-400 border-red-500/40 hover:bg-red-500/20'
                            }`}
                          >
                            {game.isEnabled ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                            {game.isEnabled ? 'Enabled' : 'Disabled'}
                          </button>
                        </div>

                        <p className="text-xs text-slate-400 mt-3 leading-relaxed">{game.description}</p>

                        <div className="grid grid-cols-2 gap-2 mt-3 text-[11px]">
                          <div className="bg-slate-950/60 rounded-xl px-3 py-2 border border-slate-800">
                            <p className="text-slate-500 font-semibold">Min VIP Level</p>
                            <p className="text-white font-bold">VIP {game.minVipLevel || 0}{game.minVipLevel === 0 && <span className="text-emerald-400 text-[10px] ml-1">(all)</span>}</p>
                          </div>
                          <div className="bg-slate-950/60 rounded-xl px-3 py-2 border border-slate-800">
                            <p className="text-slate-500 font-semibold">Min User Level</p>
                            <p className="text-white font-bold">Lv.{game.minUserLevel || 1}</p>
                          </div>
                          <div className="bg-slate-950/60 rounded-xl px-3 py-2 border border-slate-800">
                            <p className="text-slate-500 font-semibold">Bet Range</p>
                            <p className="text-white font-bold">{game.minBet?.toLocaleString()}–{game.maxBet?.toLocaleString()} 🪙</p>
                          </div>
                          <div className="bg-slate-950/60 rounded-xl px-3 py-2 border border-slate-800">
                            <p className="text-slate-500 font-semibold">Max Multiplier</p>
                            <p className="text-amber-400 font-bold">{game.maxMultiplier}x</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mt-3 text-[10px]">
                          <span className={`px-2 py-0.5 rounded-full font-bold ${game.allowInLive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>📹 Live</span>
                          <span className={`px-2 py-0.5 rounded-full font-bold ${game.allowInVoice ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>🎙️ Voice</span>
                          <span className={`px-2 py-0.5 rounded-full font-bold ${game.allowStandalone ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>🎮 Standalone</span>
                          <button
                            onClick={() => handleOpenEditGame(game)}
                            className="ml-auto px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white transition font-bold flex items-center gap-1.5"
                          >
                            <Edit2 className="w-3 h-3" /> Configure
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-[#111827] border border-indigo-500/20 rounded-2xl p-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center shrink-0">
                    <Gamepad2 className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      Instant Multi-Surface Sync
                      <RefreshCw className="w-3.5 h-3.5 text-indigo-400 animate-spin" style={{ animationDuration: '3s' }} />
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      The games catalog is served from <code className="text-indigo-400 font-mono">GET /api/games/catalog</code>. Disabled games
                      disappear instantly from the room mini-games menu, while VIP/level gates return a lock hint. Changes broadcast live over
                      WebSocket (<code className="text-indigo-400 font-mono">admin:games_updated</code>).
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: PAYOUT REVIEWS */}
          {portalMode === 'admin' && activeTab === 'payouts' && (
            <div className="space-y-4">
              <div className="bg-[#111827] border border-slate-800/80 rounded-2xl p-5">
                <div className="flex justify-between items-center mb-5">
                  <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-emerald-400" /> Host Diamond Cash-Out Review Desk
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Review and disburse manual host earnings payouts via USDT (TRC-20), Bank Wire (SWIFT), or PayPal.
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  {withdrawals.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 bg-slate-900/50 rounded-xl border border-slate-800">
                      No pending cash withdrawal requests. All payouts processed! 💎
                    </div>
                  ) : (
                    withdrawals.map((wth) => (
                      <div key={wth.id} className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                          <p className="font-bold text-white text-sm">{wth.user?.displayName || 'Host Broadcaster'}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{wth.amountDiamonds?.toLocaleString()} Diamonds • Method: <span className="font-bold text-emerald-400">{wth.paymentMethod}</span></p>
                          <p className="text-[11px] text-slate-500 font-mono mt-1">{wth.accountDetails}</p>
                        </div>

                        <div className="flex items-center gap-4">
                          <span className="text-lg font-extrabold text-emerald-400">${wth.amountUSD?.toFixed(2)} USD</span>
                          <button
                            onClick={() => handleRejectWithdrawal(wth.id)}
                            className="px-3 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs font-bold transition"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => handleApproveWithdrawal(wth.id)}
                            className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-lg shadow-emerald-600/30"
                          >
                            Approve Payout
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 9: FINANCIAL & EARNINGS REPORTS */}
          {portalMode === 'admin' && activeTab === 'financial' && (
            <div className="space-y-6">
              {/* Header */}
              <div className="bg-[#111827] border border-slate-800/80 rounded-2xl p-5">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-emerald-400" /> Platform Financial Engine & Commission Ledger
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Real-time mathematical accounting of virtual gift cuts, host broadcaster diamond earnings, and talent agency revenue splits.
                    </p>
                  </div>
                  <button
                    onClick={fetchAllData}
                    className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Refresh Reports
                  </button>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                  {/* Platform Gross Margin */}
                  <div className="p-4 rounded-xl bg-gradient-to-b from-indigo-950/40 to-slate-900 border border-indigo-900/40">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Platform Gross Revenue</span>
                    <p className="text-2xl font-black text-indigo-400 mt-1">
                      ${financialReport?.kpi?.totalPlatformRevenueUSD?.toFixed(2) || '0.00'} <span className="text-xs font-normal text-slate-400">USD</span>
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Share: <span className="text-indigo-300 font-bold">{platformShare}%</span> • Infrastructure & Agora bandwidth
                    </p>
                  </div>

                  {/* Creator Diamonds Distributed */}
                  <div className="p-4 rounded-xl bg-gradient-to-b from-emerald-950/40 to-slate-900 border border-emerald-900/40">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Streamer Diamond Rewards</span>
                    <p className="text-2xl font-black text-emerald-400 mt-1">
                      ${financialReport?.kpi?.totalDiamondsUSD?.toFixed(2) || '0.00'} <span className="text-xs font-normal text-slate-400">USD</span>
                    </p>
                    <p className="text-[11px] text-emerald-400/80 mt-1 flex items-center gap-1 font-mono">
                      💎 {financialReport?.kpi?.totalDiamondsAwarded?.toLocaleString() || 0} Diamonds Credited
                    </p>
                  </div>

                  {/* Talent Agency Commission */}
                  <div className="p-4 rounded-xl bg-gradient-to-b from-pink-950/40 to-slate-900 border border-pink-900/40">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Agency Commissions Accrued</span>
                    <p className="text-2xl font-black text-pink-400 mt-1">
                      ${financialReport?.kpi?.totalAgencyCommissionUSD?.toFixed(2) || '0.00'} <span className="text-xs font-normal text-slate-400">USD</span>
                    </p>
                    <p className="text-[11px] text-pink-400/80 mt-1">
                      🏢 {agencies.length} Registered Agencies
                    </p>
                  </div>

                  {/* Viewer Coins Spent */}
                  <div className="p-4 rounded-xl bg-gradient-to-b from-amber-950/40 to-slate-900 border border-amber-900/40">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Gross Audience Coins Spent</span>
                    <p className="text-2xl font-black text-amber-400 mt-1">
                      {financialReport?.kpi?.totalCoinsSpent?.toLocaleString() || 0} <CoinIcon className="w-3.5 h-3.5 ml-1" />
                    </p>
                    <p className="text-[11px] text-amber-400/80 mt-1">
                      Valued at: <span className="font-bold">${financialReport?.kpi?.totalCoinsUSD?.toFixed(2) || '0.00'} USD</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Stream-by-Stream Financial Breakdown Table */}
              <div className="bg-[#111827] border border-slate-800/80 rounded-2xl p-5 space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-white text-base flex items-center gap-2">
                      <Tv className="w-4 h-4 text-indigo-400" /> Per-Stream Broadcast Revenue Audit
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Session-level diamond generation, audience participation, and commission attribution per broadcast room.
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                        <th className="py-3 px-4">Broadcast Room</th>
                        <th className="py-3 px-4">Host Broadcaster</th>
                        <th className="py-3 px-4">Affiliated Agency</th>
                        <th className="py-3 px-4">Status & Viewers</th>
                        <th className="py-3 px-4">Diamonds Earned</th>
                        <th className="py-3 px-4">Host Cash Value</th>
                        <th className="py-3 px-4 text-right">Agency / Cut</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {(!financialReport?.streams || financialReport.streams.length === 0) ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-500">
                            No stream sessions recorded yet. Start a broadcast in the app to populate! 🌟
                          </td>
                        </tr>
                      ) : (
                        financialReport.streams.map((s: any) => (
                          <tr key={s.id} className="hover:bg-slate-800/30 transition">
                            <td className="py-3 px-4">
                              <p className="font-bold text-white truncate max-w-xs">{s.title}</p>
                              <p className="text-[10px] text-slate-500 font-mono">Room ID: {s.id.slice(0, 12)}... • {new Date(s.startedAt).toLocaleString()}</p>
                            </td>

                            <td className="py-3 px-4">
                              <span className="font-bold text-white">{s.hostName}</span>
                              <span className="text-[10px] text-slate-500 block font-mono">ID: {s.hostId.slice(0, 10)}</span>
                            </td>

                            <td className="py-3 px-4">
                              {s.agencyCode ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-pink-500/20 border border-pink-500/30 text-pink-300 font-bold text-[10px]">
                                  <Building2 className="w-3 h-3 text-pink-400" />
                                  {s.agencyName} ({s.agencyCode})
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-500 italic">Independent (No Agency)</span>
                              )}
                            </td>

                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                s.status === 'LIVE' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'
                              }`}>
                                {s.status}
                              </span>
                              <span className="text-[11px] text-slate-400 ml-2 font-mono">{s.viewers || 0} Viewers</span>
                            </td>

                            <td className="py-3 px-4 font-bold text-cyan-400">
                              💎 {(s.diamondsEarned || 0).toLocaleString()}
                            </td>

                            <td className="py-3 px-4 font-extrabold text-emerald-400">
                              ${((s.diamondsEarned || 0) * 0.01).toFixed(2)} USD
                            </td>

                            <td className="py-3 px-4 text-right">
                              <span className="text-pink-400 font-bold font-mono">
                                {s.agencyCommissionPercent ? `${s.agencyCommissionPercent}% Cut` : '0%'}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Master Gift & Balance Transaction Ledger */}
              <div className="bg-[#111827] border border-slate-800/80 rounded-2xl p-5 space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-white text-base flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400" /> Real-Time Gift & Revenue Split Ledger
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Immutable transaction entries recorded in PostgreSQL with atomic balances and exact mathematical cuts.
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                        <th className="py-3 px-4">Transaction / Time</th>
                        <th className="py-3 px-4">Type</th>
                        <th className="py-3 px-4">Audience Sender</th>
                        <th className="py-3 px-4">Recipient Host</th>
                        <th className="py-3 px-4">Coins Debited</th>
                        <th className="py-3 px-4">Diamonds Awarded</th>
                        <th className="py-3 px-4">Agency Cut</th>
                        <th className="py-3 px-4 text-right">Platform Margin</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {(!financialReport?.ledger || financialReport.ledger.length === 0) ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-500">
                            No ledger transactions recorded yet. Virtual gift transactions will appear here in real time! ⚡
                          </td>
                        </tr>
                      ) : (
                        financialReport.ledger.map((l: any) => (
                          <tr key={l.id} className="hover:bg-slate-800/30 transition">
                            <td className="py-3 px-4">
                              <span className="font-mono text-[10px] text-slate-500 block">{l.id.slice(0, 10)}...</span>
                              <span className="text-[11px] text-slate-400">{new Date(l.createdAt).toLocaleTimeString()} • {new Date(l.createdAt).toLocaleDateString()}</span>
                            </td>

                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                l.type === 'GIFT_TRANSACTION'
                                  ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30'
                                  : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                              }`}>
                                {l.type}
                              </span>
                            </td>

                            <td className="py-3 px-4">
                              <span className="font-bold text-white">{l.senderName || 'Audience'}</span>
                            </td>

                            <td className="py-3 px-4">
                              <span className="font-bold text-white">{l.recipientName || 'Host'}</span>
                              {l.agencyName && (
                                <span className="text-[10px] text-pink-400 block truncate max-w-xs font-medium">
                                  🏢 {l.agencyName}
                                </span>
                              )}
                            </td>

                            <td className="py-3 px-4 font-bold text-amber-400">
                              {l.coinsDebited > 0 ? <span className="flex items-center gap-1 text-amber-400">-{l.coinsDebited.toLocaleString()} <CoinIcon className="w-3 h-3" /></span> : '-'}
                            </td>

                            <td className="py-3 px-4 font-bold text-cyan-400">
                              {l.diamondsCredited > 0 ? `+${l.diamondsCredited.toLocaleString()} 💎` : '-'}
                            </td>

                            <td className="py-3 px-4 font-semibold text-pink-400">
                              ${l.agencyCommissionUSD?.toFixed(2) || '0.00'}
                            </td>

                            <td className="py-3 px-4 font-extrabold text-indigo-400 text-right">
                              ${l.platformRevenueUSD?.toFixed(2) || '0.00'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ==================== 11. HELPDESK & SUPPORT CONTACT MANAGEMENT ==================== */}
          {portalMode === 'admin' && activeTab === 'contact_support' && (
            <div className="space-y-6">
              {/* Header Hero */}
              <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-emerald-950/30 to-slate-900 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-gradient-to-r from-emerald-500 to-teal-500 text-white uppercase tracking-wider">
                      Dynamic Platform Configuration
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      Instant Mobile App Synchronization
                    </span>
                  </div>
                  <h2 className="text-xl font-black text-white flex items-center gap-2">
                    <Headphones className="w-6 h-6 text-emerald-400" /> Helpdesk & Official Support Contact Desk
                  </h2>
                  <p className="text-xs text-slate-400 max-w-2xl">
                    Configure the platform's official WhatsApp helpline, support email, phone hotline, operating hours, and announcement.
                    These details appear automatically in the mobile app's <strong>Account Banned/Suspended Dialog</strong> (&quot;Contact Support&quot; button) and the <strong>Profile Menu</strong> (&quot;Contact Us &amp; Help Center&quot;).
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleSaveSupportContact()}
                    disabled={isSavingSupport}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/25 transition transform active:scale-95 cursor-pointer"
                  >
                    {isSavingSupport ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" /> Saving &amp; Broadcasting...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" /> Save &amp; Broadcast Details 🚀
                      </>
                    )}
                  </button>
                  <button
                    onClick={fetchAllData}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                    title="Refresh Support Details"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Grid: Form Editor & Real-time Live Preview */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Left Column: Form Configuration (7 cols) */}
                <div className="lg:col-span-7 space-y-6">
                  <form onSubmit={handleSaveSupportContact} className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-xl space-y-5">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                          <Sliders className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-white">Contact Details Editor</h3>
                          <p className="text-[11px] text-slate-400">Values are stored on server and served via GET /api/support/contact</p>
                        </div>
                      </div>
                      <span className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono font-bold">
                        API DYNAMIC
                      </span>
                    </div>

                    {/* WhatsApp Number */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-300 flex items-center gap-2">
                        <MessageCircle className="w-4 h-4 text-emerald-400" />
                        Official WhatsApp Support Number
                        <span className="text-emerald-400 font-normal text-[10px]">(Include Country Code)</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={supportContact.whatsappNumber}
                          onChange={(e) => setSupportContact({ ...supportContact, whatsappNumber: e.target.value })}
                          placeholder="+91 98765 43210"
                          className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                        />
                      </div>
                      <p className="text-[10px] text-slate-500">
                        When mobile users tap &quot;Chat on WhatsApp&quot;, a pre-filled ticket with their User ID and account status will open directly.
                      </p>
                    </div>

                    {/* Support Email */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-300 flex items-center gap-2">
                        <Mail className="w-4 h-4 text-indigo-400" />
                        Helpline Email Address
                      </label>
                      <input
                        type="email"
                        value={supportContact.helplineEmail}
                        onChange={(e) => setSupportContact({ ...supportContact, helplineEmail: e.target.value })}
                        placeholder="support@live2030.com"
                        className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                      />
                      <p className="text-[10px] text-slate-500">
                        Primary inbox for formal user appeals, legal notices, and payout verification inquiries.
                      </p>
                    </div>

                    {/* Helpline Phone */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-300 flex items-center gap-2">
                        <Phone className="w-4 h-4 text-amber-400" />
                        Customer Care Helpline Phone Number
                      </label>
                      <input
                        type="text"
                        value={supportContact.helplinePhone}
                        onChange={(e) => setSupportContact({ ...supportContact, helplinePhone: e.target.value })}
                        placeholder="+1 800 555 0199"
                        className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition"
                      />
                      <p className="text-[10px] text-slate-500">
                        Toll-free or direct telephonic line for immediate voice inquiries.
                      </p>
                    </div>

                    {/* Operating Hours */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-300 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-cyan-400" />
                        Operating Hours / Availability
                      </label>
                      <input
                        type="text"
                        value={supportContact.operatingHours}
                        onChange={(e) => setSupportContact({ ...supportContact, operatingHours: e.target.value })}
                        placeholder="24/7 Global Live Support (Mon - Sun)"
                        className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
                      />
                    </div>

                    {/* Announcement / Notice */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-300 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-pink-400" />
                        Support Notice &amp; Announcement
                      </label>
                      <textarea
                        rows={3}
                        value={supportContact.announcement}
                        onChange={(e) => setSupportContact({ ...supportContact, announcement: e.target.value })}
                        placeholder="Official Live 2030 Help Center & Appeal Desk..."
                        className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition"
                      />
                      <p className="text-[10px] text-slate-500">
                        Displayed prominently at the top of the Contact Us page in the mobile application.
                      </p>
                    </div>

                    {/* Save Button */}
                    <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        Broadcasted instantly to all connected mobile devices
                      </span>
                      <button
                        type="submit"
                        disabled={isSavingSupport}
                        className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/25 transition transform active:scale-95 cursor-pointer"
                      >
                        {isSavingSupport ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" /> Saving...
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4" /> Save Contact Details
                          </>
                        )}
                      </button>
                    </div>
                  </form>

                  {/* Architecture & Flow Infobox */}
                  <div className="p-5 rounded-2xl bg-indigo-950/20 border border-indigo-500/20 space-y-3">
                    <h4 className="text-xs font-bold text-indigo-300 flex items-center gap-2">
                      <LifeBuoy className="w-4 h-4 text-indigo-400" /> How Live Contact Support Works Across the Platform
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px] text-slate-300">
                      <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                        <span className="font-bold text-red-400 flex items-center gap-1">
                          🚫 Banned/Suspended Dialog
                        </span>
                        <p className="text-slate-400 text-[10px] leading-relaxed">
                          When users face a ban or suspension dialog, tapping &quot;Contact Support&quot; opens this desk with an Appeal mode banner.
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                        <span className="font-bold text-emerald-400 flex items-center gap-1">
                          📱 Profile Menu Item
                        </span>
                        <p className="text-slate-400 text-[10px] leading-relaxed">
                          Regular users navigate to &quot;Contact Us &amp; Help Center&quot; from their profile to resolve coin, gift, or stream issues.
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                        <span className="font-bold text-cyan-400 flex items-center gap-1">
                          ⚡ 100% Real-Time API
                        </span>
                        <p className="text-slate-400 text-[10px] leading-relaxed">
                          No app updates needed! Any number or email updated here is reflected across all mobile devices instantly.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Live Mobile Experience Preview (5 cols) */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-xl space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white flex items-center gap-2">
                        <Tv className="w-4 h-4 text-indigo-400" /> Mobile Screen Simulation
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold">
                        Preview
                      </span>
                    </div>

                    {/* Smartphone Mock Frame */}
                    <div className="mx-auto max-w-[320px] rounded-[32px] p-4 bg-[#0F0720] border-2 border-slate-700 shadow-2xl space-y-4">
                      {/* Mobile Top Bar */}
                      <div className="flex items-center justify-between text-[11px] text-slate-400 pb-2 border-b border-white/10">
                        <span className="font-mono text-[10px] font-bold text-white">9:41</span>
                        <div className="flex items-center gap-1 text-[10px]">
                          <span className="w-2 h-2 rounded-full bg-emerald-400" />
                          <span>5G</span>
                        </div>
                      </div>

                      {/* Header */}
                      <div className="text-center space-y-1 pt-1">
                        <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-[2px] shadow-lg shadow-emerald-500/30">
                          <div className="w-full h-full bg-[#0F0720] rounded-[14px] flex items-center justify-center">
                            <Headphones className="w-6 h-6 text-emerald-400" />
                          </div>
                        </div>
                        <h4 className="text-xs font-black text-white">Contact &amp; Support Desk</h4>
                        <p className="text-[9px] text-emerald-400 font-semibold">{supportContact.operatingHours}</p>
                      </div>

                      {/* Announcement Preview */}
                      <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-500/30 text-[10px] text-purple-200 leading-relaxed">
                        📢 {supportContact.announcement || 'No announcement provided.'}
                      </div>

                      {/* Channels List */}
                      <div className="space-y-2">
                        {/* WhatsApp Card */}
                        <div className="p-3 rounded-xl bg-[#1A0B2E] border border-emerald-500/40 flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                              <MessageCircle className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="text-[11px] font-bold text-white">WhatsApp Support</div>
                              <div className="text-[10px] text-emerald-400 font-mono">{supportContact.whatsappNumber}</div>
                            </div>
                          </div>
                          <a
                            href={`https://wa.me/${supportContact.whatsappNumber.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold flex items-center gap-1 shadow transition"
                          >
                            Chat <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </div>

                        {/* Email Card */}
                        <div className="p-3 rounded-xl bg-[#1A0B2E] border border-indigo-500/40 flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                              <Mail className="w-4 h-4" />
                            </div>
                            <div className="min-w-0 max-w-[130px]">
                              <div className="text-[11px] font-bold text-white">Email Helpline</div>
                              <div className="text-[10px] text-indigo-300 font-mono truncate">{supportContact.helplineEmail}</div>
                            </div>
                          </div>
                          <a
                            href={`mailto:${supportContact.helplineEmail}`}
                            className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold flex items-center gap-1 shadow transition"
                          >
                            Email <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </div>

                        {/* Phone Card */}
                        <div className="p-3 rounded-xl bg-[#1A0B2E] border border-amber-500/40 flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                              <Phone className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="text-[11px] font-bold text-white">Hotline Call</div>
                              <div className="text-[10px] text-amber-300 font-mono">{supportContact.helplinePhone}</div>
                            </div>
                          </div>
                          <a
                            href={`tel:${supportContact.helplinePhone.replace(/[^0-9+]/g, '')}`}
                            className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold flex items-center gap-1 shadow transition"
                          >
                            Call <Phone className="w-2.5 h-2.5" />
                          </a>
                        </div>
                      </div>

                      <div className="pt-2 text-center text-[9px] text-slate-500">
                        ⚡ Live 2030 Global Help Desk
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ==================== 12. VIP PRIVILEGE & TIER GOVERNANCE (8 INDEPENDENT TIERS) ==================== */}
          {portalMode === 'admin' && activeTab === 'vip_features' && (
            <div className="space-y-6">
              {/* Header Hero */}
              <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-amber-950/30 to-slate-900 border border-amber-500/30 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 uppercase tracking-wider">
                      Tiered Recharge Engine • 8 Independent Stages
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-amber-400 font-semibold">
                      <Crown className="w-3.5 h-3.5 text-amber-400" />
                      Active VIP Tier: VIP 1 ($500/mo)
                    </span>
                  </div>
                  <h2 className="text-xl font-black text-white flex items-center gap-2">
                    <Crown className="w-6 h-6 text-amber-400" /> VIP Privilege &amp; Tier Progression Console
                  </h2>
                  <p className="text-xs text-slate-400 max-w-2xl">
                    Configure thresholds, automated monthly billing evaluation, and the <strong>single-step downgrade cushion</strong>. Users automatically elevate upon spending, and step down by at most 1 level if spend threshold is missed.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={handleRunMonthlyVipEvaluation}
                    disabled={isEvaluatingVip}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 disabled:opacity-50 text-slate-950 text-xs font-black flex items-center gap-2 shadow-lg shadow-amber-500/25 transition transform active:scale-95 cursor-pointer"
                    title="Run monthly evaluation and apply single-step downgrade (e.g. VIP 4 -> VIP 3)"
                  >
                    {isEvaluatingVip ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-slate-950" /> Running Evaluation...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4 text-slate-950" /> Run Monthly VIP Cycle
                      </>
                    )}
                  </button>

                  <button
                    onClick={fetchAllData}
                    className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-bold flex items-center gap-2 transition"
                  >
                    <RefreshCw className="w-4 h-4" /> Refresh
                  </button>
                </div>
              </div>

              {/* Downgrade Cushion & Progression Architecture Banner */}
              <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/30 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Instant Tier Elevation</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                      Recharging reaches $500 triggers VIP 1 immediately. Features &amp; badges activate on live streams and profile without delay.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Single-Step Downgrade Cushion</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                      If a VIP 4 user does not spend the required $3,500 next month, they drop down to <strong>VIP 3</strong> (at most 1 step), never all the way to 0.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">13 Core VIP 1 Perks Live</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                      Unlimited chat, photo sending, room PIN locking, animated aura, custom vanity ID, stranger message rejection, and stealth mode.
                    </p>
                  </div>
                </div>
              </div>

              {/* 8 VIP TIERS GRID */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Crown className="w-4 h-4 text-amber-400" /> 8 VIP Progression Stages ($500 - $15,000 / month)
                  </h3>
                  <span className="text-xs text-slate-400">
                    System Status: <strong className="text-emerald-400">All VIP 1 - VIP 8 Levels Active in App & Engine</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { level: 1, title: 'VIP 1', spend: '$500', color: 'from-blue-600/30 to-blue-900/10', border: 'border-blue-500/40', badge: 'bg-blue-500 text-white', active: true, perks: ['Unlimited chat', 'Send private photos & comments', 'View profile visitors', 'Lock rooms', 'Animated avatar picture', 'Custom room cover', 'Reject stranger messages', 'Disable following', 'Hide location in rooms', 'Special VIP gifts', 'Custom ID', 'VIP 1 badge & frame'] },
                    { level: 2, title: 'VIP 2', spend: '$1,000', color: 'from-cyan-600/20 to-cyan-900/10', border: 'border-cyan-500/30', badge: 'bg-cyan-500 text-slate-950', active: true, perks: ['All VIP 1 Perks', 'Anonymous mode during games', 'Custom name color', 'VIP chat bubble', 'VIP 2 badge & frame'] },
                    { level: 3, title: 'VIP 3', spend: '$2,000', color: 'from-emerald-600/20 to-emerald-900/10', border: 'border-emerald-500/30', badge: 'bg-emerald-500 text-slate-950', active: true, perks: ['All VIP 2 Perks', 'Invisible online status', 'Hide country', 'VIP 3 badge & frame'] },
                    { level: 4, title: 'VIP 4', spend: '$3,500', color: 'from-purple-600/20 to-purple-900/10', border: 'border-purple-500/30', badge: 'bg-purple-500 text-white', active: true, perks: ['All VIP 3 Perks', 'Mystery mode', 'Hide from profile visitors', 'Special entry effect', 'VIP 4 badge & frame'] },
                    { level: 5, title: 'VIP 5', spend: '$5,000', color: 'from-pink-600/20 to-pink-900/10', border: 'border-pink-500/30', badge: 'bg-pink-500 text-white', active: true, perks: ['All VIP 4 Perks', 'Hide room from trending topics', 'Kick Protection', 'Ban Protection (Comments & Rooms)', 'Animated VIP frame', 'VIP 5 badge & frame'] },
                    { level: 6, title: 'VIP 6', spend: '$7,500', color: 'from-amber-600/20 to-amber-900/10', border: 'border-amber-500/30', badge: 'bg-amber-500 text-slate-950', active: true, perks: ['All VIP 5 Perks', 'VIP announcement in all rooms (limited daily)', 'Additional gift set', 'Higher priority in lists', 'VIP 6 badge & frame'] },
                    { level: 7, title: 'VIP 7', spend: '$10,000', color: 'from-red-600/20 to-red-900/10', border: 'border-red-500/30', badge: 'bg-red-500 text-white', active: true, perks: ['All VIP 6 Perks', 'Immunity from being kicked', 'VIP announcement in all rooms', 'Higher priority in lists', 'App login notification', 'Legendary login effect', 'Special unique name', 'VIP 7 badge & frame'] },
                    { level: 8, title: 'VIP 8', spend: '$15,000', color: 'from-yellow-500/30 to-amber-800/20', border: 'border-yellow-400/50', badge: 'bg-yellow-400 text-slate-950 font-black', active: true, perks: ['All VIP 7 Perks', 'Higher priority in menus', 'Unique and exclusive name', 'Stealthy room access without notification', 'Top VIP frame', 'Highest login effect', 'Top VIP badge', 'Exclusive VIP identity', 'Maximum system priority'] },
                  ].map((tier) => {
                    const serverTier = vipLevels.find((v: any) => v.level === tier.level);
                    const memberCount = users.filter((u) => (u.vipLevel || 0) === tier.level).length;

                    return (
                      <div
                        key={tier.level}
                        className={`rounded-2xl p-4 bg-gradient-to-b ${tier.color} border ${tier.border} shadow-lg flex flex-col justify-between relative overflow-hidden`}
                      >
                        {tier.active && (
                          <div className="absolute top-2 right-2">
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-500 text-slate-950 uppercase tracking-wider animate-pulse">
                              LIVE IN APP
                            </span>
                          </div>
                        )}

                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${tier.badge}`}>
                              {tier.title}
                            </span>
                            <span className="text-xs font-extrabold text-white">
                              {serverTier?.minRechargeUSD ? `$${serverTier.minRechargeUSD.toLocaleString()}` : tier.spend} / mo
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-3 pb-2 border-b border-white/10">
                            <span>Active Members: <strong className="text-white">{memberCount}</strong></span>
                            <span className="text-[10px] text-amber-300 font-mono">Stage #{tier.level}</span>
                          </div>

                          <div className="space-y-1.5 mb-4">
                            {tier.perks.map((p, idx) => (
                              <div key={idx} className="flex items-center gap-1.5 text-[11px] text-slate-300">
                                <Check className="w-3 h-3 text-amber-400 shrink-0" />
                                <span className="truncate">{p}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="pt-3 border-t border-white/10 space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => handleTestVipEntrance(tier.level)}
                              className="px-2 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-300 text-[10px] font-bold border border-slate-700/60 transition flex items-center justify-center gap-1"
                              title="Test Entrance Broadcast"
                            >
                              <Tv className="w-3 h-3 text-cyan-400" /> Test Entry
                            </button>
                            <button
                              onClick={() => handleTestVipCelebration(tier.level)}
                              className="px-2 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-300 text-[10px] font-bold border border-slate-700/60 transition flex items-center justify-center gap-1"
                              title="Test Level Up Celebration"
                            >
                              <Sparkles className="w-3 h-3 text-amber-400" /> Test Celebrate
                            </button>
                          </div>

                          <button
                            onClick={() => setEditingVipLevel(serverTier || { level: tier.level, title: tier.title, minRechargeUSD: tier.level === 1 ? 500 : tier.level === 2 ? 1000 : tier.level === 3 ? 2000 : tier.level === 4 ? 3500 : tier.level === 5 ? 5000 : tier.level === 6 ? 7500 : tier.level === 7 ? 10000 : 15000, badgeTitle: `${tier.title} Badge`, chatBubbleStyle: `vip_${tier.level}`, nameColor: '#F59E0B' })}
                            className="w-full py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold transition flex items-center justify-center gap-1"
                          >
                            <Edit2 className="w-3 h-3 text-indigo-300" /> Configure Tier #{tier.level}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* VIP 1 TO VIP 8 INTERACTIVE PRIVILEGES MATRIX */}
              <div className="p-5 rounded-2xl bg-[#111827] border border-slate-800 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-amber-400" /> Full VIP 1 to VIP 8 Privilege Matrix &amp; Engine Status
                    </h3>
                    <p className="text-xs text-slate-400">
                      Select any VIP stage below to inspect its exact live privileges, permissions, and app surfaces.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      All 8 Tiers Active in App
                    </span>
                  </div>
                </div>

                {/* VIP LEVEL TABS (1 to 8) */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-800 scrollbar-thin">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => setSelectedVipMatrixTier(lvl)}
                      className={`px-4 py-2 rounded-xl text-xs font-extrabold transition shrink-0 flex items-center gap-2 ${
                        selectedVipMatrixTier === lvl
                          ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-lg shadow-orange-500/20 ring-2 ring-amber-300'
                          : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60'
                      }`}
                    >
                      <Crown className={`w-3.5 h-3.5 ${selectedVipMatrixTier === lvl ? 'text-slate-950' : 'text-amber-400'}`} />
                      VIP {lvl}
                    </button>
                  ))}
                </div>

                {/* ACTIVE TIER PRIVILEGES LIST */}
                {(() => {
                  const matrixData: Record<number, { title: string; subtitle: string; minSpend: string; badge: string; perks: { title: string; desc: string; surface: string }[] }> = {
                    1: {
                      title: 'VIP 1 Privileges',
                      subtitle: 'Bronze Pioneer — Base luxury suite for VIP spenders ($500/mo)',
                      minSpend: '$500 / month',
                      badge: 'VIP 1 Badge',
                      perks: [
                        { title: 'Unlimited chat', desc: 'No rate limiting, spam delays, or comment cooldowns in live stream & voice rooms.', surface: 'Live & Voice Chat' },
                        { title: 'Send private photos and comments without limits', desc: 'Attach photos from device gallery directly in room chat and stream comments.', surface: 'Chat & Comments' },
                        { title: 'View profile visitors', desc: 'Dedicated list in Social screen to see all users who visited profile.', surface: 'Social Tab' },
                        { title: 'Lock rooms', desc: 'Set 4-digit PIN locks on personal broadcast and voice rooms for private shows.', surface: 'Live & Voice Studio' },
                        { title: 'Animated profile picture', desc: 'Dynamic glowing animated VIP border & rotating aura on avatar.', surface: 'App-wide' },
                        { title: 'Choose a room cover', desc: 'Select custom high-res room cover from gallery picker before starting stream.', surface: 'Start Live Sheet' },
                        { title: 'Reject messages from strangers', desc: 'Privacy toggle to reject 1-on-1 direct messages from strangers.', surface: 'Profile Settings' },
                        { title: 'Disable following', desc: 'Privacy switch to freeze follow button on profile so strangers cannot follow.', surface: 'Profile Settings' },
                        { title: 'Hide your location in rooms', desc: 'Stealth privacy mode masking GPS and city inside stream rooms.', surface: 'Room Controls' },
                        { title: 'Special VIP gifts', desc: 'Access to exclusive Neon Cruiser (500 coins) and VIP 1 gifts catalog.', surface: 'Gift Tray' },
                        { title: 'Custom ID', desc: 'Claim and edit a unique custom alphanumeric ID displayed inside rooms & comments.', surface: 'Profile & Comments' },
                        { title: 'VIP 1 badge', desc: 'Sapphire Blue VIP 1 insignia displayed beside username in comments & lists.', surface: 'Comments & User Lists' },
                        { title: 'VIP 1 frame', desc: 'Sapphire luxury animated avatar border frame across all screens.', surface: 'Avatar Widget' },
                      ],
                    },
                    2: {
                      title: 'VIP 2 Privileges',
                      subtitle: 'Silver Elite — Competitive social suite with casino gaming privileges ($1,000/mo)',
                      minSpend: '$1,000 / month',
                      badge: 'VIP 2 Badge',
                      perks: [
                        { title: 'All VIP 1 Perks Included', desc: 'Inherits all 13 base privileges: unlimited chat, photos, visitors, room lock, and privacy suite.', surface: 'Inherited' },
                        { title: 'Anonymous mode during games', desc: 'Hide real identity as "VIP Mystery Player" when betting and winning in 777 Slots, Casino Wheel, and Lucky Sic Bo.', surface: 'Room Mini-Games' },
                        { title: 'Custom name color', desc: 'Vibrant golden/cyan custom name coloration displayed in room chat feed.', surface: 'Room Chat' },
                        { title: 'VIP chat bubble', desc: 'Exclusive styled chat bubble container framing all comments.', surface: 'Room Chat' },
                        { title: 'VIP 2 badge', desc: 'Cyan Diamond VIP 2 insignia beside username.', surface: 'Comments & User Lists' },
                        { title: 'VIP 2 frame', desc: 'Cyan Crystal animated avatar frame.', surface: 'Avatar Widget' },
                        { title: 'Special VIP 2 gifts', desc: 'Access to Cyber Phantom racing car (1,500 coins) exclusive virtual gift.', surface: 'Gift Tray' },
                      ],
                    },
                    3: {
                      title: 'VIP 3 Privileges',
                      subtitle: 'Emerald Baron — Invisible status and country concealment ($2,000/mo)',
                      minSpend: '$2,000 / month',
                      badge: 'VIP 3 Badge',
                      perks: [
                        { title: 'All VIP 2 Perks Included', desc: 'Inherits all VIP 1 & 2 perks including anonymous gaming mode, custom name color, and chat bubble.', surface: 'Inherited' },
                        { title: 'Invisible online status', desc: 'Browse the application completely offline without appearing in online user registries.', surface: 'Profile Privacy' },
                        { title: 'Hide country', desc: 'Conceal country flag and nationality across your profile and room occupant lists.', surface: 'Profile Privacy' },
                        { title: 'VIP 3 badge', desc: 'Emerald Baron VIP 3 insignia.', surface: 'Comments & User Lists' },
                        { title: 'VIP 3 frame', desc: 'Emerald Radiance animated avatar frame.', surface: 'Avatar Widget' },
                        { title: 'Special VIP 3 gifts', desc: 'Access to Royal Airship (3,500 coins) luxury virtual gift.', surface: 'Gift Tray' },
                      ],
                    },
                    4: {
                      title: 'VIP 4 Privileges',
                      subtitle: 'Amethyst Lord — Mystery mode and royal room entry effects ($3,500/mo)',
                      minSpend: '$3,500 / month',
                      badge: 'VIP 4 Badge',
                      perks: [
                        { title: 'All VIP 3 Perks Included', desc: 'Inherits all VIP 1-3 perks including invisible status and country concealment.', surface: 'Inherited' },
                        { title: 'Mystery mode', desc: 'Conceals level details, gifting totals, and diamond statistics from public room inspects.', surface: 'Profile Privacy' },
                        { title: 'Hide from profile visitors', desc: 'Visit any user profile completely silently without appearing on their visitor logs.', surface: 'Social & Profile' },
                        { title: 'Special entry effect', desc: 'Animated royal banner & particle announcement whenever entering any live stream.', surface: 'Live Room Entrance' },
                        { title: 'VIP 4 badge', desc: 'Amethyst Crest VIP 4 insignia.', surface: 'Comments & User Lists' },
                        { title: 'VIP 4 frame', desc: 'Royal Amethyst animated avatar frame.', surface: 'Avatar Widget' },
                        { title: 'Special VIP 4 gifts', desc: 'Access to Palace of Light (8,000 coins) architectural luxury gift.', surface: 'Gift Tray' },
                      ],
                    },
                    5: {
                      title: 'VIP 5 Privileges',
                      subtitle: 'Ruby Sovereign — Complete moderation immunity and trending privacy ($5,000/mo)',
                      minSpend: '$5,000 / month',
                      badge: 'VIP 5 Badge',
                      perks: [
                        { title: 'All VIP 4 Perks Included', desc: 'Inherits all VIP 1-4 perks including mystery mode and entry effects.', surface: 'Inherited' },
                        { title: 'Hide room from trending topics', desc: 'Host live streams without appearing on public explore algorithm or trending tabs.', surface: 'Live Stream Privacy' },
                        { title: 'Kick Protection', desc: 'Immune from being kicked from mic seats or stream rooms by room co-hosts.', surface: 'Socket Gateway Engine' },
                        { title: 'Ban Protection (Cannot be banned from comments or rooms)', desc: 'Absolute immunity from being muted, banned from chat, or banned from rooms.', surface: 'Socket Gateway Engine' },
                        { title: 'Animated VIP frame', desc: 'Multi-layer animated neon plasma avatar frame with pulsating corona.', surface: 'Avatar Widget' },
                        { title: 'VIP 5 badge', desc: 'Ruby Sovereign VIP 5 crest.', surface: 'Comments & User Lists' },
                        { title: 'VIP 5 frame', desc: 'Ruby Corona animated luxury frame.', surface: 'Avatar Widget' },
                        { title: 'Special VIP 5 gifts', desc: 'Access to Celestial Dragon (15,000 coins) luxury gift.', surface: 'Gift Tray' },
                      ],
                    },
                    6: {
                      title: 'VIP 6 Privileges',
                      subtitle: 'Amber Monarch — Global announcements and priority listing suite ($7,500/mo)',
                      minSpend: '$7,500 / month',
                      badge: 'VIP 6 Badge',
                      perks: [
                        { title: 'All VIP 5 Perks Included', desc: 'Inherits all VIP 1-5 perks including kick & ban protection and animated frame.', surface: 'Inherited' },
                        { title: 'VIP announcement in all rooms (limited daily)', desc: 'Daily global marquee broadcast across every active room announcing your presence.', surface: 'Global Room Marquee' },
                        { title: 'Additional gift set', desc: 'Access to exclusive Phoenix Sovereign supreme luxury gift set (30,000 coins).', surface: 'Gift Tray' },
                        { title: 'Higher priority in lists', desc: 'Pinned near the top in room viewer trays and member catalogs.', surface: 'Audience Lists' },
                        { title: 'VIP 6 badge', desc: 'Amber Monarch VIP 6 insignia.', surface: 'Comments & User Lists' },
                        { title: 'VIP 6 frame', desc: 'Amber Phoenix animated flame frame.', surface: 'Avatar Widget' },
                      ],
                    },
                    7: {
                      title: 'VIP 7 Privileges',
                      subtitle: 'Crimson Emperor — Server-wide login notifications and legendary effects ($10,000/mo)',
                      minSpend: '$10,000 / month',
                      badge: 'VIP 7 Badge',
                      perks: [
                        { title: 'All VIP 6 Perks Included', desc: 'Inherits all VIP 1-6 perks including priority lists and gift catalog.', surface: 'Inherited' },
                        { title: 'Immunity from being kicked', desc: 'Server-level immunity enforced on backend socket gateway against any kick action.', surface: 'Socket Gateway Engine' },
                        { title: 'VIP announcement in all rooms', desc: 'Unrestricted global broadcast marquee in all rooms upon high activity.', surface: 'Global Room Marquee' },
                        { title: 'Higher priority in lists', desc: 'Top-tier ranking in audience drawers and ranking leaderboards.', surface: 'Audience Lists' },
                        { title: 'App login notification', desc: 'System-wide push / alert broadcast to following network when opening the app.', surface: 'Social & Notifications' },
                        { title: 'Legendary login effect', desc: 'Full-screen cinematic entry splash effect when loading into live streams.', surface: 'Live Room Entrance' },
                        { title: 'Special unique name', desc: 'Iridescent styling with custom VIP gradient and typography.', surface: 'User Profile & Rooms' },
                        { title: 'VIP 7 badge', desc: 'Crimson Emperor VIP 7 crest.', surface: 'Comments & User Lists' },
                        { title: 'VIP 7 frame', desc: 'Crimson Dragon Imperial frame.', surface: 'Avatar Widget' },
                        { title: 'Special VIP 7 gifts', desc: 'Access to Nebula Galaxy (60,000 coins) cosmic virtual gift.', surface: 'Gift Tray' },
                      ],
                    },
                    8: {
                      title: 'VIP 8 Privileges',
                      subtitle: 'Supreme Sovereign — Platform supremacy with absolute system priority ($15,000/mo)',
                      minSpend: '$15,000 / month',
                      badge: 'VIP 8 Badge',
                      perks: [
                        { title: 'All VIP 7 Perks Included', desc: 'Inherits the entire catalog of privileges from VIP 1 through VIP 7.', surface: 'Inherited' },
                        { title: 'Higher priority in menus', desc: 'Absolute #1 ranking in all menus, room lists, and participant grids.', surface: 'All App Menus' },
                        { title: 'Unique and exclusive name', desc: 'One-of-a-kind gold-foil animated shimmer styling for username.', surface: 'User Profile & Rooms' },
                        { title: 'Stealthy room access without notification', desc: 'Toggle invisible room entrance without triggering arrival announcements.', surface: 'Live & Voice Rooms' },
                        { title: 'Top VIP frame', desc: 'Gold Emperor Crown frame with dynamic golden light halos.', surface: 'Avatar Widget' },
                        { title: 'Highest login effect', desc: 'The most prestigious animated login splash sequence on the entire platform.', surface: 'Live Room Entrance' },
                        { title: 'Top VIP badge', desc: 'Golden Sovereign VIP 8 top platform insignia.', surface: 'Comments & User Lists' },
                        { title: 'Exclusive VIP identity', desc: 'Unique VIP watermark, golden chat bubble, and emperor badge on all cards.', surface: 'App-wide' },
                        { title: 'Maximum system priority', desc: 'Priority customer service, zero socket rate limits, and highest server rank.', surface: 'Platform Core' },
                        { title: 'Special VIP 8 gifts', desc: 'Access to Throne of Eternity (120,000 coins) highest-tier platform gift.', surface: 'Gift Tray' },
                      ],
                    },
                  };

                  const currentData = matrixData[selectedVipMatrixTier] || matrixData[1];

                  return (
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-slate-900/90 border border-slate-800 gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
                              <Crown className="w-4 h-4 text-amber-400" /> {currentData.title}
                            </h4>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                              Min Spend: {currentData.minSpend}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1">{currentData.subtitle}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleTestVipEntrance(selectedVipMatrixTier)}
                            className="px-3 py-1.5 rounded-lg bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-300 text-xs font-bold border border-cyan-500/40 flex items-center gap-1.5 transition"
                          >
                            <Tv className="w-3.5 h-3.5" /> Test Entrance
                          </button>
                          <button
                            onClick={() => handleTestVipCelebration(selectedVipMatrixTier)}
                            className="px-3 py-1.5 rounded-lg bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 text-xs font-bold border border-amber-500/40 flex items-center gap-1.5 transition"
                          >
                            <Sparkles className="w-3.5 h-3.5" /> Test Level-Up
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {currentData.perks.map((perk, i) => (
                          <div key={i} className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5 flex flex-col justify-between hover:border-slate-700 transition">
                            <div>
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                  {perk.title}
                                </span>
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 font-mono">
                                  VIP {selectedVipMatrixTier}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                                {perk.desc}
                              </p>
                            </div>
                            <span className="text-[10px] text-indigo-400 font-semibold pt-1 border-t border-slate-800/60 block">
                              Surface: {perk.surface}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* VIP MEMBERS TABLE & ADJUSTMENT DESK */}
              <div className="p-5 rounded-2xl bg-[#111827] border border-slate-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Users className="w-5 h-5 text-indigo-400" /> VIP Members Registry &amp; Tier Assignment
                    </h3>
                    <p className="text-xs text-slate-400">
                      View all members, their monthly recharge tracking, vanity Custom IDs, and manually assign VIP levels.
                    </p>
                  </div>
                  <div className="text-xs text-slate-400">
                    Total Registered Members: <strong className="text-white">{users.length}</strong> • Active VIPs: <strong className="text-amber-400">{users.filter(u => (u.vipLevel || 0) > 0).length}</strong>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                        <th className="py-3 px-4">User Details</th>
                        <th className="py-3 px-4">VIP Level</th>
                        <th className="py-3 px-4">Monthly Recharge (USD)</th>
                        <th className="py-3 px-4">Custom Vanity ID</th>
                        <th className="py-3 px-4">Total Recharge</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {users.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-slate-500">
                            No users found in database.
                          </td>
                        </tr>
                      ) : (
                        users.map((user) => {
                          const vLevel = user.vipLevel || 0;
                          return (
                            <tr key={user.id} className="hover:bg-slate-800/30 transition">
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-sm shrink-0 border border-amber-500/30">
                                    {user.displayName ? user.displayName[0] : 'U'}
                                  </div>
                                  <div>
                                    <p className="font-bold text-white flex items-center gap-1.5">
                                      {user.displayName}
                                      <span className="text-[10px] text-slate-500 font-mono">({user.id})</span>
                                    </p>
                                    <p className="text-[11px] text-slate-400">@{user.username}</p>
                                  </div>
                                </div>
                              </td>

                              <td className="py-3 px-4">
                                {vLevel > 0 ? (
                                  <span className="px-2.5 py-1 rounded-full text-xs font-black bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-300 border border-amber-500/40 inline-flex items-center gap-1 shadow-sm">
                                    <Crown className="w-3 h-3 text-amber-400" /> VIP {vLevel}
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-400">
                                    Standard
                                  </span>
                                )}
                              </td>

                              <td className="py-3 px-4">
                                <span className="font-bold text-white text-xs">
                                  ${(user.monthlyRechargedUSD || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                                <span className="text-[10px] text-slate-500 block">
                                  {user.vipBillingMonth ? `Month: ${user.vipBillingMonth}` : 'Current Cycle'}
                                </span>
                              </td>

                              <td className="py-3 px-4">
                                {user.customId ? (
                                  <span className="px-2 py-0.5 rounded bg-slate-900 border border-indigo-500/40 text-indigo-300 font-mono text-xs font-bold">
                                    {user.customId}
                                  </span>
                                ) : (
                                  <span className="text-slate-600 text-[11px] italic">None claimed</span>
                                )}
                              </td>

                              <td className="py-3 px-4">
                                <span className="text-slate-300 text-xs font-medium">
                                  ${(user.totalRechargedUSD || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </td>

                              <td className="py-3 px-4 text-right">
                                <button
                                  onClick={() => {
                                    setVipUserModal(user);
                                    setVipUserForm({
                                      vipLevel: user.vipLevel || 0,
                                      rechargeUSD: 0,
                                      customId: user.customId || '',
                                    });
                                  }}
                                  className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition text-xs font-bold inline-flex items-center gap-1 shadow-sm"
                                >
                                  <Crown className="w-3.5 h-3.5 text-amber-400" /> Adjust VIP
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* VIP EXCLUSIVE GIFTS OVERVIEW */}
              <div className="p-5 rounded-2xl bg-[#111827] border border-slate-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Gift className="w-5 h-5 text-amber-400" /> VIP-Exclusive Virtual Gifts
                    </h3>
                    <p className="text-xs text-slate-400">
                      Gifts restricted to users at or above specific VIP tiers (e.g. VIP 1 Crown, VIP 1 Yacht).
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setGiftForm({ name: '', iconUrl: '👑', costCoins: 50000, diamondsAwarded: 21000, category: 'VIP Exclusive', minVipLevel: 1 });
                      setShowAddGiftModal(true);
                    }}
                    className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl transition shadow-lg shadow-amber-500/25 flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4 text-slate-950" /> Add VIP Exclusive Gift
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {gifts.filter(g => (g.minVipLevel || 0) > 0).length === 0 ? (
                    <div className="col-span-full py-8 text-center text-slate-500 text-xs">
                      No VIP-exclusive gifts found. Use "Add VIP Exclusive Gift" above or edit an existing gift to set VIP level &ge; 1.
                    </div>
                  ) : (
                    gifts.filter(g => (g.minVipLevel || 0) > 0).map((gift) => (
                      <div key={gift.id} className="p-4 rounded-xl bg-slate-900 border border-amber-500/30 flex flex-col items-center text-center relative group">
                        <span className="text-3xl mb-2">{gift.iconUrl}</span>
                        <p className="font-bold text-white text-xs truncate max-w-full">{gift.name}</p>
                        <p className="text-amber-400 font-extrabold text-xs mt-1">{gift.costCoins} <CoinIcon className="w-3.5 h-3.5 ml-1" /></p>
                        <span className="mt-1 text-[9px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold flex items-center gap-1">
                          <Crown className="w-2.5 h-2.5" /> VIP {gift.minVipLevel}+
                        </span>

                        <div className="mt-3 pt-2 border-t border-slate-800/60 w-full flex justify-center gap-2">
                          <button
                            onClick={() => setEditingGift({ ...gift })}
                            className="p-1 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white transition"
                            title="Edit Gift"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          )}
          {portalMode === 'admin' && activeTab === 'moderation' && (
            <ModerationPanel backendUrl={currentBackendUrl} token={adminToken} onToast={showToast} />
          )}

          {portalMode === 'admin' && activeTab === 'notifications' && (
            <NotificationsPanel backendUrl={currentBackendUrl} token={adminToken} onToast={showToast} />
          )}

          {portalMode === 'admin' && activeTab === 'audit_log' && (
            <AuditLogPanel backendUrl={currentBackendUrl} token={adminToken} />
          )}

          {portalMode === 'admin' && activeTab === 'security' && (
            <SecurityPanel backendUrl={currentBackendUrl} token={adminToken} onToast={showToast} />
          )}

          {portalMode === 'admin' && activeTab === 'staff' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black text-white flex items-center gap-2">
                    <UserCog className="w-5 h-5 text-indigo-400" /> Staff Accounts
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Create logins for your team and grant only the permissions they need. Super Admins always have full access.
                  </p>
                </div>
                {can('staff.manage') && (
                  <button
                    onClick={openCreateStaff}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-fuchsia-600 text-white text-sm font-bold shadow-lg shadow-indigo-900/30 hover:opacity-90 transition"
                  >
                    <UserPlus className="w-4 h-4" /> New Staff Account
                  </button>
                )}
              </div>

              <div className="rounded-2xl border border-slate-800 bg-[#111827] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-900/60 text-[11px] uppercase tracking-wider text-slate-400">
                        <th className="px-4 py-3 font-bold">Staff</th>
                        <th className="px-4 py-3 font-bold">Role</th>
                        <th className="px-4 py-3 font-bold">Permissions</th>
                        <th className="px-4 py-3 font-bold">Status</th>
                        <th className="px-4 py-3 font-bold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {staffList.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-10 text-center text-slate-500 text-sm">
                            No staff accounts yet. {can('staff.manage') ? 'Click "New Staff Account" to add one.' : ''}
                          </td>
                        </tr>
                      ) : (
                        staffList.map((staff) => {
                          const isSuper = staff.staffRole === 'SUPER_ADMIN';
                          const perms = staff.effectivePermissions || [];
                          return (
                            <tr key={staff.id} className="hover:bg-slate-900/40 transition">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-600 flex items-center justify-center text-white text-sm font-black">
                                    {(staff.displayName || staff.username || 'S').charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <p className="text-sm font-bold text-white">{staff.displayName || staff.username}</p>
                                    <p className="text-[11px] text-slate-500">
                                      @{staff.username}{staff.email ? ` • ${staff.email}` : ''}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-[10px] px-2 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-bold">
                                  {staff.staffRole || staff.role}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-xs text-slate-300">
                                {isSuper ? (
                                  <span className="text-amber-400 font-bold flex items-center gap-1">
                                    <Crown className="w-3 h-3" /> Full Access
                                  </span>
                                ) : (
                                  `${perms.length} granted`
                                )}
                              </td>
                              <td className="px-4 py-3">
                                {staff.isActive ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Active
                                  </span>
                                ) : (
                                  <span className="text-[11px] font-bold text-red-400">Suspended</span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                {can('staff.manage') ? (
                                  <div className="flex justify-end gap-2">
                                    <button
                                      onClick={() => openEditStaff(staff)}
                                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white transition"
                                      title="Edit staff & permissions"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    {!isSuper && (
                                      <>
                                        <button
                                          onClick={() => handleToggleStaffActive(staff)}
                                          className="p-1 rounded-lg bg-slate-800 hover:bg-amber-600 text-slate-300 hover:text-white transition"
                                          title={staff.isActive === false ? 'Re-enable access' : 'Suspend access'}
                                        >
                                          {staff.isActive === false ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                                        </button>
                                        <button
                                          onClick={() => handleDeleteStaff(staff)}
                                          className="p-1 rounded-lg bg-slate-800 hover:bg-red-600 text-slate-300 hover:text-white transition"
                                          title="Revoke staff access"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </>
                                    )}
                                   </div>
                                 ) : null}
                               </td>
                             </tr>
                           );
                         })
                       )}
                     </tbody>
                   </table>
                </div>
              </div>

              {staffCatalog && (
                <div className="rounded-2xl border border-slate-800 bg-[#111827] p-5">
                  <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-400" /> Role Presets
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {staffCatalog.roles.map((role) => (
                      <div key={role} className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
                        <p className="text-xs font-black text-indigo-300">{role}</p>
                        <p className="text-[11px] text-slate-400 mt-1">
                          {(staffCatalog.presets?.[role]?.length ?? 0)} default permissions
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* ========================================================================= */}
      {/*                               MODAL OVERLAYS                              */}
      {/* ========================================================================= */}

      {/* 0. STAFF & ROLES MODAL */}
      {showStaffModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <UserCog className="w-5 h-5 text-indigo-400" />
                {editingStaff ? `Edit Staff • ${editingStaff.username}` : 'Create Staff Account'}
              </h3>
              <button onClick={() => setShowStaffModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-400 mb-1 block">Username *</label>
                <input
                  type="text"
                  value={staffForm.username}
                  disabled={!!editingStaff}
                  onChange={(e) => setStaffForm({ ...staffForm, username: e.target.value })}
                  placeholder="e.g. moderator_jane"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-indigo-500 disabled:opacity-60"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 mb-1 block">Display Name</label>
                <input
                  type="text"
                  value={staffForm.displayName}
                  onChange={(e) => setStaffForm({ ...staffForm, displayName: e.target.value })}
                  placeholder="e.g. Jane (Support Lead)"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 mb-1 block">Email</label>
                <input
                  type="email"
                  value={staffForm.email}
                  onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                  placeholder="jane@live2030.com"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 mb-1 block">
                  {editingStaff ? 'New Password (leave blank to keep)' : 'Password *'}
                </label>
                <input
                  type="password"
                  value={staffForm.password}
                  onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                  placeholder="Min 6 characters"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 mb-1 block">Role</label>
                <select
                  value={staffForm.staffRole}
                  onChange={(e) => applyStaffRolePreset(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
                >
                  {(staffCatalog?.roles || ['SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'SUPPORT', 'FINANCE']).map((role) => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>
              {editingStaff && (
                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer pb-2.5">
                    <input
                      type="checkbox"
                      checked={staffForm.isActive}
                      onChange={(e) => setStaffForm({ ...staffForm, isActive: e.target.checked })}
                      className="w-4 h-4 accent-indigo-500"
                    />
                    Account Active
                  </label>
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-400">
                  Permissions ({staffForm.permissions.length} selected)
                </label>
                {staffForm.staffRole === 'SUPER_ADMIN' && (
                  <span className="text-[11px] text-amber-400 font-bold">Super Admins always have full access</span>
                )}
              </div>
              <div className="space-y-4 max-h-64 overflow-y-auto rounded-xl border border-slate-800 bg-slate-900/40 p-4">
                {Object.entries(
                  (staffCatalog?.permissions || []).reduce((acc: Record<string, any[]>, p: any) => {
                    const group = p.group || 'General';
                    if (!acc[group]) acc[group] = [];
                    acc[group].push(p);
                    return acc;
                  }, {})
                ).map(([group, perms]) => (
                  <div key={group}>
                    <p className="text-[11px] font-black uppercase tracking-wider text-indigo-300 mb-2">{group}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {(perms as any[]).map((p) => (
                        <label
                          key={p.key}
                          className="flex items-start gap-2 text-xs text-slate-300 cursor-pointer rounded-lg px-2 py-1.5 hover:bg-slate-800/60"
                        >
                          <input
                            type="checkbox"
                            checked={staffForm.permissions.includes(p.key)}
                            onChange={() => toggleStaffPermission(p.key)}
                            className="w-3.5 h-3.5 mt-0.5 accent-indigo-500"
                          />
                          <span>
                            <span className="font-semibold text-slate-200">{p.label}</span>
                            <span className="block text-[10px] text-slate-500 font-mono">{p.key}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
                {(!staffCatalog || (staffCatalog.permissions || []).length === 0) && (
                  <p className="text-xs text-slate-500">Permission catalog unavailable.</p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => { setShowStaffModal(false); setEditingStaff(null); }}
                className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-sm font-bold hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveStaff}
                disabled={isSavingStaff}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-fuchsia-600 text-white text-sm font-bold shadow-lg shadow-indigo-900/30 hover:opacity-90 transition disabled:opacity-60 flex items-center gap-2"
              >
                {isSavingStaff ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Saving…
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" /> {editingStaff ? 'Save Changes' : 'Create Staff'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1. ADD USER MODAL */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-400" /> Create New User Account
              </h3>
              <button onClick={() => setShowAddUserModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-400 mb-1 block">Username *</label>
                <input
                  type="text"
                  value={newUserForm.username}
                  onChange={(e) => setNewUserForm({ ...newUserForm, username: e.target.value })}
                  placeholder="e.g. bella_superstar"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 mb-1 block">Display Name</label>
                <input
                  type="text"
                  value={newUserForm.displayName}
                  onChange={(e) => setNewUserForm({ ...newUserForm, displayName: e.target.value })}
                  placeholder="e.g. Bella Santos ✨"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-400 mb-1 block">Email</label>
                <input
                  type="email"
                  value={newUserForm.email}
                  onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                  placeholder="bella@example.com"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 mb-1 block">Account Role</label>
                <select
                  value={newUserForm.role}
                  onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="USER">Viewer (USER)</option>
                  <option value="HOST">Live Broadcaster (HOST)</option>
                  <option value="COIN_RESELLER">Coin Reseller</option>
                  <option value="AGENCY_ADMIN">Agency Admin</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-400 mb-1 flex items-center gap-1">Coins <CoinIcon className="w-3.5 h-3.5" /></label>
                <input
                  type="number"
                  value={newUserForm.coins}
                  onChange={(e) => setNewUserForm({ ...newUserForm, coins: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 mb-1 block">Diamonds 💎</label>
                <input
                  type="number"
                  value={newUserForm.diamonds}
                  onChange={(e) => setNewUserForm({ ...newUserForm, diamonds: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowAddUserModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateUser}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30"
              >
                Create Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. EDIT USER MODAL */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-indigo-400" /> Edit User @{editingUser.username}
              </h3>
              <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 mb-1 block">Display Name</label>
              <input
                type="text"
                value={editingUser.displayName}
                onChange={(e) => setEditingUser({ ...editingUser, displayName: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 mb-1 block">Email</label>
              <input
                type="email"
                value={editingUser.email || ''}
                onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-400 mb-1 block">Role</label>
                <select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="USER">USER</option>
                  <option value="HOST">HOST</option>
                  <option value="COIN_RESELLER">COIN_RESELLER</option>
                  <option value="AGENCY_ADMIN">AGENCY_ADMIN</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 mb-1 block">Status</label>
                <select
                  value={editingUser.status}
                  onChange={(e) => setEditingUser({ ...editingUser, status: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="SUSPENDED_24H">SUSPENDED_24H</option>
                  <option value="SUSPENDED_7D">SUSPENDED_7D</option>
                  <option value="BANNED">BANNED</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-400 mb-1 block">Username</label>
                <input
                  type="text"
                  value={editingUser.username || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
                  placeholder="e.g. star_king"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:border-indigo-400"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 mb-1 block">Custom ID</label>
                <input
                  type="text"
                  value={editingUser.customId || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, customId: e.target.value })}
                  placeholder="e.g. USER_ID"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:border-indigo-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-400 mb-1 block">Custom Name Color</label>
                <input
                  type="text"
                  value={editingUser.customNameColor || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, customNameColor: e.target.value })}
                  placeholder="#FCD34D (VIP 2+ perk)"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:border-indigo-400"
                />
                <p className="text-[10px] text-slate-500 mt-1">Username and Custom ID must be unique across the platform.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">

              <div>
                <label className="text-xs font-bold text-slate-400 mb-1 block">Coins</label>
                <input
                  type="number"
                  value={editingUser.coins}
                  onChange={(e) => setEditingUser({ ...editingUser, coins: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 mb-1 block">Diamonds</label>
                <input
                  type="number"
                  value={editingUser.diamonds}
                  onChange={(e) => setEditingUser({ ...editingUser, diamonds: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateUserDetails}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. SUSPENSION MODAL */}
      {suspensionModalUser && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" /> Apply Temporary Suspension
              </h3>
              <button onClick={() => setSuspensionModalUser(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Applying moderation lock to <span className="font-bold text-white">{suspensionModalUser.displayName}</span> (@{suspensionModalUser.username}).
            </p>

            <div>
              <label className="text-xs font-bold text-slate-400 mb-1 block">Suspension Duration:</label>
              <div className="grid grid-cols-4 gap-2">
                {['24H', '3D', '7D', '30D'].map((dur) => (
                  <button
                    key={dur}
                    type="button"
                    onClick={() => setSuspensionDuration(dur)}
                    className={`py-2 rounded-xl text-xs font-bold transition ${
                      suspensionDuration === dur
                        ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                        : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {dur}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 mb-1 block">Violation Reason:</label>
              <select
                value={suspensionReason}
                onChange={(e) => setSuspensionReason(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                <option value="Harassment / Inappropriate Conduct">Harassment / Inappropriate Conduct</option>
                <option value="Nudity or Sexually Suggestive Content">Nudity or Sexually Suggestive Content</option>
                <option value="Spam / Unsolicited Phishing Links">Spam / Unsolicited Phishing Links</option>
                <option value="Suspected Underage Account">Suspected Underage Account</option>
                <option value="Copyright Audio / Video Infringement">Copyright Audio / Video Infringement</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setSuspensionModalUser(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleApplySuspension}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 text-xs font-extrabold shadow-lg shadow-amber-600/30"
              >
                Apply Suspension
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. WALLET ADJUSTMENT MODAL (DELTA OR SET EXACT BALANCE) */}
      {walletModalUser && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Wallet className="w-5 h-5 text-indigo-400" /> Admin Wallet Control Console
              </h3>
              <button onClick={() => setWalletModalUser(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 text-xs text-slate-300 flex justify-between items-center">
              <div>
                <span className="font-bold text-white text-sm block">{walletModalUser.displayName}</span>
                <span className="text-slate-400 text-[11px]">@{walletModalUser.username} ({walletModalUser.role})</span>
              </div>
              <div className="text-right">
                <span className="text-amber-400 font-bold flex items-center gap-1"><CoinIcon className="w-3.5 h-3.5" /> {(walletModalUser.coins || 0).toLocaleString()}</span>
                <span className="text-cyan-400 text-[11px] flex items-center gap-1"><DiamondIcon className="w-3.5 h-3.5" /> {(walletModalUser.diamonds || 0).toLocaleString()}</span>
              </div>
            </div>

            {/* Mode Switcher */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-900 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setWalletAdjustMode('DELTA')}
                className={`py-1.5 rounded-lg text-xs font-bold transition ${
                  walletAdjustMode === 'DELTA'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                +/- Adjust by Delta
              </button>
              <button
                type="button"
                onClick={() => setWalletAdjustMode('SET')}
                className={`py-1.5 rounded-lg text-xs font-bold transition ${
                  walletAdjustMode === 'SET'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                = Set Exact Balance
              </button>
            </div>

            {walletAdjustMode === 'DELTA' ? (
              <div className="space-y-3">
                {/* Quick Presets */}
                <div className="space-y-1">
                  <span className="text-[11px] text-slate-400 font-semibold block">Quick Coin Delta:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {[1000, 5000, 10000, -1000].map((delta) => (
                      <button
                        key={delta}
                        type="button"
                        onClick={() => setWalletCoinDelta(delta)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition ${
                          walletCoinDelta === delta
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <span className="flex items-center gap-1">{delta > 0 ? `+${delta.toLocaleString()}` : delta.toLocaleString()} <CoinIcon className="w-3.5 h-3.5" /></span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] text-slate-400 font-semibold block">Quick Diamond Delta:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {[500, 2500, 10000, -500].map((delta) => (
                      <button
                        key={delta}
                        type="button"
                        onClick={() => setWalletDiamondDelta(delta)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition ${
                          walletDiamondDelta === delta
                            ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <span className="flex items-center gap-1">{delta > 0 ? `+${delta.toLocaleString()}` : delta.toLocaleString()} <DiamondIcon className="w-3.5 h-3.5" /></span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-xs font-bold text-amber-400 mb-1 block">Coin Delta (+/-):</label>
                    <input
                      type="number"
                      value={walletCoinDelta}
                      onChange={(e) => setWalletCoinDelta(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-cyan-400 mb-1 block">Diamond Delta (+/-):</label>
                    <input
                      type="number"
                      value={walletDiamondDelta}
                      onChange={(e) => setWalletDiamondDelta(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-amber-400 mb-1 flex items-center gap-1">Exact New Coins <CoinIcon className="w-3.5 h-3.5" />:</label>
                    <input
                      type="number"
                      min="0"
                      value={walletSetCoins}
                      onChange={(e) => setWalletSetCoins(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-cyan-400 mb-1 flex items-center gap-1">Exact New Diamonds <DiamondIcon className="w-3.5 h-3.5" />:</label>
                    <input
                      type="number"
                      min="0"
                      value={walletSetDiamonds}
                      onChange={(e) => setWalletSetDiamonds(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-bold"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 italic">This will set the user's wallet balance directly to the specified amounts in PostgreSQL.</p>
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-slate-400 mb-1 block">Audit Memo / Reason:</label>
              <input
                type="text"
                value={walletReason}
                onChange={(e) => setWalletReason(e.target.value)}
                placeholder="e.g. Tournament award, refund, compensation..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setWalletModalUser(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyWalletAdjustment}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30"
              >
                Apply Adjustment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. ADD GIFT MODAL */}
      {showAddGiftModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Gift className="w-5 h-5 text-indigo-400" /> Add New Virtual Gift
              </h3>
              <button onClick={() => setShowAddGiftModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 mb-1 block">Gift Name *</label>
              <input
                type="text"
                value={giftForm.name}
                onChange={(e) => setGiftForm({ ...giftForm, name: e.target.value })}
                placeholder="e.g. Diamond Crown 👑"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 mb-1 block">Emoji Icon</label>
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  value={giftForm.iconUrl}
                  onChange={(e) => setGiftForm({ ...giftForm, iconUrl: e.target.value })}
                  className="w-20 text-center text-xl bg-slate-900 border border-slate-800 rounded-xl px-2 py-1.5 text-white"
                />
                <span className="text-[11px] text-slate-400">Quick presets:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {['🌹', '💍', '🏎️', '🚀', '🛥️', '👑', '🦄', '🪐', '💎', '🏰', '🦁', '🌟'].map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => setGiftForm({ ...giftForm, iconUrl: em })}
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-lg transition"
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-400 mb-1 flex items-center gap-1">Cost in Coins <CoinIcon className="w-3.5 h-3.5" /></label>
                <input
                  type="number"
                  value={giftForm.costCoins}
                  onChange={(e) => {
                    const cost = Number(e.target.value);
                    setGiftForm({ ...giftForm, costCoins: cost, diamondsAwarded: Math.floor(cost * 0.42) });
                  }}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 mb-1 flex items-center gap-1">Diamonds Awarded <DiamondIcon className="w-3.5 h-3.5" /></label>
                <input
                  type="number"
                  value={giftForm.diamondsAwarded}
                  onChange={(e) => setGiftForm({ ...giftForm, diamondsAwarded: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 mb-1 block">Category</label>
              <select
                value={giftForm.category}
                onChange={(e) => setGiftForm({ ...giftForm, category: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              >
                <option value="Luxury">Luxury</option>
                <option value="Romantic">Romantic</option>
                <option value="Premium">Premium</option>
                <option value="Fun">Fun</option>
                <option value="Exclusive">Exclusive</option>
                <option value="VIP Exclusive">VIP Exclusive</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-amber-400 mb-1 flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5" /> VIP Exclusive Level
              </label>
              <select
                value={giftForm.minVipLevel || 0}
                onChange={(e) => setGiftForm({ ...giftForm, minVipLevel: Number(e.target.value) })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              >
                <option value={0}>Standard (All Users Can Send)</option>
                <option value={1}>VIP 1+ Exclusive ($500/mo spenders)</option>
                <option value={2}>VIP 2+ Exclusive ($1,000/mo spenders)</option>
                <option value={3}>VIP 3+ Exclusive ($2,000/mo spenders)</option>
                <option value={4}>VIP 4+ Exclusive ($3,500/mo spenders)</option>
                <option value={5}>VIP 5+ Exclusive ($5,000/mo spenders)</option>
                <option value={6}>VIP 6+ Exclusive ($7,500/mo spenders)</option>
                <option value={7}>VIP 7+ Exclusive ($10,000/mo spenders)</option>
                <option value={8}>VIP 8+ Exclusive ($15,000/mo spenders)</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowAddGiftModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateGift}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30"
              >
                Add to Catalog
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. EDIT GIFT MODAL */}
      {editingGift && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-indigo-400" /> Edit Gift: {editingGift.name}
              </h3>
              <button onClick={() => setEditingGift(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 mb-1 block">Gift Name</label>
              <input
                type="text"
                value={editingGift.name}
                onChange={(e) => setEditingGift({ ...editingGift, name: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 mb-1 block">Icon Emoji</label>
              <input
                type="text"
                value={editingGift.iconUrl}
                onChange={(e) => setEditingGift({ ...editingGift, iconUrl: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-400 mb-1 block">Cost in Coins</label>
                <input
                  type="number"
                  value={editingGift.costCoins}
                  onChange={(e) => setEditingGift({ ...editingGift, costCoins: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 mb-1 block">Diamonds Awarded</label>
                <input
                  type="number"
                  value={editingGift.diamondsAwarded}
                  onChange={(e) => setEditingGift({ ...editingGift, diamondsAwarded: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 mb-1 block">Category</label>
              <select
                value={editingGift.category}
                onChange={(e) => setEditingGift({ ...editingGift, category: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              >
                <option value="Luxury">Luxury</option>
                <option value="Romantic">Romantic</option>
                <option value="Premium">Premium</option>
                <option value="Fun">Fun</option>
                <option value="Exclusive">Exclusive</option>
                <option value="VIP Exclusive">VIP Exclusive</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-amber-400 mb-1 flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5" /> VIP Exclusive Level
              </label>
              <select
                value={editingGift.minVipLevel || 0}
                onChange={(e) => setEditingGift({ ...editingGift, minVipLevel: Number(e.target.value) })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              >
                <option value={0}>Standard (All Users Can Send)</option>
                <option value={1}>VIP 1+ Exclusive ($500/mo spenders)</option>
                <option value={2}>VIP 2+ Exclusive ($1,000/mo spenders)</option>
                <option value={3}>VIP 3+ Exclusive ($2,000/mo spenders)</option>
                <option value={4}>VIP 4+ Exclusive ($3,500/mo spenders)</option>
                <option value={5}>VIP 5+ Exclusive ($5,000/mo spenders)</option>
                <option value={6}>VIP 6+ Exclusive ($7,500/mo spenders)</option>
                <option value={7}>VIP 7+ Exclusive ($10,000/mo spenders)</option>
                <option value={8}>VIP 8+ Exclusive ($15,000/mo spenders)</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setEditingGift(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateGift}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6b. ADD COIN PACKAGE MODAL */}
      {showAddCoinPackageModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Coins className="w-5 h-5 text-amber-400" /> Add New Coin Package
              </h3>
              <button onClick={() => setShowAddCoinPackageModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 mb-1 block">Package Name</label>
              <input
                type="text"
                value={coinPackageForm.name}
                onChange={(e) => setCoinPackageForm({ ...coinPackageForm, name: e.target.value })}
                placeholder="e.g. Mega Pack"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-400 mb-1 flex items-center gap-1">Base Coins <CoinIcon className="w-3.5 h-3.5" /></label>
                <input
                  type="number"
                  min={1}
                  value={coinPackageForm.coins}
                  onChange={(e) => setCoinPackageForm({ ...coinPackageForm, coins: Number(e.target.value) || 0 })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 mb-1 flex items-center gap-1">Bonus Coins <CoinIcon className="w-3.5 h-3.5" /></label>
                <input
                  type="number"
                  min={0}
                  value={coinPackageForm.bonusCoins}
                  onChange={(e) => setCoinPackageForm({ ...coinPackageForm, bonusCoins: Number(e.target.value) || 0 })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs">
              <span className="text-slate-400">User receives: </span>
              <span className="font-extrabold text-amber-400">
                {(Number(coinPackageForm.coins) || 0) + (Number(coinPackageForm.bonusCoins) || 0)} 🪙 total
              </span>
            </div>

            <div>
              <label className="text-xs font-bold text-emerald-400 mb-1 block">USD Price ($)</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={coinPackageForm.amountUSD}
                onChange={(e) => setCoinPackageForm({ ...coinPackageForm, amountUSD: Number(e.target.value) || 0 })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Auto-converted to {Number((Number(coinPackageForm.amountUSD) * USD_TO_SAR_RATE).toFixed(2))} SAR for the payment gateway
                (rate: {USD_TO_SAR_RATE}).
              </p>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 mb-1 block">Badge / Marketing Label</label>
              <input
                type="text"
                value={coinPackageForm.badge}
                onChange={(e) => setCoinPackageForm({ ...coinPackageForm, badge: e.target.value })}
                placeholder="e.g. +25% Extra ✨"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>

            <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={coinPackageForm.popular}
                onChange={(e) => setCoinPackageForm({ ...coinPackageForm, popular: e.target.checked })}
                className="w-4 h-4 rounded accent-amber-500"
              />
              Mark as <span className="text-amber-400 font-bold">POPULAR</span> (featured on checkout)
            </label>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowAddCoinPackageModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCoinPackage}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold shadow-lg shadow-amber-500/30"
              >
                Add &amp; Sync to Website
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6c. EDIT COIN PACKAGE MODAL */}
      {editingCoinPackage && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-amber-400" /> Edit Coin Package
              </h3>
              <button onClick={() => setEditingCoinPackage(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400 font-mono">{editingCoinPackage.id}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${editingCoinPackage.isActive !== false ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                {editingCoinPackage.isActive !== false ? 'Active' : 'Disabled'}
              </span>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 mb-1 block">Package Name</label>
              <input
                type="text"
                value={editingCoinPackage.name}
                onChange={(e) => setEditingCoinPackage({ ...editingCoinPackage, name: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-400 mb-1 flex items-center gap-1">Base Coins <CoinIcon className="w-3.5 h-3.5" /></label>
                <input
                  type="number"
                  min={1}
                  value={editingCoinPackage.coins}
                  onChange={(e) => setEditingCoinPackage({ ...editingCoinPackage, coins: Number(e.target.value) || 0 })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 mb-1 flex items-center gap-1">Bonus Coins <CoinIcon className="w-3.5 h-3.5" /></label>
                <input
                  type="number"
                  min={0}
                  value={editingCoinPackage.bonusCoins}
                  onChange={(e) => setEditingCoinPackage({ ...editingCoinPackage, bonusCoins: Number(e.target.value) || 0 })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs">
              <span className="text-slate-400">User receives: </span>
              <span className="font-extrabold text-amber-400">
                {(Number(editingCoinPackage.coins) || 0) + (Number(editingCoinPackage.bonusCoins) || 0)} 🪙 total
              </span>
            </div>

            <div>
              <label className="text-xs font-bold text-emerald-400 mb-1 block">USD Price ($)</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={editingCoinPackage.amountUSD}
                onChange={(e) => setEditingCoinPackage({ ...editingCoinPackage, amountUSD: Number(e.target.value) || 0 })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Payment gateway will charge {Number((Number(editingCoinPackage.amountUSD) * USD_TO_SAR_RATE).toFixed(2))} SAR
                (rate: {USD_TO_SAR_RATE}).
              </p>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 mb-1 block">Badge / Marketing Label</label>
              <input
                type="text"
                value={editingCoinPackage.badge || ''}
                onChange={(e) => setEditingCoinPackage({ ...editingCoinPackage, badge: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>

            <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={editingCoinPackage.popular}
                onChange={(e) => setEditingCoinPackage({ ...editingCoinPackage, popular: e.target.checked })}
                className="w-4 h-4 rounded accent-amber-500"
              />
              Mark as <span className="text-amber-400 font-bold">POPULAR</span> (featured on checkout)
            </label>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setEditingCoinPackage(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateCoinPackage}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold shadow-lg shadow-amber-500/30"
              >
                Save &amp; Sync to Website
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GAMES CONFIGURATION MODAL */}
      {editingGame && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Gamepad2 className="w-5 h-5 text-emerald-400" /> Configure {editingGame.icon} {editingGame.name}
              </h3>
              <button onClick={() => setEditingGame(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400 font-mono">{editingGame.id}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${gameForm.isEnabled ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                {gameForm.isEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>

            <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={gameForm.isEnabled}
                onChange={(e) => setGameForm({ ...gameForm, isEnabled: e.target.checked })}
                className="w-4 h-4 rounded accent-emerald-500"
              />
              Game is <span className="text-emerald-400 font-bold">enabled</span> (visible to users)
            </label>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-400 mb-1 block">Min VIP Level</label>
                <input
                  type="number"
                  min={0}
                  max={8}
                  value={gameForm.minVipLevel}
                  onChange={(e) => setGameForm({ ...gameForm, minVipLevel: Number(e.target.value) || 0 })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
                <p className="text-[10px] text-slate-500 mt-1">0 = all VIP levels</p>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 mb-1 block">Min User Level</label>
                <input
                  type="number"
                  min={1}
                  value={gameForm.minUserLevel}
                  onChange={(e) => setGameForm({ ...gameForm, minUserLevel: Number(e.target.value) || 1 })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
                <p className="text-[10px] text-slate-500 mt-1">1 = everyone</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-400 mb-1 block">Min Bet (coins)</label>
                <input
                  type="number"
                  min={1}
                  value={gameForm.minBet}
                  onChange={(e) => setGameForm({ ...gameForm, minBet: Number(e.target.value) || 1 })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 mb-1 block">Max Bet (coins)</label>
                <input
                  type="number"
                  min={1}
                  value={gameForm.maxBet}
                  onChange={(e) => setGameForm({ ...gameForm, maxBet: Number(e.target.value) || 1 })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 mb-2 block">Available Surfaces</label>
              <div className="grid grid-cols-3 gap-2 text-[11px]">
                <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer">
                  <input type="checkbox" checked={gameForm.allowInLive} onChange={(e) => setGameForm({ ...gameForm, allowInLive: e.target.checked })} className="accent-emerald-500" />
                  📹 Live
                </label>
                <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer">
                  <input type="checkbox" checked={gameForm.allowInVoice} onChange={(e) => setGameForm({ ...gameForm, allowInVoice: e.target.checked })} className="accent-emerald-500" />
                  🎙️ Voice
                </label>
                <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer">
                  <input type="checkbox" checked={gameForm.allowStandalone} onChange={(e) => setGameForm({ ...gameForm, allowStandalone: e.target.checked })} className="accent-emerald-500" />
                  🎮 Solo
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setEditingGame(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveGame}
                className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold shadow-lg shadow-emerald-500/30"
              >
                Save &amp; Sync Live
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. VIP USER ADJUSTMENT MODAL */}
      {vipUserModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-amber-500/40 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-400" /> Adjust VIP Privileges: @{vipUserModal.username}
              </h3>
              <button onClick={() => setVipUserModal(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-base border border-amber-500/30">
                {vipUserModal.displayName ? vipUserModal.displayName[0] : 'U'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-white text-sm truncate">{vipUserModal.displayName}</p>
                <p className="text-xs text-slate-400 font-mono truncate">ID: {vipUserModal.id}</p>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 mb-1 block">VIP Tier Assignment</label>
              <select
                value={vipUserForm.vipLevel}
                onChange={(e) => {
                  setVipUserForm({
                    ...vipUserForm,
                    vipLevel: Number(e.target.value),
                  });
                }}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              >
                <option value={0}>Standard (No VIP Privileges)</option>
                <option value={1}>VIP 1 ($500/mo - 13 Privileges Active)</option>
                <option value={2}>VIP 2 ($1,000/mo)</option>
                <option value={3}>VIP 3 ($2,000/mo)</option>
                <option value={4}>VIP 4 ($3,500/mo)</option>
                <option value={5}>VIP 5 ($5,000/mo)</option>
                <option value={6}>VIP 6 ($7,500/mo)</option>
                <option value={7}>VIP 7 ($10,000/mo)</option>
                <option value={8}>VIP 8 ($15,000/mo - Royal Emperor)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 mb-1 block">Add Recharge Credit (USD $)</label>
              <input
                type="number"
                value={vipUserForm.rechargeUSD}
                onChange={(e) => setVipUserForm({ ...vipUserForm, rechargeUSD: Number(e.target.value) })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                placeholder="0"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Credits the user&apos;s cumulative recharge total (0 = keep the current total).
              </p>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 mb-1 block">Vanity Custom ID (VIP 1+ Perk)</label>
              <input
                type="text"
                value={vipUserForm.customId}
                onChange={(e) => setVipUserForm({ ...vipUserForm, customId: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white uppercase font-mono"
                placeholder="e.g. VIP_KING"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Displayed in live room chats, voice parties, and profile banner.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setVipUserModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveUserVip}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/25"
              >
                Save VIP Status
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. EDIT VIP LEVEL CONFIG MODAL */}
      {editingVipLevel && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-400" /> Configure VIP Tier #{editingVipLevel.level}: {editingVipLevel.title}
              </h3>
              <button onClick={() => setEditingVipLevel(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-400 mb-1 block">Tier Title</label>
                <input
                  type="text"
                  value={editingVipLevel.title || ''}
                  onChange={(e) => setEditingVipLevel({ ...editingVipLevel, title: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 mb-1 block">Monthly USD Spend Threshold ($)</label>
                <input
                  type="number"
                  value={editingVipLevel.minRechargeUSD || 0}
                  onChange={(e) => setEditingVipLevel({ ...editingVipLevel, minRechargeUSD: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-400 mb-1 block">Badge Title</label>
                <input
                  type="text"
                  value={editingVipLevel.badgeTitle || ''}
                  onChange={(e) => setEditingVipLevel({ ...editingVipLevel, badgeTitle: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 mb-1 block">Chat Bubble Style</label>
                <input
                  type="text"
                  value={editingVipLevel.chatBubbleStyle || ''}
                  onChange={(e) => setEditingVipLevel({ ...editingVipLevel, chatBubbleStyle: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-400 mb-1 block">Badge Color</label>
                <input
                  type="text"
                  value={editingVipLevel.badgeColor || ''}
                  onChange={(e) => setEditingVipLevel({ ...editingVipLevel, badgeColor: e.target.value })}
                  placeholder="#F59E0B"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 mb-1 block">Name Color</label>
                <input
                  type="text"
                  value={editingVipLevel.nameColor || ''}
                  onChange={(e) => setEditingVipLevel({ ...editingVipLevel, nameColor: e.target.value })}
                  placeholder="#FCD34D"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 mb-1 block">Entry Effect</label>
                <select
                  value={editingVipLevel.entryEffectType || 'NONE'}
                  onChange={(e) => setEditingVipLevel({ ...editingVipLevel, entryEffectType: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="NONE">None</option>
                  <option value="SPECIAL">Special</option>
                  <option value="LEGENDARY">Legendary</option>
                  <option value="HIGHEST">Highest</option>
                </select>
              </div>
            </div>

            <div className="space-y-3 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-amber-400 block">Privilege Flags &amp; Feature Controls</label>
                <span className="text-[10px] text-slate-500">
                  {Object.values(editingVipLevel.features || {}).filter(Boolean).length} / {vipFeatureCatalog.length} enabled
                </span>
              </div>
              {vipFeatureCatalog.length === 0 && (
                <p className="text-[11px] text-slate-500">Benefit catalog unavailable — check the backend connection.</p>
              )}
              {vipFeatureCategories.map((cat) => {
                const items = vipFeatureCatalog.filter((f) => f.category === cat.key);
                if (items.length === 0) return null;
                return (
                  <div key={cat.key} className="space-y-1.5">
                    <p className="text-[10px] uppercase tracking-wide font-bold text-slate-500">{cat.label}</p>
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                      {items.map(({ key, label, description }) => {
                        const features = editingVipLevel.features || {};
                        const isChecked = features[key] ?? false;
                        return (
                          <label
                            key={key}
                            title={description}
                            className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/60 border border-slate-800/80 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                setEditingVipLevel({
                                  ...editingVipLevel,
                                  features: {
                                    ...features,
                                    [key]: e.target.checked,
                                  },
                                });
                              }}
                              className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-[11px] font-medium">{label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setEditingVipLevel(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveVipConfig(editingVipLevel)}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30"
              >
                Save Configuration
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. ADD RESELLER MODAL */}
      {showAddResellerModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Coins className="w-5 h-5 text-amber-400" /> Register Official Coin Vendor
              </h3>
              <button onClick={() => setShowAddResellerModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 mb-1 block">Merchant Business Name *</label>
              <input
                type="text"
                value={resellerForm.businessName}
                onChange={(e) => setResellerForm({ ...resellerForm, businessName: e.target.value })}
                placeholder="e.g. Golden Star Global Merchant"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 mb-1 block">WhatsApp Number (with country code) *</label>
              <input
                type="text"
                value={resellerForm.whatsappNumber}
                onChange={(e) => setResellerForm({ ...resellerForm, whatsappNumber: e.target.value })}
                placeholder="+1 555-234-8901"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-400 mb-1 block">Coin Stock Quota</label>
                <input
                  type="number"
                  value={resellerForm.coinStock}
                  onChange={(e) => setResellerForm({ ...resellerForm, coinStock: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 mb-1 block">Operating Region</label>
                <input
                  type="text"
                  value={resellerForm.region}
                  onChange={(e) => setResellerForm({ ...resellerForm, region: e.target.value })}
                  placeholder="e.g. UAE & MENA"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowAddResellerModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateReseller}
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 text-xs font-extrabold shadow-lg shadow-amber-600/30"
              >
                Register Vendor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. EDIT RESELLER MODAL */}
      {editingReseller && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-amber-400" /> Edit Reseller: {editingReseller.businessName}
              </h3>
              <button onClick={() => setEditingReseller(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 mb-1 block">Business Name</label>
              <input
                type="text"
                value={editingReseller.businessName}
                onChange={(e) => setEditingReseller({ ...editingReseller, businessName: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 mb-1 block">WhatsApp Number</label>
              <input
                type="text"
                value={editingReseller.whatsappNumber}
                onChange={(e) => setEditingReseller({ ...editingReseller, whatsappNumber: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-400 mb-1 block">Coin Stock</label>
                <input
                  type="number"
                  value={editingReseller.coinStock}
                  onChange={(e) => setEditingReseller({ ...editingReseller, coinStock: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 mb-1 block">Region</label>
                <input
                  type="text"
                  value={editingReseller.region}
                  onChange={(e) => setEditingReseller({ ...editingReseller, region: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setEditingReseller(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateReseller}
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 text-xs font-extrabold shadow-lg shadow-amber-600/30"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUPER ADMIN: NEW AGENCY CREATED CREDENTIALS MODAL        */}
      {/* ========================================================= */}
      {showNewAgencyCreatedModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-pink-500/40 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-pink-500 to-amber-400 p-[2px] shadow-lg shadow-pink-500/30">
              <div className="w-full h-full bg-[#0F1420] rounded-[14px] flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
            </div>

            <h3 className="text-lg font-black text-white">Agency Successfully Created!</h3>
            <p className="text-xs text-slate-400">
              Share these credentials with the agency manager so they can log in to their Agency Portal.
            </p>

            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-left space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Agency Name:</span>
                <strong className="text-white">{showNewAgencyCreatedModal.name}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Invite Code:</span>
                <strong className="text-pink-400 font-mono text-sm">{showNewAgencyCreatedModal.code}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Manager Email:</span>
                <strong className="text-white">{showNewAgencyCreatedModal.managerEmail}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">WhatsApp Contact:</span>
                <strong className="text-emerald-400 font-mono text-xs">{showNewAgencyCreatedModal.whatsappNumber || '+91 98765 43210'}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Login Password:</span>
                <strong className="text-amber-300 font-mono text-sm">{showNewAgencyCreatedModal.password}</strong>
              </div>
              <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-[11px]">
                <span className="text-slate-400">Agency Portal:</span>
                <a href="/agency" target="_blank" rel="noopener noreferrer" className="text-pink-400 underline font-bold">
                  /agency ↗
                </a>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleCopyAgencyCredentials(showNewAgencyCreatedModal)}
                className="flex-1 py-2.5 bg-gradient-to-r from-pink-600 to-pink-500 hover:from-pink-500 hover:to-pink-400 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 shadow-lg shadow-pink-600/30"
              >
                <Share2 className="w-3.5 h-3.5" /> Copy WhatsApp Message
              </button>
              <button
                onClick={() => setShowNewAgencyCreatedModal(null)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUPER ADMIN: RECHARGE AGENCY COINS MODAL                 */}
      {/* ========================================================= */}
      {showRechargeAgencyCoinsModal && selectedAgencyForCoins && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-amber-500/40 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Coins className="w-5 h-5 text-amber-400" /> Recharge Agency Coins
              </h3>
              <button onClick={() => setShowRechargeAgencyCoinsModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Deposit coins into <strong>{selectedAgencyForCoins.name}</strong> ({selectedAgencyForCoins.code}) wallet.
              Current Balance: <strong className="text-amber-300 inline-flex items-center gap-1"><CoinIcon className="w-4 h-4" /> {(selectedAgencyForCoins.coinBalance || 0).toLocaleString()} Coins</strong>
            </p>

            <div>
              <label className="text-xs font-bold text-slate-300 mb-1 block">Coins to Deposit *</label>
              <input
                type="number"
                value={rechargeCoinsAmount}
                onChange={(e) => setRechargeCoinsAmount(e.target.value)}
                placeholder="e.g. 50000"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-bold text-amber-300 focus:border-amber-400 outline-none"
              />

              {/* Quick Recharge Amount Buttons */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {['10000', '50000', '100000', '500000', '1000000'].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setRechargeCoinsAmount(amt)}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-amber-300"
                  >
                    +{parseInt(amt, 10).toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 mb-1 block">Recharge Reason / Audit Note</label>
              <input
                type="text"
                value={rechargeCoinsNotes}
                onChange={(e) => setRechargeCoinsNotes(e.target.value)}
                placeholder="e.g. Monthly allocation / Wire payment received"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowRechargeAgencyCoinsModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRechargeCoins}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold shadow-lg shadow-amber-500/20"
              >
                Deposit Coins Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUPER ADMIN: RESET AGENCY PASSWORD MODAL                 */}
      {/* ========================================================= */}
      {showResetAgencyPasswordModal && selectedAgencyForCoins && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Key className="w-5 h-5 text-indigo-400" /> Reset Agency Password
              </h3>
              <button onClick={() => setShowResetAgencyPasswordModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Update password for <strong>{selectedAgencyForCoins.name}</strong> ({selectedAgencyForCoins.code}).
            </p>

            <div>
              <label className="text-xs font-bold text-slate-300 mb-1 block">New Password *</label>
              <input
                type="text"
                value={newAgencyPasswordInput}
                onChange={(e) => setNewAgencyPasswordInput(e.target.value)}
                placeholder="Enter new password"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-indigo-400 outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowResetAgencyPasswordModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveResetPassword}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30"
              >
                Save New Password
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. ADD AGENCY MODAL */}
      {showAddAgencyModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Building2 className="w-5 h-5 text-pink-400" /> Register Certified Talent Agency
              </h3>
              <button onClick={() => setShowAddAgencyModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 mb-1 block">Agency Name *</label>
              <input
                type="text"
                value={agencyForm.name}
                onChange={(e) => setAgencyForm({ ...agencyForm, name: e.target.value })}
                placeholder="e.g. StarLight Global Talent"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-400 mb-1 block">Agency Code *</label>
                <input
                  type="text"
                  value={agencyForm.code}
                  onChange={(e) => setAgencyForm({ ...agencyForm, code: e.target.value.toUpperCase() })}
                  placeholder="AGENCY-STAR-01"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 mb-1 block">Commission Cut (%)</label>
                <input
                  type="number"
                  value={agencyForm.commissionPercent}
                  onChange={(e) => setAgencyForm({ ...agencyForm, commissionPercent: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 mb-1 block">Manager Email</label>
              <input
                type="email"
                value={agencyForm.managerEmail}
                onChange={(e) => setAgencyForm({ ...agencyForm, managerEmail: e.target.value })}
                placeholder="manager@starlight.com"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-emerald-400 mb-1 block flex items-center gap-1">
                <Phone className="w-3.5 h-3.5" /> Official WhatsApp Number (with Country Code) *
              </label>
              <input
                type="text"
                value={agencyForm.whatsappNumber}
                onChange={(e) => setAgencyForm({ ...agencyForm, whatsappNumber: e.target.value })}
                placeholder="+91 98765 43210 or +1 555 019 2834"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500 outline-none"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                This WhatsApp number and available coins will automatically appear in the mobile app under Coin Recharge.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowAddAgencyModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateAgency}
                className="px-5 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold shadow-lg shadow-pink-600/30"
              >
                Register Agency
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 10. EDIT AGENCY MODAL */}
      {editingAgency && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-pink-400" /> Edit Agency: {editingAgency.name}
              </h3>
              <button onClick={() => setEditingAgency(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 mb-1 block">Agency Name</label>
              <input
                type="text"
                value={editingAgency.name}
                onChange={(e) => setEditingAgency({ ...editingAgency, name: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 mb-1 block">Manager Email</label>
              <input
                type="email"
                value={editingAgency.managerEmail}
                onChange={(e) => setEditingAgency({ ...editingAgency, managerEmail: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 mb-1 block">Commission Percent (%)</label>
              <input
                type="number"
                value={editingAgency.commissionPercent}
                onChange={(e) => setEditingAgency({ ...editingAgency, commissionPercent: Number(e.target.value) })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setEditingAgency(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateAgency}
                className="px-5 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold shadow-lg shadow-pink-600/30"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 11. VIEW AGENCY HOST ROSTER MODAL (REAL BOUND TALENT) */}
      {rosterAgency && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-pink-400" /> {rosterAgency.name} — Host Roster
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Code: <span className="font-mono text-white font-bold">{rosterAgency.code}</span> • Commission Cut: {rosterAgency.commissionPercent}%</p>
              </div>
              <button onClick={() => setRosterAgency(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* AGENCY REVENUE BANNER IN ROSTER */}
            <div className="p-3 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 rounded-xl border border-emerald-500/30 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1">
                  <Coins className="w-3 h-3" /> Agency Wallet Revenue
                </span>
                <p className="text-base font-black text-white mt-0.5">
                  ${(rosterAgency.walletBalanceUSD || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                </p>
              </div>
              <button
                onClick={() => {
                  setRosterAgency(null);
                  handleOpenAdjustAgencyRevenue(rosterAgency);
                }}
                className="px-2.5 py-1.5 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-bold transition flex items-center gap-1"
              >
                <Edit2 className="w-3 h-3" /> Adjust Revenue
              </button>
            </div>

            <div className="space-y-2">
              {isLoadingRoster ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  Loading recruited broadcasters...
                </div>
              ) : rosterHosts.length === 0 ? (
                <div className="p-6 text-center text-slate-500 bg-slate-900/50 rounded-xl border border-slate-800 text-xs">
                  No broadcasters currently bound to invite code <span className="text-white font-bold">{rosterAgency.code}</span>.
                </div>
              ) : (
                rosterHosts.map((binding: any) => {
                  const host = binding.host || binding;
                  const wallet = host.wallet || {};
                  const diamonds = binding.diamondsEarned ?? wallet.totalDiamondsEarned ?? wallet.diamonds ?? 0;
                  const hostRevenueUSD = binding.revenueContributedUSD ?? parseFloat((diamonds * 0.01).toFixed(2));
                  return (
                    <div key={binding.id || host.id} className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-xs">
                          {host.displayName ? host.displayName[0] : 'H'}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">{host.displayName}</p>
                          <p className="text-[11px] text-slate-400">@{host.username}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-cyan-400 font-bold">💎 {diamonds.toLocaleString()}</span>
                        <p className="text-[10px] text-emerald-400 font-semibold">Cut: ${((hostRevenueUSD * (rosterAgency.commissionPercent || 12)) / 100).toFixed(2)} USD</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setRosterAgency(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
              >
                Close Roster
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 11b. ADJUST AGENCY WALLET REVENUE MODAL */}
      {showAdjustAgencyRevenueModal && selectedAgencyForRevenue && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-emerald-500/40 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Adjust Agency Wallet Revenue</h3>
                  <p className="text-xs text-slate-400">{selectedAgencyForRevenue.name} ({selectedAgencyForRevenue.code})</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowAdjustAgencyRevenueModal(false);
                  setSelectedAgencyForRevenue(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Balance Display */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center">
              <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Current Wallet Balance</span>
              <p className="text-2xl font-black text-emerald-400 mt-1">
                ${(selectedAgencyForRevenue.walletBalanceUSD || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs font-semibold text-slate-400">USD</span>
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Generated across {selectedAgencyForRevenue.totalHosts ?? selectedAgencyForRevenue._count?.bindings ?? 0} connected broadcaster(s)
              </p>
            </div>

            {/* Set Balance Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Set Final Wallet Balance ($ USD)</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={agencyRevenueInput}
                  onChange={(e) => setAgencyRevenueInput(e.target.value)}
                  className="w-full pl-8 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono font-bold text-sm focus:outline-none focus:border-emerald-500 transition"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Quick Presets */}
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-slate-400">Quick Delta Shortcuts:</span>
              <div className="grid grid-cols-4 gap-2">
                {[50, 100, 500, 1000].map((delta) => (
                  <button
                    key={delta}
                    type="button"
                    onClick={() => {
                      const cur = parseFloat(agencyRevenueInput) || selectedAgencyForRevenue.walletBalanceUSD || 0;
                      setAgencyRevenueInput((cur + delta).toFixed(2));
                    }}
                    className="py-1.5 px-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition text-center"
                  >
                    +${delta}
                  </button>
                ))}
              </div>
            </div>

            {/* Administrative Audit Note */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Adjustment Audit Note / Reason</label>
              <input
                type="text"
                value={agencyRevenueNotes}
                onChange={(e) => setAgencyRevenueNotes(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500 transition"
                placeholder="e.g. Monthly host commission payout settlement"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowAdjustAgencyRevenueModal(false);
                  setSelectedAgencyForRevenue(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAgencyRevenue}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" /> Save Balance
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 12. LAUNCH DEMO LIVE STREAM MODAL */}
      {showAddStreamModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Tv className="w-5 h-5 text-indigo-400" /> Launch Demo Live Broadcast
              </h3>
              <button onClick={() => setShowAddStreamModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 mb-1 block">Stream Title</label>
              <input
                type="text"
                value={streamForm.title}
                onChange={(e) => setStreamForm({ ...streamForm, title: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 mb-1 block">Broadcast Format</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setStreamForm({ ...streamForm, roomType: 'VIDEO' })}
                  className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                    streamForm.roomType === 'VIDEO'
                      ? 'bg-red-500/20 border-red-500/50 text-red-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  <Video className="w-4 h-4" /> Live Video
                </button>
                <button
                  type="button"
                  onClick={() => setStreamForm({ ...streamForm, roomType: 'VOICE' })}
                  className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                    streamForm.roomType === 'VOICE'
                      ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  <Mic className="w-4 h-4" /> 8-Seat Voice
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 mb-1 block">Category Tag</label>
              <select
                value={streamForm.category}
                onChange={(e) => setStreamForm({ ...streamForm, category: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              >
                <option value="Hot Featured">Hot Featured 🔥</option>
                <option value="Music">Music & Singing 🎸</option>
                <option value="PK Battle">PK Battle ⚔️</option>
                <option value="Voice Lounge">Voice Lounge ☕</option>
                <option value="Gaming">Gaming 🎮</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowAddStreamModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateStream}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30"
              >
                Start Broadcast
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}

type ToastFn = (message: string, type?: 'success' | 'error' | 'info') => void;

function authedFetch(backendUrl: string, token: string, path: string, init: RequestInit = {}) {
  return fetch(`${backendUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init.headers || {}),
    },
  });
}

function ModerationPanel({ backendUrl, token, onToast }: { backendUrl: string; token: string; onToast?: ToastFn }) {
  const [items, setItems] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [type, setType] = React.useState('');
  const [visibility, setVisibility] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [reportedOnly, setReportedOnly] = React.useState(false);
  const [warnTarget, setWarnTarget] = React.useState<any>(null);
  const [warnReason, setWarnReason] = React.useState('');

  const load = async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (type) qs.set('type', type);
      if (visibility) qs.set('visibility', visibility);
      if (search) qs.set('search', search);
      if (reportedOnly) qs.set('reportedOnly', 'true');
      qs.set('limit', '40');
      const res = await authedFetch(backendUrl, token, `/api/admin/moderation/content?${qs.toString()}`);
      const data = await res.json();
      setItems(data.items || []);
    } catch {
      onToast?.('Failed to load content queue', 'error');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => { load(); /* eslint-disable-next-line */ }, [type, visibility, reportedOnly]);

  const act = async (postId: string, action: 'hide' | 'restore' | 'remove', reason?: string) => {
    try {
      const res = await authedFetch(backendUrl, token, `/api/admin/moderation/posts/${postId}/${action}`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) throw new Error();
      onToast?.(`Post ${action}d successfully`, 'success');
      load();
    } catch {
      onToast?.(`Failed to ${action} post`, 'error');
    }
  };

  const removePost = async (postId: string) => {
    try {
      const res = await authedFetch(backendUrl, token, `/api/admin/moderation/posts/${postId}`, {
        method: 'DELETE',
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error();
      onToast?.('Post deleted', 'success');
      load();
    } catch {
      onToast?.('Failed to delete post', 'error');
    }
  };

  const submitWarn = async () => {
    if (!warnTarget || !warnReason.trim()) return;
    try {
      const res = await authedFetch(backendUrl, token, `/api/admin/moderation/users/${warnTarget}/warn`, {
        method: 'POST',
        body: JSON.stringify({ reason: warnReason.trim() }),
      });
      if (!res.ok) throw new Error();
      onToast?.('Warning issued to user', 'success');
      setWarnTarget(null);
      setWarnReason('');
    } catch {
      onToast?.('Failed to issue warning', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-black text-white flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-rose-400" /> Content Moderation
        </h2>
        <p className="text-xs text-slate-400 mt-1">Review social posts, hide or remove violations, and issue user warnings.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select value={type} onChange={(e) => setType(e.target.value)} className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white">
          <option value="">All Types</option>
          <option value="PHOTO">Photo</option>
          <option value="VIDEO">Video</option>
          <option value="REELS">Reels</option>
        </select>
        <select value={visibility} onChange={(e) => setVisibility(e.target.value)} className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white">
          <option value="">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="HIDDEN">Hidden</option>
          <option value="REMOVED">Removed</option>
        </select>
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2">
          <Search className="w-3.5 h-3.5 text-slate-500" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()} placeholder="Search caption or author" className="bg-transparent text-xs text-white outline-none w-48" />
        </div>
        <label className="flex items-center gap-2 text-xs text-slate-300">
          <input type="checkbox" checked={reportedOnly} onChange={(e) => setReportedOnly(e.target.checked)} /> Reported only
        </label>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-[#111827] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-900/60 text-[11px] uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3 font-bold">Content</th>
                <th className="px-4 py-3 font-bold">Author</th>
                <th className="px-4 py-3 font-bold">Status</th>
                <th className="px-4 py-3 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {items.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-10 text-center text-slate-500 text-sm">{loading ? 'Loading…' : 'No content found'}</td></tr>
              ) : items.map((p) => (
                <tr key={p.id} className="hover:bg-slate-900/40 transition">
                  <td className="px-4 py-3 max-w-xs">
                    <div className="flex items-center gap-3">
                      {p.mediaUrl ? (
                        <img src={p.mediaUrl} alt="" className="w-12 h-12 rounded-lg object-cover bg-slate-800" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center text-slate-600 text-[10px]">{p.type || 'POST'}</div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs text-white font-semibold truncate">{p.caption || '(no caption)'}</p>
                        <p className="text-[10px] text-slate-500">{p.type || 'PHOTO'} • {new Date(p.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs text-white font-bold">{p.author?.displayName || p.author?.username || 'Unknown'}</p>
                    <p className="text-[10px] text-slate-500">
                      @{p.author?.username}{p.author?.isBanned ? ' • banned' : ''}{p.author?.warningCount ? ` • ${p.author.warningCount} warnings` : ''}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${
                      p.visibility === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400' :
                      p.visibility === 'HIDDEN' ? 'bg-amber-500/20 text-amber-400' : 'bg-rose-500/20 text-rose-400'
                    }`}>{p.visibility || 'ACTIVE'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {p.visibility !== 'ACTIVE' ? (
                        <button onClick={() => act(p.id, 'restore')} className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30" title="Restore"><CheckCircle2 className="w-4 h-4" /></button>
                      ) : (
                        <button onClick={() => act(p.id, 'hide', 'Admin hidden')} className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500/30" title="Hide"><XCircle className="w-4 h-4" /></button>
                      )}
                      <button onClick={() => act(p.id, 'remove', 'Policy violation')} className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 hover:bg-rose-500/30" title="Remove"><ShieldAlert className="w-4 h-4" /></button>
                      <button onClick={() => removePost(p.id)} className="p-1.5 rounded-lg bg-slate-700/40 text-slate-300 hover:bg-slate-700" title="Delete"><Trash2 className="w-4 h-4" /></button>
                      {p.author?.id && (
                        <button onClick={() => setWarnTarget(p.author.id)} className="p-1.5 rounded-lg bg-orange-500/20 text-orange-400 hover:bg-orange-500/30" title="Warn author"><AlertTriangle className="w-4 h-4" /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {warnTarget && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-[#111827] border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="font-bold text-white flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-orange-400" /> Issue User Warning</h3>
            <textarea value={warnReason} onChange={(e) => setWarnReason(e.target.value)} rows={3} placeholder="Reason for warning (shown to the user)" className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" />
            <div className="flex justify-end gap-2">
              <button onClick={() => { setWarnTarget(null); setWarnReason(''); }} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold">Cancel</button>
              <button onClick={submitWarn} className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold">Send Warning</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationsPanel({ backendUrl, token, onToast }: { backendUrl: string; token: string; onToast?: ToastFn }) {
  const [title, setTitle] = React.useState('');
  const [body, setBody] = React.useState('');
  const [audience, setAudience] = React.useState<'ALL' | 'HOSTS' | 'USERS'>('ALL');
  const [type, setType] = React.useState('SYSTEM');
  const [sending, setSending] = React.useState(false);

  const send = async () => {
    if (!title.trim()) { onToast?.('A title is required', 'error'); return; }
    setSending(true);
    try {
      const res = await authedFetch(backendUrl, token, '/api/admin/notifications/broadcast', {
        method: 'POST',
        body: JSON.stringify({ title: title.trim(), body: body.trim(), type, audience }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error();
      onToast?.(`Broadcast sent to ${data.recipients ?? 0} users`, 'success');
      setTitle(''); setBody('');
    } catch {
      onToast?.('Failed to send broadcast', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-lg font-black text-white flex items-center gap-2"><Bell className="w-5 h-5 text-purple-400" /> Broadcast Notifications</h2>
        <p className="text-xs text-slate-400 mt-1">Send an in-app notification to all users, hosts, or regular users. Delivered in real time.</p>
      </div>
      <div className="rounded-2xl border border-slate-800 bg-[#111827] p-6 space-y-4">
        <div>
          <label className="text-xs font-bold text-slate-400 mb-1 block">Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white" placeholder="e.g. Weekend Live Event 🎉" />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-400 mb-1 block">Message</label>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white" placeholder="Write the notification body…" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-slate-400 mb-1 block">Audience</label>
            <select value={audience} onChange={(e) => setAudience(e.target.value as any)} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white">
              <option value="ALL">All Users</option>
              <option value="HOSTS">Hosts Only</option>
              <option value="USERS">Regular Users</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-400 mb-1 block">Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white">
              <option value="SYSTEM">System</option>
              <option value="EVENT">Event</option>
              <option value="PROMO">Promotion</option>
              <option value="ANNOUNCEMENT">Announcement</option>
            </select>
          </div>
        </div>
        <button onClick={send} disabled={sending} className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white text-sm font-bold disabled:opacity-50">
          {sending ? 'Sending…' : 'Send Broadcast'}
        </button>
      </div>
    </div>
  );
}

function AuditLogPanel({ backendUrl, token }: { backendUrl: string; token: string }) {
  const [items, setItems] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [action, setAction] = React.useState('');
  const [targetType, setTargetType] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [pagination, setPagination] = React.useState<any>({});

  const load = async (p = page) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ page: String(p), limit: '50' });
      if (targetType) qs.set('targetType', targetType);
      const res = await authedFetch(backendUrl, token, `/api/admin/audit-logs?${qs.toString()}`);
      const data = await res.json();
      let logs = data.logs || [];
      if (action) logs = logs.filter((l: any) => (l.action || '').toLowerCase().includes(action.toLowerCase()));
      setPagination(data.pagination || {});
      setPage(p);
      setItems(logs);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => { load(1); /* eslint-disable-next-line */ }, [targetType]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-black text-white flex items-center gap-2"><FileText className="w-5 h-5 text-slate-300" /> Admin Audit Log</h2>
        <p className="text-xs text-slate-400 mt-1">Immutable record of privileged actions performed by staff.</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2">
          <Search className="w-3.5 h-3.5 text-slate-500" />
          <input value={action} onChange={(e) => setAction(e.target.value)} placeholder="Filter action (e.g. POST_REMOVE)" className="bg-transparent text-xs text-white outline-none w-56" />
        </div>
        <select value={targetType} onChange={(e) => setTargetType(e.target.value)} className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white">
          <option value="">All Targets</option>
          <option value="POST">POST</option>
          <option value="USER">USER</option>
          <option value="STREAM">STREAM</option>
        </select>
        <button onClick={() => load(page)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>
      <div className="rounded-2xl border border-slate-800 bg-[#111827] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-900/60 text-[11px] uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3 font-bold">When</th>
                <th className="px-4 py-3 font-bold">Admin</th>
                <th className="px-4 py-3 font-bold">Action</th>
                <th className="px-4 py-3 font-bold">Target</th>
                <th className="px-4 py-3 font-bold">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {items.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500 text-sm">{loading ? 'Loading…' : 'No audit entries'}</td></tr>
              ) : items.map((l) => (
                <tr key={l.id} className="hover:bg-slate-900/40 transition">
                  <td className="px-4 py-3 text-[11px] text-slate-400 whitespace-nowrap">{new Date(l.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3 text-xs text-white font-semibold">{l.adminName || l.adminId}</td>
                  <td className="px-4 py-3"><span className="text-[10px] px-2 py-1 rounded-full font-bold bg-indigo-500/20 text-indigo-300">{l.action}</span></td>
                  <td className="px-4 py-3 text-[11px] text-slate-400">{l.targetType}:{String(l.targetId || '').slice(0, 8)}</td>
                  <td className="px-4 py-3 text-[11px] text-slate-500 max-w-xs truncate">{l.details ? JSON.stringify(l.details) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button disabled={page <= 1} onClick={() => load(page - 1)} className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-bold disabled:opacity-40">Prev</button>
          <span className="text-xs text-slate-400">Page {pagination.page} / {pagination.totalPages}</span>
          <button disabled={page >= pagination.totalPages} onClick={() => load(page + 1)} className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-bold disabled:opacity-40">Next</button>
        </div>
      )}
    </div>
  );
}

function SecurityPanel({ backendUrl, token, onToast }: { backendUrl: string; token: string; onToast?: ToastFn }) {
  const [status, setStatus] = React.useState<{ enabled: boolean; method: string | null } | null>(null);
  const [method, setMethod] = React.useState<'EMAIL' | 'PHONE'>('EMAIL');
  const [pendingOtp, setPendingOtp] = React.useState('');
  const [code, setCode] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  const load = async () => {
    try {
      const res = await authedFetch(backendUrl, token, '/api/auth/admin-2fa/status');
      setStatus(await res.json());
    } catch { /* ignore */ }
  };
  React.useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const setup = async () => {
    setBusy(true);
    try {
      const res = await authedFetch(backendUrl, token, '/api/auth/admin-2fa/setup', { method: 'POST', body: JSON.stringify({ method }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Setup failed');
      if (data.debugOtp) setPendingOtp(data.debugOtp);
      onToast?.(`Verification code sent via ${data.method}`, 'info');
    } catch (e: any) {
      onToast?.(e.message || 'Setup failed', 'error');
    } finally { setBusy(false); }
  };

  const enable = async () => {
    setBusy(true);
    try {
      const res = await authedFetch(backendUrl, token, '/api/auth/admin-2fa/enable', { method: 'POST', body: JSON.stringify({ code }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Invalid code');
      onToast?.('Two-factor authentication enabled', 'success');
      setCode(''); setPendingOtp('');
      load();
    } catch (e: any) {
      onToast?.(e.message || 'Invalid code', 'error');
    } finally { setBusy(false); }
  };

  const disable = async () => {
    setBusy(true);
    try {
      const res = await authedFetch(backendUrl, token, '/api/auth/admin-2fa/disable', { method: 'POST', body: JSON.stringify({ password }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to disable');
      onToast?.('Two-factor authentication disabled', 'success');
      setPassword('');
      load();
    } catch (e: any) {
      onToast?.(e.message || 'Failed to disable', 'error');
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h2 className="text-lg font-black text-white flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-emerald-400" /> Security & Two-Factor Authentication</h2>
        <p className="text-xs text-slate-400 mt-1">Protect your admin account with a one-time code at sign-in.</p>
      </div>
      <div className="rounded-2xl border border-slate-800 bg-[#111827] p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-white">Two-Factor Authentication</p>
            <p className="text-xs text-slate-400">{status?.enabled ? `Enabled via ${status.method}` : 'Currently disabled'}</p>
          </div>
          <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${status?.enabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700/50 text-slate-400'}`}>
            {status?.enabled ? 'ON' : 'OFF'}
          </span>
        </div>

        {!status?.enabled ? (
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-slate-400">Delivery method</label>
              <select value={method} onChange={(e) => setMethod(e.target.value as any)} className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white">
                <option value="EMAIL">Email</option>
                <option value="PHONE">SMS (phone)</option>
              </select>
              <button disabled={busy} onClick={setup} className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold disabled:opacity-50">Send code</button>
            </div>
            {(pendingOtp || code) && (
              <div className="space-y-2">
                {pendingOtp && <p className="text-[11px] text-amber-400">Dev code: <span className="font-mono font-bold">{pendingOtp}</span></p>}
                <div className="flex items-center gap-2">
                  <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Enter 6-digit code" maxLength={6} className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white tracking-widest" />
                  <button disabled={busy || code.length < 6} onClick={enable} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold disabled:opacity-50">Enable 2FA</button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <p className="text-xs text-slate-400">Enter your account password to disable two-factor authentication.</p>
            <div className="flex items-center gap-2">
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Account password" className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" />
              <button disabled={busy || !password} onClick={disable} className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold disabled:opacity-50">Disable 2FA</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

