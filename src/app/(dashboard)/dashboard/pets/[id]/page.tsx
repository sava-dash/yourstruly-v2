'use client'

import { useState, useEffect, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  ChevronLeft, Edit2, Trash2, Heart, Calendar, Camera,
  Image as ImageIcon, PawPrint, Upload, AlertCircle, User, X, Check, Search
} from 'lucide-react'
import Link from 'next/link'
import '@/styles/home.css'

interface Pet {
  id: string
  name: string
  species: string
  breed?: string
  date_of_birth?: string
  adoption_date?: string
  color?: string
  personality?: string
  favorite_things?: string[]
  medical_notes?: string
  emergency_caretaker_ids?: string[]
  emergency_caretaker_id?: string  // legacy single
  emergency_caretaker?: string
  emergency_caretaker_phone?: string
  is_deceased: boolean
  date_of_passing?: string
  profile_photo_url?: string
}

interface Contact {
  id: string
  full_name: string
  phone?: string
  avatar_url?: string
}

interface TaggedMedia {
  id: string
  file_url: string
  memory_id: string
  memory_title?: string
}

const SPECIES_OPTIONS = ['Dog', 'Cat', 'Bird', 'Fish', 'Rabbit', 'Hamster', 'Guinea Pig', 'Turtle', 'Snake', 'Other']

export default function PetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [pet, setPet] = useState<Pet | null>(null)
  const [taggedPhotos, setTaggedPhotos] = useState<TaggedMedia[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [showEditModal, setShowEditModal] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadPet()
    loadContacts()
  }, [id])

  const loadContacts = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    
    const { data } = await supabase
      .from('contacts')
      .select('id, full_name, phone, avatar_url')
      .eq('user_id', user.id)
      .order('full_name')
    
    if (data) setContacts(data)
  }

  const loadPet = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: petData } = await supabase
      .from('pets')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!petData) {
      setLoading(false)
      return
    }
    setPet(petData)

    // Load tagged photos
    const { data: memoriesData } = await supabase
      .from('memories')
      .select('id, title, memory_media(id, file_url)')
      .eq('user_id', user.id)
      .or(`title.ilike.%${petData.name}%,description.ilike.%${petData.name}%`)
      .limit(20)

    if (memoriesData) {
      const photos: TaggedMedia[] = []
      memoriesData.forEach(m => {
        (m.memory_media || []).forEach((media: any) => {
          photos.push({
            id: media.id,
            file_url: media.file_url,
            memory_id: m.id,
            memory_title: m.title
          })
        })
      })
      setTaggedPhotos(photos)
    }

    setLoading(false)
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const getAge = (dob: string) => {
    if (!dob) return null
    const birth = new Date(dob)
    const today = new Date()
    let years = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      years--
    }
    if (years < 1) {
      let months = (today.getFullYear() - birth.getFullYear()) * 12
      months += today.getMonth() - birth.getMonth()
      return `${months} month${months !== 1 ? 's' : ''}`
    }
    return `${years} year${years !== 1 ? 's' : ''}`
  }

  const handleDelete = async () => {
    if (!confirm('Delete this pet? This cannot be undone.')) return
    await supabase.from('pets').delete().eq('id', id)
    window.location.href = '/dashboard/contacts'
  }

  const [uploading, setUploading] = useState(false)
  
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !pet) return
    
    setUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `pet-${pet.id}-${Date.now()}.${fileExt}`
      const filePath = `pets/${fileName}`
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file)
      
      if (uploadError) throw uploadError
      
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)
      
      await supabase
        .from('pets')
        .update({ profile_photo_url: publicUrl })
        .eq('id', pet.id)
      
      setPet({ ...pet, profile_photo_url: publicUrl })
    } catch (err) {
      console.error('Upload error:', err)
      alert('Failed to upload photo')
    }
    setUploading(false)
  }

  const handlePetPhotosUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0 || !pet) return
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Create a memory for this pet's photos
    const { data: memory, error: memoryError } = await supabase
      .from('memories')
      .insert({
        user_id: user.id,
        title: `Photos of ${pet.name}`,
        description: `Photo album for ${pet.name}`,
        memory_type: 'pet_photos',
        memory_date: new Date().toISOString().split('T')[0],
      })
      .select()
      .single()

    if (memoryError || !memory) {
      alert('Failed to create photo album')
      return
    }

    // Upload each photo
    for (const file of Array.from(files)) {
      const fileExt = file.name.split('.').pop()
      const fileName = `pet-${pet.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`
      
      const { error: uploadError } = await supabase.storage
        .from('memories')
        .upload(fileName, file)
      
      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage
          .from('memories')
          .getPublicUrl(fileName)
        
        await supabase.from('memory_media').insert({
          memory_id: memory.id,
          file_url: publicUrl,
          file_type: file.type.startsWith('video') ? 'video' : 'image',
        })
      }
    }

    // Reload photos
    loadPet()
    alert(`Uploaded ${files.length} photo(s)!`)
  }

  if (loading) {
    return (
      <div className="pb-8 home-background flex items-center justify-center">
        <div className="animate-pulse text-[#2D5A3D]">Loading...</div>
      </div>
    )
  }

  if (!pet) {
    return (
      <div className="pb-8 relative">
        <div className="home-background">
          <div className="home-blob home-blob-1" />
          <div className="home-blob home-blob-2" />
        </div>
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="text-gray-500 mb-4">Pet not found</p>
            <Link href="/dashboard/contacts" className="text-[#B8562E] hover:underline">
              Back to contacts
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const age = pet.date_of_birth ? getAge(pet.date_of_birth) : null
  // Support both single (legacy) and multiple caretakers
  const caretakerIds = pet.emergency_caretaker_ids || (pet.emergency_caretaker_id ? [pet.emergency_caretaker_id] : [])
  const caretakerContacts = contacts.filter(c => caretakerIds.includes(c.id))

  return (
    <div className="pb-8 relative pb-24">
      {/* Warm background */}
      <div className="home-background">
        <div className="home-blob home-blob-1" />
        <div className="home-blob home-blob-2" />
        <div className="home-blob home-blob-3" />
      </div>

      <div className="relative z-10 p-6">
        {/* Header */}
        <header className="mb-6 max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href="/dashboard/contacts" 
                className="p-2 bg-white/80 backdrop-blur-sm rounded-xl text-gray-600 hover:text-gray-900 transition-all border border-gray-200"
              >
                <ChevronLeft size={20} />
              </Link>
              <div className="flex items-center gap-4">
                {pet.profile_photo_url ? (
                  <img 
                    src={pet.profile_photo_url} 
                    alt={pet.name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-md"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#B8562E] to-[#D87A55] flex items-center justify-center text-white text-2xl font-medium shadow-md">
                    <PawPrint size={28} />
                  </div>
                )}
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{pet.name}</h1>
                  <p className="text-[#B8562E] text-sm capitalize font-medium">
                    {pet.species}{pet.breed ? ` • ${pet.breed}` : ''}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowEditModal(true)}
                className="p-2.5 bg-white/80 backdrop-blur-sm text-gray-500 hover:text-[#B8562E] rounded-xl transition-all border border-gray-200"
              >
                <Edit2 size={18} />
              </button>
              <button
                onClick={handleDelete}
                className="p-2.5 bg-white/80 backdrop-blur-sm text-gray-500 hover:text-red-500 rounded-xl transition-all border border-gray-200"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto grid gap-6 lg:grid-cols-3">
          {/* Pet Info */}
          <div className="lg:col-span-1 space-y-4">
            {/* Deceased Banner */}
            {pet.is_deceased && (
              <div className="bg-[#4A3552]/10 border border-[#4A3552]/20 rounded-2xl p-4">
                <p className="text-[#4A3552] text-center">
                  🌈 Rainbow Bridge
                  {pet.date_of_passing && (
                    <span className="block text-sm mt-1 text-[#4A3552]/70">
                      {formatDate(pet.date_of_passing)}
                    </span>
                  )}
                </p>
              </div>
            )}

            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-5 border border-gray-100 shadow-sm space-y-4">
              <h3 className="text-gray-900 font-semibold">Pet Info</h3>
              
              {pet.color && (
                <div className="flex items-center gap-3 text-gray-600">
                  <div className="w-4 h-4 rounded-full bg-gradient-to-r from-gray-300 to-gray-400" />
                  <span className="text-sm">Color: {pet.color}</span>
                </div>
              )}
              
              {pet.date_of_birth && (
                <div className="flex items-center gap-3 text-gray-600">
                  <Calendar size={16} className="text-[#B8562E]" />
                  <span className="text-sm">
                    Born {formatDate(pet.date_of_birth)}
                    {age && ` (${age} old)`}
                  </span>
                </div>
              )}
              
              {pet.adoption_date && (
                <div className="flex items-center gap-3 text-gray-600">
                  <Heart size={16} className="text-[#B8562E]" />
                  <span className="text-sm">
                    Adopted {formatDate(pet.adoption_date)}
                  </span>
                </div>
              )}
            </div>

            {pet.personality && (
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-5 border border-gray-100 shadow-sm">
                <h3 className="text-gray-900 font-semibold mb-2">Personality</h3>
                <p className="text-gray-600 text-sm">{pet.personality}</p>
              </div>
            )}

            {pet.favorite_things && pet.favorite_things.length > 0 && (
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-5 border border-gray-100 shadow-sm">
                <h3 className="text-gray-900 font-semibold mb-2">Favorite Things</h3>
                <div className="flex flex-wrap gap-2">
                  {pet.favorite_things.map((thing, i) => (
                    <span key={i} className="px-3 py-1 bg-[#B8562E]/10 text-[#B8562E] rounded-full text-sm">
                      {thing}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Medical Notes */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-5 border border-gray-100 shadow-sm">
              <h3 className="text-gray-900 font-semibold mb-2 flex items-center gap-2">
                <AlertCircle size={16} className="text-[#B8562E]" />
                Medical Notes
              </h3>
              {pet.medical_notes ? (
                <p className="text-gray-600 text-sm whitespace-pre-wrap">{pet.medical_notes}</p>
              ) : (
                <p className="text-gray-400 text-sm italic">No medical notes recorded</p>
              )}
            </div>

            {/* Emergency Caretakers */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-5 border border-gray-100 shadow-sm">
              <h3 className="text-gray-900 font-semibold mb-2 flex items-center gap-2">
                <User size={16} className="text-[#2D5A3D]" />
                Emergency Caretakers
              </h3>
              {caretakerContacts.length > 0 ? (
                <div className="space-y-3">
                  {caretakerContacts.map(contact => (
                    <div key={contact.id} className="flex items-center gap-3">
                      {contact.avatar_url ? (
                        <img src={contact.avatar_url}
                alt="" className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-[#2D5A3D]/10 flex items-center justify-center">
                          <User size={18} className="text-[#2D5A3D]" />
                        </div>
                      )}
                      <div>
                        <p className="text-gray-900 text-sm font-medium">{contact.full_name}</p>
                        {contact.phone && (
                          <a href={`tel:${contact.phone}`} className="text-[#2D5A3D] text-xs hover:underline">
                            {contact.phone}
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : pet.emergency_caretaker ? (
                <div className="space-y-1">
                  <p className="text-gray-900 text-sm font-medium">{pet.emergency_caretaker}</p>
                  {pet.emergency_caretaker_phone && (
                    <a href={`tel:${pet.emergency_caretaker_phone}`} className="text-[#2D5A3D] text-sm hover:underline">
                      {pet.emergency_caretaker_phone}
                    </a>
                  )}
                </div>
              ) : (
                <p className="text-gray-400 text-sm italic">Not specified - add someone who can care for {pet.name} in an emergency</p>
              )}
              <p className="text-xs text-gray-400 mt-2">These people will be notified if anything happens to you.</p>
            </div>
          </div>

          {/* Right Column - Photos */}
          <div className="lg:col-span-2 space-y-6">
            {/* Profile Photo Upload */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-5 border border-gray-100 shadow-sm">
              <h3 className="text-gray-900 font-semibold mb-4">Profile Photo</h3>
              <div className="flex items-center gap-4">
                {pet.profile_photo_url ? (
                  
<img src={pet.profile_photo_url} alt={pet.name} className="w-20 h-20 rounded-full object-cover" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#B8562E] to-[#D87A55] flex items-center justify-center">
                    <PawPrint size={32} className="text-white" />
                  </div>
                )}
                <label className="flex items-center gap-2 px-4 py-2 bg-[#B8562E]/10 text-[#B8562E] rounded-xl cursor-pointer hover:bg-[#B8562E]/20 transition-colors">
                  <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" disabled={uploading} />
                  <Upload size={16} />
                  {uploading ? 'Uploading...' : 'Upload Photo'}
                </label>
              </div>
            </div>

            {/* Photos Section */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-5 border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-900 font-semibold flex items-center gap-2">
                  <Camera size={18} className="text-[#C4A235]" />
                  Photos of {pet.name}
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">{taggedPhotos.length} photos</span>
                  <label className="flex items-center gap-1.5 px-3 py-1.5 bg-[#C4A235]/10 text-[#8B7B0A] text-sm rounded-lg cursor-pointer hover:bg-[#C4A235]/20 transition-colors">
                    <input 
                      type="file" 
                      accept="image/*" 
                      multiple
                      onChange={handlePetPhotosUpload} 
                      className="hidden" 
                    />
                    <Upload size={14} />
                    Add Photos
                  </label>
                </div>
              </div>
              
              {taggedPhotos.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                    <ImageIcon size={24} className="text-gray-400" />
                  </div>
                  <p className="text-gray-500 text-sm mb-2">Your photo gallery is waiting</p>
                  <p className="text-gray-400 text-xs">Upload photos or add memories featuring {pet.name}</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {taggedPhotos.slice(0, 8).map(photo => (
                    <Link 
                      key={photo.id} 
                      href={`/dashboard/memories/${photo.memory_id}`}
                      className="aspect-square rounded-xl overflow-hidden hover:ring-2 hover:ring-[#B8562E] transition-all"
                    >
                      
<img src={photo.file_url} alt="" className="w-full h-full object-cover" />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <PetEditModal 
          pet={pet} 
          contacts={contacts}
          onClose={() => setShowEditModal(false)} 
          onSave={(updated) => {
            setPet(updated)
            setShowEditModal(false)
          }} 
        />
      )}
    </div>
  )
}

// Edit Modal Component
function PetEditModal({ 
  pet, 
  contacts,
  onClose, 
  onSave 
}: { 
  pet: Pet
  contacts: Contact[]
  onClose: () => void
  onSave: (pet: Pet) => void 
}) {
  const [form, setForm] = useState({
    name: pet.name,
    species: pet.species,
    breed: pet.breed || '',
    date_of_birth: pet.date_of_birth || '',
    adoption_date: pet.adoption_date || '',
    color: pet.color || '',
    personality: pet.personality || '',
    medical_notes: pet.medical_notes || '',
    emergency_caretaker_ids: pet.emergency_caretaker_ids || (pet.emergency_caretaker_id ? [pet.emergency_caretaker_id] : []),
    is_deceased: pet.is_deceased,
    date_of_passing: pet.date_of_passing || '',
  })
  const [saving, setSaving] = useState(false)
  const [caretakerSearch, setCaretakerSearch] = useState('')
  const [showCaretakerDropdown, setShowCaretakerDropdown] = useState(false)
  const supabase = createClient()

  const filteredContacts = contacts.filter(c => 
    c.full_name.toLowerCase().includes(caretakerSearch.toLowerCase()) &&
    !form.emergency_caretaker_ids.includes(c.id)
  )

  const selectedCaretakers = contacts.filter(c => form.emergency_caretaker_ids.includes(c.id))

  const addCaretaker = (contactId: string) => {
    setForm({ ...form, emergency_caretaker_ids: [...form.emergency_caretaker_ids, contactId] })
    setShowCaretakerDropdown(false)
    setCaretakerSearch('')
  }

  const removeCaretaker = (contactId: string) => {
    setForm({ ...form, emergency_caretaker_ids: form.emergency_caretaker_ids.filter(id => id !== contactId) })
  }

  const handleSave = async () => {
    if (!form.name || !form.species) return
    setSaving(true)

    const { data, error } = await supabase
      .from('pets')
      .update({
        name: form.name,
        species: form.species,
        breed: form.breed || null,
        date_of_birth: form.date_of_birth || null,
        adoption_date: form.adoption_date || null,
        color: form.color || null,
        personality: form.personality || null,
        medical_notes: form.medical_notes || null,
        emergency_caretaker_ids: form.emergency_caretaker_ids.length > 0 ? form.emergency_caretaker_ids : null,
        is_deceased: form.is_deceased,
        date_of_passing: form.is_deceased ? (form.date_of_passing || null) : null,
      })
      .eq('id', pet.id)
      .select()
      .single()

    if (!error && data) {
      onSave(data)
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Edit {pet.name}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Name *</label>
              <input
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#B8562E]/20 focus:border-[#B8562E] outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Species *</label>
              <select
                value={form.species}
                onChange={e => setForm({ ...form, species: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#B8562E]/20 focus:border-[#B8562E] outline-none"
              >
                {SPECIES_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Breed</label>
              <input
                value={form.breed}
                onChange={e => setForm({ ...form, breed: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#B8562E]/20 focus:border-[#B8562E] outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Color</label>
              <input
                value={form.color}
                onChange={e => setForm({ ...form, color: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#B8562E]/20 focus:border-[#B8562E] outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Date of Birth</label>
              <input
                type="date"
                value={form.date_of_birth}
                onChange={e => setForm({ ...form, date_of_birth: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#B8562E]/20 focus:border-[#B8562E] outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Adoption Date</label>
              <input
                type="date"
                value={form.adoption_date}
                onChange={e => setForm({ ...form, adoption_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#B8562E]/20 focus:border-[#B8562E] outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Personality</label>
            <textarea
              value={form.personality}
              onChange={e => setForm({ ...form, personality: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#B8562E]/20 focus:border-[#B8562E] outline-none resize-none"
              placeholder="Playful, loves belly rubs..."
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Medical Notes</label>
            <textarea
              value={form.medical_notes}
              onChange={e => setForm({ ...form, medical_notes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#B8562E]/20 focus:border-[#B8562E] outline-none resize-none"
              placeholder="Allergies, medications, vet info..."
            />
          </div>

          {/* Emergency Caretakers - Multi-select */}
          <div className="p-4 bg-[#2D5A3D]/10 rounded-xl">
            <label className="block text-sm font-medium text-[#2D5A3D] mb-1">Emergency Caretakers</label>
            <p className="text-xs text-gray-500 mb-3">Who should care for {pet.name} if something happens to you?</p>
            
            {/* Selected caretakers */}
            {selectedCaretakers.length > 0 && (
              <div className="space-y-2 mb-3">
                {selectedCaretakers.map(contact => (
                  <div key={contact.id} className="flex items-center justify-between bg-white rounded-lg p-3">
                    <div className="flex items-center gap-3">
                      {contact.avatar_url ? (
                        <img src={contact.avatar_url}
                alt="" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-[#2D5A3D]/20 flex items-center justify-center">
                          <User size={14} className="text-[#2D5A3D]" />
                        </div>
                      )}
                      <span className="text-sm font-medium text-gray-900">{contact.full_name}</span>
                    </div>
                    <button
                      onClick={() => removeCaretaker(contact.id)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add more caretakers */}
            <div className="relative">
              <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={caretakerSearch}
                    onChange={e => {
                      setCaretakerSearch(e.target.value)
                      setShowCaretakerDropdown(true)
                    }}
                    onFocus={() => setShowCaretakerDropdown(true)}
                    aria-label="Search" placeholder="Search contacts..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#2D5A3D]/20 focus:border-[#2D5A3D] outline-none"
                  />
                </div>
                {showCaretakerDropdown && filteredContacts.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white rounded-xl border border-gray-200 shadow-lg max-h-48 overflow-y-auto">
                    {filteredContacts.map(contact => (
                      <button
                        key={contact.id}
                        onClick={() => addCaretaker(contact.id)}
                        className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 text-left"
                      >
                        {contact.avatar_url ? (
                          <img src={contact.avatar_url}
                alt="" className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-[#2D5A3D]/20 flex items-center justify-center">
                            <User size={14} className="text-[#2D5A3D]" />
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-900">{contact.full_name}</p>
                          {contact.phone && <p className="text-xs text-gray-500">{contact.phone}</p>}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
          </div>

          {/* Rainbow Bridge */}
          <div className="p-4 bg-[#4A3552]/5 rounded-xl">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_deceased}
                onChange={e => setForm({ ...form, is_deceased: e.target.checked })}
                className="w-5 h-5 rounded border-gray-300 text-[#4A3552] focus:ring-[#4A3552]"
              />
              <span className="text-gray-600">This pet has passed away</span>
            </label>
            {form.is_deceased && (
              <div className="mt-3">
                <label className="block text-sm text-gray-600 mb-1">Date of Passing</label>
                <input
                  type="date"
                  value={form.date_of_passing}
                  onChange={e => setForm({ ...form, date_of_passing: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4A3552]/20 focus:border-[#4A3552] outline-none"
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !form.name || !form.species}
            className="px-6 py-2 bg-[#B8562E] text-white rounded-xl font-medium hover:bg-[#A84E2A] transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? 'Saving...' : <><Check size={16} /> Save</>}
          </button>
        </div>
      </div>
    </div>
  )
}
