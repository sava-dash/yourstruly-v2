'use client';

import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/admin/Tabs';
import { 
  Bot, Cpu, MessageSquare, Mic, Settings, Zap, 
  CheckCircle, XCircle, Save, RefreshCw, Play,
  AlertTriangle, Database, FileText
} from 'lucide-react';

interface AIConfig {
  embeddingProvider: string;
  chatProvider: string;
  models: {
    embedding: string;
    chat: string;
  };
  ollamaUrl: string;
  embeddingDimensions: number;
  apiKeyStatus: {
    anthropic: boolean;
    gemini: boolean;
    openai: boolean;
    elevenlabs: boolean;
  };
}

interface Props {
  initialConfig: AIConfig;
  settings: any[];
  promptCount: number;
}

const AVAILABLE_MODELS = {
  chat: [
    { id: 'claude-sonnet-4-20250514', name: 'Claude 4 Sonnet', provider: 'anthropic', description: 'Best for warm, personal responses' },
    { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', provider: 'anthropic', description: 'Fast, capable' },
    { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', provider: 'anthropic', description: 'Most capable, slower' },
    { id: 'gpt-4-turbo-preview', name: 'GPT-4 Turbo', provider: 'openai', description: 'OpenAI flagship' },
    { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', description: 'Multimodal' },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'google', description: 'Long context' },
  ],
  embedding: [
    { id: 'gemini-embedding-001', name: 'Gemini Embedding', provider: 'google', dimensions: 768, description: 'Free tier available' },
    { id: 'text-embedding-3-small', name: 'OpenAI Small', provider: 'openai', dimensions: 1536, description: 'Fast, cheap' },
    { id: 'text-embedding-3-large', name: 'OpenAI Large', provider: 'openai', dimensions: 3072, description: 'Best quality' },
    { id: 'nomic-embed-text', name: 'Nomic (Ollama)', provider: 'ollama', dimensions: 768, description: 'Local, free' },
  ],
  voice: [
    { id: 'eleven_multilingual_v2', name: 'ElevenLabs v2', provider: 'elevenlabs', description: 'Best quality' },
    { id: 'eleven_turbo_v2', name: 'ElevenLabs Turbo', provider: 'elevenlabs', description: 'Faster, cheaper' },
  ],
};

const DEFAULT_SYSTEM_PROMPT = `You are a warm, thoughtful AI companion for YoursTruly - a digital legacy platform where people document their lives, memories, and relationships.

You have access to the user's personal content: their memories, contacts, life events, pets, and more. When answering questions, draw from this context to give personalized, meaningful responses.

Guidelines:
- Be warm and personal, like a trusted friend who knows their story
- Reference specific details from their memories and relationships when relevant
- If you don't have enough context, say so honestly but kindly
- Help them reflect on and appreciate their life journey
- Keep responses concise but heartfelt (2-3 paragraphs max)
- When mentioning specific memories or people, be specific about dates and details
- Use a conversational, caring tone - you're helping them explore their own life

You're not just an AI - you're their digital companion helping them preserve and explore their life story.`;

const INTERVIEW_SYSTEM_PROMPT = `You are conducting a warm, thoughtful interview to capture someone's life stories and memories for the YoursTruly platform.

Your role:
- Ask follow-up questions that dig deeper into stories
- Show genuine curiosity and warmth
- Help them recall specific details (dates, places, feelings)
- Celebrate their experiences and wisdom
- Keep the conversation flowing naturally

Interview style:
- Start with open-ended questions
- Follow interesting threads
- Ask "Tell me more about..." when stories emerge
- Acknowledge emotions appropriately
- End segments with summary confirmations`;

export default function AIConfigDashboard({ initialConfig, settings, promptCount }: Props) {
  const [config, setConfig] = useState(initialConfig);
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [interviewPrompt, setInterviewPrompt] = useState(INTERVIEW_SYSTEM_PROMPT);
  const [isSaving, setIsSaving] = useState(false);
  const [testMessage, setTestMessage] = useState('');
  const [testResponse, setTestResponse] = useState('');
  const [isTesting, setIsTesting] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/admin/ai/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config, systemPrompt, interviewPrompt }),
      });
      if (!response.ok) throw new Error('Failed to save');
      // Show success
    } catch (error) {
      console.error('Save failed:', error);
    }
    setIsSaving(false);
  };

  const handleTest = async () => {
    if (!testMessage.trim()) return;
    setIsTesting(true);
    setTestResponse('');
    try {
      const response = await fetch('/api/admin/ai/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: testMessage,
          model: config.models.chat,
          systemPrompt,
        }),
      });
      const data = await response.json();
      setTestResponse(data.response || data.error || 'No response');
    } catch (error) {
      setTestResponse('Test failed: ' + (error as Error).message);
    }
    setIsTesting(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#2a1f1a]">AI Configuration</h1>
          <p className="text-[#2a1f1a]/60 mt-1">Configure AI models, prompts, and voice settings</p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-4 py-2 bg-[#2D5A3D] text-white rounded-xl hover:bg-[#2D5A3D]/90 disabled:opacity-50"
        >
          {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save All Changes
        </button>
      </div>

      {/* API Key Status */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(config.apiKeyStatus).map(([provider, isSet]) => (
          <div key={provider} className="p-4 bg-white/60 rounded-xl border border-[#B8562E]/10">
            <div className="flex items-center gap-2">
              {isSet ? (
                <CheckCircle className="w-5 h-5 text-[#2D5A3D]" />
              ) : (
                <XCircle className="w-5 h-5 text-[#B8562E]" />
              )}
              <span className="text-sm font-medium capitalize">{provider}</span>
            </div>
            <p className="text-xs text-[#2a1f1a]/50 mt-1">
              {isSet ? 'API key configured' : 'Not configured'}
            </p>
          </div>
        ))}
      </div>

      <Tabs defaultValue="models">
        <TabsList>
          <TabsTrigger value="models"><Cpu className="w-4 h-4 mr-2" />Models</TabsTrigger>
          <TabsTrigger value="prompts"><MessageSquare className="w-4 h-4 mr-2" />System Prompts</TabsTrigger>
          <TabsTrigger value="interview"><Bot className="w-4 h-4 mr-2" />Interview AI</TabsTrigger>
          <TabsTrigger value="voice"><Mic className="w-4 h-4 mr-2" />Voice</TabsTrigger>
          <TabsTrigger value="test"><Zap className="w-4 h-4 mr-2" />Test</TabsTrigger>
        </TabsList>

        {/* Models Tab */}
        <TabsContent value="models" className="space-y-6">
          {/* Chat Model */}
          <div className="p-6 bg-white/60 rounded-xl border border-[#B8562E]/10">
            <h3 className="text-lg font-semibold text-[#2a1f1a] mb-4">Chat Model</h3>
            <p className="text-sm text-[#2a1f1a]/60 mb-4">Primary model for conversations and memory assistance</p>
            
            <div className="grid gap-3">
              {AVAILABLE_MODELS.chat.map((model) => (
                <label
                  key={model.id}
                  className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                    config.models.chat === model.id 
                      ? 'border-[#2D5A3D] bg-[#2D5A3D]/5' 
                      : 'border-[#B8562E]/10 hover:border-[#2D5A3D]/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="chatModel"
                    value={model.id}
                    checked={config.models.chat === model.id}
                    onChange={(e) => setConfig({ ...config, models: { ...config.models, chat: e.target.value } })}
                    className="w-4 h-4 text-[#2D5A3D]"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-[#2a1f1a]">{model.name}</span>
                      <span className="px-2 py-0.5 text-xs bg-[#8DACAB]/20 text-[#8DACAB] rounded-full">
                        {model.provider}
                      </span>
                    </div>
                    <p className="text-sm text-[#2a1f1a]/50">{model.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Embedding Model */}
          <div className="p-6 bg-white/60 rounded-xl border border-[#B8562E]/10">
            <h3 className="text-lg font-semibold text-[#2a1f1a] mb-4">Embedding Model</h3>
            <p className="text-sm text-[#2a1f1a]/60 mb-4">Used for semantic search in memories</p>
            
            <div className="grid gap-3">
              {AVAILABLE_MODELS.embedding.map((model) => (
                <label
                  key={model.id}
                  className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                    config.models.embedding === model.id 
                      ? 'border-[#2D5A3D] bg-[#2D5A3D]/5' 
                      : 'border-[#B8562E]/10 hover:border-[#2D5A3D]/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="embeddingModel"
                    value={model.id}
                    checked={config.models.embedding === model.id}
                    onChange={(e) => setConfig({ ...config, models: { ...config.models, embedding: e.target.value } })}
                    className="w-4 h-4 text-[#2D5A3D]"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-[#2a1f1a]">{model.name}</span>
                      <span className="px-2 py-0.5 text-xs bg-[#8DACAB]/20 text-[#8DACAB] rounded-full">
                        {model.dimensions} dim
                      </span>
                    </div>
                    <p className="text-sm text-[#2a1f1a]/50">{model.description}</p>
                  </div>
                </label>
              ))}
            </div>
            
            <div className="mt-4 p-3 bg-[#C4A235]/10 rounded-lg border border-[#C4A235]/20">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-[#C4A235] mt-0.5" />
                <p className="text-sm text-[#2a1f1a]/70">
                  Changing embedding model requires re-indexing all memories. Current dimension: {config.embeddingDimensions}
                </p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* System Prompts Tab */}
        <TabsContent value="prompts" className="space-y-6">
          <div className="p-6 bg-white/60 rounded-xl border border-[#B8562E]/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[#2a1f1a]">Main Chat System Prompt</h3>
              <button
                onClick={() => setSystemPrompt(DEFAULT_SYSTEM_PROMPT)}
                className="text-sm text-[#2D5A3D] hover:underline"
              >
                Reset to default
              </button>
            </div>
            <p className="text-sm text-[#2a1f1a]/60 mb-4">
              This prompt defines how the AI behaves in the main chat interface
            </p>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={12}
              className="w-full px-4 py-3 bg-white border border-[#B8562E]/10 rounded-xl text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/20"
            />
            <p className="text-xs text-[#2a1f1a]/40 mt-2">
              {systemPrompt.length} characters
            </p>
          </div>

          <div className="p-6 bg-white/60 rounded-xl border border-[#B8562E]/10">
            <h3 className="text-lg font-semibold text-[#2a1f1a] mb-4">Engagement Prompts</h3>
            <div className="flex items-center gap-4">
              <div className="p-4 bg-[#2D5A3D]/10 rounded-xl">
                <FileText className="w-8 h-8 text-[#2D5A3D]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#2a1f1a]">{promptCount}</p>
                <p className="text-sm text-[#2a1f1a]/60">Prompt templates configured</p>
              </div>
              <a
                href="/admin/engagement"
                className="ml-auto px-4 py-2 bg-[#2D5A3D]/10 text-[#2D5A3D] rounded-xl text-sm font-medium hover:bg-[#2D5A3D]/20"
              >
                Manage Prompts →
              </a>
            </div>
          </div>
        </TabsContent>

        {/* Interview AI Tab */}
        <TabsContent value="interview" className="space-y-6">
          <div className="p-6 bg-white/60 rounded-xl border border-[#B8562E]/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[#2a1f1a]">Interview System Prompt</h3>
              <button
                onClick={() => setInterviewPrompt(INTERVIEW_SYSTEM_PROMPT)}
                className="text-sm text-[#2D5A3D] hover:underline"
              >
                Reset to default
              </button>
            </div>
            <p className="text-sm text-[#2a1f1a]/60 mb-4">
              This prompt guides the AI during voice interviews with loved ones
            </p>
            <textarea
              value={interviewPrompt}
              onChange={(e) => setInterviewPrompt(e.target.value)}
              rows={10}
              className="w-full px-4 py-3 bg-white border border-[#B8562E]/10 rounded-xl text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/20"
            />
          </div>

          <div className="p-6 bg-white/60 rounded-xl border border-[#B8562E]/10">
            <h3 className="text-lg font-semibold text-[#2a1f1a] mb-4">Interview Settings</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#2a1f1a] mb-2">
                  Follow-up Question Depth
                </label>
                <select className="w-full px-4 py-2 bg-white border border-[#B8562E]/10 rounded-xl">
                  <option value="1">Light (1-2 follow-ups)</option>
                  <option value="2">Medium (2-3 follow-ups)</option>
                  <option value="3">Deep (3-5 follow-ups)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#2a1f1a] mb-2">
                  Conversation Temperature
                </label>
                <select className="w-full px-4 py-2 bg-white border border-[#B8562E]/10 rounded-xl">
                  <option value="0.5">Focused (0.5)</option>
                  <option value="0.7">Balanced (0.7)</option>
                  <option value="0.9">Creative (0.9)</option>
                </select>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Voice Tab */}
        <TabsContent value="voice" className="space-y-6">
          <div className="p-6 bg-white/60 rounded-xl border border-[#B8562E]/10">
            <h3 className="text-lg font-semibold text-[#2a1f1a] mb-4">Voice Cloning (ElevenLabs)</h3>
            <div className="flex items-center gap-2 mb-4">
              {config.apiKeyStatus.elevenlabs ? (
                <CheckCircle className="w-5 h-5 text-[#2D5A3D]" />
              ) : (
                <XCircle className="w-5 h-5 text-[#B8562E]" />
              )}
              <span className={config.apiKeyStatus.elevenlabs ? 'text-[#2D5A3D]' : 'text-[#B8562E]'}>
                {config.apiKeyStatus.elevenlabs ? 'Connected' : 'API key not configured'}
              </span>
            </div>
            
            <div className="grid gap-3">
              {AVAILABLE_MODELS.voice.map((model) => (
                <label
                  key={model.id}
                  className="flex items-center gap-4 p-4 rounded-xl border border-[#B8562E]/10 hover:border-[#2D5A3D]/50 cursor-pointer"
                >
                  <input type="radio" name="voiceModel" className="w-4 h-4 text-[#2D5A3D]" />
                  <div>
                    <span className="font-medium text-[#2a1f1a]">{model.name}</span>
                    <p className="text-sm text-[#2a1f1a]/50">{model.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="p-6 bg-white/60 rounded-xl border border-[#B8562E]/10">
            <h3 className="text-lg font-semibold text-[#2a1f1a] mb-4">Voice Clone Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#2a1f1a] mb-2">
                  Minimum Audio Duration (for cloning)
                </label>
                <input
                  type="number"
                  defaultValue={30}
                  className="w-full px-4 py-2 bg-white border border-[#B8562E]/10 rounded-xl"
                />
                <p className="text-xs text-[#2a1f1a]/50 mt-1">Seconds of audio required to create a voice clone</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#2a1f1a] mb-2">
                  Voice Stability
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  defaultValue={75}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-[#2a1f1a]/50">
                  <span>Variable</span>
                  <span>Stable</span>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Test Tab */}
        <TabsContent value="test" className="space-y-6">
          <div className="p-6 bg-white/60 rounded-xl border border-[#B8562E]/10">
            <h3 className="text-lg font-semibold text-[#2a1f1a] mb-4">Test AI Configuration</h3>
            <p className="text-sm text-[#2a1f1a]/60 mb-4">
              Send a test message to verify your AI configuration is working
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#2a1f1a] mb-2">
                  Test Message
                </label>
                <textarea
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  rows={3}
                  placeholder="Enter a test message to send to the AI..."
                  className="w-full px-4 py-3 bg-white border border-[#B8562E]/10 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/20"
                />
              </div>
              
              <button
                onClick={handleTest}
                disabled={isTesting || !testMessage.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-[#2D5A3D] text-white rounded-xl hover:bg-[#2D5A3D]/90 disabled:opacity-50"
              >
                {isTesting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                {isTesting ? 'Testing...' : 'Send Test'}
              </button>

              {testResponse && (
                <div className="p-4 bg-[#F5F3EE] rounded-xl border border-[#B8562E]/10">
                  <div className="flex items-center gap-2 mb-2">
                    <Bot className="w-4 h-4 text-[#2D5A3D]" />
                    <span className="text-sm font-medium text-[#2a1f1a]">Response</span>
                  </div>
                  <p className="text-sm text-[#2a1f1a]/80 whitespace-pre-wrap">{testResponse}</p>
                </div>
              )}
            </div>
          </div>

          <div className="p-6 bg-white/60 rounded-xl border border-[#B8562E]/10">
            <h3 className="text-lg font-semibold text-[#2a1f1a] mb-4">Current Configuration</h3>
            <pre className="p-4 bg-[#2a1f1a] text-[#F5F3EE] rounded-xl text-sm overflow-x-auto">
              {JSON.stringify(config, null, 2)}
            </pre>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
