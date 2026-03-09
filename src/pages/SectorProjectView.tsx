import { useState, useMemo, useEffect } from 'react';
import { useSectorProjects } from '@/hooks/useSectorProjects';
import { useDepartments } from '@/hooks/useDepartments';
import { SectorProjectRow } from '@/services/sectorProjectService';
import { Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useLocation } from 'react-router-dom';

export default function SectorProjectView() {
  const { data: projects = [], isLoading: projectsLoading } = useSectorProjects();
  const { data: departments = [], isLoading: deptsLoading } = useDepartments();
  const location = useLocation();

  // Active tab: null = initial split view, string = sector_code for detail
  const [activeTab, setActiveTab] = useState<string | null>(null);

  // Reset to initial state on every navigation to this page
  useEffect(() => {
    setActiveTab(null);
  }, [location.key]);

  // Unique sectors sorted by sector_name
  const sectors = useMemo(() => {
    const map = new Map<string, string>();
    departments.forEach(d => {
      if (d.sector_code && d.sector_name && !map.has(d.sector_code)) {
        map.set(d.sector_code, d.sector_name);
      }
    });
    return Array.from(map.entries())
      .map(([code, name]) => ({ code, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  }, [departments]);

  const sector1 = sectors[0] || null;
  const sector2 = sectors[1] || null;

  // Group projects by sector
  const projectsBySector = useMemo(() => {
    const map: Record<string, SectorProjectRow[]> = {};
    projects.forEach(p => {
      if (!map[p.sector_code]) map[p.sector_code] = [];
      map[p.sector_code].push(p);
    });
    return map;
  }, [projects]);

  const isLoading = projectsLoading || deptsLoading;

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (sectors.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-foreground">부문 프로젝트 현황</h1>
        <div className="flex h-40 items-center justify-center text-muted-foreground">등록된 부문이 없습니다.</div>
      </div>
    );
  }

  const getDeptName = (code: string) => {
    const d = departments.find(dep => dep.department_code === code);
    return d?.department_name || code;
  };

  const renderSummaryGrid = (sectorCode: string, sectorName: string) => {
    const items = projectsBySector[sectorCode] || [];
    return (
      <div className="flex-1 min-w-0">
        <h3 className="mb-3 text-sm font-semibold text-foreground">{sectorName}</h3>
        {items.length === 0 ? (
          <div className="flex h-24 items-center justify-center rounded-lg border border-border bg-card text-xs text-muted-foreground">프로젝트 없음</div>
        ) : (
          <div className="glass-card overflow-hidden rounded-xl">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted">
                  <th className="px-3 py-2 text-left font-semibold text-foreground">프로젝트명</th>
                  <th className="px-3 py-2 text-left font-semibold text-foreground">담당자</th>
                </tr>
              </thead>
              <tbody>
                {items.map(p => (
                  <tr key={p.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="px-3 py-1.5 text-foreground">{p.sector_project_name}</td>
                    <td className="px-3 py-1.5 text-foreground">{p.user_name || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  const renderDetailCards = (sectorCode: string) => {
    const items = projectsBySector[sectorCode] || [];
    if (items.length === 0) {
      return <div className="flex h-40 items-center justify-center text-muted-foreground">프로젝트가 없습니다.</div>;
    }
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {items.map(p => {
          const progress = Math.min(100, Math.max(0, p.progress || 0));
          return (
            <div key={p.id} className="rounded-xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-2">
              <h4 className="text-sm font-semibold text-foreground truncate" title={p.sector_project_name}>
                {p.sector_project_name}
              </h4>
              <p className="text-xs text-muted-foreground">{p.user_name || '담당자 미지정'}</p>
              <div className="flex items-center gap-2">
                <Progress value={progress} className="h-2 flex-1" />
                <span className="text-xs font-medium text-foreground whitespace-nowrap">{progress}%</span>
              </div>
              {p.note && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2" title={p.note}>{p.note}</p>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">부문 프로젝트 현황</h1>
        <p className="mt-1 text-sm text-muted-foreground">부문별 프로젝트 진행 현황 조회</p>
      </div>

      {/* Sector Tabs */}
      <div className="flex gap-2">
        {sectors.map(s => (
          <button
            key={s.code}
            onClick={() => setActiveTab(prev => prev === s.code ? null : s.code)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === s.code
                ? 'bg-primary text-primary-foreground'
                : 'border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            {s.name}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === null ? (
        // Initial split view
        <div className="flex gap-6">
          {sector1 && renderSummaryGrid(sector1.code, sector1.name)}
          {sector2 && renderSummaryGrid(sector2.code, sector2.name)}
        </div>
      ) : (
        // Detail card view for selected sector
        renderDetailCards(activeTab)
      )}
    </div>
  );
}
