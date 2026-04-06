-- Support Knowledge Base — articles the AI concierge uses to answer platform questions
create table if not exists support_knowledge (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null default 'general',
  content text not null,
  -- Search
  keywords text[], -- for keyword matching
  embedding vector(768), -- for semantic search
  -- Status
  is_active boolean not null default true,
  sort_order int default 0,
  -- Metadata
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_support_knowledge_category on support_knowledge(category, is_active);
create index idx_support_knowledge_embedding on support_knowledge using hnsw (embedding vector_cosine_ops);

alter table support_knowledge enable row level security;

-- Only admins can manage (via service role or admin check)
create policy "Admins can manage support knowledge"
  on support_knowledge for all
  using (true)
  with check (true);

-- Seed with default platform knowledge
insert into support_knowledge (title, category, content, keywords) values
('What is YoursTruly?', 'general', 'YoursTruly is a digital legacy platform where you preserve memories, stories, and connections with the people who matter most. It''s ad-free and 100% member-supported.', array['about', 'what is', 'platform', 'app']),
('How to create a memory', 'memories', 'You can create a memory in several ways: 1) Answer engagement prompts on the Home screen 2) Use the AI Concierge (sparkle button) to speak or type your memory 3) Click "New" on the My Story page. Each memory can include location, date, people, photos, songs, and your story.', array['create', 'memory', 'add', 'new', 'how to']),
('How to use the AI Concierge', 'features', 'Tap the sparkle button (bottom right) to open the AI Concierge. You can: speak a memory and it will extract details automatically, ask questions about your memories ("Tell me about our trip to Mexico"), or get help navigating the app. Voice and text input both work.', array['concierge', 'ai', 'voice', 'speak', 'assistant']),
('What are PostScripts?', 'features', 'PostScripts are scheduled future messages. Write letters, record videos, or leave voice messages for your loved ones to receive on specific future dates — birthdays, graduations, anniversaries, or any date you choose. Think of them as letters from the future.', array['postscripts', 'future', 'messages', 'scheduled', 'letters']),
('How Circles work', 'features', 'Circles are shared groups where family and friends collaborate on memories together. Create a circle, invite members, and everyone can contribute stories, photos, and wisdom. Great for families, friend groups, or memorial tributes.', array['circles', 'groups', 'shared', 'family', 'collaborate']),
('How to invite collaborators', 'features', 'When creating a memory, scroll to the "Add to this memory" card and select "Invite Collaborator". Choose contacts or invite by email. They''ll receive a link to add their perspective to your memory.', array['invite', 'collaborator', 'share', 'contribute']),
('About Interviews / Journalist', 'features', 'The Interview feature lets you or someone you love answer guided questions through an AI conversation. It''s like having a personal journalist. Send interview links to family members to capture their stories in their own words.', array['interview', 'journalist', 'guided', 'questions', 'stories']),
('How to add songs to memories', 'features', 'In the memory card chain, select "Add Song" from the options. Search for any song, add a personal note about why it matters, and it becomes part of your memory. Preview clips play directly in the card.', array['song', 'music', 'add song', 'soundtrack']),
('Photo tagging and face detection', 'features', 'Upload photos and tag people in them. The app can auto-detect faces, or you can tap anywhere on a photo to manually tag someone. Tagged people are linked to your contacts.', array['photo', 'tag', 'face', 'detection', 'people']),
('Storage and subscription', 'account', 'Check your storage usage in the left sidebar on the Home screen. Free accounts include 10GB. Upgrade your plan in Settings > Subscription for more storage and premium features.', array['storage', 'subscription', 'plan', 'upgrade', 'account']),
('How to export your data', 'account', 'Go to Settings > Export to download all your memories, photos, and data. YoursTruly believes your data belongs to you.', array['export', 'download', 'data', 'backup']),
('Gratitude Pings', 'features', 'On any contact card, tap the sparkle "Ping" button to send a quick gratitude message. Choose from: Thinking of you, Proud of you, Miss you, Love you, or Thank you. The contact receives an email notification.', array['gratitude', 'ping', 'thinking of you', 'notification']),
('Wisdom entries', 'features', 'Share life lessons, recipes, advice, and values through the Wisdom feature. These are preserved as part of your legacy and can be shared with circles or kept private.', array['wisdom', 'advice', 'lessons', 'recipes', 'values']),
('My Story page', 'navigation', 'The My Story page shows all your memories, wisdom entries, and photos in one place. View them as a grid, timeline thread, or on a map. Click any item to see the full detail with slideshow mode.', array['my story', 'memories', 'timeline', 'grid', 'map']);
