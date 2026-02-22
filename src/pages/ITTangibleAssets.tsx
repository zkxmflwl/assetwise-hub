import { useState } from 'react';
import { mockTangibleAssets, TangibleAsset } from '@/data/mockData';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Trash2, Search, Download } from 'lucide-react';

const columns: { key: keyof TangibleAsset; label: string; width?: string }[] = [
  { key: 'department', label: '소속' },
  { key: 'user', label: '사용자' },
  { key: 'manager', label: '관리자' },
  { key: 'type', label: '종류' },
  { key: 'manufacturer', label: '제조사' },
  { key: 'model', label: '모델' },
  { key: 'serialNumber', label: 'S/N' },
  { key: 'cpu', label: 'CPU' },
  { key: 'memory', label: 'MEM' },
  { key: 'hdd', label: 'HDD' },
  { key: 'ssd', label: 'SSD' },
  { key: 'screenSize', label: '화면크기' },
  { key: 'os', label: 'OS' },
  { key: 'purpose', label: '용도' },
  { key: 'location', label: '사용처' },
  { key: 'purchaseDate', label: '구매일' },
  { key: 'assignDate', label: '지급일' },
  { key: 'note', label: '비고' },
  { key: 'lastModifiedDate', label: '수정일' },
  { key: 'lastModifiedBy', label: '수정자' },
];

export default function ITTangibleAssets() {
  const { hasPermission } = useAuth();
  const [assets, setAssets] = useState<TangibleAsset[]>(mockTangibleAssets);
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const canEdit = hasPermission('editor');

  const departments = [...new Set(assets.map((a) => a.department))];

  const filtered = assets.filter((a) => {
    const matchSearch = search === '' || Object.values(a).some((v) => String(v).toLowerCase().includes(search.toLowerCase()));
    const matchDept = filterDept === '' || a.department === filterDept;
    return matchSearch && matchDept;
  });

  const handleDelete = (id: string) => {
    if (confirm('이 자산을 삭제하시겠습니까?')) {
      setAssets((prev) => prev.filter((a) => a.id !== id));
    }
  };

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
        <select
          value={filterDept}
          onChange={(e) => setFilterDept(e.target.value)}
          className="rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
        >
          <option value="">전체 부서</option>
          {departments.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <button className="flex items-center gap-2 rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <Download className="h-4 w-4" />
          내보내기
        </button>
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-sm text-muted-foreground">
        <span>전체: <strong className="text-foreground">{assets.length}</strong>건</span>
        <span>필터: <strong className="text-foreground">{filtered.length}</strong>건</span>
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
              {filtered.map((asset, i) => (
                <tr
                  key={asset.id}
                  className="border-b border-border/30 hover:bg-secondary/20 transition-colors"
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  {columns.map((col) => (
                    <td key={col.key} className="whitespace-nowrap px-3 py-2.5 text-foreground">
                      {asset[col.key]}
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
