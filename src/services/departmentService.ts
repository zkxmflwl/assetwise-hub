import { supabase } from '@/integrations/supabase/client';

export interface Department {
  department_code: string;
  department_name: string;
  sector_code: string | null;
  sector_name: string | null;
  is_active: boolean;
  sort_order: number;
}

export async function fetchDepartments() {
  const { data, error } = await supabase
    .from('departments')
    .select('department_code, department_name, sector_code, sector_name, is_active, sort_order')
    .eq('is_active', true)
    .order('sort_order')
    .order('department_name');
  if (error) throw error;
  return data as Department[];
}
