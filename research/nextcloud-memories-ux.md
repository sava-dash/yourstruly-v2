# NextCloud Memories UX Research

**Date:** March 4, 2026  
**Purpose:** Analyze best-in-class photo memories UX to inform YoursTruly improvements  
**App:** [Memories for Nextcloud](https://memories.gallery) by Varun Patil

---

## Executive Summary

NextCloud Memories is widely considered the best self-hosted Google Photos alternative, praised for its performance, clean UI, and thoughtful UX. Key differentiators include:

1. **Scrubbable timeline** - instant jump to any date in massive libraries
2. **Excellent performance** - tested on 1M+ photos, even on Raspberry Pi
3. **No lock-in** - stores metadata in EXIF, preserves folder structure
4. **Smart organization** - AI tagging (Recognize), face recognition, reverse geocoding
5. **Adaptive video streaming** - HLS transcoding with hardware acceleration

---

## Core UI/UX Patterns

### 1. Timeline/Gallery Views

**Virtual Scrolling with Instant Jump**
- Uses **infinite virtual scroll** but with a crucial addition: a **scrubbable timeline sidebar**
- Users can drag to instantly jump to any point in their photo history
- "The scrubbing in time works great" - multiple user testimonials
- Shows year markers along scroll position

**Date-Based Sorting**
- Sorts by **date taken** (EXIF data), NOT file modification time
- This is critical - edited photos stay in their original chronological position
- Contrast: Nextcloud Photos app sorts by modification date (major complaint)

**Grouping Strategy**
- Groups photos by day/week/month automatically
- Each group shows date header with count
- Density indication - busier time periods are visually apparent

**Current YoursTruly Approach:**
- Has timeline view but limited to grid/cards/scrapbook/timeline modes
- TimelineBrowse component has decade → year → month drill-down (good!)
- But lacks the instant scrubbing/jump functionality
- MemoryTimeline is horizontal scroll, not full timeline scrubber

### 2. Photo Organization

**Albums**
- User-created albums with custom covers
- Collaborative albums (multiple users contribute)
- Auto-generated "smart albums" via AI
- External sharing with non-Nextcloud users
- Download entire albums as ZIP

**Folders**
- Respects actual filesystem structure (no proprietary format)
- Can set specific timeline path(s) per user
- `.nomedia` file excludes folders from timeline
- `.nomemories` file for Memories-specific exclusion

**Tags (AI-Powered)**
- Integrates with **Recognize** app for:
  - Object detection (car, beach, food, etc.)
  - Scene classification (indoor, outdoor, sunset)
  - Auto-generated keywords
- Tags stored in EXIF for portability

**Faces (AI-Powered)**
- Integrates with **Face Recognition** app
- Groups photos by detected faces
- User can merge/split clusters
- Name assignment persists across library
- Shows faces in photo sidebar metadata
- Can change cover photo for each person

**Archive Feature**
- Quick "archive" action moves photos to `.archive` folder
- Removes from timeline but preserves files
- Great for screenshots, receipts, etc.

**Current YoursTruly Approach:**
- Has PeopleBrowse and PlacesBrowse components
- AI mood analysis (unique feature!)
- Category filtering (travel, family, celebration, etc.)
- Missing: true AI object tagging, face clustering, archive feature

### 3. Navigation Patterns

**Sidebar Navigation**
- Clean left sidebar with:
  - Timeline (default view)
  - Folders
  - Favorites
  - Albums
  - People (faces)
  - Places (map)
  - Tags
  - Archive
  - On this day (memories)

**Viewer Experience**
- Full-screen photo viewer with gestures
- Pinch-to-zoom (touch) works smoothly
- Swipe between photos
- Live Photo playback (iOS/Google/Samsung motion photos)
- Icon animation when live photos play
- Shift+F for fullscreen on desktop
- Right-click menu support

**Multi-Selection**
- Select entire day with one click
- Shift+Click for range selection
- Touch+Drag selection on mobile
- Bulk operations: move, delete, share, edit metadata, rotate

**Current YoursTruly Approach:**
- Has browse mode toggle (All/People/Places/Timeline)
- Grid/Cards/Scrapbook/Timeline view modes
- Missing: sidebar navigation, advanced multi-select, viewer gestures

### 4. Search and Filtering

**Search Functionality**
- Basic search by title/description (v7.1.0+)
- Location-based search with autocomplete
- Can search by face name
- Filter by tag keywords

**Filter Options**
- By location/place
- By person/face
- By tag
- By date range
- By file type (photo/video)

**Current YoursTruly Approach:**
- Search by title, description, location, labels
- Mood filter chips (unique feature!)
- Category filters
- Date range filters
- Good foundation, could add face/object search

### 5. Map/Location Features

**Map View**
- Full interactive map of all geotagged photos
- Clustered markers for dense areas
- Click cluster to see photos at location
- Zoom in/out to explore

**Reverse Geocoding**
- Auto-generates place names from GPS coordinates
- Hierarchical places (country → region → city → neighborhood)
- Uses OpenStreetMap data (self-hosted planet DB)
- Accurate, works offline after setup

**Location Editing**
- Edit GPS coordinates of photos
- Bulk edit locations
- Search for location by name when editing

**Current YoursTruly Approach:**
- Has PlacesBrowse component
- GlobeView component (3D globe visualization - unique!)
- Missing: full map view, location editing, reverse geocoding

### 6. Sharing Workflows

**Internal Sharing**
- Share with other Nextcloud users
- Album collaboration (multiple contributors)
- Permission levels (view, edit)

**External Sharing**
- Public links for non-users
- Share individual photos/videos
- Share entire albums
- Share folders
- Optional password protection
- Expiry dates

**Shared with Me**
- Dedicated view for received shares
- Shows who shared and when
- Can leave shared albums

**Current YoursTruly Approach:**
- Has "Shared with Me" tab
- memory_shares table with permissions
- Shows shared_by info
- Good foundation, could add public links

### 7. Mobile Responsiveness

**Web App (PWA)**
- Fully responsive design
- "Install" as PWA for app-like experience
- Touch gestures throughout
- Swipe to refresh

**Native Android App**
- Available on Google Play, F-Droid, GitHub
- Direct file upload
- Face creation/management
- Syncs with web instance

**Auto Upload**
- Uses Nextcloud mobile apps
- Automatic camera roll backup
- Choose upload folder
- Background sync

**Mobile-First Improvements (v6.0.0)**
- Improved back button navigation
- Better mobile layout
- Image editor optimized for touch

**Current YoursTruly Approach:**
- Mobile responsive
- View mode toggle hidden on mobile (smart)
- Missing: native app, PWA, auto-upload

### 8. Performance Optimizations

**Preview Pipelining**
- Highly optimized thumbnail loading
- Loads thumbnails in parallel batches
- Contrast: Photos app loads one-by-one

**Preview Generation**
- Pre-generates previews at multiple resolutions
- Configurable max preview size (2048px, 4096px)
- JPEG quality configurable
- Uses Nextcloud's Preview Generator app

**Lazy Loading**
- Virtual scroll means only visible items render
- Thumbnails load as you scroll
- Smooth 60fps scrolling even on large libraries

**Database Triggers**
- Uses database triggers for performance
- Automatic index updates
- Background indexing job

**Tested at Scale**
- Verified on instances with 1M+ photos
- Works on modest hardware (Raspberry Pi)
- Users report "even faster than Google Photos"

**Video Transcoding**
- On-demand HLS adaptive streaming
- Streams at quality matching connection speed
- Hardware acceleration (VA-API, NVENC)
- Falls back to direct playback if needed
- External transcoder container option

**Current YoursTruly Approach:**
- Standard image loading
- Supabase storage with CDN
- Missing: virtual scrolling, preview pipeline, adaptive video streaming

---

## Standout Features

### Timeline Scrubbing (Rewind)
The killer feature. Users can instantly jump to any time in their library:
- Drag the scroll position indicator
- Zooms to show year markers
- Releases on exact position
- "Jump to any time in the past instantly and relive your memories"

### EXIF Metadata Editing
Edit photo metadata directly:
- Date and time taken
- Title and description
- GPS location (with map picker)
- Tags
- Bulk editing of multiple photos
- All changes saved to EXIF headers (portable!)

### Live Photo Support
Plays motion photos from:
- Apple iOS Live Photos
- Google Motion Photos
- Samsung Motion Photos
- Configurable auto-play vs click-to-play

### Server-Side Image Editing
- Edits happen on server, not browser
- Supports large images without crashes
- Works with all formats (HEIC, RAW, etc.)
- Rotation is lossless (EXIF-based)
- Crop with various aspect ratios

### RAW File Stacking
- Hides RAW files when JPEG exists
- Shows "stack" indicator
- Can access RAW when needed
- Reduces visual clutter

### Google Takeout Migration
Built-in tool to import from Google:
```bash
occ memories:migrate-google-takeout
```
Moves JSON metadata into EXIF headers.

### No Lock-In Philosophy
- Metadata stored in EXIF
- Files stay in original folders
- No proprietary database formats
- Easy migration in/out

---

## Comparison: Memories vs Immich

Since Immich is another popular option, key differences:

| Feature | Memories | Immich |
|---------|----------|--------|
| **Focus** | Part of Nextcloud ecosystem | Standalone photo app |
| **File structure** | Preserves your folders | Creates own structure |
| **Face detection** | Via plugins (Recognize) | Built-in, very fast |
| **Mobile app** | PWA + Android app | Native iOS + Android |
| **Performance** | Excellent (1M+ photos) | Excellent (newer tech) |
| **Folder uploads** | Yes, batch import | Limited folder support |
| **Integration** | Nextcloud apps ecosystem | Standalone |

**User sentiment:** 
- "Memories is the slickest and closest to Google for the UI"
- "Immich is laser-focused on photos, Memories integrates with Nextcloud"
- Many users run both: Nextcloud for files, Immich for photos

---

## Recommendations for YoursTruly

### High Priority (Quick Wins)

1. **Add Timeline Scrubber**
   - Implement draggable scroll position indicator
   - Show year/month markers while dragging
   - Instant jump to any date
   - This is the #1 missing feature vs Memories

2. **Virtual Scrolling**
   - Replace current grid with virtualized list
   - Only render visible + buffer items
   - Critical for large libraries
   - Libraries: `react-window` or `react-virtualized`

3. **Preview Pipelining**
   - Load thumbnails in batches, not sequentially
   - Use smaller preview sizes initially
   - Load full quality on zoom/click

4. **Archive Feature**
   - Quick action to hide from timeline
   - Move to "archived" folder or flag
   - Still accessible in Archive section

### Medium Priority (Major Features)

5. **Full Map View**
   - Interactive map (Mapbox/Leaflet)
   - Clustered photo markers
   - Click to view photos at location
   - Currently only have PlacesBrowse and 3D Globe

6. **Face Recognition**
   - Client-side face detection (face-api.js)
   - Cluster similar faces
   - User naming/merging
   - Browse by person

7. **Metadata Editing**
   - Edit date/time of memories
   - Edit location (map picker)
   - Bulk operations
   - Store changes in database

8. **External Sharing**
   - Public links without login
   - Password protection
   - Expiry dates
   - Share individual or albums

### Lower Priority (Nice to Have)

9. **Live Photo Support**
   - Detect and play motion photos
   - Show indicator icon
   - Auto-play or click-to-play option

10. **RAW/Similar File Stacking**
    - Hide duplicates
    - Stack similar burst photos
    - Show indicator on stacked items

11. **Smart Albums**
    - Auto-generate albums from AI analysis
    - "Best of 2024", "Beach trips", etc.
    - Based on mood, category, location

12. **PWA Support**
    - Make app installable
    - Offline support for cached content
    - Push notifications for shares

---

## Implementation Notes

### Timeline Scrubber Implementation

```tsx
// Concept: Scrubbable timeline component
interface TimelineScrubberProps {
  memories: Memory[]
  onJumpTo: (date: Date) => void
}

// 1. Build date index from memories
// 2. Render vertical scrub bar with year markers
// 3. On drag, calculate target date from position
// 4. Call onJumpTo with target date
// 5. Smooth scroll to that position in virtual list
```

### Virtual Scrolling Implementation

```tsx
// Using react-window
import { VariableSizeGrid } from 'react-window'

// 1. Calculate row heights (grouped by date)
// 2. Use Grid for 2D virtualization
// 3. Memo cell renderers
// 4. Overscan 5 rows for smooth scroll
```

### Face Detection (Client-Side)

```tsx
// Using face-api.js
import * as faceapi from 'face-api.js'

// 1. Load models on app init
// 2. On photo upload, detect faces
// 3. Extract face descriptors (128D vectors)
// 4. Cluster by cosine similarity
// 5. Store face data in Supabase
```

---

## Conclusion

NextCloud Memories succeeds because it:
1. **Prioritizes performance** at every level
2. **Respects user data** (EXIF, folder structure)
3. **Delivers Google Photos-level UX** without Google
4. **Integrates deeply** with ecosystem (Nextcloud)
5. **Has excellent mobile experience** despite being web-first

For YoursTruly, the biggest opportunities are:
- **Timeline scrubbing** - the standout UX pattern
- **Virtual scrolling** - critical for scaling
- **Face recognition** - highly requested feature
- **Map view** - spatial browsing is powerful

Our unique differentiators to preserve:
- **Mood analysis** - emotional categorization is unique
- **3D Globe view** - visually distinctive
- **Voice memories** - audio storytelling
- **Photobook creation** - physical product integration
- **Scrapbook view** - creative, nostalgic aesthetic

---

## Sources

- https://memories.gallery
- https://github.com/pulsejet/memories
- https://memories.gallery/config/
- https://memories.gallery/memories-vs-photos/
- https://memories.gallery/hw-transcoding/
- https://memories.gallery/changelog/
- Reddit r/NextCloud and r/selfhosted discussions
- User testimonials and comparisons
