import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
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
        <h3>People who matter</h3>
        <p>Add a few family members or friends. You can skip this.</p>
      </div>
      <div className="globe-side-panel-items" style={{ gap: '0', padding: '8px 16px', overflowY: 'auto' }}>
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
      {(contactName.trim() || contactRelation) && (
        <p className="yt-unadded-hint" role="status">
          Tap <strong>+</strong> to keep {contactName.trim() ? `"${contactName.trim()}"` : 'this person'} — otherwise they won&apos;t be saved.
        </p>
      )}
      <div className="globe-side-panel-footer">
        {onBack && (
          <button type="button" onClick={onBack} className="globe-back-btn" aria-label="Back">
            ‹ Back
          </button>
        )}
        <button
          className="globe-continue-btn"
          disabled={!!(contactName.trim() || contactRelation)}
          style={{
            opacity: (contactName.trim() || contactRelation) ? 0.5 : 1,
            cursor: (contactName.trim() || contactRelation) ? 'not-allowed' : 'pointer',
          }}
          onClick={async () => {
            if (contactName.trim() || contactRelation) return;
            await onContinue();
          }}
        >
          {contactEntries.length > 0 ? 'Continue' : 'Skip for now'} <ChevronRight size={18} />
        </button>
      </div>
      <style jsx>{`
        .yt-unadded-hint {
          margin: 0;
          padding: 6px 16px 0;
          font-size: 12px;
          line-height: 1.4;
          color: rgba(184, 86, 46, 0.85);
          text-align: center;
        }
        .yt-unadded-hint strong { color: #B8562E; }
      `}</style>
    </motion.div>
  );
}
