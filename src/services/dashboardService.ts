import { supabase } from '@/integrations/supabase/client';
import { fetchActiveProjectCount, fetchYearlyCompletedOrderCount } from './businessProjectService';

export interface DashboardStats {
  cumulativeSales: number;
  cumulativePurchase: number;
  cumulativeNetSales: number;
  activeProjectCount: number;
  yearlyCompletedOrderCount: number;
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  // Get latest month cumulative totals from department_sales_summary
  const { data: salesData, error: salesError } = await supabase
    .from('department_sales_summary')
    .select('month_key, cumulative_sales_amount, cumulative_purchase_amount, cumulative_net_sales_amount')
    .order('month_key', { ascending: false });
  if (salesError) throw salesError;

  // Find latest month
  const latestMonth = salesData && salesData.length > 0 ? (salesData[0] as any).month_key : '';
  const latestData = latestMonth
    ? salesData.filter((r: any) => r.month_key === latestMonth)
    : [];

  const cumulativeSales = latestData.reduce((s, r: any) => s + Number(r.cumulative_sales_amount || 0), 0);
  const cumulativePurchase = latestData.reduce((s, r: any) => s + Number(r.cumulative_purchase_amount || 0), 0);
  const cumulativeNetSales = latestData.reduce((s, r: any) => s + Number(r.cumulative_net_sales_amount || 0), 0);

  const [activeProjectCount, yearlyCompletedOrderCount] = await Promise.all([
    fetchActiveProjectCount(),
    fetchYearlyCompletedOrderCount(),
  ]);

  return {
    cumulativeSales,
    cumulativePurchase,
    cumulativeNetSales,
    activeProjectCount,
    yearlyCompletedOrderCount,
  };
}
