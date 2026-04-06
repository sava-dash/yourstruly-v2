// ARCHIVED: Original memories page moved here on 2026-04-03
// Replaced with redirect to /dashboard/my-story?tab=memories
// Original file: src/app/(dashboard)/dashboard/memories/page.tsx

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus, Image as ImageIcon, Grid, List, Globe, ChevronLeft, Search, X, Clock, Users, Share2, BookOpen, Album, Mic, Map, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import CreateMemoryModal from '@/components/memories/CreateMemoryModal'
import MemoryCard from '@/components/memories/MemoryCard'
import MemoryCardClean from '@/components/memories/MemoryCardClean'
import ScrapbookCard from '@/components/memories/ScrapbookCard'
// GlobeView removed - using Leaflet MapView for better device compatibility
import MapView from '@/components/memories/MapView'
import { MemoryTimeline } from '@/components/memories/MemoryTimeline'
import { PeopleBrowse } from '@/components/memories/PeopleBrowse'
import { PlacesBrowse } from '@/components/memories/PlacesBrowse'
import { TimelineBrowse } from '@/components/memories/TimelineBrowse'
import { LibraryBrowse } from '@/components/memories/LibraryBrowse'
import VirtualizedMemoryGrid, { VirtualizedSimpleGrid } from '@/components/memories/VirtualizedMemoryGrid'
import MilestonePrompt from '@/components/photobook/MilestonePrompt'
import MemoryStats from '@/components/memories/MemoryStats'
import EmotionalJourney from '@/components/memories/EmotionalJourney'
import { TimelineScrubber } from '@/components/memories/TimelineScrubber'
import { MoodType } from '@/lib/ai/moodAnalysis'
import '@/styles/page-styles.css'
import '@/styles/scrapbook.css'
import { aiLabelsMatchQuery } from '@/lib/utils/aiLabels'

// This file is archived and no longer active.
// See .archive/dashboard-legacy/README for details.
