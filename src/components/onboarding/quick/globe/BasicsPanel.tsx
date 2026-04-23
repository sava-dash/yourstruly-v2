'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, MapPin } from 'lucide-react';
import { MONTHS } from '../constants';

interface BasicsPanelProps {
  name: string;
  birthday: string;                       // YYYY-MM-DD
  setBirthday: (v: string) => void;
  location: string;
  setLocation: (v: string) => void;
  onContinue: () => void;
}

export function BasicsPanel({
  name,
  birthday,
  setBirthday,
  location,
  setLocation,
  onContinue,
}: BasicsPanelProps) {
  const [month, setMonth] = useState(() => {
    if (birthday) { const m = parseInt(birthday.split('-')[1], 10); return m > 0 ? MONTHS[m - 1] : ''; }
    return '';
  });
  const [day, setDay] = useState(() => {
    if (birthday) { const d = parseInt(birthday.split('-')[2], 10); return d > 0 ? String(d) : ''; }
    return '';
  });
  const [year, setYear] = useState(() => {
    if (birthday) { const y = birthday.split('-')[0]; return y !== '0000' ? y : ''; }
    return '';
  });

  const dayRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);

  // Push composed birthday up whenever parts are complete
  useEffect(() => {
    const mIdx = MONTHS.indexOf(month);
    if (mIdx >= 0 && day && year && year.length === 4) {
      const mm = String(mIdx + 1).padStart(2, '0');
      const dd = String(parseInt(day, 10)).padStart(2, '0');
      setBirthday(`${year}-${mm}-${dd}`);
    }
  }, [month, day, year]); // eslint-disable-line react-hooks/exhaustive-deps

  // Location autocomplete
  const [suggestions, setSuggestions] = useState<{ place_name: string; id: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (!query || query.length < 2) { setSuggestions([]); return; }
    try {
      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${token}&types=address,place,locality,region,country&limit=5`;
      const res = await fetch(url);
      const data = await res.json();
      const features: { place_name: string; id: string }[] = data.features ?? [];
      if (features.length > 0) {
        setSuggestions(features.map((f) => ({ place_name: f.place_name, id: f.id })));
        setShowSuggestions(true);
      }
    } catch { /* ignore */ }
  }, []);

  const handleLocationInput = (val: string) => {
    setLocation(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 300);
  };

  const hasBirthday = month && day && year && year.length === 4;
  const hasLocation = location.trim().length > 0;
  const canProceed = !!(hasBirthday && hasLocation);

  return (
    <motion.div
      key="basics-bottom"
      className="globe-bottom-panel"
      initial={{ opacity: 0, y: 80 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 80 }}
      transition={{ type: 'spring', stiffness: 200, damping: 24 }}
    >
      <div className="globe-welcome-card">
        <div className="globe-welcome-bar" />
        <div className="globe-welcome-body">
          <p className="globe-welcome-greeting">Two quick things</p>
          <h2 className="globe-welcome-headline" style={{ fontSize: '20px' }}>
            {name ? `Hi ${name}. ` : ''}When were you born, and where?
          </h2>

          <label className="basics-label">Birthday</label>
          <div className="basics-row">
            <select
              className="basics-select"
              value={month}
              onChange={(e) => {
                setMonth(e.target.value);
                if (e.target.value) setTimeout(() => dayRef.current?.focus(), 0);
              }}
            >
              <option value="">Month</option>
              {MONTHS.map((m) => (<option key={m} value={m}>{m}</option>))}
            </select>
            <input
              ref={dayRef}
              className="basics-input basics-day"
              type="text"
              inputMode="numeric"
              placeholder="Day"
              value={day}
              onChange={(e) => {
                const num = e.target.value.replace(/\D/g, '').slice(0, 2);
                setDay(num);
                if (num.length === 2) setTimeout(() => yearRef.current?.focus(), 0);
              }}
            />
            <input
              ref={yearRef}
              className="basics-input basics-year"
              type="text"
              inputMode="numeric"
              placeholder="Year"
              value={year}
              onChange={(e) => setYear(e.target.value.replace(/\D/g, '').slice(0, 4))}
            />
          </div>

          <label className="basics-label">Birthplace</label>
          <div className="basics-location-wrap">
            <input
              className="basics-input basics-location"
              type="text"
              value={location}
              onChange={(e) => handleLocationInput(e.target.value)}
              placeholder="e.g. Brooklyn, NY"
              autoComplete="off"
              onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className="basics-suggestions">
                {suggestions.map((s) => (
                  <button
                    key={s.id}
                    className="basics-suggestion"
                    onMouseDown={() => {
                      setLocation(s.place_name);
                      setSuggestions([]);
                      setShowSuggestions(false);
                    }}
                  >
                    <MapPin size={14} />
                    <span>{s.place_name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ padding: '0 24px 20px' }}>
          <button
            className="globe-continue-btn"
            disabled={!canProceed}
            style={{ opacity: canProceed ? 1 : 0.4, margin: 0, width: '100%' }}
            onClick={onContinue}
          >
            Drop the pin <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <style jsx>{`
        .basics-label {
          display: block;
          text-align: left;
          font-size: 12px;
          font-weight: 600;
          color: rgba(45, 45, 45, 0.55);
          margin: 14px 0 6px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .basics-row {
          display: flex;
          gap: 8px;
        }
        .basics-select,
        .basics-input {
          padding: 12px 14px;
          border-radius: 12px;
          border: 1.5px solid rgba(0,0,0,0.1);
          background: rgba(0,0,0,0.02);
          font-size: 15px;
          color: #2d2d2d;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .basics-select { flex: 1.5; min-width: 0; appearance: none; -webkit-appearance: none; cursor: pointer; }
        .basics-input { flex: 1; min-width: 0; text-align: center; }
        .basics-day { width: 70px; flex: none; }
        .basics-year { width: 80px; flex: none; }
        .basics-location { width: 100%; text-align: left; box-sizing: border-box; }
        .basics-select:focus,
        .basics-input:focus {
          border-color: #2D5A3D;
          box-shadow: 0 0 0 3px rgba(64,106,86,0.1);
        }
        .basics-location-wrap { position: relative; }
        .basics-suggestions {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          margin-top: 4px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.15);
          border: 1px solid rgba(0,0,0,0.06);
          z-index: 30;
          overflow: hidden;
        }
        .basics-suggestion {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          padding: 10px 16px;
          border: none;
          background: white;
          color: #2d2d2d;
          font-size: 14px;
          text-align: left;
          cursor: pointer;
        }
        .basics-suggestion:hover {
          background: rgba(64,106,86,0.06);
          color: #2D5A3D;
        }
        .basics-suggestion + .basics-suggestion {
          border-top: 1px solid rgba(0,0,0,0.04);
        }
      `}</style>
    </motion.div>
  );
}
