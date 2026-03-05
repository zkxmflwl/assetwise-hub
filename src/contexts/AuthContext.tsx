import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User as AuthUser } from "@supabase/supabase-js";

export type RoleCode = "ADMIN" | "MANAGER" | "VIEWER";

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
  isLoading: boolean; // (UI용 합성)
  isAuthLoading: boolean;
  isDashUserLoading: boolean;
  login: (email: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
  hasPermission: (required: RoleCode) => boolean;
  refreshDashUser: (opts?: { silent?: boolean }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const roleLevel: Record<RoleCode, number> = { VIEWER: 1, MANAGER: 2, ADMIN: 3 };

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [dashUser, setDashUser] = useState<DashUser | null>(null);

  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isDashUserLoading, setIsDashUserLoading] = useState(false);

  const mountedRef = useRef(true);

  const fetchDashUser = useCallback(async (uid: string): Promise<DashUser | null> => {
    const { data, error } = await supabase
      .from("dash_users")
      .select("*")
      .eq("auth_user_id", uid)
      .maybeSingle();

    if (error) {
      console.error("fetchDashUser error:", error);
      // 여기서 null로 보내면 "미등록"으로 오인될 수 있으니
      // 필요하면 throw 하거나 별도 상태로 구분하세요.
      return null;
    }
    return (data as DashUser | null) ?? null;
  }, []);

  const syncDashUserByUid = useCallback(
    async (uid: string, opts?: { silent?: boolean }) => {
      if (!opts?.silent) setIsDashUserLoading(true);
      const du = await fetchDashUser(uid);
      if (!mountedRef.current) return;
      setDashUser(du);
      setIsDashUserLoading(false);
    },
    [fetchDashUser]
  );

  const refreshDashUser = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!authUser) return;
      await syncDashUserByUid(authUser.id, opts);
    },
    [authUser, syncDashUserByUid]
  );

  // 초기 세션 복원
  useEffect(() => {
    mountedRef.current = true;

    const init = async () => {
      setIsAuthLoading(true);
      const { data, error } = await supabase.auth.getSession();
      if (error) console.error("getSession error:", error);

      if (!mountedRef.current) return;

      const user = data.session?.user ?? null;
      setAuthUser(user);

      if (user) {
        await syncDashUserByUid(user.id, { silent: true });
      } else {
        setDashUser(null);
      }

      if (mountedRef.current) setIsAuthLoading(false);
    };

    void init();

    return () => {
      mountedRef.current = false;
    };
  }, [syncDashUserByUid]);

  // auth state change 구독
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mountedRef.current) return;

      const user = session?.user ?? null;

      if (event === "SIGNED_OUT") {
        setAuthUser(null);
        setDashUser(null);
        return;
      }

      if (event === "SIGNED_IN" || event === "USER_UPDATED") {
        setAuthUser(user);
        if (user) await syncDashUserByUid(user.id, { silent: true });
        return;
      }

      // TOKEN_REFRESHED 등은 굳이 전역 로딩을 켤 필요 없음
      // 필요하면 user id가 바뀌었을 때만 동기화
      if (user?.id && user.id !== authUser?.id) {
        setAuthUser(user);
        await syncDashUserByUid(user.id, { silent: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [authUser?.id, syncDashUserByUid]);

  const login = async (email: string, password: string): Promise<string | null> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? error.message : null;
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error("signOut error:", error);
    // 상태 초기화는 onAuthStateChange(SIGNED_OUT)에서만 처리
  };

  const hasPermission = (required: RoleCode): boolean => {
    if (!dashUser) return false;
    return roleLevel[dashUser.role_code] >= roleLevel[required];
  };

  const isLoggedIn = useMemo(
    () => !!authUser && !!dashUser && dashUser.is_active,
    [authUser, dashUser]
  );

  const isLoading = isAuthLoading || isDashUserLoading;

  return (
    <AuthContext.Provider
      value={{
        authUser,
        dashUser,
        isLoggedIn,
        isLoading,
        isAuthLoading,
        isDashUserLoading,
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
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};