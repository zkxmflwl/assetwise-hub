import { useState, useMemo } from 'react';
import { useIntangibleAssets } from '@/hooks/useIntangibleAssets';
import { useDepartments } from '@/hooks/useDepartments';
import { useAssetTypes } from '@/hooks/useAssetTypes';
import { useAuth } from '@/contexts/AuthContext';
import { useGridEditor, GridRow } from '@/hooks/useGridEditor';
import { IntangibleAssetRow } from '@/services/licenseService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Trash2, Save, RotateCcw, Loader2, Search } from 'lucide-react';

interface ColDef {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select';
  required?: boolean;
  options?: { value: string; label: string }[];
}

export default function ITIntangibleAssets() {
  const { hasPermission, authUser } = useAuth();
  const { data: assets = [], isLoading, error, refetch } = useIntangibleAssets();
  const { data: departments = [], isLoading: deptLoading, error: deptError } = useDepartments();
  const { data: assetTypes = [], isLoading: typeLoading, error: typeError } = useAssetTypes('무형자산');
  const canEdit = hasPermission('MANAGER');

  const { rows, addRow, updateCell, markDeleted, reset, forceSync, dirtyStats, hasDirty, getChanges } = useGridEditor<IntangibleAssetRow>(
    assets,
    {
      idField: 'id',
      newRowTemplate: () => {
        const today = new Date().toISOString().slice(0, 10);
        return {
          license_name: '', vendor_name: '', quantity: 0,
          department_code: null, start_date: today, expiry_date: today,
          note: '', asset_type_code: null,
        } as any;
      },
    },
  );

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const columns: ColDef[] = useMemo(() => [
    { key: 'license_name', label: '라이선스명', type: 'text', required: true },
    { key: 'vendor_name', label: '공급사', type: 'text' },
    { key: 'quantity', label: '수량', type: 'number' },
    { key: 'department_code', label: '부서', type: 'select', options: deptLoading ? [{ value: '', label: '불러오는 중...' }] : deptError ? [{ value: '', label: '로드 실패' }] : departments.map(d => ({ value: d.department_code, label: d.department_name })) },
    { key: 'asset_type_code', label: '자산유형', type: 'select', options: typeLoading ? [{ value: '', label: '불러오는 중...' }] : typeError ? [{ value: '', label: '로드 실패' }] : (assetTypes || []).map(t => ({ value: t.asset_type_code, label: t.sub_category })) },
    { key: 'start_date', label: '시작일', type: 'date' },
    { key: 'expiry_date', label: '만료일', type: 'date' },
    { key: 'note', label: '비고', type: 'text' },
  ], [departments, assetTypes, deptLoading, deptError, typeLoading, typeError]);

  const visibleRows = useMemo(() => {
    if (!search) return rows;
    const s = search.toLowerCase();
    return rows.filter(r => columns.some(col => String((r.data as any)[col.key] || '').toLowerCase().includes(s)));
  }, [rows, search, columns]);

  const handleSave = async () => {
    // Validate required fields
    const { inserts, updates } = getChanges();
    const allChanges = [...inserts, ...updates];
    for (const r of allChanges) {
      if (!(r as any).license_name?.trim()) {
        toast.error('라이선스명은 필수입니다.');
        return;
      }
    }

    setSaving(true);
    try {
      const { inserts, updates, deletes } = getChanges();
      const uid = authUser?.id;

      if (inserts.length > 0) {
        const insertData = inserts.map(r => {
          const { id, updated_at, departments, dash_users, ...rest } = r as any;
          return { ...rest, last_modified_by_auth_user_id: uid };
        });
        const { error } = await supabase.from('intangible_assets').insert(insertData);
        if (error) throw error;
      }

      for (const r of updates) {
        const { id, updated_at, departments, dash_users, ...rest } = r as any;
        const { error } = await supabase.from('intangible_assets').update({ ...rest, last_modified_by_auth_user_id: uid }).eq('id', id);
        if (error) throw error;
      }

      if (deletes.length > 0) {
        const ids = deletes.map((r: any) => r.id);
        const { error } = await supabase.from('intangible_assets').delete().in('id', ids);
        if (error) throw error;
      }

      toast.success(`저장 완료 (추가 ${inserts.length} / 수정 ${updates.length} / 삭제 ${deletes.length})`);
      setSelectedIds(new Set());
      await refetch();
      forceSync();
    } catch (err: any) {
      toast.error(`저장 실패: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (selectedIds.size === 0) { toast.warning('삭제할 행을 선택해주세요.'); return; }
    markDeleted(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  const toggleSelect = (tempId: string) => {
    setSelectedIds(prev => { const s = new Set(prev); s.has(tempId) ? s.delete(tempId) : s.add(tempId); return s; });
  };

  const toggleSelectAll = () => {
    selectedIds.size === visibleRows.length ? setSelectedIds(new Set()) : setSelectedIds(new Set(visibleRows.map(r => r.tempId)));
  };

  const renderCell = (row: GridRow<IntangibleAssetRow>, col: ColDef) => {
    const val = (row.data as any)[col.key];
    const disabled = !canEdit || row.status === 'deleted';

    if (col.type === 'select') {
      return (
        <select value={val || ''} disabled={disabled} onChange={(e) => updateCell(row.tempId, col.key as any, e.target.value || null)}
          className="w-full min-w-[80px] rounded border border-border bg-card px-1.5 py-1 text-xs text-foreground disabled:opacity-40 focus:border-primary focus:outline-none [&>option]:bg-card [&>option]:text-foreground">
          <option value="">-</option>
          {col.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      );
    }
    if (col.type === 'date') {
      return (
        <input type="date" value={val || ''} disabled={disabled} onChange={(e) => updateCell(row.tempId, col.key as any, e.target.value || null)}
          className="w-full min-w-[120px] rounded border border-border bg-transparent px-1.5 py-1 text-xs text-foreground disabled:opacity-40 focus:border-primary focus:outline-none" />
      );
    }
    return (
      <input type={col.type === 'number' ? 'number' : 'text'} value={val ?? ''} disabled={disabled}
        onChange={(e) => updateCell(row.tempId, col.key as any, col.type === 'number' ? Number(e.target.value) : e.target.value)}
        className={`w-full min-w-[60px] rounded border px-1.5 py-1 text-xs text-foreground disabled:opacity-40 focus:border-primary focus:outline-none ${col.required && !val ? 'border-destructive' : 'border-border'} bg-transparent`} />
    );
  };

  const rowBg = (status: string) => {
    if (status === 'new') return 'bg-emerald-950/30';
    if (status === 'updated') return 'bg-amber-950/30';
    if (status === 'deleted') return 'bg-red-950/30 opacity-60 line-through';
    return '';
  };

  if (isLoading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (error) return <div className="flex h-64 flex-col items-center justify-center gap-2 text-destructive"><p>데이터 로드 오류</p></div>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">IT 무형자산</h1>
        <p className="mt-1 text-sm text-muted-foreground">소프트웨어, 라이선스, SaaS 등 무형자산 관리</p>
      </div>

      {canEdit && (
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={addRow} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:opacity-90 transition-opacity">
            <Plus className="h-3.5 w-3.5" /> 행 추가
          </button>
          <button onClick={handleDelete} className="flex items-center gap-1.5 rounded-lg border border-border bg-secondary/50 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-destructive transition-colors">
            <Trash2 className="h-3.5 w-3.5" /> 삭제
          </button>
          <button onClick={handleSave} disabled={!hasDirty || saving} className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:opacity-90 disabled:opacity-40 transition-opacity">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} 저장
          </button>
          <button onClick={() => { reset(); setSelectedIds(new Set()); }} disabled={!hasDirty} className="flex items-center gap-1.5 rounded-lg border border-border bg-secondary/50 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors">
            <RotateCcw className="h-3.5 w-3.5" /> 초기화
          </button>
          {hasDirty && (
            <div className="flex gap-2 text-xs">
              {dirtyStats.added > 0 && <span className="rounded bg-emerald-900/50 px-2 py-1 text-emerald-400">추가 {dirtyStats.added}</span>}
              {dirtyStats.updated > 0 && <span className="rounded bg-amber-900/50 px-2 py-1 text-amber-400">수정 {dirtyStats.updated}</span>}
              {dirtyStats.deleted > 0 && <span className="rounded bg-red-900/50 px-2 py-1 text-red-400">삭제 {dirtyStats.deleted}</span>}
            </div>
          )}
        </div>
      )}

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="검색..."
          className="w-full rounded-lg border border-border bg-secondary/50 py-2 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors" />
      </div>

      <div className="text-xs text-muted-foreground">전체 {assets.length}건 / 표시 {visibleRows.length}건</div>

      <div className="glass-card overflow-hidden rounded-xl">
        <div className="overflow-x-auto scrollbar-thin" style={{ maxHeight: '70vh' }}>
          <table className="w-full text-xs">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-border bg-secondary/80 backdrop-blur">
                {canEdit && (
                  <th className="w-8 px-2 py-2.5">
                    <input type="checkbox" checked={visibleRows.length > 0 && selectedIds.size === visibleRows.length} onChange={toggleSelectAll}
                      className="h-3.5 w-3.5 rounded border-border accent-primary" />
                  </th>
                )}
                {columns.map(col => (
                  <th key={col.key} className="whitespace-nowrap px-2 py-2.5 text-left font-medium text-muted-foreground">{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleRows.length === 0 ? (
                <tr><td colSpan={columns.length + (canEdit ? 1 : 0)} className="py-8 text-center text-muted-foreground">데이터 없음</td></tr>
              ) : visibleRows.map((row) => (
                <tr key={row.tempId} className={`border-b border-border/30 transition-colors ${rowBg(row.status)}`}>
                  {canEdit && (
                    <td className="w-8 px-2 py-1.5">
                      <input type="checkbox" checked={selectedIds.has(row.tempId)} onChange={() => toggleSelect(row.tempId)}
                        className="h-3.5 w-3.5 rounded border-border accent-primary" />
                    </td>
                  )}
                  {columns.map(col => (
                    <td key={col.key} className="px-1 py-1">{renderCell(row, col)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
