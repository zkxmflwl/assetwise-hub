import { useQuery } from '@tanstack/react-query';
import { fetchDashboardStats, fetchDeptSummary } from '@/services/dashboardService';

export function useDashboardStats(monthKey: string) {
  return useQuery({
    queryKey: ['dashboard-stats', monthKey],
    queryFn: () => fetchDashboardStats(monthKey),
    enabled: !!monthKey,
  });
}

export function useDeptSummary(monthKey: string) {
  return useQuery({
    queryKey: ['dept-summary', monthKey],
    queryFn: () => fetchDeptSummary(monthKey),
    enabled: !!monthKey,
  });
}
