import { useQuery } from '@tanstack/react-query';
import { fetchYearlyMonthlySummary } from '@/services/salesService';

export function useYearlyMonthlySummary(year: string, departmentCodes?: string[]) {
  const key = departmentCodes && departmentCodes.length > 0 ? [...departmentCodes].sort().join(',') : '__all__';
  return useQuery({
    queryKey: ['yearly-monthly-summary', year, key],
    queryFn: () => fetchYearlyMonthlySummary(year, departmentCodes),
    enabled: !!year,
  });
}
