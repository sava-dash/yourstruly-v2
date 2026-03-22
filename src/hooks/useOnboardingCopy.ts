'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

type CopyMap = Record<string, string>

// Default values (fallback if DB not loaded or key missing)
const DEFAULTS: CopyMap = {
  'globe.welcome.greeting': 'Hi {name} 👋',
  'globe.welcome.headline': 'We look forward to hearing more about this adventure.',
  'globe.welcome.button': "Let's begin",
  'globe.places.title_first': 'Have you lived anywhere else?',
  'globe.places.title_more': 'Anywhere else?',
  'globe.places.greeting': 'Your life journey 🌍',
  'globe.places.input_placeholder': 'City or town name...',
  'globe.places.when_placeholder': 'When did you move there? (e.g. Summer 2015)',
  'globe.places.button_first': 'Add Place',
  'globe.places.button_more': 'Add Another',
  'globe.places.done': "I'm done",
  'globe.places.skip': 'Skip',
  'globe.adventure.greeting': 'What a journey ✨',
  'globe.adventure.headline': "You've lived in so many amazing places, I can't wait to hear more about your adventures.",
  'globe.adventure.button': 'Continue',
  'globe.contacts.greeting': 'Your people 👨‍👩‍👧‍👦',
  'globe.contacts.headline': 'Who are the important people in your life?',
  'globe.contacts.panel_title': 'Family, Friends & Loved Ones',
  'globe.contacts.panel_subtitle': 'Add the people who matter most',
  'globe.contacts.name_placeholder': 'Name',
  'globe.contacts.relation_placeholder': 'Relationship...',
  'globe.contacts.add_button': '+ Add Person',
  'globe.interests.greeting': 'Your interests 💡',
  'globe.interests.headline': 'What are you into?',
  'globe.interests.panel_title': 'Your Interests',
  'globe.interests.panel_subtitle': 'Pick what you\'re into',
  'globe.interests.custom_placeholder': 'Add your own...',
  'globe.whyhere.panel_title': 'Why are you here? 💭',
  'globe.whyhere.panel_subtitle': 'What brought you to YoursTruly? What do you hope to preserve?',
  'globe.whyhere.placeholder': "I'm here because...",
  'globe.photos.panel_title': '📸 Your Photos',
  'globe.photos.panel_subtitle': 'Upload your favorite photos. We\'ll place geotagged ones on the globe to map your memories around the world.',
  'globe.photos.dropzone_text': 'Drop photos here or click to browse',
  'globe.photos.dropzone_add': 'Add more photos',
  'globe.photos.dropzone_hint': 'JPG, PNG up to 20MB each',
  'globe.photos.button_upload': 'Upload & Continue',
  'globe.photos.button_skip': 'Skip',
  'globe.photos.uploading': 'Uploading...',
  'globe.photomap.greeting': 'Your memories around the world 🌍',
  'globe.photomap.count': '{count} photo{plural} placed on your map.',
  'globe.photomap.missing': '{count} without location — you can add those later.',
  'globe.letsgo.greeting': "Let's bring this to life.",
  'globe.letsgo.headline': "You've set your focus. Now see how easy it is to start capturing what matters.",
  'globe.letsgo.button': 'Start',
  'globe.heartfelt.title': "Let's Go Deeper",
  'globe.heartfelt.subtitle': "Share what's on your mind. We'll capture the moments that matter",
  'globe.progress.map': 'Map',
  'globe.progress.places': 'Places',
  'globe.progress.contacts': 'People',
  'globe.progress.interests': 'Interests',
  'globe.progress.whyhere': 'Why',
  'globe.progress.photos': 'Photos',
  'globe.progress.heartfelt': 'Reflect',
  'globe.progress.ready': 'Done',
  'globe.button.continue': 'Continue',
  'globe.button.skip': 'Skip',
  'globe.ready.title': "You're all set!",
  'globe.ready.subtitle': 'Your story is waiting to be told.',
  'globe.ready.button': 'Go to Dashboard',
}

export function useOnboardingCopy() {
  const [copy, setCopy] = useState<CopyMap>(DEFAULTS)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('onboarding_copy')
      .select('id, value')
      .then(({ data }) => {
        if (data) {
          const map: CopyMap = { ...DEFAULTS }
          data.forEach((row: { id: string; value: string }) => {
            map[row.id] = row.value
          })
          setCopy(map)
        }
        setLoaded(true)
      })
  }, [])

  // Helper: get copy value with optional {name} substitution
  const t = (key: string, vars?: Record<string, string>) => {
    let text = copy[key] || DEFAULTS[key] || key
    if (vars) {
      Object.entries(vars).forEach(([k, v]) => {
        text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), v)
      })
    }
    return text
  }

  return { t, copy, loaded }
}
