'use client';

import * as icons from 'lucide-react';

const iconMap = icons as unknown as Record<string, icons.LucideIcon>;

interface Props {
  name: string;
  size?: number;
  className?: string;
}

export default function LucideIcon({ name, size = 16, className }: Props) {
  const Icon = iconMap[name] || iconMap[name + 'Icon'] || icons.Gift;
  return <Icon size={size} className={className} />;
}
