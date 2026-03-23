/**
 * Prompt System Types
 * 
 * Unified type definitions for the prompt bank — bridging
 * static templates (prompt_templates) and user-specific instances (engagement_prompts).
 */

/** How a prompt was created */
export type PromptSource =
  | 'template'         // Generated from a prompt_template record
  | 'ai_generated'     // Created by AI (e.g., Gemini photo analysis)
  | 'photo_trigger'    // Auto-created by DB trigger on photo upload
  | 'photo_upload'     // Created via /api/engagement/generate-photo-prompt
  | 'profile_based'    // Generated from user profile data
  | 'conditional'      // Template with conditional_query that matched
  | 'category_photo'   // Photo prompt injected per category
  | 'onboarding_upload' // Created during onboarding photo upload

/** A prompt template (admin-managed, static) */
export interface PromptTemplate {
  id: string
  type: string
  category: string | null
  subcategory: string | null
  promptText: string
  variations: string[]
  isActive: boolean
  priorityBoost: number
  cooldownDays: number
  seasonalMonths: number[]
  anniversaryBased: boolean
  conditionalQuery: string | null
  targeting: {
    interest: string | null
    skill: string | null
    hobby: string | null
    religion: string | null
    field: string | null
  }
  createdAt: string
  updatedAt: string
}

/** A user-specific prompt instance (may or may not trace to a template) */
export interface PromptInstance {
  id: string
  userId: string
  type: string
  category: string | null
  lifeChapter: string | null
  promptText: string
  status: 'pending' | 'answered' | 'skipped' | 'dismissed'
  priority: number
  source: PromptSource
  templateId: string | null  // Links back to prompt_templates.id
  photoId: string | null
  contactId: string | null
  memoryId: string | null
  missingField: string | null
  metadata: Record<string, any> | null
  personalizationContext: Record<string, any> | null
  createdAt: string
  answeredAt: string | null
}

/** Unified view combining template + instance data */
export interface PromptDefinition {
  id: string
  source: PromptSource
  type: string
  category: string | null
  promptText: string
  variations: string[]
  metadata: Record<string, any>
  // Lineage
  templateId: string | null
  generatedBy: string | null  // 'gemini', 'db_trigger', etc.
  conditions: string | null   // SQL conditional_query if applicable
}

/** Lineage trace for a prompt instance */
export interface PromptLineage {
  instance: PromptInstance
  template: PromptTemplate | null
  generationContext: {
    source: PromptSource
    generatedBy: string | null
    generatedAt: string
    photoUrl?: string
    contactName?: string
  }
}

/** Options for creating a prompt from a template */
export interface CreateFromTemplateOptions {
  userId: string
  templateId: string
  photoId?: string
  contactId?: string
  memoryId?: string
  priority?: number
  lifeChapter?: string
  metadata?: Record<string, any>
  personalizationContext?: Record<string, any>
}

/** Options for creating an AI-generated prompt */
export interface CreateAIPromptOptions {
  userId: string
  promptText: string
  type: string
  category?: string
  photoId?: string
  contactId?: string
  priority?: number
  source?: PromptSource
  generatedBy?: string  // 'gemini', 'claude', etc.
  metadata?: Record<string, any>
}
