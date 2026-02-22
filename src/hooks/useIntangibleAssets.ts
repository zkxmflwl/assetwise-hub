import { useQuery } from '@tanstack/react-query';
import { fetchIntangibleAssets } from '@/services/licenseService';

export function useIntangibleAssets() {
  return useQuery({
    queryKey: ['intangible-assets'],
    queryFn: fetchIntangibleAssets,
  });
}
