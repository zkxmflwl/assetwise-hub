import { useDashboardStats } from '@/hooks/useDashboardStats';
import { formatKRW } from '@/data/mockData';
import StatCard from '@/components/StatCard';
import { TrendingUp, TrendingDown, DollarSign, Briefcase, CheckCircle, Loader2 } from 'lucide-react';

export default function Dashboard() {
  const { data: stats, isLoading } = useDashboardStats();

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
        <p className="mt-1 text-sm text-muted-foreground">CSPI 사업부 현황 요약</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard title="누적 CSPI 매출" value={formatKRW(stats?.cumulativeSales ?? 0)} icon={<TrendingUp className="h-5 w-5" />} />
        <StatCard title="누적 CSPI 매입" value={formatKRW(stats?.cumulativePurchase ?? 0)} icon={<TrendingDown className="h-5 w-5" />} />
        <StatCard title="누적 CSPI 순매출" value={formatKRW(stats?.cumulativeNetSales ?? 0)} icon={<DollarSign className="h-5 w-5" />} />
        <StatCard title="영업 중 프로젝트" value={`${stats?.activeProjectCount ?? 0}건`} icon={<Briefcase className="h-5 w-5" />} />
        <StatCard title="올해 수주 완료" value={`${stats?.yearlyCompletedOrderCount ?? 0}건`} icon={<CheckCircle className="h-5 w-5" />} />
      </div>
    </div>
  );
}
