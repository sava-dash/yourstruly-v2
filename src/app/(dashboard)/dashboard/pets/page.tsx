'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Edit2, Trash2, X, Heart, ChevronLeft, Calendar, Sparkles } from 'lucide-react'
import Link from 'next/link'
import '@/styles/page-styles.css'

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
  is_deceased: boolean
  date_of_passing?: string
}

const speciesOptions = ['Dog', 'Cat', 'Bird', 'Fish', 'Rabbit', 'Hamster', 'Guinea Pig', 'Turtle', 'Snake', 'Lizard', 'Horse', 'Other']

const speciesEmoji: Record<string, string> = {
  Dog: '🐕',
  Cat: '🐈',
  Bird: '🐦',
  Fish: '🐟',
  Rabbit: '🐰',
  Hamster: '🐹',
  'Guinea Pig': '🐹',
  Turtle: '🐢',
  Snake: '🐍',
  Lizard: '🦎',
  Horse: '🐴',
  Other: '🐾',
}

export default function PetsPage() {
  const [pets, setPets] = useState<Pet[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingPet, setEditingPet] = useState<Pet | null>(null)
  const supabase = createClient()

  useEffect(() => {
    loadPets()
  }, [])

  const loadPets = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('pets')
      .select('*')
      .eq('user_id', user.id)
      .order('name')

    setPets(data || [])
    setLoading(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this pet?')) return
    await supabase.from('pets').delete().eq('id', id)
    setPets(pets.filter(p => p.id !== id))
  }

  const openEdit = (pet: Pet) => {
    setEditingPet(pet)
    setShowModal(true)
  }

  const openNew = () => {
    setEditingPet(null)
    setShowModal(true)
  }

  if (loading) {
    return (
      <div className="page-container">
        <div className="page-background">
          <div className="page-blob page-blob-1" />
          <div className="page-blob page-blob-2" />
          <div className="page-blob page-blob-3" />
        </div>
        <div className="relative z-10 flex items-center justify-center h-64">
          <div className="loading-text">Loading pets...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container">
      {/* Warm gradient background with blobs */}
      <div className="page-background">
        <div className="page-blob page-blob-1" />
        <div className="page-blob page-blob-2" />
        <div className="page-blob page-blob-3" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <header className="mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <Link href="/dashboard/contacts" className="page-header-back">
                <ChevronLeft size={20} />
              </Link>
              <div>
                <h1 className="page-header-title">Pets</h1>
                <p className="page-header-subtitle">
                  Your furry, feathered, and scaly family members
                </p>
              </div>
            </div>

            <button
              onClick={openNew}
              className="btn-primary"
            >
              <Plus size={18} />
              <span>Add Pet</span>
            </button>
          </div>
        </header>

        {/* Pets Grid */}
        {pets.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <Heart size={32} className="text-[#B8562E]" />
            </div>
            <h3 className="empty-state-title">No pets yet</h3>
            <p className="empty-state-text">Add your beloved pets to your life story.</p>
            <button
              onClick={openNew}
              className="btn-primary mx-auto"
            >
              <Plus size={18} />
              Add Your First Pet
            </button>
          </div>
        ) : (
          <div className="cards-grid">
            {pets.map(pet => (
              <div 
                key={pet.id} 
                className={`glass-card-page p-5 ${pet.is_deceased ? 'opacity-75' : ''}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#B8562E] to-[#C4A235] flex items-center justify-center text-2xl shadow-sm">
                      {speciesEmoji[pet.species] || '🐾'}
                    </div>
                    <div>
                      <h3 className="text-[#2d2d2d] font-semibold">{pet.name}</h3>
                      <p className="text-[#666] text-sm">{pet.species}{pet.breed ? ` · ${pet.breed}` : ''}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button 
                      onClick={() => openEdit(pet)} 
                      className="p-2 text-[#2D5A3D]/60 hover:text-[#2D5A3D] hover:bg-[#2D5A3D]/10 rounded-lg transition-colors"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(pet.id)} 
                      className="p-2 text-[#2D5A3D]/60 hover:text-[#B8562E] hover:bg-[#B8562E]/10 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <div className="space-y-1 text-sm">
                  {pet.color && <p className="text-[#666]">Color: {pet.color}</p>}
                  {pet.personality && <p className="text-[#666]">{pet.personality}</p>}
                  {pet.date_of_birth && (
                    <p className="text-[#666] flex items-center gap-1">
                      <Calendar size={12} className="text-[#C4A235]" />
                      Born: {new Date(pet.date_of_birth).toLocaleDateString()}
                    </p>
                  )}
                  {pet.is_deceased && (
                    <p className="text-[#888] italic flex items-center gap-1 mt-2">
                      <Sparkles size={12} className="text-[#C4A235]" />
                      Rainbow Bridge {pet.date_of_passing ? `· ${new Date(pet.date_of_passing).toLocaleDateString()}` : ''}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <PetModal
          pet={editingPet}
          onClose={() => setShowModal(false)}
          onSave={() => { setShowModal(false); loadPets() }}
        />
      )}
    </div>
  )
}

function PetModal({
  pet,
  onClose,
  onSave,
}: {
  pet: Pet | null
  onClose: () => void
  onSave: () => void
}) {
  const [form, setForm] = useState({
    name: pet?.name || '',
    species: pet?.species || '',
    breed: pet?.breed || '',
    date_of_birth: pet?.date_of_birth || '',
    adoption_date: pet?.adoption_date || '',
    color: pet?.color || '',
    personality: pet?.personality || '',
    favorite_things: pet?.favorite_things?.join(', ') || '',
    medical_notes: pet?.medical_notes || '',
    is_deceased: pet?.is_deceased || false,
    date_of_passing: pet?.date_of_passing || '',
  })
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  const handleSave = async () => {
    if (!form.name || !form.species) return
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const data = {
      name: form.name,
      species: form.species,
      breed: form.breed || null,
      date_of_birth: form.date_of_birth || null,
      adoption_date: form.adoption_date || null,
      color: form.color || null,
      personality: form.personality || null,
      favorite_things: form.favorite_things ? form.favorite_things.split(',').map(s => s.trim()).filter(Boolean) : [],
      medical_notes: form.medical_notes || null,
      is_deceased: form.is_deceased,
      date_of_passing: form.is_deceased ? (form.date_of_passing || null) : null,
    }

    if (pet) {
      await supabase.from('pets').update(data).eq('id', pet.id)
    } else {
      await supabase.from('pets').insert({ ...data, user_id: user.id })
    }

    setSaving(false)
    onSave()
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#FAFAF7] rounded-2xl p-6 border border-[#2D5A3D]/10 shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto scrollbar-thin">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-[#2d2d2d]">
            {pet ? 'Edit Pet' : 'Add Pet'}
          </h2>
          <button onClick={onClose} className="p-2 text-[#2D5A3D]/60 hover:text-[#2D5A3D] hover:bg-[#2D5A3D]/10 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[#666] mb-1">Name *</label>
              <input
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="form-input"
                placeholder="Buddy"
              />
            </div>
            <div>
              <label className="block text-sm text-[#666] mb-1">Species *</label>
              <select
                value={form.species}
                onChange={e => setForm({ ...form, species: e.target.value })}
                className="form-input"
              >
                <option value="">Select...</option>
                {speciesOptions.map(s => (
                  <option key={s} value={s}>{speciesEmoji[s]} {s}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[#666] mb-1">Breed</label>
              <input
                value={form.breed}
                onChange={e => setForm({ ...form, breed: e.target.value })}
                className="form-input"
                placeholder="Golden Retriever"
              />
            </div>
            <div>
              <label className="block text-sm text-[#666] mb-1">Color</label>
              <input
                value={form.color}
                onChange={e => setForm({ ...form, color: e.target.value })}
                className="form-input"
                placeholder="Golden"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[#666] mb-1">Date of Birth</label>
              <input
                type="date"
                value={form.date_of_birth}
                onChange={e => setForm({ ...form, date_of_birth: e.target.value })}
                className="form-input"
              />
            </div>
            <div>
              <label className="block text-sm text-[#666] mb-1">Adoption Date</label>
              <input
                type="date"
                value={form.adoption_date}
                onChange={e => setForm({ ...form, adoption_date: e.target.value })}
                className="form-input"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-[#666] mb-1">Personality</label>
            <textarea
              value={form.personality}
              onChange={e => setForm({ ...form, personality: e.target.value })}
              className="form-input resize-none"
              rows={2}
              placeholder="Playful, loves belly rubs..."
            />
          </div>

          <div>
            <label className="block text-sm text-[#666] mb-1">Favorite Things (comma-separated)</label>
            <input
              value={form.favorite_things}
              onChange={e => setForm({ ...form, favorite_things: e.target.value })}
              className="form-input"
              placeholder="Treats, squeaky toys, naps"
            />
          </div>

          <div>
            <label className="block text-sm text-[#666] mb-1">Medical Notes</label>
            <textarea
              value={form.medical_notes}
              onChange={e => setForm({ ...form, medical_notes: e.target.value })}
              className="form-input resize-none"
              rows={2}
              placeholder="Allergies, medications, vet info..."
            />
          </div>

          <div className="p-4 bg-[#2D5A3D]/5 rounded-xl border border-[#2D5A3D]/10">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_deceased}
                onChange={e => setForm({ ...form, is_deceased: e.target.checked })}
                className="w-5 h-5 rounded border-[#2D5A3D]/30 bg-white text-[#2D5A3D] focus:ring-[#2D5A3D]"
              />
              <span className="text-[#666]">This pet has passed away 🌈</span>
            </label>
            {form.is_deceased && (
              <div className="mt-3">
                <label className="block text-sm text-[#666] mb-1">Date of Passing</label>
                <input
                  type="date"
                  value={form.date_of_passing}
                  onChange={e => setForm({ ...form, date_of_passing: e.target.value })}
                  className="form-input"
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !form.name || !form.species}
            className="btn-primary disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Pet'}
          </button>
        </div>
      </div>
    </div>
  )
}
