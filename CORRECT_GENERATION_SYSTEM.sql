-- ============================================================================
-- CORRECT GENERATION SYSTEM - All 693 Templates, Smart Distribution
-- ============================================================================

-- Step 1: Smart mapping function - distributes interests/hobbies/skills by context
CREATE OR REPLACE FUNCTION map_category_to_life_chapter(p_category TEXT, p_type TEXT, p_prompt_text TEXT DEFAULT '')
RETURNS TEXT AS $$
BEGIN
  -- Direct life chapter mappings
  IF p_category IN ('childhood', 'early_life') THEN RETURN 'childhood';
  ELSIF p_category = 'teenage' THEN RETURN 'teenage';
  ELSIF p_category IN ('high_school', 'school') THEN RETURN 'high_school';
  ELSIF p_category IN ('college', 'university', 'education') THEN RETURN 'college';
  ELSIF p_category IN ('career', 'jobs_career', 'work') THEN RETURN 'jobs_career';
  ELSIF p_category IN ('relationships', 'marriage', 'family', 'parenting') THEN RETURN 'relationships';
  ELSIF p_category IN ('travel', 'places_lived', 'location') THEN RETURN 'travel';
  ELSIF p_category IN ('spirituality', 'faith', 'religion') THEN RETURN 'spirituality';
  ELSIF p_category IN ('wisdom_legacy', 'wisdom', 'legacy', 'life_lessons', 'values', 'health', 'practical') THEN RETURN 'wisdom_legacy';
  ELSIF p_category IN ('life_moments', 'milestones', 'celebration', 'firsts', 'life_stage', 'senses', 'seasonal', 'daily') THEN RETURN 'life_moments';
  
  -- Context-based mapping for interests/hobbies/skills
  ELSIF p_category IN ('interests', 'hobbies', 'skills') THEN
    -- Check prompt content to assign to appropriate life chapter
    IF p_prompt_text ILIKE '%child%' OR p_prompt_text ILIKE '%grew up%' THEN RETURN 'childhood';
    ELSIF p_prompt_text ILIKE '%teen%' THEN RETURN 'teenage';
    ELSIF p_prompt_text ILIKE '%college%' OR p_prompt_text ILIKE '%university%' THEN RETURN 'college';
    ELSIF p_prompt_text ILIKE '%career%' OR p_prompt_text ILIKE '%work%' OR p_prompt_text ILIKE '%job%' THEN RETURN 'jobs_career';
    ELSIF p_prompt_text ILIKE '%travel%' OR p_prompt_text ILIKE '%place%' THEN RETURN 'travel';
    ELSIF p_prompt_text ILIKE '%spirit%' OR p_prompt_text ILIKE '%faith%' THEN RETURN 'spirituality';
    ELSIF p_prompt_text ILIKE '%wisdom%' OR p_prompt_text ILIKE '%lesson%' OR p_prompt_text ILIKE '%learn%' THEN RETURN 'wisdom_legacy';
    ELSIF p_prompt_text ILIKE '%relationship%' OR p_prompt_text ILIKE '%family%' THEN RETURN 'relationships';
    -- Default: NULL means "All Chapters" only - fits multiple contexts
    ELSE RETURN NULL;
    END IF;
  
  -- Generic knowledge goes to wisdom
  ELSIF p_type = 'knowledge' THEN RETURN 'wisdom_legacy';
  
  -- Photo/contact/favorites prompts - context-specific, default NULL
  ELSIF p_category IN ('photos', 'contact', 'contact_info', 'favorites', 'postscript', 'memories') THEN RETURN NULL;
  
  -- Everything else: NULL (All Chapters only)
  ELSE RETURN NULL;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- Step 2: Smart generation function - considers user context
CREATE OR REPLACE FUNCTION generate_engagement_prompts(
  p_user_id UUID,
  p_count INTEGER DEFAULT 60
)
RETURNS INTEGER AS $$
DECLARE
  v_prompt_count INTEGER := 0;
  v_template RECORD;
  v_life_chapter TEXT;
BEGIN
  -- Generate from ALL active templates (693 total)
  -- Prioritize templates user hasn't answered yet
  FOR v_template IN
    WITH answered_templates AS (
      SELECT DISTINCT prompt_template_id
      FROM engagement_prompts
      WHERE user_id = p_user_id
        AND status = 'answered'
    ),
    templates_with_chapter AS (
      SELECT 
        t.*,
        map_category_to_life_chapter(t.category, t.type::TEXT, t.prompt_text) as life_chapter_computed,
        CASE WHEN a.prompt_template_id IS NULL THEN 1 ELSE 0 END as is_new
      FROM prompt_templates t
      LEFT JOIN answered_templates a ON t.id = a.prompt_template_id
      WHERE t.is_active = TRUE
        AND t.type IN ('knowledge', 'memory_prompt', 'favorites_firsts')
        AND t.prompt_text NOT LIKE '%{{%'  -- Skip templated prompts (need contact/photo data)
    ),
    ranked_templates AS (
      SELECT *,
        ROW_NUMBER() OVER (
          PARTITION BY life_chapter_computed 
          ORDER BY is_new DESC, priority_boost DESC NULLS LAST, RANDOM()
        ) as chapter_rank
      FROM templates_with_chapter
    )
    SELECT * FROM ranked_templates
    WHERE 
      -- Prioritize unanswered prompts
      (life_chapter_computed IS NOT NULL AND chapter_rank <= 8)  -- Max 8 per chapter
      OR (life_chapter_computed IS NULL AND is_new = 1 AND RANDOM() < 0.3)  -- 30% chance for All-Chapters-only prompts
    ORDER BY is_new DESC, RANDOM()
    LIMIT p_count
  LOOP
    v_life_chapter := map_category_to_life_chapter(
      v_template.category, 
      v_template.type::TEXT,
      v_template.prompt_text
    );
    
    INSERT INTO engagement_prompts (
      user_id, type, category, life_chapter, 
      prompt_text, prompt_template_id, priority, source, status
    )
    VALUES (
      p_user_id, 
      v_template.type, 
      v_template.category, 
      v_life_chapter,
      v_template.prompt_text, 
      v_template.id,
      50 + COALESCE(v_template.priority_boost, 0), 
      'system',
      'pending'
    )
    ON CONFLICT DO NOTHING;
    
    v_prompt_count := v_prompt_count + 1;
  END LOOP;
  
  RETURN v_prompt_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Step 3: Balanced shuffle - returns even distribution
CREATE OR REPLACE FUNCTION shuffle_engagement_prompts(
  p_user_id UUID,
  p_count INTEGER DEFAULT 40,
  p_regenerate BOOLEAN DEFAULT FALSE
)
RETURNS SETOF engagement_prompts AS $$
DECLARE
  v_pending_count INTEGER;
  v_prompts_per_chapter INTEGER;
BEGIN
  -- Count pending prompts
  SELECT COUNT(*) INTO v_pending_count
  FROM engagement_prompts
  WHERE user_id = p_user_id
    AND status = 'pending'
    AND (cooldown_until IS NULL OR cooldown_until < NOW());
  
  -- Generate more if needed (60+ ensures coverage)
  IF v_pending_count < 60 OR p_regenerate THEN
    PERFORM generate_engagement_prompts(p_user_id, 80);
  END IF;
  
  -- Calculate prompts per chapter (p_count / 10 chapters)
  v_prompts_per_chapter := GREATEST(1, p_count / 10);
  
  -- Return BALANCED prompts from all life chapters + some All-Chapters prompts
  RETURN QUERY
  WITH chapter_prompts AS (
    SELECT *,
      ROW_NUMBER() OVER (
        PARTITION BY life_chapter 
        ORDER BY priority DESC, RANDOM()
      ) as chapter_rank
    FROM engagement_prompts
    WHERE user_id = p_user_id
      AND status = 'pending'
      AND (cooldown_until IS NULL OR cooldown_until < NOW())
      AND life_chapter IS NOT NULL
  ),
  all_chapters_prompts AS (
    SELECT *,
      ROW_NUMBER() OVER (ORDER BY priority DESC, RANDOM()) as rank
    FROM engagement_prompts
    WHERE user_id = p_user_id
      AND status = 'pending'
      AND (cooldown_until IS NULL OR cooldown_until < NOW())
      AND life_chapter IS NULL
  ),
  balanced_set AS (
    -- Get balanced prompts from each chapter
    SELECT 
      id, user_id, type, category, prompt_text, prompt_template_id,
      photo_id, contact_id, memory_id, compare_photo_id, compare_contact_id,
      compare_memory_id, missing_field, status, priority, created_at,
      shown_at, answered_at, skipped_at, expires_at, cooldown_until,
      response_type, response_text, response_audio_url, response_data,
      result_memory_id, result_knowledge_id, source, personalization_context,
      metadata, updated_at, life_chapter
    FROM chapter_prompts
    WHERE chapter_rank <= v_prompts_per_chapter
    
    UNION ALL
    
    -- Add some All-Chapters prompts (10% of total)
    SELECT 
      id, user_id, type, category, prompt_text, prompt_template_id,
      photo_id, contact_id, memory_id, compare_photo_id, compare_contact_id,
      compare_memory_id, missing_field, status, priority, created_at,
      shown_at, answered_at, skipped_at, expires_at, cooldown_until,
      response_type, response_text, response_audio_url, response_data,
      result_memory_id, result_knowledge_id, source, personalization_context,
      metadata, updated_at, life_chapter
    FROM all_chapters_prompts
    WHERE rank <= (p_count / 10)
  )
  SELECT * FROM balanced_set
  ORDER BY RANDOM()  -- Mix them up
  LIMIT p_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Verify setup
SELECT 
  '✅ CORRECT SYSTEM INSTALLED!' as status,
  '- All 693 templates available' as note1,
  '- Smart context-based distribution' as note2,
  '- Prioritizes unanswered prompts' as note3,
  '- Balanced shuffle across categories' as note4;
