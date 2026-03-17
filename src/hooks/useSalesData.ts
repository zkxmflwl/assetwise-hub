import { useQuery } from '@tanstack/react-query';
import { fetchSalesSummary, fetchAvailableMonths, fetchAvailableDeptMonths } from '@/services/salesService';

export function useSalesData(monthKey?: string) {
  return useQuery({
    queryKey: ['sales-summary', monthKey],
    queryFn: () => fetchSalesSummary(monthKey),
  });
}

export function useAvailableDeptMonths(departmentCode?: string) {
  return useQuery({
    queryKey: ['available-months', departmentCode],
    queryFn: () => fetchAvailableDeptMonths(departmentCode),
    enabled: !!departmentCode,
  });
}

export function useAvailableMonths() {
  return useQuery({
    queryKey: ['available-months'],
    queryFn: fetchAvailableMonths,
  });
}
