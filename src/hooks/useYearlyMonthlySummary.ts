import { useQuery } from '@tanstack/react-query';
import { fetchYearlyMonthlySummary } from '@/services/salesService';

export function useYearlyMonthlySummary(year: string) {
  return useQuery({
    queryKey: ['yearly-monthly-summary', year],
    queryFn: () => fetchYearlyMonthlySummary(year),
    enabled: !!year,
  });
}
