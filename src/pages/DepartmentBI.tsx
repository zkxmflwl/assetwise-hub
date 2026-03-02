import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSalesData, useAvailableMonths } from '@/hooks/useSalesData';
import { SalesSummaryRow, fetchYtdSummary, fetchSalesSummary } from '@/services/salesService';
import { useDepartments } from '@/hooks/useDepartments';
import { useAuth } from '@/contexts/AuthContext';
import { useGridEditor, GridRow } from '@/hooks/useGridEditor';
import { supabase } from '@/integrations/supabase/client';
import { formatKRW } from '@/data/mockData';
import { toast } from 'sonner';
import { Plus, Trash2, Save, RotateCcw, Loader2, ArrowUp, ArrowDown, ArrowUpDown, TrendingUp, TrendingDown, Minus } from 'lucide-react';

type SortDir = 'asc' | 'desc' | null;

interface ColDef {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select';
  options?: { value: string; label: string }[];
}

function getPrevMonthKey(monthKey: string): string {
  if (!monthKey) return '';
  const [y, m] = monthKey.split('-').map(Number);
  if (m === 1) return `${y - 1}-12`;
  return `${y}-${String(m - 1).padStart(2, '0')}`;
}

export default function DepartmentBI() {
  const { hasPermission, authUser } = useAuth();
  const canEdit = hasPermission('MANAGER');
  const { data: months = [] } = useAvailableMonths();
  const { data: departments = [] } = useDepartments();
  const [selectedMonth, setSelectedMonth] = useState<string>('');

  const activeMonth = selectedMonth || months[0] || '';
  const prevMonth = getPrevMonthKey(activeMonth);

  const { data: salesData = [], isLoading, refetch } = useSalesData(activeMonth || undefined);

  // YTD cumulative data (Jan ~ activeMonth of same year)
  const ytdYear = activeMonth ? activeMonth.split('-')[0] : '';
  const { data: ytdData = [] } = useQuery({
    queryKey: ['ytd-summary', ytdYear, activeMonth],
    queryFn: () => fetchYtdSummary(ytdYear, activeMonth),
    enabled: !!ytdYear && !!activeMonth,
  });

  // Previous month data for MoM comparison
  const { data: prevMonthData = [] } = useQuery({
    queryKey: ['sales-summary', prevMonth],
    queryFn: () => fetchSalesSummary(prevMonth),
    enabled: !!prevMonth,
  });

  const ytdStats = useMemo(() => {
    const totalSales = ytdData.reduce((s, r) => s + Number(r.sales_amount || 0), 0);
    const totalPurchase = ytdData.reduce((s, r) => s + Number(r.purchase_amount || 0), 0);
    const totalNetSales = ytdData.reduce((s, r) => s + Number(r.net_sales_amount || 0), 0);
    return { totalSales, totalPurchase, totalNetSales };
  }, [ytdData]);

  const momChange = useMemo(() => {
    const curSales = salesData.reduce((s, r) => s + Number(r.sales_amount || 0), 0);
    const prevSales = prevMonthData.reduce((s, r) => s + Number(r.sales_amount || 0), 0);
    return curSales - prevSales;
  }, [salesData, prevMonthData]);

  const { rows, addRow, updateCell, markDeleted, reset, forceSync, dirtyStats, hasDirty, getChanges } = useGridEditor<SalesSummaryRow>(
    salesData,
    {
      idField: 'id',
      newRowTemplate: () => ({
        department_code: departments[0]?.department_code || '',
        month_key: activeMonth,
        total_headcount: 0,
        sales_amount: 0,
        purchase_amount: 0,
        net_sales_amount: 0,
        note: '',
        departments: null,
      } as any),
    },
  );

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);

  const columns: ColDef[] = useMemo(() => [
    { key: 'department_code', label: '부서', type: 'select', options: departments.map(d => ({ value: d.department_code, label: d.department_name })) },
    { key: 'total_headcount', label: '인원', type: 'number' },
    { key: 'sales_amount', label: '매출', type: 'number' },
    { key: 'purchase_amount', label: '매입', type: 'number' },
    { key: 'net_sales_amount', label: '순매출', type: 'number' },
    { key: 'note', label: '비고', type: 'text' },
  ], [departments]);

  const getDisplayValue = useCallback((row: GridRow<SalesSummaryRow>, col: ColDef): string => {
    const val = (row.data as any)[col.key];
    if (val == null || val === '') return '';
    if (col.type === 'select' && col.options) {
      const opt = col.options.find(o => o.value === val);
      return opt?.label || String(val);
    }
    if (col.type === 'number') return String(val);
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

  const handleAddRow = () => { addRow(); };

  const handleSave = async () => {
    const { inserts, updates, deletes } = getChanges();
    const allRows = rows.filter(r => r.status !== 'deleted');
    const seen = new Set<string>();
    for (const r of allRows) {
      const key = `${(r.data as any).month_key}__${(r.data as any).department_code}`;
      if (seen.has(key)) {
        toast.error(`같은 연월+부서 조합이 중복됩니다: ${(r.data as any).month_key} / ${(r.data as any).department_code}`);
        return;
      }
      seen.add(key);
    }

    setSaving(true);
    try {
      const uid = authUser?.id;
      if (inserts.length > 0) {
        const insertData = inserts.map(r => {
          const { id, updated_at, departments, dash_users, ...rest } = r as any;
          return { ...rest, last_modified_by_auth_user_id: uid };
        });
        const { error } = await supabase.from('department_sales_summary').insert(insertData);
        if (error) throw error;
      }
      for (const r of updates) {
        const { id, updated_at, departments, dash_users, ...rest } = r as any;
        const { error } = await supabase.from('department_sales_summary').update({ ...rest, last_modified_by_auth_user_id: uid }).eq('id', id);
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

  const renderCell = (row: GridRow<SalesSummaryRow>, col: ColDef) => {
    const val = (row.data as any)[col.key];
    const disabled = !canEdit || row.status === 'deleted';

    if (!canEdit) {
      if (col.type === 'select') {
        const opt = col.options?.find(o => o.value === val);
        return <span className="text-xs text-foreground">{opt?.label || val || '-'}</span>;
      }
      if (col.type === 'number') return <span className="text-xs text-foreground text-right block">{formatKRW(Number(val || 0))}</span>;
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
    if (col.type === 'number') {
      return (
        <input type="number" value={val ?? ''} disabled={disabled}
          onChange={(e) => updateCell(row.tempId, col.key as any, Number(e.target.value))}
          className="w-full min-w-[80px] bg-transparent px-1 py-0.5 text-xs text-foreground text-right disabled:opacity-40 focus:outline-none focus:ring-1 focus:ring-primary rounded" />
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

  if (isLoading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">사업부 BI</h1>
        <p className="mt-1 text-sm text-muted-foreground">부서별 월별 매출/매입 데이터 관리</p>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        {months.length > 0 && (
          <select value={activeMonth} onChange={(e) => setSelectedMonth(e.target.value)}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none">
            {months.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        )}
      </div>

      {/* YTD Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">누적매출 (YTD)</p>
          <p className="mt-1 text-lg font-bold text-foreground">{formatKRW(ytdStats.totalSales)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">누적매입 (YTD)</p>
          <p className="mt-1 text-lg font-bold text-foreground">{formatKRW(ytdStats.totalPurchase)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">누적순매출 (YTD)</p>
          <p className="mt-1 text-lg font-bold text-foreground">{formatKRW(ytdStats.totalNetSales)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">전월 대비 매출 증감</p>
          <div className="mt-1 flex items-center gap-1.5">
            {momChange > 0 ? <TrendingUp className="h-4 w-4 text-emerald-600" /> : momChange < 0 ? <TrendingDown className="h-4 w-4 text-red-500" /> : <Minus className="h-4 w-4 text-muted-foreground" />}
            <p className={`text-lg font-bold ${momChange > 0 ? 'text-emerald-600' : momChange < 0 ? 'text-red-500' : 'text-foreground'}`}>
              {momChange > 0 ? '+' : ''}{formatKRW(momChange)}
            </p>
          </div>
        </div>
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

      <div className="text-xs text-muted-foreground">전체 {salesData.length}건</div>

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
