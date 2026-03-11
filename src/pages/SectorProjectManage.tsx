import { useState, useMemo, useCallback } from 'react';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import { useSectorProjects } from '@/hooks/useSectorProjects';
import { useDepartments } from '@/hooks/useDepartments';
import { useAuth } from '@/contexts/AuthContext';
import { useGridEditor, GridRow } from '@/hooks/useGridEditor';
import { SectorProjectRow } from '@/services/sectorProjectService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Trash2, Save, RotateCcw, Loader2, Search, ArrowUp, ArrowDown, ArrowUpDown, Filter, X } from 'lucide-react';

type SortDir = 'asc' | 'desc' | null;

interface ColDef {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'sector-select' | 'dept-select';
  options?: { value: string; label: string }[];
  minWidth?: string;
}

export default function SectorProjectManage() {
  const { hasPermission, authUser } = useAuth();
  const canEdit = hasPermission('MANAGER');
  const { data: projects = [], isLoading, refetch } = useSectorProjects();
  const { data: departments = [] } = useDepartments();

  // Unique sectors from departments
  const sectors = useMemo(() => {
    const map = new Map<string, string>();
    departments.forEach(d => {
      if (d.sector_code && d.sector_name && !map.has(d.sector_code)) {
        map.set(d.sector_code, d.sector_name);
      }
    });
    return Array.from(map.entries()).map(([code, name]) => ({ value: code, label: name }));
  }, [departments]);

  const { rows, addRow, updateCell, markDeleted, reset, forceSync, dirtyStats, hasDirty, getChanges } = useGridEditor<SectorProjectRow>(
    projects,
    {
      idField: 'id',
      newRowTemplate: () => ({
        sector_project_name: '',
        sector_code: '',
        department_code: '',
        user_name: '',
        progress: 0,
        note: '',
      } as any),
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
    { key: 'sector_project_name', label: '프로젝트명', type: 'text', minWidth: '150px' },
    { key: 'sector_code', label: '부문', type: 'sector-select' },
    { key: 'department_code', label: '사업부', type: 'dept-select' },
    { key: 'user_name', label: '담당자', type: 'text' },
    { key: 'progress', label: '진행률', type: 'number' },
    { key: 'note', label: '현황', type: 'text', minWidth: '150px' },
  ], []);

  const getDisplayValue = useCallback((row: GridRow<SectorProjectRow>, col: ColDef): string => {
    const val = (row.data as any)[col.key];
    if (val == null || val === '') return '';
    if (col.key === 'sector_code') {
      const dept = departments.find(d => d.sector_code === val);
      return dept?.sector_name || String(val);
    }
    if (col.key === 'department_code') {
      const dept = departments.find(d => d.department_code === val);
      return dept?.department_name || String(val);
    }
    if (col.key === 'progress') return `${val}%`;
    return String(val);
  }, [departments]);

  const visibleRows = useMemo(() => {
    let filtered = rows;
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(r => columns.some(col => getDisplayValue(r, col).toLowerCase().includes(s)));
    }
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
    filtered = [...filtered].sort((a, b) => {
      if (a.status === 'new' && b.status !== 'new') return -1;
      if (a.status !== 'new' && b.status === 'new') return 1;
      if (sortKey && sortDir) {
        const col = columns.find(c => c.key === sortKey);
        const aVal = col ? getDisplayValue(a, col) : '';
        const bVal = col ? getDisplayValue(b, col) : '';
        const cmp = aVal.localeCompare(bVal, 'ko', { numeric: true });
        return sortDir === 'asc' ? cmp : -cmp;
      }
      return 0;
    });
    return filtered;
  }, [rows, search, columns, columnFilters, sortKey, sortDir, getDisplayValue]);

  const handleSort = (key: string) => {
    if (sortKey !== key) { setSortKey(key); setSortDir('asc'); }
    else if (sortDir === 'asc') setSortDir('desc');
    else { setSortKey(null); setSortDir(null); }
  };

  const handleFilterChange = (key: string, value: string) => {
    setColumnFilters(prev => ({ ...prev, [key]: value }));
  };
  const clearFilter = (key: string) => {
    setColumnFilters(prev => { const next = { ...prev }; delete next[key]; return next; });
    setActiveFilterCol(null);
  };
  const activeFilterCount = Object.values(columnFilters).filter(v => v.trim() !== '').length;

  const handleSave = async () => {
    const { inserts, updates, deletes } = getChanges();
    for (const r of [...inserts, ...updates] as any[]) {
      if (!r.sector_project_name?.trim()) { toast.error('프로젝트명은 필수입니다.'); return; }
      if (!r.sector_code?.trim()) { toast.error('부문을 선택해주세요.'); return; }
      if (!r.department_code?.trim()) { toast.error('사업부를 선택해주세요.'); return; }
      // Validate department belongs to sector
      const dept = departments.find(d => d.department_code === r.department_code);
      if (dept && dept.sector_code !== r.sector_code) {
        toast.error(`사업부 "${dept.department_name}"은(는) 선택한 부문에 속하지 않습니다.`);
        return;
      }
      const prog = Number(r.progress);
      if (isNaN(prog) || prog < 0 || prog > 100) {
        toast.error('진행률은 0~100 사이의 숫자여야 합니다.');
        return;
      }
    }

    setSaving(true);
    try {
      if (inserts.length > 0) {
        const insertData = inserts.map((r: any) => ({
          sector_project_name: r.sector_project_name,
          sector_code: r.sector_code,
          department_code: r.department_code,
          user_name: r.user_name || null,
          progress: Number(r.progress) || 0,
          note: r.note || null,
        }));
        const { error } = await supabase.from('sector_project').insert(insertData);
        if (error) throw error;
      }
      for (const r of updates as any[]) {
        const { id, created_at, updated_at, ...rest } = r;
        const { error } = await supabase.from('sector_project')
          .update({
            sector_project_name: rest.sector_project_name,
            sector_code: rest.sector_code,
            department_code: rest.department_code,
            user_name: rest.user_name || null,
            progress: Number(rest.progress) || 0,
            note: rest.note || null,
          })
          .eq('id', id);
        if (error) throw error;
      }
      if (deletes.length > 0) {
        const ids = deletes.map((r: any) => r.id);
        const { error } = await supabase.from('sector_project').delete().in('id', ids);
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

  const renderCell = (row: GridRow<SectorProjectRow>, col: ColDef) => {
    const val = (row.data as any)[col.key];
    const disabled = !canEdit || row.status === 'deleted';

    if (!canEdit) {
      if (col.key === 'progress') return <span className="text-xs text-foreground">{val ?? 0}%</span>;
      return <span className="text-xs text-foreground">{getDisplayValue(row, col) || '-'}</span>;
    }

    if (col.key === 'sector_code') {
      return (
        <select value={val || ''} disabled={disabled}
          onChange={(e) => {
            updateCell(row.tempId, 'sector_code' as any, e.target.value || '');
            // Reset department_code when sector changes
            updateCell(row.tempId, 'department_code' as any, '');
          }}
          className="w-full min-w-[100px] bg-transparent px-1 py-0.5 text-xs text-foreground disabled:opacity-40 focus:outline-none focus:ring-1 focus:ring-primary rounded">
          <option value="">- 선택 -</option>
          {sectors.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      );
    }

    if (col.key === 'department_code') {
      const rowSectorCode = (row.data as any).sector_code;
      const filteredDepts = departments.filter(d => d.sector_code === rowSectorCode);
      return (
        <select value={val || ''} disabled={disabled || !rowSectorCode}
          onChange={(e) => updateCell(row.tempId, col.key as any, e.target.value || '')}
          className="w-full min-w-[100px] bg-transparent px-1 py-0.5 text-xs text-foreground disabled:opacity-40 focus:outline-none focus:ring-1 focus:ring-primary rounded">
          <option value="">- 선택 -</option>
          {filteredDepts.map(d => <option key={d.department_code} value={d.department_code}>{d.department_name}</option>)}
        </select>
      );
    }

    if (col.key === 'progress') {
      return (
        <input type="number" min={0} max={100} value={val ?? 0} disabled={disabled}
          onChange={(e) => updateCell(row.tempId, col.key as any, Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
          className="w-full min-w-[60px] bg-transparent px-1 py-0.5 text-xs text-foreground text-right disabled:opacity-40 focus:outline-none focus:ring-1 focus:ring-primary rounded" />
      );
    }

    return (
      <input type="text" value={val ?? ''} disabled={disabled}
        onChange={(e) => updateCell(row.tempId, col.key as any, e.target.value)}
        className="w-full bg-transparent px-1 py-0.5 text-xs text-foreground disabled:opacity-40 focus:outline-none focus:ring-1 focus:ring-primary rounded"
        style={{ minWidth: col.minWidth || '60px' }} />
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
        <h1 className="text-2xl font-bold text-foreground">부문 프로젝트 관리</h1>
        <p className="mt-1 text-sm text-muted-foreground">부문별 프로젝트 등록 및 현황 관리</p>
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

      <div className="text-xs text-muted-foreground">전체 {projects.length}건 / 표시 {visibleRows.length}건</div>

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
                      <button onClick={() => handleSort(col.key)} className="flex items-center gap-1 hover:text-primary transition-colors">
                        {col.label}
                        {sortKey === col.key ? (
                          sortDir === 'asc' ? <ArrowUp className="h-3 w-3 text-primary" /> : <ArrowDown className="h-3 w-3 text-primary" />
                        ) : (
                          <ArrowUpDown className="h-3 w-3 opacity-30" />
                        )}
                      </button>
                      <button onClick={() => setActiveFilterCol(activeFilterCol === col.key ? null : col.key)}
                        className={`p-0.5 rounded hover:bg-muted-foreground/20 ${columnFilters[col.key] ? 'text-primary' : 'text-muted-foreground/40'}`}>
                        <Filter className="h-3 w-3" />
                      </button>
                    </div>
                    {activeFilterCol === col.key && (
                      <div className="mt-1 flex items-center gap-1">
                        <input autoFocus value={columnFilters[col.key] || ''} onChange={(e) => handleFilterChange(col.key, e.target.value)}
                          placeholder="필터..." className="w-full rounded border border-border bg-background px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary" />
                        {columnFilters[col.key] && (
                          <button onClick={() => clearFilter(col.key)} className="text-muted-foreground hover:text-foreground"><X className="h-3 w-3" /></button>
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
