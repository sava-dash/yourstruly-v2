/**
 * AI Provider Abstraction
 * 
 * Easy to switch between providers based on cost/quality needs.
 * Currently using:
 * - Gemini for embeddings (free tier)
 * - Claude for chat (best for personal, warm responses)
 * 
 * To switch providers, just change the functions below.
 */

import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'

// ============================================
// CONFIGURATION - Change these to switch providers
// ============================================

export const AI_CONFIG = {
  // Embedding provider: 'ollama' | 'gemini' | 'openai' | 'voyage' | 'cohere'
  embeddingProvider: 'gemini' as 'ollama' | 'gemini' | 'openai' | 'voyage' | 'cohere',
  
  // Chat provider: 'claude' | 'openai' | 'gemini'
  chatProvider: 'claude' as const,
  
  // Model settings
  models: {
    ollamaEmbedding: 'nomic-embed-text', // Free, local, 768 dimensions
    claudeChat: 'claude-sonnet-4-20250514', // Claude 4 Sonnet
  },
  
  // Ollama server URL (for when using Ollama)
  ollamaUrl: process.env.OLLAMA_URL || 'http://192.168.4.24:11434',
  
  // Embedding dimensions (must match your pgvector column!)
  // Gemini embedding-001 = 768 dimensions
  // Ollama nomic-embed-text = 768 dimensions
  // OpenAI text-embedding-3-small = 1536 dimensions
  embeddingDimensions: 768,
}

// ============================================
// EMBEDDING FUNCTIONS
// ============================================

const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function generateEmbedding(text: string): Promise<number[]> {
  const provider = AI_CONFIG.embeddingProvider
  
  switch (provider) {
    case 'ollama':
      return generateOllamaEmbedding(text)
    case 'gemini':
      return generateGeminiEmbedding(text)
    default:
      throw new Error(`Unknown embedding provider: ${provider}`)
  }
}

async function generateOllamaEmbedding(text: string): Promise<number[]> {
  const response = await fetch(`${AI_CONFIG.ollamaUrl}/api/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: AI_CONFIG.models.ollamaEmbedding,
      prompt: text.slice(0, 8000), // nomic-embed-text context limit
    }),
  })
  
  if (!response.ok) {
    throw new Error(`Ollama error: ${response.status} ${response.statusText}`)
  }
  
  const data = await response.json()
  return data.embedding
}

async function generateGeminiEmbedding(text: string): Promise<number[]> {
  // gemini-embedding-001 defaults to 3072 dims. Our pgvector columns are
  // vector(768), so we ask Gemini to truncate (Matryoshka) to match.
  // Dimension drift here silently breaks RAG inserts with "expected 768
  // dimensions, not 3072" — keep these in lockstep with AI_CONFIG.
  const model = gemini.getGenerativeModel({ model: 'gemini-embedding-001' })
  // outputDimensionality is supported at runtime but not in the SDK's
  // type — cast to satisfy the type checker.
  const result = await model.embedContent({
    content: { role: 'user', parts: [{ text: text.slice(0, 10000) }] },
    outputDimensionality: AI_CONFIG.embeddingDimensions,
  } as any)
  return result.embedding.values
}

// ============================================
// CHAT FUNCTIONS
// ============================================

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatOptions {
  systemPrompt: string
  context?: string
  history?: ChatMessage[]
  maxTokens?: number
  temperature?: number
}

export async function generateChatResponse(
  message: string,
  options: ChatOptions
): Promise<string> {
  const provider = AI_CONFIG.chatProvider
  
  switch (provider) {
    case 'claude':
      return generateClaudeResponse(message, options)
    default:
      throw new Error(`Unknown chat provider: ${provider}`)
  }
}

async function generateClaudeResponse(
  message: string,
  options: ChatOptions
): Promise<string> {
  // Build system prompt with context
  let systemPrompt = options.systemPrompt
  if (options.context) {
    systemPrompt += `\n\nHere is relevant context from the user's life data:\n\n${options.context}`
  }

  // Build message history
  const messages: { role: 'user' | 'assistant'; content: string }[] = []
  
  if (options.history) {
    for (const msg of options.history) {
      messages.push({ role: msg.role, content: msg.content })
    }
  }
  
  messages.push({ role: 'user', content: message })

  const response = await anthropic.messages.create({
    model: AI_CONFIG.models.claudeChat,
    max_tokens: options.maxTokens || 1000,
    temperature: options.temperature || 0.7,
    system: systemPrompt,
    messages,
  })

  // Extract text from response
  const textBlock = response.content.find(block => block.type === 'text')
  return textBlock?.type === 'text' ? textBlock.text : 'I apologize, I could not generate a response.'
}

// ============================================
// UTILITY: Check if providers are configured
// ============================================

export function checkProviderConfig(): { embeddings: boolean; chat: boolean; errors: string[] } {
  const errors: string[] = []
  
  // Check embedding provider
  let embeddingsReady = false
  if (AI_CONFIG.embeddingProvider === 'ollama') {
    // Ollama doesn't need API key, just needs to be reachable
    embeddingsReady = true
  } else if (AI_CONFIG.embeddingProvider === 'gemini') {
    if (process.env.GEMINI_API_KEY) {
      embeddingsReady = true
    } else {
      errors.push('GEMINI_API_KEY not set')
    }
  }
  
  // Check chat provider
  let chatReady = false
  if (AI_CONFIG.chatProvider === 'claude') {
    if (process.env.ANTHROPIC_API_KEY) {
      chatReady = true
    } else {
      errors.push('ANTHROPIC_API_KEY not set')
    }
  }
  
  return { embeddings: embeddingsReady, chat: chatReady, errors }
}
