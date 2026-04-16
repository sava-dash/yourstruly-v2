'use client';

import { useCallback, useEffect, useState } from 'react';
import { Mail, Loader2, Check, AlertCircle } from 'lucide-react';

interface CreditsData {
  credits: {
    total_credits: number;
    used_this_month: number;
    is_premium: boolean;
    monthly_allowance: number;
  };
  xp: {
    available: number;
    trade_cost: number;
  };
}

export default function PostScriptCreditsSection() {
  const [data, setData] = useState<CreditsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchCredits = useCallback(async () => {
    try {
      const res = await fetch('/api/postscripts/credits');
      if (!res.ok) throw new Error('Failed to load credits');
      const json = await res.json();
      setData(json);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCredits();
  }, [fetchCredits]);

  // Auto-dismiss toast after 4 seconds
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const handlePurchase = useCallback(async (bundleType: '1_pack' | '5_pack') => {
    setActionLoading(bundleType);
    try {
      const res = await fetch('/api/postscripts/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'purchase', bundle_type: bundleType }),
      });
      const json = await res.json();
      if (!res.ok) {
        setToast({ type: 'error', message: json.error || 'Purchase failed' });
        return;
      }
      // If API returns a checkoutUrl, redirect; otherwise credits were added directly
      if (json.checkoutUrl) {
        window.location.href = json.checkoutUrl;
        return;
      }
      setToast({ type: 'success', message: json.message || 'Credits purchased!' });
      await fetchCredits();
    } catch {
      setToast({ type: 'error', message: 'Something went wrong. Please try again.' });
    } finally {
      setActionLoading(null);
    }
  }, [fetchCredits]);

  const handleTradeXP = useCallback(async () => {
    setActionLoading('trade_xp');
    try {
      const res = await fetch('/api/postscripts/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'trade_xp' }),
      });
      const json = await res.json();
      if (!res.ok) {
        setToast({ type: 'error', message: json.error || 'Trade failed. You may not have enough XP.' });
        return;
      }
      setToast({ type: 'success', message: json.message || 'Credit added!' });
      await fetchCredits();
    } catch {
      setToast({ type: 'error', message: 'Something went wrong. Please try again.' });
    } finally {
      setActionLoading(null);
    }
  }, [fetchCredits]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={28} className="animate-spin text-[#406A56]" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-16">
        <p className="text-[#666] text-base">
          Unable to load PostScript credits. Please sign in and try again.
        </p>
      </div>
    );
  }

  const { credits, xp } = data;
  const canTrade = xp.available >= xp.trade_cost;
  const tradesAvailable = Math.floor(xp.available / xp.trade_cost);

  return (
    <section className="w-full">
      {/* Toast notification */}
      {toast && (
        <div
          className={`mb-5 flex items-center gap-3 rounded-xl px-5 py-3.5 text-sm font-medium shadow-sm ${
            toast.type === 'success'
              ? 'bg-[#406A56]/10 text-[#406A56] border border-[#406A56]/20'
              : 'bg-[#C35F33]/10 text-[#C35F33] border border-[#C35F33]/20'
          }`}
          role="alert"
        >
          {toast.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-[#406A56]/10 flex items-center justify-center">
          <Mail size={20} className="text-[#406A56]" />
        </div>
        <div>
          <h2
            className="text-2xl font-semibold text-[#406A56]"
            style={{ fontFamily: 'var(--font-playfair, Playfair Display, serif)' }}
          >
            Your PostScript Credits
          </h2>
          <p
            className="text-sm text-[#666] mt-0.5"
            style={{ fontFamily: 'var(--font-inter-tight, Inter Tight, sans-serif)' }}
          >
            Send heartfelt messages with your PostScript credits
          </p>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard label="Available" value={`${credits.total_credits}`} unit="credits" />
        <StatCard label="Used" value={`${credits.used_this_month}`} unit="this month" />
        <StatCard label="XP Balance" value={`${xp.available.toLocaleString()}`} unit="XP" />
      </div>

      {/* Buy Credits */}
      <div className="mb-8">
        <SectionDivider label="Buy Credits" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          {/* 1-pack */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-[#406A56]/5">
            <h3
              className="text-lg font-semibold text-[#333]"
              style={{ fontFamily: 'var(--font-playfair, Playfair Display, serif)' }}
            >
              1 PostScript Credit
            </h3>
            <p
              className="text-2xl font-bold text-[#333] mt-1"
              style={{ fontFamily: 'var(--font-inter-tight, Inter Tight, sans-serif)' }}
            >
              $5.00
            </p>
            <button
              type="button"
              onClick={() => handlePurchase('1_pack')}
              disabled={actionLoading !== null}
              className="mt-4 w-full min-h-[52px] rounded-xl bg-[#C35F33] text-white text-base font-semibold
                hover:bg-[#A84E2A] active:bg-[#8F4324] disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors flex items-center justify-center gap-2"
              style={{ fontFamily: 'var(--font-inter-tight, Inter Tight, sans-serif)' }}
            >
              {actionLoading === '1_pack' ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                'Buy 1 credit for $5.00'
              )}
            </button>
          </div>

          {/* 5-pack */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-[#406A56]/5 relative overflow-hidden">
            <div className="absolute top-3 right-3 bg-[#406A56] text-white text-xs font-bold px-2.5 py-1 rounded-full">
              Save 20%
            </div>
            <h3
              className="text-lg font-semibold text-[#333]"
              style={{ fontFamily: 'var(--font-playfair, Playfair Display, serif)' }}
            >
              5 PostScript Credits
            </h3>
            <p
              className="text-2xl font-bold text-[#333] mt-1"
              style={{ fontFamily: 'var(--font-inter-tight, Inter Tight, sans-serif)' }}
            >
              $20.00
              <span className="text-sm font-normal text-[#999] ml-2 line-through">$25.00</span>
            </p>
            <button
              type="button"
              onClick={() => handlePurchase('5_pack')}
              disabled={actionLoading !== null}
              className="mt-4 w-full min-h-[52px] rounded-xl bg-[#C35F33] text-white text-base font-semibold
                hover:bg-[#A84E2A] active:bg-[#8F4324] disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors flex items-center justify-center gap-2"
              style={{ fontFamily: 'var(--font-inter-tight, Inter Tight, sans-serif)' }}
            >
              {actionLoading === '5_pack' ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                'Buy 5 credits for $20.00'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Trade XP */}
      <div className="mb-8">
        <SectionDivider label="or Use XP" />
        <div className="bg-white rounded-xl p-6 shadow-sm border border-[#406A56]/5 mt-4">
          <p
            className="text-base text-[#333] font-medium"
            style={{ fontFamily: 'var(--font-inter-tight, Inter Tight, sans-serif)' }}
          >
            Trade {xp.trade_cost} XP for 1 PostScript credit
          </p>
          <p
            className="text-sm text-[#666] mt-1"
            style={{ fontFamily: 'var(--font-inter-tight, Inter Tight, sans-serif)' }}
          >
            You have {xp.available.toLocaleString()} XP
            {canTrade
              ? ` \u2014 enough for ${tradesAvailable} credit${tradesAvailable === 1 ? '' : 's'}`
              : ` \u2014 you need ${xp.trade_cost - xp.available} more XP`}
          </p>
          <button
            type="button"
            onClick={handleTradeXP}
            disabled={!canTrade || actionLoading !== null}
            className="mt-4 min-h-[44px] px-6 rounded-xl border-2 border-[#406A56] text-[#406A56] text-base font-semibold
              hover:bg-[#406A56]/5 active:bg-[#406A56]/10 disabled:opacity-40 disabled:cursor-not-allowed
              transition-colors flex items-center justify-center gap-2"
            style={{ fontFamily: 'var(--font-inter-tight, Inter Tight, sans-serif)' }}
          >
            {actionLoading === 'trade_xp' ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              `Trade ${xp.trade_cost} XP \u2192 1 credit`
            )}
          </button>
        </div>
      </div>

      {/* Premium note */}
      <div
        className="bg-white rounded-xl p-5 shadow-sm border border-[#406A56]/5 text-sm text-[#666]"
        style={{ fontFamily: 'var(--font-inter-tight, Inter Tight, sans-serif)' }}
      >
        <p>
          Premium members get {credits.monthly_allowance || 3} free credits per month.{' '}
          {credits.is_premium ? (
            <span className="text-[#406A56] font-semibold">You are premium!</span>
          ) : (
            <a
              href="/dashboard/settings"
              className="text-[#C35F33] font-semibold hover:underline"
            >
              Upgrade to premium
            </a>
          )}
        </p>
      </div>
    </section>
  );
}

/* ---------- Sub-components ---------- */

function StatCard({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-[#406A56]/5 text-center">
      <p
        className="text-xs uppercase tracking-wide text-[#999] mb-1"
        style={{ fontFamily: 'var(--font-inter-tight, Inter Tight, sans-serif)' }}
      >
        {label}
      </p>
      <p
        className="text-3xl font-bold text-[#333]"
        style={{ fontFamily: 'var(--font-playfair, Playfair Display, serif)' }}
      >
        {value}
      </p>
      <p
        className="text-xs text-[#999] mt-0.5"
        style={{ fontFamily: 'var(--font-inter-tight, Inter Tight, sans-serif)' }}
      >
        {unit}
      </p>
    </div>
  );
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-px flex-1 bg-[#406A56]/10" />
      <span
        className="text-sm font-medium text-[#999] uppercase tracking-wide"
        style={{ fontFamily: 'var(--font-inter-tight, Inter Tight, sans-serif)' }}
      >
        {label}
      </span>
      <div className="h-px flex-1 bg-[#406A56]/10" />
    </div>
  );
}
