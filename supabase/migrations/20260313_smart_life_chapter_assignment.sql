-- Update generate_engagement_prompts to assign life_chapter automatically
-- This ensures new prompts get categorized right away

-- Helper function to assign life chapter based on prompt type and category
CREATE OR REPLACE FUNCTION assign_life_chapter(
  p_type TEXT,
  p_category TEXT,
  p_prompt_text TEXT
)
RETURNS TEXT AS $$
BEGIN
  -- Photo backstory - analyze prompt text for context clues
  IF p_type = 'photo_backstory' THEN
    IF p_prompt_text ILIKE '%childhood%' OR p_prompt_text ILIKE '%kid%' OR p_prompt_text ILIKE '%young%' THEN
      RETURN 'childhood';
    ELSIF p_prompt_text ILIKE '%school%' OR p_prompt_text ILIKE '%class%' THEN
      RETURN 'high_school';
    ELSIF p_prompt_text ILIKE '%college%' OR p_prompt_text ILIKE '%university%' THEN
      RETURN 'college';
    ELSIF p_prompt_text ILIKE '%travel%' OR p_prompt_text ILIKE '%trip%' OR p_prompt_text ILIKE '%vacation%' THEN
      RETURN 'travel';
    ELSIF p_prompt_text ILIKE '%wedding%' OR p_prompt_text ILIKE '%family%' THEN
      RETURN 'relationships';
    ELSE
      RETURN 'life_moments';
    END IF;
  END IF;
  
  -- Memory prompts - use category
  IF p_type = 'memory_prompt' THEN
    IF p_category ILIKE '%childhood%' THEN
      RETURN 'childhood';
    ELSIF p_category ILIKE '%teenage%' OR p_category ILIKE '%teen%' THEN
      RETURN 'teenage';
    ELSIF p_category ILIKE '%school%' THEN
      RETURN 'high_school';
    ELSIF p_category ILIKE '%college%' OR p_category ILIKE '%university%' THEN
      RETURN 'college';
    ELSIF p_category ILIKE '%career%' OR p_category ILIKE '%job%' OR p_category ILIKE '%work%' THEN
      RETURN 'jobs_career';
    ELSIF p_category ILIKE '%relationship%' OR p_category ILIKE '%love%' OR p_category ILIKE '%family%' THEN
      RETURN 'relationships';
    ELSIF p_category ILIKE '%travel%' THEN
      RETURN 'travel';
    ELSIF p_category ILIKE '%spiritual%' OR p_category ILIKE '%faith%' OR p_category ILIKE '%religion%' THEN
      RETURN 'spirituality';
    ELSE
      RETURN 'life_moments';
    END IF;
  END IF;
  
  -- Knowledge/wisdom prompts
  IF p_type IN ('knowledge', 'recipes_wisdom', 'favorites_firsts') THEN
    RETURN 'wisdom_legacy';
  END IF;
  
  -- Contact-related prompts
  IF p_type IN ('missing_info', 'quick_question', 'contact_info', 'tag_person') THEN
    RETURN 'relationships';
  END IF;
  
  -- Postscripts
  IF p_type = 'postscript' THEN
    RETURN 'wisdom_legacy';
  END IF;
  
  -- Connect dots, highlight
  IF p_type IN ('connect_dots', 'highlight') THEN
    RETURN 'life_moments';
  END IF;
  
  -- Default fallback
  RETURN 'life_moments';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add trigger to auto-assign life_chapter on insert
CREATE OR REPLACE FUNCTION auto_assign_life_chapter()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.life_chapter IS NULL THEN
    NEW.life_chapter := assign_life_chapter(
      NEW.type::TEXT,
      NEW.category,
      NEW.prompt_text
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS engagement_prompts_auto_life_chapter ON engagement_prompts;

-- Create trigger
CREATE TRIGGER engagement_prompts_auto_life_chapter
  BEFORE INSERT ON engagement_prompts
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_life_chapter();

-- Backfill existing prompts that don't have life_chapter set
UPDATE engagement_prompts
SET life_chapter = assign_life_chapter(
  type::TEXT,
  category,
  prompt_text
)
WHERE life_chapter IS NULL;

COMMENT ON FUNCTION assign_life_chapter IS 'Automatically assigns life chapter category based on prompt type, category, and text analysis';
COMMENT ON FUNCTION auto_assign_life_chapter IS 'Trigger function to auto-assign life_chapter on new prompt creation';
