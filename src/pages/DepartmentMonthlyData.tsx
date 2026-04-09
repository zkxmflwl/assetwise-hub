import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import { useDepartments } from '@/hooks/useDepartments';
import { useAuth } from '@/contexts/AuthContext';
import { useGridEditor, GridRow } from '@/hooks/useGridEditor';
import { useResizableColumns } from '@/hooks/useResizableColumns';
import { useColumnDragDrop } from '@/hooks/useColumnDragDrop';
import DraggableResizableHeader from '@/components/DraggableResizableHeader';
import { SalesSummaryRow, fetchSalesByDepartment } from '@/services/salesService';
import { supabase } from '@/integrations/supabase/client';
import { formatKRW } from '@/data/mockData';
import { toast } from 'sonner';
import { Plus, Trash2, Save, RotateCcw, Loader2, Upload, RotateCw, WrapText, AlignJustify } from 'lucide-react';
import * as XLSX from 'xlsx';

type SortDir = 'asc' | 'desc' | null;

interface ColDef {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'computed' | 'month';
  options?: { value: string; label: string }[];
  readOnly?: boolean;
}

export default function DepartmentMonthlyData() {
  const { hasPermission, authUser } = useAuth();
  const canEdit = hasPermission('MANAGER');
  const { data: departments = [] } = useDepartments();
  const [selectedDept, setSelectedDept] = useState('__none__');
  const activeDept = selectedDept === '__none__' ? '' : selectedDept || departments[0]?.department_code || '';
  const xlsxInputRef = useRef<HTMLInputElement>(null);

  const { data: salesData = [], isLoading, refetch } = useQuery({
    queryKey: ['sales-by-dept', activeDept],
    queryFn: () => fetchSalesByDepartment(activeDept),
    enabled: !!activeDept,
  });

  const { rows, addRow, updateCell, markDeleted, reset, forceSync, dirtyStats, hasDirty, getChanges } = useGridEditor<SalesSummaryRow>(
    salesData,
    {
      idField: 'id',
      newRowTemplate: () => ({
        department_code: activeDept,
        month_key: '',
        total_headcount: 0,
        sales_amount: 0,
        purchase_amount: 0,
        note: '계약 완료 / 프로젝트 수주 / 팀 변동 / 사업부 워크샵 등',
        headcount_note: '+1명 (김철수 사원 입사)\n-1명 (이영희 과장 퇴사)\n-1명 (최영수 대리 사업부 이동)',
        departments: null,
        deferred_sales: 0,
        deferred_purchase: 0,
      } as any),
    },
  );

  useUnsavedChangesGuard(hasDirty);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [multilineExpanded, setMultilineExpanded] = useState(false);

  const columns: ColDef[] = useMemo(
    () => [
      { key: 'month_key', label: '연월', type: 'month' },
      { key: 'sales_amount', label: '당월 매출', type: 'number' },
      { key: 'purchase_amount', label: '당월 매입', type: 'number' },
      { key: 'computed_net_sales', label: '당월 순매출', type: 'computed', readOnly: true },
      { key: 'total_headcount', label: '총원', type: 'number' },
      { key: 'note', label: '부서 현황', type: 'text' },
      { key: 'headcount_note', label: '인원비고', type: 'text' },
      { key: 'deferred_sales', label: '이연 매출', type: 'number' },
      { key: 'deferred_purchase', label: '이연 매입', type: 'number' },
    ],
    [],
  );

  // ── Column drag & drop (localStorage 미사용) ──
  const { orderedColumns, dragState, onDragStart, onDragOver, onDragEnd, resetOrder } =
    useColumnDragDrop(columns);

  // ── Column & row resizing (localStorage 미사용) ──
  const { columnSizing, getRowHeight, onColResizeStart, onRowResizeStart, resetSizing } =
    useResizableColumns();

  const rowRefs = useRef<Map<string, HTMLTableRowElement>>(new Map());

  const displayColumns = useMemo(() => orderedColumns(columns), [orderedColumns, columns]);

  const getDisplayValue = useCallback((row: GridRow<SalesSummaryRow>, col: ColDef): string => {
    if (col.key === 'computed_net_sales') {
      const s = Number((row.data as any).sales_amount || 0);
      const p = Number((row.data as any).purchase_amount || 0);
      return String(s - p);
    }
    const val = (row.data as any)[col.key];
    if (val == null || val === '') return '';
    return String(val);
  }, []);

  const visibleRows = useMemo(() => {
    let filtered = rows;
    if (sortKey && sortDir) {
      const col = columns.find((c) => c.key === sortKey);
      filtered = [...filtered].sort((a, b) => {
        const aVal = col ? getDisplayValue(a, col) : '';
        const bVal = col ? getDisplayValue(b, col) : '';
        const cmp = aVal.localeCompare(bVal, 'ko', { numeric: true });
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }
    return filtered;
  }, [rows, columns, sortKey, sortDir, getDisplayValue]);

  const handleSort = (key: string) => {
    if (sortKey !== key) { setSortKey(key); setSortDir('asc'); }
    else if (sortDir === 'asc') setSortDir('desc');
    else { setSortKey(null); setSortDir(null); }
  };

  const parseNumericCell = (value: any): number | null => {
    if (value == null || value === '') return null;
    if (typeof value === 'number') return Number.isNaN(value) ? null : value;
    const str = String(value).trim();
    if (['#N/A', '#VALUE!', '#REF!', '#DIV/0!', '#NAME?', '#NUM!', '#NULL!'].includes(str)) return null;
    const cleaned = str.replace(/,/g, '').replace(/\s/g, '');
    if (cleaned === '') return null;
    const num = Number(cleaned);
    return Number.isNaN(num) ? null : num;
  };

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    try {
      const arrayBuffer = await file.arrayBuffer();
      const wb = XLSX.read(arrayBuffer, { type: 'array' });
      const lastSheetName = wb.SheetNames[wb.SheetNames.length - 1];
      const ws = wb.Sheets[lastSheetName];
      if (!ws) { toast.error('엑셀 파일에 시트가 없습니다.'); return; }
      const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
      let totalHeadcount: number | null = null;
      let salesAmount: number | null = null;
      let purchaseAmount: number | null = null;
      for (const row of data) {
        for (let i = 0; i < row.length; i++) {
          const cellStr = String(row[i] ?? '').trim();
          if (cellStr === '총원' || cellStr.includes('총원')) {
            for (let j = i + 1; j < row.length; j++) { const v = parseNumericCell(row[j]); if (v !== null) { totalHeadcount = v; break; } }
          }
          if (cellStr === '매출' && !cellStr.includes('순매출') && !cellStr.includes('매입')) {
            for (let j = i + 1; j < row.length; j++) { const v = parseNumericCell(row[j]); if (v !== null) { salesAmount = v; break; } }
          }
          if (cellStr === '매입') {
            for (let j = i + 1; j < row.length; j++) { const v = parseNumericCell(row[j]); if (v !== null) { purchaseAmount = v; break; } }
          }
        }
      }
      if (salesAmount === null && purchaseAmount === null && totalHeadcount === null) {
        toast.error('엑셀에서 총원, 매출, 매입 라벨을 찾을 수 없습니다. 라벨 옆에 숫자 값이 있는지 확인해주세요.');
        return;
      }
      addRow();
      setParsedExcelData({ totalHeadcount, salesAmount, purchaseAmount });
      toast.success(`엑셀 파싱 완료 [시트: ${lastSheetName}] - 총원: ${totalHeadcount ?? '-'}, 매출: ${salesAmount ?? '-'}, 매입: ${purchaseAmount ?? '-'}`);
    } catch (err: any) {
      toast.error(`엑셀 파싱 실패: ${err.message}`);
    }
  };

  const [parsedExcelData, setParsedExcelData] = useState<{
    totalHeadcount: number | null;
    salesAmount: number | null;
    purchaseAmount: number | null;
  } | null>(null);

  useEffect(() => {
    if (parsedExcelData && rows.length > 0 && rows[0].status === 'new') {
      const tempId = rows[0].tempId;
      if (parsedExcelData.totalHeadcount !== null) updateCell(tempId, 'total_headcount' as any, parsedExcelData.totalHeadcount);
      if (parsedExcelData.salesAmount !== null) updateCell(tempId, 'sales_amount' as any, parsedExcelData.salesAmount);
      if (parsedExcelData.purchaseAmount !== null) updateCell(tempId, 'purchase_amount' as any, parsedExcelData.purchaseAmount);
      setParsedExcelData(null);
    }
  }, [parsedExcelData, rows, updateCell]);

  const handleSave = async () => {
    const { inserts, updates, deletes } = getChanges();
    for (const r of inserts) {
      const mk = (r as any).month_key;
      if (!mk || !/^\d{4}-\d{2}$/.test(mk)) { toast.error('연월 형식은 YYYY-MM이어야 합니다.'); return; }
    }
    const allRows = rows.filter((r) => r.status !== 'deleted');
    const seen = new Set<string>();
    for (const r of allRows) {
      const key = `${(r.data as any).department_code}__${(r.data as any).month_key}`;
      if (seen.has(key)) { toast.error(`같은 사업부+연월 조합이 중복됩니다: ${(r.data as any).month_key}`); return; }
      seen.add(key);
    }
    setSaving(true);
    try {
      const uid = authUser?.id;
      if (inserts.length > 0) {
        const insertData = inserts.map((r) => {
          const { id, updated_at, departments, ...rest } = r as any;
          return {
            department_code: activeDept, month_key: rest.month_key, total_headcount: rest.total_headcount || 0,
            sales_amount: rest.sales_amount || 0, purchase_amount: rest.purchase_amount || 0,
            note: rest.note || null, headcount_note: rest.headcount_note || null,
            deferred_sales: rest.deferred_sales || 0, deferred_purchase: rest.deferred_purchase || 0,
            last_modified_by_auth_user_id: uid,
          };
        });
        const { error } = await supabase.from('department_sales_summary').insert(insertData);
        if (error) throw error;
      }
      for (const r of updates) {
        const { id, updated_at, departments, ...rest } = r as any;
        const { error } = await supabase.from('department_sales_summary')
          .update({
            month_key: rest.month_key, total_headcount: rest.total_headcount || 0,
            sales_amount: rest.sales_amount || 0, purchase_amount: rest.purchase_amount || 0,
            note: rest.note || null, headcount_note: rest.headcount_note || null,
            deferred_sales: rest.deferred_sales || 0, deferred_purchase: rest.deferred_purchase || 0,
            last_modified_by_auth_user_id: uid,
          }).eq('id', id);
        if (error) throw error;
      }
      if (deletes.length > 0) {
        const ids = deletes.map((r: any) => r.id);
        const { error } = await supabase.from('department_sales_summary').delete().in('id', ids);
        if (error) throw error;
      }
      toast.success(`저장 완료 (추가 ${inserts.length} / 수정 ${updates.length} / 삭제 ${deletes.length})`);
      setSelectedIds(new Set());
      setEditingCell(null);
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
    setSelectedIds((prev) => { const s = new Set(prev); s.has(tempId) ? s.delete(tempId) : s.add(tempId); return s; });
  };
  const toggleSelectAll = () => {
    selectedIds.size === visibleRows.length ? setSelectedIds(new Set()) : setSelectedIds(new Set(visibleRows.map((r) => r.tempId)));
  };

  const isMultilineColumn = (colKey: string) => colKey === 'note' || colKey === 'headcount_note';

  /** 읽기 전용: 한 줄 말줄임 */
  const renderCollapsedMultilineText = (value: any) => (
    <div className="w-full max-w-[240px] truncate px-1 py-0.5 text-xs text-foreground" title={String(value || '')}>
      {value || '-'}
    </div>
  );

  /** 읽기 전용: 여러 줄 펼침 */
  const renderExpandedMultilineText = (value: any) => (
    <div className="w-full max-w-[240px] whitespace-pre-wrap break-words px-1 py-0.5 text-xs text-foreground">
      {value || '-'}
    </div>
  );

  const renderCell = (row: GridRow<SalesSummaryRow>, col: ColDef) => {
    const disabled = !canEdit || row.status === 'deleted';
    const isDeferredCol = col.key === 'deferred_sales' || col.key === 'deferred_purchase';
    const monthKey = (row.data as any).month_key ?? '';
    const isJanuary = monthKey.endsWith('-01');
    const effectiveDisabled = disabled || (isDeferredCol && !isJanuary);
    const cellKey = `${row.tempId}__${col.key}`;
    const val = (row.data as any)[col.key];

    if (col.key === 'computed_net_sales') {
      const s = Number((row.data as any).sales_amount || 0);
      const p = Number((row.data as any).purchase_amount || 0);
      return <span className="block text-right text-xs text-foreground">{formatKRW(s - p)}</span>;
    }

    if (!canEdit) {
      if (col.type === 'number') return <span className="block text-right text-xs text-foreground">{formatKRW(Number(val || 0))}</span>;
      if (isMultilineColumn(col.key)) {
        return multilineExpanded ? renderExpandedMultilineText(val) : renderCollapsedMultilineText(val);
      }
      return <span className="text-xs text-foreground">{val || '-'}</span>;
    }

    if (col.type === 'number') {
      const isEditing = editingCell === cellKey;
      if (!isEditing) {
        return (
          <span
            className={`block px-1 py-0.5 text-right text-xs ${effectiveDisabled ? 'cursor-not-allowed text-muted-foreground opacity-40 select-none' : 'cursor-text text-foreground'}`}
            onClick={() => !effectiveDisabled && setEditingCell(cellKey)}
            title={effectiveDisabled && isDeferredCol ? '01월 데이터에서만 입력 가능합니다' : undefined}
          >
            {formatKRW(Number(val || 0))}
          </span>
        );
      }
      return (
        <input type="text" inputMode="numeric" autoFocus value={val ?? ''} disabled={effectiveDisabled}
          onChange={(e) => { const raw = e.target.value.replace(/[^0-9\-]/g, ''); updateCell(row.tempId, col.key as any, raw === '' ? 0 : Number(raw)); }}
          onBlur={() => setEditingCell(null)}
          onKeyDown={(e) => { if (e.key === 'Enter') setEditingCell(null); }}
          className="w-full min-w-[80px] rounded bg-transparent px-1 py-0.5 text-right text-xs text-foreground disabled:opacity-40 focus:outline-none focus:ring-1 focus:ring-primary" />
      );
    }

    if (col.type === 'month') {
      return (
        <input type="month" value={val ?? ''} disabled={disabled} max="9999-12"
          onChange={(e) => {
            const newMonthKey = e.target.value;
            const year = parseInt(newMonthKey.split('-')[0], 10);
            if (year > 9999) return;
            updateCell(row.tempId, col.key as any, newMonthKey);
            if (!newMonthKey?.endsWith('-01')) {
              updateCell(row.tempId, 'deferred_sales' as any, 0);
              updateCell(row.tempId, 'deferred_purchase' as any, 0);
            }
          }}
          className="w-full min-w-[100px] rounded bg-transparent px-1 py-0.5 text-xs text-foreground disabled:opacity-40 focus:outline-none focus:ring-1 focus:ring-primary" />
      );
    }

    if (isMultilineColumn(col.key)) {
      const isEditing = editingCell === cellKey;

      // 편집 중이 아닐 때
      if (!isEditing) {
        // multilineExpanded가 true면 여러 줄 표시, false면 한 줄 말줄임
        if (multilineExpanded) {
          return (
            <div
              className={`w-full max-w-[240px] whitespace-pre-wrap break-words cursor-text px-1 py-0.5 text-xs text-foreground ${disabled ? 'opacity-40 cursor-default' : ''}`}
              onClick={() => !disabled && setEditingCell(cellKey)}
            >
              {val || '-'}
            </div>
          );
        }
        return (
          <div
            className={`w-full max-w-[240px] cursor-text truncate px-1 py-0.5 text-xs text-foreground ${disabled ? 'opacity-40 cursor-default' : ''}`}
            title={String(val || '')} onClick={() => !disabled && setEditingCell(cellKey)}
          >
            {val || '-'}
          </div>
        );
      }

      return (
        <textarea autoFocus value={val ?? ''} disabled={disabled} rows={4}
          onChange={(e) => updateCell(row.tempId, col.key as any, e.target.value)}
          onBlur={() => setEditingCell(null)}
          className="w-full min-w-[220px] resize-y rounded bg-transparent px-1 py-1 text-xs text-foreground whitespace-pre-wrap disabled:opacity-40 focus:outline-none focus:ring-1 focus:ring-primary"
          placeholder="여러 줄 입력 가능" />
      );
    }

    return (
      <input type="text" value={val ?? ''} disabled={disabled}
        onChange={(e) => updateCell(row.tempId, col.key as any, e.target.value)}
        className="w-full min-w-[60px] rounded bg-transparent px-1 py-0.5 text-xs text-foreground disabled:opacity-40 focus:outline-none focus:ring-1 focus:ring-primary" />
    );
  };

  const rowBg = (status: string) => {
    if (status === 'new') return 'bg-emerald-50';
    if (status === 'updated') return 'bg-amber-50';
    if (status === 'deleted') return 'bg-red-50 opacity-60 line-through';
    return '';
  };

  const handleRowResizeMouseDown = (e: React.MouseEvent, tempId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const trEl = rowRefs.current.get(tempId);
    const currentHeight = trEl?.getBoundingClientRect().height || 32;
    onRowResizeStart(tempId, e.clientY, currentHeight);
  };

  const deptName = departments.find((d) => d.department_code === activeDept)?.department_name || activeDept;

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">사업부 월별 데이터</h1>
        <p className="mt-1 text-sm text-muted-foreground">부서별 월별 매출/매입 데이터 관리</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">사업부 선택</span>
          <select value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none">
            <option value="__none__">선택</option>
            {departments.map((d) => (
              <option key={d.department_code} value={d.department_code}>{d.department_name}</option>
            ))}
          </select>
        </div>
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
          <button onClick={() => { reset(); setSelectedIds(new Set()); setEditingCell(null); }} disabled={!hasDirty}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors">
            <RotateCcw className="h-3.5 w-3.5" /> 새로고침
          </button>
          <div className="mx-1 h-6 w-px bg-border" />
          <input ref={xlsxInputRef} type="file" accept=".xlsx,.xls,.xlsm" className="hidden" onChange={handleExcelUpload} />
          <button onClick={() => xlsxInputRef.current?.click()} className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
            <Upload className="h-3.5 w-3.5" /> 엑셀 업로드
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

      {/* ── 그리드 바로 위: 전체 건수 + 멀티라인 토글 + 레이아웃 초기화 ── */}
      <div className="flex items-center gap-2">
        <div className="text-xs text-muted-foreground">{deptName} - 전체 {salesData.length}건</div>
        <button
          onClick={() => setMultilineExpanded((prev) => !prev)}
          className="flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          title={multilineExpanded ? '한 줄로 보기' : '여러 줄로 보기'}
        >
          {multilineExpanded ? <AlignJustify className="h-3 w-3" /> : <WrapText className="h-3 w-3" />}
          {multilineExpanded ? '한 줄 보기' : '여러 줄 보기'}
        </button>
        <button
          onClick={() => { resetOrder(); resetSizing(); }}
          className="flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          title="컬럼 순서 및 크기 초기화"
        >
          <RotateCw className="h-3 w-3" /> 레이아웃 초기화
        </button>
      </div>

      <div className="glass-card overflow-hidden rounded-xl">
        <div className="overflow-x-auto scrollbar-thin" style={{ maxHeight: '70vh' }}>
          <table className="w-full text-xs" style={{ tableLayout: 'fixed' }}>
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-border bg-muted">
                {canEdit && (
                  <th className="border-r border-border/50 px-2 py-2.5" style={{ width: '36px', minWidth: '36px' }}>
                    <input type="checkbox" checked={visibleRows.length > 0 && selectedIds.size === visibleRows.length}
                      onChange={toggleSelectAll} className="h-3.5 w-3.5 rounded border-border accent-primary" />
                  </th>
                )}
                {displayColumns.map((col) => (
                  <DraggableResizableHeader
                    key={col.key}
                    colKey={col.key}
                    label={col.label}
                    width={columnSizing[col.key]}
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={handleSort}
                    onResizeStart={onColResizeStart}
                    isDragging={dragState.draggingKey === col.key}
                    isDragOver={dragState.overKey === col.key}
                    onDragStart={onDragStart}
                    onDragOver={onDragOver}
                    onDragEnd={onDragEnd}
                  />
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={displayColumns.length + (canEdit ? 1 : 0)} className="py-8 text-center text-muted-foreground">
                    데이터 없음
                  </td>
                </tr>
              ) : (
                visibleRows.map((row) => {
                  const customHeight = getRowHeight(row.tempId);
                  return (
                    <tr
                      key={row.tempId}
                      ref={(el) => { if (el) rowRefs.current.set(row.tempId, el); else rowRefs.current.delete(row.tempId); }}
                      style={customHeight ? { height: `${customHeight}px` } : undefined}
                      className={`relative border-b border-border/50 transition-colors hover:bg-muted/30 ${rowBg(row.status)}`}
                    >
                      {canEdit && (
                        <td className="border-r border-border/50 px-2 py-1.5 align-top" style={{ width: '36px', minWidth: '36px' }}>
                          <input type="checkbox" checked={selectedIds.has(row.tempId)} onChange={() => toggleSelect(row.tempId)}
                            className="h-3.5 w-3.5 rounded border-border accent-primary" />
                        </td>
                      )}
                      {displayColumns.map((col, colIdx) => (
                        <td key={col.key} className="border-r border-border/50 last:border-r-0 px-3 py-1.5 align-top overflow-hidden"
                          style={columnSizing[col.key] ? { width: `${columnSizing[col.key]}px`, minWidth: `${columnSizing[col.key]}px`, maxWidth: `${columnSizing[col.key]}px` } : undefined}>
                          {renderCell(row, col)}
                          {/* Row resize handle */}
                          {colIdx === displayColumns.length - 1 && (
                            <div
                              onMouseDown={(e) => handleRowResizeMouseDown(e, row.tempId)}
                              className="absolute bottom-0 left-0 h-1 w-full cursor-row-resize bg-transparent hover:bg-primary/30 active:bg-primary/50 transition-colors z-[1]"
                              style={{ touchAction: 'none' }}
                            />
                          )}
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
