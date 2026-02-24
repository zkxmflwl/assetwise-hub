import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDepartments } from '@/hooks/useDepartments';
import { toast } from 'sonner';
import { UserPlus, RotateCcw, Shield, Loader2 } from 'lucide-react';
import type { DashUser, RoleCode } from '@/contexts/AuthContext';

async function fetchAllUsers() {
  const { data, error } = await supabase
    .from('dash_users')
    .select('*, departments(department_name)')
    .order('user_name');
  if (error) throw error;
  return data as (DashUser & { departments: { department_name: string } | null })[];
}

async function callAdminAction(action: string, params: Record<string, any>) {
  const { data, error } = await supabase.functions.invoke('admin-users', {
    body: { action, ...params },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export default function AdminUsers() {
  const queryClient = useQueryClient();
  const { data: users = [], isLoading } = useQuery({ queryKey: ['admin-users'], queryFn: fetchAllUsers });
  const { data: departments = [] } = useDepartments();
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Create form
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newDept, setNewDept] = useState('');

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin-users'] });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !newName.trim()) { toast.error('이메일과 이름을 입력해주세요.'); return; }
    setCreating(true);
    try {
      const res = await callAdminAction('create-user', {
        user_email: newEmail.trim(),
        user_name: newName.trim(),
        department_code: newDept || null,
      });
      toast.success(`사용자 생성 완료. 초기 비밀번호: ${res.defaultPassword}`);
      setNewEmail(''); setNewName(''); setNewDept(''); setShowCreate(false);
      refresh();
    } catch (err: any) {
      toast.error(`생성 실패: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  const handleAction = async (action: string, params: Record<string, any>, successMsg: string) => {
    const key = `${action}-${params.auth_user_id}`;
    setActionLoading(key);
    try {
      const res = await callAdminAction(action, params);
      const msg = res?.defaultPassword ? `${successMsg} (비밀번호: ${res.defaultPassword})` : successMsg;
      toast.success(msg);
      refresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  if (isLoading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">사용자 관리</h1>
          <p className="mt-1 text-sm text-muted-foreground">계정 생성, 권한 변경, 비밀번호 초기화</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity">
          <UserPlus className="h-4 w-4" /> 사용자 생성
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="glass-card rounded-xl p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">새 사용자 생성</h3>
          <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-4">
            <div>
              <label className="text-xs text-muted-foreground">이메일 *</label>
              <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="user@company.com"
                className="mt-1 w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">이름 *</label>
              <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="홍길동"
                className="mt-1 w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">부서</label>
              <select value={newDept} onChange={(e) => setNewDept(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none">
                <option value="">-</option>
                {departments.map(d => <option key={d.department_code} value={d.department_code}>{d.department_name}</option>)}
              </select>
            </div>
            <div className="flex items-end">
              <button type="submit" disabled={creating}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : '생성'}
              </button>
            </div>
          </form>
          <p className="mt-3 text-xs text-muted-foreground">초기 비밀번호: 이메일 @앞부분 + "1234!" / 초기 권한: VIEWER / 첫 로그인 시 비밀번호 변경 필수</p>
        </div>
      )}

      {/* Users Table */}
      <div className="glass-card overflow-hidden rounded-xl">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-medium text-muted-foreground">이메일</th>
                <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-medium text-muted-foreground">이름</th>
                <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-medium text-muted-foreground">권한</th>
                <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-medium text-muted-foreground">부서</th>
                <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-medium text-muted-foreground">상태</th>
                <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-medium text-muted-foreground">관리</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.auth_user_id} className={`border-b border-border/30 transition-colors ${!u.is_active ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3 text-foreground">{u.user_email}</td>
                  <td className="px-4 py-3 text-foreground">{u.user_name}</td>
                  <td className="px-4 py-3">
                    <select value={u.role_code}
                      onChange={(e) => handleAction('change-role', { auth_user_id: u.auth_user_id, role_code: e.target.value }, '권한 변경 완료')}
                      disabled={actionLoading === `change-role-${u.auth_user_id}`}
                      className="rounded border border-border bg-secondary/50 px-2 py-1 text-xs text-foreground focus:border-primary focus:outline-none">
                      <option value="ADMIN">ADMIN</option>
                      <option value="MANAGER">MANAGER</option>
                      <option value="VIEWER">VIEWER</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select value={u.department_code || ''}
                      onChange={(e) => handleAction('change-department', { auth_user_id: u.auth_user_id, department_code: e.target.value }, '부서 변경 완료')}
                      disabled={actionLoading === `change-department-${u.auth_user_id}`}
                      className="rounded border border-border bg-secondary/50 px-2 py-1 text-xs text-foreground focus:border-primary focus:outline-none">
                      <option value="">-</option>
                      {departments.map(d => <option key={d.department_code} value={d.department_code}>{d.department_name}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleAction('toggle-active', { auth_user_id: u.auth_user_id, is_active: !u.is_active }, u.is_active ? '비활성화 완료' : '활성화 완료')}
                      disabled={actionLoading === `toggle-active-${u.auth_user_id}`}
                      className={`rounded px-2 py-1 text-xs font-medium ${u.is_active ? 'bg-emerald-900/50 text-emerald-400' : 'bg-red-900/50 text-red-400'}`}>
                      {u.is_active ? '활성' : '비활성'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleAction('reset-password', { auth_user_id: u.auth_user_id }, '비밀번호 초기화 완료')}
                      disabled={actionLoading === `reset-password-${u.auth_user_id}`}
                      className="flex items-center gap-1 rounded border border-border bg-secondary/50 px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                      <RotateCcw className="h-3 w-3" /> 비밀번호 초기화
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
