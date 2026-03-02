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
  // Sum all monthly rows across all departments to get cumulative totals
  const { data: salesData, error: salesError } = await supabase
    .from('department_sales_summary')
    .select('sales_amount, purchase_amount, net_sales_amount');
  if (salesError) throw salesError;

  const cumulativeSales = (salesData || []).reduce((s, r: any) => s + Number(r.sales_amount || 0), 0);
  const cumulativePurchase = (salesData || []).reduce((s, r: any) => s + Number(r.purchase_amount || 0), 0);
  const cumulativeNetSales = (salesData || []).reduce((s, r: any) => s + Number(r.net_sales_amount || 0), 0);

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
