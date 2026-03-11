import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import { useDepartments } from '@/hooks/useDepartments';
import { useAuth } from '@/contexts/AuthContext';
import { useGridEditor, GridRow } from '@/hooks/useGridEditor';
import { SalesSummaryRow, fetchSalesByDepartment } from '@/services/salesService';
import { supabase } from '@/integrations/supabase/client';
import { formatKRW } from '@/data/mockData';
import { toast } from 'sonner';
import { Plus, Trash2, Save, RotateCcw, Loader2, ArrowUp, ArrowDown, ArrowUpDown, Upload } from 'lucide-react';
import * as XLSX from 'xlsx';

type SortDir = 'asc' | 'desc' | null;

interface ColDef {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'computed' | 'month';
  options?: { value: string; label: string }[];
  readOnly?: boolean;
}

export default function DepartmentBI() {
  const { hasPermission, authUser } = useAuth();
  const canEdit = hasPermission('MANAGER');
  const { data: departments = [] } = useDepartments();
  const [selectedDept, setSelectedDept] = useState('');
  const activeDept = selectedDept || departments[0]?.department_code || '';
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
        note: '',
        headcount_note: '',
        departments: null,
      } as any),
    },
  );
  
  useUnsavedChangesGuard(hasDirty);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);

   const columns: ColDef[] = useMemo(() => [
    { key: 'month_key', label: '연월', type: 'month' },
    { key: 'sales_amount', label: '매출', type: 'number' },
    { key: 'purchase_amount', label: '매입', type: 'number' },
    { key: 'computed_net_sales', label: '순매출', type: 'computed', readOnly: true },
    { key: 'total_headcount', label: '총원', type: 'number' },
    { key: 'note', label: '비고', type: 'text' },
    { key: 'headcount_note', label: '인원비고', type: 'text' },
  ], []);

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
      const col = columns.find(c => c.key === sortKey);
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

    if (typeof value === 'number') {
      return Number.isNaN(value) ? null : value;
    }

    const str = String(value).trim();

    // 엑셀 오류값 방어
    if (
      str === '#N/A' ||
      str === '#VALUE!' ||
      str === '#REF!' ||
      str === '#DIV/0!' ||
      str === '#NAME?' ||
      str === '#NUM!' ||
      str === '#NULL!'
    ) {
      return null;
    }

    // 쉼표, 공백 제거
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

    // 마지막(가장 오른쪽) 시트 사용
    const lastSheetName = wb.SheetNames[wb.SheetNames.length - 1];
    const ws = wb.Sheets[lastSheetName];

    if (!ws) {
      toast.error('엑셀 파일에 시트가 없습니다.');
      return;
    }

    const data: any[][] = XLSX.utils.sheet_to_json(ws, {
      header: 1,
      defval: '',
    });

    let totalHeadcount: number | null = null;
    let salesAmount: number | null = null;
    let purchaseAmount: number | null = null;

    for (const row of data) {
      for (let i = 0; i < row.length; i++) {
        const cellStr = String(row[i] ?? '').trim();

        if (cellStr === '총원' || cellStr.includes('총원')) {
          for (let j = i + 1; j < row.length; j++) {
            const v = parseNumericCell(row[j]);
            if (v !== null) {
              totalHeadcount = v;
              break;
            }
          }
        }

        if (cellStr === '매출' && !cellStr.includes('순매출') && !cellStr.includes('매입')) {
          for (let j = i + 1; j < row.length; j++) {
            const v = parseNumericCell(row[j]);
            if (v !== null) {
              salesAmount = v;
              break;
            }
          }
        }

        if (cellStr === '매입') {
          for (let j = i + 1; j < row.length; j++) {
            const v = parseNumericCell(row[j]);
            if (v !== null) {
              purchaseAmount = v;
              break;
            }
          }
        }
      }
    }

    if (salesAmount === null && purchaseAmount === null && totalHeadcount === null) {
      toast.error('엑셀에서 총원, 매출, 매입 라벨을 찾을 수 없습니다. 라벨 옆에 숫자 값이 있는지 확인해주세요.');
      return;
    }

    addRow();
    setParsedExcelData({ totalHeadcount, salesAmount, purchaseAmount });

    toast.success(
      `엑셀 파싱 완료 [시트: ${lastSheetName}] - 총원: ${totalHeadcount ?? '-'}, 매출: ${salesAmount ?? '-'}, 매입: ${purchaseAmount ?? '-'}`
    );
  } catch (err: any) {
    toast.error(`엑셀 파싱 실패: ${err.message}`);
  }
};

  const [parsedExcelData, setParsedExcelData] = useState<{ totalHeadcount: number | null; salesAmount: number | null; purchaseAmount: number | null } | null>(null);

  // Apply parsed Excel data to the newest row
  useEffect(() => {
    if (parsedExcelData && rows.length > 0 && rows[0].status === 'new') {
      const tempId = rows[0].tempId;

      if (parsedExcelData.totalHeadcount !== null) {
        updateCell(tempId, 'total_headcount' as any, parsedExcelData.totalHeadcount);
      }
      if (parsedExcelData.salesAmount !== null) {
        updateCell(tempId, 'sales_amount' as any, parsedExcelData.salesAmount);
      }
      if (parsedExcelData.purchaseAmount !== null) {
        updateCell(tempId, 'purchase_amount' as any, parsedExcelData.purchaseAmount);
      }

      setParsedExcelData(null);
    }
  }, [parsedExcelData, rows, updateCell]);

  const handleSave = async () => {
    const { inserts, updates, deletes } = getChanges();

    // Validate month_key
    for (const r of inserts) {
      const mk = (r as any).month_key;
      if (!mk || !/^\d{4}-\d{2}$/.test(mk)) {
        toast.error('연월 형식은 YYYY-MM이어야 합니다.');
        return;
      }
    }

    // Check for duplicates
    const allRows = rows.filter(r => r.status !== 'deleted');
    const seen = new Set<string>();
    for (const r of allRows) {
      const key = `${(r.data as any).department_code}__${(r.data as any).month_key}`;
      if (seen.has(key)) {
        toast.error(`같은 사업부+연월 조합이 중복됩니다: ${(r.data as any).month_key}`);
        return;
      }
      seen.add(key);
    }

    setSaving(true);
    try {
      const uid = authUser?.id;
      if (inserts.length > 0) {
        const insertData = inserts.map(r => {
          const { id, updated_at, departments, ...rest } = r as any;
          return {
            department_code: activeDept,
            month_key: rest.month_key,
            total_headcount: rest.total_headcount || 0,
            sales_amount: rest.sales_amount || 0,
            purchase_amount: rest.purchase_amount || 0,
            note: rest.note || null,
            headcount_note: rest.headcount_note || null,
            last_modified_by_auth_user_id: uid,
          };
        });
        const { error } = await supabase.from('department_sales_summary').insert(insertData);
        if (error) throw error;
      }
      for (const r of updates) {
        const { id, updated_at, departments, ...rest } = r as any;
        const { error } = await supabase.from('department_sales_summary').update({
          month_key: rest.month_key,
          total_headcount: rest.total_headcount || 0,
          sales_amount: rest.sales_amount || 0,
          purchase_amount: rest.purchase_amount || 0,
          note: rest.note || null,
          headcount_note: rest.headcount_note || null,
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

  const [editingCell, setEditingCell] = useState<string | null>(null);

  const renderCell = (row: GridRow<SalesSummaryRow>, col: ColDef) => {
    const disabled = !canEdit || row.status === 'deleted';
    const cellKey = `${row.tempId}__${col.key}`;

    if (col.key === 'computed_net_sales') {
      const s = Number((row.data as any).sales_amount || 0);
      const p = Number((row.data as any).purchase_amount || 0);
      return <span className="text-xs text-foreground text-right block">{formatKRW(s - p)}</span>;
    }

    const val = (row.data as any)[col.key];

    if (!canEdit) {
      if (col.type === 'number') return <span className="text-xs text-foreground text-right block">{formatKRW(Number(val || 0))}</span>;
      return <span className="text-xs text-foreground">{val || '-'}</span>;
    }

    if (col.type === 'number') {
      const isEditing = editingCell === cellKey;
      if (!isEditing) {
        return (
          <span className="text-xs text-foreground text-right block cursor-text px-1 py-0.5"
            onClick={() => !disabled && setEditingCell(cellKey)}>
            {formatKRW(Number(val || 0))}
          </span>
        );
      }
      return (
        <input type="text" inputMode="numeric" autoFocus
          value={val ?? ''}
          disabled={disabled}
          onChange={(e) => {
            const raw = e.target.value.replace(/[^0-9\-]/g, '');
            updateCell(row.tempId, col.key as any, raw === '' ? 0 : Number(raw));
          }}
          onBlur={() => setEditingCell(null)}
          onKeyDown={(e) => { if (e.key === 'Enter') setEditingCell(null); }}
          className="w-full min-w-[80px] bg-transparent px-1 py-0.5 text-xs text-foreground text-right disabled:opacity-40 focus:outline-none focus:ring-1 focus:ring-primary rounded" />
      );
    }
    if (col.type === 'month') {
      return (
        <input type="month" value={val ?? ''} disabled={disabled}
          onChange={(e) => updateCell(row.tempId, col.key as any, e.target.value)}
          className="w-full min-w-[120px] bg-transparent px-1 py-0.5 text-xs text-foreground disabled:opacity-40 focus:outline-none focus:ring-1 focus:ring-primary rounded" />
      );
    }
    return (
      <input type="text" value={val ?? ''} disabled={disabled}
        onChange={(e) => updateCell(row.tempId, col.key as any, e.target.value)}
        className="w-full min-w-[60px] bg-transparent px-1 py-0.5 text-xs text-foreground disabled:opacity-40 focus:outline-none focus:ring-1 focus:ring-primary rounded" />
    );
  };

  const rowBg = (status: string) => {
    if (status === 'new') return 'bg-emerald-50';
    if (status === 'updated') return 'bg-amber-50';
    if (status === 'deleted') return 'bg-red-50 opacity-60 line-through';
    return '';
  };

  const deptName = departments.find(d => d.department_code === activeDept)?.department_name || activeDept;

  if (isLoading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">사업부 월별 데이터</h1>
        <p className="mt-1 text-sm text-muted-foreground">부서별 월별 매출/매입 데이터 관리</p>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">사업부 선택</span>
          <select value={activeDept} onChange={(e) => setSelectedDept(e.target.value)}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none">
            {departments.map((d) => <option key={d.department_code} value={d.department_code}>{d.department_name}</option>)}
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
          <button onClick={() => { reset(); setSelectedIds(new Set()); }} disabled={!hasDirty} className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors">
            <RotateCcw className="h-3.5 w-3.5" /> 초기화
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

      <div className="text-xs text-muted-foreground">{deptName} - 전체 {salesData.length}건</div>

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
                {columns.map(col => {
                  const narrowCols = ['month_key', 'total_headcount'];
                  const widthStyle = narrowCols.includes(col.key) ? { width: '80px', minWidth: '80px' } : undefined;
                  return (
                    <th key={col.key} style={widthStyle} className="whitespace-nowrap border-r border-border/50 last:border-r-0 px-3 py-2.5 text-left font-semibold text-foreground">
                      <button onClick={() => handleSort(col.key)} className="flex items-center gap-1 hover:text-primary transition-colors">
                        {col.label}
                        {sortKey === col.key ? (
                          sortDir === 'asc' ? <ArrowUp className="h-3 w-3 text-primary" /> : <ArrowDown className="h-3 w-3 text-primary" />
                        ) : (
                          <ArrowUpDown className="h-3 w-3 opacity-30" />
                        )}
                      </button>
                    </th>
                  );
                })}
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
