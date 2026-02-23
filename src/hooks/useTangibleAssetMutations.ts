import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createTangibleAsset, updateTangibleAsset, deleteTangibleAsset, TangibleAssetInsert } from '@/services/assetService';
import { toast } from 'sonner';

export function useTangibleAssetMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['tangible-assets'] });

  const createMutation = useMutation({
    mutationFn: (asset: TangibleAssetInsert) => createTangibleAsset(asset),
    onSuccess: () => { toast.success('자산이 추가되었습니다.'); invalidate(); },
    onError: () => toast.error('자산 추가에 실패했습니다.'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, asset }: { id: number; asset: Partial<TangibleAssetInsert> }) => updateTangibleAsset(id, asset),
    onSuccess: () => { toast.success('자산이 수정되었습니다.'); invalidate(); },
    onError: () => toast.error('자산 수정에 실패했습니다.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteTangibleAsset(id),
    onSuccess: () => { toast.success('자산이 삭제되었습니다.'); invalidate(); },
    onError: () => toast.error('자산 삭제에 실패했습니다.'),
  });

  return { createMutation, updateMutation, deleteMutation };
}
