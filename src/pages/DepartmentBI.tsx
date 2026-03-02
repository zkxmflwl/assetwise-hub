import { useState } from 'react';
import { useSalesData, useAvailableMonths } from '@/hooks/useSalesData';
import { formatKRW } from '@/data/mockData';
import { Loader2 } from 'lucide-react';

export default function DepartmentBI() {
  const { data: months = [] } = useAvailableMonths();
  const [selectedMonth, setSelectedMonth] = useState<string>('');

  const activeMonth = selectedMonth || months[0] || '';
  const { data: salesData = [], isLoading } = useSalesData(activeMonth || undefined);

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
        <p className="mt-1 text-sm text-muted-foreground">부서별 당월 매출 현황</p>
      </div>

      {/* Month Selector */}
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
                  <th className="whitespace-nowrap px-4 py-3 text-right font-semibold text-foreground">인원</th>
                  <th className="whitespace-nowrap px-4 py-3 text-right font-semibold text-foreground">당월매출</th>
                  <th className="whitespace-nowrap px-4 py-3 text-right font-semibold text-foreground">당월매입</th>
                  <th className="whitespace-nowrap px-4 py-3 text-right font-semibold text-foreground">당월순매출</th>
                  <th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-foreground">비고</th>
                </tr>
              </thead>
              <tbody>
                {salesData.map((d) => (
                  <tr key={d.department_code} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{d.departments?.department_name || d.department_code}</td>
                    <td className="px-4 py-3 text-right text-foreground">{d.total_headcount}명</td>
                    <td className="px-4 py-3 text-right text-foreground">{formatKRW(Number(d.sales_amount))}</td>
                    <td className="px-4 py-3 text-right text-foreground">{formatKRW(Number(d.purchase_amount))}</td>
                    <td className="px-4 py-3 text-right text-foreground">{formatKRW(Number(d.net_sales_amount))}</td>
                    <td className="px-4 py-3 text-muted-foreground">{d.note || '-'}</td>
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
