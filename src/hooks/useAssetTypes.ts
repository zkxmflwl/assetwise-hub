import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useAssetTypes(majorCategory?: string) {
  return useQuery({
    queryKey: ['asset-types', majorCategory],
    queryFn: async () => {
      let query = supabase
        .from('asset_types')
        .select('asset_type_code, sub_category, major_category')
        .eq('is_active', true)
        .order('sort_order')
        .order('sub_category');
      if (majorCategory) query = query.eq('major_category', majorCategory);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}
