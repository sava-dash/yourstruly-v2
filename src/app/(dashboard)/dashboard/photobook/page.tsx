'use client'

/**
 * /dashboard/photobook — landing page for the photobook feature.
 *
 * Lists the user's in-progress drafts and previously printed books, and
 * offers a primary CTA to start a fresh book. The product picker and editor
 * still live at /dashboard/photobook/create; this page only surfaces
 * existing work so users can resume, reprint, or view past books.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { BookOpen, Plus, ArrowLeft, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import DraftCard, { DraftCardProject } from '@/components/photobook/DraftCard'
import PrintedCard, { PrintedCardProject } from '@/components/photobook/PrintedCard'
import FlipBookPreview, { FlipPage, FlipCover } from '@/components/photobook/FlipBookPreview'

type ProjectRow = {
  id: string
  title: string | null
  cover_image_url: string | null
  status: string | null
  page_count: number | null
  updated_at: string
  created_at: string
}

type OrderRow = {
  id: string
  project_id: string | null
  status: string | null
  created_at: string
}

type PageRow = {
  page_number: number | null
  content_json: {
    photos?: Array<{ file_url?: string | null }>
  } | null
}

export default function PhotobookLandingPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [loading, setLoading] = useState(true)
  const [drafts, setDrafts] = useState<DraftCardProject[]>([])
  const [printed, setPrinted] = useState<PrintedCardProject[]>([])
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [reprintingId, setReprintingId] = useState<string | null>(null)

  // FlipBookPreview modal state.
  const [viewingProject, setViewingProject] = useState<PrintedCardProject | null>(null)
  const [previewPages, setPreviewPages] = useState<FlipPage[]>([])
  const [previewLoading, setPreviewLoading] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Drafts: status null / draft / in_progress, excluding ordered.
      const { data: projectRows } = await supabase
        .from('photobook_projects')
        .select('id, title, cover_image_url, status, page_count, updated_at, created_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(50)

      const projects: ProjectRow[] = (projectRows as ProjectRow[] | null) || []

      const draftStatuses = new Set(['draft', 'in_progress', null])
      const draftList = projects
        .filter((p) => draftStatuses.has(p.status) || p.status === null)
        .filter((p) => p.status !== 'ordered')
        .slice(0, 20)
        .map<DraftCardProject>((p) => ({
          id: p.id,
          title: p.title,
          cover_image_url: p.cover_image_url,
          page_count: p.page_count,
          updated_at: p.updated_at,
        }))

      setDrafts(draftList)

      // Printed: join with photobook_orders. We pick the most recent order per
      // project and attach its status. Projects whose status is 'ordered' but
      // that have no order row still surface (status badge hidden).
      const { data: orderRows } = await supabase
        .from('photobook_orders')
        .select('id, project_id, status, created_at')
        .order('created_at', { ascending: false })
        .limit(100)

      const orders: OrderRow[] = (orderRows as OrderRow[] | null) || []
      const bestOrderByProject = new Map<string, OrderRow>()
      for (const o of orders) {
        if (!o.project_id) continue
        if (!bestOrderByProject.has(o.project_id)) {
          bestOrderByProject.set(o.project_id, o)
        }
      }

      const printableStatuses = new Set([
        'processing',
        'in_production',
        'shipped',
        'delivered',
        'complete',
        'completed',
      ])

      const printedList: PrintedCardProject[] = []
      const seen = new Set<string>()
      for (const p of projects) {
        if (seen.has(p.id)) continue
        const order = bestOrderByProject.get(p.id)
        const orderStatus = order?.status ? order.status.toLowerCase() : null
        const isOrdered = p.status === 'ordered'
        const hasPrintableOrder = orderStatus ? printableStatuses.has(orderStatus) : false
        if (!isOrdered && !hasPrintableOrder) continue
        seen.add(p.id)
        printedList.push({
          id: p.id,
          title: p.title,
          cover_image_url: p.cover_image_url,
          printed_at: order?.created_at ?? p.updated_at,
          order_status: orderStatus,
        })
        if (printedList.length >= 20) break
      }

      setPrinted(printedList)
    } finally {
      setLoading(false)
    }
  }, [router, supabase])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleContinue = useCallback(
    (id: string) => {
      router.push(`/dashboard/photobook/create?projectId=${id}`)
    },
    [router],
  )

  const handleDelete = useCallback(
    async (id: string) => {
      if (typeof window !== 'undefined') {
        const ok = window.confirm("Delete this draft? This can't be undone.")
        if (!ok) return
      }
      setDeletingId(id)
      try {
        const res = await fetch(`/api/photobook/projects/${id}`, { method: 'DELETE' })
        if (!res.ok) {
          const json = await res.json().catch(() => ({}))
          alert(json.error || 'Failed to delete draft')
          return
        }
        setDrafts((prev) => prev.filter((d) => d.id !== id))
      } catch {
        alert('Failed to delete draft')
      } finally {
        setDeletingId(null)
      }
    },
    [],
  )

  const handleReprint = useCallback(
    async (id: string) => {
      setReprintingId(id)
      try {
        const res = await fetch(`/api/photobook/projects/${id}/clone`, { method: 'POST' })
        const json = await res.json()
        if (!res.ok) {
          alert(json.error || 'Failed to clone project')
          return
        }
        router.push(`/dashboard/photobook/create?projectId=${json.project.id}`)
      } catch {
        alert('Failed to clone project')
      } finally {
        setReprintingId(null)
      }
    },
    [router],
  )

  const handleView = useCallback(
    async (id: string) => {
      const project = printed.find((p) => p.id === id)
      if (!project) return
      setViewingProject(project)
      setPreviewPages([])
      setPreviewLoading(true)
      try {
        const { data: pageRows } = await supabase
          .from('photobook_pages')
          .select('page_number, content_json')
          .eq('project_id', id)
          .order('page_number', { ascending: true })

        const rows: PageRow[] = (pageRows as PageRow[] | null) || []
        // Shallow flip-book: one thumbnail per page using the first photo.
        // Composed-render (via renderPagesForPreview) would require the full
        // editor page shape, which isn't stored 1:1; for "view digitally" a
        // cover + photo-thumb flip is clear and fast.
        const pages: FlipPage[] = rows.map((row, i) => {
          const firstPhoto = row.content_json?.photos?.[0]?.file_url || null
          return {
            id: `${id}-${row.page_number ?? i}`,
            imageUrl: firstPhoto,
            caption: null,
          }
        })
        setPreviewPages(pages)
      } finally {
        setPreviewLoading(false)
      }
    },
    [printed, supabase],
  )

  const closeView = useCallback(() => {
    setViewingProject(null)
    setPreviewPages([])
  }, [])

  const cover: FlipCover | null = viewingProject
    ? {
        title: viewingProject.title?.trim() || 'Your book',
        frontImageUrl: viewingProject.cover_image_url,
        textColor: '#ffffff',
        fontPair: 'classic',
      }
    : null

  const hasAny = drafts.length > 0 || printed.length > 0

  return (
    <div className="min-h-screen bg-[#F2F1E5]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back link */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-[#666] hover:text-[#406A56] text-sm mb-6"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden />
          Back to dashboard
        </Link>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
          <div>
            <h1
              className="text-4xl sm:text-5xl text-[#2d4d3e] mb-2"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Your books
            </h1>
            <p className="text-[#666] text-base">
              Continue a draft, view a printed book, or start something new.
            </p>
          </div>
          <Link
            href="/dashboard/photobook/create?fresh=1"
            className="inline-flex items-center justify-center gap-2 min-h-[52px] px-6 rounded-lg bg-[#C35F33] hover:bg-[#a64f28] text-white font-semibold text-base shadow-sm transition-colors"
            style={{ fontFamily: "'Inter Tight', system-ui, sans-serif" }}
          >
            <Plus className="w-5 h-5" aria-hidden />
            Start a new book
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24 text-[#666]">
            <Loader2 className="w-6 h-6 animate-spin mr-2" aria-hidden />
            Loading your books&hellip;
          </div>
        ) : !hasAny ? (
          <div className="bg-white rounded-2xl border border-[#e7e2d5] p-10 sm:p-16 text-center shadow-sm">
            <div className="mx-auto w-16 h-16 rounded-full bg-[#D3E1DF] flex items-center justify-center mb-5">
              <BookOpen className="w-8 h-8 text-[#406A56]" aria-hidden />
            </div>
            <h2
              className="text-2xl text-[#2d4d3e] mb-3"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              No books yet
            </h2>
            <p
              className="text-lg text-[#666] italic mb-6"
              style={{ fontFamily: "'Caveat', cursive" }}
            >
              Every book starts with a single memory.
            </p>
            <Link
              href="/dashboard/photobook/create?fresh=1"
              className="inline-flex items-center justify-center gap-2 min-h-[52px] px-6 rounded-lg bg-[#C35F33] hover:bg-[#a64f28] text-white font-semibold text-base"
            >
              <Plus className="w-5 h-5" aria-hidden />
              Start your first book
            </Link>
          </div>
        ) : (
          <div className="space-y-14">
            {drafts.length > 0 && (
              <section>
                <h2
                  className="text-2xl sm:text-3xl text-[#2d4d3e] mb-1"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  Drafts &mdash; pick up where you left off
                </h2>
                <p className="text-[#666] text-sm mb-5">
                  Your in-progress books. Click to continue.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {drafts.map((d) => (
                    <DraftCard
                      key={d.id}
                      project={d}
                      onContinue={handleContinue}
                      onDelete={handleDelete}
                      deleting={deletingId === d.id}
                    />
                  ))}
                </div>
              </section>
            )}

            {printed.length > 0 && (
              <section>
                <h2
                  className="text-2xl sm:text-3xl text-[#2d4d3e] mb-1"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  Printed books &mdash; keep them forever
                </h2>
                <p className="text-[#666] text-sm mb-5">
                  Your printed books, ready to view digitally or reprint.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {printed.map((p) => (
                    <PrintedCard
                      key={p.id}
                      project={p}
                      onView={handleView}
                      onReprint={handleReprint}
                      reprinting={reprintingId === p.id}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>

      {cover && (
        <FlipBookPreview
          open={!!viewingProject}
          pages={previewPages}
          cover={cover}
          onClose={closeView}
          loading={previewLoading}
        />
      )}
    </div>
  )
}
