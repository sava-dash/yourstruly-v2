'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Mic, Keyboard, RotateCcw } from 'lucide-react';
import { MediaRecorder } from './MediaRecorder';
import { TranscriptionPreview } from './TranscriptionPreview';
import { ConversationHistory } from './ConversationHistory';
import { AnimatedQuestion } from './AnimatedQuestion';
import { ReviewScreen } from './ReviewScreen';
import { ScopeSelector, type ScopeSelection } from '@/components/circles';

// Partial prompt type - only fields actually used by ConversationView
interface ConversationPrompt {
  id: string;
  type: string;
  promptText: string;
  photoUrl?: string;
  photoId?: string;
  contactId?: string;
  contactName?: string;
  steps?: string[];
}

interface Exchange {
  question: string;
  response: string;
  audioUrl?: string;
  transcription?: string;
}

interface ConversationViewProps {
  prompt: ConversationPrompt;
  expectedXp?: number;  // XP value from prompt type config
  onComplete: (result: {
    exchanges: Exchange[];
    summary: string;
    knowledgeEntryId?: string;
    memoryId?: string;
    xpAwarded: number;
  }) => void;
  onClose: () => void;
}

type ViewState = 'intro' | 'recording' | 'confirming' | 'continue-prompt' | 'review' | 'scope-select' | 'complete';
type InputMode = 'voice' | 'text';

export function ConversationView({ prompt, expectedXp = 15, onComplete, onClose }: ConversationViewProps) {
  const [viewState, setViewState] = useState<ViewState>('recording');
  const [inputMode, setInputMode] = useState<InputMode>('voice');
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(prompt.promptText);
  const [isGeneratingFollowup, setIsGeneratingFollowup] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  
  // Pending response - waiting for user confirmation
  const [pendingResponse, setPendingResponse] = useState<{
    text: string;
    audioUrl?: string;
  } | null>(null);
  
  // Text input mode
  const [textInput, setTextInput] = useState('');
  
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Scope selection state
  const [showScopeSelector, setShowScopeSelector] = useState(false);
  const [pendingSaveData, setPendingSaveData] = useState<{ summary: string; photos?: File[] } | null>(null);
  const [scopeSelection, setScopeSelection] = useState<ScopeSelection>({ isPrivate: true, circleIds: [] });
  
  const modalRef = useRef<HTMLDivElement>(null);
  const introTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Clear intro state after animation
  useEffect(() => {
    if (viewState === 'intro') {
      introTimeoutRef.current = setTimeout(() => {
        setViewState('recording');
      }, 2000);
    }
    return () => {
      if (introTimeoutRef.current) clearTimeout(introTimeoutRef.current);
    };
  }, [viewState]);

  // Focus textarea in text mode
  useEffect(() => {
    if (inputMode === 'text' && textareaRef.current && viewState === 'recording') {
      textareaRef.current.focus();
    }
  }, [inputMode, viewState]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (viewState === 'confirming') {
          // Cancel confirmation, go back to recording
          setPendingResponse(null);
          setViewState('recording');
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, viewState]);

  // Generate follow-up question using AI
  const generateFollowUp = useCallback(async (
    previousExchanges: Exchange[],
    promptType: string
  ): Promise<string | null> => {
    try {
      setIsGeneratingFollowup(true);
      console.log('[Follow-up] Generating for type:', promptType, 'exchanges:', previousExchanges.length);
      
      const response = await fetch('/api/conversation/follow-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exchanges: previousExchanges,
          promptType,
          originalPrompt: prompt.promptText,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate follow-up');
      }

      const data = await response.json();
      console.log('[Follow-up] Response:', data);
      return data.shouldEnd ? null : data.followUpQuestion;
    } catch (err) {
      console.error('[Follow-up] Error generating follow-up:', err);
      return null;
    } finally {
      setIsGeneratingFollowup(false);
    }
  }, [prompt.promptText]);

  // Handle recording complete (recorded mode) - transcribe via API
  const handleRecordingComplete = useCallback(async (blob: Blob, duration: number, type: 'video' | 'audio') => {
    setIsTranscribing(true);
    setError(null);

    try {
      const formData = new FormData();
      // Use appropriate filename based on recording type
      const extension = type === 'video' ? 'webm' : 'webm';
      const filename = type === 'video' ? `recording.${extension}` : `recording.${extension}`;
      formData.append('audio', blob, filename);
      formData.append('mediaType', type); // Pass type for potential video handling

      const response = await fetch('/api/conversation/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Transcription failed');
      }

      const data = await response.json();
      const transcribedText = data.transcription || '';
      
      // Set pending response - user must confirm before we continue
      setPendingResponse({
        text: transcribedText,
        audioUrl: data.url,
      });
      setViewState('confirming');
      
    } catch (err) {
      console.error('Error processing recording:', err);
      setError('Failed to transcribe. Try again or type your response.');
    } finally {
      setIsTranscribing(false);
    }
  }, []);

  // Handle live transcript (Web Speech API mode) - skip transcription API
  const handleLiveTranscript = useCallback((text: string) => {
    if (!text.trim()) {
      setError('No speech detected. Try again.');
      return;
    }
    
    // Set pending response directly - no API call needed
    setPendingResponse({
      text: text,
      audioUrl: undefined, // No audio URL in live mode
    });
    setViewState('confirming');
  }, []);

  // Handle user confirming their response (after optional edit)
  const handleConfirmResponse = useCallback(async (confirmedText: string) => {
    console.log('[Confirm] handleConfirmResponse called with:', confirmedText.substring(0, 50) + '...');
    if (!confirmedText.trim()) {
      setError('Please enter a response before continuing.');
      return;
    }

    // Add confirmed response to exchanges
    const newExchange: Exchange = {
      question: currentQuestion,
      response: confirmedText,
      audioUrl: pendingResponse?.audioUrl,
      transcription: confirmedText,
    };

    const updatedExchanges = [...exchanges, newExchange];
    setExchanges(updatedExchanges);
    setPendingResponse(null);

    // Check if we should continue or go to review
    const checkpointInterval = 5; // Ask to continue every 5 questions
    const isCheckpoint = updatedExchanges.length > 0 && updatedExchanges.length % checkpointInterval === 0;
    
    if (isCheckpoint) {
      // Show continue prompt at every checkpoint
      setViewState('continue-prompt');
    } else {
      // Generate follow-up based on CONFIRMED text
      console.log('[Confirm] Calling generateFollowUp...');
      const followUp = await generateFollowUp(updatedExchanges, prompt.type);
      console.log('[Confirm] Follow-up result:', followUp);
      
      if (followUp) {
        setCurrentQuestion(followUp);
        setViewState('recording');
        setTextInput('');
      } else {
        // No more follow-ups needed
        console.log('[Confirm] No follow-up, going to review');
        setViewState('review');
      }
    }
  }, [currentQuestion, exchanges, generateFollowUp, pendingResponse, prompt.steps?.length, prompt.type]);

  // Handle text input submit
  const handleTextSubmit = useCallback(async () => {
    if (!textInput.trim()) return;
    
    // For text input, go directly to confirm (no transcription needed)
    setPendingResponse({ text: textInput });
    setViewState('confirming');
  }, [textInput]);

  // Handle re-record (discard current transcription)
  const handleReRecord = useCallback(() => {
    setPendingResponse(null);
    setViewState('recording');
    setError(null);
  }, []);

  // Handle skipping current question
  const handleSkip = useCallback(() => {
    if (exchanges.length === 0) {
      onClose();
      return;
    }
    setViewState('review');
  }, [exchanges.length, onClose]);

  // Handle continue prompt - user wants to keep going
  const handleContinue = useCallback(async () => {
    setIsGeneratingFollowup(true);
    const followUp = await generateFollowUp(exchanges, prompt.type);
    setIsGeneratingFollowup(false);
    
    if (followUp) {
      setCurrentQuestion(followUp);
      setViewState('recording');
      setTextInput('');
    } else {
      setViewState('review');
    }
  }, [exchanges, generateFollowUp, prompt.type]);

  // Handle continue prompt - user wants to finish
  const handleFinish = useCallback(() => {
    setViewState('review');
  }, []);

  // Handle review complete - show scope selector first
  const handleReviewComplete = useCallback(async (editedSummary: string, photos?: File[]) => {
    // Store the pending data and show scope selector
    setPendingSaveData({ summary: editedSummary, photos });
    setShowScopeSelector(true);
  }, []);

  // Handle scope selection and final save
  const handleScopeSelected = useCallback(async (selection: ScopeSelection) => {
    setScopeSelection(selection);
    setShowScopeSelector(false);
    
    if (!pendingSaveData) return;
    
    const { summary: editedSummary, photos } = pendingSaveData;
    setIsSaving(true);

    try {
      // First save the conversation with scope
      const response = await fetch('/api/conversation/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promptId: prompt.id,
          promptType: prompt.type,
          exchanges,
          summary: editedSummary,
          expectedXp,  // Pass expected XP for consistent awarding
          photoId: prompt.photoId,  // For photo_backstory prompts
          isPrivate: selection.isPrivate,
          circleIds: selection.circleIds,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save conversation');
      }

      const result = await response.json();

      // Upload photos if provided
      if (photos && photos.length > 0 && result.memoryId) {
        const formData = new FormData();
        formData.append('memoryId', result.memoryId);
        photos.forEach((photo, i) => {
          formData.append(`photos`, photo);
        });

        try {
          await fetch('/api/memories/upload-photos', {
            method: 'POST',
            body: formData,
          });
        } catch (photoError) {
          console.error('Failed to upload photos:', photoError);
          // Non-critical, continue anyway
        }
      }
      
      setViewState('complete');
      setPendingSaveData(null);
      
      setTimeout(() => {
        onComplete({
          exchanges,
          summary: editedSummary,
          knowledgeEntryId: result.knowledgeEntryId,
          memoryId: result.memoryId,
          xpAwarded: result.xpAwarded || expectedXp,
        });
      }, 1500);
    } catch (err) {
      console.error('Error saving conversation:', err);
      setError('Failed to save. Please try again.');
      setIsSaving(false);
    }
  }, [exchanges, onComplete, prompt.id, prompt.type, prompt.photoId, expectedXp, pendingSaveData]);

  // Handle discard
  const handleDiscard = useCallback(() => {
    if (confirm('Discard this conversation?')) {
      onClose();
    }
  }, [onClose]);

  // Toggle input mode
  const toggleInputMode = useCallback(() => {
    setInputMode(prev => prev === 'voice' ? 'text' : 'voice');
    setError(null);
  }, []);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="conversation-overlay"
        role="dialog"
        aria-modal="true"
        aria-label="Voice conversation"
      >
        <motion.div
          ref={modalRef}
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="conversation-modal"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="conversation-close-btn"
            aria-label="Close conversation"
          >
            <X size={20} />
          </button>

          {/* Intro */}
          {viewState === 'intro' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="conversation-intro"
            >
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="conversation-intro-icon"
              >
                <Sparkles size={48} className="text-[#4A7C59]" />
              </motion.div>
              <h2 className="conversation-intro-title">Let's capture your story</h2>
              <p className="conversation-intro-subtitle">
                Share your memories in your own words. You can edit your response before each follow-up question.
              </p>
            </motion.div>
          )}

          {/* Recording / Input */}
          {viewState === 'recording' && (
            <div className="conversation-recording">
              {/* Progress indicator */}
              <div className="conversation-progress">
                <div className="conversation-progress-bar">
                  <motion.div
                    className="conversation-progress-fill"
                    initial={{ width: '0%' }}
                    animate={{ width: `${(exchanges.length / 5) * 100}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <span className="conversation-progress-text">
                  {exchanges.length + 1} of up to 5 questions
                </span>
              </div>

              {/* Question display - TTS enabled with auto-speak */}
              <AnimatedQuestion
                question={currentQuestion}
                animate={true}
                isLoading={isGeneratingFollowup}
                enableTTS={true}
                autoSpeak={true}
                showAvatar={true}
                size="lg"
              />

              {/* Conversation history */}
              {exchanges.length > 0 && (
                <ConversationHistory exchanges={exchanges} />
              )}

              {/* Input mode toggle */}
              <div className="conversation-input-toggle">
                <button
                  onClick={toggleInputMode}
                  className={`input-mode-btn ${inputMode === 'voice' ? 'active' : ''}`}
                >
                  <Mic size={16} />
                  Record
                </button>
                <button
                  onClick={toggleInputMode}
                  className={`input-mode-btn ${inputMode === 'text' ? 'active' : ''}`}
                >
                  <Keyboard size={16} />
                  Type
                </button>
              </div>

              {/* Video/Voice recording input */}
              {inputMode === 'voice' && (
                isTranscribing ? (
                  <div className="conversation-transcribing">
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
                    isLoading={isGeneratingFollowup}
                    allowVideo={true}
                    defaultMode="voice"
                  />
                )
              )}

              {/* Text input */}
              {inputMode === 'text' && (
                <div className="conversation-text-input">
                  <textarea
                    ref={textareaRef}
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder="Type your response here..."
                    className="conversation-textarea"
                    rows={4}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                        handleTextSubmit();
                      }
                    }}
                  />
                  <div className="conversation-text-actions">
                    <button
                      onClick={handleSkip}
                      className="conversation-btn-secondary"
                    >
                      Skip
                    </button>
                    <button
                      onClick={handleTextSubmit}
                      disabled={!textInput.trim()}
                      className="conversation-btn-primary"
                    >
                      Continue (⌘↵)
                    </button>
                  </div>
                </div>
              )}

              {/* Error display */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="conversation-error"
                >
                  {error}
                </motion.div>
              )}
            </div>
          )}

          {/* Confirmation step - user reviews/edits transcription before continuing */}
          {viewState === 'confirming' && pendingResponse && (
            <div className="conversation-confirming">
              {/* Show the question they answered */}
              <AnimatedQuestion
                question={currentQuestion}
                animate={false}
                isLoading={false}
                enableTTS={false}
                showAvatar={true}
                size="lg"
              />

              {/* Editable transcription preview */}
              <TranscriptionPreview
                text={pendingResponse.text}
                onEdit={(newText) => setPendingResponse({ ...pendingResponse, text: newText })}
                onContinue={() => handleConfirmResponse(pendingResponse.text)}
                onReRecord={handleReRecord}
                showReRecord={!!pendingResponse.audioUrl}
              />

              {/* Generating follow-up indicator */}
              {isGeneratingFollowup && (
                <div className="conversation-generating">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <Sparkles size={20} className="text-[#4A7C59]" />
                  </motion.div>
                  <span>Thinking of a follow-up question...</span>
                </div>
              )}

              {/* Error display */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="conversation-error"
                >
                  {error}
                </motion.div>
              )}
            </div>
          )}

          {/* Continue Prompt - asked every 5 questions */}
          {viewState === 'continue-prompt' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="conversation-continue-prompt"
            >
              <div className="conversation-continue-icon">
                <Sparkles size={32} className="text-[#4A7C59]" />
              </div>
              <h2 className="conversation-continue-title">Great progress!</h2>
              <p className="conversation-continue-text">
                You've answered {exchanges.length} questions. Would you like to keep going or save what you have?
              </p>
              <div className="conversation-continue-actions">
                <button
                  onClick={handleFinish}
                  className="conversation-continue-btn conversation-continue-btn-secondary"
                >
                  Save & Finish
                </button>
                <button
                  onClick={handleContinue}
                  disabled={isGeneratingFollowup}
                  className="conversation-continue-btn conversation-continue-btn-primary"
                >
                  {isGeneratingFollowup ? (
                    <>
                      <motion.span
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      >
                        <Sparkles size={16} />
                      </motion.span>
                      Generating...
                    </>
                  ) : (
                    <>Keep Going</>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* Review */}
          {viewState === 'review' && (
            <ReviewScreen
              exchanges={exchanges}
              promptType={prompt.type}
              expectedXp={expectedXp}
              onSave={handleReviewComplete}
              onDiscard={handleDiscard}
              isSaving={isSaving}
            />
          )}

          {/* Complete */}
          {viewState === 'complete' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="conversation-complete"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 15 }}
                className="conversation-complete-icon"
              >
                ✓
              </motion.div>
              <h2 className="conversation-complete-title">Memory saved</h2>
              <p className="conversation-complete-subtitle">
                Your story has been added to your memories.
              </p>
              <div className="conversation-complete-xp">
                <Sparkles size={16} />
                +{expectedXp} XP earned
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Scope Selector Modal */}
        <ScopeSelector
          isOpen={showScopeSelector}
          onClose={() => {
            setShowScopeSelector(false);
            // If closed without saving, default to private and continue
            handleScopeSelected({ isPrivate: true, circleIds: [] });
          }}
          onSave={handleScopeSelected}
          contentType="conversation"
          title="Share this memory?"
        />
      </motion.div>
    </AnimatePresence>
  );
}
