import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useTangibleAssets } from '@/hooks/useTangibleAssets';
import { useIntangibleAssets } from '@/hooks/useIntangibleAssets';
import { useSalesData } from '@/hooks/useSalesData';
import { formatKRW } from '@/data/mockData';
import StatCard from '@/components/StatCard';
import { Monitor, Cloud, Users, TrendingUp, AlertTriangle, Clock, Loader2 } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: tangibleAssets, isLoading: tangibleLoading } = useTangibleAssets();
  const { data: intangibleAssets, isLoading: intangibleLoading } = useIntangibleAssets();
  const { data: salesData, isLoading: salesLoading } = useSalesData();

  const isLoading = statsLoading || tangibleLoading || intangibleLoading || salesLoading;

  // Top 10 oldest tangible assets
  const oldestTangible = [...(tangibleAssets || [])]
    .filter((a) => a.purchase_date)
    .sort((a, b) => new Date(a.purchase_date!).getTime() - new Date(b.purchase_date!).getTime())
    .slice(0, 10);

  // Top 10 nearest expiry intangible assets
  const oldestIntangible = [...(intangibleAssets || [])]
    .filter((a) => a.expiry_date)
    .sort((a, b) => new Date(a.expiry_date!).getTime() - new Date(b.expiry_date!).getTime())
    .slice(0, 10);

  // Chart data from sales summary
  const chartData = (salesData || [])
    .filter((d) => Number(d.sales_amount) > 0)
    .map((d) => ({
      name: d.departments?.department_name || d.department_code,
      인원: d.total_headcount,
      매출: Number(d.sales_amount) / 100000000,
      매입: Number(d.purchase_amount) / 100000000,
      순매출: Number(d.net_sales_amount) / 100000000,
    }));

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">대시보드</h1>
        <p className="mt-1 text-sm text-muted-foreground">전사 자산 및 사업부 현황 요약</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="유형자산" value={`${stats?.tangibleCount ?? 0}건`} icon={<Monitor className="h-5 w-5" />} />
        <StatCard title="무형자산" value={`${stats?.intangibleCount ?? 0}건`} icon={<Cloud className="h-5 w-5" />} />
        <StatCard title="전사 인원" value={`${stats?.totalHeadcount ?? 0}명`} icon={<Users className="h-5 w-5" />} />
        <StatCard title="전사 순매출" value={formatKRW(stats?.totalNetSales ?? 0)} icon={<TrendingUp className="h-5 w-5" />} />
      </div>

      {chartData.length > 0 && (
        <div className="glass-card rounded-xl p-6 animate-fade-in">
          <h2 className="mb-4 text-lg font-semibold text-foreground">사업부 별 매출/매입/순매출 비교</h2>
          <p className="mb-6 text-xs text-muted-foreground">단위: 억원</p>
          <ResponsiveContainer width="100%" height={360}>
            <BarChart data={chartData} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 30% 18%)" />
              <XAxis dataKey="name" tick={{ fill: 'hsl(215 20% 55%)', fontSize: 12 }} />
              <YAxis tick={{ fill: 'hsl(215 20% 55%)', fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  background: 'hsl(222 41% 10%)',
                  border: '1px solid hsl(222 30% 20%)',
                  borderRadius: '8px',
                  color: 'hsl(210 40% 96%)',
                }}
                formatter={(value: number) => `${value.toFixed(1)}억`}
              />
              <Legend wrapperStyle={{ color: 'hsl(215 20% 55%)' }} />
              <Bar dataKey="매출" fill="hsl(187 86% 43%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="매입" fill="hsl(38 92% 50%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="순매출" fill="hsl(152 69% 41%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

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
                  <th className="pb-3 pr-4">사용자</th>
                  <th className="pb-3 pr-4">소속</th>
                  <th className="pb-3">구매일</th>
                </tr>
              </thead>
              <tbody>
                {oldestTangible.length === 0 ? (
                  <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">데이터 없음</td></tr>
                ) : oldestTangible.map((asset) => (
                  <tr key={asset.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                    <td className="py-2.5 pr-4 text-foreground">{asset.asset_types?.sub_category || '-'}</td>
                    <td className="py-2.5 pr-4 text-foreground">{asset.model_name || '-'}</td>
                    <td className="py-2.5 pr-4 text-muted-foreground">{asset.user_name || '-'}</td>
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
                  <tr key={asset.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
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
