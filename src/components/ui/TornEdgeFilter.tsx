'use client'

import React from 'react'
import TornEdge from './TornEdge'

interface TornEdgeFilterProps {
  options: string[]
  value: string | null
  onChange: (value: string | null) => void
  allLabel?: string
  className?: string
}

/**
 * Filter buttons with torn paper edge selector
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
            {isActive && (
              <div className="torn-filter-edge">
                <TornEdge variant="d" position="bottom" color="#406A56" height={6} />
              </div>
            )}
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
          color: #406A56;
        }

        .torn-filter-btn:hover .torn-filter-text {
          transform: translateY(-2px);
        }

        .torn-filter-text {
          display: inline-block;
          transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .torn-filter-btn-active {
          color: #406A56;
          font-weight: 600;
        }

        .torn-filter-btn-active .torn-filter-text {
          animation: text-bounce 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .torn-filter-edge {
          position: absolute;
          bottom: 2px;
          left: 50%;
          transform: translateX(-50%);
          width: 80%;
          opacity: 0;
          animation: edge-appear 0.3s ease forwards;
        }

        @keyframes text-bounce {
          0% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
          100% { transform: translateY(0); }
        }

        @keyframes edge-appear {
          0% { 
            opacity: 0; 
            transform: translateX(-50%) scaleX(0.5);
          }
          100% { 
            opacity: 1; 
            transform: translateX(-50%) scaleX(1);
          }
        }
      `}</style>
    </div>
  )
}

// Alternative: Pill-style with torn edge background on selection
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
                ? 'bg-[#406A56] text-white shadow-md' 
                : 'bg-white/60 text-[#666] border border-[#406A56]/10 hover:bg-white hover:border-[#406A56]/20 hover:text-[#406A56]'
              }
            `}
          >
            <span className={`
              inline-block transition-transform duration-300
              ${isActive ? 'animate-[bounce_0.4s_ease]' : 'hover:-translate-y-0.5'}
            `}>
              {option}
            </span>
            
            {/* Torn edge accent under active pill */}
            {isActive && (
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3/4 h-1.5 overflow-hidden">
                <svg 
                  viewBox="0 0 100 8" 
                  preserveAspectRatio="none"
                  className="w-full h-full"
                >
                  <path 
                    d="M0,0 L3,6 L8,2 L12,7 L17,1 L22,5 L27,2 L33,7 L38,1 L43,6 L48,2 L53,8 L58,1 L63,5 L68,2 L74,7 L79,1 L84,6 L89,2 L95,7 L100,0 L100,8 L0,8 Z" 
                    fill="white"
                  />
                </svg>
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}
