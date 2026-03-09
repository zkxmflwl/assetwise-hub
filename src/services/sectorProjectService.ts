import { supabase } from '@/integrations/supabase/client';

export interface SectorProjectRow {
  id: number;
  sector_project_name: string;
  sector_code: string;
  department_code: string;
  user_name: string | null;
  progress: number;
  note: string | null;
  created_at: string;
  updated_at: string;
  departments: { department_name: string; sector_name: string | null } | null;
}

export async function fetchSectorProjects() {
  const { data, error } = await supabase
    .from('sector_project')
    .select('*, departments(department_name, sector_name)')
    .order('sector_code')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data as unknown as SectorProjectRow[];
}
