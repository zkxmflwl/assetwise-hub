import { useState, useMemo, useCallback } from 'react';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import { useDepartments } from '@/hooks/useDepartments';
import { useAuth } from '@/contexts/AuthContext';
import { useGridEditor, GridRow } from '@/hooks/useGridEditor';
import { Department } from '@/services/departmentService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Trash2, Save, RotateCcw, Loader2, Search, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';

type SortDir = 'asc' | 'desc' | null;

interface ColDef {
  key: string;
  label: string;
  type: 'text';
}

export default function DepartmentManage() {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('ADMIN');
  const { data: departments = [], isLoading, refetch } = useDepartments();

  const { rows, addRow, updateCell, markDeleted, reset, forceSync, dirtyStats, hasDirty, getChanges } = useGridEditor<Department>(
    departments,
    {
      idField: 'department_code',
      newRowTemplate: () => ({
        department_code: '',
        department_name: '',
        sector_code: '',
        sector_name: '',
        is_active: true,
        sort_order: 100,
      }),
    },
  );

  useUnsavedChangesGuard(hasDirty);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);

  const columns: ColDef[] = [
    { key: 'sort_order', label: '정렬순서', type: 'text' },
    { key: 'sector_code', label: '부문코드', type: 'text' },
    { key: 'sector_name', label: '부문명', type: 'text' },
    { key: 'department_code', label: '부서코드', type: 'text' },
    { key: 'department_name', label: '부서명', type: 'text' },
  ];

  const getDisplayValue = useCallback((row: GridRow<Department>, col: ColDef): string => {
    const val = (row.data as any)[col.key];
    return val == null ? '' : String(val);
  }, []);

  const visibleRows = useMemo(() => {
    let filtered = rows;
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(r => columns.some(col => getDisplayValue(r, col).toLowerCase().includes(s)));
    }
    if (sortKey && sortDir) {
      filtered = [...filtered].sort((a, b) => {
        const aVal = getDisplayValue(a, columns.find(c => c.key === sortKey)!);
        const bVal = getDisplayValue(b, columns.find(c => c.key === sortKey)!);
        const cmp = aVal.localeCompare(bVal, 'ko', { numeric: true });
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }
    return filtered;
  }, [rows, search, sortKey, sortDir, getDisplayValue]);

  const handleSort = (key: string) => {
    if (sortKey !== key) { setSortKey(key); setSortDir('asc'); }
    else if (sortDir === 'asc') setSortDir('desc');
    else { setSortKey(null); setSortDir(null); }
  };

  const handleSave = async () => {
    const { inserts, updates, deletes } = getChanges();
    console.log('before save loop');
    for (const r of updates) {
      console.log('update row:', r);

      const originalCode = rows.find(row => row.data === r)?.tempId;
      console.log('originalCode:', originalCode);

      const updatePayload: any = {
        department_name: r.department_name,
        sector_code: r.sector_code || null,
        sector_name: r.sector_name || null,
      };

      if (originalCode && originalCode !== r.department_code) {
        updatePayload.department_code = r.department_code;
      }

      console.log('updatePayload:', updatePayload);
      console.log('eq code:', originalCode || r.department_code);

      const { error } = await supabase
        .from('departments')
        .update(updatePayload)
        .eq('department_code', originalCode || r.department_code)
        .select('department_code');

      console.log('after update query', error);

      if (error) throw error;
    }
    console.log('after save loop');
    for (const r of inserts) {
      if (!r.department_code?.trim() || !r.department_name?.trim()) {
        toast.error('부서코드와 부서명은 필수입니다.');
        return;
      }
    }
    for (const r of updates) {
      if (!r.department_code?.trim() || !r.department_name?.trim()) {
        toast.error('부서코드와 부서명은 필수입니다.');
        return;
      }
    }

    setSaving(true);
    try {
      if (inserts.length > 0) {
        const insertData = inserts.map(r => ({
          department_code: r.department_code,
          department_name: r.department_name,
          sector_code: r.sector_code || null,
          sector_name: r.sector_name || null,
          is_active: true,
        }));
        const { error } = await supabase.from('departments').insert(insertData);
        if (error) throw error;
      }
      for (const r of updates) {
        // tempId holds the original department_code
        const originalCode = rows.find(row => row.data === r)?.tempId;
      const updatePayload: any = {
          department_name: r.department_name,
          sector_code: r.sector_code || null,
          sector_name: r.sector_name || null,
          sort_order: r.sort_order ?? 100,
        };
        // If department_code changed, update it too (CASCADE will propagate)
        if (originalCode && originalCode !== r.department_code) {
          updatePayload.department_code = r.department_code;
        }
        const { error } = await supabase.from('departments')
          .update(updatePayload)
          .eq('department_code', originalCode || r.department_code);
        if (error) throw error;
      }
      if (deletes.length > 0) {
        for (const r of deletes) {
          const originalCode = rows.find(row => row.data === r)?.tempId;
          const { error } = await supabase.from('departments').delete().eq('department_code', originalCode || r.department_code);
          if (error) throw error;
        }
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

  const renderCell = (row: GridRow<Department>, col: ColDef) => {
    const val = (row.data as any)[col.key];
    const disabled = !canEdit || row.status === 'deleted';

    if (!canEdit) {
      return <span className="text-xs text-foreground">{val || '-'}</span>;
    }

    return (
      <input type="text" value={val ?? ''} disabled={disabled}
        onChange={(e) => updateCell(row.tempId, col.key as any, e.target.value)}
        className="w-full min-w-[80px] bg-transparent px-1 py-0.5 text-xs text-foreground disabled:opacity-40 focus:outline-none focus:ring-1 focus:ring-primary rounded" />
    );
  };

  const rowBg = (status: string) => {
    if (status === 'new') return 'bg-emerald-50';
    if (status === 'updated') return 'bg-amber-50';
    if (status === 'deleted') return 'bg-red-50 opacity-60 line-through';
    return '';
  };

  if (isLoading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">부서 관리</h1>
        <p className="mt-1 text-sm text-muted-foreground">부문/부서 코드 및 명칭 관리</p>
      </div>

      {canEdit && (
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={addRow} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:opacity-90 transition-opacity">
            <Plus className="h-3.5 w-3.5" /> 행 추가
          </button>
          <button onClick={handleDelete} className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground hover:text-destructive transition-colors">
            <Trash2 className="h-3.5 w-3.5" /> 삭제
          </button>
          <button onClick={handleSave} disabled={!hasDirty || saving} className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:opacity-90 disabled:opacity-40 transition-opacity">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} 저장
          </button>
          <button onClick={() => { reset(); setSelectedIds(new Set()); }} disabled={!hasDirty} className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors">
            <RotateCcw className="h-3.5 w-3.5" /> 초기화
          </button>
          {hasDirty && (
            <div className="flex gap-2 text-xs">
              {dirtyStats.added > 0 && <span className="rounded bg-emerald-100 px-2 py-1 text-emerald-700">추가 {dirtyStats.added}</span>}
              {dirtyStats.updated > 0 && <span className="rounded bg-amber-100 px-2 py-1 text-amber-700">수정 {dirtyStats.updated}</span>}
              {dirtyStats.deleted > 0 && <span className="rounded bg-red-100 px-2 py-1 text-red-700">삭제 {dirtyStats.deleted}</span>}
            </div>
          )}
        </div>
      )}

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="검색..."
          className="w-full rounded-lg border border-border bg-card py-2 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors" />
      </div>

      <div className="text-xs text-muted-foreground">전체 {departments.length}건 / 표시 {visibleRows.length}건</div>

      <div className="glass-card overflow-hidden rounded-xl">
        <div className="overflow-x-auto scrollbar-thin" style={{ maxHeight: '70vh' }}>
          <table className="w-full text-xs">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-border bg-muted">
                {canEdit && (
                  <th className="w-8 border-r border-border/50 px-2 py-2.5">
                    <input type="checkbox" checked={visibleRows.length > 0 && selectedIds.size === visibleRows.length} onChange={toggleSelectAll}
                      className="h-3.5 w-3.5 rounded border-border accent-primary" />
                  </th>
                )}
                {columns.map(col => (
                  <th key={col.key} className="whitespace-nowrap border-r border-border/50 last:border-r-0 px-3 py-2.5 text-left font-semibold text-foreground">
                    <button onClick={() => handleSort(col.key)} className="flex items-center gap-1 hover:text-primary transition-colors">
                      {col.label}
                      {sortKey === col.key ? (
                        sortDir === 'asc' ? <ArrowUp className="h-3 w-3 text-primary" /> : <ArrowDown className="h-3 w-3 text-primary" />
                      ) : (
                        <ArrowUpDown className="h-3 w-3 opacity-30" />
                      )}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleRows.length === 0 ? (
                <tr><td colSpan={columns.length + (canEdit ? 1 : 0)} className="py-8 text-center text-muted-foreground">데이터 없음</td></tr>
              ) : visibleRows.map((row) => (
                <tr key={row.tempId} className={`border-b border-border/50 transition-colors hover:bg-muted/30 ${rowBg(row.status)}`}>
                  {canEdit && (
                    <td className="w-8 border-r border-border/50 px-2 py-1.5">
                      <input type="checkbox" checked={selectedIds.has(row.tempId)} onChange={() => toggleSelect(row.tempId)}
                        className="h-3.5 w-3.5 rounded border-border accent-primary" />
                    </td>
                  )}
                  {columns.map(col => (
                    <td key={col.key} className="border-r border-border/50 last:border-r-0 px-3 py-1.5">{renderCell(row, col)}</td>
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
