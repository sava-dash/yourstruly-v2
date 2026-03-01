-- Migration 075: Comprehensive Engagement Fix
-- Restores photo-based prompts, adds memory-based follow-ups
-- Focuses on happy/positive moments, avoids difficult topics
-- NOTE: Run enum additions separately first (already applied)

-- STEP 1: Add photo task templates
INSERT INTO prompt_templates (id, type, category, prompt_text, priority_boost, is_active) VALUES
('photo_story_001', 'photo_backstory', 'photos', 'What''s the story behind this photo?', 10, true),
('photo_story_002', 'photo_backstory', 'photos', 'Tell me about this moment - where were you and who were you with?', 10, true),
('photo_story_003', 'photo_backstory', 'photos', 'What makes this photo special to you?', 10, true),
('photo_story_004', 'photo_backstory', 'photos', 'I''d love to hear the story behind this picture!', 10, true),
('photo_story_005', 'photo_backstory', 'photos', 'What happy memory does this photo bring back?', 10, true),
('photo_story_006', 'photo_backstory', 'photos', 'Who took this photo? What was the occasion?', 9, true),
('photo_story_007', 'photo_backstory', 'photos', 'What were you feeling in this moment?', 9, true),
('photo_story_008', 'photo_backstory', 'photos', 'Is there a fun story behind this picture?', 9, true),
('face_tag_001', 'tag_person', 'photos', 'Who is this person in the photo?', 8, true),
('face_tag_002', 'tag_person', 'photos', 'Do you recognize who this is?', 8, true),
('face_tag_003', 'tag_person', 'photos', 'Help me learn - who is this?', 8, true)
ON CONFLICT (id) DO UPDATE SET prompt_text = EXCLUDED.prompt_text, is_active = true;

-- STEP 2: Contact story templates
INSERT INTO prompt_templates (id, type, category, prompt_text, priority_boost, is_active) VALUES
('contact_happy_001', 'contact_story', 'relationships', 'What''s your happiest memory with {{contact_name}}?', 8, true),
('contact_happy_002', 'contact_story', 'relationships', 'What do you love most about {{contact_name}}?', 8, true),
('contact_happy_003', 'contact_story', 'relationships', 'What''s the funniest thing that happened with {{contact_name}}?', 7, true),
('contact_happy_004', 'contact_story', 'relationships', 'What adventure have you had with {{contact_name}}?', 7, true),
('contact_happy_005', 'contact_story', 'relationships', 'What makes {{contact_name}} special to you?', 8, true),
('contact_happy_006', 'contact_story', 'relationships', 'Tell me a fun story about you and {{contact_name}}', 7, true),
('contact_happy_007', 'contact_story', 'relationships', 'What''s something {{contact_name}} taught you?', 7, true),
('contact_happy_008', 'contact_story', 'relationships', 'What celebration or special occasion did you share with {{contact_name}}?', 6, true)
ON CONFLICT (id) DO UPDATE SET prompt_text = EXCLUDED.prompt_text, is_active = true;

-- STEP 3: Memory follow-up templates
INSERT INTO prompt_templates (id, type, category, prompt_text, priority_boost, is_active) VALUES
('memory_followup_001', 'memory_elaboration', 'memories', 'You mentioned {{memory_snippet}} - tell me more about that happy time!', 9, true),
('memory_followup_002', 'memory_elaboration', 'memories', 'I''d love to hear more about {{memory_snippet}}', 9, true),
('memory_followup_003', 'memory_elaboration', 'memories', 'That sounds wonderful! What else do you remember about {{memory_snippet}}?', 8, true),
('memory_followup_004', 'memory_elaboration', 'memories', 'What other happy moments came from {{memory_snippet}}?', 8, true),
('memory_followup_005', 'memory_elaboration', 'memories', 'Who else was part of {{memory_snippet}}?', 7, true)
ON CONFLICT (id) DO UPDATE SET prompt_text = EXCLUDED.prompt_text, is_active = true;

-- STEP 4: Wisdom follow-up templates
INSERT INTO prompt_templates (id, type, category, prompt_text, priority_boost, is_active) VALUES
('wisdom_followup_001', 'wisdom_elaboration', 'wisdom', 'You shared that {{wisdom_snippet}} - what experience taught you that?', 8, true),
('wisdom_followup_002', 'wisdom_elaboration', 'wisdom', 'That''s beautiful wisdom! Can you share a story that illustrates {{wisdom_snippet}}?', 8, true),
('wisdom_followup_003', 'wisdom_elaboration', 'wisdom', 'How did you come to learn {{wisdom_snippet}}?', 7, true)
ON CONFLICT (id) DO UPDATE SET prompt_text = EXCLUDED.prompt_text, is_active = true;

-- STEP 5: Deactivate sad/difficult topics
UPDATE prompt_templates SET is_active = false 
WHERE prompt_text ILIKE '%hardest%' OR prompt_text ILIKE '%difficult%' OR prompt_text ILIKE '%tough time%'
   OR prompt_text ILIKE '%struggle%' OR prompt_text ILIKE '%hard chapter%' OR prompt_text ILIKE '%loss%'
   OR prompt_text ILIKE '%grief%' OR prompt_text ILIKE '%passed away%' OR prompt_text ILIKE '%miss someone%'
   OR prompt_text ILIKE '%regret%' OR prompt_text ILIKE '%failure%' OR prompt_text ILIKE '%fear%'
   OR prompt_text ILIKE '%afraid%' OR prompt_text ILIKE '%divorce%' OR prompt_text ILIKE '%separation%'
   OR prompt_text ILIKE '%death%';

-- STEP 6: Views
DROP VIEW IF EXISTS photos_needing_backstory CASCADE;
DROP VIEW IF EXISTS contacts_for_stories CASCADE;
DROP VIEW IF EXISTS memories_for_elaboration CASCADE;

CREATE VIEW photos_needing_backstory AS
SELECT mm.id as media_id, mm.user_id, mm.file_url, mm.created_at
FROM memory_media mm
WHERE mm.memory_id IS NULL AND mm.file_type LIKE 'image/%'
  AND NOT EXISTS (SELECT 1 FROM engagement_prompts ep WHERE ep.photo_id = mm.id AND ep.status IN ('answered', 'pending') AND ep.created_at > NOW() - INTERVAL '30 days')
ORDER BY mm.created_at DESC LIMIT 50;

CREATE VIEW contacts_for_stories AS
SELECT c.id as contact_id, c.user_id, c.full_name, c.avatar_url, c.relationship_type
FROM contacts c
WHERE c.full_name IS NOT NULL AND c.full_name != ''
  AND NOT EXISTS (SELECT 1 FROM engagement_prompts ep WHERE ep.contact_id = c.id AND ep.type = 'contact_story' AND ep.status IN ('answered', 'pending') AND ep.created_at > NOW() - INTERVAL '60 days')
LIMIT 30;

CREATE VIEW memories_for_elaboration AS
SELECT m.id as memory_id, m.user_id, m.title, COALESCE(m.ai_summary, LEFT(m.description, 100)) as snippet, m.memory_date
FROM memories m
WHERE (m.ai_summary IS NOT NULL OR m.description IS NOT NULL)
  AND NOT EXISTS (SELECT 1 FROM engagement_prompts ep WHERE ep.memory_id = m.id AND ep.type = 'memory_elaboration' AND ep.status IN ('answered', 'pending') AND ep.created_at > NOW() - INTERVAL '90 days')
ORDER BY m.created_at DESC LIMIT 30;

-- STEP 7: Clear old pending prompts for fresh generation
DELETE FROM engagement_prompts WHERE status = 'pending';
