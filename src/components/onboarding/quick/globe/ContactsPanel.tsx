import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { GoogleContactsImport } from '@/components/contacts';
import { titleCaseName } from '../helpers';

export const RELATIONSHIP_OPTIONS = [
  { category: 'Family', options: ['Mother', 'Father', 'Spouse', 'Partner', 'Son', 'Daughter', 'Brother', 'Sister', 'Grandmother', 'Grandfather', 'Grandson', 'Granddaughter', 'Aunt', 'Uncle', 'Cousin', 'Niece', 'Nephew', 'In-Law'] },
  { category: 'Friends', options: ['Best Friend', 'Close Friend', 'Friend', 'Childhood Friend'] },
  { category: 'Professional', options: ['Colleague', 'Boss', 'Mentor', 'Business Partner'] },
  { category: 'Other', options: ['Neighbor', 'Other'] },
];

export interface ContactEntry {
  name: string;
  relationship: string;
}

export interface ContactsPanelProps {
  contactEntries: ContactEntry[];
  setContactEntries: React.Dispatch<React.SetStateAction<ContactEntry[]>>;
  setGoogleImportedNames: React.Dispatch<React.SetStateAction<Set<string>>>;
  contactName: string;
  setContactName: React.Dispatch<React.SetStateAction<string>>;
  contactRelation: string;
  setContactRelation: React.Dispatch<React.SetStateAction<string>>;
  onContinue: () => void | Promise<void>;
  onBack?: () => void;
}

export function ContactsPanel({
  contactEntries,
  setContactEntries,
  setGoogleImportedNames,
  contactName,
  setContactName,
  contactRelation,
  setContactRelation,
  onContinue,
  onBack,
}: ContactsPanelProps) {
  return (
    <motion.div
      key="contacts-panel"
      className="globe-floating-panel globe-floating-right globe-panel-wide"
      initial={{ x: '120%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '120%', opacity: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 28 }}
    >
      <div className="globe-side-panel-header">
        <h3>Family, Friends & Loved Ones</h3>
        <p>The people you shared life with are part of what makes those moments live on. Add the people who matter most.</p>
      </div>
      <div className="globe-side-panel-items" style={{ gap: '0', padding: '8px 16px', overflowY: 'auto' }}>
        {/* Google import — quickly bring in contacts you already have */}
        <div className="contact-google-import-row">
          <GoogleContactsImport
            onImportComplete={async () => {
              try {
                const { createClient } = await import('@/lib/supabase/client');
                const supabase = createClient();
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;
                const { data } = await supabase
                  .from('contacts')
                  .select('full_name, relationship_type')
                  .eq('user_id', user.id);
                if (!data) return;
                // Merge any names not already in contactEntries
                setContactEntries(prev => {
                  const existing = new Set(prev.map(e => e.name));
                  const additions = data
                    .filter(row => row.full_name && !existing.has(row.full_name))
                    .map(row => ({
                      name: row.full_name as string,
                      relationship: ((row.relationship_type as string) || 'other')
                        .replace(/_/g, ' ')
                        .replace(/\b\w/g, c => c.toUpperCase()),
                    }));
                  return [...prev, ...additions];
                });
                setGoogleImportedNames(prev => {
                  const next = new Set(prev);
                  data.forEach(row => { if (row.full_name) next.add(row.full_name as string); });
                  return next;
                });
              } catch (err) {
                console.error('Failed to merge Google-imported contacts:', err);
              }
            }}
          />
          <span className="contact-google-import-hint">or add people manually below</span>
        </div>

        {/* Existing contact rows */}
        {contactEntries.map((entry, i) => (
          <div key={i} className="contact-entry-row">
            <div className="contact-entry-info">
              <span className="contact-entry-name">{entry.name}</span>
              <span className="contact-entry-relation">{entry.relationship}</span>
            </div>
            <button
              className="contact-entry-remove"
              onClick={() => setContactEntries(prev => prev.filter((_, idx) => idx !== i))}
            >×</button>
          </div>
        ))}

        {/* Add new person row */}
        <div className="contact-add-row">
          <input
            type="text"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && contactName.trim() && contactRelation) {
                setContactEntries(prev => [...prev, { name: titleCaseName(contactName.trim()), relationship: contactRelation }]);
                setContactName('');
                setContactRelation('');
              }
            }}
            placeholder="Name"
            className="contact-add-input contact-add-name"
          />
          <select
            value={contactRelation}
            onChange={(e) => setContactRelation(e.target.value)}
            className="contact-add-input contact-add-select"
          >
            <option value="">Relation</option>
            {RELATIONSHIP_OPTIONS.map(cat => (
              <optgroup key={cat.category} label={cat.category}>
                {cat.options.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </optgroup>
            ))}
          </select>
          <button
            className="contact-add-btn"
            disabled={!contactName.trim() || !contactRelation}
            onClick={() => {
              if (contactName.trim() && contactRelation) {
                setContactEntries(prev => [...prev, { name: titleCaseName(contactName.trim()), relationship: contactRelation }]);
                setContactName('');
                setContactRelation('');
              }
            }}
          >
            +
          </button>
        </div>
      </div>
      <div className="globe-side-panel-footer">
        {onBack && (
          <button type="button" onClick={onBack} className="globe-back-btn" aria-label="Back">
            ‹ Back
          </button>
        )}
        <button
          className="globe-continue-btn"
          onClick={async () => { await onContinue(); }}
        >
          {contactEntries.length > 0 ? 'Continue' : 'Skip'} <ChevronRight size={18} />
        </button>
      </div>
    </motion.div>
  );
}
