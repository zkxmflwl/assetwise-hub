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
}

export async function fetchSectorProjects() {
  const { data, error } = await supabase
    .from('sector_project')
    .select('*')
    .order('sector_code', { ascending: true })
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data as SectorProjectRow[];
}
