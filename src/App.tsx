import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ITTangibleAssets from "./pages/ITTangibleAssets";
import ITIntangibleAssets from "./pages/ITIntangibleAssets";
import DepartmentBI from "./pages/DepartmentBI";
import DepartmentManage from "./pages/DepartmentManage";
import AdminUsers from "./pages/AdminUsers";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { authUser, dashUser, isLoading, logout } = useAuth();

  if (isLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!authUser) return <Navigate to="/login" replace />;

  if (!dashUser || !dashUser.is_active) {
    return (
      <div className="flex h-screen items-center justify-center px-4">
        <div className="glass-card rounded-2xl p-8 max-w-md text-center">
          <h2 className="text-xl font-semibold text-foreground mb-2">접근 불가</h2>
          <p className="text-sm text-muted-foreground mb-4">
            {!dashUser ? '등록되지 않은 사용자입니다.' : '비활성화된 계정입니다.'} 관리자에게 문의하세요.
          </p>
          <button onClick={logout} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">로그아웃</button>
        </div>
      </div>
    );
  }

  if (adminOnly && dashUser.role_code !== 'ADMIN') return <Navigate to="/" replace />;
  return <AppLayout>{children}</AppLayout>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { authUser, dashUser, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (authUser && dashUser?.is_active) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}


const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={<AuthRoute><Login /></AuthRoute>} />
    <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
    <Route path="/it-tangible" element={<ProtectedRoute><ITTangibleAssets /></ProtectedRoute>} />
    <Route path="/it-intangible" element={<ProtectedRoute><ITIntangibleAssets /></ProtectedRoute>} />
    <Route path="/department-bi" element={<ProtectedRoute><DepartmentBI /></ProtectedRoute>} />
    <Route path="/admin/departments" element={<ProtectedRoute adminOnly><DepartmentManage /></ProtectedRoute>} />
    <Route path="/admin/users" element={<ProtectedRoute adminOnly><AdminUsers /></ProtectedRoute>} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
