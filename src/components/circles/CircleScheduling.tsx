'use client'

import { useState, useEffect, useRef } from 'react'
import { format, addDays, startOfWeek, isSameDay, parse } from 'date-fns'
import { 
  Calendar, Clock, MapPin, Plus, Check, X, ChevronLeft, ChevronRight,
  Users, CalendarCheck, ThumbsUp, ThumbsDown, ExternalLink
} from 'lucide-react'

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''

// ============================================
// HELPERS
// ============================================
function formatTime12h(time24: string): string {
  // Convert "18:00" to "6:00 PM"
  const [hours, minutes] = time24.split(':').map(Number)
  const period = hours >= 12 ? 'PM' : 'AM'
  const hours12 = hours % 12 || 12
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`
}

// ============================================
// EVENT LOCATION MAP
// ============================================
function EventLocationMap({ location }: { location: string }) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const [coordinates, setCoordinates] = useState<[number, number] | null>(null)
  const [loading, setLoading] = useState(true)

  // Geocode location to get coordinates
  useEffect(() => {
    if (!location || !MAPBOX_TOKEN) {
      setLoading(false)
      return
    }

    fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(location)}.json?access_token=${MAPBOX_TOKEN}&limit=1`)
      .then(res => res.json())
      .then(data => {
        if (data.features?.[0]?.center) {
          setCoordinates(data.features[0].center as [number, number])
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [location])

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || !coordinates) return
    if (typeof window === 'undefined') return

    import('mapbox-gl').then((mapboxgl) => {
      mapboxgl.default.accessToken = MAPBOX_TOKEN

      if (mapRef.current) {
        mapRef.current.setCenter(coordinates)
        return
      }

      mapRef.current = new mapboxgl.default.Map({
        container: mapContainerRef.current!,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: coordinates,
        zoom: 14,
        interactive: false,
        attributionControl: false
      })

      new mapboxgl.default.Marker({ color: '#2D5A3D' })
        .setLngLat(coordinates)
        .addTo(mapRef.current)
    })

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [coordinates])

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`

  if (loading) {
    return (
      <div className="w-full h-24 bg-[#2D5A3D]/5 rounded-xl flex items-center justify-center">
        <div className="w-4 h-4 border-2 border-[#2D5A3D]/30 border-t-[#2D5A3D] rounded-full animate-spin" />
      </div>
    )
  }

  if (!coordinates) {
    return null // Don't show map if geocoding failed
  }

  return (
    <div className="mb-4">
      <a
        href={googleMapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block group"
      >
        <div 
          ref={mapContainerRef}
          className="w-full h-28 bg-[#2D5A3D]/5 rounded-xl overflow-hidden relative 
            [&_.mapboxgl-ctrl]:!hidden [&_.mapboxgl-ctrl-logo]:!hidden [&_.mapboxgl-ctrl-attrib]:!hidden
            ring-1 ring-[#2D5A3D]/10 group-hover:ring-[#2D5A3D]/30 transition-all"
        />
        <div className="flex items-center gap-1.5 mt-2 text-xs text-[#2D5A3D] group-hover:text-[#234A31]">
          <ExternalLink size={12} />
          <span>Open in Google Maps</span>
        </div>
      </a>
    </div>
  )
}

// ============================================
// TYPES
// ============================================
export interface TimeSlot {
  date: Date
  startTime: string
  endTime: string
}

export interface Availability {
  memberId: string
  memberName: string
  slots: TimeSlot[]
}

export interface ScheduledEvent {
  id: string
  title: string
  description?: string
  location?: string
  proposedBy: string
  proposedByName: string
  proposedSlots: TimeSlot[]
  finalSlot?: TimeSlot
  status: 'voting' | 'confirmed' | 'cancelled'
  responses: {
    memberId: string
    memberName: string
    votes: { slotIndex: number; available: boolean }[]
  }[]
  createdAt: Date
}

interface CircleSchedulingProps {
  circleId: string
  currentUserId: string
  members: { id: string; name: string }[]
  events: ScheduledEvent[]
  onCreateEvent: (event: Omit<ScheduledEvent, 'id' | 'createdAt' | 'responses' | 'status'>) => void
  onVote: (eventId: string, slotIndex: number, available: boolean) => void
  onConfirmEvent: (eventId: string, slotIndex: number) => void
}

// ============================================
// CREATE EVENT MODAL
// ============================================
function CreateEventModal({ 
  onClose, 
  onCreate 
}: { 
  onClose: () => void
  onCreate: (data: { title: string; description: string; location: string; slots: TimeSlot[] }) => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [slots, setSlots] = useState<TimeSlot[]>([
    { date: addDays(new Date(), 1), startTime: '18:00', endTime: '20:00' }
  ])

  const addSlot = () => {
    setSlots([...slots, { 
      date: addDays(new Date(), slots.length + 1), 
      startTime: '18:00', 
      endTime: '20:00' 
    }])
  }

  const removeSlot = (index: number) => {
    setSlots(slots.filter((_, i) => i !== index))
  }

  const updateSlot = (index: number, updates: Partial<TimeSlot>) => {
    setSlots(slots.map((slot, i) => i === index ? { ...slot, ...updates } : slot))
  }

  const handleSubmit = () => {
    if (!title.trim() || slots.length === 0) return
    onCreate({ title, description, location, slots })
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-[#1A1F1C]">Propose Event</h2>
          <button onClick={onClose} className="p-2 hover:bg-[#2D5A3D]/10 rounded-lg">
            <X size={20} className="text-[#5A6660]" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-[#5A6660] mb-1.5">Event Title *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g., Family Dinner"
              className="form-input"
            />
          </div>

          <div>
            <label className="block text-sm text-[#5A6660] mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What's the plan?"
              className="form-textarea"
              rows={2}
            />
          </div>

          <div>
            <label className="block text-sm text-[#5A6660] mb-1.5">Location</label>
            <div className="relative">
              <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5A6660]" />
              <input
                type="text"
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="Where will it be?"
                className="form-input pl-10"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-[#5A6660]">Proposed Times *</label>
              <button
                onClick={addSlot}
                className="text-sm text-[#2D5A3D] hover:text-[#234A31] flex items-center gap-1"
              >
                <Plus size={14} />
                Add Option
              </button>
            </div>
            
            <div className="space-y-3">
              {slots.map((slot, index) => (
                <div key={index} className="flex flex-wrap items-center gap-2 p-3 bg-[#2D5A3D]/5 rounded-xl">
                  <input
                    type="date"
                    value={format(slot.date, 'yyyy-MM-dd')}
                    onChange={e => updateSlot(index, { date: new Date(e.target.value) })}
                    className="flex-1 min-w-[140px] px-3 py-2 bg-white border border-[#2D5A3D]/10 rounded-lg text-sm text-[#1A1F1C]"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={slot.startTime}
                      onChange={e => updateSlot(index, { startTime: e.target.value })}
                      className="w-32 px-3 py-2 bg-white border border-[#2D5A3D]/10 rounded-lg text-sm text-[#1A1F1C]"
                    />
                    <span className="text-[#1A1F1C] font-medium">to</span>
                    <input
                      type="time"
                      value={slot.endTime}
                      onChange={e => updateSlot(index, { endTime: e.target.value })}
                      className="w-32 px-3 py-2 bg-white border border-[#2D5A3D]/10 rounded-lg text-sm text-[#1A1F1C]"
                    />
                  </div>
                  {slots.length > 1 && (
                    <button
                      onClick={() => removeSlot(index)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="btn-secondary flex-1">
            Cancel
          </button>
          <button 
            onClick={handleSubmit}
            disabled={!title.trim() || slots.length === 0}
            className="btn-primary flex-1"
          >
            <Calendar size={16} />
            Propose Event
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================
// EVENT CARD
// ============================================
function EventCard({ 
  event, 
  currentUserId,
  onVote,
  onConfirm,
  isAdmin
}: { 
  event: ScheduledEvent
  currentUserId: string
  onVote: (slotIndex: number, available: boolean) => void
  onConfirm: (slotIndex: number) => void
  isAdmin: boolean
}) {
  const myResponse = event.responses.find(r => r.memberId === currentUserId)
  const hasVoted = !!myResponse

  const getSlotVotes = (slotIndex: number) => {
    let available = 0
    let unavailable = 0
    event.responses.forEach(r => {
      const vote = r.votes.find(v => v.slotIndex === slotIndex)
      if (vote) {
        if (vote.available) available++
        else unavailable++
      }
    })
    return { available, unavailable }
  }

  const formatSlot = (slot: TimeSlot) => {
    return `${format(slot.date, 'EEE, MMM d')} · ${formatTime12h(slot.startTime)} - ${formatTime12h(slot.endTime)}`
  }

  return (
    <div className="content-card">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-[#1A1F1C]">{event.title}</h3>
            <span className={`status-badge ${
              event.status === 'confirmed' 
                ? 'status-badge-green' 
                : event.status === 'cancelled'
                ? 'status-badge-red'
                : 'status-badge-amber'
            }`}>
              {event.status === 'confirmed' ? 'Confirmed' : event.status === 'cancelled' ? 'Cancelled' : 'Voting'}
            </span>
          </div>
          {event.description && (
            <p className="text-sm text-[#5A6660]">{event.description}</p>
          )}
        </div>
      </div>

      {event.location && (
        <>
          <div className="flex items-center gap-2.5 text-sm text-[#1A1F1C] mb-3">
            <MapPin size={14} className="text-[#2D5A3D] flex-shrink-0" />
            <span>{event.location}</span>
          </div>
          <EventLocationMap location={event.location} />
        </>
      )}

      {/* Time Slots */}
      {event.status === 'confirmed' && event.finalSlot ? (
        <div className="p-4 bg-[#2D5A3D]/10 rounded-xl">
          <div className="flex items-center gap-3 text-[#2D5A3D] font-semibold">
            <CalendarCheck size={18} className="flex-shrink-0" />
            <span className="text-[#1A1F1C]">{formatSlot(event.finalSlot)}</span>
          </div>
        </div>
      ) : event.status === 'voting' && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-[#5A6660] mb-2">Vote on available times:</p>
          {event.proposedSlots.map((slot, index) => {
            const votes = getSlotVotes(index)
            const myVote = myResponse?.votes.find(v => v.slotIndex === index)
            
            return (
              <div 
                key={index}
                className={`p-3 rounded-xl border ${
                  myVote?.available 
                    ? 'bg-[#2D5A3D]/5 border-[#2D5A3D]/30' 
                    : myVote?.available === false
                    ? 'bg-red-50 border-red-200'
                    : 'bg-white border-[#2D5A3D]/10'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Clock size={16} className="text-[#2D5A3D] flex-shrink-0" />
                    <span className="text-sm font-semibold text-[#1A1F1C]">
                      {formatSlot(slot)}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {/* Vote counts */}
                    <div className="flex items-center gap-1 text-xs">
                      <span className="text-green-600 flex items-center gap-0.5">
                        <ThumbsUp size={12} /> {votes.available}
                      </span>
                      <span className="text-red-500 flex items-center gap-0.5 ml-2">
                        <ThumbsDown size={12} /> {votes.unavailable}
                      </span>
                    </div>

                    {/* Vote buttons */}
                    {event.status === 'voting' && (
                      <div className="flex gap-1 ml-3">
                        <button
                          onClick={() => onVote(index, true)}
                          className={`p-2 rounded-lg transition-colors ${
                            myVote?.available === true
                              ? 'bg-green-500 text-white'
                              : 'bg-green-100 text-green-600 hover:bg-green-200'
                          }`}
                        >
                          <Check size={14} />
                        </button>
                        <button
                          onClick={() => onVote(index, false)}
                          className={`p-2 rounded-lg transition-colors ${
                            myVote?.available === false
                              ? 'bg-red-500 text-white'
                              : 'bg-red-100 text-red-600 hover:bg-red-200'
                          }`}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}

                    {/* Confirm button for admins */}
                    {isAdmin && event.status === 'voting' && votes.available > 0 && (
                      <button
                        onClick={() => onConfirm(index)}
                        className="ml-2 px-3 py-1.5 bg-[#2D5A3D] text-white text-xs font-medium rounded-lg hover:bg-[#234A31]"
                      >
                        Confirm
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Responses */}
      <div className="mt-4 pt-4 border-t border-[#2D5A3D]/10">
        <div className="flex items-center gap-2 text-xs text-[#5A6660]">
          <Users size={12} />
          {event.responses.length} responded · Proposed by {event.proposedByName}
        </div>
      </div>
    </div>
  )
}

// ============================================
// MINI CALENDAR
// ============================================
function MiniCalendar({ 
  events,
  onEventClick 
}: { 
  events: ScheduledEvent[]
  onEventClick: (event: ScheduledEvent) => void 
}) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const startDate = startOfWeek(currentDate)
  
  const days = Array.from({ length: 7 }, (_, i) => addDays(startDate, i))
  
  const getEventsForDay = (date: Date) => {
    return events.filter(e => {
      if (e.finalSlot) {
        return isSameDay(e.finalSlot.date, date)
      }
      return e.proposedSlots.some(slot => isSameDay(slot.date, date))
    })
  }

  const getEventColor = (event: ScheduledEvent) => {
    if (event.status === 'confirmed') return 'bg-[#2D5A3D]'
    if (event.status === 'voting') return 'bg-[#C4A235]'
    return 'bg-gray-400'
  }

  return (
    <div className="content-card mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-[#1A1F1C]">This Week</h3>
        <div className="flex gap-1">
          <button
            onClick={() => setCurrentDate(addDays(currentDate, -7))}
            className="p-1.5 hover:bg-[#2D5A3D]/10 rounded-lg"
          >
            <ChevronLeft size={16} className="text-[#5A6660]" />
          </button>
          <button
            onClick={() => setCurrentDate(addDays(currentDate, 7))}
            className="p-1.5 hover:bg-[#2D5A3D]/10 rounded-lg"
          >
            <ChevronRight size={16} className="text-[#5A6660]" />
          </button>
        </div>
      </div>
      
      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {days.map((day, i) => {
          const isToday = isSameDay(day, new Date())
          return (
            <div key={i} className="text-center">
              <div className="text-[10px] text-[#5A6660] uppercase tracking-wide">
                {format(day, 'EEE')}
              </div>
              <div className={`text-sm font-semibold mt-0.5 ${
                isToday ? 'text-[#2D5A3D]' : 'text-[#1A1F1C]'
              }`}>
                {format(day, 'd')}
              </div>
            </div>
          )
        })}
      </div>

      {/* Event bars */}
      <div className="grid grid-cols-7 gap-1 min-h-[60px]">
        {days.map((day, i) => {
          const dayEvents = getEventsForDay(day)
          const isToday = isSameDay(day, new Date())
          
          return (
            <div 
              key={i} 
              className={`rounded-lg p-1 min-h-[60px] ${
                isToday ? 'bg-[#2D5A3D]/10 ring-2 ring-[#2D5A3D]/30' : 'bg-[#f8f8f8]'
              }`}
            >
              {dayEvents.length > 0 ? (
                <div className="space-y-1">
                  {dayEvents.slice(0, 2).map((event, idx) => (
                    <button
                      key={event.id}
                      onClick={() => onEventClick(event)}
                      className={`w-full text-left px-1.5 py-1 rounded ${getEventColor(event)} 
                        hover:opacity-80 transition-opacity cursor-pointer`}
                      title={event.title}
                    >
                      <span className="text-[9px] font-medium text-white leading-tight line-clamp-2">
                        {event.title}
                      </span>
                    </button>
                  ))}
                  {dayEvents.length > 2 && (
                    <div className="text-[9px] text-[#5A6660] text-center font-medium">
                      +{dayEvents.length - 2} more
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="w-1 h-1 rounded-full bg-[#ddd]" />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[#2D5A3D]/10">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-[#2D5A3D]" />
          <span className="text-[10px] text-[#5A6660]">Confirmed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-[#C4A235]" />
          <span className="text-[10px] text-[#5A6660]">Voting</span>
        </div>
      </div>
    </div>
  )
}

// ============================================
// MAIN COMPONENT
// ============================================
export default function CircleScheduling({
  circleId,
  currentUserId,
  members,
  events,
  onCreateEvent,
  onVote,
  onConfirmEvent
}: CircleSchedulingProps) {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [filter, setFilter] = useState<'all' | 'voting' | 'confirmed'>('all')
  const [highlightedEventId, setHighlightedEventId] = useState<string | null>(null)

  const isAdmin = true // In real app, check user's role

  const filteredEvents = events.filter(e => {
    if (filter === 'all') return true
    return e.status === filter
  })

  const handleCreate = (data: { title: string; description: string; location: string; slots: TimeSlot[] }) => {
    onCreateEvent({
      title: data.title,
      description: data.description,
      location: data.location,
      proposedBy: currentUserId,
      proposedByName: 'You',
      proposedSlots: data.slots,
    })
    setShowCreateModal(false)
  }

  const handleCalendarEventClick = (event: ScheduledEvent) => {
    // Set filter to show the event
    if (event.status === 'voting' && filter === 'confirmed') {
      setFilter('all')
    } else if (event.status === 'confirmed' && filter === 'voting') {
      setFilter('all')
    }
    
    // Highlight the event
    setHighlightedEventId(event.id)
    
    // Scroll to event after a brief delay for filter change
    setTimeout(() => {
      const eventEl = document.getElementById(`event-${event.id}`)
      if (eventEl) {
        eventEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
      // Remove highlight after animation
      setTimeout(() => setHighlightedEventId(null), 2000)
    }, 100)
  }

  // Editorial filter pills for the schedule view (matches mock legend).
  const SCHEDULE_FILTERS: { key: 'all' | 'voting' | 'confirmed'; label: string; bg: string; ink: string }[] = [
    { key: 'all',       label: 'ALL',       bg: 'var(--ed-ink, #111)',    ink: '#fff' },
    { key: 'voting',    label: 'VOTING',    bg: 'var(--ed-yellow, #F2C84B)', ink: 'var(--ed-ink, #111)' },
    { key: 'confirmed', label: 'CONFIRMED', bg: 'var(--ed-blue, #2A5CD3)',   ink: '#fff' },
  ]

  return (
    <div>
      {/* SCHEDULING bar — yellow header with title + propose button */}
      <div
        className="flex items-center justify-between mb-4 p-3"
        style={{
          background: 'var(--ed-yellow, #F2C84B)',
          border: '2px solid var(--ed-ink, #111)',
          borderRadius: 2,
        }}
      >
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-[var(--ed-ink,#111)]" />
          <span
            className="text-[11px] tracking-[0.22em] text-[var(--ed-ink,#111)]"
            style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}
          >
            SCHEDULING
          </span>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] tracking-[0.18em]"
          style={{
            fontFamily: 'var(--font-mono, monospace)',
            fontWeight: 700,
            background: 'var(--ed-ink, #111)',
            color: '#fff',
            border: '2px solid var(--ed-ink, #111)',
            borderRadius: 2,
          }}
        >
          <Plus size={12} />
          PROPOSE NEW EVENT
        </button>
      </div>

      <MiniCalendar events={events} onEventClick={handleCalendarEventClick} />

      {/* Editorial filter pills */}
      <div className="flex flex-wrap gap-2 mb-4">
        {SCHEDULE_FILTERS.map((f) => {
          const isActive = filter === f.key
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className="px-3 py-1.5 text-[10px] tracking-[0.18em]"
              style={{
                fontFamily: 'var(--font-mono, monospace)',
                fontWeight: 700,
                background: isActive ? f.bg : 'var(--ed-paper, #FFFBF1)',
                color: isActive ? f.ink : 'var(--ed-ink, #111)',
                border: '2px solid var(--ed-ink, #111)',
                borderRadius: 999,
              }}
            >
              {f.label}
            </button>
          )
        })}
      </div>

      {/* Events List */}
      {filteredEvents.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center text-center py-16 px-6"
          style={{
            background: 'var(--ed-paper, #FFFBF1)',
            border: '2px solid var(--ed-ink, #111)',
            borderRadius: 2,
          }}
        >
          <div
            className="flex items-center justify-center mb-4"
            style={{
              width: 56, height: 56,
              background: 'var(--ed-yellow, #F2C84B)',
              border: '2px solid var(--ed-ink, #111)',
              borderRadius: 999,
            }}
          >
            <Calendar size={24} className="text-[var(--ed-ink,#111)]" />
          </div>
          <p
            className="text-xl text-[var(--ed-ink,#111)] mb-2 leading-tight"
            style={{ fontFamily: 'var(--font-display, "Archivo Black", sans-serif)' }}
          >
            NO EVENTS YET
          </p>
          <p className="text-sm text-[var(--ed-muted,#6F6B61)] mb-5 max-w-sm">
            Propose a group event to schedule with the circle.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-5 py-2.5 text-[10px] tracking-[0.18em]"
            style={{
              fontFamily: 'var(--font-mono, monospace)',
              fontWeight: 700,
              background: 'var(--ed-red, #E23B2E)',
              color: '#fff',
              border: '2px solid var(--ed-ink, #111)',
              borderRadius: 2,
            }}
          >
            <Plus size={12} />
            PROPOSE FIRST EVENT
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredEvents.map(event => (
            <div 
              key={event.id} 
              id={`event-${event.id}`}
              className={`transition-all duration-500 ${
                highlightedEventId === event.id 
                  ? 'ring-2 ring-[#C4A235] ring-offset-2 rounded-2xl' 
                  : ''
              }`}
            >
              <EventCard
                event={event}
                currentUserId={currentUserId}
                onVote={(slotIndex, available) => onVote(event.id, slotIndex, available)}
                onConfirm={(slotIndex) => onConfirmEvent(event.id, slotIndex)}
                isAdmin={isAdmin}
              />
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreateEventModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  )
}
