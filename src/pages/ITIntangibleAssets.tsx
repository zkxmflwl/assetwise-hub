import { useState } from 'react';
import { mockIntangibleAssets, IntangibleAsset, formatKRW } from '@/data/mockData';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Trash2, Search, Download } from 'lucide-react';

const columns: { key: keyof IntangibleAsset; label: string; format?: (v: any) => string }[] = [
  { key: 'name', label: '자산명' },
  { key: 'type', label: '유형' },
  { key: 'vendor', label: '공급사' },
  { key: 'licenseKey', label: '라이선스키' },
  { key: 'purchaseDate', label: '구매일' },
  { key: 'expiryDate', label: '만료일' },
  { key: 'assignedTo', label: '사용 대상' },
  { key: 'department', label: '부서' },
  { key: 'cost', label: '비용', format: (v: number) => formatKRW(v) },
  { key: 'status', label: '상태' },
  { key: 'note', label: '비고' },
  { key: 'lastModifiedDate', label: '수정일' },
  { key: 'lastModifiedBy', label: '수정자' },
];

export default function ITIntangibleAssets() {
  const { hasPermission } = useAuth();
  const [assets, setAssets] = useState<IntangibleAsset[]>(mockIntangibleAssets);
  const [search, setSearch] = useState('');
  const canEdit = hasPermission('editor');

  const filtered = assets.filter((a) =>
    search === '' || Object.values(a).some((v) => String(v).toLowerCase().includes(search.toLowerCase()))
  );

  const handleDelete = (id: string) => {
    if (confirm('이 자산을 삭제하시겠습니까?')) {
      setAssets((prev) => prev.filter((a) => a.id !== id));
    }
  };

  const totalCost = assets.reduce((sum, a) => sum + a.cost, 0);
  const activeCount = assets.filter((a) => a.status === '활성').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">IT 무형자산</h1>
          <p className="mt-1 text-sm text-muted-foreground">소프트웨어, 라이선스, SaaS 등 무형자산 관리</p>
        </div>
        {canEdit && (
          <button className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity">
            <Plus className="h-4 w-4" />
            자산 추가
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="glass-card rounded-xl p-4">
          <p className="text-sm text-muted-foreground">전체 자산</p>
          <p className="mt-1 text-xl font-bold text-foreground">{assets.length}건</p>
        </div>
        <div className="glass-card rounded-xl p-4">
          <p className="text-sm text-muted-foreground">활성 자산</p>
          <p className="mt-1 text-xl font-bold text-success">{activeCount}건</p>
        </div>
        <div className="glass-card rounded-xl p-4">
          <p className="text-sm text-muted-foreground">총 비용</p>
          <p className="mt-1 text-xl font-bold text-foreground">{formatKRW(totalCost)}</p>
        </div>
      </div>

      {/* Filters */}
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
        <button className="flex items-center gap-2 rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <Download className="h-4 w-4" />
          내보내기
        </button>
      </div>

      {/* Table */}
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
                {canEdit && <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground">작업</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((asset) => (
                <tr key={asset.id} className="border-b border-border/30 hover:bg-secondary/20 transition-colors">
                  {columns.map((col) => (
                    <td key={col.key} className="whitespace-nowrap px-3 py-2.5 text-foreground">
                      {col.key === 'status' ? (
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          asset.status === '활성' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
                        }`}>
                          {asset.status}
                        </span>
                      ) : col.format ? col.format(asset[col.key]) : String(asset[col.key])}
                    </td>
                  ))}
                  {canEdit && (
                    <td className="px-3 py-2.5">
                      <button
                        onClick={() => handleDelete(asset.id)}
                        className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
