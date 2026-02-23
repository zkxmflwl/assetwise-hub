import { useState } from 'react';
import { useIntangibleAssets } from '@/hooks/useIntangibleAssets';
import { useIntangibleAssetMutations } from '@/hooks/useIntangibleAssetMutations';
import { useDepartments } from '@/hooks/useDepartments';
import { useAuth } from '@/contexts/AuthContext';
import { IntangibleAssetRow, IntangibleAssetInsert } from '@/services/licenseService';
import { Plus, Search, Download, Loader2, Pencil, Trash2 } from 'lucide-react';
import IntangibleAssetDialog from '@/components/IntangibleAssetDialog';
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog';

const columns: { key: string; label: string; getter: (a: IntangibleAssetRow) => string }[] = [
  { key: 'license_name', label: '라이선스명', getter: (a) => a.license_name },
  { key: 'vendor_name', label: '공급사', getter: (a) => a.vendor_name || '-' },
  { key: 'quantity', label: '수량', getter: (a) => String(a.quantity) },
  { key: 'dept_name', label: '사용부서', getter: (a) => a.departments?.department_name || '-' },
  { key: 'start_date', label: '시작일', getter: (a) => a.start_date || '-' },
  { key: 'expiry_date', label: '만료일', getter: (a) => a.expiry_date || '-' },
  { key: 'note', label: '비고', getter: (a) => a.note || '-' },
  { key: 'updated_at', label: '수정일', getter: (a) => a.updated_at ? new Date(a.updated_at).toLocaleDateString('ko-KR') : '-' },
  { key: 'modifier_name', label: '수정자', getter: (a) => a.dash_users?.user_name || '-' },
];

export default function ITIntangibleAssets() {
  const { hasPermission } = useAuth();
  const { data: assets = [], isLoading, error } = useIntangibleAssets();
  const { data: departments = [] } = useDepartments();
  const { createMutation, updateMutation, deleteMutation } = useIntangibleAssetMutations();
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<IntangibleAssetRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<IntangibleAssetRow | null>(null);
  const canEdit = hasPermission('editor');

  const filtered = assets.filter((a) => {
    const matchSearch = search === '' || columns.some((col) => col.getter(a).toLowerCase().includes(search.toLowerCase()));
    const matchDept = filterDept === '' || a.department_code === filterDept;
    return matchSearch && matchDept;
  });

  const handleAdd = () => { setEditingAsset(null); setDialogOpen(true); };
  const handleEdit = (asset: IntangibleAssetRow) => { setEditingAsset(asset); setDialogOpen(true); };
  const handleSubmit = (data: IntangibleAssetInsert) => {
    if (editingAsset) {
      updateMutation.mutate({ id: editingAsset.id, asset: data }, { onSuccess: () => setDialogOpen(false) });
    } else {
      createMutation.mutate(data, { onSuccess: () => setDialogOpen(false) });
    }
  };
  const handleDelete = () => {
    if (deleteTarget) {
      deleteMutation.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) });
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2 text-destructive">
        <p>데이터를 불러오는 중 오류가 발생했습니다.</p>
        <button onClick={() => window.location.reload()} className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground">재시도</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">IT 무형자산</h1>
          <p className="mt-1 text-sm text-muted-foreground">소프트웨어, 라이선스, SaaS 등 무형자산 관리</p>
        </div>
        {canEdit && (
          <button onClick={handleAdd} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity">
            <Plus className="h-4 w-4" />
            자산 추가
          </button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="glass-card rounded-xl p-4">
          <p className="text-sm text-muted-foreground">전체 자산</p>
          <p className="mt-1 text-xl font-bold text-foreground">{assets.length}건</p>
        </div>
        <div className="glass-card rounded-xl p-4">
          <p className="text-sm text-muted-foreground">총 수량</p>
          <p className="mt-1 text-xl font-bold text-foreground">{assets.reduce((s, a) => s + a.quantity, 0)}개</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="검색..."
            className="w-full rounded-lg border border-border bg-secondary/50 py-2 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
          />
        </div>
        <select
          value={filterDept}
          onChange={(e) => setFilterDept(e.target.value)}
          className="rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
        >
          <option value="">전체 부서</option>
          {departments.map((d) => (
            <option key={d.department_code} value={d.department_code}>{d.department_name}</option>
          ))}
        </select>
        <button className="flex items-center gap-2 rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <Download className="h-4 w-4" />
          내보내기
        </button>
      </div>

      <div className="glass-card overflow-hidden rounded-xl">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                {columns.map((col) => (
                  <th key={col.key} className="whitespace-nowrap px-3 py-3 text-left text-xs font-medium text-muted-foreground">
                    {col.label}
                  </th>
                ))}
                {canEdit && <th className="px-3 py-3 text-xs font-medium text-muted-foreground">관리</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={columns.length + (canEdit ? 1 : 0)} className="py-8 text-center text-muted-foreground">데이터 없음</td></tr>
              ) : filtered.map((asset) => (
                <tr key={asset.id} className="border-b border-border/30 hover:bg-secondary/20 transition-colors">
                  {columns.map((col) => (
                    <td key={col.key} className="whitespace-nowrap px-3 py-2.5 text-foreground">
                      {col.getter(asset)}
                    </td>
                  ))}
                  {canEdit && (
                    <td className="whitespace-nowrap px-3 py-2.5">
                      <div className="flex gap-1">
                        <button onClick={() => handleEdit(asset)} className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => setDeleteTarget(asset)} className="rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <IntangibleAssetDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        asset={editingAsset}
        departments={departments}
        onSubmit={handleSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
