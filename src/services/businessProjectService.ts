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
  sort_order: number;
  visible: boolean;
  use: boolean;
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
  '영업 실패',
  '기타',
];

/** 해당 월의 마지막 날짜를 구하는 유틸리티 함수 */
const getEndOfMonth = (monthKey: string) => {
  const [y, m] = monthKey.split('-').map(Number);
  // month는 1-indexed이므로, (y, m, 0)은 해당 월의 마지막 날을 의미합니다.
  const lastDay = new Date(y, m, 0).getDate();
  return `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
};

export async function fetchBusinessProjects() {
  const { data, error } = await supabase
    .from('business_projects')
    .select('*, departments(department_name)')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data as unknown as BusinessProjectRow[];
}

/** 영업 중인 건 수정 */
export async function fetchActiveProjectCount(monthKey: string): Promise<number> {
  const endDate = getEndOfMonth(monthKey); // ✅ 동적 날짜 계산
  const { count, error } = await supabase
    .from('business_projects')
    .select('id', { count: 'exact', head: true })
    .eq('project_status', '영업 중')
    .lte('base_date', endDate);
  if (error) throw error;
  return count || 0;
}

/** 당월 수주 건 수정 */
export async function fetchMonthlyOrderCount(monthKey: string): Promise<number> {
  const [y, m] = monthKey.split('-');
  const startDate = `${y}-${m}-01`;
  const endDate = getEndOfMonth(monthKey); // ✅ 동적 날짜 계산
  const { count, error } = await supabase
    .from('business_projects')
    .select('id', { count: 'exact', head: true })
    .in('project_status', ['수주 완료', '프로젝트 중', '프로젝트 완료'])
    .gte('order_date', startDate)
    .lte('order_date', endDate);
  if (error) throw error;
  return count || 0;
}

/** 사업부별 영업 중인 건 수정 */
export async function fetchActiveProjectsByDept(monthKey: string): Promise<Record<string, number>> {
  const endDate = getEndOfMonth(monthKey); // ✅ 동적 날짜 계산
  const { data, error } = await supabase
    .from('business_projects')
    .select('department_code')
    .eq('project_status', '영업 중')
    .lte('base_date', endDate);
  if (error) throw error;
  const counts: Record<string, number> = {};
  (data || []).forEach((r: any) => {
    counts[r.department_code] = (counts[r.department_code] || 0) + 1;
  });
  return counts;
}

/** 사업부별 당월 수주 건 */
export async function fetchMonthlyOrdersByDept(monthKey: string): Promise<Record<string, number>> {
  const [y, m] = monthKey.split('-');
  const startDate = `${y}-${m}-01`;
  const endDate = getEndOfMonth(monthKey);
  const { data, error } = await supabase
    .from('business_projects')
    .select('department_code')
    .in('project_status', ['수주 완료', '프로젝트 중', '프로젝트 완료'])
    .gte('order_date', startDate)
    .lte('order_date', endDate);
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
    .eq('visible', true)
    .not('start_date', 'is', null)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  // Filter projects that overlap with prev July ~ current December (18 months)
  const rangeStart = new Date(`${year - 1}-07-01`);
  const rangeEnd = new Date(`${year}-12-31`);
  return (data as unknown as BusinessProjectRow[]).filter(p => {
    const start = p.start_date ? new Date(p.start_date) : null;
    const end = p.end_date ? new Date(p.end_date) : null;
    if (!start) return false;
    return start <= rangeEnd && (!end || end >= rangeStart);
  });
}
