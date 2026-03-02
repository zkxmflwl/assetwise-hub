import { useState, useMemo, useRef, useCallback } from 'react';
import { useTangibleAssets } from '@/hooks/useTangibleAssets';
import { useDepartments } from '@/hooks/useDepartments';
import { useAssetTypes } from '@/hooks/useAssetTypes';
import { useAuth } from '@/contexts/AuthContext';
import { useGridEditor, GridRow } from '@/hooks/useGridEditor';
import { TangibleAssetRow } from '@/services/assetService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Trash2, Save, RotateCcw, Loader2, Search, Upload, Download, FileDown, ArrowUp, ArrowDown, ArrowUpDown, Filter, X } from 'lucide-react';
import { parseCsvFile, mapTangibleCsvRows, downloadTangibleCsv, downloadTangibleTemplate } from '@/utils/csv';

interface ColDef {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select';
  required?: boolean;
  options?: { value: string; label: string }[];
}

type SortDir = 'asc' | 'desc' | null;

export default function ITTangibleAssets() {
  const { hasPermission, authUser } = useAuth();
  const { data: assets = [], isLoading, error, refetch } = useTangibleAssets();
  const { data: departments = [], isLoading: deptLoading, error: deptError } = useDepartments();
  const { data: assetTypes = [], isLoading: typeLoading, error: typeError } = useAssetTypes('유형자산');
  const canEdit = hasPermission('MANAGER');
  const csvInputRef = useRef<HTMLInputElement>(null);

  const { rows, addRow, addRows, updateCell, markDeleted, reset, forceSync, dirtyStats, hasDirty, getChanges } = useGridEditor<TangibleAssetRow>(
    assets,
    {
      idField: 'id',
      newRowTemplate: () => {
        const today = new Date().toISOString().slice(0, 10);
        return {
          asset_no: '',
          department_code: null,
          asset_type_code: null,
          manufacturer: '',
          model_name: '',
          serial_no: '',
          cpu_spec: '',
          mem_spec: '',
          hdd_spec: '',
          ssd_spec: '',
          screen_size: '',
          os_name: '',
          purpose: '',
          usage: '',
          purchase_date: today,
          issued_date: today,
          note: '',
        } as any;
      },
    },
  );

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [activeFilterCol, setActiveFilterCol] = useState<string | null>(null);

  const columns: ColDef[] = useMemo(() => [
    { key: 'asset_no', label: '관리번호', type: 'text' },
    { key: 'department_code', label: '소속', type: 'select', options: deptLoading ? [{ value: '', label: '불러오는 중...' }] : deptError ? [{ value: '', label: '로드 실패' }] : departments.map(d => ({ value: d.department_code, label: d.department_name })) },
    { key: 'usage', label: '배정', type: 'text' },
    { key: 'purpose', label: '용도', type: 'text' },
    { key: 'asset_type_code', label: '종류', type: 'select', options: typeLoading ? [{ value: '', label: '불러오는 중...' }] : typeError ? [{ value: '', label: '로드 실패' }] : (assetTypes || []).map(t => ({ value: t.asset_type_code, label: t.sub_category })) },
    { key: 'manufacturer', label: '제조사', type: 'text' },
    { key: 'model_name', label: '모델', type: 'text' },
    { key: 'serial_no', label: 'S/N', type: 'text' },
    { key: 'cpu_spec', label: 'CPU', type: 'text' },
    { key: 'mem_spec', label: 'MEM', type: 'text' },
    { key: 'hdd_spec', label: 'HDD', type: 'text' },
    { key: 'ssd_spec', label: 'SSD', type: 'text' },
    { key: 'screen_size', label: '화면크기', type: 'text' },
    { key: 'os_name', label: 'OS', type: 'text' },
    { key: 'purchase_date', label: '구매연월', type: 'date' },
    { key: 'issued_date', label: '지급일', type: 'date' },
    { key: 'note', label: '비고', type: 'text' },
  ], [departments, assetTypes, deptLoading, deptError, typeLoading, typeError]);

  // Get display value for a cell (resolves select codes to labels)
  const getDisplayValue = useCallback((row: GridRow<TangibleAssetRow>, col: ColDef): string => {
    const val = (row.data as any)[col.key];
    if (val == null || val === '') return '';
    if (col.type === 'select' && col.options) {
      const opt = col.options.find(o => o.value === val);
      return opt?.label || String(val);
    }
    return String(val);
  }, []);

  const visibleRows = useMemo(() => {
    let filtered = rows;

    // Global search
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(r => columns.some(col => getDisplayValue(r, col).toLowerCase().includes(s)));
    }

    // Per-column filters
    const activeFilters = Object.entries(columnFilters).filter(([, v]) => v.trim() !== '');
    if (activeFilters.length > 0) {
      filtered = filtered.filter(r =>
        activeFilters.every(([key, filterVal]) => {
          const col = columns.find(c => c.key === key);
          if (!col) return true;
          return getDisplayValue(r, col).toLowerCase().includes(filterVal.trim().toLowerCase());
        })
      );
    }

    // Sort
    if (sortKey && sortDir) {
      const col = columns.find(c => c.key === sortKey);
      filtered = [...filtered].sort((a, b) => {
        const aVal = col ? getDisplayValue(a, col) : String((a.data as any)[sortKey] ?? '');
        const bVal = col ? getDisplayValue(b, col) : String((b.data as any)[sortKey] ?? '');
        const cmp = aVal.localeCompare(bVal, 'ko', { numeric: true });
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }

    return filtered;
  }, [rows, search, columns, columnFilters, sortKey, sortDir, getDisplayValue]);

  const handleSort = (key: string) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir('asc');
    } else if (sortDir === 'asc') {
      setSortDir('desc');
    } else {
      setSortKey(null);
      setSortDir(null);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setColumnFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilter = (key: string) => {
    setColumnFilters(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setActiveFilterCol(null);
  };

  const activeFilterCount = Object.values(columnFilters).filter(v => v.trim() !== '').length;

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    try {
      const csvRows = await parseCsvFile(file);
      if (csvRows.length === 0) { toast.warning('CSV에 데이터가 없습니다.'); return; }
      const existingAssetNos = new Set(rows.map(r => (r.data as any).asset_no).filter(Boolean));
      const result = mapTangibleCsvRows(csvRows, { departments, assetTypes: assetTypes || [] }, existingAssetNos);
      if (result.rows.length > 0) addRows(result.rows);
      if (result.warnings.length > 0) console.warn('CSV 업로드 경고:', result.warnings);
      toast.success(`CSV 업로드 완료 (추가 ${result.successCount}건${result.failCount > 0 ? ` / 실패 ${result.failCount}건` : ''})`);
      if (result.warnings.length > 0) toast.warning(`경고 ${result.warnings.length}건 (콘솔 확인)`);
    } catch (err: any) {
      toast.error(err.message || 'CSV 파싱 실패');
    }
  };

  const handleCsvDownload = () => {
    const dataRows = rows.filter(r => r.status !== 'deleted').map(r => r.data as any);
    downloadTangibleCsv(dataRows, { departments, assetTypes: assetTypes || [] });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { inserts, updates, deletes } = getChanges();
      const uid = authUser?.id;
      if (inserts.length > 0) {
        const insertData = inserts.map(r => {
          const { id, updated_at, departments, asset_types, dash_users, ...rest } = r as any;
          return { ...rest, last_modified_by_auth_user_id: uid };
        });
        const { error } = await supabase.from('tangible_assets').insert(insertData);
        if (error) throw error;
      }
      for (const r of updates) {
        const { id, updated_at, departments, asset_types, dash_users, ...rest } = r as any;
        const { error } = await supabase.from('tangible_assets').update({ ...rest, last_modified_by_auth_user_id: uid }).eq('id', id);
        if (error) throw error;
      }
      if (deletes.length > 0) {
        const ids = deletes.map((r: any) => r.id);
        const { error } = await supabase.from('tangible_assets').delete().in('id', ids);
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

  const renderCell = (row: GridRow<TangibleAssetRow>, col: ColDef) => {
    const val = (row.data as any)[col.key];
    const disabled = !canEdit || row.status === 'deleted';

    if (!canEdit) {
      if (col.type === 'select') {
        const opt = col.options?.find(o => o.value === val);
        return <span className="text-xs text-foreground">{opt?.label || val || '-'}</span>;
      }
      return <span className="text-xs text-foreground">{val || '-'}</span>;
    }

    if (col.type === 'select') {
      return (
        <select value={val || ''} disabled={disabled} onChange={(e) => updateCell(row.tempId, col.key as any, e.target.value || null)}
          className="w-full min-w-[80px] bg-transparent px-1 py-0.5 text-xs text-foreground disabled:opacity-40 focus:outline-none focus:ring-1 focus:ring-primary rounded">
          <option value="">-</option>
          {col.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      );
    }
    if (col.type === 'date') {
      return (
        <input type="date" value={val || ''} disabled={disabled} onChange={(e) => updateCell(row.tempId, col.key as any, e.target.value || null)}
          className="w-full min-w-[120px] bg-transparent px-1 py-0.5 text-xs text-foreground disabled:opacity-40 focus:outline-none focus:ring-1 focus:ring-primary rounded" />
      );
    }
    return (
      <input type={col.type === 'number' ? 'number' : 'text'} value={val ?? ''} disabled={disabled}
        onChange={(e) => updateCell(row.tempId, col.key as any, col.type === 'number' ? Number(e.target.value) : e.target.value)}
        className="w-full min-w-[60px] bg-transparent px-1 py-0.5 text-xs text-foreground disabled:opacity-40 focus:outline-none focus:ring-1 focus:ring-primary rounded" />
    );
  };

  const rowBg = (status: string) => {
    if (status === 'new') return 'bg-emerald-50';
    if (status === 'updated') return 'bg-amber-50';
    if (status === 'deleted') return 'bg-red-50 opacity-60 line-through';
    return '';
  };

  if (isLoading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (error) return <div className="flex h-64 flex-col items-center justify-center gap-2 text-destructive"><p>데이터 로드 오류</p><button onClick={() => window.location.reload()} className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground">재시도</button></div>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">IT 유형자산</h1>
        <p className="mt-1 text-sm text-muted-foreground">노트북, 모니터, PC 등 IT 유형자산 관리</p>
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
          <div className="mx-1 h-6 w-px bg-border" />
          <input ref={csvInputRef} type="file" accept=".csv" className="hidden" onChange={handleCsvUpload} />
          <button onClick={() => csvInputRef.current?.click()} className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
            <Upload className="h-3.5 w-3.5" /> CSV 업로드
          </button>
          <button onClick={handleCsvDownload} className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
            <Download className="h-3.5 w-3.5" /> CSV 다운로드
          </button>
          <button onClick={downloadTangibleTemplate} className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
            <FileDown className="h-3.5 w-3.5" /> 템플릿
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

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="전체 검색..."
            className="w-full rounded-lg border border-border bg-card py-2 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors" />
        </div>
        {activeFilterCount > 0 && (
          <button onClick={() => { setColumnFilters({}); setActiveFilterCol(null); }} className="flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-3.5 w-3.5" /> 필터 초기화 ({activeFilterCount})
          </button>
        )}
      </div>

      <div className="text-xs text-muted-foreground">전체 {assets.length}건 / 표시 {visibleRows.length}건</div>

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
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleSort(col.key)}
                        className="flex items-center gap-1 hover:text-primary transition-colors"
                      >
                        {col.label}
                        {sortKey === col.key ? (
                          sortDir === 'asc' ? <ArrowUp className="h-3 w-3 text-primary" /> : <ArrowDown className="h-3 w-3 text-primary" />
                        ) : (
                          <ArrowUpDown className="h-3 w-3 opacity-30" />
                        )}
                      </button>
                      <button
                        onClick={() => setActiveFilterCol(activeFilterCol === col.key ? null : col.key)}
                        className={`p-0.5 rounded hover:bg-muted transition-colors ${columnFilters[col.key]?.trim() ? 'text-primary' : 'opacity-30 hover:opacity-70'}`}
                      >
                        <Filter className="h-3 w-3" />
                      </button>
                    </div>
                    {activeFilterCol === col.key && (
                      <div className="mt-1 flex items-center gap-1">
                        <input
                          autoFocus
                          type="text"
                          value={columnFilters[col.key] || ''}
                          onChange={(e) => handleFilterChange(col.key, e.target.value)}
                          placeholder={`${col.label} 필터...`}
                          className="w-full min-w-[80px] rounded border border-border bg-card px-2 py-1 text-xs font-normal text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                          onKeyDown={(e) => { if (e.key === 'Escape') setActiveFilterCol(null); }}
                        />
                        {columnFilters[col.key]?.trim() && (
                          <button onClick={() => clearFilter(col.key)} className="p-0.5 text-muted-foreground hover:text-foreground">
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    )}
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
