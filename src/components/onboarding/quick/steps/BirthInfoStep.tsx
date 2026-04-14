import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, MapPin } from 'lucide-react';
import { MONTHS } from '../constants';
import { SHARED } from '../shared-styles';

// ============================================
// STEP: BIRTH INFO (Birthday + Birthplace combined)
// ============================================

export function BirthInfoStep({
  name,
  birthday,
  location,
  onBirthdayChange,
  onLocationChange,
  onContinue,
}: {
  name: string;
  birthday: string;
  location: string;
  onBirthdayChange: (v: string) => void;
  onLocationChange: (v: string) => void;
  onContinue: () => void;
}) {
  // Parse existing birthday (YYYY-MM-DD) into parts
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

  // Location autocomplete state
  const [locationInput, setLocationInput] = useState(location);
  const [suggestions, setSuggestions] = useState<{ place_name: string; id: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync birthday parts to parent as YYYY-MM-DD
  useEffect(() => {
    const mIdx = MONTHS.indexOf(month);
    if (mIdx >= 0 && day && year && year.length === 4) {
      const mm = String(mIdx + 1).padStart(2, '0');
      const dd = String(parseInt(day, 10)).padStart(2, '0');
      onBirthdayChange(`${year}-${mm}-${dd}`);
    }
  }, [month, day, year]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleMonthChange = (val: string) => {
    setMonth(val);
    if (val) setTimeout(() => dayRef.current?.focus(), 0);
  };

  const handleDayChange = (val: string) => {
    const num = val.replace(/\D/g, '').slice(0, 2);
    setDay(num);
    if (num.length === 2) setTimeout(() => yearRef.current?.focus(), 0);
  };

  const handleYearChange = (val: string) => {
    setYear(val.replace(/\D/g, '').slice(0, 4));
  };

  // Mapbox autocomplete
  const fetchSuggestions = useCallback(async (query: string) => {
    if (!query || query.length < 2) { setSuggestions([]); return; }
    try {
      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${token}&types=address,place,locality,region,country&limit=5`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.features) {
        setSuggestions(data.features.map((f: any) => ({ place_name: f.place_name, id: f.id })));
        setShowSuggestions(true);
      }
    } catch { /* ignore */ }
  }, []);

  const handleLocationInput = (val: string) => {
    setLocationInput(val);
    onLocationChange(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 300);
  };

  const selectSuggestion = (placeName: string) => {
    setLocationInput(placeName);
    onLocationChange(placeName);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const hasBirthday = month && day && year && year.length === 4;
  const hasLocation = locationInput.trim().length > 0;
  const canProceed = hasBirthday && hasLocation;

  return (
    <div className="step-card">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '28px' }}>📍</span>
          Where did your story begin{name ? `, ${name}` : ''}?
        </h2>
        <p className="subtitle">Your birthday and birthplace help us personalize your journey.</p>
      </motion.div>

      {/* Birthday section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <label className="field-label">Birthday</label>
        <div className="birthday-row">
          <select
            className="bday-select"
            value={month}
            onChange={(e) => handleMonthChange(e.target.value)}
          >
            <option value="">Month</option>
            {MONTHS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <input
            ref={dayRef}
            className="bday-input bday-day"
            type="text"
            inputMode="numeric"
            placeholder="Day"
            value={day}
            onChange={(e) => handleDayChange(e.target.value)}
          />
          <input
            ref={yearRef}
            className="bday-input bday-year"
            type="text"
            inputMode="numeric"
            placeholder="Year"
            value={year}
            onChange={(e) => handleYearChange(e.target.value)}
          />
        </div>
      </motion.div>

      {/* Birthplace section */}
      <motion.div
        className="location-section"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <label className="field-label">Birthplace</label>
        <div className="location-wrap">
          <input
            className="yt-input location-input"
            type="text"
            value={locationInput}
            onChange={(e) => handleLocationInput(e.target.value)}
            placeholder="e.g. Brooklyn, NY"
            autoComplete="off"
            onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          />
          {showSuggestions && suggestions.length > 0 && (
            <div className="suggestions-dropdown">
              {suggestions.map((s) => (
                <button
                  key={s.id}
                  className="suggestion-item"
                  onMouseDown={() => selectSuggestion(s.place_name)}
                >
                  <MapPin size={14} />
                  <span>{s.place_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <button
          className="primary-btn full-width"
          onClick={onContinue}
          disabled={!canProceed}
        >
          Next <ChevronRight size={18} />
        </button>
      </motion.div>

      <style jsx>{`
        ${SHARED}
        .step-card { text-align: center; }
        .step-icon { font-size: 40px; margin-bottom: 20px; display: block; }
        .full-width { width: 100%; }
        .field-label {
          display: block;
          text-align: left;
          font-size: 13px;
          font-weight: 600;
          color: rgba(45, 45, 45, 0.6);
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .birthday-row {
          display: flex;
          gap: 8px;
          margin-bottom: 20px;
          max-width: 100%;
        }
        .bday-select {
          flex: 1.5;
          min-width: 0;
          padding: 14px 12px;
          background: white;
          border: 1.5px solid rgba(64, 106, 86, 0.18);
          border-radius: 12px;
          color: #2d2d2d;
          font-size: 15px;
          appearance: none;
          -webkit-appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 8px center;
          cursor: pointer;
          transition: border-color 0.2s;
        }
        .bday-select:focus {
          outline: none;
          border-color: #2D5A3D;
          box-shadow: 0 0 0 3px rgba(64, 106, 86, 0.1);
        }
        .bday-input {
          flex: 1;
          min-width: 0;
          padding: 14px 8px;
          background: white;
          border: 1.5px solid rgba(64, 106, 86, 0.18);
          border-radius: 12px;
          color: #2d2d2d;
          font-size: 15px;
          text-align: center;
          transition: border-color 0.2s;
        }
        .bday-input::placeholder { color: rgba(45, 45, 45, 0.3); }
        .bday-input:focus {
          outline: none;
          border-color: #2D5A3D;
          box-shadow: 0 0 0 3px rgba(64, 106, 86, 0.1);
        }
        .bday-day { width: 70px; flex: none; }
        .bday-year { width: 80px; flex: none; }
        .location-section { margin-bottom: 20px; }
        .location-wrap { position: relative; }
        .location-input { margin-bottom: 0; }
        .suggestions-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          margin-top: 4px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
          border: 1px solid rgba(64, 106, 86, 0.12);
          z-index: 20;
          overflow: hidden;
        }
        .suggestion-item {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 12px 16px;
          background: white;
          border: none;
          color: #2d2d2d;
          font-size: 14px;
          text-align: left;
          cursor: pointer;
          transition: background 0.15s;
        }
        .suggestion-item:hover {
          background: rgba(64, 106, 86, 0.08);
          color: #2D5A3D;
        }
        .suggestion-item + .suggestion-item {
          border-top: 1px solid rgba(64, 106, 86, 0.06);
        }
      `}</style>
    </div>
  );
}
