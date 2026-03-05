import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
  useRef,
  useMemo,
} from "react";
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

  // dash_users 조회 (공통)
  const fetchDashUser = useCallback(async (uid: string): Promise<DashUser | null> => {
    try {
      const { data, error } = await supabase
        .from("dash_users")
        .select("*")
        .eq("auth_user_id", uid)
        .maybeSingle();

      if (error) throw error;
      return (data as DashUser | null) ?? null;
    } catch (err) {
      console.error("fetchDashUser error:", err);
      return null;
    }
  }, []);

  // ✅ 초기 진입/로그인 직후에만 호출하는 동기화 (전체 스피너 켜도 됨)
  const syncDashUserWithLoading = useCallback(
    async (user: AuthUser | null) => {
      if (!mountedRef.current) return;

      if (!user) {
        setDashUser(null);
        return;
      }

      setIsLoading(true);
      const du = await fetchDashUser(user.id);
      if (!mountedRef.current) return;

      setDashUser(du);
      setIsLoading(false);
    },
    [fetchDashUser]
  );

  // ✅ 일반적인 "새로고침/부분 갱신" 용 (전체 스피너 안 켜고 업데이트)
  const syncDashUserSilent = useCallback(
    async (user: AuthUser | null) => {
      if (!mountedRef.current) return;

      if (!user) {
        setDashUser(null);
        return;
      }

      const du = await fetchDashUser(user.id);
      if (!mountedRef.current) return;

      setDashUser(du);
    },
    [fetchDashUser]
  );

  // 1) 최초 진입: 세션 복원 + dashUser 조회 (여기서만 전체 로딩)
  useEffect(() => {
    mountedRef.current = true;

    const init = async () => {
      setIsLoading(true);

      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) console.error("getSession error:", error);

        const user = data.session?.user ?? null;

        if (!mountedRef.current) return;

        setAuthUser(user);

        if (user) {
          const du = await fetchDashUser(user.id);
          if (!mountedRef.current) return;
          setDashUser(du);
        } else {
          setDashUser(null);
        }
      } finally {
        if (mountedRef.current) setIsLoading(false);
      }
    };

    void init();

    return () => {
      mountedRef.current = false;
    };
  }, [fetchDashUser]);

  // 2) auth 변화 구독: "전체 로딩"은 SIGNED_IN 에서만
  //    Alt+Tab / TOKEN_REFRESHED 등으로 스피너 뜨는 문제 방지
  useEffect(() => {
    let lastUserId: string | null = null;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mountedRef.current) return;

      const user = session?.user ?? null;
      const userId = user?.id ?? null;

      if (event === "SIGNED_OUT") {
        setAuthUser(null);
        setDashUser(null);
        setIsLoading(false);
        lastUserId = null;
        return;
      }

      // authUser는 항상 최신으로 반영
      setAuthUser(user);

      // 로그인 직후: dashUser를 로딩 포함해서 동기화
      if (event === "SIGNED_IN") {
        lastUserId = userId;
        await syncDashUserWithLoading(user);
        return;
      }

      // 초기 세션 이벤트가 들어오는 환경 대비 (일부 브라우저/환경)
      if (event === "INITIAL_SESSION") {
        // 이미 init에서 처리했더라도, 혹시 userId가 바뀐 경우만 조용히 동기화
        if (userId && userId !== lastUserId) {
          lastUserId = userId;
          await syncDashUserSilent(user);
        }
        return;
      }

      // USER_UPDATED: dash_users 정보가 바뀔 수 있으니 조용히 동기화 (스피너 X)
      if (event === "USER_UPDATED") {
        if (userId) {
          lastUserId = userId;
          await syncDashUserSilent(user);
        }
        return;
      }

      // TOKEN_REFRESHED 등은 대개 dashUser 재조회 불필요 (스피너 절대 X)
      // 단, userId가 바뀌는 특이 케이스만 방어
      if (userId && userId !== lastUserId) {
        lastUserId = userId;
        await syncDashUserSilent(user);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [syncDashUserWithLoading, syncDashUserSilent]);

  const login = async (email: string, password: string): Promise<string | null> => {
    // 여기서 isLoading(true) 안 켜도 됨: SIGNED_IN 이벤트에서 syncDashUserWithLoading이 켬
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? error.message : null;
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error("signOut error:", error);

    // 즉시 반영 원하면 유지 (SIGNED_OUT에서도 정리됨)
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
    // ✅ 수동 새로고침은 전체 스피너 안 띄우는 게 UX 좋음
    await syncDashUserSilent(authUser);
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