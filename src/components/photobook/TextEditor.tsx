'use client'

/** Text overlay editor — draggable/resizable/rotatable text over the page canvas.
 * Position/size are percent-of-page (0-100). Double-click to edit text. */

import { useEffect, useRef, useState } from 'react'
import { Bold, Italic, AlignLeft, AlignCenter, AlignRight, Trash2, RotateCw } from 'lucide-react'
import type { TextOverlay } from '@/lib/photobook/overlays'
import { OVERLAY_FONTS, OVERLAY_TEXT_COLORS } from '@/lib/photobook/overlays'

interface Props {
  overlay: TextOverlay
  selected: boolean
  onSelect: () => void
  onChange: (next: TextOverlay) => void
  onCommit: () => void
  onDelete: () => void
  /** Live page size in pixels (for percent↔px conversion during drag). */
  pageSize: { width: number; height: number }
}

type DragMode =
  | { kind: 'move'; startX: number; startY: number; origX: number; origY: number }
  | {
      kind: 'resize'
      startX: number
      startY: number
      origX: number
      origY: number
      origW: number
      origH: number
      handle: 'nw' | 'ne' | 'sw' | 'se'
    }
  | { kind: 'rotate'; centerX: number; centerY: number; startAngle: number; origRotation: number }

export default function TextEditor({
  overlay,
  selected,
  onSelect,
  onChange,
  onCommit,
  onDelete,
  pageSize,
}: Props) {
  const [editing, setEditing] = useState(false)
  const [drag, setDrag] = useState<DragMode | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (editing && taRef.current) {
      taRef.current.focus()
      taRef.current.select()
    }
  }, [editing])

  useEffect(() => {
    if (!drag) return
    const onMove = (e: MouseEvent) => {
      if (drag.kind === 'move') {
        const dxPct = ((e.clientX - drag.startX) / pageSize.width) * 100
        const dyPct = ((e.clientY - drag.startY) / pageSize.height) * 100
        onChange({
          ...overlay,
          x: clamp(drag.origX + dxPct, 0, 100 - overlay.width),
          y: clamp(drag.origY + dyPct, 0, 100 - overlay.height),
        })
      } else if (drag.kind === 'resize') {
        const dxPct = ((e.clientX - drag.startX) / pageSize.width) * 100
        const dyPct = ((e.clientY - drag.startY) / pageSize.height) * 100
        let { origX, origY, origW, origH } = drag
        let x = origX, y = origY, w = origW, h = origH
        if (drag.handle === 'se') { w = origW + dxPct; h = origH + dyPct }
        if (drag.handle === 'ne') { w = origW + dxPct; h = origH - dyPct; y = origY + dyPct }
        if (drag.handle === 'sw') { w = origW - dxPct; h = origH + dyPct; x = origX + dxPct }
        if (drag.handle === 'nw') { w = origW - dxPct; h = origH - dyPct; x = origX + dxPct; y = origY + dyPct }
        onChange({
          ...overlay,
          x: clamp(x, 0, 100), y: clamp(y, 0, 100),
          width: clamp(w, 8, 100), height: clamp(h, 5, 100),
        })
      } else if (drag.kind === 'rotate') {
        const angle = Math.atan2(e.clientY - drag.centerY, e.clientX - drag.centerX) * (180 / Math.PI)
        onChange({ ...overlay, rotation: Math.round((drag.origRotation + (angle - drag.startAngle)) % 360) })
      }
    }
    const onUp = () => { setDrag(null); onCommit() }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [drag, overlay, pageSize, onChange, onCommit])

  const startMove = (e: React.MouseEvent) => {
    if (editing) return
    e.stopPropagation()
    onSelect()
    setDrag({ kind: 'move', startX: e.clientX, startY: e.clientY, origX: overlay.x, origY: overlay.y })
  }

  const startResize = (handle: 'nw' | 'ne' | 'sw' | 'se') => (e: React.MouseEvent) => {
    e.stopPropagation(); e.preventDefault()
    setDrag({
      kind: 'resize', startX: e.clientX, startY: e.clientY,
      origX: overlay.x, origY: overlay.y, origW: overlay.width, origH: overlay.height, handle,
    })
  }

  const startRotate = (e: React.MouseEvent) => {
    e.stopPropagation(); e.preventDefault()
    const rect = wrapRef.current?.getBoundingClientRect()
    if (!rect) return
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    setDrag({
      kind: 'rotate', centerX: cx, centerY: cy,
      startAngle: Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI),
      origRotation: overlay.rotation ?? 0,
    })
  }

  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${overlay.x}%`,
    top: `${overlay.y}%`,
    width: `${overlay.width}%`,
    height: `${overlay.height}%`,
    transform: overlay.rotation ? `rotate(${overlay.rotation}deg)` : undefined,
    transformOrigin: 'center center',
    cursor: editing ? 'text' : selected ? 'move' : 'pointer',
  }

  return (
    <div
      ref={wrapRef}
      style={style}
      className={selected ? 'ring-2 ring-[#406A56] ring-offset-2' : 'hover:ring-2 hover:ring-[#406A56]/50'}
      onMouseDown={startMove}
      onDoubleClick={(e) => { e.stopPropagation(); setEditing(true) }}
    >
      {editing ? (
        <textarea
          ref={taRef}
          value={overlay.value}
          onChange={(e) => onChange({ ...overlay, value: e.target.value })}
          onBlur={() => { setEditing(false); onCommit() }}
          onKeyDown={(e) => { if (e.key === 'Escape') { setEditing(false); onCommit() } }}
          className="w-full h-full resize-none bg-transparent focus:outline-none"
          style={{
            fontFamily: overlay.fontFamily,
            fontSize: `${overlay.fontSize}px`,
            color: overlay.color,
            textAlign: overlay.align,
            fontWeight: overlay.weight,
            fontStyle: overlay.italic ? 'italic' : 'normal',
            lineHeight: 1.3,
          }}
        />
      ) : (
        <div
          className="w-full h-full flex items-center justify-center overflow-hidden pointer-events-none select-none"
          style={{
            fontFamily: overlay.fontFamily,
            fontSize: `${overlay.fontSize}px`,
            color: overlay.color,
            textAlign: overlay.align,
            fontWeight: overlay.weight,
            fontStyle: overlay.italic ? 'italic' : 'normal',
            lineHeight: 1.3,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            justifyContent: overlay.align === 'center' ? 'center' : overlay.align === 'right' ? 'flex-end' : 'flex-start',
          }}
        >
          {overlay.value || <span className="opacity-40">Click to edit</span>}
        </div>
      )}

      {selected && !editing && (
        <>
          <Handle pos="nw" onDown={startResize('nw')} />
          <Handle pos="ne" onDown={startResize('ne')} />
          <Handle pos="sw" onDown={startResize('sw')} />
          <Handle pos="se" onDown={startResize('se')} />
          <button
            type="button"
            onMouseDown={startRotate}
            title="Rotate"
            aria-label="Rotate text"
            className="absolute -top-10 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white border-2 border-[#406A56] flex items-center justify-center shadow-md"
          >
            <RotateCw className="w-4 h-4 text-[#406A56]" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            title="Delete text"
            aria-label="Delete text overlay"
            className="absolute -top-3 -right-3 w-7 h-7 rounded-full bg-[#C35F33] text-white flex items-center justify-center shadow-md"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </>
      )}
    </div>
  )
}

function Handle({ pos, onDown }: { pos: 'nw' | 'ne' | 'sw' | 'se'; onDown: (e: React.MouseEvent) => void }) {
  const placement: Record<string, string> = {
    nw: '-top-1.5 -left-1.5 cursor-nwse-resize',
    ne: '-top-1.5 -right-1.5 cursor-nesw-resize',
    sw: '-bottom-1.5 -left-1.5 cursor-nesw-resize',
    se: '-bottom-1.5 -right-1.5 cursor-nwse-resize',
  }
  return (
    <div
      role="button"
      aria-label={`Resize ${pos}`}
      onMouseDown={onDown}
      className={`absolute w-3 h-3 rounded-full bg-white border-2 border-[#406A56] ${placement[pos]}`}
    />
  )
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v))
}

/** Floating text toolbar shown while a text overlay is selected. */
export function TextOverlayToolbar({
  overlay,
  onChange,
  onCommit,
  onDelete,
}: {
  overlay: TextOverlay
  onChange: (next: TextOverlay) => void
  onCommit: () => void
  onDelete: () => void
}) {
  const commitChange = (patch: Partial<TextOverlay>) => {
    onChange({ ...overlay, ...patch })
    onCommit()
  }

  return (
    <div className="text-overlay-toolbar bg-white border-2 border-b-0 border-[#DDE3DF] rounded-t-xl shadow-[0_-4px_16px_rgba(64,106,86,0.08)] p-2 flex flex-wrap items-center gap-2">
      <select
        aria-label="Font"
        value={overlay.fontFamily}
        onChange={(e) => commitChange({ fontFamily: e.target.value })}
        className="min-h-[44px] px-2 rounded-lg border border-[#DDE3DF] text-sm"
      >
        {OVERLAY_FONTS.map((f) => (
          <option key={f.value} value={f.value}>{f.label}</option>
        ))}
      </select>

      <label className="flex items-center gap-1 text-xs text-[#5A6660]">
        Size
        <input
          type="range" min={10} max={72} step={1}
          value={overlay.fontSize}
          onChange={(e) => onChange({ ...overlay, fontSize: Number(e.target.value) })}
          onMouseUp={onCommit} onTouchEnd={onCommit}
          aria-label="Font size"
          className="w-24"
        />
        <span className="w-8 text-right">{overlay.fontSize}pt</span>
      </label>

      <button
        type="button" onClick={() => commitChange({ weight: overlay.weight === 'bold' ? 'normal' : 'bold' })}
        aria-pressed={overlay.weight === 'bold'} aria-label="Bold"
        className={`min-w-[44px] min-h-[44px] rounded-lg border-2 flex items-center justify-center ${overlay.weight === 'bold' ? 'bg-[#406A56] text-white border-[#406A56]' : 'border-[#DDE3DF]'}`}
      ><Bold className="w-4 h-4" /></button>

      <button
        type="button" onClick={() => commitChange({ italic: !overlay.italic })}
        aria-pressed={overlay.italic} aria-label="Italic"
        className={`min-w-[44px] min-h-[44px] rounded-lg border-2 flex items-center justify-center ${overlay.italic ? 'bg-[#406A56] text-white border-[#406A56]' : 'border-[#DDE3DF]'}`}
      ><Italic className="w-4 h-4" /></button>

      <div className="flex items-center border-2 border-[#DDE3DF] rounded-lg overflow-hidden">
        {(['left', 'center', 'right'] as const).map((a) => {
          const Icon = a === 'left' ? AlignLeft : a === 'center' ? AlignCenter : AlignRight
          return (
            <button
              key={a} type="button" onClick={() => commitChange({ align: a })}
              aria-label={`Align ${a}`}
              className={`min-w-[44px] min-h-[44px] flex items-center justify-center ${overlay.align === a ? 'bg-[#406A56] text-white' : ''}`}
            ><Icon className="w-4 h-4" /></button>
          )
        })}
      </div>

      <div className="flex items-center gap-1">
        {OVERLAY_TEXT_COLORS.map((c) => (
          <button
            key={c} type="button" onClick={() => commitChange({ color: c })}
            aria-label={`Color ${c}`} title={c}
            className={`w-6 h-6 rounded-full border-2 ${overlay.color === c ? 'border-[#406A56] ring-2 ring-[#406A56]/40' : 'border-[#DDE3DF]'}`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>

      <button
        type="button" onClick={onDelete}
        aria-label="Delete text"
        className="min-w-[44px] min-h-[44px] rounded-lg border-2 border-[#C35F33]/30 text-[#C35F33] flex items-center justify-center"
      ><Trash2 className="w-4 h-4" /></button>
    </div>
  )
}
