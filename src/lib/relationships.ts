// Shared relationship taxonomy used across onboarding, contacts, and memory cards.
// Single source of truth — keep in sync with the contacts.relationship_type column.

export interface RelationshipOption {
  id: string
  label: string
}

export interface RelationshipGroup {
  category: string
  options: RelationshipOption[]
}

export const RELATIONSHIP_OPTIONS: RelationshipGroup[] = [
  { category: 'Family', options: [
    { id: 'mother', label: 'Mother' },
    { id: 'father', label: 'Father' },
    { id: 'spouse', label: 'Spouse' },
    { id: 'partner', label: 'Partner' },
    { id: 'son', label: 'Son' },
    { id: 'daughter', label: 'Daughter' },
    { id: 'brother', label: 'Brother' },
    { id: 'sister', label: 'Sister' },
    { id: 'grandmother', label: 'Grandmother' },
    { id: 'grandfather', label: 'Grandfather' },
    { id: 'grandson', label: 'Grandson' },
    { id: 'granddaughter', label: 'Granddaughter' },
    { id: 'aunt', label: 'Aunt' },
    { id: 'uncle', label: 'Uncle' },
    { id: 'cousin', label: 'Cousin' },
    { id: 'niece', label: 'Niece' },
    { id: 'nephew', label: 'Nephew' },
    { id: 'in_law', label: 'In-Law' },
  ]},
  { category: 'Friends', options: [
    { id: 'best_friend', label: 'Best Friend' },
    { id: 'close_friend', label: 'Close Friend' },
    { id: 'friend', label: 'Friend' },
    { id: 'childhood_friend', label: 'Childhood Friend' },
  ]},
  { category: 'Professional', options: [
    { id: 'colleague', label: 'Colleague' },
    { id: 'boss', label: 'Boss' },
    { id: 'mentor', label: 'Mentor' },
    { id: 'business_partner', label: 'Business Partner' },
  ]},
  { category: 'Other', options: [
    { id: 'neighbor', label: 'Neighbor' },
    { id: 'other', label: 'Other' },
  ]},
]

export function getRelationshipLabel(id: string): string {
  for (const group of RELATIONSHIP_OPTIONS) {
    const found = group.options.find(o => o.id === id)
    if (found) return found.label
  }
  return id || 'Unknown'
}
