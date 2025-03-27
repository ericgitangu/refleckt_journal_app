import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { insightsApi } from '@/lib/api/insights';
import { InsightType } from '@/types/insights';

export function useEntryInsights(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['insights', 'entry', id],
    queryFn: () => insightsApi.getEntryInsights(id),
    enabled: options?.enabled !== false && !!id,
  });
}

export function useAllInsights(type?: InsightType) {
  return useQuery({
    queryKey: ['insights', 'all', type],
    queryFn: () => insightsApi.getAllInsights(type),
  });
}

export function useInsightsSummary(period: 'week' | 'month' | 'year' = 'month') {
  return useQuery({
    queryKey: ['insights', 'summary', period],
    queryFn: () => insightsApi.getSummary(period),
  });
}

export function useRequestAnalysis() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => insightsApi.requestAnalysis(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['insights', 'entry', id] });
    },
  });
} 