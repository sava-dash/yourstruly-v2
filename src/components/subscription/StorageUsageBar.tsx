'use client'

import { motion } from 'framer-motion'
import { HardDrive, Video, Image, Mic, FileText, AlertTriangle } from 'lucide-react'
import { StorageBreakdown, formatBytes } from '@/types/subscription'
import './subscription.css'

interface StorageUsageBarProps {
  storage: StorageBreakdown
  showBreakdown?: boolean
  compact?: boolean
  onUpgradeClick?: () => void
}

export function StorageUsageBar({ 
  storage, 
  showBreakdown = true, 
  compact = false,
  onUpgradeClick 
}: StorageUsageBarProps) {
  const { total_bytes, limit_bytes, percentage, by_type } = storage
  
  const isWarning = percentage >= 80
  const isCritical = percentage >= 95
  const isFull = percentage >= 100

  // Calculate segment widths for breakdown bar
  const segments = [
    { type: 'video', bytes: by_type.video, color: '#B8562E', icon: Video, label: 'Videos' },
    { type: 'image', bytes: by_type.image, color: '#2D5A3D', icon: Image, label: 'Photos' },
    { type: 'audio', bytes: by_type.audio, color: '#4A3552', icon: Mic, label: 'Audio' },
    { type: 'document', bytes: by_type.document, color: '#8DACAB', icon: FileText, label: 'Documents' },
  ].filter(s => s.bytes > 0)

  const getBarColor = () => {
    if (isCritical) return '#dc2626' // red-600
    if (isWarning) return '#f59e0b' // amber-500
    return '#2D5A3D' // brand green
  }

  if (compact) {
    return (
      <div className="storage-compact">
        <div className="storage-compact-bar">
          <motion.div 
            className="storage-compact-fill"
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(percentage, 100)}%` }}
            style={{ backgroundColor: getBarColor() }}
          />
        </div>
        <span className="storage-compact-text">
          {formatBytes(total_bytes)} / {formatBytes(limit_bytes)}
        </span>
      </div>
    )
  }

  return (
    <div className={`storage-usage-card ${isFull ? 'storage-full' : ''}`}>
      <div className="storage-header">
        <div className="storage-title">
          <HardDrive size={20} />
          <span>Storage</span>
        </div>
        <div className="storage-amount">
          <span className="storage-used">{formatBytes(total_bytes)}</span>
          <span className="storage-separator"> of </span>
          <span className="storage-limit">{formatBytes(limit_bytes)}</span>
        </div>
      </div>

      {/* Main progress bar */}
      <div className="storage-bar-container">
        <div className="storage-bar-track">
          {showBreakdown && segments.length > 0 ? (
            // Segmented bar showing breakdown
            <div className="storage-bar-segments">
              {segments.map((segment, index) => {
                const segmentPercent = (segment.bytes / limit_bytes) * 100
                return (
                  <motion.div
                    key={segment.type}
                    className="storage-segment"
                    initial={{ width: 0 }}
                    animate={{ width: `${segmentPercent}%` }}
                    transition={{ delay: index * 0.1, duration: 0.5 }}
                    style={{ backgroundColor: segment.color }}
                    title={`${segment.label}: ${formatBytes(segment.bytes)}`}
                  />
                )
              })}
            </div>
          ) : (
            // Simple bar
            <motion.div
              className="storage-bar-fill"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(percentage, 100)}%` }}
              transition={{ duration: 0.5 }}
              style={{ backgroundColor: getBarColor() }}
            />
          )}
        </div>
        <span className="storage-percentage">{percentage.toFixed(0)}%</span>
      </div>

      {/* Warning messages */}
      {isFull && (
        <motion.div 
          className="storage-warning storage-warning-critical"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <AlertTriangle size={16} />
          <span>Storage full! Delete memories or upgrade to continue.</span>
          {onUpgradeClick && (
            <button onClick={onUpgradeClick} className="storage-upgrade-btn">
              Upgrade
            </button>
          )}
        </motion.div>
      )}
      
      {isWarning && !isFull && (
        <motion.div 
          className="storage-warning"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <AlertTriangle size={16} />
          <span>Running low on storage</span>
        </motion.div>
      )}

      {/* Breakdown legend */}
      {showBreakdown && segments.length > 0 && (
        <div className="storage-breakdown">
          {segments.map(segment => (
            <div key={segment.type} className="storage-breakdown-item">
              <div 
                className="storage-breakdown-dot" 
                style={{ backgroundColor: segment.color }}
              />
              <segment.icon size={14} />
              <span className="storage-breakdown-label">{segment.label}</span>
              <span className="storage-breakdown-size">{formatBytes(segment.bytes)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
