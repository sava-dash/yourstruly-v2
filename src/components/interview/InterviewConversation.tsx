'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Keyboard, Check, Loader2, Video, ImagePlus, Upload, Trash2 } from 'lucide-react';
import { MediaRecorder } from '../conversation/MediaRecorder';
import { TranscriptionPreview } from '../conversation/TranscriptionPreview';

interface InterviewQuestion {
  id: string;
  question_text: string;
  status: string;
}

interface Exchange {
  question: string;
  response: string;
  audioUrl?: string;
}

interface InterviewConversationProps {
  sessionId: string;
  accessToken: string;
  userId: string;
  question: InterviewQuestion;
  contactName: string;
  onComplete: () => void;
  onClose: () => void;
  initialProgress?: {
    exchanges?: Exchange[];
    currentQuestion?: string;
    mode?: InputMode;
  } | null;
}

type ViewState = 'recording' | 'transcribing' | 'confirming' | 'generating' | 'review' | 'saving' | 'complete';
type InputMode = 'voice' | 'text';

export function InterviewConversation({
  sessionId,
  accessToken,
  userId,
  question,
  contactName,
  onComplete,
  onClose,
  initialProgress,
}: InterviewConversationProps) {
  const hasResumed = !!(initialProgress?.exchanges && initialProgress.exchanges.length > 0);

  const [viewState, setViewState] = useState<ViewState>(
    hasResumed ? 'review' : 'recording'
  );
  const [inputMode, setInputMode] = useState<InputMode>(
    initialProgress?.mode === 'text' ? 'text' : 'voice'
  );
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isGeneratingFollowup, setIsGeneratingFollowup] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Current question (starts with the initial, then AI follow-ups)
  const [currentQuestion, setCurrentQuestion] = useState(
    initialProgress?.currentQuestion || question.question_text
  );

  // All exchanges in this conversation
  const [exchanges, setExchanges] = useState<Exchange[]>(
    initialProgress?.exchanges || []
  );

  // Auto-save indicator
  const [showSaved, setShowSaved] = useState(false);
  const [showResumeBanner, setShowResumeBanner] = useState(hasResumed);
  
  // Recording data
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordingType, setRecordingType] = useState<'video' | 'audio' | null>(null);
  
  // Transcription
  const [pendingResponse, setPendingResponse] = useState<{
    text: string;
    audioBlob?: Blob;
  } | null>(null);
  
  // Text input
  const [textInput, setTextInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Media attachments (photos/videos to include with interview)
  const [attachedMedia, setAttachedMedia] = useState<{ file: File; preview: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Focus textarea in text mode
  useEffect(() => {
    if (inputMode === 'text' && textareaRef.current && viewState === 'recording') {
      textareaRef.current.focus();
    }
  }, [inputMode, viewState]);

  // Auto-dismiss the resume banner after a moment
  useEffect(() => {
    if (showResumeBanner) {
      const t = setTimeout(() => setShowResumeBanner(false), 6000);
      return () => clearTimeout(t);
    }
  }, [showResumeBanner]);

  // Auto-save: persist progress whenever exchanges/currentQuestion change.
  // Also runs every 10s while user is composing, and debounced for keystrokes.
  const lastSavedRef = useRef<string>('');
  const saveProgress = useCallback(async (extra?: { textInProgress?: string }) => {
    const payload = {
      exchanges,
      currentQuestion,
      mode: inputMode,
      textInProgress: extra?.textInProgress ?? '',
      updatedAt: Date.now(),
    };
    const serialized = JSON.stringify(payload);
    // Skip if nothing changed since last save
    if (serialized === lastSavedRef.current) return;
    lastSavedRef.current = serialized;

    try {
      const res = await fetch('/api/interviews/save-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: accessToken, progress: payload }),
      });
      if (res.ok) {
        setShowSaved(true);
        window.setTimeout(() => setShowSaved(false), 1500);
      }
    } catch (err) {
      // Auto-save is best-effort — don't disrupt the user.
      console.warn('Auto-save failed:', err);
    }
  }, [exchanges, currentQuestion, inputMode, accessToken]);

  // Save after every exchange completion
  useEffect(() => {
    if (exchanges.length > 0) {
      saveProgress();
    }
  }, [exchanges.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Periodic save every 10s while typing/recording (not in terminal states)
  useEffect(() => {
    if (viewState === 'complete' || viewState === 'saving') return;
    const interval = setInterval(() => {
      saveProgress({ textInProgress: textInput });
    }, 10000);
    return () => clearInterval(interval);
  }, [viewState, saveProgress, textInput]);

  // Debounced save for keystrokes
  useEffect(() => {
    if (!textInput) return;
    const t = setTimeout(() => {
      saveProgress({ textInProgress: textInput });
    }, 2000);
    return () => clearTimeout(t);
  }, [textInput, saveProgress]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (viewState === 'confirming') {
          setPendingResponse(null);
          setViewState('recording');
        } else if (exchanges.length > 0) {
          // If we have exchanges, go to review instead of closing
          setViewState('review');
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, viewState, exchanges.length]);

  // Generate AI follow-up question
  const generateFollowUp = useCallback(async (allExchanges: Exchange[]): Promise<string | null> => {
    try {
      setIsGeneratingFollowup(true);
      setViewState('generating');
      
      const response = await fetch('/api/conversation/follow-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exchanges: allExchanges,
          promptType: 'interview',
          originalPrompt: question.question_text,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate follow-up');
      }

      const data = await response.json();
      return data.shouldEnd ? null : data.followUpQuestion;
    } catch (err) {
      console.error('Error generating follow-up:', err);
      return null;
    } finally {
      setIsGeneratingFollowup(false);
    }
  }, [question.question_text]);

  // Handle recording complete - transcribe via API
  const handleRecordingComplete = useCallback(async (blob: Blob, duration: number, type: 'video' | 'audio') => {
    setIsTranscribing(true);
    setRecordedBlob(blob);
    setRecordingDuration(duration);
    setRecordingType(type);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('audio', blob, 'recording.webm');

      const response = await fetch('/api/conversation/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Transcription failed');
      }

      const data = await response.json();
      const transcribedText = data.transcription || '';
      
      setPendingResponse({
        text: transcribedText,
        audioBlob: blob,
      });
      setViewState('confirming');
      
    } catch (err) {
      console.error('Error processing recording:', err);
      // Allow user to type manually if transcription fails
      setPendingResponse({
        text: '',
        audioBlob: blob,
      });
      setViewState('confirming');
      setError('Transcription failed. You can type your response instead.');
    } finally {
      setIsTranscribing(false);
    }
  }, []);

  // Handle text input submit
  const handleTextSubmit = useCallback(() => {
    if (!textInput.trim()) return;
    
    setPendingResponse({ text: textInput });
    setViewState('confirming');
  }, [textInput]);

  // Handle re-record
  const handleReRecord = useCallback(() => {
    setPendingResponse(null);
    setRecordedBlob(null);
    setViewState('recording');
    setError(null);
  }, []);

  // Handle user confirming their response
  const handleConfirmResponse = useCallback(async (confirmedText: string) => {
    if (!confirmedText.trim()) {
      setError('Please enter a response before continuing.');
      return;
    }

    // Add to exchanges
    const newExchange: Exchange = {
      question: currentQuestion,
      response: confirmedText,
      audioUrl: undefined, // We'll upload when saving
    };

    const updatedExchanges = [...exchanges, newExchange];
    setExchanges(updatedExchanges);
    setPendingResponse(null);
    setTextInput('');

    // Check if we've reached minimum exchanges (5) - offer to continue or finish
    if (updatedExchanges.length >= 5) {
      setViewState('review');
      return;
    }

    // Generate follow-up question
    const followUp = await generateFollowUp(updatedExchanges);
    
    if (followUp) {
      setCurrentQuestion(followUp);
      setViewState('recording');
      setRecordedBlob(null);
      setRecordingType(null);
    } else {
      // AI says we're done
      setViewState('review');
    }
  }, [currentQuestion, exchanges, generateFollowUp]);

  // Handle skip (go to review if we have exchanges)
  const handleSkip = useCallback(() => {
    if (exchanges.length > 0) {
      setViewState('review');
    } else {
      onClose();
    }
  }, [exchanges.length, onClose]);

  // Continue from review (get more follow-ups)
  const handleContinue = useCallback(async () => {
    const followUp = await generateFollowUp(exchanges);
    
    if (followUp) {
      setCurrentQuestion(followUp);
      setViewState('recording');
      setRecordedBlob(null);
      setRecordingType(null);
    } else {
      setError('No more follow-up questions. Ready to save.');
    }
  }, [exchanges, generateFollowUp]);

  // Handle media file selection
  const handleMediaSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    const newMedia = Array.from(files).map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }));
    
    setAttachedMedia(prev => [...prev, ...newMedia]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  // Remove attached media
  const handleRemoveMedia = useCallback((index: number) => {
    setAttachedMedia(prev => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
  }, []);

  // Save all responses
  const handleSave = useCallback(async () => {
    setViewState('saving');
    setError(null);

    try {
      // First, upload any attached media
      const uploadedMediaUrls: string[] = [];
      
      for (const media of attachedMedia) {
        const formData = new FormData();
        formData.append('file', media.file);
        formData.append('sessionId', sessionId);
        formData.append('accessToken', accessToken);
        
        const uploadRes = await fetch('/api/interviews/upload', {
          method: 'POST',
          body: formData,
        });
        
        if (uploadRes.ok) {
          const data = await uploadRes.json();
          if (data.url) uploadedMediaUrls.push(data.url);
        }
      }

      // Save the complete conversation as one interview response
      const saveResponse = await fetch('/api/interviews/save-conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          questionId: question.id,
          accessToken,
          exchanges,
          originalQuestion: question.question_text,
          attachedMediaUrls: uploadedMediaUrls,
        }),
      });

      if (!saveResponse.ok) {
        const errorData = await saveResponse.json();
        throw new Error(errorData.details || errorData.error || 'Failed to save');
      }

      setViewState('complete');
      
      setTimeout(() => {
        onComplete();
      }, 2000);

    } catch (err: any) {
      console.error('Save error:', err);
      setError(err.message || 'Failed to save. Please try again.');
      setViewState('review');
    }
  }, [sessionId, question.id, question.question_text, accessToken, exchanges, attachedMedia, onComplete]);

  return (
    <div className="interview-conversation">
      {/* Header */}
      <div className="interview-conversation-header">
        <div className="interview-conversation-progress">
          {exchanges.length} response{exchanges.length !== 1 ? 's' : ''} captured
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <AnimatePresence>
            {showSaved && (
              <motion.span
                key="saved"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 13,
                  color: '#406A56',
                  fontWeight: 500,
                }}
                aria-live="polite"
              >
                <Check size={14} /> Saved
              </motion.span>
            )}
          </AnimatePresence>
          <button
            onClick={exchanges.length > 0 ? () => setViewState('review') : onClose}
            className="interview-conversation-close"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Resume banner */}
      <AnimatePresence>
        {showResumeBanner && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            style={{
              background: '#D3E1DF',
              color: '#2d2d2d',
              padding: '12px 16px',
              borderRadius: 10,
              margin: '0 0 12px 0',
              fontSize: 15,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
            role="status"
          >
            <span>Welcome back — picking up where you left off.</span>
            <button
              onClick={() => setShowResumeBanner(false)}
              aria-label="Dismiss"
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#406A56' }}
            >
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Question Display */}
      <div className="interview-conversation-question">
        <div className="interview-question-label">
          <Sparkles size={16} />
          <span>Question for {contactName}</span>
        </div>
        <h2 className="interview-question-text">{currentQuestion}</h2>
      </div>

      {/* Recording State */}
      {viewState === 'recording' && (
        <div className="interview-conversation-recording">
          {/* Input mode toggle - Record or Type */}
          <div className="interview-input-toggle">
            <button
              onClick={() => setInputMode('voice')}
              className={`interview-mode-btn ${inputMode === 'voice' ? 'active' : ''}`}
            >
              <Video size={16} />
              Record
            </button>
            <button
              onClick={() => setInputMode('text')}
              className={`interview-mode-btn ${inputMode === 'text' ? 'active' : ''}`}
            >
              <Keyboard size={16} />
              Type
            </button>
          </div>

          {/* Video/Voice input */}
          {inputMode === 'voice' && (
            isTranscribing ? (
              <div className="interview-transcribing">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  <Sparkles size={32} className="text-[#4A7C59]" />
                </motion.div>
                <p>Transcribing your response...</p>
              </div>
            ) : (
              <MediaRecorder
                onRecordingComplete={handleRecordingComplete}
                onSkip={handleSkip}
                isLoading={false}
                allowVideo={true}
                defaultMode="voice"
              />
            )
          )}

          {/* Text input */}
          {inputMode === 'text' && (
            <div className="interview-text-input">
              <textarea
                ref={textareaRef}
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Type your response here..."
                className="interview-textarea"
                rows={5}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    handleTextSubmit();
                  }
                }}
              />
              <div className="interview-text-actions">
                <button onClick={handleSkip} className="interview-btn-secondary">
                  {exchanges.length > 0 ? 'Review & Save' : 'Skip'}
                </button>
                <button
                  onClick={handleTextSubmit}
                  disabled={!textInput.trim()}
                  className="interview-btn-primary"
                >
                  Continue (⌘↵)
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Confirming State */}
      {viewState === 'confirming' && pendingResponse && (
        <div className="interview-conversation-confirming">
          <TranscriptionPreview
            text={pendingResponse.text}
            onEdit={(newText) => setPendingResponse({ ...pendingResponse, text: newText })}
            onContinue={() => handleConfirmResponse(pendingResponse.text)}
            onReRecord={handleReRecord}
            showReRecord={!!pendingResponse.audioBlob}
          />
        </div>
      )}

      {/* Generating Follow-up State */}
      {viewState === 'generating' && (
        <div className="interview-conversation-generating">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <Sparkles size={48} className="text-[#2D5A3D]" />
          </motion.div>
          <p>Thinking of a follow-up question...</p>
        </div>
      )}

      {/* Review State - Show all exchanges and offer to continue or save */}
      {viewState === 'review' && (
        <div className="interview-conversation-review">
          <h3>Your Responses</h3>
          <div className="interview-exchanges-list">
            {exchanges.map((exchange, index) => (
              <div key={index} className="interview-exchange-item">
                <div className="interview-exchange-q">Q: {exchange.question}</div>
                <div className="interview-exchange-a">A: {exchange.response}</div>
              </div>
            ))}
          </div>
          
          {/* Media Attachments Section */}
          <div className="interview-media-attachments">
            <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <ImagePlus size={16} />
              Attach Photos or Videos (optional)
            </h4>
            <p className="text-xs text-gray-500 mb-3">
              Add photos or videos related to this conversation
            </p>
            
            {/* Attached Media Preview */}
            {attachedMedia.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {attachedMedia.map((media, index) => (
                  <div key={index} className="relative w-20 h-20 rounded-lg overflow-hidden group">
                    {media.file.type.startsWith('video/') ? (
                      <video src={media.preview} className="w-full h-full object-cover" />
                    ) : (
                      
<img src={media.preview} alt="" className="w-full h-full object-cover" />
                    )}
                    <button
                      onClick={() => handleRemoveMedia(index)}
                      className="absolute top-1 right-1 p-1 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={12} className="text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {/* Upload Button */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleMediaSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-[#2D5A3D] hover:text-[#2D5A3D] transition-colors"
            >
              <Upload size={16} />
              Choose Files
            </button>
          </div>
          
          <div className="interview-review-actions">
            <button onClick={handleContinue} className="interview-btn-secondary" disabled={isGeneratingFollowup}>
              {isGeneratingFollowup ? 'Generating...' : 'Add More'}
            </button>
            <button onClick={handleSave} className="interview-btn-primary">
              Save Responses {attachedMedia.length > 0 && `(+${attachedMedia.length} files)`}
            </button>
          </div>
        </div>
      )}

      {/* Saving State */}
      {viewState === 'saving' && (
        <div className="interview-conversation-saving">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <Loader2 size={48} className="text-[#2D5A3D]" />
          </motion.div>
          <p>Saving your responses...</p>
        </div>
      )}

      {/* Complete State */}
      {viewState === 'complete' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="interview-conversation-complete"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 15 }}
            className="interview-complete-icon"
          >
            <Check size={32} />
          </motion.div>
          <h2>Responses saved</h2>
          <p>{exchanges.length} responses captured</p>
        </motion.div>
      )}

      {/* Error Display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="interview-conversation-error"
        >
          {error}
        </motion.div>
      )}
    </div>
  );
}
