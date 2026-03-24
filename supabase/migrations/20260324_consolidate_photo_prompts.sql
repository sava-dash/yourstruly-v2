-- Consolidate photo prompts: one card per photo instead of 3 separate ones
-- The tabbed photo card now handles: when/where, tagging, and backstory

-- 1. Update generate_photo_prompts to only create ONE prompt per photo
CREATE OR REPLACE FUNCTION generate_photo_prompts(
  p_media_id UUID,
  p_user_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_template RECORD;
BEGIN
  -- Check if photo prompts already exist for this media
  IF EXISTS (
    SELECT 1 FROM engagement_prompts 
    WHERE photo_id = p_media_id AND user_id = p_user_id
  ) THEN
    RETURN;
  END IF;

  -- Create ONE combined photo prompt (the tabbed card handles all 3 aspects)
  SELECT * INTO v_template
  FROM prompt_templates
  WHERE type = 'photo_backstory' AND is_active = TRUE
  ORDER BY RANDOM()
  LIMIT 1;

  INSERT INTO engagement_prompts (
    user_id, type, category, prompt_text, prompt_template_id,
    photo_id, status, priority, source
  ) VALUES (
    p_user_id, 'photo_backstory'::prompt_type, 'photos',
    COALESCE(v_template.prompt_text, 'Tell the story of this photo — who, what, when, where.'),
    v_template.id, p_media_id, 'pending'::prompt_status, 85, 'photo_upload'
  ) ON CONFLICT DO NOTHING;

END;
$$ LANGUAGE plpgsql;

-- 2. Clean up existing duplicate photo prompts
-- For each photo_id, keep the first photo_backstory and remove the rest + any tag_person
WITH ranked AS (
  SELECT id, photo_id, type,
    ROW_NUMBER() OVER (PARTITION BY photo_id ORDER BY 
      CASE WHEN type = 'photo_backstory' THEN 0 ELSE 1 END,
      priority DESC,
      created_at ASC
    ) as rn
  FROM engagement_prompts
  WHERE photo_id IS NOT NULL
    AND status = 'pending'
)
DELETE FROM engagement_prompts
WHERE id IN (
  SELECT id FROM ranked WHERE rn > 1
);

-- Also delete any remaining standalone tag_person prompts that share a photo_id with a backstory
DELETE FROM engagement_prompts t
WHERE t.type = 'tag_person'
  AND t.photo_id IS NOT NULL
  AND t.status = 'pending'
  AND EXISTS (
    SELECT 1 FROM engagement_prompts b
    WHERE b.photo_id = t.photo_id
      AND b.type = 'photo_backstory'
      AND b.user_id = t.user_id
  );
