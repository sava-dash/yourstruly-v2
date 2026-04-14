import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, MapPin } from 'lucide-react';

export interface PlaceAdded {
  city: string;
  lat: number;
  lng: number;
  when: string;
}

export interface PlaceSuggestion {
  place_name: string;
  center: [number, number];
}

export interface PlacesLivedPanelProps {
  phase: 'places-lived' | 'places-flying' | string;
  placeInput: string;
  setPlaceInput: React.Dispatch<React.SetStateAction<string>>;
  placeWhen: string;
  setPlaceWhen: React.Dispatch<React.SetStateAction<string>>;
  placeSuggestions: PlaceSuggestion[];
  setPlaceSuggestions: React.Dispatch<React.SetStateAction<PlaceSuggestion[]>>;
  placesAdded: PlaceAdded[];
  onPlaceInputChange: (val: string) => void;
  onAddPlace: (cityName: string, coords?: [number, number]) => void | Promise<void>;
  onSpinOutAndContinue: () => void | Promise<void>;
  onBack?: () => void;
}

export function PlacesLivedPanel({
  phase,
  placeInput,
  setPlaceInput,
  placeWhen,
  setPlaceWhen,
  placeSuggestions,
  setPlaceSuggestions,
  placesAdded,
  onPlaceInputChange,
  onAddPlace,
  onSpinOutAndContinue,
  onBack,
}: PlacesLivedPanelProps) {
  return (
    <motion.div
      key="places-lived-bottom"
      className="globe-bottom-panel"
      initial={{ opacity: 0, y: 80 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 80 }}
      transition={{ type: 'spring', stiffness: 200, damping: 24 }}
    >
      <div className="globe-welcome-card">
        <div className="globe-welcome-bar" />
        <div className="globe-welcome-body">
          <p className="globe-welcome-greeting">Your life journey 🌍</p>
          <h2 className="globe-welcome-headline" style={{ fontSize: '20px' }}>
            {placesAdded.length === 0
              ? 'Have you lived anywhere else?'
              : 'Anywhere else?'}
          </h2>

          {/* Location input with autocomplete */}
          <div style={{ marginTop: '12px', position: 'relative' }}>
            <input
              type="text"
              value={placeInput}
              onChange={(e) => onPlaceInputChange(e.target.value)}
              placeholder="City or town name..."
              disabled={phase === 'places-flying'}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '12px',
                border: '1.5px solid rgba(0,0,0,0.1)',
                background: 'rgba(0,0,0,0.02)',
                fontSize: '15px',
                color: '#2d2d2d',
                outline: 'none',
              }}
              onFocus={(e) => { e.target.style.borderColor = '#2D5A3D'; }}
              onBlur={(e) => { e.target.style.borderColor = 'rgba(0,0,0,0.1)'; }}
            />
            {/* Suggestions dropdown */}
            {placeSuggestions.length > 0 && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                marginTop: '4px',
                background: 'white',
                borderRadius: '12px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                border: '1px solid rgba(0,0,0,0.06)',
                zIndex: 30,
                overflow: 'hidden',
              }}>
                {placeSuggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setPlaceInput(s.place_name);
                      setPlaceSuggestions([]);
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 16px',
                      border: 'none',
                      background: 'none',
                      textAlign: 'left',
                      fontSize: '14px',
                      color: '#2d2d2d',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(64,106,86,0.06)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
                  >
                    <MapPin size={14} color="#2D5A3D" />
                    {s.place_name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* When field */}
          <input
            type="text"
            value={placeWhen}
            onChange={(e) => setPlaceWhen(e.target.value)}
            placeholder="When did you move there? (e.g. Summer 2015)"
            disabled={phase === 'places-flying'}
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: '12px',
              border: '1.5px solid rgba(0,0,0,0.1)',
              background: 'rgba(0,0,0,0.02)',
              fontSize: '15px',
              color: '#2d2d2d',
              outline: 'none',
              marginTop: '8px',
            }}
            onFocus={(e) => { e.target.style.borderColor = '#2D5A3D'; }}
            onBlur={(e) => { e.target.style.borderColor = 'rgba(0,0,0,0.1)'; }}
          />

          {/* Added places count */}
          {placesAdded.length > 0 && (
            <p style={{ fontSize: '13px', color: 'rgba(45,45,45,0.5)', marginTop: '8px' }}>
              📍 {placesAdded.length} place{placesAdded.length !== 1 ? 's' : ''} added
            </p>
          )}
        </div>

        {/* Buttons */}
        <div style={{ padding: '0 24px 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {phase === 'places-flying' ? (
            <div className="globe-continue-btn" style={{ opacity: 0.7, justifyContent: 'center' }}>
              <div className="loading-dot" style={{ width: 16, height: 16 }} /> Flying there...
            </div>
          ) : (
            <>
              <button
                className="globe-continue-btn"
                disabled={!placeInput.trim()}
                style={{ opacity: placeInput.trim() ? 1 : 0.4, margin: 0, width: '100%' }}
                onClick={() => {
                  const match = placeSuggestions.find(s => s.place_name === placeInput);
                  onAddPlace(placeInput, match?.center);
                }}
              >
                {placesAdded.length === 0 ? 'Add Place' : 'Add Another'} <ChevronRight size={18} />
              </button>
              <button
                onClick={onSpinOutAndContinue}
                style={{
                  padding: '12px',
                  border: 'none',
                  background: 'none',
                  color: placesAdded.length > 0 ? '#2D5A3D' : 'rgba(45,45,45,0.5)',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                {placesAdded.length > 0 ? "I'm done" : 'Skip'}
              </button>
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  style={{
                    padding: '6px',
                    border: 'none',
                    background: 'none',
                    color: 'rgba(45,45,45,0.45)',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    textAlign: 'center',
                  }}
                  aria-label="Back"
                >
                  ‹ Back
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
