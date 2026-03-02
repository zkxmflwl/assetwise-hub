import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Lock, Mail, ArrowRight, Loader2 } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('이메일과 비밀번호를 입력해주세요.');
      return;
    }
    setLoading(true);
    const err = await login(email, password);
    if (err) setError('로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.');
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-10 text-center">
          <h1 className="text-gradient text-4xl font-extrabold tracking-tight">AssetBI</h1>
          <p className="mt-2 text-sm text-muted-foreground">for CSPI</p>
        </div>
        <div className="glass-card rounded-2xl p-8">
          <h2 className="mb-6 text-xl font-semibold text-foreground">로그인</h2>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm text-muted-foreground">이메일</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  placeholder="user@company.com"
                  className="w-full rounded-lg border border-border bg-secondary/50 py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors" />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-muted-foreground">비밀번호</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input type="password" value={password} onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-border bg-secondary/50 py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors" />
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <button type="submit" disabled={loading}
              className="group flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>로그인 <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
