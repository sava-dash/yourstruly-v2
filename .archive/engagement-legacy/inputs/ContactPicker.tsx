'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Plus, Check } from 'lucide-react';
import { useContacts } from '@/hooks/useContacts';

interface ContactPickerProps {
  suggestedContactId?: string;
  suggestedContactName?: string;
  onSelect: (contactId: string) => void;
  disabled?: boolean;
}

export function ContactPicker({
  suggestedContactId,
  suggestedContactName,
  onSelect,
  disabled = false,
}: ContactPickerProps) {
  const [search, setSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { contacts, isLoading } = useContacts();

  // Filter contacts based on search
  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(search.toLowerCase())
  );

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        !inputRef.current?.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (contactId: string) => {
    setSelectedId(contactId);
    setShowDropdown(false);
    onSelect(contactId);
  };

  const handleSuggestionAccept = () => {
    if (suggestedContactId) {
      handleSelect(suggestedContactId);
    }
  };

  return (
    <div className="contact-picker">
      {/* Suggestion banner */}
      {suggestedContactId && suggestedContactName && !selectedId && (
        <div className="suggestion">
          <span>Is this <strong>{suggestedContactName}</strong>?</span>
          <div className="suggestion-actions">
            <button 
              className="yes-btn"
              onClick={handleSuggestionAccept}
              disabled={disabled}
            >
              <Check size={16} />
              Yes
            </button>
            <button 
              className="no-btn"
              onClick={() => inputRef.current?.focus()}
            >
              No, search
            </button>
          </div>
        </div>
      )}

      {/* Search input */}
      <div className="search-wrapper">
        <Search size={18} className="search-icon" />
        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          aria-label="Search" placeholder="Search contacts..."
          disabled={disabled}
        />
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div ref={dropdownRef} className="dropdown">
          {isLoading ? (
            <div className="loading">Loading contacts...</div>
          ) : filteredContacts.length > 0 ? (
            <ul className="contact-list">
              {filteredContacts.map(contact => (
                <li key={contact.id}>
                  <button
                    className={`contact-option ${selectedId === contact.id ? 'selected' : ''}`}
                    onClick={() => handleSelect(contact.id)}
                  >
                    {contact.photoUrl ? (
                      <img 
                        src={contact.photoUrl} 
                        alt={contact.name}
                        className="avatar"
                      />
                    ) : (
                      <div className="avatar-placeholder">
                        {contact.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="contact-info">
                      <span className="name">{contact.name}</span>
                      {contact.relationshipType && (
                        <span className="relationship">{contact.relationshipType}</span>
                      )}
                    </div>
                    {selectedId === contact.id && (
                      <Check size={16} className="check" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="no-results">
              <p>No contacts found</p>
              <button className="add-btn">
                <Plus size={16} />
                Add "{search}" as new contact
              </button>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .contact-picker {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .suggestion {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 12px;
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.3);
          border-radius: 12px;
        }

        .suggestion span {
          font-size: 14px;
          color: white;
        }

        .suggestion-actions {
          display: flex;
          gap: 8px;
        }

        .yes-btn,
        .no-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border: none;
          border-radius: 8px;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .yes-btn {
          background: #10b981;
          color: white;
        }

        .yes-btn:hover:not(:disabled) {
          background: #059669;
        }

        .no-btn {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }

        .no-btn:hover {
          background: rgba(255, 255, 255, 0.15);
        }

        .search-wrapper {
          position: relative;
        }

        .search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: rgba(255, 255, 255, 0.4);
        }

        input {
          width: 100%;
          padding: 12px 12px 12px 42px;
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          color: white;
          font-size: 14px;
        }

        input::placeholder {
          color: rgba(255, 255, 255, 0.4);
        }

        input:focus {
          outline: none;
          border-color: rgba(255, 255, 255, 0.4);
        }

        .dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          margin-top: 4px;
          max-height: 240px;
          overflow-y: auto;
          background: rgba(30, 30, 40, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 12px;
          backdrop-filter: blur(12px);
          z-index: 50;
        }

        .loading,
        .no-results {
          padding: 16px;
          text-align: center;
          color: rgba(255, 255, 255, 0.6);
          font-size: 14px;
        }

        .no-results p {
          margin: 0 0 12px;
        }

        .add-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          color: white;
          font-size: 13px;
          cursor: pointer;
        }

        .contact-list {
          list-style: none;
          margin: 0;
          padding: 4px;
        }

        .contact-option {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 10px 12px;
          background: transparent;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.15s;
        }

        .contact-option:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .contact-option.selected {
          background: rgba(111, 111, 210, 0.2);
        }

        .avatar,
        .avatar-placeholder {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .avatar {
          object-fit: cover;
        }

        .avatar-placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          background: #6f6fd2;
          color: white;
          font-weight: 600;
          font-size: 14px;
        }

        .contact-info {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          flex: 1;
          min-width: 0;
        }

        .name {
          font-size: 14px;
          font-weight: 500;
          color: white;
        }

        .relationship {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.5);
          text-transform: capitalize;
        }

        .check {
          color: #10b981;
          flex-shrink: 0;
        }
      `}</style>
    </div>
  );
}
