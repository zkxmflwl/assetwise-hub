import { supabase } from '@/integrations/supabase/client';

export interface TangibleAssetRow {
  id: number;
  asset_no: string | null;
  department_code: string | null;
  asset_type_code: string | null;
  manufacturer: string | null;
  model_name: string | null;
  serial_no: string | null;
  cpu_spec: string | null;
  mem_spec: string | null;
  hdd_spec: string | null;
  ssd_spec: string | null;
  screen_size: string | null;
  os_name: string | null;
  purpose: string | null;
  usage: string | null;
  purchase_date: string | null;
  issued_date: string | null;
  note: string | null;
  updated_at: string;
  last_modified_by_auth_user_id: string | null;
  departments: { department_name: string } | null;
  asset_types: { sub_category: string } | null;
  dash_users: { user_name: string } | null;
}

export async function fetchTangibleAssets() {
  const { data, error } = await supabase
    .from('tangible_assets')
    .select('*, departments(department_name), asset_types(sub_category), dash_users(user_name)')
    .order('purchase_date', { ascending: true });
  if (error) throw error;
  return data as unknown as TangibleAssetRow[];
}
