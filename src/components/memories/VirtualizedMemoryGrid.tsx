'use client'

import { useCallback, useMemo, useRef, memo, useEffect, useState } from 'react'
import { VariableSizeList as List, ListChildComponentProps } from 'react-window'
import AutoSizer from 'react-virtualized-auto-sizer'
import { Calendar } from 'lucide-react'
import MemoryCard from './MemoryCard'

interface Memory {
  id: string
  title: string
  description: string
  memory_date: string
  memory_type: string
  location_name: string
  location_lat?: number
  location_lng?: number
  ai_summary: string
  ai_mood: string
  ai_category: string
  ai_labels: string[]
  is_favorite: boolean
  mood?: string | null
  memory_media?: {
    id: string
    file_url: string
    file_type: string
    is_cover: boolean
  }[]
}

interface VirtualizedMemoryGridProps {
  memories: Memory[]
  columnCount?: number // If not provided, calculated from width
  gap?: number
  showDateHeaders?: boolean
  onScrollDateChange?: (date: Date | null) => void
  scrollToDate?: Date | null
}

interface RowData {
  type: 'header' | 'memories'
  dateKey?: string
  monthName?: string
  year?: string
  count?: number
  memories?: Memory[]
}

// Breakpoint configuration for responsive columns
const BREAKPOINTS = [
  { minWidth: 1280, columns: 5 },  // lg/xl screens
  { minWidth: 1024, columns: 4 },  // md screens  
  { minWidth: 768, columns: 3 },   // sm screens
  { minWidth: 0, columns: 2 },     // xs screens
]

const HEADER_HEIGHT = 52
const GAP = 12

// Memoized header component
const DateHeader = memo(({ monthName, year, count }: { monthName: string; year: string; count: number }) => (
  <div className="flex items-center gap-3 mb-3 px-1">
    <div className="flex items-center gap-2 px-3 py-1.5 glass-card-page">
      <Calendar size={14} className="text-[#D9C61A]" />
      <span className="text-[#2d2d2d] font-medium">{monthName} {year}</span>
    </div>
    <div className="flex-1 h-px bg-[#406A56]/10" />
    <span className="text-[#406A56]/60 text-sm">{count} memories</span>
  </div>
))
DateHeader.displayName = 'DateHeader'

// Memoized memory row component
const MemoryRow = memo(({ memories, itemWidth, gap }: { memories: Memory[]; itemWidth: number; gap: number }) => (
  <div className="flex" style={{ gap }}>
    {memories.map((memory) => (
      <div key={memory.id} style={{ width: itemWidth, flexShrink: 0 }}>
        <MemoryCard memory={memory} />
      </div>
    ))}
  </div>
))
MemoryRow.displayName = 'MemoryRow'

// Main virtualized grid component
export default function VirtualizedMemoryGrid({
  memories,
  columnCount: forcedColumnCount,
  gap = GAP,
  showDateHeaders = true,
}: VirtualizedMemoryGridProps) {
  const listRef = useRef<List>(null)
  const [containerWidth, setContainerWidth] = useState(0)

  // Calculate columns based on container width
  const columnCount = useMemo(() => {
    if (forcedColumnCount) return forcedColumnCount
    for (const bp of BREAKPOINTS) {
      if (containerWidth >= bp.minWidth) return bp.columns
    }
    return 2
  }, [containerWidth, forcedColumnCount])

  // Group memories by date and create row data
  const rowData = useMemo(() => {
    if (!showDateHeaders) {
      // Simple grid without date headers
      const rows: RowData[] = []
      for (let i = 0; i < memories.length; i += columnCount) {
        rows.push({
          type: 'memories',
          memories: memories.slice(i, i + columnCount),
        })
      }
      return rows
    }

    // Group by year-month
    const grouped = memories.reduce((acc, memory) => {
      const date = memory.memory_date ? new Date(memory.memory_date) : new Date()
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      if (!acc[key]) acc[key] = []
      acc[key].push(memory)
      return acc
    }, {} as Record<string, Memory[]>)

    // Sort groups (newest first) and create row data
    const rows: RowData[] = []
    const sortedKeys = Object.keys(grouped).sort().reverse()

    for (const key of sortedKeys) {
      const [year, month] = key.split('-')
      const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleString('default', { month: 'long' })
      const groupMemories = grouped[key]

      // Add header row
      rows.push({
        type: 'header',
        dateKey: key,
        monthName,
        year,
        count: groupMemories.length,
      })

      // Add memory rows for this group
      for (let i = 0; i < groupMemories.length; i += columnCount) {
        rows.push({
          type: 'memories',
          memories: groupMemories.slice(i, i + columnCount),
        })
      }
    }

    return rows
  }, [memories, columnCount, showDateHeaders])

  // Calculate item width based on container width and columns
  const itemWidth = useMemo(() => {
    if (containerWidth === 0) return 0
    const totalGap = gap * (columnCount - 1)
    return (containerWidth - totalGap) / columnCount
  }, [containerWidth, columnCount, gap])

  // Row height calculator - headers are smaller, memory rows are square + gap
  const getRowHeight = useCallback((index: number) => {
    const row = rowData[index]
    if (row.type === 'header') {
      return HEADER_HEIGHT
    }
    // Memory row: square aspect ratio + bottom gap
    return itemWidth + gap
  }, [rowData, itemWidth, gap])

  // Reset list when row data changes (recalculate heights)
  useEffect(() => {
    if (listRef.current) {
      listRef.current.resetAfterIndex(0)
    }
  }, [rowData, itemWidth])

  // Row renderer
  const Row = useCallback(({ index, style }: ListChildComponentProps) => {
    const row = rowData[index]

    if (row.type === 'header') {
      return (
        <div style={style}>
          <DateHeader
            monthName={row.monthName!}
            year={row.year!}
            count={row.count!}
          />
        </div>
      )
    }

    return (
      <div style={style}>
        <MemoryRow
          memories={row.memories!}
          itemWidth={itemWidth}
          gap={gap}
        />
      </div>
    )
  }, [rowData, itemWidth, gap])

  return (
    <div className="w-full h-[calc(100vh-400px)] min-h-[500px]">
      <AutoSizer onResize={({ width }) => setContainerWidth(width)}>
        {({ height, width }) => (
          <List
            ref={listRef}
            height={height}
            width={width}
            itemCount={rowData.length}
            itemSize={getRowHeight}
            overscanCount={5}
            className="scrollbar-thin scrollbar-thumb-[#406A56]/20 scrollbar-track-transparent"
          >
            {Row}
          </List>
        )}
      </AutoSizer>
    </div>
  )
}

// Export simple grid variant without date headers
export function VirtualizedSimpleGrid({
  memories,
  columnCount,
  gap = GAP,
}: Omit<VirtualizedMemoryGridProps, 'showDateHeaders'>) {
  return (
    <VirtualizedMemoryGrid
      memories={memories}
      columnCount={columnCount}
      gap={gap}
      showDateHeaders={false}
    />
  )
}
