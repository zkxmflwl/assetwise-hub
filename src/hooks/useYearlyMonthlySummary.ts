import { useQuery } from '@tanstack/react-query';
import { fetchYearlyMonthlySummary } from '@/services/salesService';

export function useYearlyMonthlySummary(year: string, departmentCode?: string) {
  return useQuery({
    queryKey: ['yearly-monthly-summary', year, departmentCode ?? '__all__'],
    queryFn: () => fetchYearlyMonthlySummary(year, departmentCode),
    enabled: !!year,
  });
}
