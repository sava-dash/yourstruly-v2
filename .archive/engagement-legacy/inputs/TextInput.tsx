'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, X } from 'lucide-react';

interface TextInputProps {
  placeholder?: string;
  onSubmit: (text: string) => void;
  onCancel: () => void;
  disabled?: boolean;
  minLength?: number;
  maxLength?: number;
}

export function TextInput({
  placeholder = 'Type your response...',
  onSubmit,
  onCancel,
  disabled = false,
  minLength = 10,
  maxLength = 2000,
}: TextInputProps) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [text]);

  const handleSubmit = () => {
    if (text.trim().length >= minLength && !disabled) {
      onSubmit(text.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Submit on Cmd/Ctrl + Enter
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  const isValid = text.trim().length >= minLength;
  const remaining = maxLength - text.length;

  return (
    <div className="text-input">
      <div className="input-wrapper">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, maxLength))}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={3}
        />
        
        <div className="input-footer">
          <span className={`char-count ${remaining < 100 ? 'warning' : ''}`}>
            {remaining}
          </span>
          <span className="hint">⌘ + Enter to submit</span>
        </div>
      </div>

      <div className="actions">
        <button 
          className="cancel-btn"
          onClick={onCancel}
        >
          <X size={18} />
          <span>Cancel</span>
        </button>
        <button 
          className="submit-btn"
          onClick={handleSubmit}
          disabled={!isValid || disabled}
        >
          <Send size={18} />
          <span>Save</span>
        </button>
      </div>

      {!isValid && text.length > 0 && (
        <p className="hint-text">
          Please write at least {minLength} characters ({minLength - text.length} more)
        </p>
      )}

      <style jsx>{`
        .text-input {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .input-wrapper {
          position: relative;
        }

        textarea {
          width: 100%;
          min-height: 80px;
          max-height: 200px;
          padding: 12px;
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          color: white;
          font-size: 15px;
          line-height: 1.5;
          resize: none;
          transition: border-color 0.2s;
        }

        textarea::placeholder {
          color: rgba(255, 255, 255, 0.4);
        }

        textarea:focus {
          outline: none;
          border-color: rgba(255, 255, 255, 0.4);
        }

        textarea:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .input-footer {
          display: flex;
          justify-content: space-between;
          margin-top: 6px;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.4);
        }

        .char-count {
          font-variant-numeric: tabular-nums;
        }

        .char-count.warning {
          color: #f59e0b;
        }

        .actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }

        .cancel-btn,
        .submit-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          border: none;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .cancel-btn {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }

        .cancel-btn:hover {
          background: rgba(255, 255, 255, 0.15);
        }

        .submit-btn {
          background: #6f6fd2;
          color: white;
        }

        .submit-btn:hover:not(:disabled) {
          background: #5959a8;
        }

        .submit-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .hint-text {
          margin: 0;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.5);
        }
      `}</style>
    </div>
  );
}
