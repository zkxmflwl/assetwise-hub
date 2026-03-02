import { supabase } from '@/integrations/supabase/client';

export interface BusinessProjectRow {
  id: number;
  project_name: string;
  department_code: string;
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
  last_modified_by_auth_user_id: string | null;
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

/** 부서별 영업중 프로젝트 건수 */
export async function fetchActiveProjectsByDept(): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from('business_projects')
    .select('department_code')
    .eq('project_status', '영업중');
  if (error) throw error;
  const counts: Record<string, number> = {};
  (data || []).forEach((r: any) => {
    counts[r.department_code] = (counts[r.department_code] || 0) + 1;
  });
  return counts;
}

/** 부서별 현재 진행중 프로젝트 건수 (start_date <= today, end_date is null or >= today) */
export async function fetchOngoingProjectsByDept(): Promise<Record<string, number>> {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('business_projects')
    .select('department_code, end_date')
    .lte('start_date', today);
  if (error) throw error;
  const counts: Record<string, number> = {};
  (data || []).forEach((r: any) => {
    if (!r.end_date || r.end_date >= today) {
      counts[r.department_code] = (counts[r.department_code] || 0) + 1;
    }
  });
  return counts;
}
