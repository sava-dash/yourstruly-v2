-- Gratitude Pings — lightweight "thinking of you" gestures between contacts
create table if not exists gratitude_pings (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_contact_id uuid references contacts(id) on delete set null,
  recipient_email text,
  message text not null,
  sender_name text,
  recipient_name text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- Index for fast lookups
create index idx_gratitude_pings_sender on gratitude_pings(sender_id, created_at desc);
create index idx_gratitude_pings_recipient on gratitude_pings(recipient_contact_id, created_at desc);

-- RLS
alter table gratitude_pings enable row level security;

create policy "Users can insert their own pings"
  on gratitude_pings for insert
  with check (auth.uid() = sender_id);

create policy "Users can read their sent pings"
  on gratitude_pings for select
  using (auth.uid() = sender_id);
