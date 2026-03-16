'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

// Query keys for cache management
export const memoryKeys = {
  all: ['memories'] as const,
  lists: () => [...memoryKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...memoryKeys.lists(), filters] as const,
  details: () => [...memoryKeys.all, 'detail'] as const,
  detail: (id: string) => [...memoryKeys.details(), id] as const,
}

// Fetch memories list
export function useMemories(filters?: { contactId?: string; limit?: number }) {
  return useQuery({
    queryKey: memoryKeys.list(filters || {}),
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      let query = supabase
        .from('memories')
        .select(`
          *,
          contacts:contact_id (id, full_name, avatar_url),
          media:memory_media (id, file_url, file_type, thumbnail_url)
        `)
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (filters?.contactId) {
        query = query.eq('contact_id', filters.contactId)
      }
      if (filters?.limit) {
        query = query.limit(filters.limit)
      }

      const { data, error } = await query
      if (error) throw error
      return data
    },
  })
}

// Fetch single memory
export function useMemory(id: string) {
  return useQuery({
    queryKey: memoryKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('memories')
        .select(`
          *,
          contacts:contact_id (id, full_name, avatar_url),
          media:memory_media (id, file_url, file_type, thumbnail_url)
        `)
        .eq('id', id)
        .is('deleted_at', null)
        .single()

      if (error) throw error
      return data
    },
    enabled: !!id,
  })
}

// Create memory mutation
export function useCreateMemory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (memory: {
      content: string
      title?: string
      contact_id?: string
      metadata?: Record<string, any>
    }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('memories')
        .insert({
          ...memory,
          user_id: user.id,
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      // Invalidate and refetch memories list
      queryClient.invalidateQueries({ queryKey: memoryKeys.lists() })
    },
  })
}

// Soft delete memory mutation
export function useDeleteMemory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('memories')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error
      return id
    },
    onSuccess: (id) => {
      // Remove from cache
      queryClient.invalidateQueries({ queryKey: memoryKeys.lists() })
      queryClient.removeQueries({ queryKey: memoryKeys.detail(id) })
    },
  })
}
