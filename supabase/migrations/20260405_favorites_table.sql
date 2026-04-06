-- Favorites — rich collection of user's favorite things with stories
create table if not exists favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null, -- books, movies, music, tv_shows, foods, cars, clothes, places, quotes, hobbies, sports_teams
  item_name text not null,
  story text, -- why this is special
  image_url text, -- cover art / photo
  year text, -- year discovered or relevant
  associated_person text, -- who introduced you
  rating smallint check (rating between 1 and 5),
  metadata jsonb default '{}', -- extra data (artist, director, genre, etc.)
  sort_order int default 0,
  prompt_id text, -- which engagement prompt triggered this
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_favorites_user on favorites(user_id, category, sort_order);

alter table favorites enable row level security;

create policy "Users manage their own favorites"
  on favorites for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
