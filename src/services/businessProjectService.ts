import { supabase } from '@/integrations/supabase/client';

export interface BusinessProjectRow {
  id: number;
  project_code: string | null;
  project_name: string;
  department_code: string | null;
  project_status: string;
  order_date: string | null;
  start_date: string | null;
  end_date: string | null;
  sales_amount: number;
  purchase_amount: number;
  net_sales_amount: number;
  client_name: string | null;
  note: string | null;
  updated_at: string;
  last_modified_by_account_id: string | null;
  departments: { department_name: string } | null;
}

export async function fetchBusinessProjects() {
  const { data, error } = await supabase
    .from('business_projects')
    .select('*, departments(department_name)')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data as unknown as BusinessProjectRow[];
}

export async function fetchActiveProjectCount(): Promise<number> {
  const { count, error } = await supabase
    .from('business_projects')
    .select('id', { count: 'exact', head: true })
    .eq('project_status', '영업중');
  if (error) throw error;
  return count || 0;
}

export async function fetchYearlyCompletedOrderCount(): Promise<number> {
  const year = new Date().getFullYear();
  const startOfYear = `${year}-01-01`;
  const endOfYear = `${year}-12-31`;
  const { count, error } = await supabase
    .from('business_projects')
    .select('id', { count: 'exact', head: true })
    .eq('project_status', '수주완료')
    .gte('order_date', startOfYear)
    .lte('order_date', endOfYear);
  if (error) throw error;
  return count || 0;
}
