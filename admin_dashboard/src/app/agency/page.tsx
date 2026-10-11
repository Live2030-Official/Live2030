'use client';

import React, { useState, useEffect } from 'react';
import {
  Building2,
  Coins,
  Send,
  LogOut,
  Eye,
  EyeOff,
  Users,
  Clock,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Phone,
  ShieldCheck,
  TrendingUp,
  X,
  MessageCircle,
  ExternalLink,
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { LanguageSwitcher } from '../../components/LanguageSwitcher';

const DEFAULT_BACKEND_URL = 'http://13.51.73.60:4000';

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

interface AgencyData {
  id: string;
  name: string;
  code: string;
  managerEmail: string;
  whatsappNumber?: string;
  commissionPercent: number;
  coinBalance: number;
  walletBalanceUSD: number;
  totalHosts: number;
  hostsTotalDiamonds: number;
}

interface TransferRecord {
  id: string;
  agencyId: string;
  recipientId: string;
  recipientUsername?: string;
  amount: number;
  notes?: string;
  timestamp: number;
}

interface HostRecord {
  id: string;
  hostDisplayName: string;
  hostUsername: string;
  hostAvatarUrl?: string;
  hostLevel: number;
  diamondsEarned: number;
  revenueContributedUSD: number;
}

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

export default function AgencyPortalPage() {
  const [agencySession, setAgencySession] = useState<AgencyData | null>(null);
  const [loginCodeOrEmail, setLoginCodeOrEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  // Coin Transfer
  const [transferTargetUser, setTransferTargetUser] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferNotes, setTransferNotes] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);

  // Data lists
  const [transfers, setTransfers] = useState<TransferRecord[]>([]);
  const [hosts, setHosts] = useState<HostRecord[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Check saved session in sessionStorage
  useEffect(() => {
    const saved = sessionStorage.getItem('live2030_agency_session');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setAgencySession(parsed);
        fetchAgencyData(parsed.id);
      } catch {}
    }
  }, []);

  // WebSockets for real-time sync
  useEffect(() => {
    if (!agencySession) return;
    const socket = io(BACKEND_URL, { transports: ['websocket'] });

    socket.on('admin:agency_coins_recharged', (data: any) => {
      if (data.agencyId === agencySession.id) {
        setAgencySession((prev) => (prev ? { ...prev, coinBalance: data.newCoinBalance } : prev));
        showToast(`Super Admin deposited +${data.rechargedCoins.toLocaleString()} Coins into your wallet!`, 'success');
      }
    });

    socket.on('admin:agency_revenue_updated', (data: any) => {
      if (data.agencyId === agencySession.id) {
        setAgencySession((prev) => (prev ? { ...prev, walletBalanceUSD: data.revenueUSD } : prev));
      }
    });

    socket.on('agency:coins_transferred', (data: any) => {
      if (data.agencyId === agencySession.id) {
        setTransfers((prev) => [data, ...prev]);
        setAgencySession((prev) => (prev ? { ...prev, coinBalance: Math.max(0, prev.coinBalance - data.amount) } : prev));
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [agencySession?.id]);

  const fetchAgencyData = async (agencyId: string) => {
    setIsLoadingData(true);
    try {
      const [transfersRes, hostsRes, agenciesRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/agencies/${agencyId}/coin-transfers`).catch(() => null),
        fetch(`${BACKEND_URL}/api/agencies/${agencyId}/hosts`).catch(() => null),
        fetch(`${BACKEND_URL}/api/agencies`).catch(() => null),
      ]);

      if (transfersRes && transfersRes.ok) {
        setTransfers(await transfersRes.json());
      }
      if (hostsRes && hostsRes.ok) {
        setHosts(await hostsRes.json());
      }
      if (agenciesRes && agenciesRes.ok) {
        const allAgencies: AgencyData[] = await agenciesRes.json();
        const me = allAgencies.find((a) => a.id === agencyId);
        if (me) {
          setAgencySession(me);
          sessionStorage.setItem('live2030_agency_session', JSON.stringify(me));
        }
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!loginCodeOrEmail.trim() || !loginPassword.trim()) {
      showToast('Please enter your Agency Code/Email and Password', 'error');
      return;
    }

    setLoginLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/agencies/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codeOrEmail: loginCodeOrEmail.trim(),
          password: loginPassword.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setAgencySession(data.agency);
        sessionStorage.setItem('live2030_agency_session', JSON.stringify(data.agency));
        setLoginCodeOrEmail('');
        setLoginPassword('');
        showToast(`Welcome back, ${data.agency.name}! 🌟`, 'success');
        fetchAgencyData(data.agency.id);
      } else {
        showToast(data.message || 'Invalid agency code or password', 'error');
      }
    } catch {
      showToast('Network error connecting to backend', 'error');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    setAgencySession(null);
    sessionStorage.removeItem('live2030_agency_session');
    setTransfers([]);
    setHosts([]);
    showToast('Logged out of Agency Portal', 'info');
  };

  const handleTransferCoins = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!agencySession) return;

    const amount = parseInt(transferAmount, 10);
    if (isNaN(amount) || amount <= 0) {
      showToast('Please enter a valid coin amount greater than 0', 'error');
      return;
    }

    if (!transferTargetUser.trim()) {
      showToast('Please enter recipient User ID or Username', 'error');
      return;
    }

    const available = agencySession.coinBalance || 0;
    if (available < amount || available <= 0) {
      showToast('Coins are over in your agency wallet! Please contact Super Admin to recharge.', 'error');
      return;
    }

    setTransferLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/agencies/${agencySession.id}/transfer-coins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserIdOrUsername: transferTargetUser.trim(),
          amount,
          notes: transferNotes.trim() || 'Official agency coin recharge',
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Successfully sent ${amount.toLocaleString()} Coins to @${data.recipient?.username || transferTargetUser}! ✨`, 'success');
        setAgencySession((prev) => (prev ? { ...prev, coinBalance: data.newAgencyCoinBalance } : prev));
        if (data.transfer) {
          setTransfers((prev) => [data.transfer, ...prev]);
        }
        setTransferAmount('');
        setTransferTargetUser('');
        setTransferNotes('');
        fetchAgencyData(agencySession.id);
      } else {
        showToast(data.message || 'Transfer failed. Check balance and recipient.', 'error');
      }
    } catch {
      showToast('Network error sending coins', 'error');
    } finally {
      setTransferLoading(false);
    }
  };

  // If NOT logged in: Agency Login Screen (Isolated from Super Admin)
  if (!agencySession) {
    return (
      <div className="min-h-screen bg-[#0A0D14] flex flex-col items-center justify-center p-4 text-slate-100 font-sans">
        {toast && (
          <div className="fixed top-5 right-5 z-[100] transition-all">
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
            </div>
          </div>
        )}

        <div className="w-full max-w-md bg-[#0F1420] border border-slate-800/80 rounded-3xl p-8 shadow-2xl shadow-pink-950/20 relative">
          <div className="absolute top-4 right-4">
            <LanguageSwitcher compact />
          </div>
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-pink-500 via-purple-500 to-indigo-500 p-[2px] mb-4 shadow-xl shadow-pink-500/20">
              <div className="w-full h-full bg-[#0F1420] rounded-[14px] flex items-center justify-center">
                <Building2 className="w-8 h-8 text-pink-400" />
              </div>
            </div>
            <h1 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white via-pink-100 to-slate-400">
              Talent Agency Portal
            </h1>
            <p className="text-xs text-slate-400 mt-1.5">
              Live 2030 Official Partner Management Workspace
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Agency Code or Email
              </label>
              <input
                type="text"
                value={loginCodeOrEmail}
                onChange={(e) => setLoginCodeOrEmail(e.target.value)}
                placeholder="e.g. XYZ or manager@agency.com"
                className="w-full bg-[#0A0D14] border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Agency Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Enter your agency password"
                  className="w-full bg-[#0A0D14] border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 transition pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-3.5 mt-2 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 shadow-lg shadow-pink-600/30 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loginLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                'Sign In to Agency Portal'
              )}
            </button>
          </form>

          {/* Demo quick sign-in helper */}
          <div className="mt-6 pt-6 border-t border-slate-800/80 text-center">
            <p className="text-[11px] text-slate-400 mb-2">Need testing credentials?</p>
            <button
              type="button"
              onClick={() => {
                setLoginCodeOrEmail('XYZ');
                setLoginPassword('Agency@2026');
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700/80 text-xs font-semibold text-pink-300 hover:bg-slate-800 hover:text-white transition"
            >
              Use Demo: Agency XYZ (Agency@2026)
            </button>
          </div>
        </div>

        <p className="text-[11px] text-slate-400 mt-6">
          Live 2030 Global Broadcaster Network &copy; {new Date().getFullYear()}
        </p>
      </div>
    );
  }

  // LOGGED IN: Agency Manager Workspace
  const availableCoins = agencySession.coinBalance || 0;
  const isCoinsOver = availableCoins <= 0;

  return (
    <div className="min-h-screen bg-[#0A0D14] text-slate-100 font-sans flex flex-col">
      {/* GLOBAL TOAST */}
      {toast && (
        <div className="fixed top-5 right-5 z-[100] transition-all">
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

      {/* TOP HEADER */}
      <header className="h-18 bg-[#0F1420] border-b border-slate-800/80 px-6 flex items-center justify-between shrink-0 shadow-lg">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-pink-500 to-indigo-600 p-[2px] shadow-lg shadow-pink-500/20">
            <div className="w-full h-full bg-[#0F1420] rounded-[14px] flex items-center justify-center font-black text-pink-400 text-sm">
              {agencySession.code}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-base font-extrabold text-white tracking-wide">
                {agencySession.name}
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-pink-500/20 border border-pink-500/40 text-[10px] font-black text-pink-300 uppercase">
                Agency #{agencySession.code}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-[10px] font-bold text-indigo-300">
                {agencySession.commissionPercent}% Commission
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
              <span>{agencySession.managerEmail}</span>
              {agencySession.whatsappNumber && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                    <Phone className="w-3 h-3" />
                    {agencySession.whatsappNumber}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <button
            onClick={() => fetchAgencyData(agencySession.id)}
            disabled={isLoadingData}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition"
            title="Refresh Ledger & Roster"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingData ? 'animate-spin text-pink-400' : ''}`} />
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 hover:bg-rose-500/20 text-xs font-bold transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            Log Out
          </button>
        </div>
      </header>

      {/* MAIN BODY */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6 overflow-y-auto">
        
        {/* CRITICAL OVERDRAFT ALERT IF COINS DEPLETED */}
        {isCoinsOver && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-red-950/80 via-rose-900/40 to-slate-900 border border-red-500/60 shadow-xl flex items-center justify-between animate-pulse">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-red-500/20 text-red-400">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-black text-red-200">
                  Coins are over in your agency wallet!
                </p>
                <p className="text-xs text-red-300/80 mt-0.5">
                  Your coin inventory has reached 0 Coins. User coin transfers are temporarily blocked until your wallet is recharged through Super Admin.
                </p>
              </div>
            </div>
            <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-red-500/20 border border-red-500/50 text-red-300">
              Recharge Required
            </span>
          </div>
        )}

        {/* TOP STATS CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* AVAILABLE COINS CARD */}
          <div className={`p-6 rounded-3xl bg-[#0F1420] border transition shadow-xl ${
            isCoinsOver ? 'border-red-500/40 shadow-red-950/20' : 'border-amber-500/40 shadow-amber-950/10'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <CoinIcon className="w-5 h-5" />
                Available Agency Coins
              </span>
              <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${
                isCoinsOver ? 'bg-red-500/20 text-red-400 border border-red-500/40' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              }`}>
                {isCoinsOver ? 'Depleted / Zero' : 'Ready to Transfer'}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-white">
                {availableCoins.toLocaleString()}
              </span>
              <span className="text-sm font-bold text-amber-400 inline-flex items-center gap-1.5"><CoinIcon className="w-5 h-5" /> Coins</span>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Official platform coin inventory allocated by Super Admin for user transfers. Only Super Admin can recharge this balance.
            </p>
          </div>

          {/* AGENCY WALLET REVENUE ($ USD) */}
          <div className="p-6 rounded-3xl bg-[#0F1420] border border-emerald-500/30 shadow-xl shadow-emerald-950/10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                Agency Wallet Revenue
              </span>
              <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase">
                USD Balance
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-emerald-400">
                ${(agencySession.walletBalanceUSD || 0).toFixed(2)}
              </span>
              <span className="text-sm font-bold text-slate-400">USD</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-400 mt-2">
              <span>Broadcasters: <strong className="text-white">{agencySession.totalHosts || 0}</strong></span>
              <span>•</span>
              <span>Diamonds Earned: <strong className="text-white inline-flex items-center gap-1">{(agencySession.hostsTotalDiamonds || 0).toLocaleString()} <DiamondIcon className="w-3.5 h-3.5 text-cyan-400" /></strong></span>
            </div>
          </div>
        </div>

        {/* DIRECT USER COIN TRANSFER TOOL */}
        <div className="p-6 rounded-3xl bg-[#0F1420] border border-slate-800/80 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-amber-500 to-pink-500 text-slate-950 font-black">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-white">
                  Transfer Coins Directly to User
                </h2>
                <p className="text-xs text-slate-400">
                  Deduct from agency inventory and deposit coins immediately into any user wallet by User ID or Username
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleTransferCoins} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Target User ID or Username *
                </label>
                <input
                  type="text"
                  value={transferTargetUser}
                  onChange={(e) => setTransferTargetUser(e.target.value)}
                  placeholder="e.g. workkevin104_660 or user-uuid"
                  className="w-full bg-[#0A0D14] border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Transfer Coin Amount *
                </label>
                <input
                  type="number"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  placeholder="e.g. 5000"
                  className="w-full bg-[#0A0D14] border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
                />
              </div>
            </div>

            {/* Quick Amount Chips */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-400 font-semibold">Quick Amounts:</span>
              {[1000, 5000, 10000, 50000, 100000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setTransferAmount(String(amt))}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs font-bold text-amber-300 hover:bg-amber-500/20 hover:border-amber-500/40 transition"
                >
                  +{amt.toLocaleString()} Coins
                </button>
              ))}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Transfer Note / Reason (Optional)
              </label>
              <input
                type="text"
                value={transferNotes}
                onChange={(e) => setTransferNotes(e.target.value)}
                placeholder="e.g. Official WhatsApp recharge, Top gifter reward"
                className="w-full bg-[#0A0D14] border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={transferLoading || isCoinsOver}
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-sm text-slate-950 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 shadow-xl shadow-amber-500/20 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {transferLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Executing Transfer...
                  </>
                ) : isCoinsOver ? (
                  'Coins are Over — Recharge via Admin'
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Coins to User Wallet
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* RECENT TRANSFERS LEDGER */}
        <div className="p-6 rounded-3xl bg-[#0F1420] border border-slate-800/80 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-pink-400" />
              Agency Coin Transfer Ledger
            </h3>
            <span className="text-xs text-slate-400">
              {transfers.length} Transfers Recorded
            </span>
          </div>

          {transfers.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-xs">
              No coin disbursements recorded yet for this agency.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase font-bold text-[10px]">
                    <th className="pb-3">Timestamp</th>
                    <th className="pb-3">Recipient User</th>
                    <th className="pb-3">Coins Disbursed</th>
                    <th className="pb-3">Audit Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {transfers.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-900/40 transition">
                      <td className="py-3 text-slate-400 whitespace-nowrap">
                        {new Date(tx.timestamp).toLocaleString()}
                      </td>
                      <td className="py-3 font-bold text-white whitespace-nowrap">
                        @{tx.recipientUsername || tx.recipientId}
                      </td>
                      <td className="py-3 whitespace-nowrap">
                        <span className="font-extrabold text-amber-300 inline-flex items-center gap-1.5">
                          <CoinIcon className="w-4 h-4" /> +{tx.amount.toLocaleString()}
                        </span>
                      </td>
                      <td className="py-3 text-slate-400">
                        {tx.notes || 'Agency coin recharge'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* BROADCASTER ROSTER */}
        <div className="p-6 rounded-3xl bg-[#0F1420] border border-slate-800/80 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-400" />
              Connected Broadcaster Roster
            </h3>
            <span className="text-xs text-slate-400">
              {hosts.length} Hosts Bound
            </span>
          </div>

          {hosts.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-xs">
              No broadcasters bound to Agency Code <strong className="text-white">{agencySession.code}</strong> yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {hosts.map((h) => (
                <div key={h.id} className="p-4 rounded-2xl bg-[#0A0D14] border border-slate-800 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-white text-xs">
                    {h.hostDisplayName?.charAt(0) || 'H'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-white truncate">{h.hostDisplayName}</p>
                    <p className="text-[11px] text-slate-400 truncate">@{h.hostUsername}</p>
                    <p className="text-[10px] text-amber-400 font-bold mt-1">
                      {h.diamondsEarned.toLocaleString()} Diamonds (${h.revenueContributedUSD.toFixed(2)})
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
