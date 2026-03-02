import { supabase } from '@/integrations/supabase/client';

export interface SalesSummaryRow {
  id: number;
  department_code: string;
  month_key: string;
  total_headcount: number;
  sales_amount: number;
  purchase_amount: number;
  net_sales_amount: number;
  note: string | null;
  departments: { department_name: string } | null;
}

export async function fetchSalesSummary(monthKey?: string) {
  let query = supabase
    .from('department_sales_summary')
    .select('*, departments(department_name)')
    .order('department_code');

  if (monthKey) {
    query = query.eq('month_key', monthKey);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as unknown as SalesSummaryRow[];
}

export async function fetchAvailableMonths() {
  const { data, error } = await supabase
    .from('department_sales_summary')
    .select('month_key')
    .order('month_key', { ascending: false });
  if (error) throw error;
  const unique = [...new Set((data || []).map((d) => d.month_key))];
  return unique;
}

export async function fetchYtdSummary(year: string, upToMonth: string) {
  const startMonth = `${year}-01`;
  const { data, error } = await supabase
    .from('department_sales_summary')
    .select('sales_amount, purchase_amount, net_sales_amount')
    .gte('month_key', startMonth)
    .lte('month_key', upToMonth);
  if (error) throw error;
  return data || [];
}
