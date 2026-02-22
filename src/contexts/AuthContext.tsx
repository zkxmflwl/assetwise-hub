import React, { createContext, useContext, useState, ReactNode } from 'react';
import { User, UserRole, mockUser } from '@/data/mockData';

interface AuthContextType {
  user: User | null;
  isLoggedIn: boolean;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  hasPermission: (required: UserRole) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const roleLevel: Record<UserRole, number> = { viewer: 1, editor: 2, master: 3 };

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);

  const login = (email: string, password: string): boolean => {
    // Mock login - in production, this would call a real API
    if (email && password) {
      setUser(mockUser);
      return true;
    }
    return false;
  };

  const logout = () => setUser(null);

  const hasPermission = (required: UserRole): boolean => {
    if (!user) return false;
    return roleLevel[user.role] >= roleLevel[required];
  };

  return (
    <AuthContext.Provider value={{ user, isLoggedIn: !!user, login, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
