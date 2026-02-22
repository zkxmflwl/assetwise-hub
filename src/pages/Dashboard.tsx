import {
  mockTangibleAssets,
  mockIntangibleAssets,
  mockDepartments,
  formatKRW,
} from '@/data/mockData';
import StatCard from '@/components/StatCard';
import { Monitor, Cloud, Users, TrendingUp, AlertTriangle, Clock } from 'lucide-react';
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
  // Top 10 oldest tangible assets
  const oldestTangible = [...mockTangibleAssets]
    .sort((a, b) => new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime())
    .slice(0, 10);

  // Top 10 oldest (nearest expiry) intangible assets
  const oldestIntangible = [...mockIntangibleAssets]
    .filter((a) => a.expiryDate !== '-')
    .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime())
    .slice(0, 10);

  const totalMembers = mockDepartments.reduce((sum, d) => sum + d.totalMembers, 0);
  const totalRevenue = mockDepartments.reduce((sum, d) => sum + d.revenue, 0);
  const totalNetRevenue = mockDepartments.reduce((sum, d) => sum + d.netRevenue, 0);

  const chartData = mockDepartments
    .filter((d) => d.revenue > 0)
    .map((d) => ({
      name: d.name,
      인원: d.totalMembers,
      매출: d.revenue / 100000000,
      매입: d.cost / 100000000,
      순매출: d.netRevenue / 100000000,
    }));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">대시보드</h1>
        <p className="mt-1 text-sm text-muted-foreground">전사 자산 및 사업부 현황 요약</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="유형자산" value={`${mockTangibleAssets.length}건`} icon={<Monitor className="h-5 w-5" />} />
        <StatCard title="무형자산" value={`${mockIntangibleAssets.length}건`} icon={<Cloud className="h-5 w-5" />} />
        <StatCard title="전사 인원" value={`${totalMembers}명`} icon={<Users className="h-5 w-5" />} />
        <StatCard title="전사 순매출" value={formatKRW(totalNetRevenue)} icon={<TrendingUp className="h-5 w-5" />} />
      </div>

      {/* Chart */}
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

      {/* Two tables side by side */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Oldest Tangible */}
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
                {oldestTangible.map((asset) => (
                  <tr key={asset.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                    <td className="py-2.5 pr-4 text-foreground">{asset.type}</td>
                    <td className="py-2.5 pr-4 text-foreground">{asset.model}</td>
                    <td className="py-2.5 pr-4 text-muted-foreground">{asset.user}</td>
                    <td className="py-2.5 pr-4 text-muted-foreground">{asset.department}</td>
                    <td className="py-2.5 text-warning font-medium">{asset.purchaseDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Oldest Intangible */}
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
                  <th className="pb-3 pr-4">상태</th>
                  <th className="pb-3">만료일</th>
                </tr>
              </thead>
              <tbody>
                {oldestIntangible.map((asset) => (
                  <tr key={asset.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                    <td className="py-2.5 pr-4 text-foreground">{asset.name}</td>
                    <td className="py-2.5 pr-4 text-muted-foreground">{asset.vendor}</td>
                    <td className="py-2.5 pr-4 text-muted-foreground">{asset.department}</td>
                    <td className="py-2.5 pr-4">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        asset.status === '활성' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
                      }`}>
                        {asset.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-info font-medium">{asset.expiryDate}</td>
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
