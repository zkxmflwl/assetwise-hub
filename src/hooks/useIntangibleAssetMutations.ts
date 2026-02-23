import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createIntangibleAsset, updateIntangibleAsset, deleteIntangibleAsset, IntangibleAssetInsert } from '@/services/licenseService';
import { toast } from 'sonner';

export function useIntangibleAssetMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['intangible-assets'] });

  const createMutation = useMutation({
    mutationFn: (asset: IntangibleAssetInsert) => createIntangibleAsset(asset),
    onSuccess: () => { toast.success('자산이 추가되었습니다.'); invalidate(); },
    onError: () => toast.error('자산 추가에 실패했습니다.'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, asset }: { id: number; asset: Partial<IntangibleAssetInsert> }) => updateIntangibleAsset(id, asset),
    onSuccess: () => { toast.success('자산이 수정되었습니다.'); invalidate(); },
    onError: () => toast.error('자산 수정에 실패했습니다.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteIntangibleAsset(id),
    onSuccess: () => { toast.success('자산이 삭제되었습니다.'); invalidate(); },
    onError: () => toast.error('자산 삭제에 실패했습니다.'),
  });

  return { createMutation, updateMutation, deleteMutation };
}
