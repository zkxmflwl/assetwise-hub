import { supabase } from '@/integrations/supabase/client';

export interface BusinessProjectRow {
  id: number;
  project_name: string;
  project_summary: string | null;
  department_code: string;
  client_name: string | null;
  project_status: string;
  schedule_note: string | null;
  category: string | null;
  base_date: string | null;
  order_date: string | null;
  start_date: string | null;
  end_date: string | null;
  sales_amount: number;
  purchase_amount: number;
  note: string | null;
  effort: string | null;
  last_modified_by_auth_user_id: string | null;
  created_at: string;
  updated_at: string;
  departments: { department_name: string } | null;
}

export const PROJECT_STATUSES = [
  '영업 전',
  '영업 중',
  '수주 완료',
  '프로젝트 중',
  '프로젝트 완료',
  '기타',
];

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
    .eq('project_status', '영업 중');
  if (error) throw error;
  return count || 0;
}

export async function fetchMonthlyOrderCount(monthKey: string): Promise<number> {
  const [y, m] = monthKey.split('-');
  const startDate = `${y}-${m}-01`;
  const endDate = `${y}-${m}-31`;
  const { count, error } = await supabase
    .from('business_projects')
    .select('id', { count: 'exact', head: true })
    .eq('project_status', '수주 완료')
    .gte('order_date', startDate)
    .lte('order_date', endDate);
  if (error) throw error;
  return count || 0;
}

export async function fetchActiveProjectsByDept(): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from('business_projects')
    .select('department_code')
    .eq('project_status', '영업 중');
  if (error) throw error;
  const counts: Record<string, number> = {};
  (data || []).forEach((r: any) => {
    counts[r.department_code] = (counts[r.department_code] || 0) + 1;
  });
  return counts;
}

export async function fetchProjectsByDeptAndStatus(departmentCode: string, status: string) {
  const { data, error } = await supabase
    .from('business_projects')
    .select('*, departments(department_name)')
    .eq('department_code', departmentCode)
    .eq('project_status', status)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data as unknown as BusinessProjectRow[];
}

export async function fetchOngoingProjectsByDept(departmentCode: string, year: number) {
  const { data, error } = await supabase
    .from('business_projects')
    .select('*, departments(department_name)')
    .eq('department_code', departmentCode)
    .eq('project_status', '프로젝트 중')
    .not('start_date', 'is', null);
  if (error) throw error;
  // Filter projects that overlap with the given year
  return (data as unknown as BusinessProjectRow[]).filter(p => {
    const start = p.start_date ? new Date(p.start_date) : null;
    const end = p.end_date ? new Date(p.end_date) : null;
    if (!start) return false;
    const yearStart = new Date(`${year}-01-01`);
    const yearEnd = new Date(`${year}-12-31`);
    return start <= yearEnd && (!end || end >= yearStart);
  });
}
