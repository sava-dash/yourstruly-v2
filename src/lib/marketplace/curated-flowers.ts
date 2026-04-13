/**
 * Curated FloristOne Flower Catalog
 * 48 hand-picked arrangements for YoursTruly's emotional occasions
 */

import type { CuratedProduct } from './curated-catalog';

// Helper to generate curated product from FloristOne API data
function flower(
  code: string,
  name: string,
  price: number,
  description: string,
  smallImg: string,
  largeImg: string,
  curatedScore: number,
  collections: CuratedProduct['collections'],
  whyWeLoveIt: string,
  occasions: string[],
  emotionalImpact: CuratedProduct['emotionalImpact'] = 'high'
): CuratedProduct {
  return {
    id: code,
    name,
    price,
    description,
    currency: 'USD',
    images: [largeImg],
    thumbnail: smallImg,
    provider: 'floristone',
    category: 'flowers-occasions',
    inStock: true,
    curatedScore,
    collections,
    whyWeLoveIt,
    occasions,
    emotionalImpact,
    providerData: { code },
  };
}

export const FLORISTONE_FLOWERS: CuratedProduct[] = [
  // =============================================================================
  // SYMPATHY & MEMORIAL (12 products) - Critical for legacy platform
  // =============================================================================
  flower(
    'S5255s', 'Graceful Garden Basket', 104.95,
    'Elegant white flowers effortlessly capture your messages of support and love during the passing of a loved one. Stock, spray roses and carnations, accented by a charming basket.',
    'https://cdn.floristone.com/small/S5255s_t1.jpg',
    'https://cdn.floristone.com/large/S5255s_d1.jpg',
    96, ['staff-picks', 'thoughtful-gestures'],
    'A gentle way to show you care. The basket becomes a lasting keepsake.',
    ['sympathy', 'memorial', 'condolence', 'loss']
  ),
  flower(
    'S5260s', 'Pure Ivory Basket', 104.95,
    'Share comfort and solace with this basket of hydrangea, daisy pompons and snapdragons. Pure and peaceful.',
    'https://cdn.floristone.com/small/S5260s_t1.jpg',
    'https://cdn.floristone.com/large/S5260s_d1.jpg',
    95, ['thoughtful-gestures'],
    'White flowers symbolize peace and remembrance. A serene tribute.',
    ['sympathy', 'memorial', 'condolence']
  ),
  flower(
    'S5261s', 'Love & Compassion Arrangement', 134.95,
    'During times of sensitivity, remind those you care about that they are in your heart. Elegant white flowers thoughtfully designed and delivered with care.',
    'https://cdn.floristone.com/small/S5261s_t1.jpg',
    'https://cdn.floristone.com/large/S5261s_d1.jpg',
    94, ['staff-picks', 'heirloom-quality'],
    'Sometimes presence matters more than words. This arrangement says "I\'m here."',
    ['sympathy', 'memorial', 'condolence', 'loss']
  ),
  flower(
    'S5262s', 'Compassionate Lily Bouquet', 94.95,
    'Classic lily and hydrangea blooms elegantly bring solace and comfort. Lilies come in bud form, beautifully transforming as they open.',
    'https://cdn.floristone.com/small/S5262s_t1.jpg',
    'https://cdn.floristone.com/large/S5262s_d1.jpg',
    93, ['thoughtful-gestures'],
    'Lilies opening over days symbolize life\'s unfolding beauty. A living tribute.',
    ['sympathy', 'memorial', 'condolence']
  ),
  // Funeral/wake arrangements removed (floor baskets, wreaths, standing hearts, sprays)
  flower(
    'T55-1A', 'Heavenly & Harmony', 84.95,
    'Heavenly hues and pretty petals in perfect harmony. Light pink roses, white asiatic lilies, Queen Anne\'s lace in a glass vase.',
    'https://cdn.floristone.com/small/T55-1A_t1.jpg',
    'https://cdn.floristone.com/large/T55-1A_d1.jpg',
    85, ['thoughtful-gestures'],
    'Delicate enough for sympathy, beautiful enough for any occasion.',
    ['sympathy', 'thinking-of-you', 'thank-you']
  ),

  // =============================================================================
  // LOVE & ANNIVERSARY (10 products) - Perfect for scheduled postscripts
  // =============================================================================
  flower(
    'E2-4305', 'Classic Red Rose Bouquet', 89.95,
    'Nothing speaks of love so much as beautiful red roses. Arranged with seeded eucalyptus in a classic glass vase - a gift to her heart from yours.',
    'https://cdn.floristone.com/small/E2-4305_t1.jpg',
    'https://cdn.floristone.com/large/E2-4305_d1.jpg',
    98, ['staff-picks'],
    'Red roses have meant "I love you" for centuries. Some messages never need updating.',
    ['anniversary', 'valentines-day', 'love', 'romance']
  ),
  flower(
    'T4-1A', 'Make Me Blush', 89.95,
    'A dozen perfectly pink roses with white limonium. Sweet, innocent, yet sassy and sexy. Shows you know how much fun love is!',
    'https://cdn.floristone.com/small/T4-1A_t1.jpg',
    'https://cdn.floristone.com/large/T4-1A_d1.jpg',
    97, ['staff-picks'],
    'Pink roses represent admiration and gratitude. For the love of your life.',
    ['anniversary', 'valentines-day', 'mothers-day', 'love']
  ),
  flower(
    'T65-2A', 'Rose Classique', 89.95,
    'Red roses have symbolized love and romance for centuries. Stunning, dramatic, they say so much without saying a word.',
    'https://cdn.floristone.com/small/T65-2A_t1.jpg',
    'https://cdn.floristone.com/large/T65-2A_d1.jpg',
    96, ['staff-picks', 'heirloom-quality'],
    'Classic and romantic. When you want to make a statement.',
    ['anniversary', 'valentines-day', 'love', 'romance']
  ),
  flower(
    'T6-1A', 'Cupid\'s Creation', 99.95,
    'Classic beauty and romance to spare. Red and pink roses with spray roses - like the arrow from Cupid\'s bow, straight to your lover\'s heart.',
    'https://cdn.floristone.com/small/T6-1A_t1.jpg',
    'https://cdn.floristone.com/large/T6-1A_d1.jpg',
    95, ['staff-picks'],
    'Named for Cupid himself. An inspired way to celebrate your love.',
    ['anniversary', 'valentines-day', 'love', 'romance']
  ),
  flower(
    'T5-1A', 'Lavish Love', 104.95,
    'Reds and pinks come together lavishly. Radiant red roses with pink asiatic lilies - a fresh way to say "I love you."',
    'https://cdn.floristone.com/small/T5-1A_t1.jpg',
    'https://cdn.floristone.com/large/T5-1A_d1.jpg',
    94, ['staff-picks', 'perfect-for-memories'],
    'Celebrates a romance that deepens with each passing year.',
    ['anniversary', 'valentines-day', 'love']
  ),
  flower(
    'E3-4811', 'Lavender Rose Bouquet', 89.95,
    'An enchanting bouquet of lavender roses sweetly touches her heart. Paired with seeded eucalyptus in a stylish glass vase.',
    'https://cdn.floristone.com/small/E3-4811_t1.jpg',
    'https://cdn.floristone.com/large/E3-4811_d1.jpg',
    93, ['thoughtful-gestures'],
    'Lavender roses represent enchantment and love at first sight.',
    ['anniversary', 'love', 'valentines-day', 'mothers-day']
  ),
  flower(
    'T10-1A', 'Roman Holiday', 139.95,
    'A "romance" holiday where true love blossoms! Dark pink hydrangea, red and lavender roses, carnations, hot pink freesia and lavender phlox.',
    'https://cdn.floristone.com/small/T10-1A_t1.jpg',
    'https://cdn.floristone.com/large/T10-1A_d1.jpg',
    92, ['staff-picks', 'heirloom-quality'],
    'Named after the iconic film. For love stories worthy of the movies.',
    ['anniversary', 'valentines-day', 'love']
  ),
  flower(
    'T67-3A', 'Parisian Pinks', 104.95,
    'Named after the most romantic city in the world. Light pink roses in a white French country pot. C\'est magnifique!',
    'https://cdn.floristone.com/small/T67-3A_t1.jpg',
    'https://cdn.floristone.com/large/T67-3A_d1.jpg',
    91, ['perfect-for-memories'],
    'Pink roses symbolize femininity, elegance and refinement.',
    ['anniversary', 'valentines-day', 'mothers-day']
  ),
  flower(
    'C16-4839', 'Stunning Beauty Bouquet', 79.95,
    'Fragrant Stargazer lilies across red roses, lavender carnations, red Peruvian lilies, purple lisianthus and asters. An incredible way to convey sweetest sentiments.',
    'https://cdn.floristone.com/small/C16-4839_t1.jpg',
    'https://cdn.floristone.com/large/C16-4839_d1.jpg',
    90, ['staff-picks'],
    'Stargazer lilies have the most intoxicating fragrance. Unforgettable.',
    ['anniversary', 'love', 'birthday', 'valentines-day']
  ),
  flower(
    'C15-4790', 'Precious Heart Bouquet', 84.95,
    'A blushing display of loving kindness. Fuchsia roses among red asters, pink mini carnations and lush greens. Conveys your warmest wishes.',
    'https://cdn.floristone.com/small/C15-4790_t1.jpg',
    'https://cdn.floristone.com/large/C15-4790_d1.jpg',
    89, ['thoughtful-gestures'],
    'Bold fuchsia makes a statement. For hearts full of love.',
    ['anniversary', 'love', 'valentines-day']
  ),

  // =============================================================================
  // BIRTHDAY & CELEBRATION (8 products)
  // =============================================================================
  flower(
    'T34-1A', 'Once Upon a Daisy', 74.95,
    'Bright and sunny like a fairy tale ending. Light blue hydrangea, yellow gerberas and white daisies in a light blue Satin Cylinder with ribbon.',
    'https://cdn.floristone.com/small/T34-1A_t1.jpg',
    'https://cdn.floristone.com/large/T34-1A_d1.jpg',
    95, ['staff-picks', 'thoughtful-gestures'],
    'Daisies radiate pure joy. Perfect for making someone smile.',
    ['birthday', 'celebration', 'congratulations', 'thank-you']
  ),
  flower(
    'T21-1A', 'Dazzling Day Bouquet', 94.95,
    'Dazzle someone on their special day! Pink roses, yellow gerberas, alstroemeria, carnations, asters and a super happy birthday balloon.',
    'https://cdn.floristone.com/small/T21-1A_t1.jpg',
    'https://cdn.floristone.com/large/T21-1A_d1.jpg',
    94, ['staff-picks'],
    'Includes a balloon because birthdays should be fun!',
    ['birthday', 'celebration']
  ),
  flower(
    'T22-3A', 'Birthday Ribbon Bouquet', 74.95,
    'A surprise party in a bouquet! Bright ribbons line the acrylic vase behind an invisible panel. Yellow roses, lilies, red gerberas and more.',
    'https://cdn.floristone.com/small/T22-3A_t1.jpg',
    'https://cdn.floristone.com/large/T22-3A_d1.jpg',
    93, ['thoughtful-gestures'],
    'The hidden ribbon surprise makes this extra special.',
    ['birthday', 'celebration', 'anniversary']
  ),
  flower(
    'T24-1A', 'Fly Away Birthday Bouquet', 74.95,
    'Make birthday spirits soar! Brilliant orange roses, yellow alstroemeria, red carnations, daisies and a big bright balloon in cobalt blue vase.',
    'https://cdn.floristone.com/small/T24-1A_t1.jpg',
    'https://cdn.floristone.com/large/T24-1A_d1.jpg',
    92, ['thoughtful-gestures'],
    'Perfect for guys and gals - bright primary colors lift any spirits.',
    ['birthday', 'celebration']
  ),
  flower(
    'D5-4894', 'Happy Blooms Basket', 74.95,
    'Orange Asiatic lilies, lavender chrysanthemums, carnations, asters, green button poms in a whitewash basket with colorful ribbon and Happy Birthday balloon.',
    'https://cdn.floristone.com/small/D5-4894_t1.jpg',
    'https://cdn.floristone.com/large/D5-4894_d1.jpg',
    91, ['thoughtful-gestures'],
    'A basket of blooms plus balloon - double the celebration!',
    ['birthday']
  ),
  flower(
    'C6-5242', 'Bright & Beautiful Bouquet', 79.95,
    'Light, lovely, set to surprise and delight! Yellow Asiatic Lilies surrounded by hot pink roses, pink carnations, yellow solidago.',
    'https://cdn.floristone.com/small/C6-5242_t1.jpg',
    'https://cdn.floristone.com/large/C6-5242_d1.jpg',
    90, ['perfect-for-memories'],
    'Bright blooms that exude warmth and happiness.',
    ['birthday', 'thank-you', 'congratulations', 'mothers-day']
  ),
  flower(
    'C19-4846', 'Splendid Day Bouquet', 79.95,
    'Lavender roses, monte casino asters, matsumoto asters, green hypericum and button poms in a clear glass bubble bowl.',
    'https://cdn.floristone.com/small/C19-4846_t1.jpg',
    'https://cdn.floristone.com/large/C19-4846_d1.jpg',
    89, ['perfect-for-memories'],
    'Purple and green create a sophisticated celebration.',
    ['birthday', 'congratulations', 'thank-you']
  ),
  flower(
    'T18-1A', 'Simply Sweet', 74.95,
    'Life\'s simplest pleasures deliver the most poignant feelings. Yellow roses, pink lilies, alstroemeria, lavender daisies in a yellow vase with pink bow.',
    'https://cdn.floristone.com/small/T18-1A_t1.jpg',
    'https://cdn.floristone.com/large/T18-1A_d1.jpg',
    88, ['thoughtful-gestures'],
    'Simple but special. Sweeter than sweet!',
    ['birthday', 'thank-you', 'get-well', 'mothers-day']
  ),

  // =============================================================================
  // MOTHER'S DAY & PARENTS (6 products)
  // =============================================================================
  flower(
    'T17-1A', 'Perfectly Pleasing Pinks', 99.95,
    'A perfectly pleasing mix of springtime blossoms. White spray roses, hot pink gerberas and asters, pink carnations, lavender cushion mums, light pink stock.',
    'https://cdn.floristone.com/small/T17-1A_t1.jpg',
    'https://cdn.floristone.com/large/T17-1A_d1.jpg',
    96, ['staff-picks', 'perfect-for-memories'],
    'So full of feminine flowers. The perfect arrangement to make her smile.',
    ['mothers-day', 'birthday', 'thank-you', 'grandparents-day']
  ),
  flower(
    'T8-1A', 'Always a Lady', 139.95,
    'An eye-catching display of white roses and sweet pink asiatic lilies. A beautiful and lasting impression. Shows you love her always and forever.',
    'https://cdn.floristone.com/small/T8-1A_t1.jpg',
    'https://cdn.floristone.com/large/T8-1A_d1.jpg',
    95, ['staff-picks', 'heirloom-quality'],
    'Elegant and refined. For the lady who deserves the best.',
    ['mothers-day', 'anniversary', 'birthday']
  ),
  flower(
    'T55-2A', 'Arrive In Style', 84.95,
    'Ready for the runway! Light pink roses, white asiatic lilies, alstroemeria, cushion spray chrysanthemums and statice in a stylish vase.',
    'https://cdn.floristone.com/small/T55-2A_t1.jpg',
    'https://cdn.floristone.com/large/T55-2A_d1.jpg',
    94, ['perfect-for-memories'],
    'Style to spare! For the mom with impeccable taste.',
    ['mothers-day', 'birthday', 'thank-you']
  ),
  flower(
    'C13-5036', 'Pink Dream Bouquet', 79.95,
    'Classically elegant. Pink roses and mini carnations among white Asiatic Lilies, Peruvian Lilies, chrysanthemums, and statice.',
    'https://cdn.floristone.com/small/C13-5036_t1.jpg',
    'https://cdn.floristone.com/large/C13-5036_d1.jpg',
    93, ['thoughtful-gestures'],
    'A pink dream that never goes out of style.',
    ['mothers-day', 'birthday', 'anniversary']
  ),
  flower(
    'D9-4910', 'Sunshine Daydream Bouquet', 64.95,
    'Stunning sunflowers capture attention with bright beauty. Accented with solidago and lily grass blades. Sends warmest wishes for days ahead.',
    'https://cdn.floristone.com/small/D9-4910_t1.jpg',
    'https://cdn.floristone.com/large/D9-4910_d1.jpg',
    92, ['thoughtful-gestures'],
    'Sunflowers always face the sun. For moms who light up our lives.',
    ['mothers-day', 'birthday', 'thank-you', 'get-well']
  ),
  flower(
    'E7-4808', 'Yellow Rose Bouquet', 89.95,
    'Sunny yellow roses are a cheery and wonderful gift. Arranged with seeded eucalyptus in a clear glass vase. Lively and bright!',
    'https://cdn.floristone.com/small/E7-4808_t1.jpg',
    'https://cdn.floristone.com/large/E7-4808_d1.jpg',
    91, ['perfect-for-memories'],
    'Yellow roses represent friendship and joy. Perfect for mom.',
    ['mothers-day', 'thank-you', 'birthday', 'get-well']
  ),

  // =============================================================================
  // GET WELL & ENCOURAGEMENT (6 products)
  // =============================================================================
  flower(
    'C3-4793', 'Sunny Sentiments Bouquet', 74.95,
    'A blooming expression of charming cheer. Yellow roses, Peruvian Lilies, white daisies and green button poms - a wonderful way to celebrate life.',
    'https://cdn.floristone.com/small/C3-4793_t1.jpg',
    'https://cdn.floristone.com/large/C3-4793_d1.jpg',
    95, ['staff-picks', 'thoughtful-gestures'],
    'Sunshine colors have proven mood-lifting effects. The perfect pick-me-up.',
    ['get-well', 'thinking-of-you', 'cheer-up', 'encouragement']
  ),
  flower(
    'C5-5158', 'Your Day Bouquet', 74.95,
    'Make today their special day! White Asiatic Lilies with yellow Peruvian Lilies, chrysanthemums, button poms, and solidago in a bubble bowl.',
    'https://cdn.floristone.com/small/C5-5158_t1.jpg',
    'https://cdn.floristone.com/large/C5-5158_d1.jpg',
    94, ['thoughtful-gestures'],
    'Sun-kissed blooms and happy surprises. Brightens any day.',
    ['get-well', 'birthday', 'thank-you']
  ),
  flower(
    'D4-5199', 'All For You Bouquet', 79.95,
    'They always take care of everyone else. Yellow Asiatic Lilies, sunflowers, red carnations, spray roses, Peruvian Lilies, purple larkspur.',
    'https://cdn.floristone.com/small/D4-5199_t1.jpg',
    'https://cdn.floristone.com/large/D4-5199_d1.jpg',
    93, ['thoughtful-gestures'],
    'For the caretaker who deserves to be cared for.',
    ['get-well', 'thank-you', 'thinking-of-you']
  ),
  flower(
    'D3-5200', 'Colors Abound Bouquet', 74.95,
    'Full of energy and light! Orange roses, yellow daisies, hot pink carnations, orange mini carnations in an eye-catching orange glass vase.',
    'https://cdn.floristone.com/small/D3-5200_t1.jpg',
    'https://cdn.floristone.com/large/D3-5200_d1.jpg',
    92, ['thoughtful-gestures'],
    'Vibrant colors to energize and uplift.',
    ['get-well', 'birthday', 'congratulations']
  ),
  flower(
    'D3-4897', 'Happy Times Bouquet', 74.95,
    'Vibrant color and fragrance straight to their door. Yellow roses, purple stock, green button poms, fuchsia mini carnations in a square glass vase.',
    'https://cdn.floristone.com/small/D3-4897_t1.jpg',
    'https://cdn.floristone.com/large/D3-4897_d1.jpg',
    91, ['perfect-for-memories'],
    'Fragrant stock adds an extra sensory delight.',
    ['get-well', 'birthday', 'congratulations', 'thank-you']
  ),
  flower(
    'C6-5035', 'Light & Lovely Bouquet', 74.95,
    'All the frills and every color under the sun! Yellow daisies, orange Peruvian Lilies, lavender asters, orange carnations with lime green ribbon.',
    'https://cdn.floristone.com/small/C6-5035_t1.jpg',
    'https://cdn.floristone.com/large/C6-5035_d1.jpg',
    90, ['thoughtful-gestures'],
    'Light and lovely - just like your well wishes.',
    ['get-well', 'birthday', 'thank-you']
  ),

  // =============================================================================
  // NEW BABY (4 products)
  // =============================================================================
  flower(
    'D7-4904', 'Girls Are Great!', 74.95,
    'Blooming with sweet love for a baby girl! White roses, Peruvian lilies, pink carnations, matsumoto asters, Asiatic lilies with "It\'s a Girl!" balloon.',
    'https://cdn.floristone.com/small/D7-4904_t1.jpg',
    'https://cdn.floristone.com/large/D7-4904_d1.jpg',
    95, ['thoughtful-gestures'],
    'Welcoming a new life deserves something special.',
    ['new-baby', 'baby-girl', 'congratulations']
  ),
  flower(
    'D7-4903', 'Boys Are Best!', 74.95,
    'Sweet love for a baby boy! Lavender roses, blue iris, lavender carnations, daisies, white Asiatic lilies with "It\'s a Boy!" balloon.',
    'https://cdn.floristone.com/small/D7-4903_t1.jpg',
    'https://cdn.floristone.com/large/D7-4903_d1.jpg',
    95, ['thoughtful-gestures'],
    'Blue flowers symbolize serenity and calm - what new parents need!',
    ['new-baby', 'baby-boy', 'congratulations']
  ),
  flower(
    'D7-4906', 'Girl Power Bouquet', 64.95,
    'Pink roses, pink Asiatic lilies, pale peach carnations, green mini carnations with pink satin ribbon. Warmest wishes for parenthood.',
    'https://cdn.floristone.com/small/D7-4906_t1.jpg',
    'https://cdn.floristone.com/large/D7-4906_d1.jpg',
    93, ['thoughtful-gestures'],
    'Soft pinks for a soft little one.',
    ['new-baby', 'baby-girl', 'mothers-day']
  ),
  flower(
    'D7-4905', 'Boy-Oh-Boy Bouquet', 64.95,
    'Yellow roses and carnations with green mini carnations, white Asiatic lilies, yellow solidago accented with blue and lavender ribbon.',
    'https://cdn.floristone.com/small/D7-4905_t1.jpg',
    'https://cdn.floristone.com/large/D7-4905_d1.jpg',
    93, ['thoughtful-gestures'],
    'Bright and sunny congratulations for the new family.',
    ['new-baby', 'baby-boy', 'congratulations']
  ),

  // =============================================================================
  // THANK YOU & GRATITUDE (2 products)
  // =============================================================================
  flower(
    'FAA-126', 'Gathered With Love', 129.95,
    'Flowers you might pick on a stroll through a magical garden. Pink snapdragons, burgundy carnations, spray roses, purple liatris and waxflower.',
    'https://cdn.floristone.com/small/FAA-126.jpg',
    'https://cdn.floristone.com/large/FAA-126.jpg',
    96, ['staff-picks', 'perfect-for-memories'],
    'Like gathering flowers from a loved one\'s garden. Personal, warm, unforgettable.',
    ['thank-you', 'gratitude', 'appreciation', 'hostess']
  ),
  flower(
    'D9-4911', 'Well Done Bouquet', 74.95,
    'Bright roses and sunny Asiatic lilies to congratulate on a job well done! Pink roses, green Fuji mums, pink Peruvian lilies, yellow lilies.',
    'https://cdn.floristone.com/small/D9-4911_t1.jpg',
    'https://cdn.floristone.com/large/D9-4911_d1.jpg',
    94, ['thoughtful-gestures'],
    'The perfect "congratulations" or "thank you" for achievements.',
    ['thank-you', 'congratulations', 'graduation', 'promotion']
  ),

  // Funeral service flowers section removed
];

export default FLORISTONE_FLOWERS;
