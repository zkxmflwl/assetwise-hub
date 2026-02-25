import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User as AuthUser } from '@supabase/supabase-js';

export type RoleCode = 'ADMIN' | 'MANAGER' | 'VIEWER';

export interface DashUser {
  auth_user_id: string;
  user_email: string;
  user_name: string;
  role_code: RoleCode;
  department_code: string | null;
  is_active: boolean;
  must_change_password: boolean;
}

interface AuthContextType {
  authUser: AuthUser | null;
  dashUser: DashUser | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
  hasPermission: (required: RoleCode) => boolean;
  refreshDashUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const roleLevel: Record<RoleCode, number> = { VIEWER: 1, MANAGER: 2, ADMIN: 3 };

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [dashUser, setDashUser] = useState<DashUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const mountedRef = useRef(true);

  const fetchDashUser = useCallback(async (uid: string): Promise<DashUser | null> => {
    const { data, error } = await supabase
      .from('dash_users')
      .select('*')
      .eq('auth_user_id', uid)
      .maybeSingle(); // single -> maybeSingle 권장

    if (error) {
      console.error('fetchDashUser error:', error);
      return null;
    }
    return (data as DashUser | null) ?? null;
  }, []);

  const refreshDashUser = useCallback(async () => {
    if (!authUser) return;
    const du = await fetchDashUser(authUser.id);
    if (!mountedRef.current) return;
    setDashUser(du);
  }, [authUser, fetchDashUser]);

  // 1) auth 이벤트 구독: "상태 반영만" 수행
  useEffect(() => {
    mountedRef.current = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
  console.log('onAuthStateChange:', event, session?.user?.id);

  if (!mountedRef.current) return;

  // 로그인/세션 복구 시: dashUser 다시 조회할 때까지 로딩 유지
  if (session?.user) {
    setIsLoading(true);
  }

  setAuthUser(session?.user ?? null);

  // 로그아웃 시: dashUser 비우고 로딩 종료
  if (!session?.user) {
    setDashUser(null);
    setIsLoading(false);
  }
});

return () => {
  mountedRef.current = false;
  subscription.unsubscribe();
};

  // 2) 최초 세션 확인 (1회)
  useEffect(() => {
    let cancelled = false;
  
    const init = async () => {
      setIsLoading(true);
  
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error('getSession error:', error);
      }
  
      if (cancelled || !mountedRef.current) return;
  
      const user = data.session?.user ?? null;
      setAuthUser(user);
  
      // ✅ dashUser 조회는 하지 않음 (3번 effect가 담당)
      if (!user) {
        setDashUser(null);
        setIsLoading(false);
      }
      // user가 있으면 isLoading은 유지(true)
      // -> 3번 effect에서 fetchDashUser 완료 후 false로 내림
    };
  
    void init();
  
    return () => {
      cancelled = true;
    };
  }, []);

  // 3) authUser가 바뀌면 dashUser 동기화 (로그인/토큰복구/로그아웃 이후)
  useEffect(() => {
    let cancelled = false;
  
    const syncDashUser = async () => {
      if (!authUser) {
        if (!cancelled && mountedRef.current) {
          setDashUser(null);
          setIsLoading(false);
        }
        return;
      }
  
      const du = await fetchDashUser(authUser.id);
      if (cancelled || !mountedRef.current) return;
  
      setDashUser(du);
      setIsLoading(false);
    };
  
    void syncDashUser();
  
    return () => {
      cancelled = true;
    };
  }, [authUser, fetchDashUser]);

  const login = async (email: string, password: string): Promise<string | null> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return error.message;
    // 로그인 성공 후 상태 반영은 onAuthStateChange + authUser effect가 처리
    return null;
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('signOut error:', error);
    }
    // 명시적 초기화 (이벤트에서도 들어오지만 중복은 문제 없음)
    setAuthUser(null);
    setDashUser(null);
  };

  const hasPermission = (required: RoleCode): boolean => {
    if (!dashUser) return false;
    return roleLevel[dashUser.role_code] >= roleLevel[required];
  };

  return (
    <AuthContext.Provider
      value={{
        authUser,
        dashUser,
        isLoggedIn: !!authUser && !!dashUser && dashUser.is_active,
        isLoading,
        login,
        logout,
        hasPermission,
        refreshDashUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
