import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { IntangibleAssetInsert, IntangibleAssetRow } from '@/services/licenseService';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset?: IntangibleAssetRow | null;
  departments: { department_code: string; department_name: string }[];
  onSubmit: (data: IntangibleAssetInsert) => void;
  isSubmitting?: boolean;
}

export default function IntangibleAssetDialog({ open, onOpenChange, asset, departments, onSubmit, isSubmitting }: Props) {
  const { register, handleSubmit, reset } = useForm<IntangibleAssetInsert>();

  useEffect(() => {
    if (open) {
      if (asset) {
        reset({
          license_name: asset.license_name,
          vendor_name: asset.vendor_name,
          quantity: asset.quantity,
          department_code: asset.department_code,
          start_date: asset.start_date,
          expiry_date: asset.expiry_date,
          note: asset.note,
        });
      } else {
        reset({ license_name: '', quantity: 0 });
      }
    }
  }, [open, asset, reset]);

  const handleFormSubmit = (data: IntangibleAssetInsert) => {
    const cleaned = Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, v === '' ? null : v])
    ) as IntangibleAssetInsert;
    cleaned.quantity = Number(cleaned.quantity) || 0;
    onSubmit(cleaned);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{asset ? '자산 수정' : '자산 추가'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">라이선스명 *</Label>
            <Input {...register('license_name', { required: true })} className="h-9 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">공급사</Label>
              <Input {...register('vendor_name')} className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">수량</Label>
              <Input {...register('quantity')} type="number" className="h-9 text-sm" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">사용부서</Label>
            <select {...register('department_code')} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="">선택</option>
              {departments.map((d) => (
                <option key={d.department_code} value={d.department_code}>{d.department_name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">시작일</Label>
              <Input {...register('start_date')} type="date" className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">만료일</Label>
              <Input {...register('expiry_date')} type="date" className="h-9 text-sm" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">비고</Label>
            <Input {...register('note')} className="h-9 text-sm" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>취소</Button>
            <Button type="submit" disabled={isSubmitting}>{asset ? '수정' : '추가'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
