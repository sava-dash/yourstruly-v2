'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mic, Type, SkipForward, Send, MicOff, Sparkles, User, Phone, Mail, Calendar, MapPin, Square, Loader2, MessageCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { EngagementPrompt, PromptResponse } from '@/types/engagement';

interface BubbleProps {
  prompt: EngagementPrompt;
  index: number;
  isExpanded: boolean;
  onClick: () => void;
  onAnswer: (response: PromptResponse) => void;
  onSkip: () => void;
  onDismiss: () => void;
  onClose: () => void;
  rotation?: number;
  showConversationIndicator?: boolean;
}

const TYPE_CONFIG: Record<string, { icon: string; label: string; xp: number; categoryClass: string }> = {
  photo_backstory: { icon: '📸', label: 'Tell the Story', xp: 15, categoryClass: 'category-pill-yellow' },
  tag_person: { icon: '👤', label: "Who's This?", xp: 5, categoryClass: 'category-pill-blue' },
  missing_info: { icon: '📝', label: 'Update Info', xp: 5, categoryClass: 'category-pill-green' },
  memory_prompt: { icon: '💭', label: 'Remember When', xp: 20, categoryClass: 'category-pill-purple' },
  knowledge: { icon: '🧠', label: 'Share Wisdom', xp: 15, categoryClass: 'category-pill-red' },
  connect_dots: { icon: '🔗', label: 'Then & Now', xp: 10, categoryClass: 'category-pill-blue' },
  highlight: { icon: '⭐', label: 'Spotlight', xp: 5, categoryClass: 'category-pill-yellow' },
  quick_question: { icon: '👤', label: 'Update Info', xp: 5, categoryClass: 'category-pill-green' }, // alias → missing_info
  postscript: { icon: '💌', label: 'Future Message', xp: 20, categoryClass: 'category-pill-purple' },
  favorites_firsts: { icon: '🏆', label: 'Your Favorites', xp: 10, categoryClass: 'category-pill-red' },
  recipes_wisdom: { icon: '📖', label: 'Pass It Down', xp: 15, categoryClass: 'category-pill-yellow' },
};

// Contact fields to display when expanded
const CONTACT_FIELDS = [
  { key: 'phone', label: 'Phone', icon: Phone },
  { key: 'email', label: 'Email', icon: Mail },
  { key: 'date_of_birth', label: 'Birthday', icon: Calendar },
  { key: 'address', label: 'Address', icon: MapPin },
];

export function Bubble({
  prompt,
  index,
  isExpanded,
  onClick,
  onAnswer,
  onSkip,
  onDismiss,
  onClose,
  rotation = 0,
  showConversationIndicator = false,
}: BubbleProps) {
  const [inputMode, setInputMode] = useState<'voice' | 'text' | null>(null);
  const [textValue, setTextValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const config = TYPE_CONFIG[prompt.type] || TYPE_CONFIG.memory_prompt;
  
  // Determine if this is a contact-related prompt
  const isContactPrompt = prompt.type === 'quick_question' || prompt.type === 'missing_info';
  
  // For contact prompts, generate a better prompt text if we have contact name
  const getDisplayText = (name: string | null) => {
    if (isContactPrompt && name) {
      if (prompt.missingField) {
        // Missing info prompt - ask about specific field
        const fieldLabels: Record<string, string> = {
          phone: 'phone number',
          email: 'email address',
          date_of_birth: 'birthday',
          address: 'address',
          relationship: 'relationship to you',
        };
        const fieldLabel = fieldLabels[prompt.missingField] || prompt.missingField;
        return `What is ${name}'s ${fieldLabel}?`;
      }
      // Generic contact update
      return `Update ${name}'s information`;
    }
    // Replace template variables for other prompt types
    return prompt.promptText
      .replace(/\{\{contact_name\}\}/g, name || 'this person')
      .replace(/\{\{suggested_location\}\}/g, '...')
      .replace(/\{\{.*?\}\}/g, '');
  };

  const handleTextSubmit = useCallback(async () => {
    if (!textValue.trim()) return;
    setIsSubmitting(true);
    try {
      await onAnswer({ type: 'text', text: textValue });
      setTextValue('');
      setInputMode(null);
    } catch (err) {
      console.error('Failed to submit:', err);
    }
    setIsSubmitting(false);
  }, [textValue, onAnswer]);

  const handleQuickAnswer = useCallback(async (value: string) => {
    setIsSubmitting(true);
    try {
      await onAnswer({ type: 'selection', data: { value } });
    } catch (err) {
      console.error('Failed to submit:', err);
    }
    setIsSubmitting(false);
  }, [onAnswer]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleTextSubmit();
    }
  };

  const selectTextMode = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setInputMode('text');
    setTimeout(() => textareaRef.current?.focus(), 50);
  }, []);

  const selectVoiceMode = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setInputMode('voice');
  }, []);

  const cancelInput = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setInputMode(null);
    setTextValue('');
    // Also reset voice recording state
    stopRecording();
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingError(null);
  }, []);

  // Voice recording functions
  const startRecording = useCallback(async () => {
    try {
      setRecordingError(null);
      audioChunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);

        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.onerror = () => {
        setRecordingError('Recording error occurred');
        setIsRecording(false);
      };

      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error('Error starting recording:', err);
      setRecordingError('Could not access microphone. Please check permissions.');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  }, [isRecording]);

  const uploadVoiceRecording = useCallback(async (): Promise<string | null> => {
    if (!audioBlob) return null;

    setIsUploading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('User not authenticated');
      }

      const timestamp = Date.now();
      const fileName = `memories/${user.id}/voice/${timestamp}.webm`;

      const { data, error } = await supabase.storage
        .from('memories')
        .upload(fileName, audioBlob, {
          contentType: 'audio/webm',
          upsert: false,
        });

      if (error) {
        console.error('Upload error:', error);
        throw error;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('memories')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (err) {
      console.error('Error uploading voice recording:', err);
      setRecordingError('Failed to upload recording. Please try again.');
      return null;
    } finally {
      setIsUploading(false);
    }
  }, [audioBlob]);

  const handleVoiceSubmit = useCallback(async () => {
    if (!audioBlob) return;
    setIsSubmitting(true);
    try {
      // Upload the voice recording
      const uploadedUrl = await uploadVoiceRecording();

      if (uploadedUrl) {
        await onAnswer({ type: 'voice', audioUrl: uploadedUrl });
        // Reset state
        setAudioBlob(null);
        setAudioUrl(null);
        setInputMode(null);
      }
    } catch (err) {
      console.error('Failed to submit voice:', err);
    } finally {
      setIsSubmitting(false);
    }
  }, [audioBlob, uploadVoiceRecording, onAnswer]);

  const cancelVoiceRecording = useCallback(() => {
    stopRecording();
    setAudioBlob(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl(null);
    setRecordingError(null);
    setInputMode(null);
  }, [stopRecording, audioUrl]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  // Format recording time as mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const hasPhoto = prompt.photoUrl && 
    (prompt.type === 'photo_backstory' || prompt.type === 'tag_person');

  // Get contact metadata for expanded view
  const contactMeta = prompt.metadata?.contact || {};

  // Get display name with fallback
  const getContactDisplayName = () => {
    if (prompt.contactName) return prompt.contactName;
    if (prompt.metadata?.contact?.name) return prompt.metadata.contact.name;
    if (prompt.metadata?.suggested_contact_name) return prompt.metadata.suggested_contact_name;
    return null;
  };
  
  const contactDisplayName = getContactDisplayName();
  const displayText = getDisplayText(contactDisplayName);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0, rotate: isExpanded ? 0 : rotation }}
      exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
      transition={{ type: 'spring', stiffness: 400, damping: 30, delay: index * 0.03 }}
      onClick={!isExpanded ? onClick : undefined}
      data-type={prompt.type}
      className={`bubble-card ${isExpanded ? 'expanded' : ''} ${!isExpanded ? 'cursor-pointer' : ''}`}
    >
      {/* XP Badge */}
      {!isExpanded && (
        <div className="bubble-xp-badge">
          <Sparkles size={10} />
          +{config.xp} XP
        </div>
      )}

      {/* Close button when expanded */}
      {isExpanded && (
        <button 
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="bubble-close-btn"
        >
          <X size={14} className="text-gray-500" />
        </button>
      )}

      {/* Main content */}
      <div className="p-4 pt-5">
        {/* Header with handwritten category pill */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-base">{config.icon}</span>
          <span className={`category-pill ${config.categoryClass}`}>
            {config.label}
          </span>
        </div>

        {/* Contact card (collapsed view - always show for contact prompts) */}
        {isContactPrompt && contactDisplayName && !isExpanded && (
          <div className="bubble-contact-card">
            <div className="bubble-contact-avatar">
              {prompt.contactPhotoUrl ? (
                
<img src={prompt.contactPhotoUrl} alt="" />
              ) : (
                contactDisplayName.charAt(0).toUpperCase()
              )}
            </div>
            <div className="bubble-contact-info">
              <p className="bubble-contact-name">{contactDisplayName}</p>
              <p className="bubble-contact-subtitle">
                {prompt.missingField ? `Add ${prompt.missingField.replace('_', ' ')}` : 'Update their info'}
              </p>
            </div>
          </div>
        )}

        {/* Expanded contact info */}
        {isContactPrompt && contactDisplayName && isExpanded && (
          <div className="bubble-contact-expanded">
            {/* Large avatar header */}
            <div className="flex items-center gap-4 mb-4 pb-4 border-b border-gray-100">
              <div className="w-16 h-16 rounded-full bg-[var(--yt-green-light)] text-[var(--yt-green)] flex items-center justify-center text-2xl font-bold">
                {prompt.contactPhotoUrl ? (
                  
<img src={prompt.contactPhotoUrl} alt="" className="w-full h-full rounded-full object-cover" />
                ) : (
                  contactDisplayName.charAt(0).toUpperCase()
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800">{contactDisplayName}</h3>
                <p className="text-sm text-[var(--yt-green)]">{contactMeta.relationship_type || 'Family member'}</p>
              </div>
            </div>

            {/* Contact fields */}
            {CONTACT_FIELDS.map(({ key, label, icon: Icon }) => {
              const value = (contactMeta as Record<string, string | undefined>)[key];
              const isMissing = !value || key === prompt.missingField;
              return (
                <div key={key} className={`bubble-contact-field ${isMissing && key === prompt.missingField ? 'missing' : ''}`}>
                  <span className="bubble-contact-field-label flex items-center gap-2">
                    <Icon size={14} className="text-gray-400" />
                    {label}
                  </span>
                  <span className="bubble-contact-field-value">
                    {key === prompt.missingField ? '← Fill this in' : (value || '—')}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Photo preview */}
        {hasPhoto && (
          <img 
            src={prompt.photoUrl} 
            alt="" 
            className="bubble-photo"
          />
        )}

        {/* Prompt text (non-contact prompts or as subtitle) */}
        {!isContactPrompt && (
          <p className="bubble-prompt-text">{displayText}</p>
        )}

        {/* Collapsed hint */}
        {!isExpanded && (
          <div className="bubble-hint-container">
            <p className="bubble-hint">
              {isContactPrompt ? (
                <>tap to update info →</>
              ) : showConversationIndicator ? (
                <>
                  <MessageCircle size={12} />
                  Tap for voice conversation
                </>
              ) : (
                <>tap to answer →</>
              )}
            </p>
          </div>
        )}
      </div>

      {/* Expanded input area */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="px-4 pb-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Prompt text when expanded (for contact prompts, show as question) */}
            {isContactPrompt && (
              <p className="bubble-prompt-text mb-4">{displayText}</p>
            )}

            {/* Quick question buttons (Yes/No style) */}
            {prompt.metadata?.options && (
              <div className="bubble-quick-answers">
                {prompt.metadata.options.map((option: string) => (
                  <button
                    key={option}
                    onClick={() => handleQuickAnswer(option)}
                    disabled={isSubmitting}
                    className="bubble-quick-btn"
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}

            {/* Text/Voice input (for prompts without predefined options) */}
            {!prompt.metadata?.options && (
              <>
                {inputMode === null ? (
                  <div className="bubble-input-buttons">
                    <button onClick={selectVoiceMode} className="bubble-input-btn">
                      <Mic size={16} />
                      <span>Speak</span>
                    </button>
                    <button onClick={selectTextMode} className="bubble-input-btn">
                      <Type size={16} />
                      <span>Type</span>
                    </button>
                  </div>
                ) : inputMode === 'text' ? (
                  <div className="mb-3">
                    <textarea
                      ref={textareaRef}
                      value={textValue}
                      onChange={(e) => setTextValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      onClick={(e) => e.stopPropagation()}
                      placeholder={isContactPrompt ? "Enter the info..." : "Share your memory..."}
                      rows={3}
                      className="bubble-textarea"
                    />
                    <div className="flex items-center justify-between mt-3">
                      <button onClick={cancelInput} className="bubble-action-btn">
                        Cancel
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleTextSubmit(); }}
                        disabled={!textValue.trim() || isSubmitting}
                        className="bubble-submit-btn"
                      >
                        <Send size={14} />
                        {isSubmitting ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mb-3">
                    {/* Voice Recording Interface */}
                    {!audioBlob ? (
                      /* Recording in progress or ready to start */
                      <div className="p-6 bg-gray-50 rounded-xl text-center">
                        {recordingError ? (
                          <div className="text-red-500 mb-4">
                            <p className="text-sm">{recordingError}</p>
                          </div>
                        ) : null}

                        {isRecording ? (
                          /* Active recording state */
                          <div className="flex flex-col items-center">
                            <div className="relative mb-4">
                              {/* Pulsing red circle */}
                              <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-75"></div>
                              <div className="relative w-16 h-16 bg-red-500 rounded-full flex items-center justify-center">
                                <Mic size={24} className="text-white" />
                              </div>
                            </div>
                            <p className="text-2xl font-mono font-semibold text-gray-700 mb-2">
                              {formatTime(recordingTime)}
                            </p>
                            <p className="text-gray-500 text-sm mb-4">Recording...</p>
                            <button
                              onClick={(e) => { e.stopPropagation(); stopRecording(); }}
                              className="flex items-center gap-2 px-6 py-3 bg-gray-800 text-white rounded-full hover:bg-gray-700 transition-colors"
                            >
                              <Square size={16} fill="currentColor" />
                              <span>Stop Recording</span>
                            </button>
                          </div>
                        ) : (
                          /* Ready to start recording */
                          <div className="flex flex-col items-center">
                            <div className="w-16 h-16 bg-[var(--yt-green)] rounded-full flex items-center justify-center mb-4">
                              <Mic size={24} className="text-white" />
                            </div>
                            <p className="text-gray-700 font-medium mb-2">Record a voice message</p>
                            <p className="text-gray-400 text-sm mb-4">Tap the button below to start</p>
                            <button
                              onClick={(e) => { e.stopPropagation(); startRecording(); }}
                              className="flex items-center gap-2 px-6 py-3 bg-[var(--yt-green)] text-white rounded-full hover:bg-[var(--yt-green-dark)] transition-colors"
                            >
                              <Mic size={16} />
                              <span>Start Recording</span>
                            </button>
                          </div>
                        )}

                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <button onClick={selectTextMode} className="text-sm text-[var(--yt-green)] font-medium">
                            Type your response instead
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Recording complete - preview and submit */
                      <div className="p-4 bg-gray-50 rounded-xl">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 bg-[var(--yt-green-light)] rounded-full flex items-center justify-center">
                            <Mic size={18} className="text-[var(--yt-green)]" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-700">Voice message recorded</p>
                            <p className="text-xs text-gray-500">{formatTime(recordingTime)}</p>
                          </div>
                          {isUploading && (
                            <Loader2 size={20} className="animate-spin text-[var(--yt-green)]" />
                          )}
                        </div>

                        {/* Audio preview */}
                        {audioUrl && (
                          <audio
                            src={audioUrl}
                            controls
                            className="w-full mb-4"
                            style={{ height: '40px' }}
                          />
                        )}

                        <div className="flex items-center justify-between">
                          <button
                            onClick={(e) => { e.stopPropagation(); cancelVoiceRecording(); }}
                            disabled={isUploading || isSubmitting}
                            className="bubble-action-btn"
                          >
                            Re-record
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleVoiceSubmit(); }}
                            disabled={isUploading || isSubmitting}
                            className="bubble-submit-btn"
                          >
                            {isUploading ? (
                              <>
                                <Loader2 size={14} className="animate-spin" />
                                Uploading...
                              </>
                            ) : (
                              <>
                                <Send size={14} />
                                Save Voice
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Footer */}
            <div className="bubble-footer">
              <button onClick={(e) => { e.stopPropagation(); onSkip(); }} className="bubble-action-btn">
                <SkipForward size={12} />
                Skip for now
              </button>
              <button onClick={(e) => { e.stopPropagation(); onDismiss(); }} className="bubble-action-btn">
                Don't ask again
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
