/**
 * Prompt Registry
 * 
 * Unified application-layer abstraction over:
 * - prompt_templates (admin-managed static templates)
 * - engagement_prompts (user-specific instances)
 * - AI-generated prompts (Gemini photo analysis, etc.)
 * 
 * The DB-level functions (generate_engagement_prompts, shuffle_engagement_prompts)
 * remain as-is. This registry provides a clean TypeScript API for:
 * - Querying templates and instances with proper typing
 * - Creating prompts with correct source tracking
 * - Tracing prompt lineage (instance → template → generation context)
 */

import { createClient } from '@/lib/supabase/server'
import type {
  PromptTemplate,
  PromptInstance,
  PromptDefinition,
  PromptLineage,
  PromptSource,
  CreateFromTemplateOptions,
  CreateAIPromptOptions,
} from './types'

// =============================================================================
// TEMPLATE QUERIES
// =============================================================================

/** Fetch active prompt templates, optionally filtered by type/category */
export async function getActiveTemplates(
  type?: string,
  category?: string
): Promise<PromptTemplate[]> {
  const supabase = await createClient()

  let query = supabase
    .from('prompt_templates')
    .select('*')
    .eq('is_active', true)

  if (type) query = query.eq('type', type)
  if (category) query = query.eq('category', category)

  const { data, error } = await query.order('priority_boost', { ascending: false })

  if (error) {
    console.error('Failed to fetch templates:', error)
    return []
  }

  return (data || []).map(mapTemplate)
}

/** Get a single template by ID */
export async function getTemplate(templateId: string): Promise<PromptTemplate | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('prompt_templates')
    .select('*')
    .eq('id', templateId)
    .single()

  if (error || !data) return null
  return mapTemplate(data)
}

// =============================================================================
// INSTANCE QUERIES
// =============================================================================

/** Fetch generated prompt instances for a user */
export async function getGeneratedPrompts(
  userId: string,
  options?: { type?: string; category?: string; status?: string; limit?: number }
): Promise<PromptInstance[]> {
  const supabase = await createClient()

  let query = supabase
    .from('engagement_prompts')
    .select('*')
    .eq('user_id', userId)

  if (options?.type) query = query.eq('type', options.type)
  if (options?.category) query = query.eq('category', options.category)
  if (options?.status) query = query.eq('status', options.status)

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit(options?.limit || 100)

  if (error) {
    console.error('Failed to fetch generated prompts:', error)
    return []
  }

  return (data || []).map(mapInstance)
}

/** Unified view: all prompts for a user (templates + instances merged) */
export async function getAllPrompts(userId: string): Promise<PromptDefinition[]> {
  const [templates, instances] = await Promise.all([
    getActiveTemplates(),
    getGeneratedPrompts(userId, { limit: 500 }),
  ])

  const definitions: PromptDefinition[] = []

  // Add templates as definitions
  for (const t of templates) {
    definitions.push({
      id: `template:${t.id}`,
      source: t.conditionalQuery ? 'conditional' : 'template',
      type: t.type,
      category: t.category,
      promptText: t.promptText,
      variations: t.variations,
      metadata: { targeting: t.targeting },
      templateId: t.id,
      generatedBy: null,
      conditions: t.conditionalQuery,
    })
  }

  // Add instances as definitions (with lineage info)
  for (const i of instances) {
    definitions.push({
      id: `instance:${i.id}`,
      source: i.source,
      type: i.type,
      category: i.category,
      promptText: i.promptText,
      variations: [],
      metadata: i.metadata || {},
      templateId: i.templateId,
      generatedBy: i.metadata?.generated_by || null,
      conditions: null,
    })
  }

  return definitions
}

// =============================================================================
// PROMPT CREATION
// =============================================================================

/** Create an engagement prompt from a template */
export async function createPromptFromTemplate(
  options: CreateFromTemplateOptions
): Promise<PromptInstance | null> {
  const template = await getTemplate(options.templateId)
  if (!template) {
    console.error(`Template not found: ${options.templateId}`)
    return null
  }

  // Pick prompt text (random variation or base text)
  const promptText =
    template.variations.length > 0
      ? template.variations[Math.floor(Math.random() * template.variations.length)]
      : template.promptText

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('engagement_prompts')
    .insert({
      user_id: options.userId,
      type: template.type,
      category: template.category,
      prompt_text: promptText,
      prompt_template_id: template.id,
      photo_id: options.photoId || null,
      contact_id: options.contactId || null,
      memory_id: options.memoryId || null,
      status: 'pending',
      priority: options.priority ?? template.priorityBoost,
      life_chapter: options.lifeChapter || null,
      source: template.conditionalQuery ? 'conditional' : 'template',
      metadata: options.metadata || null,
      personalization_context: options.personalizationContext || null,
    })
    .select()
    .single()

  if (error) {
    console.error('Failed to create prompt from template:', error)
    return null
  }

  return mapInstance(data)
}

/** Create an AI-generated prompt (no template) */
export async function createAIPrompt(
  options: CreateAIPromptOptions
): Promise<PromptInstance | null> {
  const supabase = await createClient()

  const source: PromptSource = options.source || 'ai_generated'

  const { data, error } = await supabase
    .from('engagement_prompts')
    .insert({
      user_id: options.userId,
      type: options.type,
      category: options.category || 'photos',
      prompt_text: options.promptText,
      photo_id: options.photoId || null,
      contact_id: options.contactId || null,
      status: 'pending',
      priority: options.priority || 5,
      source,
      metadata: {
        ...options.metadata,
        generated_by: options.generatedBy || 'ai',
      },
    })
    .select()
    .single()

  if (error) {
    console.error('Failed to create AI prompt:', error)
    return null
  }

  return mapInstance(data)
}

// =============================================================================
// LINEAGE
// =============================================================================

/** Trace a prompt instance back to its template and generation context */
export async function getPromptLineage(promptId: string): Promise<PromptLineage | null> {
  const supabase = await createClient()

  const { data: raw, error } = await supabase
    .from('engagement_prompts')
    .select('*')
    .eq('id', promptId)
    .single()

  if (error || !raw) return null

  const instance = mapInstance(raw)
  let template: PromptTemplate | null = null

  if (instance.templateId) {
    template = await getTemplate(instance.templateId)
  }

  // Resolve generation context
  let photoUrl: string | undefined
  if (instance.photoId) {
    const { data: photo } = await supabase
      .from('memory_media')
      .select('file_url')
      .eq('id', instance.photoId)
      .single()
    photoUrl = photo?.file_url
  }

  let contactName: string | undefined
  if (instance.contactId) {
    const { data: contact } = await supabase
      .from('contacts')
      .select('full_name')
      .eq('id', instance.contactId)
      .single()
    contactName = contact?.full_name
  }

  return {
    instance,
    template,
    generationContext: {
      source: instance.source,
      generatedBy: instance.metadata?.generated_by || null,
      generatedAt: instance.createdAt,
      photoUrl,
      contactName,
    },
  }
}

// =============================================================================
// MAPPERS (DB row → typed object)
// =============================================================================

function mapTemplate(row: any): PromptTemplate {
  return {
    id: row.id,
    type: row.type,
    category: row.category,
    subcategory: row.subcategory,
    promptText: row.prompt_text,
    variations: row.prompt_variations || [],
    isActive: row.is_active,
    priorityBoost: row.priority_boost || 0,
    cooldownDays: row.cooldown_days || 30,
    seasonalMonths: row.seasonal_months || [],
    anniversaryBased: row.anniversary_based || false,
    conditionalQuery: row.conditional_query || null,
    targeting: {
      interest: row.target_interest,
      skill: row.target_skill,
      hobby: row.target_hobby,
      religion: row.target_religion,
      field: row.target_field,
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapInstance(row: any): PromptInstance {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    category: row.category,
    lifeChapter: row.life_chapter,
    promptText: row.prompt_text,
    status: row.status,
    priority: row.priority,
    source: row.source || 'template',
    templateId: row.prompt_template_id || null,
    photoId: row.photo_id,
    contactId: row.contact_id,
    memoryId: row.memory_id,
    missingField: row.missing_field,
    metadata: row.metadata,
    personalizationContext: row.personalization_context,
    createdAt: row.created_at,
    answeredAt: row.answered_at,
  }
}
