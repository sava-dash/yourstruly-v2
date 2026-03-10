'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles } from 'lucide-react';
import { ConversationEngine } from '@/components/conversation-engine';
import { createClient } from '@/lib/supabase/client';
import type { EngineState } from '@/lib/conversation-engine/types';

interface EngagementPrompt {
  id: string;
  type: string;
  promptText: string;
  photoUrl?: string;
  photoId?: string;
  contactId?: string;
  contactName?: string;
}

interface EngagementConversationModalProps {
  prompt: EngagementPrompt;
  expectedXp?: number;
  onComplete: (result: {
    exchanges: Array<{ question: string; response: string; audioUrl?: string }>;
    summary: string;
    knowledgeEntryId?: string;
    memoryId?: string;
    xpAwarded: number;
  }) => void;
  onClose: () => void;
}

export function EngagementConversationModal({
  prompt,
  expectedXp = 15,
  onComplete,
  onClose,
}: EngagementConversationModalProps) {
  const [userName, setUserName] = useState('Friend');
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const supabase = createClient();

  // Get user's name
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.user_metadata?.full_name) {
        setUserName(user.user_metadata.full_name.split(' ')[0]);
      } else if (user?.user_metadata?.name) {
        setUserName(user.user_metadata.name.split(' ')[0]);
      }
    });
  }, [supabase]);

  const handleComplete = useCallback(async (engineState: EngineState) => {
    if (isSaving) return;
    setIsSaving(true);

    try {
      // Convert engine messages to exchanges format
      const exchanges: Array<{ question: string; response: string }> = [];
      const msgs = engineState.messages;
      for (let i = 0; i < msgs.length; i++) {
        if (msgs[i].role === 'assistant' && msgs[i + 1]?.role === 'user') {
          exchanges.push({
            question: msgs[i].content,
            response: msgs[i + 1].content,
          });
        }
      }

      // Build summary from candidate narrative or messages
      const summary = engineState.activeCandidate?.narrative ||
        exchanges.map(e => e.response).join(' ');

      // Save via conversation/save endpoint to get memoryId and XP
      const response = await fetch('/api/conversation/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promptId: prompt.id,
          promptType: prompt.type,
          exchanges,
          summary,
          expectedXp,
          photoId: prompt.photoId,
          isPrivate: true,
          circleIds: [],
        }),
      });

      if (!response.ok) throw new Error('Failed to save');
      const result = await response.json();

      setSaved(true);
      setTimeout(() => {
        onComplete({
          exchanges,
          summary,
          knowledgeEntryId: result.knowledgeEntryId,
          memoryId: result.memoryId,
          xpAwarded: result.xpAwarded || expectedXp,
        });
      }, 1200);
    } catch (err) {
      console.error('Failed to save conversation:', err);
      setIsSaving(false);
    }
  }, [prompt, expectedXp, onComplete, isSaving]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="conversation-overlay"
        role="dialog"
        aria-modal="true"
      >
        <motion.div
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

          {/* Photo context if available */}
          {prompt.photoUrl && (
            <div className="flex justify-center mb-4">
              <img
                src={prompt.photoUrl}
                alt=""
                className="w-24 h-24 rounded-xl object-cover shadow-md"
              />
            </div>
          )}

          {saved ? (
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
              <h2 className="conversation-complete-title">Memory Saved!</h2>
              <div className="conversation-complete-xp">
                <Sparkles size={16} />
                +{expectedXp} XP earned
              </div>
            </motion.div>
          ) : (
            <ConversationEngine
              context="engagement"
              userName={userName}
              initialMessage={prompt.promptText}
              onComplete={handleComplete}
              onSkip={onClose}
              showSkip={true}
              maxHeight="50vh"
            />
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
