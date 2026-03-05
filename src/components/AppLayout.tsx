import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import { LayoutDashboard, Monitor, Cloud, BarChart3, LogOut, Menu, X, Shield, UserCog, Building2, FolderKanban, FileText } from 'lucide-react';
import { useState } from 'react';
import PasswordChangeModal from '@/components/PasswordChangeModal';

const commonNavItems = [
  { title: '대시보드', url: '/', icon: LayoutDashboard },
  { title: '사업부 월간 보고', url: '/department-report', icon: FileText },
  { title: 'IT 유형자산', url: '/it-tangible', icon: Monitor },
  { title: 'IT 무형자산', url: '/it-intangible', icon: Cloud },
  { title: '사업부 월별 데이터', url: '/department-bi', icon: BarChart3 },
  { title: '프로젝트 데이터', url: '/projects', icon: FolderKanban },
];

const adminNavItems = [
  { title: '부서 관리', url: '/admin/departments', icon: Building2 },
  { title: '사용자 관리', url: '/admin/users', icon: UserCog },
];

const roleLabel: Record<string, string> = {
  ADMIN: '관리자',
  MANAGER: '매니저',
  VIEWER: '뷰어',
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { dashUser, logout, hasPermission } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen w-full bg-background">
      <PasswordChangeModal />
      <aside
        className={`fixed left-0 top-0 z-40 h-screen flex flex-col border-r border-border bg-card transition-all duration-300 ${collapsed ? 'w-16' : 'w-60'}`}>
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          {!collapsed && <span className="text-gradient text-lg font-bold tracking-tight">AssetBI</span>}
          <button onClick={() => setCollapsed(!collapsed)} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
            {collapsed ? <Menu className="h-5 w-5" /> : <X className="h-5 w-5" />}
          </button>
        </div>
        <nav className="flex-1 space-y-1 px-2 py-4">
          {commonNavItems.map((item) => (
            <NavLink key={item.url} to={item.url} end={item.url === '/'} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-all" activeClassName="bg-primary/10 text-primary font-medium">
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.title}</span>}
            </NavLink>
          ))}
          {hasPermission('ADMIN') && (
            <>
              {!collapsed && <div className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">관리자 전용</div>}
              {adminNavItems.map((item) => (
                <NavLink key={item.url} to={item.url} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-all" activeClassName="bg-primary/10 text-primary font-medium">
                  <item.icon className="h-5 w-5 shrink-0" />
                  {!collapsed && <span>{item.title}</span>}
                </NavLink>
              ))}
            </>
          )}
        </nav>
        {dashUser && (
          <div className="border-t border-border p-3">
            {!collapsed && (
              <div className="mb-2">
                <p className="text-sm font-medium text-foreground">{dashUser.user_name}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <Shield className="h-3 w-3 text-primary" />
                  <span className="text-xs text-primary">{roleLabel[dashUser.role_code] || dashUser.role_code}</span>
                </div>
              </div>
            )}
            <button onClick={logout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
              <LogOut className="h-4 w-4" />
              {!collapsed && <span>로그아웃</span>}
            </button>
          </div>
        )}
      </aside>
      <main className={`flex-1 transition-all duration-300 ${collapsed ? 'ml-16' : 'ml-60'}`}>
        <div className="p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
