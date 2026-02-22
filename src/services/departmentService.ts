import { supabase } from '@/integrations/supabase/client';

export interface Department {
  department_code: string;
  department_name: string;
  is_active: boolean;
}

export async function fetchDepartments() {
  const { data, error } = await supabase
    .from('departments')
    .select('department_code, department_name, is_active')
    .eq('is_active', true)
    .order('department_name');
  if (error) throw error;
  return data as Department[];
}
