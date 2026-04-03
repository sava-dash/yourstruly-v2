'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, X } from 'lucide-react';

interface VerificationFiltersProps {
  currentSearch: string | null;
  currentStatus: string | null;
}

export function VerificationFilters({ currentSearch, currentStatus }: VerificationFiltersProps) {
  const [search, setSearch] = useState(currentSearch || '');
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    
    if (search) {
      params.set('search', search);
    } else {
      params.delete('search');
    }
    params.delete('page'); // Reset to page 1
    
    router.push(`/admin/verifications?${params.toString()}`);
  };

  const clearSearch = () => {
    setSearch('');
    const params = new URLSearchParams(searchParams.toString());
    params.delete('search');
    params.delete('page');
    router.push(`/admin/verifications?${params.toString()}`);
  };

  return (
    <form onSubmit={handleSearch} className="glass p-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#2a1f1a]/40" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search" placeholder="Search by name, email..."
          className="w-full pl-10 pr-10 py-2 rounded-xl border border-[#2a1f1a]/10 bg-white/50 focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/20 focus:border-[#2D5A3D]/30"
        />
        {search && (
          <button
            type="button"
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-[#2a1f1a]/10 transition-colors"
          >
            <X className="w-4 h-4 text-[#2a1f1a]/40" />
          </button>
        )}
      </div>
    </form>
  );
}
