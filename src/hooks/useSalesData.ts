import { useQuery } from '@tanstack/react-query';
import { fetchSalesSummary, fetchAvailableMonths } from '@/services/salesService';

export function useSalesData(monthKey?: string) {
  return useQuery({
    queryKey: ['sales-summary', monthKey],
    queryFn: () => fetchSalesSummary(monthKey),
  });
}

export function useAvailableMonths() {
  return useQuery({
    queryKey: ['available-months'],
    queryFn: fetchAvailableMonths,
  });
}
