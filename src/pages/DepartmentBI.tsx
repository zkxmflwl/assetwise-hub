import { useState } from 'react';
import { mockDepartments, formatKRW, DEPARTMENTS } from '@/data/mockData';
import { useAuth } from '@/contexts/AuthContext';
import StatCard from '@/components/StatCard';
import { Users, TrendingUp, TrendingDown, DollarSign, Plus, Trash2 } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const COLORS = [
  'hsl(187 86% 43%)',
  'hsl(152 69% 41%)',
  'hsl(38 92% 50%)',
  'hsl(271 81% 56%)',
];
const LABELS = ['SI', 'SM', '라이선스', '유지보수'];

export default function DepartmentBI() {
  const { hasPermission } = useAuth();
  const [departments, setDepartments] = useState(mockDepartments);
  const [selectedDept, setSelectedDept] = useState(departments[1]?.name || '');
  const isMaster = hasPermission('master');

  const dept = departments.find((d) => d.name === selectedDept);

  const handleDeleteDept = (name: string) => {
    if (confirm(`"${name}" 부서를 삭제하시겠습니까?`)) {
      setDepartments((prev) => prev.filter((d) => d.name !== name));
      if (selectedDept === name) {
        setSelectedDept(departments.filter((d) => d.name !== name)[0]?.name || '');
      }
    }
  };

  const revenuePieData = dept
    ? [
        { name: 'SI', value: dept.revenueBreakdown.si },
        { name: 'SM', value: dept.revenueBreakdown.sm },
        { name: '라이선스', value: dept.revenueBreakdown.license },
        { name: '유지보수', value: dept.revenueBreakdown.maintenance },
      ]
    : [];

  const costPieData = dept
    ? [
        { name: 'SI', value: dept.costBreakdown.si },
        { name: 'SM', value: dept.costBreakdown.sm },
        { name: '라이선스', value: dept.costBreakdown.license },
        { name: '유지보수', value: dept.costBreakdown.maintenance },
      ]
    : [];

  const netPieData = dept
    ? [
        { name: 'SI', value: dept.revenueBreakdown.si - dept.costBreakdown.si },
        { name: 'SM', value: dept.revenueBreakdown.sm - dept.costBreakdown.sm },
        { name: '라이선스', value: dept.revenueBreakdown.license - dept.costBreakdown.license },
        { name: '유지보수', value: dept.revenueBreakdown.maintenance - dept.costBreakdown.maintenance },
      ]
    : [];

  const comparisonData = departments
    .filter((d) => d.revenue > 0)
    .map((d) => ({
      name: d.name,
      매출: d.revenue / 100000000,
      매입: d.cost / 100000000,
      순매출: d.netRevenue / 100000000,
    }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">사업부 BI</h1>
          <p className="mt-1 text-sm text-muted-foreground">사업부 별 인원, 매출, 매입, 순매출 현황</p>
        </div>
        {isMaster && (
          <button className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity">
            <Plus className="h-4 w-4" />
            부서 추가
          </button>
        )}
      </div>

      {/* Department Selector */}
      <div className="flex flex-wrap gap-2">
        {departments.map((d) => (
          <div key={d.name} className="flex items-center gap-1">
            <button
              onClick={() => setSelectedDept(d.name)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                selectedDept === d.name
                  ? 'bg-primary text-primary-foreground stat-glow'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              {d.name}
            </button>
            {isMaster && (
              <button
                onClick={() => handleDeleteDept(d.name)}
                className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}
      </div>

      {dept && (
        <>
          {/* Stats */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="총원"
              value={`${dept.totalMembers}명`}
              change={dept.monthlyChange}
              changeLabel="전월대비"
              icon={<Users className="h-5 w-5" />}
            />
            <StatCard
              title="매출"
              value={formatKRW(dept.revenue)}
              icon={<TrendingUp className="h-5 w-5" />}
            />
            <StatCard
              title="매입"
              value={formatKRW(dept.cost)}
              icon={<TrendingDown className="h-5 w-5" />}
            />
            <StatCard
              title="순매출"
              value={formatKRW(dept.netRevenue)}
              icon={<DollarSign className="h-5 w-5" />}
            />
          </div>

          {/* Team breakdown */}
          <div className="glass-card rounded-xl p-6">
            <h3 className="mb-4 text-lg font-semibold text-foreground">팀 별 인원</h3>
            <div className="flex flex-wrap gap-3">
              {dept.teams.map((team) => (
                <div key={team.name} className="rounded-lg bg-secondary px-4 py-3">
                  <p className="text-xs text-muted-foreground">{team.name}</p>
                  <p className="text-lg font-bold text-foreground">{team.count}명</p>
                </div>
              ))}
            </div>
          </div>

          {/* Pie Charts */}
          <div className="grid gap-6 lg:grid-cols-3">
            {[
              { title: '매출 구성', data: revenuePieData },
              { title: '매입 구성', data: costPieData },
              { title: '순매출 구성', data: netPieData },
            ].map(({ title, data }) => (
              <div key={title} className="glass-card rounded-xl p-6">
                <h3 className="mb-4 text-base font-semibold text-foreground">{title}</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={data}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      dataKey="value"
                      stroke="none"
                    >
                      {data.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: 'hsl(222 41% 10%)',
                        border: '1px solid hsl(222 30% 20%)',
                        borderRadius: '8px',
                        color: 'hsl(210 40% 96%)',
                      }}
                      formatter={(value: number) => formatKRW(value)}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-2 flex flex-wrap justify-center gap-3">
                  {LABELS.map((label, i) => (
                    <div key={label} className="flex items-center gap-1.5">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i] }} />
                      <span className="text-xs text-muted-foreground">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Comparison chart */}
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
    </div>
  );
}
