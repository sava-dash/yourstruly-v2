-- Vector RAG System for YoursTruly V2
-- Enables semantic search across user's life data

-- ============================================
-- ENABLE PGVECTOR EXTENSION
-- ============================================
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- ADD EMBEDDING COLUMNS
-- Using 1536 dimensions (OpenAI text-embedding-3-small)
-- ============================================

-- Memories embeddings
ALTER TABLE memories 
ADD COLUMN IF NOT EXISTS embedding vector(1536),
ADD COLUMN IF NOT EXISTS embedding_text TEXT; -- The text that was embedded

-- Contacts embeddings  
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS embedding vector(1536),
ADD COLUMN IF NOT EXISTS embedding_text TEXT;

-- Profiles embeddings (user's own info)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS embedding vector(1536),
ADD COLUMN IF NOT EXISTS embedding_text TEXT;

-- PostScripts embeddings
ALTER TABLE postscripts
ADD COLUMN IF NOT EXISTS embedding vector(1536),
ADD COLUMN IF NOT EXISTS embedding_text TEXT;

-- Pets embeddings
ALTER TABLE pets
ADD COLUMN IF NOT EXISTS embedding vector(1536),
ADD COLUMN IF NOT EXISTS embedding_text TEXT;

-- ============================================
-- VECTOR SIMILARITY INDEXES (HNSW for speed)
-- ============================================

CREATE INDEX IF NOT EXISTS memories_embedding_idx 
ON memories USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS contacts_embedding_idx 
ON contacts USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS profiles_embedding_idx 
ON profiles USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS postscripts_embedding_idx 
ON postscripts USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS pets_embedding_idx 
ON pets USING hnsw (embedding vector_cosine_ops);

-- ============================================
-- SEMANTIC SEARCH FUNCTION
-- Returns combined results from all tables
-- ============================================

CREATE OR REPLACE FUNCTION search_user_content(
  query_embedding vector(1536),
  search_user_id UUID,
  match_threshold FLOAT DEFAULT 0.5,
  match_count INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  content_type TEXT,
  title TEXT,
  content TEXT,
  similarity FLOAT,
  metadata JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  
  -- Search memories
  SELECT 
    m.id,
    'memory'::TEXT as content_type,
    m.title,
    COALESCE(m.description, m.ai_summary, m.embedding_text) as content,
    1 - (m.embedding <=> query_embedding) as similarity,
    jsonb_build_object(
      'date', m.memory_date,
      'location', m.location_name,
      'mood', m.ai_mood,
      'category', m.ai_category
    ) as metadata
  FROM memories m
  WHERE m.user_id = search_user_id
    AND m.embedding IS NOT NULL
    AND 1 - (m.embedding <=> query_embedding) > match_threshold
  
  UNION ALL
  
  -- Search contacts
  SELECT
    c.id,
    'contact'::TEXT as content_type,
    c.full_name as title,
    COALESCE(c.notes, c.embedding_text) as content,
    1 - (c.embedding <=> query_embedding) as similarity,
    jsonb_build_object(
      'relationship', c.relationship_type,
      'email', c.email,
      'phone', c.phone,
      'birthday', c.date_of_birth
    ) as metadata
  FROM contacts c
  WHERE c.user_id = search_user_id
    AND c.embedding IS NOT NULL
    AND 1 - (c.embedding <=> query_embedding) > match_threshold
  
  UNION ALL
  
  -- Search postscripts
  SELECT
    p.id,
    'postscript'::TEXT as content_type,
    p.title,
    COALESCE(p.message, p.embedding_text) as content,
    1 - (p.embedding <=> query_embedding) as similarity,
    jsonb_build_object(
      'recipient', p.recipient_name,
      'deliver_on', p.deliver_on,
      'status', p.status
    ) as metadata
  FROM postscripts p
  WHERE p.user_id = search_user_id
    AND p.embedding IS NOT NULL
    AND 1 - (p.embedding <=> query_embedding) > match_threshold
  
  UNION ALL
  
  -- Search pets
  SELECT
    pet.id,
    'pet'::TEXT as content_type,
    pet.name as title,
    COALESCE(pet.personality, pet.embedding_text) as content,
    1 - (pet.embedding <=> query_embedding) as similarity,
    jsonb_build_object(
      'species', pet.species,
      'breed', pet.breed,
      'birthday', pet.date_of_birth
    ) as metadata
  FROM pets pet
  WHERE pet.user_id = search_user_id
    AND pet.embedding IS NOT NULL
    AND 1 - (pet.embedding <=> query_embedding) > match_threshold

  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

-- ============================================
-- CHAT SESSIONS TABLE (for conversation history)
-- ============================================

CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  sources JSONB, -- References to content used in response
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS chat_sessions_user_idx ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS chat_messages_session_idx ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS chat_messages_created_idx ON chat_messages(created_at DESC);

-- RLS
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own chat sessions" ON chat_sessions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own chat messages" ON chat_messages
  FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- HELPER: Generate embedding text for records
-- ============================================

-- Function to build searchable text for a memory
CREATE OR REPLACE FUNCTION build_memory_embedding_text(memory_row memories)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN CONCAT_WS(' | ',
    'Memory: ' || COALESCE(memory_row.title, 'Untitled'),
    memory_row.description,
    'Date: ' || COALESCE(memory_row.memory_date::TEXT, 'Unknown'),
    'Location: ' || COALESCE(memory_row.location_name, ''),
    'Category: ' || COALESCE(memory_row.ai_category, ''),
    'Mood: ' || COALESCE(memory_row.ai_mood, ''),
    memory_row.ai_summary
  );
END;
$$;

-- Function to build searchable text for a contact
CREATE OR REPLACE FUNCTION build_contact_embedding_text(contact_row contacts)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN CONCAT_WS(' | ',
    'Contact: ' || contact_row.full_name,
    'Relationship: ' || COALESCE(contact_row.relationship_type, ''),
    'Nickname: ' || COALESCE(contact_row.nickname, ''),
    'Birthday: ' || COALESCE(contact_row.date_of_birth::TEXT, ''),
    'Location: ' || CONCAT_WS(', ', contact_row.city, contact_row.state, contact_row.country),
    'Notes: ' || COALESCE(contact_row.notes, '')
  );
END;
$$;
