import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSalesData, useAvailableMonths } from '@/hooks/useSalesData';
import { fetchSalesSummary, SalesSummaryRow } from '@/services/salesService';
import { fetchActiveProjectsByDept, fetchOngoingProjectsByDept } from '@/services/businessProjectService';
import { formatKRW } from '@/data/mockData';
import { Loader2 } from 'lucide-react';

function getQuarter(monthKey: string): number {
  const m = parseInt(monthKey.split('-')[1], 10);
  return Math.ceil(m / 3);
}

function getYear(monthKey: string): string {
  return monthKey.split('-')[0];
}

export default function DepartmentBI() {
  const { data: months = [] } = useAvailableMonths();
  const [selectedMonth, setSelectedMonth] = useState<string>('');

  const activeMonth = selectedMonth || months[0] || '';
  const activeYear = activeMonth ? getYear(activeMonth) : '';

  // Current month data
  const { data: salesData = [], isLoading: salesLoading } = useSalesData(activeMonth || undefined);

  // All data for the same year (for cumulative & QoQ)
  const { data: yearData = [], isLoading: yearLoading } = useQuery({
    queryKey: ['sales-year', activeYear],
    queryFn: () => fetchSalesSummary(),
    enabled: !!activeYear,
    select: (data) => data.filter((r) => getYear(r.month_key) === activeYear),
  });

  // Project counts
  const { data: activeProjects = {}, isLoading: projLoading } = useQuery({
    queryKey: ['active-projects-by-dept'],
    queryFn: fetchActiveProjectsByDept,
  });
  const { data: ongoingProjects = {} } = useQuery({
    queryKey: ['ongoing-projects-by-dept'],
    queryFn: fetchOngoingProjectsByDept,
  });

  // Compute cumulative (YTD up to selected month) and QoQ per department
  const computed = useMemo(() => {
    if (!activeMonth || yearData.length === 0) return {};

    const result: Record<string, {
      cumSales: number; cumPurchase: number; cumNet: number; qoq: number | null;
    }> = {};

    const currentQ = getQuarter(activeMonth);

    // Group year data by department
    const byDept: Record<string, SalesSummaryRow[]> = {};
    yearData.forEach((r) => {
      if (!byDept[r.department_code]) byDept[r.department_code] = [];
      byDept[r.department_code].push(r);
    });

    Object.entries(byDept).forEach(([dept, rows]) => {
      // YTD cumulative: sum all months <= activeMonth
      const ytdRows = rows.filter((r) => r.month_key <= activeMonth);
      const cumSales = ytdRows.reduce((s, r) => s + Number(r.sales_amount), 0);
      const cumPurchase = ytdRows.reduce((s, r) => s + Number(r.purchase_amount), 0);
      const cumNet = ytdRows.reduce((s, r) => s + Number(r.net_sales_amount), 0);

      // QoQ: current quarter net vs previous quarter net
      let qoq: number | null = null;
      if (currentQ >= 2) {
        const curQRows = rows.filter((r) => getQuarter(r.month_key) === currentQ);
        const prevQRows = rows.filter((r) => getQuarter(r.month_key) === currentQ - 1);
        const curQNet = curQRows.reduce((s, r) => s + Number(r.net_sales_amount), 0);
        const prevQNet = prevQRows.reduce((s, r) => s + Number(r.net_sales_amount), 0);
        if (prevQNet !== 0) {
          qoq = ((curQNet - prevQNet) / Math.abs(prevQNet)) * 100;
        }
      }

      result[dept] = { cumSales, cumPurchase, cumNet, qoq };
    });

    return result;
  }, [activeMonth, yearData]);

  const isLoading = salesLoading || yearLoading || projLoading;

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">사업부 BI</h1>
        <p className="mt-1 text-sm text-muted-foreground">부서별 당월/누적 매출 및 프로젝트 현황</p>
      </div>

      <div className="flex flex-wrap gap-3">
        {months.length > 0 && (
          <select
            value={activeMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
          >
            {months.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        )}
      </div>

      {salesData.length === 0 ? (
        <div className="glass-card rounded-xl p-8 text-center text-muted-foreground">
          선택한 기간에 데이터가 없습니다.
        </div>
      ) : (
        <div className="glass-card overflow-hidden rounded-xl">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-foreground">부서</th>
                  <th className="whitespace-nowrap px-4 py-3 text-right font-semibold text-foreground">당월매출</th>
                  <th className="whitespace-nowrap px-4 py-3 text-right font-semibold text-foreground">당월매입</th>
                  <th className="whitespace-nowrap px-4 py-3 text-right font-semibold text-foreground">당월순매출</th>
                  <th className="whitespace-nowrap px-4 py-3 text-right font-semibold text-foreground">누적매출</th>
                  <th className="whitespace-nowrap px-4 py-3 text-right font-semibold text-foreground">누적매입</th>
                  <th className="whitespace-nowrap px-4 py-3 text-right font-semibold text-foreground">누적순매출</th>
                  <th className="whitespace-nowrap px-4 py-3 text-right font-semibold text-foreground">QoQ</th>
                  <th className="whitespace-nowrap px-4 py-3 text-right font-semibold text-foreground">영업중</th>
                  <th className="whitespace-nowrap px-4 py-3 text-right font-semibold text-foreground">진행중</th>
                </tr>
              </thead>
              <tbody>
                {salesData.map((d) => {
                  const c = computed[d.department_code];
                  return (
                    <tr key={d.department_code} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">{d.departments?.department_name || d.department_code}</td>
                      <td className="px-4 py-3 text-right text-foreground">{formatKRW(Number(d.sales_amount))}</td>
                      <td className="px-4 py-3 text-right text-foreground">{formatKRW(Number(d.purchase_amount))}</td>
                      <td className="px-4 py-3 text-right text-foreground">{formatKRW(Number(d.net_sales_amount))}</td>
                      <td className="px-4 py-3 text-right text-foreground">{formatKRW(c?.cumSales ?? 0)}</td>
                      <td className="px-4 py-3 text-right text-foreground">{formatKRW(c?.cumPurchase ?? 0)}</td>
                      <td className="px-4 py-3 text-right text-foreground">{formatKRW(c?.cumNet ?? 0)}</td>
                      <td className="px-4 py-3 text-right text-foreground">
                        {c?.qoq != null ? `${c.qoq >= 0 ? '+' : ''}${c.qoq.toFixed(1)}%` : '-'}
                      </td>
                      <td className="px-4 py-3 text-right text-foreground">{activeProjects[d.department_code] ?? 0}건</td>
                      <td className="px-4 py-3 text-right text-foreground">{ongoingProjects[d.department_code] ?? 0}건</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
