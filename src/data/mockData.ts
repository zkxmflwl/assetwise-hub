export type UserRole = 'viewer' | 'editor' | 'master';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
}

export const mockUser: User = {
  id: '1',
  name: '관리자',
  email: 'admin@company.com',
  role: 'master',
  department: '경영지원',
};

export const formatKRW = (value: number): string => {
  if (Math.abs(value) >= 100000000) {
    return `${(value / 100000000).toFixed(1)}억`;
  }
  if (Math.abs(value) >= 10000) {
    return `${(value / 10000000).toFixed(0)}천만`;
  }
  return value.toLocaleString('ko-KR');
};
