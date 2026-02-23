import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { TangibleAssetInsert, TangibleAssetRow } from '@/services/assetService';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset?: TangibleAssetRow | null;
  departments: { department_code: string; department_name: string }[];
  onSubmit: (data: TangibleAssetInsert) => void;
  isSubmitting?: boolean;
}

const fields: { name: keyof TangibleAssetInsert; label: string; type?: string }[] = [
  { name: 'department_code', label: '소속' },
  { name: 'user_name', label: '사용자' },
  { name: 'manager_name', label: '관리자' },
  { name: 'asset_type_code', label: '종류코드' },
  { name: 'manufacturer', label: '제조사' },
  { name: 'model_name', label: '모델' },
  { name: 'serial_no', label: 'S/N' },
  { name: 'cpu_spec', label: 'CPU' },
  { name: 'mem_spec', label: 'MEM' },
  { name: 'hdd_spec', label: 'HDD' },
  { name: 'ssd_spec', label: 'SSD' },
  { name: 'screen_size', label: '화면크기' },
  { name: 'os_name', label: 'OS' },
  { name: 'purpose', label: '용도' },
  { name: 'usage_location', label: '사용처' },
  { name: 'purchase_date', label: '구매일', type: 'date' },
  { name: 'issued_date', label: '지급일', type: 'date' },
  { name: 'note', label: '비고' },
];

export default function TangibleAssetDialog({ open, onOpenChange, asset, departments, onSubmit, isSubmitting }: Props) {
  const { register, handleSubmit, reset } = useForm<TangibleAssetInsert>();

  useEffect(() => {
    if (open) {
      if (asset) {
        reset({
          department_code: asset.department_code,
          user_name: asset.user_name,
          manager_name: asset.manager_name,
          asset_type_code: asset.asset_type_code,
          manufacturer: asset.manufacturer,
          model_name: asset.model_name,
          serial_no: asset.serial_no,
          cpu_spec: asset.cpu_spec,
          mem_spec: asset.mem_spec,
          hdd_spec: asset.hdd_spec,
          ssd_spec: asset.ssd_spec,
          screen_size: asset.screen_size,
          os_name: asset.os_name,
          purpose: asset.purpose,
          usage_location: asset.usage_location,
          purchase_date: asset.purchase_date,
          issued_date: asset.issued_date,
          note: asset.note,
        });
      } else {
        reset({});
      }
    }
  }, [open, asset, reset]);

  const handleFormSubmit = (data: TangibleAssetInsert) => {
    // Convert empty strings to null
    const cleaned = Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, v === '' ? null : v])
    ) as TangibleAssetInsert;
    onSubmit(cleaned);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{asset ? '자산 수정' : '자산 추가'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="grid grid-cols-2 gap-3">
          {fields.map((f) => (
            <div key={f.name} className="space-y-1">
              <Label className="text-xs">{f.label}</Label>
              {f.name === 'department_code' ? (
                <select {...register(f.name)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">선택</option>
                  {departments.map((d) => (
                    <option key={d.department_code} value={d.department_code}>{d.department_name}</option>
                  ))}
                </select>
              ) : (
                <Input {...register(f.name)} type={f.type || 'text'} className="h-9 text-sm" />
              )}
            </div>
          ))}
          <div className="col-span-2 flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>취소</Button>
            <Button type="submit" disabled={isSubmitting}>{asset ? '수정' : '추가'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
