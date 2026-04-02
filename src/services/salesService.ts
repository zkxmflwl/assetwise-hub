import { supabase } from '@/integrations/supabase/client';

export interface SalesSummaryRow {
  id: number;
  department_code: string;
  month_key: string;
  total_headcount: number;
  sales_amount: number;
  purchase_amount: number;
  note: string | null;
  headcount_note: string | null;
  deferred_sales: number;    
  deferred_purchase: number; 
  departments: { department_name: string } | null;
}

export async function fetchSalesSummary(monthKey?: string) {
  let query = supabase
    .from('department_sales_summary')
    .select('id, department_code, month_key, total_headcount, sales_amount, purchase_amount, note, headcount_note, departments(department_name), deferred_sales, deferred_purchase')
    .order('department_code');

  if (monthKey) {
    query = query.eq('month_key', monthKey);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as unknown as SalesSummaryRow[];
}

export async function fetchSalesByDepartment(departmentCode: string) {
  const { data, error } = await supabase
    .from('department_sales_summary')
    .select('id, department_code, month_key, total_headcount, sales_amount, purchase_amount, note, headcount_note, departments(department_name), deferred_sales, deferred_purchase')
    .eq('department_code', departmentCode)
    .order('month_key', { ascending: false });
  if (error) throw error;
  return data as unknown as SalesSummaryRow[];
}

export async function fetchAvailableDeptMonths(departmentCode?: string) {
  let query = supabase
    .from('department_sales_summary')
    .select('month_key')
    .order('month_key', { ascending: false });

  if (departmentCode) {
    query = query.eq('department_code', departmentCode);
  } 

  const { data, error } = await query;
  if (error) throw error;
  const unique = [...new Set((data || []).map((d) => d.month_key))];
  return unique;
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
    .select('department_code, month_key, sales_amount, purchase_amount, deferred_sales, deferred_purchase')
    .gte('month_key', startMonth)
    .lte('month_key', upToMonth);
  if (error) throw error;
  return data || [];
}

/** Fetch monthly totals for all 12 months of a given year */
export async function fetchYearlyMonthlySummary(year: string, departmentCode?: string) {
  const startMonth = `${year}-01`;
  const endMonth = `${year}-12`;
  let query = supabase
    .from('department_sales_summary')
    .select('month_key, sales_amount, purchase_amount, deferred_sales, deferred_purchase')
    .gte('month_key', startMonth)
    .lte('month_key', endMonth);
  if (departmentCode) {
    query = query.eq('department_code', departmentCode);
  }
  const { data, error } = await query;
  if (error) throw error;

  // Aggregate by month
  const monthMap = new Map<string, {
    sales: number; purchase: number;
    deferredSales: number; deferredPurchase: number;
  }>();
  for (let m = 1; m <= 12; m++) {
    const key = `${year}-${String(m).padStart(2, '0')}`;
    monthMap.set(key, { sales: 0, purchase: 0, deferredSales: 0, deferredPurchase: 0 });
  }
  for (const r of (data || [])) {
    const existing = monthMap.get(r.month_key);
    if (existing) {
      existing.sales += Number(r.sales_amount || 0);
      existing.purchase += Number(r.purchase_amount || 0);
      existing.deferredSales += Number((r as any).deferred_sales || 0);
      existing.deferredPurchase += Number((r as any).deferred_purchase || 0);
    }
  }

  return Array.from(monthMap.entries()).map(([month_key, vals]) => ({
    month_key,
    label: `${Number(month_key.split('-')[1])}월`,
    sales: vals.sales,
    purchase: vals.purchase,
    netSales: vals.sales - vals.purchase,
    deferredSales: vals.deferredSales,
    deferredPurchase: vals.deferredPurchase,
  }));
}

/** Fetch YTD by department */
export async function fetchYtdByDepartment(year: string, upToMonth: string) {
  const startMonth = `${year}-01`;
  const { data, error } = await supabase
    .from('department_sales_summary')
    .select('department_code, month_key, sales_amount, purchase_amount, deferred_sales, deferred_purchase, departments(department_name)')
    .gte('month_key', startMonth)
    .lte('month_key', upToMonth);
  if (error) throw error;
  return data as unknown as {
    department_code: string;
    month_key: string;
    sales_amount: number;
    purchase_amount: number;
    deferred_sales: number;
    deferred_purchase: number;
    departments: { department_name: string } | null;
  }[];
}

/** 전년 동월 데이터 조회 시 월(Month) 포맷 보완 */
export async function fetchSameMonthLastYear(monthKey: string) {
  const [y, m] = monthKey.split('-');
  // m이 "2"일 경우 "02"로 맞춰줘야 DB의 month_key와 일치합니다.
  const lastYearMonth = `${Number(y) - 1}-${String(m).padStart(2, '0')}`;
  const { data, error } = await supabase
    .from('department_sales_summary')
    .select('department_code, sales_amount, purchase_amount')
    .eq('month_key', lastYearMonth);
  if (error) throw error;
  return data || [];
}
