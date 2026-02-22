import { useQuery } from '@tanstack/react-query';
import { fetchTangibleAssets } from '@/services/assetService';

export function useTangibleAssets() {
  return useQuery({
    queryKey: ['tangible-assets'],
    queryFn: fetchTangibleAssets,
  });
}
