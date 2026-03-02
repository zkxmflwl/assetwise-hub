import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSalesData, useAvailableMonths } from '@/hooks/useSalesData';
import { fetchSalesSummary, SalesSummaryRow } from '@/services/salesService';
import { fetchActiveProjectsByDept, fetchOngoingProjectsByDept } from '@/services/businessProjectService';
import { formatKRW } from '@/data/mockData';
import { Loader2, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';

type SortDir = 'asc' | 'desc' | null;

function getQuarter(monthKey: string): number {
  const m = parseInt(monthKey.split('-')[1], 10);
  return Math.ceil(m / 3);
}

function getYear(monthKey: string): string {
  return monthKey.split('-')[0];
}

export default function DepartmentBIView() {
  const { data: months = [] } = useAvailableMonths();
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);

  const activeMonth = selectedMonth || months[0] || '';
  const activeYear = activeMonth ? getYear(activeMonth) : '';

  const { data: salesData = [], isLoading: salesLoading } = useSalesData(activeMonth || undefined);

  const { data: yearData = [], isLoading: yearLoading } = useQuery({
    queryKey: ['sales-year', activeYear],
    queryFn: () => fetchSalesSummary(),
    enabled: !!activeYear,
    select: (data) => data.filter((r) => getYear(r.month_key) === activeYear),
  });

  const { data: activeProjects = {}, isLoading: projLoading } = useQuery({
    queryKey: ['active-projects-by-dept'],
    queryFn: fetchActiveProjectsByDept,
  });
  const { data: ongoingProjects = {} } = useQuery({
    queryKey: ['ongoing-projects-by-dept'],
    queryFn: fetchOngoingProjectsByDept,
  });

  const computed = useMemo(() => {
    if (!activeMonth || yearData.length === 0) return {};
    const result: Record<string, { cumSales: number; cumPurchase: number; cumNet: number; qoq: number | null }> = {};
    const currentQ = getQuarter(activeMonth);
    const byDept: Record<string, SalesSummaryRow[]> = {};
    yearData.forEach((r) => {
      if (!byDept[r.department_code]) byDept[r.department_code] = [];
      byDept[r.department_code].push(r);
    });
    Object.entries(byDept).forEach(([dept, rows]) => {
      const ytdRows = rows.filter((r) => r.month_key <= activeMonth);
      const cumSales = ytdRows.reduce((s, r) => s + Number(r.sales_amount), 0);
      const cumPurchase = ytdRows.reduce((s, r) => s + Number(r.purchase_amount), 0);
      const cumNet = ytdRows.reduce((s, r) => s + Number(r.net_sales_amount), 0);
      let qoq: number | null = null;
      if (currentQ >= 2) {
        const curQRows = rows.filter((r) => getQuarter(r.month_key) === currentQ);
        const prevQRows = rows.filter((r) => getQuarter(r.month_key) === currentQ - 1);
        const curQNet = curQRows.reduce((s, r) => s + Number(r.net_sales_amount), 0);
        const prevQNet = prevQRows.reduce((s, r) => s + Number(r.net_sales_amount), 0);
        if (prevQNet !== 0) qoq = ((curQNet - prevQNet) / Math.abs(prevQNet)) * 100;
      }
      result[dept] = { cumSales, cumPurchase, cumNet, qoq };
    });
    return result;
  }, [activeMonth, yearData]);

  const columnDefs = [
    { key: 'dept', label: '부서' },
    { key: 'sales', label: '당월매출' },
    { key: 'purchase', label: '당월매입' },
    { key: 'net', label: '당월순매출' },
    { key: 'cumSales', label: '누적매출' },
    { key: 'cumPurchase', label: '누적매입' },
    { key: 'cumNet', label: '누적순매출' },
    { key: 'qoq', label: 'QoQ' },
    { key: 'active', label: '영업중' },
    { key: 'ongoing', label: '진행중' },
  ];

  const tableRows = useMemo(() => {
    let rows = salesData.map((d) => {
      const c = computed[d.department_code];
      return {
        key: d.department_code,
        dept: d.departments?.department_name || d.department_code,
        sales: Number(d.sales_amount),
        purchase: Number(d.purchase_amount),
        net: Number(d.net_sales_amount),
        cumSales: c?.cumSales ?? 0,
        cumPurchase: c?.cumPurchase ?? 0,
        cumNet: c?.cumNet ?? 0,
        qoq: c?.qoq,
        active: activeProjects[d.department_code] ?? 0,
        ongoing: ongoingProjects[d.department_code] ?? 0,
      };
    });
    if (sortKey && sortDir) {
      rows = [...rows].sort((a, b) => {
        const aVal = (a as any)[sortKey];
        const bVal = (b as any)[sortKey];
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
        }
        const cmp = String(aVal ?? '').localeCompare(String(bVal ?? ''), 'ko', { numeric: true });
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }
    return rows;
  }, [salesData, computed, activeProjects, ongoingProjects, sortKey, sortDir]);

  const handleSort = (key: string) => {
    if (sortKey !== key) { setSortKey(key); setSortDir('asc'); }
    else if (sortDir === 'asc') setSortDir('desc');
    else { setSortKey(null); setSortDir(null); }
  };

  const isLoading = salesLoading || yearLoading || projLoading;
  if (isLoading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">사업부 BI</h1>
        <p className="mt-1 text-sm text-muted-foreground">부서별 당월/누적 매출 및 프로젝트 현황</p>
      </div>

      <div className="flex flex-wrap gap-3">
        {months.length > 0 && (
          <select value={activeMonth} onChange={(e) => setSelectedMonth(e.target.value)}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none">
            {months.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        )}
      </div>

      {tableRows.length === 0 ? (
        <div className="glass-card rounded-xl p-8 text-center text-muted-foreground">선택한 기간에 데이터가 없습니다.</div>
      ) : (
        <div className="glass-card overflow-hidden rounded-xl">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted">
                  {columnDefs.map(col => (
                    <th key={col.key} className="whitespace-nowrap border-r border-border/50 last:border-r-0 px-4 py-3 text-left font-semibold text-foreground">
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
                {tableRows.map((r) => (
                  <tr key={r.key} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="border-r border-border/50 px-4 py-3 font-medium text-foreground">{r.dept}</td>
                    <td className="border-r border-border/50 px-4 py-3 text-right text-foreground">{formatKRW(r.sales)}</td>
                    <td className="border-r border-border/50 px-4 py-3 text-right text-foreground">{formatKRW(r.purchase)}</td>
                    <td className="border-r border-border/50 px-4 py-3 text-right text-foreground">{formatKRW(r.net)}</td>
                    <td className="border-r border-border/50 px-4 py-3 text-right text-foreground">{formatKRW(r.cumSales)}</td>
                    <td className="border-r border-border/50 px-4 py-3 text-right text-foreground">{formatKRW(r.cumPurchase)}</td>
                    <td className="border-r border-border/50 px-4 py-3 text-right text-foreground">{formatKRW(r.cumNet)}</td>
                    <td className="border-r border-border/50 px-4 py-3 text-right text-foreground">
                      {r.qoq != null ? `${r.qoq >= 0 ? '+' : ''}${r.qoq.toFixed(1)}%` : '-'}
                    </td>
                    <td className="border-r border-border/50 px-4 py-3 text-right text-foreground">{r.active}건</td>
                    <td className="px-4 py-3 text-right text-foreground">{r.ongoing}건</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
