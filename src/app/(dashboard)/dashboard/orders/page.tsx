'use client'

import { useState, useEffect, useCallback } from 'react'
import { Package, ArrowLeft, Copy, QrCode, X, Loader2, Shield } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import '@/styles/page-styles.css'

interface Order {
  id: string
  status: string
  total_cents?: number
  total_amount?: number
  created_at: string
  project_id?: string | null
  items?: Record<string, unknown>[]
}

interface ShareTokenRow {
  id: string
  token: string
  memory_id: string | null
  wisdom_id: string | null
  is_active: boolean
  revoked_at: string | null
  created_at: string
}

interface TokenLabel {
  token: string
  label: string
  kind: 'memory' | 'wisdom'
  revoked: boolean
}

export default function OrdersPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [reprinting, setReprinting] = useState<string | null>(null)
  const [manageOrder, setManageOrder] = useState<Order | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from('photobook_orders')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && data) {
        setOrders(data as Order[])
      }
      setLoading(false)
    }
    load()
  }, [supabase])

  const handleReprint = useCallback(
    async (order: Order) => {
      if (!order.project_id) return
      setReprinting(order.id)
      try {
        const res = await fetch(
          `/api/photobook/projects/${order.project_id}/clone`,
          { method: 'POST' }
        )
        const json = await res.json()
        if (!res.ok) {
          alert(json.error || 'Failed to clone project')
          return
        }
        router.push(`/dashboard/photobook/create?projectId=${json.project.id}`)
      } catch {
        alert('Failed to clone project')
      } finally {
        setReprinting(null)
      }
    },
    [router]
  )

  return (
    <div className="page-container">
      <div className="page-background">
        <div className="page-blob page-blob-1" />
        <div className="page-blob page-blob-2" />
        <div className="page-blob page-blob-3" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Link
            href="/dashboard"
            className="p-2 rounded-lg hover:bg-[#406A56]/5 transition-colors"
          >
            <ArrowLeft size={20} className="text-[#406A56]" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[#2d2d2d]">Orders</h1>
            <p className="text-sm text-[#666]">Track your purchases</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <p className="text-[#666]">Loading...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <Package size={48} className="text-[#D3E1DF] mb-4" />
            <p className="text-lg font-medium text-[#2d2d2d] mb-1">No orders yet</p>
            <p className="text-sm text-[#666] mb-4">Your orders will appear here</p>
            <Link
              href="/dashboard/photobook/create"
              className="px-4 py-2 bg-[#406A56] text-white text-sm font-medium rounded-lg hover:bg-[#2d4e3e] transition-colors min-h-[44px] inline-flex items-center"
            >
              Create a Photobook
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map(order => {
              const hasProject = !!order.project_id
              return (
                <div
                  key={order.id}
                  className="p-4 bg-white/80 backdrop-blur-sm rounded-xl border border-[#D3E1DF] shadow-sm"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-[#2d2d2d]">
                      Order #{order.id.slice(0, 8)}
                    </span>
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-[#406A56]/10 text-[#406A56] capitalize">
                      {order.status}
                    </span>
                  </div>
                  <p className="text-xs text-[#666] mb-3">
                    {new Date(order.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                  {hasProject && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      <button
                        type="button"
                        onClick={() => handleReprint(order)}
                        disabled={reprinting === order.id}
                        className="inline-flex items-center gap-2 px-3 py-2 min-h-[44px] rounded-lg bg-[#406A56] text-white text-sm font-medium hover:bg-[#2d4e3e] transition-colors disabled:opacity-60"
                      >
                        {reprinting === order.id ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Copy size={16} />
                        )}
                        Reprint this book
                      </button>
                      <button
                        type="button"
                        onClick={() => setManageOrder(order)}
                        className="inline-flex items-center gap-2 px-3 py-2 min-h-[44px] rounded-lg border border-[#406A56] text-[#406A56] bg-white text-sm font-medium hover:bg-[#D3E1DF]/40 transition-colors"
                      >
                        <QrCode size={16} />
                        Manage QR links
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {manageOrder && manageOrder.project_id && (
        <ManageQRModal
          projectId={manageOrder.project_id}
          orderLabel={`Order #${manageOrder.id.slice(0, 8)}`}
          onClose={() => setManageOrder(null)}
        />
      )}
    </div>
  )
}

function ManageQRModal({
  projectId,
  orderLabel,
  onClose,
}: {
  projectId: string
  orderLabel: string
  onClose: () => void
}) {
  const supabase = createClient()
  const [tokens, setTokens] = useState<TokenLabel[]>([])
  const [loading, setLoading] = useState(true)
  const [revoking, setRevoking] = useState<string | null>(null)

  const loadTokens = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/photobook/projects/${projectId}/share-tokens`)
      const json = await res.json()
      if (!res.ok) {
        setTokens([])
        return
      }
      const rows = (json.tokens || []) as ShareTokenRow[]

      // Hydrate labels with memory titles / wisdom prompts.
      const memoryIds = rows.map(r => r.memory_id).filter(Boolean) as string[]
      const wisdomIds = rows.map(r => r.wisdom_id).filter(Boolean) as string[]

      const [memMap, wisMap] = await Promise.all([
        memoryIds.length
          ? supabase
              .from('memories')
              .select('id, title')
              .in('id', memoryIds)
              .then(({ data }) => {
                const m: Record<string, string> = {}
                for (const row of (data as { id: string; title: string }[]) || []) {
                  m[row.id] = row.title
                }
                return m
              })
          : Promise.resolve({} as Record<string, string>),
        wisdomIds.length
          ? supabase
              .from('wisdom_entries')
              .select('id, prompt_text, title')
              .in('id', wisdomIds)
              .then(({ data }) => {
                const m: Record<string, string> = {}
                for (const row of (data as {
                  id: string
                  prompt_text?: string
                  title?: string
                }[]) || []) {
                  m[row.id] = row.title || row.prompt_text || 'Wisdom entry'
                }
                return m
              })
          : Promise.resolve({} as Record<string, string>),
      ])

      const labelled: TokenLabel[] = rows.map(r => ({
        token: r.token,
        label: r.memory_id
          ? memMap[r.memory_id] || 'Memory'
          : r.wisdom_id
            ? wisMap[r.wisdom_id] || 'Wisdom'
            : 'Shared item',
        kind: r.memory_id ? 'memory' : 'wisdom',
        revoked: !r.is_active || !!r.revoked_at,
      }))
      setTokens(labelled)
    } finally {
      setLoading(false)
    }
  }, [projectId, supabase])

  useEffect(() => {
    loadTokens()
  }, [loadTokens])

  const handleRevoke = async (token: string) => {
    const confirmed = window.confirm(
      "Anyone scanning the QR in the printed book will see 'this link has been revoked.' Continue?"
    )
    if (!confirmed) return
    setRevoking(token)
    try {
      const res = await fetch(`/api/photobook/projects/${projectId}/share-tokens`, {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      if (!res.ok) {
        alert('Failed to revoke link')
        return
      }
      await loadTokens()
    } finally {
      setRevoking(null)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="manage-qr-title"
    >
      <div className="bg-[#F2F1E5] rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-[#D3E1DF]">
          <div>
            <h2
              id="manage-qr-title"
              className="text-lg font-semibold text-[#2d2d2d]"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              QR links
            </h2>
            <p className="text-xs text-[#666]">{orderLabel}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-2 rounded-lg hover:bg-[#D3E1DF]/50 min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
          >
            <X size={20} className="text-[#406A56]" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-[#666] gap-2">
              <Loader2 size={18} className="animate-spin" /> Loading QR links...
            </div>
          ) : tokens.length === 0 ? (
            <div className="text-center py-12 text-sm text-[#666]">
              No QR links were generated for this book yet.
            </div>
          ) : (
            tokens.map(t => (
              <div
                key={t.token}
                className="flex items-center justify-between gap-3 p-3 bg-white rounded-xl border border-[#D3E1DF]"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#2d2d2d] truncate">
                    {t.label}
                  </p>
                  <p className="text-xs text-[#666] capitalize">
                    {t.kind}
                    {t.revoked && (
                      <span className="ml-2 text-[#C35F33] font-semibold">
                        Revoked
                      </span>
                    )}
                  </p>
                </div>
                {!t.revoked && (
                  <button
                    type="button"
                    onClick={() => handleRevoke(t.token)}
                    disabled={revoking === t.token}
                    className="inline-flex items-center gap-1 px-3 py-2 min-h-[44px] rounded-lg bg-[#C35F33] text-white text-sm font-medium hover:bg-[#a94e28] transition-colors disabled:opacity-60 shrink-0"
                  >
                    {revoking === t.token ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Shield size={14} />
                    )}
                    Revoke
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
