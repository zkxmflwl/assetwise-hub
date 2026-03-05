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

  const syncDashUser = useCallback(async (user: AuthUser | null) => {
    if (!user) {
      if (mountedRef.current) setDashUser(null);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("dash_users")
        .select("*")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      if (mountedRef.current) setDashUser(data as DashUser | null);
    } catch (err) {
      console.error("fetchDashUser error:", err);
      if (mountedRef.current) setDashUser(null);
    }
  }, []);

  // ✅ 먼저 선언 (호이스팅 이슈 방지)
  const syncUserWithLoading = useCallback(
    async (user: AuthUser | null) => {
      if (!mountedRef.current) return;
      setIsLoading(true);
      await syncDashUser(user);
      if (mountedRef.current) setIsLoading(false);
    },
    [syncDashUser]
  );

  useEffect(() => {
    mountedRef.current = true;

    let unsub: (() => void) | null = null;

    const run = async () => {
      try {
        setIsLoading(true);

        // 1) 새로고침/초기 진입 시 세션 복원
        const { data, error } = await supabase.auth.getSession();
        if (error) console.error("getSession error:", error);

        const user = data.session?.user ?? null;

        if (!mountedRef.current) return;

        setAuthUser(user);
        await syncDashUser(user);
      } catch (e) {
        console.error("Auth initialization error:", e);
      } finally {
        if (mountedRef.current) setIsLoading(false);
      }

      // 2) 구독은 init 이후에 등록하되, cleanup에서 즉시 해제 가능하게
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!mountedRef.current) return;

        const user = session?.user ?? null;

        if (event === "SIGNED_OUT") {
          setAuthUser(null);
          setDashUser(null);
          setIsLoading(false);
          return;
        }

        // INITIAL_SESSION 포함해서 안전하게 처리
        if (event === "SIGNED_IN" || event === "USER_UPDATED" || event === "INITIAL_SESSION") {
          setAuthUser(user);
          await syncUserWithLoading(user);
          return;
        }

        // TOKEN_REFRESHED는 보통 dashUser 재조회 불필요 (원하면 user id 변경시에만)
        setAuthUser(user);
      });

      unsub = () => subscription.unsubscribe();
    };

    void run();

    return () => {
      mountedRef.current = false;
      if (unsub) unsub();
    };
  }, [syncDashUser, syncUserWithLoading]);

  const login = async (email: string, password: string): Promise<string | null> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? error.message : null;
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error("signOut error:", error);
    // 상태 정리는 onAuthStateChange(SIGNED_OUT)에서도 되지만, 즉시 반영 원하면 아래 유지 가능
    setAuthUser(null);
    setDashUser(null);
    setIsLoading(false);
  };

  const hasPermission = (required: RoleCode): boolean => {
    if (!dashUser) return false;
    return roleLevel[dashUser.role_code] >= roleLevel[required];
  };

  const refreshDashUser = async () => {
    if (!authUser) return;
    setIsLoading(true);
    await syncDashUser(authUser);
    if (mountedRef.current) setIsLoading(false);
  };

  const isLoggedIn = useMemo(
    () => !!authUser && !!dashUser && dashUser.is_active,
    [authUser, dashUser]
  );

  return (
    <AuthContext.Provider
      value={{
        authUser,
        dashUser,
        isLoggedIn,
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
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};