import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Lock, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function PasswordChangeModal() {
  const { dashUser, refreshDashUser } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!dashUser?.must_change_password) return null;

  const validate = (): string | null => {
    if (newPassword.length < 8) return '비밀번호는 8자 이상이어야 합니다.';
    if (/\s/.test(newPassword)) return '비밀번호에 공백을 포함할 수 없습니다.';
    if (newPassword !== confirmPassword) return '비밀번호가 일치하지 않습니다.';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }

    setLoading(true);
    setError('');

    try {
      // 1. 먼저 dash_users의 must_change_password를 false로 변경
      const { error: dbError } = await supabase
        .from('dash_users')
        .update({ must_change_password: false })
        .eq('auth_user_id', dashUser.auth_user_id);
      
      if (dbError) {
        console.error('DB update error:', dbError);
        setError('비밀번호 상태 업데이트에 실패했습니다.');
        setLoading(false);
        return;
      }

      // 2. 그 다음 Auth 비밀번호 변경 (세션 갱신 발생 가능)
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) {
        // 롤백: must_change_password를 다시 true로
        await supabase
          .from('dash_users')
          .update({ must_change_password: true })
          .eq('auth_user_id', dashUser.auth_user_id);
        setError(updateError.message);
        setLoading(false);
        return;
      }

      // 3. dashUser 상태 새로고침
      await refreshDashUser();
    } catch (err) {
      console.error('Password change error:', err);
      setError('비밀번호 변경 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md [&>button]:hidden" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            비밀번호 변경 필요
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">최초 로그인 또는 비밀번호 초기화 후 새 비밀번호를 설정해야 합니다.</p>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <label className="text-sm text-muted-foreground">새 비밀번호</label>
            <input type="password" value={newPassword} onChange={(e) => { setNewPassword(e.target.value); setError(''); }}
              placeholder="8자 이상"
              className="mt-1 w-full rounded-lg border border-border bg-secondary/50 py-2 px-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">비밀번호 확인</label>
            <input type="password" value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
              placeholder="비밀번호 재입력"
              className="mt-1 w-full rounded-lg border border-border bg-secondary/50 py-2 px-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button type="submit" disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : '비밀번호 변경'}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
