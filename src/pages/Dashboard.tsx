import { useState, useMemo } from 'react';
import { useDashboardStats, useDeptSummary } from '@/hooks/useDashboardStats';
import { useAvailableMonths } from '@/hooks/useSalesData';
import { useTangibleAssets } from '@/hooks/useTangibleAssets';
import { useIntangibleAssets } from '@/hooks/useIntangibleAssets';
import { formatKRW, formatKRWShort } from '@/data/mockData';
import StatCard from '@/components/StatCard';
import { TrendingUp, TrendingDown, DollarSign, Briefcase, CheckCircle, AlertTriangle, Clock, Loader2, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';

type SortDir = 'asc' | 'desc' | null;

export default function Dashboard() {
  const { data: months = [] } = useAvailableMonths();
  const [selectedMonth, setSelectedMonth] = useState('');
  const activeMonth = selectedMonth || months[0] || '';

  const { data: stats, isLoading: statsLoading } = useDashboardStats(activeMonth);
  const { data: deptRows = [], isLoading: deptLoading } = useDeptSummary(activeMonth);
  const { data: tangibleAssets, isLoading: tangibleLoading } = useTangibleAssets();
  const { data: intangibleAssets, isLoading: intangibleLoading } = useIntangibleAssets();

  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);

  const handleSort = (key: string) => {
    if (sortKey !== key) { setSortKey(key); setSortDir('asc'); }
    else if (sortDir === 'asc') setSortDir('desc');
    else { setSortKey(null); setSortDir(null); }
  };

  const sortedDeptRows = useMemo(() => {
    if (!sortKey || !sortDir) return deptRows;
    return [...deptRows].sort((a, b) => {
      const aVal = (a as any)[sortKey];
      const bVal = (b as any)[sortKey];
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }
      const cmp = String(aVal ?? '').localeCompare(String(bVal ?? ''), 'ko', { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [deptRows, sortKey, sortDir]);

  const isLoading = statsLoading || tangibleLoading || intangibleLoading;

  const oldestTangible = [...(tangibleAssets || [])]
    .filter((a) => a.purchase_date)
    .sort((a, b) => new Date(a.purchase_date!).getTime() - new Date(b.purchase_date!).getTime())
    .slice(0, 10);

  const oldestIntangible = [...(intangibleAssets || [])]
    .filter((a) => a.expiry_date)
    .sort((a, b) => new Date(a.expiry_date!).getTime() - new Date(b.expiry_date!).getTime())
    .slice(0, 10);

  if (isLoading && !months.length) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const SortIcon = ({ colKey }: { colKey: string }) => {
    if (sortKey === colKey) {
      return sortDir === 'asc' ? <ArrowUp className="h-3 w-3 text-primary" /> : <ArrowDown className="h-3 w-3 text-primary" />;
    }
    return <ArrowUpDown className="h-3 w-3 opacity-30" />;
  };

  const summaryColumns = [
    { key: 'departmentName', label: '사업부명' },
    { key: 'monthlySales', label: '당월 매출' },
    { key: 'monthlyPurchase', label: '당월 매입' },
    { key: 'monthlyNetSales', label: '당월 순매출' },
    { key: 'ytdSales', label: '누적매출' },
    { key: 'ytdPurchase', label: '누적매입' },
    { key: 'ytdNetSales', label: '누적순매출' },
    { key: 'yoyChange', label: '전년동기대비' },
    { key: 'activeProjects', label: '영업 중인 건' },
    { key: 'monthlyOrders', label: '당월 수주 건' },
  ];

  return (
    <div className="space-y-8">
      {/* 헤더 영역: justify-between을 제거하고 gap을 추가하여 왼쪽으로 정렬 */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-10">
        <div>
          <h1 className="text-2xl font-bold text-foreground">대시보드</h1>
          <p className="mt-1 text-sm text-muted-foreground">CSPI 사업부 현황 요약</p>
        </div>

        {months.length > 0 && (
          <div className="flex items-center gap-3 pb-0.5">
            <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">기준 년월</span>
            <select 
              value={activeMonth} 
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none transition-colors cursor-pointer hover:border-muted-foreground/50"
            >
              {months.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard title="누적 매출" value={formatKRWShort(stats?.ytdSales ?? 0)} icon={<TrendingUp className="h-5 w-5" />} />
        <StatCard title="누적 매입" value={formatKRWShort(stats?.ytdPurchase ?? 0)} icon={<TrendingDown className="h-5 w-5" />} />
        <StatCard title="누적 순매출" value={formatKRWShort(stats?.ytdNetSales ?? 0)} icon={<DollarSign className="h-5 w-5" />} />
        <StatCard title="영업 중인 건" value={`${stats?.activeProjectCount ?? 0}건`} icon={<Briefcase className="h-5 w-5" />} />
        <StatCard title="당월 수주 건" value={`${stats?.monthlyOrderCount ?? 0}건`} icon={<CheckCircle className="h-5 w-5" />} />
      </div>

      {/* 사업부 별 실적 요약 */}
      <div className="glass-card rounded-xl p-6 animate-fade-in">
        <h2 className="text-lg font-semibold text-foreground mb-4">사업부 별 실적 요약</h2>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted">
                {summaryColumns.map(col => (
                  <th key={col.key} className="whitespace-nowrap border-r border-border/50 last:border-r-0 px-3 py-2.5 text-left font-semibold text-foreground">
                    <button onClick={() => handleSort(col.key)} className="flex items-center gap-1 hover:text-primary transition-colors">
                      {col.label} <SortIcon colKey={col.key} />
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {deptLoading ? (
                <tr><td colSpan={summaryColumns.length} className="py-8 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-primary" /></td></tr>
              ) : sortedDeptRows.length === 0 ? (
                <tr><td colSpan={summaryColumns.length} className="py-8 text-center text-muted-foreground">데이터 없음</td></tr>
              ) : sortedDeptRows.map((row) => (
                <tr key={row.departmentCode} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="border-r border-border/50 px-3 py-2 text-foreground font-medium">{row.departmentName}</td>
                  <td className="border-r border-border/50 px-3 py-2 text-right text-foreground">{formatKRWShort(row.monthlySales)}</td>
                  <td className="border-r border-border/50 px-3 py-2 text-right text-foreground">{formatKRWShort(row.monthlyPurchase)}</td>
                  <td className="border-r border-border/50 px-3 py-2 text-right text-foreground">{formatKRWShort(row.monthlyNetSales)}</td>
                  <td className="border-r border-border/50 px-3 py-2 text-right text-foreground">{formatKRWShort(row.ytdSales)}</td>
                  <td className="border-r border-border/50 px-3 py-2 text-right text-foreground">{formatKRWShort(row.ytdPurchase)}</td>
                  <td className="border-r border-border/50 px-3 py-2 text-right text-foreground">{formatKRWShort(row.ytdNetSales)}</td>
                  <td className="border-r border-border/50 px-3 py-2 text-right">
                    {row.yoyChange === null ? <span className="text-muted-foreground">-</span> : (
                      <span className={row.yoyChange > 0 ? 'text-red-500' : row.yoyChange < 0 ? 'text-blue-500' : 'text-foreground'}>
                        {row.yoyChange > 0 ? '+' : ''}{formatKRWShort(row.yoyChange)}
                      </span>
                    )}
                  </td>
                  <td className="border-r border-border/50 px-3 py-2 text-center text-foreground">{row.activeProjects}건</td>
                  <td className="px-3 py-2 text-center text-foreground">{row.monthlyOrders}건</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass-card rounded-xl p-6 animate-fade-in">
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <h2 className="text-lg font-semibold text-foreground">교체 우선순위 (유형자산)</h2>
          </div>
          <p className="mb-4 text-xs text-muted-foreground">구매일 기준 가장 오래된 자산 Top 10</p>
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="pb-3 pr-4">종류</th>
                  <th className="pb-3 pr-4">모델</th>
                  <th className="pb-3 pr-4">소속</th>
                  <th className="pb-3">구매일</th>
                </tr>
              </thead>
              <tbody>
                {oldestTangible.length === 0 ? (
                  <tr><td colSpan={4} className="py-8 text-center text-muted-foreground">데이터 없음</td></tr>
                ) : oldestTangible.map((asset) => (
                  <tr key={asset.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 pr-4 text-foreground">{asset.asset_types?.sub_category || '-'}</td>
                    <td className="py-2.5 pr-4 text-foreground">{asset.model_name || '-'}</td>
                    <td className="py-2.5 pr-4 text-muted-foreground">{asset.departments?.department_name || '-'}</td>
                    <td className="py-2.5 text-warning font-medium">{asset.purchase_date || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="glass-card rounded-xl p-6 animate-fade-in">
          <div className="mb-4 flex items-center gap-2">
            <Clock className="h-4 w-4 text-info" />
            <h2 className="text-lg font-semibold text-foreground">만료 임박 (무형자산)</h2>
          </div>
          <p className="mb-4 text-xs text-muted-foreground">만료일 기준 가장 빠른 자산 Top 10</p>
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="pb-3 pr-4">이름</th>
                  <th className="pb-3 pr-4">공급사</th>
                  <th className="pb-3 pr-4">부서</th>
                  <th className="pb-3">만료일</th>
                </tr>
              </thead>
              <tbody>
                {oldestIntangible.length === 0 ? (
                  <tr><td colSpan={4} className="py-8 text-center text-muted-foreground">데이터 없음</td></tr>
                ) : oldestIntangible.map((asset) => (
                  <tr key={asset.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 pr-4 text-foreground">{asset.license_name}</td>
                    <td className="py-2.5 pr-4 text-muted-foreground">{asset.vendor_name || '-'}</td>
                    <td className="py-2.5 pr-4 text-muted-foreground">{asset.departments?.department_name || '-'}</td>
                    <td className="py-2.5 text-info font-medium">{asset.expiry_date || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
