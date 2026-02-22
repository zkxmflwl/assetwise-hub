import { supabase } from '@/integrations/supabase/client';

export interface IntangibleAssetRow {
  id: number;
  license_name: string;
  vendor_name: string | null;
  quantity: number;
  department_code: string | null;
  start_date: string | null;
  expiry_date: string | null;
  note: string | null;
  updated_at: string;
  last_modified_by_user_id: string | null;
  asset_type_code: string | null;
  departments: { department_name: string } | null;
  dash_users: { user_name: string } | null;
}

export async function fetchIntangibleAssets() {
  const { data, error } = await supabase
    .from('intangible_assets')
    .select('*, departments(department_name), dash_users(user_name)')
    .order('expiry_date', { ascending: true });
  if (error) throw error;
  return data as IntangibleAssetRow[];
}
