import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { entriesApi } from '@/lib/api/entries';
import { Entry, CreateEntryRequest, UpdateEntryRequest, SearchEntryParams } from '@/types/entries';

export function useEntries(params?: SearchEntryParams) {
  return useQuery({
    queryKey: ['entries', params],
    queryFn: () => entriesApi.getEntries(params),
  });
}

export function useEntry(id: string) {
  return useQuery({
    queryKey: ['entry', id],
    queryFn: () => entriesApi.getEntry(id),
    enabled: !!id,
  });
}

export function useCreateEntry() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (entry: CreateEntryRequest) => entriesApi.createEntry(entry),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entries'] });
    },
  });
}

export function useUpdateEntry(id: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (entry: UpdateEntryRequest) => entriesApi.updateEntry(id, entry),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entries'] });
      queryClient.invalidateQueries({ queryKey: ['entry', id] });
    },
  });
}

export function useDeleteEntry() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => entriesApi.deleteEntry(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entries'] });
    },
  });
}

export function useTags() {
  return useQuery({
    queryKey: ['tags'],
    queryFn: () => entriesApi.getTags(),
  });
}

export function useSuggestTags() {
  return useMutation({
    mutationFn: ({ content, existingTags }: { content: string, existingTags?: string[] }) => 
      entriesApi.suggestTags(content, existingTags),
  });
} 