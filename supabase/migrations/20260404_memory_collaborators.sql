-- Memory Collaborators — invite contacts to contribute stories to a memory
create table if not exists memory_collaborators (
  id uuid primary key default gen_random_uuid(),
  memory_id uuid references memories(id) on delete cascade,
  -- The prompt/engagement card this collaboration was initiated from
  prompt_id text,
  -- Who created the collaboration invite
  inviter_id uuid not null references auth.users(id) on delete cascade,
  -- The contact being invited
  contact_id uuid references contacts(id) on delete set null,
  contact_name text not null,
  contact_email text,
  contact_phone text,
  -- Access token for the collaboration interview link
  access_token text unique not null default encode(gen_random_bytes(32), 'hex'),
  -- Status tracking
  status text not null default 'pending' check (status in ('pending', 'sent', 'viewed', 'in_progress', 'completed', 'declined')),
  -- Collaboration context
  prompt_text text, -- The original prompt/story being collaborated on
  story_context text, -- Brief summary of what's been shared so far
  -- Response data (filled by collaborator)
  response_text text,
  response_audio_url text,
  response_video_url text,
  response_data jsonb, -- Additional structured data
  contributor_name text, -- Display name of who contributed
  -- Timestamps
  invited_at timestamptz default now(),
  viewed_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Indexes
create index idx_memory_collab_inviter on memory_collaborators(inviter_id, created_at desc);
create index idx_memory_collab_memory on memory_collaborators(memory_id);
create index idx_memory_collab_token on memory_collaborators(access_token);
create index idx_memory_collab_contact on memory_collaborators(contact_id);

-- RLS
alter table memory_collaborators enable row level security;

create policy "Users can create collaboration invites"
  on memory_collaborators for insert
  with check (auth.uid() = inviter_id);

create policy "Users can read their own invites"
  on memory_collaborators for select
  using (auth.uid() = inviter_id);

create policy "Users can update their own invites"
  on memory_collaborators for update
  using (auth.uid() = inviter_id);

-- Allow anyone with a valid token to read and update their collaboration
create policy "Collaborators can view via token"
  on memory_collaborators for select
  using (true); -- Token validation happens at API level

create policy "Collaborators can submit via token"
  on memory_collaborators for update
  using (true); -- Token validation happens at API level
