'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, Trash2, Sparkles, Edit2, Check, ChevronDown, ChevronUp, Image, X, Plus, Users, Search, UserPlus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface Exchange {
  question: string;
  response: string;
  audioUrl?: string;
  transcription?: string;
}

interface Contact {
  id: string;
  full_name: string;
  avatar_url?: string;
  relationship_type?: string;
}

interface ReviewScreenProps {
  exchanges: Exchange[];
  promptType: string;
  expectedXp?: number;
  onSave: (summary: string, photos?: File[], taggedContactIds?: string[]) => void;
  onDiscard: () => void;
  isSaving?: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  photo_backstory: 'Photo Story',
  tag_person: 'Person Tag',
  missing_info: 'Contact Info',
  memory_prompt: 'Memory',
  knowledge: 'Knowledge',
  connect_dots: 'Connection',
  highlight: 'Highlight',
  quick_question: 'Quick Answer',
  postscript: 'Future Message',
  favorites_firsts: 'Favorites & Firsts',
  recipes_wisdom: 'Recipe or Wisdom',
};

export function ReviewScreen({ 
  exchanges, 
  promptType,
  expectedXp = 15,
  onSave, 
  onDiscard,
  isSaving = false 
}: ReviewScreenProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedSummary, setEditedSummary] = useState('');
  const [expandedExchanges, setExpandedExchanges] = useState<number[]>([]);
  const [photos, setPhotos] = useState<{ file: File; preview: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Contact tagging state
  const [taggedContacts, setTaggedContacts] = useState<Contact[]>([]);
  const [contactSearch, setContactSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Contact[]>([]);
  const [showContactDropdown, setShowContactDropdown] = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Custom tags state
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  
  const supabase = createClient();

  // Search contacts
  const searchContacts = useCallback(async (query: string) => {
    if (query.length < 1) {
      setSearchResults([]);
      return;
    }
    
    setLoadingContacts(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('contacts')
        .select('id, full_name, avatar_url, relationship_type')
        .eq('user_id', user.id)
        .ilike('full_name', `%${query}%`)
        .limit(6);

      if (data) {
        // Filter out already tagged contacts
        const taggedIds = new Set(taggedContacts.map(c => c.id));
        setSearchResults(data.filter(c => !taggedIds.has(c.id)));
      }
    } catch (error) {
      console.error('Error searching contacts:', error);
    } finally {
      setLoadingContacts(false);
    }
  }, [supabase, taggedContacts]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (contactSearch) {
        searchContacts(contactSearch);
      } else {
        setSearchResults([]);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [contactSearch, searchContacts]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowContactDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addContact = (contact: Contact) => {
    setTaggedContacts(prev => [...prev, contact]);
    setContactSearch('');
    setSearchResults([]);
    setShowContactDropdown(false);
  };

  const removeContact = (contactId: string) => {
    setTaggedContacts(prev => prev.filter(c => c.id !== contactId));
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newPhotos = files.map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }));
    setPhotos(prev => [...prev, ...newPhotos].slice(0, 5)); // Max 5 photos
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  // Generate a combined summary from all exchanges
  const generatedSummary = useMemo(() => {
    return exchanges.map((exchange, index) => {
      if (index === 0) {
        return exchange.response;
      }
      return exchange.response;
    }).join('\n\n');
  }, [exchanges]);

  // Initialize edited summary on first render
  useState(() => {
    setEditedSummary(generatedSummary);
  });

  const handleSave = () => {
    const photoFiles = photos.map(p => p.file);
    const contactIds = taggedContacts.map(c => c.id);
    onSave(
      isEditing ? editedSummary : generatedSummary, 
      photoFiles.length > 0 ? photoFiles : undefined,
      contactIds.length > 0 ? contactIds : undefined
    );
  };

  const toggleExchange = (index: number) => {
    setExpandedExchanges(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const typeLabel = TYPE_LABELS[promptType] || 'Memory';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="review-screen"
    >
      {/* Header */}
      <div className="review-header">
        <div className="review-header-icon">
          <Sparkles size={24} />
        </div>
        <div>
          <h2 className="review-title">Review Your Story</h2>
          <p className="review-subtitle">
            {typeLabel} • {exchanges.length} {exchanges.length === 1 ? 'exchange' : 'exchanges'}
          </p>
        </div>
      </div>

      {/* Main content */}
      <div className="review-content">
        {/* Summary/Edit view */}
        <div className="review-summary-section">
          <div className="review-summary-header">
            <h3>Your Complete Story</h3>
            <button
              onClick={() => {
                if (isEditing) {
                  setIsEditing(false);
                } else {
                  setEditedSummary(generatedSummary);
                  setIsEditing(true);
                }
              }}
              className="review-edit-btn"
            >
              {isEditing ? (
                <>
                  <Check size={14} />
                  Done Editing
                </>
              ) : (
                <>
                  <Edit2 size={14} />
                  Edit
                </>
              )}
            </button>
          </div>

          {isEditing ? (
            <textarea
              value={editedSummary}
              onChange={(e) => setEditedSummary(e.target.value)}
              className="review-textarea"
              rows={8}
              aria-label="Edit your story"
            />
          ) : (
            <div className="review-summary-text">
              {generatedSummary.split('\n\n').map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          )}
        </div>

        {/* Exchange breakdown */}
        <div className="review-exchanges">
          <h3 className="review-exchanges-title">Conversation Details</h3>
          {exchanges.map((exchange, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="review-exchange-item"
            >
              <button
                onClick={() => toggleExchange(index)}
                className="review-exchange-header"
              >
                <span>Question {index + 1}</span>
                {expandedExchanges.includes(index) ? (
                  <ChevronUp size={16} />
                ) : (
                  <ChevronDown size={16} />
                )}
              </button>
              
              {expandedExchanges.includes(index) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="review-exchange-content"
                >
                  <p className="review-exchange-question">
                    <strong>Q:</strong> {exchange.question}
                  </p>
                  <p className="review-exchange-answer">
                    <strong>A:</strong> {exchange.response}
                  </p>
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Tag People Section */}
      <div className="review-tag-people">
        <div className="review-section-header">
          <Users size={16} className="text-[#2D5A3D]" />
          <span>Tag People</span>
        </div>
        <p className="review-section-hint">Tag contacts who appear in this memory</p>
        
        {/* Tagged contacts */}
        {taggedContacts.length > 0 && (
          <div className="review-tagged-contacts">
            {taggedContacts.map(contact => (
              <div key={contact.id} className="review-tagged-contact">
                <div className="review-tagged-avatar">
                  {contact.avatar_url ? (
                    <img src={contact.avatar_url}
                alt="" />
                  ) : (
                    <span>{contact.full_name.charAt(0)}</span>
                  )}
                </div>
                <span className="review-tagged-name">{contact.full_name}</span>
                <button 
                  onClick={() => removeContact(contact.id)}
                  className="review-tagged-remove"
                  aria-label={`Remove ${contact.full_name}`}
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Search input */}
        <div className="review-contact-search" ref={dropdownRef}>
          <div className="review-search-input-wrapper">
            <Search size={16} className="review-search-icon" />
            <input
              ref={searchInputRef}
              type="text"
              value={contactSearch}
              onChange={(e) => {
                setContactSearch(e.target.value);
                setShowContactDropdown(true);
              }}
              onFocus={() => setShowContactDropdown(true)}
              aria-label="Search" placeholder="Search contacts to tag..."
              className="review-search-input"
            />
            {loadingContacts && (
              <div className="review-search-loading">
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  <Sparkles size={14} />
                </motion.span>
              </div>
            )}
          </div>

          {/* Dropdown */}
          <AnimatePresence>
            {showContactDropdown && searchResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="review-contact-dropdown"
              >
                {searchResults.map(contact => (
                  <button
                    key={contact.id}
                    onClick={() => addContact(contact)}
                    className="review-contact-option"
                  >
                    <div className="review-contact-option-avatar">
                      {contact.avatar_url ? (
                        <img src={contact.avatar_url}
                alt="" />
                      ) : (
                        <span>{contact.full_name.charAt(0)}</span>
                      )}
                    </div>
                    <div className="review-contact-option-info">
                      <span className="review-contact-option-name">{contact.full_name}</span>
                      {contact.relationship_type && (
                        <span className="review-contact-option-relation">{contact.relationship_type}</span>
                      )}
                    </div>
                    <UserPlus size={14} className="review-contact-option-add" />
                  </button>
                ))}
              </motion.div>
            )}

            {showContactDropdown && contactSearch && searchResults.length === 0 && !loadingContacts && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="review-contact-dropdown review-contact-dropdown-empty"
              >
                <p>No contacts found for "{contactSearch}"</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Optional Photo Upload */}
      <div className="review-photos">
        <div className="review-section-header">
          <Image size={16} className="text-[#2D5A3D]" />
          <span>Add Photos (Optional)</span>
        </div>
        <p className="review-section-hint">Add up to 5 photos to accompany this memory</p>
        
        <div className="review-photos-grid">
          {photos.map((photo, index) => (
            <div key={index} className="review-photo-item">
              
<img src={photo.preview} alt="" />
              <button 
                onClick={() => removePhoto(index)}
                className="review-photo-remove"
              >
                <X size={14} />
              </button>
            </div>
          ))}
          
          {photos.length < 5 && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="review-photo-add"
            >
              <Plus size={20} />
              <span>Add</span>
            </button>
          )}
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handlePhotoSelect}
          className="hidden"
        />
      </div>

      {/* Tags section */}
      <div className="review-tags">
        <span className="review-tags-label">Tags:</span>
        <div className="review-tags-list">
          <span className="review-tag">{typeLabel}</span>
          <span className="review-tag">Voice Memory</span>
          {customTags.map((tag, idx) => (
            <span key={idx} className="review-tag review-tag-custom">
              {tag}
              <button 
                onClick={() => setCustomTags(prev => prev.filter((_, i) => i !== idx))}
                className="review-tag-remove"
              >
                <X size={12} />
              </button>
            </span>
          ))}
          <div className="review-tag-input-wrapper">
            <input
              type="text"
              placeholder="Add tag..."
              value={newTagInput}
              onChange={(e) => setNewTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newTagInput.trim()) {
                  e.preventDefault();
                  setCustomTags(prev => [...prev, newTagInput.trim()]);
                  setNewTagInput('');
                }
              }}
              className="review-tag-input"
            />
            {newTagInput.trim() && (
              <button
                onClick={() => {
                  setCustomTags(prev => [...prev, newTagInput.trim()]);
                  setNewTagInput('');
                }}
                className="review-tag-add-btn"
              >
                <Plus size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="review-actions">
        <button
          onClick={onDiscard}
          disabled={isSaving}
          className="review-btn review-btn-discard"
        >
          <Trash2 size={16} />
          Discard
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="review-btn review-btn-save"
        >
          {isSaving ? (
            <>
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <Sparkles size={16} />
              </motion.span>
              Saving...
            </>
          ) : (
            <>
              <Save size={16} />
              Save Memory
              <span className="review-xp-badge">+{expectedXp} XP</span>
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}
