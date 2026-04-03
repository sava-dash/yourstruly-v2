'use client'

import { useState } from 'react'
import { MessageSquare, Check } from 'lucide-react'

interface SMSConsentCheckboxProps {
  checked: boolean
  onChange: (checked: boolean) => void
  recipientName?: string
  className?: string
}

/**
 * SMS Consent Checkbox for TCPA compliance
 * Required before sending SMS invites/notifications
 */
export default function SMSConsentCheckbox({
  checked,
  onChange,
  recipientName = 'the recipient',
  className = ''
}: SMSConsentCheckboxProps) {
  return (
    <div className={`sms-consent-wrapper ${className}`}>
      <label className="sms-consent-label">
        <div className="sms-consent-checkbox-wrapper">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            className="sms-consent-input"
          />
          <div className={`sms-consent-checkbox ${checked ? 'sms-consent-checkbox-checked' : ''}`}>
            {checked && <Check size={14} strokeWidth={3} />}
          </div>
        </div>
        <div className="sms-consent-content">
          <div className="sms-consent-icon">
            <MessageSquare size={16} />
          </div>
          <div className="sms-consent-text">
            <span className="sms-consent-title">SMS Consent</span>
            <span className="sms-consent-description">
              I confirm that {recipientName} has agreed to receive SMS messages from YoursTruly. 
              Standard messaging rates may apply. Reply STOP to opt out.
            </span>
          </div>
        </div>
      </label>

      <style jsx>{`
        .sms-consent-wrapper {
          background: linear-gradient(135deg, rgba(64, 106, 86, 0.08) 0%, rgba(64, 106, 86, 0.04) 100%);
          border: 1px solid rgba(64, 106, 86, 0.15);
          border-radius: 12px;
          padding: 16px;
          transition: all 0.2s ease;
        }

        .sms-consent-wrapper:hover {
          border-color: rgba(64, 106, 86, 0.25);
        }

        .sms-consent-label {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          cursor: pointer;
        }

        .sms-consent-checkbox-wrapper {
          flex-shrink: 0;
          position: relative;
        }

        .sms-consent-input {
          position: absolute;
          opacity: 0;
          width: 0;
          height: 0;
        }

        .sms-consent-checkbox {
          width: 22px;
          height: 22px;
          border: 2px solid rgba(64, 106, 86, 0.3);
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          background: white;
          color: white;
        }

        .sms-consent-checkbox-checked {
          background: #2D5A3D;
          border-color: #2D5A3D;
        }

        .sms-consent-content {
          display: flex;
          gap: 10px;
          flex: 1;
        }

        .sms-consent-icon {
          flex-shrink: 0;
          width: 32px;
          height: 32px;
          background: rgba(64, 106, 86, 0.1);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #2D5A3D;
        }

        .sms-consent-text {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .sms-consent-title {
          font-weight: 600;
          font-size: 14px;
          color: #2d2d2d;
        }

        .sms-consent-description {
          font-size: 12px;
          color: #666;
          line-height: 1.5;
        }
      `}</style>
    </div>
  )
}

/**
 * Inline version for tighter spaces
 */
export function SMSConsentInline({
  checked,
  onChange,
  className = ''
}: Omit<SMSConsentCheckboxProps, 'recipientName'>) {
  return (
    <label className={`flex items-start gap-3 cursor-pointer ${className}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 w-4 h-4 rounded border-[#2D5A3D]/30 text-[#2D5A3D] focus:ring-[#2D5A3D] focus:ring-offset-0"
      />
      <span className="text-sm text-[#666] leading-relaxed">
        I confirm the recipient has agreed to receive SMS messages from YoursTruly. 
        <span className="text-[#888]"> Msg & data rates may apply. Reply STOP to opt out.</span>
      </span>
    </label>
  )
}
