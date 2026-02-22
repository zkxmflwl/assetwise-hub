import { useState } from 'react';
import { useTangibleAssets } from '@/hooks/useTangibleAssets';
import { useDepartments } from '@/hooks/useDepartments';
import { useAuth } from '@/contexts/AuthContext';
import { TangibleAssetRow } from '@/services/assetService';
import { Plus, Trash2, Search, Download, Loader2 } from 'lucide-react';

const columns: { key: keyof TangibleAssetRow | 'dept_name' | 'type_name' | 'modifier_name'; label: string; getter: (a: TangibleAssetRow) => string }[] = [
  { key: 'dept_name', label: '소속', getter: (a) => a.departments?.department_name || '-' },
  { key: 'user_name', label: '사용자', getter: (a) => a.user_name || '-' },
  { key: 'manager_name', label: '관리자', getter: (a) => a.manager_name || '-' },
  { key: 'type_name', label: '종류', getter: (a) => a.asset_types?.sub_category || '-' },
  { key: 'manufacturer', label: '제조사', getter: (a) => a.manufacturer || '-' },
  { key: 'model_name', label: '모델', getter: (a) => a.model_name || '-' },
  { key: 'serial_no', label: 'S/N', getter: (a) => a.serial_no || '-' },
  { key: 'cpu_spec', label: 'CPU', getter: (a) => a.cpu_spec || '-' },
  { key: 'mem_spec', label: 'MEM', getter: (a) => a.mem_spec || '-' },
  { key: 'hdd_spec', label: 'HDD', getter: (a) => a.hdd_spec || '-' },
  { key: 'ssd_spec', label: 'SSD', getter: (a) => a.ssd_spec || '-' },
  { key: 'screen_size', label: '화면크기', getter: (a) => a.screen_size || '-' },
  { key: 'os_name', label: 'OS', getter: (a) => a.os_name || '-' },
  { key: 'purpose', label: '용도', getter: (a) => a.purpose || '-' },
  { key: 'usage_location', label: '사용처', getter: (a) => a.usage_location || '-' },
  { key: 'purchase_date', label: '구매일', getter: (a) => a.purchase_date || '-' },
  { key: 'issued_date', label: '지급일', getter: (a) => a.issued_date || '-' },
  { key: 'note', label: '비고', getter: (a) => a.note || '-' },
  { key: 'updated_at', label: '수정일', getter: (a) => a.updated_at ? new Date(a.updated_at).toLocaleDateString('ko-KR') : '-' },
  { key: 'modifier_name', label: '수정자', getter: (a) => a.dash_users?.user_name || '-' },
];

export default function ITTangibleAssets() {
  const { hasPermission } = useAuth();
  const { data: assets = [], isLoading, error } = useTangibleAssets();
  const { data: departments = [] } = useDepartments();
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const canEdit = hasPermission('editor');

  const filtered = assets.filter((a) => {
    const matchSearch = search === '' || columns.some((col) => col.getter(a).toLowerCase().includes(search.toLowerCase()));
    const matchDept = filterDept === '' || a.department_code === filterDept;
    return matchSearch && matchDept;
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2 text-destructive">
        <p>데이터를 불러오는 중 오류가 발생했습니다.</p>
        <button onClick={() => window.location.reload()} className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground">재시도</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">IT 유형자산</h1>
          <p className="mt-1 text-sm text-muted-foreground">노트북, 모니터, PC 등 IT 유형자산 관리</p>
        </div>
        {canEdit && (
          <button className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity">
            <Plus className="h-4 w-4" />
            자산 추가
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="검색..."
            className="w-full rounded-lg border border-border bg-secondary/50 py-2 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
          />
        </div>
        <select
          value={filterDept}
          onChange={(e) => setFilterDept(e.target.value)}
          className="rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
        >
          <option value="">전체 부서</option>
          {departments.map((d) => (
            <option key={d.department_code} value={d.department_code}>{d.department_name}</option>
          ))}
        </select>
        <button className="flex items-center gap-2 rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <Download className="h-4 w-4" />
          내보내기
        </button>
      </div>

      <div className="flex gap-4 text-sm text-muted-foreground">
        <span>전체: <strong className="text-foreground">{assets.length}</strong>건</span>
        <span>필터: <strong className="text-foreground">{filtered.length}</strong>건</span>
      </div>

      <div className="glass-card overflow-hidden rounded-xl">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                {columns.map((col) => (
                  <th key={col.key} className="whitespace-nowrap px-3 py-3 text-left text-xs font-medium text-muted-foreground">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={columns.length} className="py-8 text-center text-muted-foreground">데이터 없음</td></tr>
              ) : filtered.map((asset, i) => (
                <tr
                  key={asset.id}
                  className="border-b border-border/30 hover:bg-secondary/20 transition-colors"
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  {columns.map((col) => (
                    <td key={col.key} className="whitespace-nowrap px-3 py-2.5 text-foreground">
                      {col.getter(asset)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
