import { supabase } from '@/integrations/supabase/client';

export interface DashboardStats {
  tangibleCount: number;
  intangibleCount: number;
  totalHeadcount: number;
  totalNetSales: number;
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const [tangibleRes, intangibleRes, salesRes] = await Promise.all([
    supabase.from('tangible_assets').select('id', { count: 'exact', head: true }),
    supabase.from('intangible_assets').select('id', { count: 'exact', head: true }),
    supabase.from('department_sales_summary').select('total_headcount, net_sales_amount'),
  ]);

  if (tangibleRes.error) throw tangibleRes.error;
  if (intangibleRes.error) throw intangibleRes.error;
  if (salesRes.error) throw salesRes.error;

  // Get latest month's data for totals
  const salesData = salesRes.data || [];
  const latestMonth = salesData.length > 0
    ? salesData.reduce((max, r) => {
        const key = (r as any).month_key || '';
        return key > max ? key : max;
      }, '')
    : '';

  const latestData = latestMonth
    ? salesData.filter((r: any) => r.month_key === latestMonth)
    : [];

  const totalHeadcount = latestData.reduce((s, r: any) => s + (r.total_headcount || 0), 0);
  const totalNetSales = latestData.reduce((s, r: any) => s + Number(r.net_sales_amount || 0), 0);

  return {
    tangibleCount: tangibleRes.count || 0,
    intangibleCount: intangibleRes.count || 0,
    totalHeadcount,
    totalNetSales,
  };
}
