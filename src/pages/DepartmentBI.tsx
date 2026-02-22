import { useState } from 'react';
import { useSalesData, useAvailableMonths } from '@/hooks/useSalesData';
import { useDepartments } from '@/hooks/useDepartments';
import { formatKRW } from '@/data/mockData';
import { useAuth } from '@/contexts/AuthContext';
import StatCard from '@/components/StatCard';
import { Users, TrendingUp, TrendingDown, DollarSign, Loader2 } from 'lucide-react';
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

export default function DepartmentBI() {
  const { hasPermission } = useAuth();
  const { data: months = [] } = useAvailableMonths();
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedDeptCode, setSelectedDeptCode] = useState<string>('');

  // Use selected month or latest available
  const activeMonth = selectedMonth || months[0] || '';
  const { data: salesData = [], isLoading } = useSalesData(activeMonth || undefined);
  const { data: departments = [] } = useDepartments();

  const selectedSales = selectedDeptCode
    ? salesData.find((d) => d.department_code === selectedDeptCode)
    : salesData[0];

  const comparisonData = salesData
    .filter((d) => Number(d.sales_amount) > 0)
    .map((d) => ({
      name: d.departments?.department_name || d.department_code,
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">사업부 BI</h1>
        <p className="mt-1 text-sm text-muted-foreground">사업부 별 인원, 매출, 매입, 순매출 현황</p>
      </div>

      {/* Month + Department Selector */}
      <div className="flex flex-wrap gap-3">
        {months.length > 0 && (
          <select
            value={activeMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
          >
            {months.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        )}
      </div>

      {/* Department buttons */}
      <div className="flex flex-wrap gap-2">
        {salesData.map((d) => {
          const deptName = d.departments?.department_name || d.department_code;
          const isSelected = d.department_code === (selectedDeptCode || salesData[0]?.department_code);
          return (
            <button
              key={d.department_code}
              onClick={() => setSelectedDeptCode(d.department_code)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                isSelected
                  ? 'bg-primary text-primary-foreground stat-glow'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              {deptName}
            </button>
          );
        })}
      </div>

      {selectedSales && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="총원"
            value={`${selectedSales.total_headcount}명`}
            icon={<Users className="h-5 w-5" />}
          />
          <StatCard
            title="매출"
            value={formatKRW(Number(selectedSales.sales_amount))}
            icon={<TrendingUp className="h-5 w-5" />}
          />
          <StatCard
            title="매입"
            value={formatKRW(Number(selectedSales.purchase_amount))}
            icon={<TrendingDown className="h-5 w-5" />}
          />
          <StatCard
            title="순매출"
            value={formatKRW(Number(selectedSales.net_sales_amount))}
            icon={<DollarSign className="h-5 w-5" />}
          />
        </div>
      )}

      {salesData.length === 0 && (
        <div className="glass-card rounded-xl p-8 text-center text-muted-foreground">
          선택한 기간에 매출 데이터가 없습니다.
        </div>
      )}

      {comparisonData.length > 0 && (
        <div className="glass-card rounded-xl p-6">
          <h3 className="mb-4 text-lg font-semibold text-foreground">사업부 비교</h3>
          <p className="mb-4 text-xs text-muted-foreground">단위: 억원</p>
          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={comparisonData} barGap={2}>
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
    </div>
  );
}
