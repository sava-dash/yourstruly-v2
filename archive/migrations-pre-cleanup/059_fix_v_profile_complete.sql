-- Migration 059: Complete fix for v_profile / education_level issue
-- Run this to ensure profiles table has all required columns before functions use them

-- 1. Add all missing columns to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS education_level TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS personality_traits TEXT[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS life_goals TEXT[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS languages TEXT[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS favorite_books TEXT[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS favorite_movies TEXT[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS favorite_music TEXT[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS favorite_foods TEXT[] DEFAULT '{}';

-- 2. Drop the function so it can be recreated with the new column
DROP FUNCTION IF EXISTS generate_engagement_prompts(UUID, INTEGER);

-- 3. Recreate a simpler version of the function that works
CREATE OR REPLACE FUNCTION generate_engagement_prompts(
  p_user_id UUID,
  p_count INTEGER DEFAULT 20
)
RETURNS INTEGER AS $$
DECLARE
  v_prompt_count INTEGER := 0;
  v_profile RECORD;
  v_template RECORD;
BEGIN
  -- Get user profile as RECORD (flexible, works with any columns)
  SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  -- Get random active templates and generate prompts
  FOR v_template IN 
    SELECT * FROM prompt_templates 
    WHERE is_active = TRUE 
    ORDER BY RANDOM() 
    LIMIT p_count
  LOOP
    -- Insert prompt (simplified - just use template text directly)
    INSERT INTO engagement_prompts (
      user_id, 
      type, 
      prompt_text, 
      priority, 
      source,
      metadata
    )
    VALUES (
      p_user_id,
      v_template.type,
      v_template.prompt_text,
      COALESCE(v_template.priority_boost, 0) + 50,
      'system',
      jsonb_build_object('template_id', v_template.id)
    )
    ON CONFLICT DO NOTHING;
    
    v_prompt_count := v_prompt_count + 1;
  END LOOP;
  
  RETURN v_prompt_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Grant access
GRANT EXECUTE ON FUNCTION generate_engagement_prompts(UUID, INTEGER) TO authenticated;
