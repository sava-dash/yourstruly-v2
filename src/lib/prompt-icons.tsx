/**
 * Prompt Type Icon Mapping
 * Replaces emojis with proper SVG icons for better consistency and theming
 * Using Lucide React icons for visual consistency
 */

import {
  Camera,
  MessageCircle,
  Brain,
  UserPlus,
  Edit3,
  Link,
  Star,
  Mail,
  Trophy,
  BookOpen,
  Users,
  Fingerprint,
  Heart,
  Wrench,
  Languages,
  ArrowLeftRight,
  Sun,
  BookMarked,
  Film,
  Music,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react';

export type PromptType =
  | 'photo_backstory'
  | 'tag_person'
  | 'missing_info'
  | 'quick_question'
  | 'contact_info'
  | 'memory_prompt'
  | 'knowledge'
  | 'connect_dots'
  | 'highlight'
  | 'postscript'
  | 'favorites_firsts'
  | 'recipes_wisdom'
  | 'personality'
  | 'religion'
  | 'skills'
  | 'languages'
  | 'binary_choice'
  | 'daily_checkin'
  | 'favorite_books'
  | 'favorite_movies'
  | 'favorite_music'
  | 'favorite_foods';

/**
 * Icon mapping for prompt types
 * All icons are 24x24px by default (can be customized via size prop)
 */
export const promptIcons: Record<PromptType, LucideIcon> = {
  photo_backstory: Camera,
  tag_person: Users,
  missing_info: Edit3,
  quick_question: UserPlus,
  contact_info: UserPlus,
  memory_prompt: MessageCircle,
  knowledge: Brain,
  connect_dots: Link,
  highlight: Star,
  postscript: Mail,
  favorites_firsts: Trophy,
  recipes_wisdom: BookOpen,
  personality: Fingerprint,
  religion: Heart,
  skills: Wrench,
  languages: Languages,
  binary_choice: ArrowLeftRight,
  daily_checkin: Sun,
  favorite_books: BookMarked,
  favorite_movies: Film,
  favorite_music: Music,
  favorite_foods: UtensilsCrossed,
};

/**
 * Get icon component for a prompt type
 * @param type - Prompt type
 * @returns Lucide icon component
 */
export function getPromptIcon(type: PromptType): LucideIcon {
  return promptIcons[type] || MessageCircle;
}

/**
 * Render prompt icon with consistent sizing
 */
interface PromptIconProps {
  type: PromptType;
  size?: number;
  className?: string;
  strokeWidth?: number;
}

export function PromptIcon({ 
  type, 
  size = 24, 
  className = '', 
  strokeWidth = 2 
}: PromptIconProps) {
  const Icon = getPromptIcon(type);
  
  return (
    <Icon 
      size={size} 
      className={className} 
      strokeWidth={strokeWidth}
      aria-hidden="true" // Decorative icon, label provided separately
    />
  );
}
