import { useState, useMemo, useCallback, useEffect } from 'react';
import { useBusinessProjects } from '@/hooks/useBusinessProjects';
import { useDepartments } from '@/hooks/useDepartments';
import { useAuth } from '@/contexts/AuthContext';
import { useGridEditor, GridRow } from '@/hooks/useGridEditor';
import { BusinessProjectRow, PROJECT_STATUSES } from '@/services/businessProjectService';
import { buildDeptColorMap, getDeptRowColor } from '@/utils/departmentColors';
import { supabase } from '@/integrations/supabase/client';
import { formatKRW } from '@/data/mockData';
import { toast } from 'sonner';
import { Plus, Trash2, Save, RotateCcw, Loader2, Search, ArrowUp, ArrowDown, ArrowUpDown, Filter, X } from 'lucide-react';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';

type SortDir = 'asc' | 'desc' | null;

interface ColDef {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'boolean';
  options?: { value: string; label: string }[];
  readOnly?: boolean;
  minWidth?: string;
}

export default function ProjectManage() {
  const { hasPermission, authUser } = useAuth();
  const canEdit = hasPermission('MANAGER');
  const { data: projects = [], isLoading, refetch } = useBusinessProjects();
  const { data: departments = [] } = useDepartments();

  const { rows, addRow, updateCell, markDeleted, reset, forceSync, dirtyStats, hasDirty, getChanges } = useGridEditor<BusinessProjectRow>(
    projects,
    {
      idField: 'id',
      newRowTemplate: () => ({
        project_name: '',
        project_summary: '',
        department_code: '',
        client_name: '',
        project_status: '기회 식별',
        sales_schedule_note: '',
        secured_schedule_note: '',
        category: '',
        base_date: null,
        order_date: null,
        start_date: null,
        end_date: null,
        sales_amount: 0,
        purchase_amount: 0,
        note: '',
        effort: '',
        sort_order: 100,
        visible: true,
        is_active: true,
      } as any),
    },
  );

  useUnsavedChangesGuard(hasDirty);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [activeFilterCol, setActiveFilterCol] = useState<string | null>(null);
  const [deptFilter, setDeptFilter] = useState('');
  const [useFilter, setUseFilter] = useState<'all' | 'active' | 'inactive'>('active');

  useEffect(() => {
    if (departments.length > 0) {
      buildDeptColorMap(departments.map(d => d.department_code));
    }
  }, [departments]);

  const columns: ColDef[] = useMemo(() => [
    { key: 'sort_order',            label: '월간보고 상 정렬',  type: 'number',  minWidth: '100px' },
    { key: 'visible',               label: '월간보고 상 노출',  type: 'boolean', minWidth: '100px' },
    { key: 'client_name',           label: '고객사명',          type: 'text',    minWidth: '120px' },
    { key: 'project_name',          label: '프로젝트명',        type: 'text',    minWidth: '300px' },
    { key: 'project_summary',       label: '프로젝트 내용',     type: 'text',    minWidth: '300px' },
    { key: 'project_status',        label: '상태',              type: 'select',  minWidth: '160px', options: PROJECT_STATUSES.map(s => ({ value: s, label: s })) },
    { key: 'sales_schedule_note',   label: '영업일정',          type: 'text',    minWidth: '200px' },
    { key: 'secured_schedule_note', label: '수주일정',          type: 'text',    minWidth: '200px' },
    { key: 'category',              label: '분류',              type: 'text',    minWidth: '80px'  },
    { key: 'base_date',             label: '기회식별일',        type: 'date',    minWidth: '130px' },
    { key: 'order_date',            label: '수주완료일',        type: 'date',    minWidth: '130px' },
    { key: 'start_date',            label: '프로젝트시작일',    type: 'date',    minWidth: '130px' },
    { key: 'end_date',              label: '프로젝트종료일',    type: 'date',    minWidth: '130px' },
    { key: 'sales_amount',          label: '매출',              type: 'number',  minWidth: '110px' },
    { key: 'purchase_amount',       label: '매입',              type: 'number',  minWidth: '110px' },
    { key: 'effort',                label: '라이선스 및 공수',  type: 'text',    minWidth: '140px' },
    { key: 'note',                  label: '비고',              type: 'text',    minWidth: '160px' },
    { key: 'department_code',       label: '사업부',            type: 'select',  minWidth: '140px', readOnly: true, options: departments.map(d => ({ value: d.department_code, label: d.department_name })) },
  ], [departments]);

  const getDisplayValue = useCallback((row: GridRow<BusinessProjectRow>, col: ColDef): string => {
    const val = (row.data as any)[col.key];
    if (val == null || val === '') return '';
    if (col.type === 'select' && col.options) {
      const opt = col.options.find(o => o.value === val);
      return opt?.label || String(val);
    }
    if (col.type === 'boolean') return val ? 'Y' : 'N';
    return String(val);
  }, []);

  const visibleRows = useMemo(() => {
    let filtered = rows;

    if (deptFilter) {
      filtered = filtered.filter(r => (r.data as any).department_code === deptFilter);
    }

    if (useFilter === 'active') {
      filtered = filtered.filter(r => (r.data as any).is_active !== false);
    } else if (useFilter === 'inactive') {
      filtered = filtered.filter(r => (r.data as any).is_active === false);
    }

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
      } else {
        const deptA = (a.data as any).department_code || '';
        const deptB = (b.data as any).department_code || '';
        const deptCmp = deptA.localeCompare(deptB, 'ko');
        if (deptCmp !== 0) return deptCmp;
        const dateA = (a.data as any).base_date || '';
        const dateB = (b.data as any).base_date || '';
        return dateB.localeCompare(dateA);
      }
    });

    return filtered;
  }, [rows, search, columns, columnFilters, sortKey, sortDir, getDisplayValue, deptFilter, useFilter]);

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

  const handleStatusChange = (tempId: string, newStatus: string) => {
    updateCell(tempId, 'project_status' as any, newStatus);
    if (newStatus === '영업 종결') {
      updateCell(tempId, 'is_active' as any, false);
    } else {
      updateCell(tempId, 'is_active' as any, true);
    }
  };

  const handleSave = async () => {
    const { inserts, updates, deletes } = getChanges();
    for (const r of [...inserts, ...updates]) {
      if (!(r as any).project_name?.trim()) { toast.error('프로젝트명은 필수입니다.'); return; }
      if (!(r as any).department_code?.trim()) { toast.error('사업부는 필수입니다.'); return; }
      if (!(r as any).client_name?.trim()) { toast.error('고객사명은 필수입니다.'); return; }
      if (!(r as any).project_status?.trim()) { toast.error('상태는 필수입니다.'); return; }
    }

    setSaving(true);
    try {
      const uid = authUser?.id;
      if (inserts.length > 0) {
        const insertData = inserts.map(r => {
          const { id, updated_at, created_at, departments, ...rest } = r as any;
          return { ...rest, last_modified_by_auth_user_id: uid };
        });
        const { error } = await supabase.from('business_projects').insert(insertData);
        if (error) throw error;
      }
      for (const r of updates) {
        const { id, updated_at, created_at, departments, ...rest } = r as any;
        const { error } = await supabase.from('business_projects').update({ ...rest, last_modified_by_auth_user_id: uid }).eq('id', id);
        if (error) throw error;
      }
      if (deletes.length > 0) {
        const ids = deletes.map((r: any) => r.id);
        const { error } = await supabase.from('business_projects').delete().in('id', ids);
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

  const handleAddRow = useCallback(() => {
    const tempId = addRow();
    if (deptFilter) {
      updateCell(tempId, 'department_code' as any, deptFilter);
    }
  }, [addRow, deptFilter, updateCell]);

  // ─── renderCell ──────────────────────────────────────────────────────────────
  // 핵심 변경: 모든 읽기 전용 span에 whitespace-nowrap 적용
  //            input/select width는 minWidth 기반으로 고정 → 내용에 따라 열 폭 결정
  const renderCell = (row: GridRow<BusinessProjectRow>, col: ColDef) => {
    const val = (row.data as any)[col.key];
    const disabled = !canEdit || row.status === 'deleted' || !!col.readOnly;
    const inputBase = 'bg-transparent px-1 py-0.5 text-xs text-foreground disabled:opacity-40 focus:outline-none focus:ring-1 focus:ring-primary rounded whitespace-nowrap';

    // ── 읽기 전용 렌더 ──
    if (!canEdit || col.readOnly) {
      if (col.type === 'select') {
        const opt = col.options?.find(o => o.value === val);
        return <span className="block text-xs text-foreground whitespace-nowrap">{opt?.label || val || '-'}</span>;
      }
      if (col.type === 'number') {
        return (
          <span className="block text-xs text-foreground text-right whitespace-nowrap">
            {col.key === 'sort_order' ? (val ?? 0) : formatKRW(Number(val || 0))}
          </span>
        );
      }
      if (col.type === 'boolean') {
        return <span className="block text-xs text-foreground whitespace-nowrap">{val ? 'Y' : 'N'}</span>;
      }
      return <span className="block text-xs text-foreground whitespace-nowrap">{val || '-'}</span>;
    }

    // ── 편집 가능 렌더 ──
    if (col.type === 'boolean') {
      return (
        <div className="flex justify-center items-center">
          <input
            type="checkbox"
            checked={!!val}
            disabled={disabled}
            onChange={(e) => updateCell(row.tempId, col.key as any, e.target.checked)}
            className="h-3.5 w-3.5 rounded border-border accent-primary"
          />
        </div>
      );
    }

    if (col.type === 'select') {
      const handler = col.key === 'project_status'
        ? (e: React.ChangeEvent<HTMLSelectElement>) => handleStatusChange(row.tempId, e.target.value)
        : (e: React.ChangeEvent<HTMLSelectElement>) => updateCell(row.tempId, col.key as any, e.target.value || null);
      return (
        <select
          value={val || ''}
          disabled={disabled}
          onChange={handler}
          style={{ minWidth: col.minWidth || '80px' }}
          className={`${inputBase} w-full`}
        >
          <option value="">-</option>
          {col.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      );
    }

    if (col.type === 'date') {
      return (
        <input
          type="date"
          value={val || ''}
          disabled={disabled}
          onChange={(e) => updateCell(row.tempId, col.key as any, e.target.value || null)}
          style={{ minWidth: col.minWidth || '130px' }}
          className={`${inputBase} w-full`}
        />
      );
    }

    if (col.type === 'number') {
      return (
        <input
          type="number"
          value={val ?? ''}
          disabled={disabled}
          onChange={(e) => updateCell(row.tempId, col.key as any, Number(e.target.value))}
          style={{ minWidth: col.minWidth || '80px' }}
          className={`${inputBase} w-full text-right`}
        />
      );
    }

    // text
    return (
      <input
        type="text"
        value={val ?? ''}
        disabled={disabled}
        onChange={(e) => updateCell(row.tempId, col.key as any, e.target.value)}
        style={{ minWidth: col.minWidth || '80px' }}
        className={`${inputBase} w-full`}
      />
    );
  };

  const rowBg = (row: GridRow<BusinessProjectRow>) => {
    if (row.status === 'new') return 'bg-emerald-50';
    if (row.status === 'updated') return 'bg-amber-50';
    if (row.status === 'deleted') return 'bg-red-50 opacity-60 line-through';
    return getDeptRowColor((row.data as any).department_code);
  };

  if (isLoading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">프로젝트 데이터</h1>
        <p className="mt-1 text-sm text-muted-foreground">영업/수주/프로젝트 현황 관리</p>
      </div>

      {canEdit && (
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={handleAddRow} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:opacity-90 transition-opacity">
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
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">사업부</span>
          <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none">
            <option value="">전체</option>
            {departments.map(d => <option key={d.department_code} value={d.department_code}>{d.department_name}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">프로젝트</span>
          <select value={useFilter} onChange={(e) => setUseFilter(e.target.value as any)}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none">
            <option value="active">활성 프로젝트</option>
            <option value="inactive">비활성 프로젝트</option>
            <option value="all">전체</option>
          </select>
        </div>
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
        {/* overflow-x-auto + 세로 스크롤만 고정 높이로 제한 */}
        <div className="overflow-x-auto scrollbar-thin" style={{ maxHeight: '70vh' }}>
          {/*
           * table-auto  : 열 폭을 내용에 맞게 자동 계산
           * w-max       : 테이블이 컨테이너보다 넓어질 수 있도록 허용 (overflow-x-auto 와 함께 사용)
           */}
          <table className="w-max table-auto text-xs">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-border bg-muted">
                {canEdit && (
                  <th className="w-8 border-r border-border/50 px-2 py-2.5">
                    <input
                      type="checkbox"
                      checked={visibleRows.length > 0 && selectedIds.size === visibleRows.length}
                      onChange={toggleSelectAll}
                      className="h-3.5 w-3.5 rounded border-border accent-primary"
                    />
                  </th>
                )}
                {columns.map(col => (
                  <th
                    key={col.key}
                    style={{ minWidth: col.minWidth }}
                    className="whitespace-nowrap border-r border-border/50 last:border-r-0 px-3 py-2.5 text-left font-semibold text-foreground"
                  >
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleSort(col.key)} className="flex items-center gap-1 hover:text-primary transition-colors whitespace-nowrap">
                        {col.label}
                        {sortKey === col.key ? (
                          sortDir === 'asc' ? <ArrowUp className="h-3 w-3 text-primary" /> : <ArrowDown className="h-3 w-3 text-primary" />
                        ) : (
                          <ArrowUpDown className="h-3 w-3 opacity-30" />
                        )}
                      </button>
                      <button
                        onClick={() => setActiveFilterCol(activeFilterCol === col.key ? null : col.key)}
                        className={`p-0.5 rounded hover:bg-muted-foreground/20 ${columnFilters[col.key] ? 'text-primary' : 'text-muted-foreground/40'}`}
                      >
                        <Filter className="h-3 w-3" />
                      </button>
                    </div>
                    {activeFilterCol === col.key && (
                      <div className="mt-1 flex items-center gap-1">
                        <input
                          autoFocus
                          value={columnFilters[col.key] || ''}
                          onChange={(e) => handleFilterChange(col.key, e.target.value)}
                          placeholder="필터..."
                          className="w-full rounded border border-border bg-background px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        {columnFilters[col.key] && (
                          <button onClick={() => clearFilter(col.key)} className="text-muted-foreground hover:text-foreground">
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
                <tr>
                  <td colSpan={columns.length + (canEdit ? 1 : 0)} className="py-8 text-center text-muted-foreground">
                    데이터 없음
                  </td>
                </tr>
              ) : visibleRows.map((row) => (
                <tr key={row.tempId} className={`border-b border-border/50 transition-colors hover:bg-muted/30 ${rowBg(row)}`}>
                  {canEdit && (
                    <td className="w-8 border-r border-border/50 px-2 py-1.5">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(row.tempId)}
                        onChange={() => toggleSelect(row.tempId)}
                        className="h-3.5 w-3.5 rounded border-border accent-primary"
                      />
                    </td>
                  )}
                  {columns.map(col => (
                    <td
                      key={col.key}
                      style={{ minWidth: col.minWidth }}
                      className="align-middle border-r border-border/50 last:border-r-0 px-3 py-1.5 whitespace-nowrap"
                    >
                      {renderCell(row, col)}
                    </td>
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
