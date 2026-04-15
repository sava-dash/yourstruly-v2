/**
 * Draft autosave helper for the postscript creation flow (F1).
 * Debounces PUTs to /api/postscripts/draft and tracks the resulting draft id.
 */

export interface DraftPayload {
  id?: string | null
  recipient_contact_id?: string | null
  circle_id?: string | null
  recipient_name?: string
  recipient_email?: string
  recipient_phone?: string
  title?: string
  message?: string
  video_url?: string
  audio_url?: string
  delivery_type?: string
  delivery_date?: string
  delivery_event?: string
  delivery_recurring?: boolean
  requires_confirmation?: boolean
  has_gift?: boolean
  trigger_type?: string | null
  executor_email?: string | null
  executor_name?: string | null
  legacy_release_required?: boolean
  group_id?: string | null
}

export type SavedHandler = (id: string) => void

export class DraftAutoSaver {
  private timer: ReturnType<typeof setTimeout> | null = null
  private inflight = false
  private pending: DraftPayload | null = null
  private currentId: string | null = null

  constructor(
    private endpoint: string = '/api/postscripts/draft',
    private debounceMs: number = 2000,
    private onSaved?: SavedHandler,
    private onError?: (e: Error) => void,
  ) {}

  setId(id: string | null) { this.currentId = id }
  getId(): string | null { return this.currentId }

  /** Schedule a save with debounce. Latest payload wins. */
  schedule(payload: DraftPayload) {
    this.pending = payload
    if (this.timer) clearTimeout(this.timer)
    this.timer = setTimeout(() => { this.flush().catch(() => {}) }, this.debounceMs)
  }

  /** Force an immediate save of the most recent payload. */
  async flush(): Promise<void> {
    if (this.timer) { clearTimeout(this.timer); this.timer = null }
    if (!this.pending || this.inflight) return
    const body = { ...this.pending, id: this.currentId || undefined }
    this.pending = null
    this.inflight = true
    try {
      const res = await fetch(this.endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(`Draft save failed (${res.status})`)
      const data = await res.json()
      if (data?.id && data.id !== this.currentId) {
        this.currentId = data.id
      }
      if (this.currentId) this.onSaved?.(this.currentId)
    } catch (err) {
      this.onError?.(err instanceof Error ? err : new Error('Draft save failed'))
    } finally {
      this.inflight = false
    }
  }
}
