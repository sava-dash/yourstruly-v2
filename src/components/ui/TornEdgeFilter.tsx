'use client'

import React from 'react'

interface TornEdgeFilterProps {
  options: string[]
  value: string | null
  onChange: (value: string | null) => void
  allLabel?: string
  className?: string
}

/**
 * Filter buttons with clean styling (no torn edges)
 * Matches YoursTruly navigation hover styling with text animation
 */
export default function TornEdgeFilter({
  options,
  value,
  onChange,
  allLabel = 'All',
  className = '',
}: TornEdgeFilterProps) {
  const allOptions = [allLabel, ...options]

  return (
    <div className={`torn-filter-group ${className}`}>
      {allOptions.map((option) => {
        const isActive = option === allLabel ? value === null : value === option
        
        return (
          <button
            key={option}
            onClick={() => onChange(option === allLabel ? null : option)}
            className={`torn-filter-btn ${isActive ? 'torn-filter-btn-active' : ''}`}
          >
            <span className="torn-filter-text">{option}</span>
          </button>
        )
      })}

      <style jsx>{`
        .torn-filter-group {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
        }

        .torn-filter-btn {
          position: relative;
          padding: 10px 20px;
          background: transparent;
          border: none;
          font-size: 14px;
          font-weight: 500;
          color: #666;
          cursor: pointer;
          transition: all 0.3s ease;
          border-radius: 8px;
        }

        .torn-filter-btn:hover {
          color: #2D5A3D;
        }

        .torn-filter-btn:hover .torn-filter-text {
          transform: translateY(-2px);
        }

        .torn-filter-text {
          display: inline-block;
          transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .torn-filter-btn-active {
          color: #2D5A3D;
          font-weight: 600;
        }

        .torn-filter-btn-active .torn-filter-text {
          animation: text-bounce 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        @keyframes text-bounce {
          0% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
          100% { transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

// Alternative: Pill-style filter buttons (no torn edge)
export function TornEdgeFilterPill({
  options,
  value,
  onChange,
  allLabel = 'All',
  className = '',
}: TornEdgeFilterProps) {
  const allOptions = [allLabel, ...options]

  return (
    <div className={`flex gap-2 flex-wrap ${className}`}>
      {allOptions.map((option) => {
        const isActive = option === allLabel ? value === null : value === option
        
        return (
          <button
            key={option}
            onClick={() => onChange(option === allLabel ? null : option)}
            className={`
              relative px-4 py-2 rounded-full text-sm font-medium
              transition-all duration-300 ease-out
              ${isActive 
                ? 'bg-[#2D5A3D] text-white shadow-md' 
                : 'bg-white/60 text-[#666] border border-[#2D5A3D]/10 hover:bg-white hover:border-[#2D5A3D]/20 hover:text-[#2D5A3D]'
              }
            `}
          >
            <span className={`
              inline-block transition-transform duration-300
              ${isActive ? 'animate-[bounce_0.4s_ease]' : 'hover:-translate-y-0.5'}
            `}>
              {option}
            </span>
          </button>
        )
      })}
    </div>
  )
}
