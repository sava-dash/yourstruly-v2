'use client';

import { useState } from 'react';
import { Calendar, Check } from 'lucide-react';

interface DatePickerProps {
  onSelect: (date: string) => void;
  disabled?: boolean;
  label?: string;
}

export function DatePicker({
  onSelect,
  disabled = false,
  label = 'Select date',
}: DatePickerProps) {
  const [date, setDate] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);

  const handleSubmit = () => {
    if (date) {
      onSelect(date);
    }
  };

  // Generate year options (last 100 years)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => currentYear - i);
  
  // Months
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="date-picker">
      <label className="label">{label}</label>
      
      <div className="input-wrapper">
        <Calendar size={18} className="calendar-icon" />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          disabled={disabled}
          max={new Date().toISOString().split('T')[0]} // Can't be in future
        />
      </div>

      {/* Quick select for common dates */}
      <div className="quick-select">
        <span className="quick-label">or select:</span>
        <div className="quick-buttons">
          <button onClick={() => {
            const d = new Date();
            d.setMonth(0, 1); // January 1st
            setDate(d.toISOString().split('T')[0]);
          }}>
            Jan 1
          </button>
          <button onClick={() => {
            const d = new Date();
            d.setMonth(d.getMonth(), 1); // First of current month
            setDate(d.toISOString().split('T')[0]);
          }}>
            Start of month
          </button>
        </div>
      </div>

      <button 
        className="submit-btn"
        onClick={handleSubmit}
        disabled={!date || disabled}
      >
        <Check size={18} />
        <span>Confirm</span>
      </button>

      <style jsx>{`
        .date-picker {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .label {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.7);
        }

        .input-wrapper {
          position: relative;
        }

        .calendar-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: rgba(255, 255, 255, 0.4);
          pointer-events: none;
        }

        input[type="date"] {
          width: 100%;
          padding: 12px 12px 12px 42px;
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          color: white;
          font-size: 14px;
          cursor: pointer;
        }

        input[type="date"]::-webkit-calendar-picker-indicator {
          filter: invert(1);
          cursor: pointer;
        }

        input:focus {
          outline: none;
          border-color: rgba(255, 255, 255, 0.4);
        }

        .quick-select {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .quick-label {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.5);
        }

        .quick-buttons {
          display: flex;
          gap: 6px;
        }

        .quick-buttons button {
          padding: 6px 12px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 6px;
          color: rgba(255, 255, 255, 0.7);
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .quick-buttons button:hover {
          background: rgba(255, 255, 255, 0.15);
          color: white;
        }

        .submit-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px;
          background: #6f6fd2;
          border: none;
          border-radius: 12px;
          color: white;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }

        .submit-btn:hover:not(:disabled) {
          background: #5959a8;
        }

        .submit-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
