import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useYearlyMonthlySummary } from '@/hooks/useYearlyMonthlySummary';
import { formatKRWShort } from '@/data/mockData';
import { Loader2 } from 'lucide-react';

interface Props {
  year: string;
  departmentCode?: string;
}

export default function MonthlyBarChart({ year, departmentCode }: Props) {
  const { data, isLoading } = useYearlyMonthlySummary(year, departmentCode);
  const { data: allData } = useYearlyMonthlySummary(year, undefined);

  const yDomain = useMemo<[number, number]>(() => {
    if (!allData || allData.length === 0) return [0, 0];
    let min = 0;
    let max = 0;
    for (const d of allData) {
      min = Math.min(min, d.sales, d.purchase, d.netSales);
      max = Math.max(max, d.sales, d.purchase, d.netSales);
    }
    return [Math.min(min, 0), max * 1.1];
  }, [allData]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">데이터 없음</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
        <YAxis
          domain={yDomain}
          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          tickFormatter={(v: number) => formatKRWShort(v)}
          width={70}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            fontSize: '12px',
          }}
          formatter={(value: number, name: string) => [formatKRWShort(value), name]}
        />
        <Legend wrapperStyle={{ fontSize: '12px' }} />
        <Bar dataKey="sales" name="매출" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
        <Bar dataKey="purchase" name="매입" fill="hsl(var(--destructive))" radius={[3, 3, 0, 0]} />
        <Bar dataKey="netSales" name="순매출" fill="hsl(var(--accent))" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
