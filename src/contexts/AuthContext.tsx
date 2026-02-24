import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
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

  const fetchDashUser = useCallback(async (uid: string): Promise<DashUser | null> => {
    const { data, error } = await supabase
      .from('dash_users')
      .select('*')
      .eq('auth_user_id', uid)
      .single();
    if (error || !data) return null;
    return data as unknown as DashUser;
  }, []);

  const refreshDashUser = useCallback(async () => {
    if (!authUser) return;
    const du = await fetchDashUser(authUser.id);
    setDashUser(du);
  }, [authUser, fetchDashUser]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setAuthUser(session.user);
        const du = await fetchDashUser(session.user.id);
        setDashUser(du);
      } else {
        setAuthUser(null);
        setDashUser(null);
      }
      setIsLoading(false);
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setAuthUser(session.user);
        const du = await fetchDashUser(session.user.id);
        setDashUser(du);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchDashUser]);

  const login = async (email: string, password: string): Promise<string | null> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return error.message;
    return null;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setAuthUser(null);
    setDashUser(null);
  };

  const hasPermission = (required: RoleCode): boolean => {
    if (!dashUser) return false;
    return roleLevel[dashUser.role_code] >= roleLevel[required];
  };

  return (
    <AuthContext.Provider value={{
      authUser,
      dashUser,
      isLoggedIn: !!authUser && !!dashUser && dashUser.is_active,
      isLoading,
      login,
      logout,
      hasPermission,
      refreshDashUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
