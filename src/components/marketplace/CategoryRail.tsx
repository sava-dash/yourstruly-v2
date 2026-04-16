'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import LucideIcon from './LucideIcon';
import type { CategoryNode, CategoryTab } from './types';

interface CategoryRailProps {
  tab: CategoryTab;
  onTabChange: (tab: CategoryTab) => void;
  selectedSlug?: string;
  onSelect: (slug: string | undefined) => void;
  className?: string;
}

const GREEN = '#406A56';
const GREEN_LIGHT = '#D3E1DF';

export default function CategoryRail({
  tab,
  onTabChange,
  selectedSlug,
  onSelect,
  className = '',
}: CategoryRailProps) {
  const [tree, setTree] = useState<CategoryNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/marketplace/categories?tab=${tab}`)
      .then((r) => (r.ok ? r.json() : { categories: [] }))
      .then((data) => {
        if (!cancelled) setTree(Array.isArray(data.categories) ? data.categories : []);
      })
      .catch(() => {
        if (!cancelled) setTree([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tab]);

  // Auto-expand the branch that contains the selected slug
  useEffect(() => {
    if (!selectedSlug) return;
    const parents = findParentChain(tree, selectedSlug);
    if (parents.length) {
      setExpanded((prev) => {
        const next = new Set(prev);
        parents.forEach((p) => next.add(p));
        return next;
      });
    }
  }, [selectedSlug, tree]);

  const toggle = useCallback((slug: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }, []);

  const handleSelect = useCallback(
    (slug: string | undefined) => {
      onSelect(slug);
    },
    [onSelect]
  );

  const hasSelection = !!selectedSlug;

  return (
    <aside className={`w-full ${className}`}>
      {/* Tab toggle */}
      <div className="flex rounded-full border border-[#406A56]/20 p-1 bg-white mb-4">
        {(['categories', 'occasions'] as CategoryTab[]).map((t) => {
          const active = tab === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => onTabChange(t)}
              className={`flex-1 min-h-[40px] px-3 text-sm font-medium rounded-full transition-colors ${
                active
                  ? 'bg-[#406A56] text-white'
                  : 'text-[#406A56] hover:bg-[#D3E1DF]/50'
              }`}
              style={{ fontFamily: 'var(--font-inter-tight, Inter Tight, sans-serif)' }}
            >
              {t === 'categories' ? 'Categories' : 'Occasions'}
            </button>
          );
        })}
      </div>

      {/* All option */}
      <button
        type="button"
        onClick={() => handleSelect(undefined)}
        className={`w-full flex items-center min-h-[44px] px-3 rounded-lg text-sm text-left transition-colors mb-1 ${
          !hasSelection
            ? 'bg-[#406A56] text-white font-medium'
            : 'text-[#2d2d2d] hover:bg-[#D3E1DF]/40'
        }`}
      >
        All {tab === 'occasions' ? 'Occasions' : 'Gifts'}
      </button>

      {loading && (
        <div className="flex items-center gap-2 px-3 py-2 text-xs text-gray-400">
          <Loader2 size={12} className="animate-spin" /> Loading…
        </div>
      )}

      <nav className="space-y-0.5">
        {tree.map((node) => (
          <CategoryItem
            key={node.slug}
            node={node}
            depth={0}
            expanded={expanded}
            selectedSlug={selectedSlug}
            onToggle={toggle}
            onSelect={handleSelect}
          />
        ))}
      </nav>

      <style jsx>{`
        nav :global(button:focus-visible) {
          outline: 2px solid ${GREEN};
          outline-offset: 2px;
        }
      `}</style>
    </aside>
  );
}

interface CategoryItemProps {
  node: CategoryNode;
  depth: number;
  expanded: Set<string>;
  selectedSlug?: string;
  onToggle: (slug: string) => void;
  onSelect: (slug: string) => void;
}

function CategoryItem({
  node,
  depth,
  expanded,
  selectedSlug,
  onToggle,
  onSelect,
}: CategoryItemProps) {
  const active = selectedSlug === node.slug;
  const hasChildren = node.children && node.children.length > 0;
  const isOpen = expanded.has(node.slug);

  return (
    <div>
      <div
        className={`flex items-stretch rounded-lg transition-colors ${
          active ? 'bg-[#406A56] text-white' : 'text-[#2d2d2d] hover:bg-[#D3E1DF]/40'
        }`}
      >
        <button
          type="button"
          onClick={() => onSelect(node.slug)}
          className="flex-1 text-left px-3 min-h-[44px] flex items-center text-sm font-medium"
          style={{
            paddingLeft: `${12 + depth * 12}px`,
            fontFamily: 'var(--font-inter-tight, Inter Tight, sans-serif)',
          }}
        >
          {node.icon && <LucideIcon name={node.icon} size={16} className="mr-2 shrink-0" />}
          <span className="flex-1">{node.name}</span>
        </button>
        {hasChildren && (
          <button
            type="button"
            onClick={() => onToggle(node.slug)}
            aria-label={isOpen ? `Collapse ${node.name}` : `Expand ${node.name}`}
            className="px-3 min-h-[44px] flex items-center"
          >
            {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
        )}
      </div>

      {hasChildren && isOpen && (
        <div className="mt-0.5 space-y-0.5">
          {node.children.map((child) => (
            <CategoryItem
              key={child.slug}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              selectedSlug={selectedSlug}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function findParentChain(tree: CategoryNode[], target: string, chain: string[] = []): string[] {
  for (const node of tree) {
    if (node.slug === target) return chain;
    const sub = findParentChain(node.children || [], target, [...chain, node.slug]);
    if (sub.length || (node.children || []).some((c) => c.slug === target)) {
      return [...chain, node.slug];
    }
  }
  return [];
}

export function findCategoryBySlug(
  tree: CategoryNode[],
  slug: string
): CategoryNode | null {
  for (const node of tree) {
    if (node.slug === slug) return node;
    const sub = findCategoryBySlug(node.children || [], slug);
    if (sub) return sub;
  }
  return null;
}
