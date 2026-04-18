/**
 * Chapter gradient system for engagement cards.
 *
 * Each life-chapter (childhood, family, travel, etc.) maps to a soft
 * pastel gradient, accent colour and uppercase label that renders on
 * the engagement prompt card.
 */

export interface ChapterStyle {
  label: string;           // e.g., "CHILDHOOD", "WISDOM & LEGACY"
  gradient: string;        // CSS gradient value
  accentColor: string;     // for the label text tint
}

export const CHAPTER_STYLES: Record<string, ChapterStyle> = {
  childhood:      { label: 'CHILDHOOD',         gradient: 'linear-gradient(135deg, #FDEBD0, #F9E4B7, #FDD9B5)', accentColor: '#B8860B' },
  teenage:        { label: 'TEENAGE YEARS',     gradient: 'linear-gradient(135deg, #FDEBD0, #F9E4B7, #FDD9B5)', accentColor: '#B8860B' },
  family:         { label: 'FAMILY',            gradient: 'linear-gradient(135deg, #D5E8D4, #B8D4B8, #C8E6C9)', accentColor: '#2E7D32' },
  relationships:  { label: 'RELATIONSHIPS',     gradient: 'linear-gradient(135deg, #F8D7DA, #E8C4CF, #E1BEE7)', accentColor: '#AD1457' },
  travel:         { label: 'TRAVEL',            gradient: 'linear-gradient(135deg, #B3E5FC, #81D4FA, #80CBC4)', accentColor: '#00838F' },
  adventure:      { label: 'ADVENTURE',         gradient: 'linear-gradient(135deg, #B3E5FC, #81D4FA, #80CBC4)', accentColor: '#00838F' },
  jobs_career:    { label: 'CAREER',            gradient: 'linear-gradient(135deg, #CFD8DC, #B0BEC5, #BBDEFB)', accentColor: '#37474F' },
  career:         { label: 'CAREER',            gradient: 'linear-gradient(135deg, #CFD8DC, #B0BEC5, #BBDEFB)', accentColor: '#37474F' },
  work:           { label: 'CAREER',            gradient: 'linear-gradient(135deg, #CFD8DC, #B0BEC5, #BBDEFB)', accentColor: '#37474F' },
  wisdom_legacy:  { label: 'WISDOM & LEGACY',   gradient: 'linear-gradient(135deg, #FFE082, #FFD54F, #FFCA28)', accentColor: '#F57F17' },
  life_lessons:   { label: 'LIFE LESSONS',      gradient: 'linear-gradient(135deg, #C8E6C9, #A5D6A7, #81C784)', accentColor: '#1B5E20' },
  spirituality:   { label: 'SPIRITUALITY',      gradient: 'linear-gradient(135deg, #D1C4E9, #B39DDB, #9575CD)', accentColor: '#4527A0' },
  religion:       { label: 'SPIRITUALITY',      gradient: 'linear-gradient(135deg, #D1C4E9, #B39DDB, #9575CD)', accentColor: '#4527A0' },
  music:          { label: 'MUSIC',             gradient: 'linear-gradient(135deg, #E1BEE7, #CE93D8, #BA68C8)', accentColor: '#6A1B9A' },
  recipes:        { label: 'FOOD & RECIPES',    gradient: 'linear-gradient(135deg, #FFCCBC, #FFAB91, #FF8A65)', accentColor: '#BF360C' },
  recipes_wisdom: { label: 'FOOD & RECIPES',    gradient: 'linear-gradient(135deg, #FFCCBC, #FFAB91, #FF8A65)', accentColor: '#BF360C' },
  milestones:     { label: 'MILESTONES',        gradient: 'linear-gradient(135deg, #FFF9C4, #FFF59D, #FFEE58)', accentColor: '#F9A825' },
  firsts:         { label: 'MILESTONES',        gradient: 'linear-gradient(135deg, #FFF9C4, #FFF59D, #FFEE58)', accentColor: '#F9A825' },
  life_moments:   { label: 'LIFE MOMENTS',      gradient: 'linear-gradient(135deg, #FFCDD2, #EF9A9A, #FFAB91)', accentColor: '#C62828' },
  hobbies:        { label: 'HOBBIES',           gradient: 'linear-gradient(135deg, #C8E6C9, #B2DFDB, #80CBC4)', accentColor: '#00695C' },
  interests:      { label: 'INTERESTS',         gradient: 'linear-gradient(135deg, #C8E6C9, #B2DFDB, #80CBC4)', accentColor: '#00695C' },
  skills:         { label: 'SKILLS',            gradient: 'linear-gradient(135deg, #C8E6C9, #B2DFDB, #80CBC4)', accentColor: '#00695C' },
  general:        { label: 'YOUR STORY',        gradient: 'linear-gradient(135deg, #E3EAF0, #D6DFE8, #CADAE8)', accentColor: '#546E7A' },
};

const DEFAULT_STYLE: ChapterStyle = {
  label: 'YOUR STORY',
  gradient: 'linear-gradient(135deg, #E3EAF0, #D6DFE8, #CADAE8)',
  accentColor: '#546E7A',
};

export function getChapterStyle(category: string | undefined | null): ChapterStyle {
  if (!category) return DEFAULT_STYLE;
  return CHAPTER_STYLES[category] || DEFAULT_STYLE;
}
