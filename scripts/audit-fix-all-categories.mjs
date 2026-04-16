#!/usr/bin/env node
/**
 * audit-fix-all-categories.mjs
 *
 * Comprehensive category audit + fix for ALL active marketplace_products.
 *
 * 3-tier priority:
 *   Tier 1 — Brand slug override (curated map)
 *   Tier 2 — Product name patterns (strict regex)
 *   Tier 3 — Description keyword fallback
 *
 * Also deactivates excluded products (alcohol, experiences, charity, etc.)
 *
 * Idempotent: safe to re-run.
 *
 * Usage:
 *   node scripts/audit-fix-all-categories.mjs
 *   node scripts/audit-fix-all-categories.mjs --dry-run
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envLocal = resolve(__dirname, '..', '.env.local');
const envFallback = resolve(__dirname, '..', '..', '..', '..', '.env.local');
config({ path: existsSync(envLocal) ? envLocal : envFallback });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const DRY_RUN = process.argv.includes('--dry-run');
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ═══════════════════════════════════════════════════════════════════════════
// EXCLUSION RULES — products matching these get is_active = false
// ═══════════════════════════════════════════════════════════════════════════

// Brands that are safe "flask" brands (water bottles, not alcohol)
const SAFE_FLASK_BRANDS = new Set([
  'hydro-flask', 'stanley', 'yeti', 'hydroflask', 'swell', 's-well',
  'corkcicle', 'klean-kanteen', 'miir', 'simple-modern', 'takeya',
]);

/**
 * Returns true if the product should be deactivated (excluded).
 */
function shouldExclude(product) {
  const name = (product.name || '').toLowerCase();
  const brand = (product.brand_slug || '').toLowerCase();
  const brandName = (product.brand_name || '').toLowerCase();
  const desc = (product.description || '').toLowerCase();
  const text = `${name} ${brandName} ${desc}`;

  // Alcohol — strict patterns
  const alcoholBrands = /\b(winc|wine\.com|drizly|saucey|total-wine|bevmo|minibar-delivery|spiritedgifts)\b/;
  if (alcoholBrands.test(brand)) return true;

  const alcoholProducts = /\b(wine|beer|spirits|vodka|whiskey|whisky|bourbon|cocktail|brew|liquor|tequila|mezcal|sake|soju)\b/i;
  if (alcoholProducts.test(name)) {
    // Exception: barware (glasses, shakers, tools) from non-alcohol brands
    const isBarware = /\b(wine\s+(glass|glasses|tumbler|tumblers|chiller|chillers|opener|stopper|rack|cooler|aerator|decanter|carafe|set|bottle\s*opener|corkscrew)|cocktail\s+(shaker|shakers|set|kit|glass|glasses|napkin|pick|strainer|jigger|muddler|mixing)|beer\s+(glass|glasses|mug|stein|pint|cheese)|whiskey\s+(glass|glasses|stones|set|decanter)|sake\s+(set|cup|cups))\b/i.test(name);
    // Also exception: food products that mention beer/wine as flavor/ingredient
    const isFoodContext = /\b(beer\s+cheese|wine\s+(sauce|reduction|vinegar|pairing)|bourbon\s+(sauce|glaze|vanilla|caramel))\b/i.test(name);
    const isAlcoholBrand = alcoholBrands.test(brand);
    if ((isBarware || isFoodContext) && !isAlcoholBrand) {
      // Don't exclude — it's barware or food product
    } else {
      return true;
    }
  }

  // "Champagne" — exclude the drink, not the color
  if (/\bchampagne\b/i.test(name)) {
    // Allow "Champagne Bears", "Champagne Gummy", "Champagne Gold", color references
    const champagneColorContext = /champagne\s*(bear|gummy|gummies|gold|color|pink|toast|bubble|candy|truffles|chocolate)/i;
    if (!champagneColorContext.test(name)) return true;
  }

  // Flask — only exclude "hip flask", "whiskey flask", etc.
  if (/\b(hip\s+flask|whiskey\s+flask|liquor\s+flask|drinking\s+flask)\b/i.test(name)) {
    if (!SAFE_FLASK_BRANDS.has(brand)) return true;
  }

  // Experiences, classes, tickets
  if (/\b(experience|class|lesson|workshop|concert|ticket|virtual event|masterclass)\b/i.test(name)) {
    // Exception: "experience" in description context like "gifting experience" is fine
    // But in the product NAME, it likely IS an experience product
    return true;
  }

  // Charity / donations
  if (/\b(charity|donate|donation|nonprofit|non-profit)\b/i.test(name)) return true;

  return false;
}

// ═══════════════════════════════════════════════════════════════════════════
// TIER 1 — BRAND SLUG → CATEGORY MAP (highest priority)
// ═══════════════════════════════════════════════════════════════════════════

const BRAND_CATEGORY_MAP = {
  // ── FLOWERS (actual flower delivery) ───────────────────────────────────
  'lively-root': ['flowers'],
  'the-bouqs-company': ['flowers'],
  'bouqs': ['flowers'],
  'urbanstems': ['flowers'],
  'farmgirl-flowers': ['flowers'],
  'venus-et-fleur': ['flowers'],
  'bloomsybox': ['flowers'],
  'floom': ['flowers'],
  'alice-flowers': ['flowers'],
  'flowerbx': ['flowers'],
  'from-you-flowers': ['flowers'],
  'proflowers': ['flowers'],
  'ftd': ['flowers'],
  '1-800-flowers': ['flowers'],
  'teleflora': ['flowers'],

  // ── BABY & KIDS (strict — only child-focused brands) ──────────────────
  'lovevery': ['baby-kids'],
  'cuddle-kind': ['baby-kids'],
  'cuddle+kind': ['baby-kids'],
  'tegu': ['baby-kids'],
  'babybjorn': ['baby-kids'],
  'tushbaby': ['baby-kids'],
  'baby-blossom': ['baby-kids'],
  'nurtured-9': ['baby-kids'],
  'hanna-andersson': ['baby-kids'],
  'jellycat': ['baby-kids'],
  'melissa-doug': ['baby-kids'],
  'melissa-and-doug': ['baby-kids'],
  'little-sleepies': ['baby-kids'],
  'kiwico': ['baby-kids'],
  'tonies': ['baby-kids'],
  'gathre': ['baby-kids'],
  'solly-baby': ['baby-kids'],
  'copper-pearl': ['baby-kids'],
  'spearmint-love': ['baby-kids'],
  'freshly-picked': ['baby-kids'],
  'little-unicorn': ['baby-kids'],
  'aden-anais': ['baby-kids'],
  'ergo-baby': ['baby-kids'],
  'ergobaby': ['baby-kids'],
  'baby-brezza': ['baby-kids'],
  'stokke': ['baby-kids'],
  'munchkin': ['baby-kids'],
  'skip-hop': ['baby-kids'],
  'bumkins': ['baby-kids'],
  'mushie': ['baby-kids'],
  'little-people-big-dreams': ['baby-kids'],

  // ── TECH ───────────────────────────────────────────────────────────────
  'apple': ['tech'],
  'bose': ['tech', 'headphones-audio'],
  'sony': ['tech', 'headphones-audio'],
  'jbl': ['tech', 'headphones-audio'],
  'marshall': ['tech', 'headphones-audio'],
  'sonos': ['tech', 'home-tech'],
  'samsung': ['tech'],
  'amazon': ['tech'],
  'logitech': ['tech', 'office'],
  'razer': ['tech', 'gaming'],
  'nintendo': ['tech', 'gaming'],
  'native-union': ['tech', 'office'],
  'anker': ['tech'],
  'beats': ['tech', 'headphones-audio'],
  'fujifilm': ['tech', 'film-cameras'],
  'google': ['tech', 'home-tech'],
  'belkin': ['tech'],
  'bang-olufsen': ['tech', 'headphones-audio'],
  'sennheiser': ['tech', 'headphones-audio'],
  'audio-technica': ['tech', 'headphones-audio'],
  'jabra': ['tech', 'headphones-audio'],
  'skullcandy': ['tech', 'headphones-audio'],
  'roku': ['tech', 'home-tech'],
  'ember': ['tech', 'home'],
  'tile': ['tech'],
  'ring': ['tech', 'home-tech'],
  'nest': ['tech', 'home-tech'],
  'gopro': ['tech'],
  'dji': ['tech'],
  'garmin': ['tech', 'travel-outdoors'],
  'fitbit': ['tech', 'wellness-tech'],
  'polaroid': ['tech', 'film-cameras'],
  'kodak': ['tech', 'film-cameras'],
  'instant-pot': ['tech', 'home'],
  'breville': ['tech', 'home'],
  'dyson': ['tech', 'home'],
  'roomba': ['tech', 'home-tech'],
  'irobot': ['tech', 'home-tech'],
  'kindle': ['tech'],

  // ── HOME (furniture, kitchenware, bedding, candles, decor) ─────────────
  'brooklinen': ['home'],
  'le-creuset': ['home'],
  'casper': ['home'],
  'our-place': ['home'],
  'caraway': ['home'],
  'solo-stove': ['home'],
  'diptyque': ['home'],
  'otherland': ['home'],
  'voluspa': ['home'],
  'snowe': ['home'],
  'parachute': ['home'],
  'staub': ['home'],
  'bird-buddy': ['home'],
  'joyjolt': ['home'],
  'sunday-citizen': ['home'],
  'pendleton': ['home'],
  'anthropologie': ['home'],
  'west-elm': ['home'],
  'cb2': ['home'],
  'schmidt-bros': ['home'],
  'schmidt-brothers': ['home'],
  'yamazaki-home': ['home'],
  'yamazaki': ['home'],
  'boy-smells': ['home'],
  'yankee-candle': ['home'],
  'restoration-hardware': ['home'],
  'pottery-barn': ['home'],
  'crate-barrel': ['home'],
  'crate-and-barrel': ['home'],
  'williams-sonoma': ['home'],
  'all-clad': ['home'],
  'wusthof': ['home'],
  'zwilling': ['home'],
  'henckels': ['home'],
  'cutco': ['home'],
  'shun': ['home'],
  'victorinox': ['home'],
  'global-knives': ['home'],
  'material-kitchen': ['home'],
  'great-jones': ['home'],
  'food52': ['home'],
  'east-fork': ['home'],
  'patrick-dempsey': ['home'],
  'smeg': ['home'],
  'kitchenaid': ['home'],
  'lunya': ['home'],
  'bearaby': ['home'],
  'gravity-blanket': ['home'],
  'boll-branch': ['home'],
  'ettitude': ['home'],
  'buffy': ['home'],
  'blueland': ['home'],
  'public-goods': ['home'],
  'loloi': ['home'],
  'ruggable': ['home'],
  'vitruvi': ['home', 'wellness'],
  'hay': ['home'],
  'muji': ['home'],
  'marimekko': ['home'],
  'fishs-eddy': ['home'],
  'jonathan-adler': ['home'],
  'areaware': ['home'],
  'campo': ['home'],
  'p-f-candle-co': ['home'],
  'apotheke': ['home'],
  'nest-new-york': ['home'],
  'nest-fragrances': ['home'],
  'paddywax': ['home'],
  'homesick': ['home'],
  'archipelago': ['home'],
  'illume': ['home'],
  'rewined': ['home'],
  'capri-blue': ['home'],

  // ── FOOD & DRINKS (non-alcohol) ────────────────────────────────────────
  'godiva': ['food-drinks'],
  'sugarfina': ['food-drinks'],
  'graza': ['food-drinks'],
  'harry-david': ['food-drinks', 'gift-baskets'],
  'harry-and-david': ['food-drinks', 'gift-baskets'],
  'mouth': ['food-drinks', 'gift-baskets'],
  'vosges-haut-chocolat': ['food-drinks'],
  'vosges': ['food-drinks'],
  'fly-by-jing': ['food-drinks'],
  'blue-bottle-coffee': ['food-drinks'],
  'blue-bottle': ['food-drinks'],
  'baked-by-melissa': ['food-drinks'],
  'lolli-pops': ['food-drinks'],
  'lolli-and-pops': ['food-drinks'],
  'red-velvet-nyc': ['food-drinks'],
  'levain-bakery': ['food-drinks'],
  'goldbelly': ['food-drinks'],
  'compartés': ['food-drinks'],
  'compartes': ['food-drinks'],
  'milk-bar': ['food-drinks'],
  'magnolia-bakery': ['food-drinks'],
  'yoku-moku': ['food-drinks'],
  'ladurée': ['food-drinks'],
  'laduree': ['food-drinks'],
  'maison-du-chocolat': ['food-drinks'],
  'la-maison-du-chocolat': ['food-drinks'],
  'chuao': ['food-drinks'],
  'taza-chocolate': ['food-drinks'],
  'hu-chocolate': ['food-drinks'],
  'hu-kitchen': ['food-drinks'],
  'raaka': ['food-drinks'],
  'mast-brothers': ['food-drinks'],
  'mast': ['food-drinks'],
  'dandelion-chocolate': ['food-drinks'],
  'intelligentsia': ['food-drinks'],
  'stumptown': ['food-drinks'],
  'verve-coffee': ['food-drinks'],
  'counter-culture': ['food-drinks'],
  'la-colombe': ['food-drinks'],
  'nespresso': ['food-drinks', 'tech'],
  'fellow': ['food-drinks', 'home'],
  'ito-en': ['food-drinks'],
  'kusmi-tea': ['food-drinks'],
  'harney-sons': ['food-drinks'],
  'harney-and-sons': ['food-drinks'],
  'teasdale': ['food-drinks'],
  'rishi-tea': ['food-drinks'],
  'davidstea': ['food-drinks'],
  'david-s-tea': ['food-drinks'],
  'tazo': ['food-drinks'],
  'brooklyn-brew-shop': ['food-drinks'],
  'nuts-com': ['food-drinks'],
  'nuts.com': ['food-drinks'],
  'farm-to-people': ['food-drinks', 'gift-baskets'],
  'artisan-gift-boxes': ['food-drinks', 'gift-baskets'],
  'mouth-foods': ['food-drinks', 'gift-baskets'],
  'edoughble': ['food-drinks'],
  'fatty-sundays': ['food-drinks'],
  'georgetown-cupcake': ['food-drinks'],
  'nothing-bundt-cakes': ['food-drinks'],
  'cheryl-cookies': ['food-drinks'],
  'cheryls': ['food-drinks'],
  'mrs-fields': ['food-drinks'],
  'see-s-candies': ['food-drinks'],
  'sees-candies': ['food-drinks'],
  'ethel-m': ['food-drinks'],
  'ghirardelli': ['food-drinks'],
  'lindt': ['food-drinks'],
  'fannie-may': ['food-drinks'],
  'fran-s-chocolates': ['food-drinks'],
  'recchiuti': ['food-drinks'],
  'li-lac': ['food-drinks'],

  // ── FASHION & ACCESSORIES ──────────────────────────────────────────────
  'marine-layer': ['fashion-accessories'],
  'allbirds': ['fashion-accessories'],
  'barefoot-dreams': ['fashion-accessories'],
  'everlane': ['fashion-accessories'],
  'mejuri': ['fashion-accessories'],
  'gorjana': ['fashion-accessories'],
  'prada': ['fashion-accessories'],
  'kate-spade': ['fashion-accessories'],
  'cuyana': ['fashion-accessories'],
  'quince': ['fashion-accessories'],
  'fair-harbor': ['fashion-accessories'],
  'cuts-clothing': ['fashion-accessories'],
  'cuts': ['fashion-accessories'],
  'sterling-forever': ['fashion-accessories'],
  'haus-of-brilliance': ['fashion-accessories'],
  'oura': ['fashion-accessories', 'wellness-tech'],
  'kendra-scott': ['fashion-accessories'],
  'baublebar': ['fashion-accessories'],
  'madewell': ['fashion-accessories'],
  'j-crew': ['fashion-accessories'],
  'tory-burch': ['fashion-accessories'],
  'coach': ['fashion-accessories'],
  'michael-kors': ['fashion-accessories'],
  'ray-ban': ['fashion-accessories'],
  'warby-parker': ['fashion-accessories'],
  'oliver-peoples': ['fashion-accessories'],
  'uncommon-james': ['fashion-accessories'],
  'missoma': ['fashion-accessories'],
  'monica-vinader': ['fashion-accessories'],
  'pandora': ['fashion-accessories'],
  'swarovski': ['fashion-accessories'],
  'david-yurman': ['fashion-accessories'],
  'bombas': ['fashion-accessories'],
  'stance': ['fashion-accessories'],
  'happy-socks': ['fashion-accessories'],
  'mack-weldon': ['fashion-accessories'],
  'vuori': ['fashion-accessories'],
  'outdoor-voices': ['fashion-accessories'],
  'girlfriend-collective': ['fashion-accessories'],
  'athleta': ['fashion-accessories'],
  'cariuma': ['fashion-accessories'],
  'rothy-s': ['fashion-accessories'],
  'rothys': ['fashion-accessories'],
  'birdies': ['fashion-accessories'],
  'nisolo': ['fashion-accessories'],
  'toms': ['fashion-accessories'],
  'frye': ['fashion-accessories'],
  'ugg': ['fashion-accessories'],
  'birkenstock': ['fashion-accessories'],
  'new-balance': ['fashion-accessories'],
  'nike': ['fashion-accessories'],
  'adidas': ['fashion-accessories'],
  'converse': ['fashion-accessories'],
  'vans': ['fashion-accessories'],
  'mz-wallace': ['fashion-accessories'],
  'dagne-dover': ['fashion-accessories'],
  'herschel': ['fashion-accessories'],
  'longchamp': ['fashion-accessories'],
  'lo-sons': ['fashion-accessories'],
  'lo-and-sons': ['fashion-accessories'],
  'matt-nat': ['fashion-accessories'],
  'fossil': ['fashion-accessories'],
  'daniel-wellington': ['fashion-accessories'],
  'mvmt': ['fashion-accessories'],
  'shinola': ['fashion-accessories'],
  'casio': ['fashion-accessories'],
  'timex': ['fashion-accessories'],
  'born-living-steel': ['fashion-accessories'],
  'aurate': ['fashion-accessories'],
  'marc-jacobs': ['fashion-accessories'],
  'versace': ['fashion-accessories'],
  'gucci': ['fashion-accessories'],
  'burberry': ['fashion-accessories'],
  'ralph-lauren': ['fashion-accessories'],
  'calvin-klein': ['fashion-accessories'],
  'tommy-hilfiger': ['fashion-accessories'],
  'lilly-pulitzer': ['fashion-accessories'],
  'vineyard-vines': ['fashion-accessories'],
  'johnny-was': ['fashion-accessories'],
  'free-people': ['fashion-accessories'],
  'anthropologie-fashion': ['fashion-accessories'],

  // ── WELLNESS ───────────────────────────────────────────────────────────
  'therabody': ['wellness', 'wellness-tech'],
  'hatch': ['wellness', 'home-tech'],
  'lululemon': ['wellness'],
  'homedics': ['wellness'],
  'manduka': ['wellness'],
  'burts-bees': ['wellness'],
  'burt-s-bees': ['wellness'],
  'auraglow': ['wellness'],
  'calm': ['wellness'],
  'headspace': ['wellness'],
  'sakara-life': ['wellness'],
  'sakara': ['wellness'],
  'athleta': ['wellness', 'fashion-accessories'],
  'glossier': ['wellness'],
  'tatcha': ['wellness'],
  'drunk-elephant': ['wellness'],
  'necessaire': ['wellness'],
  'osea': ['wellness'],
  'herbivore': ['wellness'],
  'summer-fridays': ['wellness'],
  'supergoop': ['wellness'],
  'kiehl-s': ['wellness'],
  'kiehls': ['wellness'],
  'aesop': ['wellness'],
  'jo-malone': ['wellness'],
  'malin-goetz': ['wellness'],
  'byredo': ['wellness'],
  'le-labo': ['wellness'],
  'sol-de-janeiro': ['wellness'],
  'fresh': ['wellness'],
  'bumble-and-bumble': ['wellness'],
  'olaplex': ['wellness'],
  'living-proof': ['wellness'],
  'prose': ['wellness'],
  'function-of-beauty': ['wellness'],
  'dr-dennis-gross': ['wellness'],
  'paula-s-choice': ['wellness'],
  'paulas-choice': ['wellness'],
  'cerave': ['wellness'],
  'la-mer': ['wellness'],
  'sk-ii': ['wellness'],
  'sunday-riley': ['wellness'],
  'tula': ['wellness'],
  'moon-juice': ['wellness'],
  'olly': ['wellness'],
  'ritual': ['wellness'],
  'seed': ['wellness'],
  'athletic-greens': ['wellness'],
  'ag1': ['wellness'],
  'whoop': ['wellness', 'wellness-tech'],

  // ── TRAVEL & OUTDOORS ──────────────────────────────────────────────────
  'away': ['travel-outdoors'],
  'tumi': ['travel-outdoors'],
  'ridge': ['travel-outdoors', 'fashion-accessories'],
  'peak-design': ['travel-outdoors'],
  'yeti': ['travel-outdoors', 'home'],
  'stanley': ['travel-outdoors', 'home'],
  'hydro-flask': ['travel-outdoors'],
  'hydroflask': ['travel-outdoors'],
  'patagonia': ['travel-outdoors', 'fashion-accessories'],
  'brevite': ['travel-outdoors'],
  'osprey': ['travel-outdoors'],
  'north-face': ['travel-outdoors', 'fashion-accessories'],
  'the-north-face': ['travel-outdoors', 'fashion-accessories'],
  'rei': ['travel-outdoors'],
  'arc-teryx': ['travel-outdoors', 'fashion-accessories'],
  'arcteryx': ['travel-outdoors', 'fashion-accessories'],
  'columbia': ['travel-outdoors'],
  'corkcicle': ['travel-outdoors', 'home'],
  'swell': ['travel-outdoors', 'home'],
  's-well': ['travel-outdoors', 'home'],
  'miir': ['travel-outdoors', 'home'],
  'simple-modern': ['travel-outdoors', 'home'],
  'klean-kanteen': ['travel-outdoors'],
  'cotopaxi': ['travel-outdoors'],
  'kelty': ['travel-outdoors'],
  'rumpl': ['travel-outdoors'],
  'eno': ['travel-outdoors'],

  // ── PERSONALIZED / OFFICE ──────────────────────────────────────────────
  'rifle-paper-co': ['personalized', 'office'],
  'moleskine': ['personalized', 'office'],
  'leuchtturm1917': ['personalized', 'office'],
  'leuchtturm': ['personalized', 'office'],
  'papier': ['personalized'],
  'minted': ['personalized'],
  'artifact-uprising': ['personalized'],
  'chatbooks': ['personalized'],
  'shutterfly': ['personalized'],
  'framebridge': ['personalized', 'home'],

  // ── TOYS / GAMES (NOT flowers, NOT baby-kids unless child brand) ──────
  'lego': ['baby-kids', 'home'],
  'hasbro': ['baby-kids'],
  'mattel': ['baby-kids'],
  'fisher-price': ['baby-kids'],
  'playmobil': ['baby-kids'],
  'magna-tiles': ['baby-kids'],
  'fat-brain-toys': ['baby-kids'],

  // ── GIFT BASKETS ───────────────────────────────────────────────────────
  'hickory-farms': ['food-drinks', 'gift-baskets'],
  'wolferman-s': ['food-drinks', 'gift-baskets'],
  'wolfermans': ['food-drinks', 'gift-baskets'],
  'knack': ['gift-baskets'],
  'gift-tree': ['gift-baskets'],
  'gifttree': ['gift-baskets'],
  'gourmet-gift-baskets': ['food-drinks', 'gift-baskets'],
  'wine-country-gift-baskets': ['food-drinks', 'gift-baskets'],
};

// ═══════════════════════════════════════════════════════════════════════════
// TIER 2 — STRICT NAME PATTERNS (regex must match specific product types)
// ═══════════════════════════════════════════════════════════════════════════

const STRICT_NAME_PATTERNS = [
  // Tech / Audio
  { test: /\b(headphone|earbud|airpod|earphone)\b/i, cats: ['tech', 'headphones-audio'] },
  { test: /\b(speaker|soundbar|subwoofer)\b/i, cats: ['tech', 'headphones-audio'] },
  { test: /\b(keyboard|mouse pad|gaming mouse)\b/i, cats: ['tech', 'gaming'] },
  { test: /\b(game console|controller|gaming)\b/i, cats: ['tech', 'gaming'] },
  { test: /\b(camera|film|instant photo|polaroid)\b/i, cats: ['tech', 'film-cameras'] },
  { test: /\b(phone case|charger|cable|adapter|dock|stand|power bank)\b/i, cats: ['tech'] },
  { test: /\b(smart watch|smartwatch|fitness tracker)\b/i, cats: ['tech', 'wellness-tech'] },

  // Home
  { test: /\b(candle|diffuser|incense|room spray)\b/i, cats: ['home'] },
  { test: /\b(sheet set|duvet|pillow|towel set|robe|bedding|blanket|comforter|quilt)\b/i, cats: ['home'] },
  { test: /\b(mug|tumbler|water bottle)\b/i, cats: ['home'] },
  { test: /\b(knife|knives|cutting board|skillet|pan|pot|dutch oven|spatula|whisk|kitchen)\b/i, cats: ['home'] },
  { test: /\b(vase|planter|picture frame|throw pillow|coaster)\b/i, cats: ['home'] },
  { test: /\b(serving board|cheese board|charcuterie)\b/i, cats: ['home'] },
  { test: /\b(fire pit|firepit|grill|smoker|bbq)\b/i, cats: ['home'] },

  // Food & Drinks
  { test: /\b(chocolate|truffle|cookie|brownie|cake|candy|gummy|popcorn|pretzel|macaron)\b/i, cats: ['food-drinks'] },
  { test: /\b(coffee|tea set|tea gift|loose leaf tea|espresso|matcha|latte)\b/i, cats: ['food-drinks'] },
  { test: /\b(olive oil|hot sauce|spice|seasoning|honey|jam|preserves|salsa)\b/i, cats: ['food-drinks'] },
  { test: /\b(snack|nut|dried fruit|granola|protein bar)\b/i, cats: ['food-drinks'] },

  // Fashion & Accessories
  { test: /\b(necklace|bracelet|ring|earring|pendant|jewelry|brooch|cufflink)\b/i, cats: ['fashion-accessories'] },
  { test: /\b(dress|skirt|blouse|hoodie|sweatshirt|jacket|coat|shorts|pants|jeans|legging|sweater)\b/i, cats: ['fashion-accessories'] },
  { test: /\b(sneaker|shoe|slipper|boot|sandal|loafer|mule)\b/i, cats: ['fashion-accessories'] },
  { test: /\b(wallet|card holder|tote bag|purse|clutch|handbag|crossbody)\b/i, cats: ['fashion-accessories'] },
  { test: /\b(scarf|beanie|hat|gloves|tie|bow tie|sunglasses)\b/i, cats: ['fashion-accessories'] },
  // "belt" only as fashion when not "belt cable" or tech context
  { test: /\b(leather belt|dress belt|belt buckle)\b/i, cats: ['fashion-accessories'] },
  // "watch" is too broad — match specific watch types only
  { test: /\b(wristwatch|analog watch|digital watch|dress watch|field watch)\b/i, cats: ['fashion-accessories'] },

  // Baby & Kids (STRICT — must match specific child product words)
  { test: /\b(baby carrier|baby swaddle|baby blanket|baby gift|nursery|stroller|pacifier|teether|onesie)\b/i, cats: ['baby-kids'] },
  { test: /\b(toddler|infant|newborn)\b/i, cats: ['baby-kids'] },

  // Flowers (EXTRA STRICT — only from flower context)
  { test: /\b(orchid|bouquet|floral arrangement|fresh flower|potted plant|succulent)\b/i, cats: ['flowers'] },

  // Wellness
  { test: /\b(yoga mat|massage gun|meditation cushion|essential oil|aromatherapy)\b/i, cats: ['wellness'] },
  { test: /\b(skincare set|face mask|body lotion|bath bomb|body scrub|lip balm)\b/i, cats: ['wellness'] },

  // Gift Baskets
  { test: /\b(gift basket|gift box|gift set|care package|sampler box|variety pack)\b/i, cats: ['gift-baskets'] },

  // Personalized / Office
  { test: /\b(notebook|journal|planner|pen set|stationery)\b/i, cats: ['personalized', 'office'] },
  { test: /\b(custom|personalized|monogram|engrav|embroid)\b/i, cats: ['personalized'] },

  // Travel & Outdoors (strict — no "travel" alone, it's too broad)
  { test: /\b(backpack|luggage|carry-on|suitcase|duffel|packing cube)\b/i, cats: ['travel-outdoors'] },
  { test: /\b(camping|tent|sleeping bag|hiking|binoculars)\b/i, cats: ['travel-outdoors'] },
  { test: /\b(cooler|insulated bag|travel bag|travel set|travel kit)\b/i, cats: ['travel-outdoors'] },
];

// ═══════════════════════════════════════════════════════════════════════════
// TIER 3 — DESCRIPTION KEYWORD FALLBACK (lowest priority)
// ═══════════════════════════════════════════════════════════════════════════

const DESCRIPTION_PATTERNS = [
  { test: /\b(headphone|earbud|speaker|bluetooth audio)\b/i, cats: ['tech', 'headphones-audio'] },
  { test: /\b(candle|diffuser|incense|home fragrance)\b/i, cats: ['home'] },
  { test: /\b(chocolate|gourmet food|artisan cookie|truffle)\b/i, cats: ['food-drinks'] },
  { test: /\b(necklace|bracelet|earring|jewelry|fine jewel)\b/i, cats: ['fashion-accessories'] },
  { test: /\b(nursery|baby shower|newborn gift)\b/i, cats: ['baby-kids'] },
  { test: /\b(yoga|meditation|wellness|self-care)\b/i, cats: ['wellness'] },
  { test: /\b(luggage|carry-on|travel bag|travel set)\b/i, cats: ['travel-outdoors'] },
  { test: /\b(gift basket|curated box|care package)\b/i, cats: ['gift-baskets'] },
];

// ═══════════════════════════════════════════════════════════════════════════
// BRAND DENY LIST for baby-kids (these must NEVER be in baby-kids)
// ═══════════════════════════════════════════════════════════════════════════

const BABY_KIDS_DENY_SLUGS = new Set([
  'schmidt-bros', 'schmidt-brothers', 'wusthof', 'zwilling', 'henckels',
  'cutco', 'shun', 'victorinox', 'global-knives', 'material-kitchen',
  'le-creuset', 'staub', 'our-place', 'caraway', 'all-clad',
  'away', 'tumi', 'ridge', 'peak-design',
  'therabody', 'bose', 'sony', 'apple', 'samsung',
  'solo-stove', 'yeti', 'stanley', 'hydro-flask',
  'prada', 'kate-spade', 'coach', 'tory-burch',
  'marine-layer', 'allbirds', 'everlane', 'patagonia',
  'diptyque', 'otherland', 'voluspa', 'boy-smells',
]);

// ═══════════════════════════════════════════════════════════════════════════
// FLOWER BRANDS — only these brands can have 'flowers' category
// ═══════════════════════════════════════════════════════════════════════════

const FLOWER_BRAND_SLUGS = new Set([
  'lively-root', 'the-bouqs-company', 'bouqs', 'urbanstems',
  'farmgirl-flowers', 'venus-et-fleur', 'bloomsybox', 'floom',
  'alice-flowers', 'flowerbx', 'from-you-flowers', 'proflowers',
  'ftd', '1-800-flowers', 'teleflora',
]);

// Categories to always remove
const EXCLUDED_CATEGORIES = new Set([
  'nurse-appreciation', 'admin-appreciation', 'earth-month',
]);

// ═══════════════════════════════════════════════════════════════════════════
// CATEGORY INFERENCE ENGINE
// ═══════════════════════════════════════════════════════════════════════════

function inferCategories(product) {
  const brandSlug = (product.brand_slug || '').toLowerCase().trim();
  const name = product.name || '';
  const desc = product.description || '';
  const cats = new Set();
  let matched = false;

  // ── Tier 1: Brand slug override ──────────────────────────────────────
  // Try exact slug match first
  if (brandSlug && BRAND_CATEGORY_MAP[brandSlug]) {
    BRAND_CATEGORY_MAP[brandSlug].forEach(c => cats.add(c));
    matched = true;
  }

  // Try brand_name normalized to slug format (replace spaces/special with -)
  if (!matched) {
    const brandNameSlug = (product.brand_name || '').toLowerCase().trim()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (brandNameSlug && BRAND_CATEGORY_MAP[brandNameSlug]) {
      BRAND_CATEGORY_MAP[brandNameSlug].forEach(c => cats.add(c));
      matched = true;
    }
  }

  // Also try partial brand slug matching for compound slugs
  if (!matched && brandSlug) {
    for (const [slug, categories] of Object.entries(BRAND_CATEGORY_MAP)) {
      if (brandSlug.startsWith(slug + '-') || brandSlug.endsWith('-' + slug)) {
        categories.forEach(c => cats.add(c));
        matched = true;
        break;
      }
    }
  }

  // ── Tier 2: Strict name patterns ─────────────────────────────────────
  for (const { test, cats: pCats } of STRICT_NAME_PATTERNS) {
    if (test.test(name)) {
      pCats.forEach(c => cats.add(c));
    }
  }

  // ── Tier 3: Description fallback (only if still empty) ───────────────
  if (cats.size === 0 && desc) {
    for (const { test, cats: pCats } of DESCRIPTION_PATTERNS) {
      if (test.test(desc)) {
        pCats.forEach(c => cats.add(c));
      }
    }
  }

  // ── Post-processing ──────────────────────────────────────────────────

  // FLOWERS guard: only flower delivery brands keep the flowers category
  if (cats.has('flowers') && !FLOWER_BRAND_SLUGS.has(brandSlug)) {
    // Check if product is truly a fresh flower/plant product
    const isRealFlower = /\b(fresh\s+flower|fresh\s+bouquet|flower\s+delivery|live\s+orchid|potted\s+(orchid|plant)|succulent\s+(garden|plant|collection))\b/i.test(name);
    if (!isRealFlower) {
      cats.delete('flowers');
      // LEGO flower sets → home + baby-kids
      if (/lego/i.test(name) || brandSlug.includes('lego')) {
        cats.add('home');
        cats.add('baby-kids');
      }
      // Flower-print items → keep their other categories, or home
      if (cats.size === 0) cats.add('home');
    }
  }

  // BABY-KIDS guard: deny-listed brands cannot be baby-kids
  if (cats.has('baby-kids') && BABY_KIDS_DENY_SLUGS.has(brandSlug)) {
    cats.delete('baby-kids');
  }

  // Extra baby-kids guard: knife/kitchen products never baby-kids
  if (cats.has('baby-kids') && /\b(knife|knives|cutlery|cleaver|chef.s?\s+knife|fire pit|firepit)\b/i.test(name)) {
    cats.delete('baby-kids');
  }

  // Gift card detection
  if (/\b(gift\s*card|gift\s*certificate|e-gift|egift)\b/i.test(name)) {
    cats.add('gift-of-choice');
  }

  // Remove excluded categories
  for (const ex of EXCLUDED_CATEGORIES) {
    cats.delete(ex);
  }

  // Fallback: home is the safest catch-all for a gift marketplace
  if (cats.size === 0) {
    cats.add('home');
  }

  return [...cats];
}

// ═══════════════════════════════════════════════════════════════════════════
// PAGINATION HELPER — fetch ALL active products
// ═══════════════════════════════════════════════════════════════════════════

async function fetchAllActiveProducts() {
  const PAGE_SIZE = 1000;
  const allProducts = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('marketplace_products')
      .select('id, name, brand_name, brand_slug, categories, description')
      .eq('is_active', true)
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw new Error(`Fetch error at offset ${from}: ${error.message}`);
    if (!data || data.length === 0) break;

    allProducts.push(...data);
    from += PAGE_SIZE;
    hasMore = data.length === PAGE_SIZE;
  }

  return allProducts;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

async function run() {
  console.log(`\naudit-fix-all-categories.mjs ${DRY_RUN ? '(DRY RUN)' : '(LIVE)'}`);
  console.log('═'.repeat(70));

  // 1. Fetch all active products (paginated)
  console.log('\nFetching all active products...');
  const products = await fetchAllActiveProducts();
  console.log(`Total active products: ${products.length}`);

  // 2. Collect before-counts per category
  const beforeCounts = {};
  for (const p of products) {
    const cats = Array.isArray(p.categories) ? p.categories : [];
    for (const c of cats) {
      beforeCounts[c] = (beforeCounts[c] || 0) + 1;
    }
  }

  // 3. Process each product
  const afterCounts = {};
  let recategorized = 0;
  let excluded = 0;
  const changes = [];        // { id, name, brand, old, new, type }
  const exclusions = [];     // { id, name, brand, reason }

  for (const p of products) {
    const oldCats = Array.isArray(p.categories) ? p.categories : [];

    // Check exclusion first
    if (shouldExclude(p)) {
      exclusions.push({
        id: p.id,
        name: p.name,
        brand: p.brand_name || p.brand_slug,
      });

      if (!DRY_RUN) {
        const { error } = await supabase
          .from('marketplace_products')
          .update({ is_active: false })
          .eq('id', p.id);
        if (error) console.error(`  Exclude failed ${p.id}: ${error.message}`);
        else excluded++;
      } else {
        excluded++;
      }
      continue;
    }

    // Infer new categories
    const newCats = inferCategories(p);

    // Count after categories
    for (const c of newCats) {
      afterCounts[c] = (afterCounts[c] || 0) + 1;
    }

    // Check if changed
    const oldSet = new Set(oldCats);
    const newSet = new Set(newCats);
    const isDiff = oldSet.size !== newSet.size ||
      [...oldSet].some(c => !newSet.has(c)) ||
      [...newSet].some(c => !oldSet.has(c));

    if (isDiff) {
      changes.push({
        id: p.id,
        name: p.name,
        brand: p.brand_name || p.brand_slug,
        old: oldCats,
        new: newCats,
      });

      if (!DRY_RUN) {
        const { error } = await supabase
          .from('marketplace_products')
          .update({ categories: newCats })
          .eq('id', p.id);
        if (error) {
          console.error(`  Update failed ${p.id}: ${error.message}`);
        } else {
          recategorized++;
        }
      } else {
        recategorized++;
      }
    } else {
      // Unchanged — still count in afterCounts (already counted above)
    }
  }

  // ── REPORTING ──────────────────────────────────────────────────────────

  console.log('\n' + '─'.repeat(70));
  console.log('RESULTS');
  console.log('─'.repeat(70));
  console.log(`Products recategorized: ${recategorized}`);
  console.log(`Products excluded (deactivated): ${excluded}`);

  // Per-category before/after
  const allCategoryNames = new Set([...Object.keys(beforeCounts), ...Object.keys(afterCounts)]);
  const sortedCats = [...allCategoryNames].sort();

  console.log('\n' + '─'.repeat(70));
  console.log('CATEGORY BEFORE/AFTER COUNTS');
  console.log('─'.repeat(70));
  console.log(`${'Category'.padEnd(28)} ${'Before'.padStart(8)} ${'After'.padStart(8)} ${'Delta'.padStart(8)}`);
  console.log('─'.repeat(54));

  for (const cat of sortedCats) {
    const before = beforeCounts[cat] || 0;
    const after = afterCounts[cat] || 0;
    const delta = after - before;
    const sign = delta > 0 ? '+' : '';
    console.log(`${cat.padEnd(28)} ${String(before).padStart(8)} ${String(after).padStart(8)} ${(sign + delta).padStart(8)}`);
  }

  // Exclusions summary
  if (exclusions.length > 0) {
    console.log('\n' + '─'.repeat(70));
    console.log(`EXCLUSIONS (${exclusions.length} products deactivated)`);
    console.log('─'.repeat(70));
    exclusions.slice(0, 15).forEach(e => {
      console.log(`  "${e.name}" (${e.brand})`);
    });
    if (exclusions.length > 15) {
      console.log(`  ... and ${exclusions.length - 15} more`);
    }
  }

  // Top 5 changes per category (for spot-checking)
  console.log('\n' + '─'.repeat(70));
  console.log('TOP CHANGES PER CATEGORY (spot-check)');
  console.log('─'.repeat(70));

  // Group changes by destination category
  const changesByNewCat = {};
  for (const ch of changes) {
    for (const cat of ch.new) {
      if (!changesByNewCat[cat]) changesByNewCat[cat] = [];
      changesByNewCat[cat].push(ch);
    }
  }

  for (const cat of sortedCats) {
    const catChanges = changesByNewCat[cat] || [];
    if (catChanges.length === 0) continue;
    console.log(`\n  ${cat} (${catChanges.length} changes):`);
    catChanges.slice(0, 5).forEach(ch => {
      console.log(`    "${ch.name}" (${ch.brand}) : [${ch.old.join(',')}] → [${ch.new.join(',')}]`);
    });
  }

  // Notable removals
  const removedFromBabyKids = changes.filter(c =>
    c.old.includes('baby-kids') && !c.new.includes('baby-kids')
  );
  if (removedFromBabyKids.length > 0) {
    console.log('\n' + '─'.repeat(70));
    console.log(`REMOVED FROM BABY-KIDS (${removedFromBabyKids.length}):`);
    console.log('─'.repeat(70));
    removedFromBabyKids.slice(0, 10).forEach(c => {
      console.log(`  "${c.name}" (${c.brand}) → [${c.new.join(',')}]`);
    });
  }

  const removedFromFlowers = changes.filter(c =>
    c.old.includes('flowers') && !c.new.includes('flowers')
  );
  if (removedFromFlowers.length > 0) {
    console.log('\n' + '─'.repeat(70));
    console.log(`REMOVED FROM FLOWERS (${removedFromFlowers.length}):`);
    console.log('─'.repeat(70));
    removedFromFlowers.slice(0, 10).forEach(c => {
      console.log(`  "${c.name}" (${c.brand}) → [${c.new.join(',')}]`);
    });
  }

  console.log('\n' + '═'.repeat(70));
  console.log('DONE.');
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
