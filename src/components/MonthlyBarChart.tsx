import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useYearlyMonthlySummary } from '@/hooks/useYearlyMonthlySummary';
import { formatKRWShort } from '@/data/mockData';
import { Loader2 } from 'lucide-react';

interface Props {
  year: string;
  departmentCode?: string;
  excludeDeferred?: boolean; // 탭 상태를 부모에서 받음
}

export default function MonthlyBarChart({ year, departmentCode, excludeDeferred = false }: Props) {
  const { data: rawData, isLoading } = useYearlyMonthlySummary(year, departmentCode);
  const { data: allData } = useYearlyMonthlySummary(year, undefined);

  // 이연 제외 로직
  const data = useMemo(() => {
    if (!rawData) return rawData;
    if (!excludeDeferred) return rawData; // 이연 포함: 원본 그대로

    const yearNum = Number(year);

    if (yearNum <= 2026) {
      // 2026년 이하: 1월 제외
      return rawData.filter((d) => !d.month_key.endsWith('-01'));
    } else {
      // 2027년 이상: 1월만 매출/매입 보정, 나머지는 그대로
      return rawData.map((d) => {
        if (!d.month_key.endsWith('-01')) return d;
        const adjSales = d.sales - (d.deferredSales ?? 0);
        const adjPurchase = d.purchase - (d.deferredPurchase ?? 0);
        return {
          ...d,
          sales: adjSales,
          purchase: adjPurchase,
          netSales: adjSales - adjPurchase,
        };
      });
    }
  }, [rawData, excludeDeferred, year]);

  const yDomain = useMemo<[number, number]>(() => {
    if (!data || data.length === 0) return [0, 0];
    let min = 0;
    let max = 0;
    for (const d of data) {
      min = Math.min(min, d.sales, d.purchase, d.netSales);
      max = Math.max(max, d.sales, d.purchase, d.netSales);
    }
    return [Math.min(min, 0), max * 1.1];
  }, [data]);

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
        <Bar dataKey="sales" name="매출" fill="#7DA6FF" radius={[3, 3, 0, 0]} />
        <Bar dataKey="purchase" name="매입" fill="#FF9E9E" radius={[3, 3, 0, 0]} />
        <Bar dataKey="netSales" name="순매출" fill="#7ED6B2" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
