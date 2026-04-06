-- Favorites engagement prompt templates — data insert
-- Must run AFTER 20260405_favorites_prompts.sql (enum values must be committed first)

insert into prompt_templates (id, type, category, prompt_text, is_active) values
-- MUSIC
('fav_music_001', 'favorite_music', 'favorites', 'What song makes you cry every single time?', true),
('fav_music_002', 'favorite_music', 'favorites', 'What''s the first album you ever owned?', true),
('fav_music_003', 'favorite_music', 'favorites', 'What song would play at the movie of your life?', true),
('fav_music_004', 'favorite_music', 'favorites', 'Name a song that reminds you of your parents.', true),
('fav_music_005', 'favorite_music', 'favorites', 'What''s your guilty pleasure song you secretly love?', true),
('fav_music_006', 'favorite_music', 'favorites', 'What song defined your teenage years?', true),
('fav_music_007', 'favorite_music', 'favorites', 'What concert changed your life?', true),
('fav_music_008', 'favorite_music', 'favorites', 'What song do you play when you need to feel alive?', true),
('fav_music_009', 'favorite_music', 'favorites', 'What lullaby or childhood song do you still remember?', true),
('fav_music_010', 'favorite_music', 'favorites', 'What''s the best road trip song ever?', true),
-- MOVIES
('fav_movies_001', 'favorite_movies', 'favorites', 'What movie can you quote from start to finish?', true),
('fav_movies_002', 'favorite_movies', 'favorites', 'What''s the first movie you remember seeing in a theater?', true),
('fav_movies_003', 'favorite_movies', 'favorites', 'What movie made you ugly cry?', true),
('fav_movies_004', 'favorite_movies', 'favorites', 'What movie do you watch every holiday season?', true),
('fav_movies_005', 'favorite_movies', 'favorites', 'Name a movie that changed how you see the world.', true),
('fav_movies_006', 'favorite_movies', 'favorites', 'What''s your go-to comfort movie?', true),
('fav_movies_007', 'favorite_movies', 'favorites', 'What animated movie is actually a masterpiece?', true),
('fav_movies_008', 'favorite_movies', 'favorites', 'What movie do you wish you could see for the first time again?', true),
('fav_movies_009', 'favorite_movies', 'favorites', 'What''s the funniest movie you''ve ever seen?', true),
('fav_movies_010', 'favorite_movies', 'favorites', 'What movie has the best soundtrack?', true),
-- BOOKS
('fav_books_001', 'favorite_books', 'favorites', 'What book changed your life?', true),
('fav_books_002', 'favorite_books', 'favorites', 'What''s a book you''ve read more than once?', true),
('fav_books_003', 'favorite_books', 'favorites', 'What book did you stay up all night to finish?', true),
('fav_books_004', 'favorite_books', 'favorites', 'Name a book character you deeply relate to.', true),
('fav_books_005', 'favorite_books', 'favorites', 'What''s a childhood book you still think about?', true),
('fav_books_006', 'favorite_books', 'favorites', 'What''s a book you wish everyone would read?', true),
('fav_books_007', 'favorite_books', 'favorites', 'What book has the most beautiful writing?', true),
('fav_books_008', 'favorite_books', 'favorites', 'Name a nonfiction book that blew your mind.', true),
('fav_books_009', 'favorite_books', 'favorites', 'What book made you fall in love with reading?', true),
('fav_books_010', 'favorite_books', 'favorites', 'What''s the most dog-eared worn-out book on your shelf?', true),
-- FOODS
('fav_foods_001', 'favorite_foods', 'favorites', 'What''s the meal that tastes like home?', true),
('fav_foods_002', 'favorite_foods', 'favorites', 'What''s your last-meal-on-earth dish?', true),
('fav_foods_003', 'favorite_foods', 'favorites', 'What food did you hate as a kid but love now?', true),
('fav_foods_004', 'favorite_foods', 'favorites', 'What''s the best thing you''ve ever eaten on vacation?', true),
('fav_foods_005', 'favorite_foods', 'favorites', 'Name a food that reminds you of your grandmother.', true),
('fav_foods_006', 'favorite_foods', 'favorites', 'What''s your ultimate comfort food?', true),
('fav_foods_007', 'favorite_foods', 'favorites', 'What dish do you cook better than anyone?', true),
('fav_foods_008', 'favorite_foods', 'favorites', 'What food do you crave at midnight?', true),
('fav_foods_009', 'favorite_foods', 'favorites', 'Name a restaurant you''d drive an hour for.', true),
('fav_foods_010', 'favorite_foods', 'favorites', 'What dessert could you eat every day?', true)
ON CONFLICT (id) DO NOTHING;
