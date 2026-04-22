/**
 * Chapter gradient system for engagement cards.
 *
 * Each life-chapter maps to a gradient that fades from off-white at the
 * top to the chapter's signature color at the bottom. The animated
 * float only visually affects the colored lower portion.
 */

export interface ChapterStyle {
  label: string;
  gradient: string;      // off-white top → chapter color bottom
  accentColor: string;   // label text tint
}

// Off-white card base — matches the dashboard bg
const TOP = '#FAFAF7';

export const CHAPTER_STYLES: Record<string, ChapterStyle> = {
  childhood:      { label: 'CHILDHOOD',       gradient: `linear-gradient(180deg, ${TOP} 35%, #FDEBD0 65%, #F9E4B7 85%, #FDD9B5 100%)`, accentColor: '#B8860B' },
  teenage:        { label: 'TEENAGE YEARS',   gradient: `linear-gradient(180deg, ${TOP} 35%, #FDEBD0 65%, #F9E4B7 85%, #FDD9B5 100%)`, accentColor: '#B8860B' },
  family:         { label: 'FAMILY',          gradient: `linear-gradient(180deg, ${TOP} 35%, #D5E8D4 65%, #B8D4B8 85%, #C8E6C9 100%)`, accentColor: '#2E7D32' },
  relationships:  { label: 'RELATIONSHIPS',   gradient: `linear-gradient(180deg, ${TOP} 35%, #F8D7DA 65%, #E8C4CF 85%, #E1BEE7 100%)`, accentColor: '#AD1457' },
  travel:         { label: 'TRAVEL',          gradient: `linear-gradient(180deg, ${TOP} 35%, #B3E5FC 65%, #81D4FA 85%, #80CBC4 100%)`, accentColor: '#00838F' },
  adventure:      { label: 'ADVENTURE',       gradient: `linear-gradient(180deg, ${TOP} 35%, #B3E5FC 65%, #81D4FA 85%, #80CBC4 100%)`, accentColor: '#00838F' },
  jobs_career:    { label: 'CAREER',          gradient: `linear-gradient(180deg, ${TOP} 35%, #CFD8DC 65%, #B0BEC5 85%, #BBDEFB 100%)`, accentColor: '#37474F' },
  career:         { label: 'CAREER',          gradient: `linear-gradient(180deg, ${TOP} 35%, #CFD8DC 65%, #B0BEC5 85%, #BBDEFB 100%)`, accentColor: '#37474F' },
  work:           { label: 'CAREER',          gradient: `linear-gradient(180deg, ${TOP} 35%, #CFD8DC 65%, #B0BEC5 85%, #BBDEFB 100%)`, accentColor: '#37474F' },
  wisdom_legacy:  { label: 'WISDOM & LEGACY', gradient: `linear-gradient(180deg, ${TOP} 35%, #FFE082 65%, #FFD54F 85%, #FFCA28 100%)`, accentColor: '#F57F17' },
  life_lessons:   { label: 'LIFE LESSONS',    gradient: `linear-gradient(180deg, ${TOP} 35%, #C8E6C9 65%, #A5D6A7 85%, #81C784 100%)`, accentColor: '#1B5E20' },
  spirituality:   { label: 'SPIRITUALITY',    gradient: `linear-gradient(180deg, ${TOP} 35%, #D1C4E9 65%, #B39DDB 85%, #9575CD 100%)`, accentColor: '#4527A0' },
  religion:       { label: 'SPIRITUALITY',    gradient: `linear-gradient(180deg, ${TOP} 35%, #D1C4E9 65%, #B39DDB 85%, #9575CD 100%)`, accentColor: '#4527A0' },
  music:          { label: 'MUSIC',           gradient: `linear-gradient(180deg, ${TOP} 35%, #E1BEE7 65%, #CE93D8 85%, #BA68C8 100%)`, accentColor: '#6A1B9A' },
  recipes:        { label: 'FOOD & RECIPES',  gradient: `linear-gradient(180deg, ${TOP} 35%, #FFCCBC 65%, #FFAB91 85%, #FF8A65 100%)`, accentColor: '#BF360C' },
  recipes_wisdom: { label: 'FOOD & RECIPES',  gradient: `linear-gradient(180deg, ${TOP} 35%, #FFCCBC 65%, #FFAB91 85%, #FF8A65 100%)`, accentColor: '#BF360C' },
  milestones:     { label: 'MILESTONES',      gradient: `linear-gradient(180deg, ${TOP} 35%, #FFF9C4 65%, #FFF59D 85%, #FFEE58 100%)`, accentColor: '#F9A825' },
  firsts:         { label: 'MILESTONES',      gradient: `linear-gradient(180deg, ${TOP} 35%, #FFF9C4 65%, #FFF59D 85%, #FFEE58 100%)`, accentColor: '#F9A825' },
  life_moments:   { label: 'LIFE MOMENTS',    gradient: `linear-gradient(180deg, ${TOP} 35%, #FFCDD2 65%, #EF9A9A 85%, #FFAB91 100%)`, accentColor: '#C62828' },
  everyday_life:  { label: 'EVERYDAY LIFE',   gradient: `linear-gradient(180deg, ${TOP} 35%, #DDEEEA 65%, #BCD6D2 85%, #9BC3BD 100%)`, accentColor: '#3B5755' },
  hobbies:        { label: 'HOBBIES',         gradient: `linear-gradient(180deg, ${TOP} 35%, #C8E6C9 65%, #B2DFDB 85%, #80CBC4 100%)`, accentColor: '#00695C' },
  interests:      { label: 'INTERESTS',       gradient: `linear-gradient(180deg, ${TOP} 35%, #C8E6C9 65%, #B2DFDB 85%, #80CBC4 100%)`, accentColor: '#00695C' },
  skills:         { label: 'SKILLS',          gradient: `linear-gradient(180deg, ${TOP} 35%, #C8E6C9 65%, #B2DFDB 85%, #80CBC4 100%)`, accentColor: '#00695C' },
  general:        { label: 'YOUR STORY',      gradient: `linear-gradient(180deg, ${TOP} 35%, #E3EAF0 65%, #D6DFE8 85%, #CADAE8 100%)`, accentColor: '#546E7A' },
};

const DEFAULT_STYLE: ChapterStyle = {
  label: 'YOUR STORY',
  gradient: `linear-gradient(180deg, ${TOP} 35%, #E3EAF0 65%, #D6DFE8 85%, #CADAE8 100%)`,
  accentColor: '#546E7A',
};

import { mapCategoryToLifeChapter } from './seed-types';

/**
 * Look up a chapter style. If the raw category is itself a known chapter
 * (e.g. "childhood", "travel") we use it directly. Otherwise we fold the
 * fine-grained seed_library category (e.g. "sensory", "nostalgia", "humor")
 * up to its life_chapter and look that up. Falling through to "YOUR STORY"
 * meant every thematic card rendered as a generic catch-all even when the
 * taxonomy knew where it belonged.
 */
export function getChapterStyle(category: string | undefined | null): ChapterStyle {
  if (!category) return DEFAULT_STYLE;
  const direct = CHAPTER_STYLES[category];
  if (direct) return direct;
  const chapter = mapCategoryToLifeChapter(category);
  return CHAPTER_STYLES[chapter] || DEFAULT_STYLE;
}
