import { supabase } from '@/integrations/supabase/client';
import { fetchActiveProjectCount, fetchMonthlyOrderCount, fetchActiveProjectsByDept, fetchMonthlyOrdersByDept } from './businessProjectService';
import { fetchSalesSummary, fetchYtdByDepartment, fetchYtdSummary } from './salesService';

export interface DashboardStats {
  ytdSales: number;
  ytdPurchase: number;
  ytdNetSales: number;
  prevYtdSales: number;
  prevYtdPurchase: number;
  prevYtdNetSales: number;
  activeProjectCount: number;
  monthlyOrderCount: number;
}

export interface DeptSummaryRow {
  departmentName: string;
  departmentCode: string;
  monthlySales: number;
  monthlyPurchase: number;
  monthlyNetSales: number;
  prevMonthlySales: number | null;
  prevMonthlyPurchase: number | null;
  prevMonthlyNetSales: number | null;
  ytdSales: number;
  ytdPurchase: number;
  ytdNetSales: number;
  yoyChange: number | null;
  activeProjects: number;
  monthlyOrders: number;
}

export async function fetchDashboardStats(monthKey: string): Promise<DashboardStats> {
  const [y, m] = monthKey.split('-').map(Number);
  const year = String(y);
  const prevYearMonthKey = `${y - 1}-${String(m).padStart(2, '0')}`;

  const [ytdData, prevYtdData, activeProjectCount, monthlyOrderCount] = await Promise.all([
    fetchYtdSummary(year, monthKey),
    fetchYtdSummary(String(y - 1), prevYearMonthKey),
    fetchActiveProjectCount(monthKey),
    fetchMonthlyOrderCount(monthKey),
  ]);

// 변경 후
  const ytdSales = ytdData.reduce((s, r) => {
    const isJanuary = r.month_key?.endsWith('-01');
    return s + Number(r.sales_amount || 0) + (isJanuary ? Number(r.deferred_sales || 0) : 0);
  }, 0);
  const ytdPurchase = ytdData.reduce((s, r) => {
    const isJanuary = r.month_key?.endsWith('-01');
    return s + Number(r.purchase_amount || 0) + (isJanuary ? Number(r.deferred_purchase || 0) : 0);
  }, 0);
  const prevYtdSales = prevYtdData.reduce((s, r) => {
    const isJanuary = r.month_key?.endsWith('-01');
    return s + Number(r.sales_amount || 0) + (isJanuary ? Number(r.deferred_sales || 0) : 0);
  }, 0);
  const prevYtdPurchase = prevYtdData.reduce((s, r) => {
    const isJanuary = r.month_key?.endsWith('-01');
    return s + Number(r.purchase_amount || 0) + (isJanuary ? Number(r.deferred_purchase || 0) : 0);
  }, 0);

  return {
    ytdSales,
    ytdPurchase,
    ytdNetSales: ytdSales - ytdPurchase,
    prevYtdSales,
    prevYtdPurchase,
    prevYtdNetSales: prevYtdSales - prevYtdPurchase,
    activeProjectCount,
    monthlyOrderCount,
  };
}

export async function fetchDeptSummary(monthKey: string): Promise<DeptSummaryRow[]> {
  const year = monthKey.split('-')[0];
  const [y, m] = monthKey.split('-').map(Number);
  const prevMonthKey = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
  const prevYearSameMonthKey = `${y - 1}-${String(m).padStart(2, '0')}`;

  const [monthlyData, prevMonthData, ytdData, prevYearYtdData, activeByDept, ordersByDept] = await Promise.all([
    fetchSalesSummary(monthKey),
    fetchSalesSummary(prevMonthKey),
    fetchYtdByDepartment(year.toString(), monthKey),
    fetchYtdByDepartment(String(y - 1), prevYearSameMonthKey),
    fetchActiveProjectsByDept(monthKey),
    fetchMonthlyOrdersByDept(monthKey),
  ]);

  // Previous month map
  const prevMap = new Map<string, { sales: number; purchase: number }>();
  for (const r of prevMonthData) {
    prevMap.set(r.department_code, {
      sales: Number(r.sales_amount || 0),
      purchase: Number(r.purchase_amount || 0),
    });
  }

  // Build department map
  const depts = new Map<string, DeptSummaryRow>();

  // Monthly
  for (const r of monthlyData) {
    const name = r.departments?.department_name || r.department_code;
    const prev = prevMap.get(r.department_code);
    depts.set(r.department_code, {
      departmentCode: r.department_code,
      departmentName: name,
      monthlySales: Number(r.sales_amount || 0),
      monthlyPurchase: Number(r.purchase_amount || 0),
      monthlyNetSales: Number(r.sales_amount || 0) - Number(r.purchase_amount || 0),
      prevMonthlySales: prev ? prev.sales : null,
      prevMonthlyPurchase: prev ? prev.purchase : null,
      prevMonthlyNetSales: prev ? prev.sales - prev.purchase : null,
      ytdSales: 0,
      ytdPurchase: 0,
      ytdNetSales: 0,
      yoyChange: null,
      activeProjects: 0,
      monthlyOrders: 0,
    });
  }

  // YTD
  for (const r of ytdData) {
    const name = r.departments?.department_name || r.department_code;
    if (!depts.has(r.department_code)) {
      const prev = prevMap.get(r.department_code);
      depts.set(r.department_code, {
        departmentCode: r.department_code,
        departmentName: name,
        monthlySales: 0, monthlyPurchase: 0, monthlyNetSales: 0,
        prevMonthlySales: prev ? prev.sales : null,
        prevMonthlyPurchase: prev ? prev.purchase : null,
        prevMonthlyNetSales: prev ? prev.sales - prev.purchase : null,
        ytdSales: 0, ytdPurchase: 0, ytdNetSales: 0,
        yoyChange: null, activeProjects: 0, monthlyOrders: 0,
      });
    }
    const d = depts.get(r.department_code)!;
    const isJanuary = r.month_key?.endsWith('-01');
    d.ytdSales += Number(r.sales_amount || 0) + (isJanuary ? Number(r.deferred_sales || 0) : 0);
    d.ytdPurchase += Number(r.purchase_amount || 0) + (isJanuary ? Number(r.deferred_purchase || 0) : 0);
    d.ytdNetSales = d.ytdSales - d.ytdPurchase;
  }

  // YoY (전년 동기 누적 대비)
  const prevYearYtdMap = new Map<string, number>();
  for (const r of prevYearYtdData) {
    const current = prevYearYtdMap.get(r.department_code) || 0;
    prevYearYtdMap.set(r.department_code, current + Number(r.sales_amount || 0));
  }

  for (const [code, d] of depts) {
    const prevYtdSales = prevYearYtdMap.get(code);
    if (prevYtdSales !== undefined) {
      d.yoyChange = d.ytdSales - prevYtdSales;
    }
  }

  // Active projects & monthly orders
  for (const [code, count] of Object.entries(activeByDept)) {
    if (depts.has(code)) {
      depts.get(code)!.activeProjects = count;
    }
  }
  for (const [code, count] of Object.entries(ordersByDept)) {
    if (depts.has(code)) {
      depts.get(code)!.monthlyOrders = count;
    }
  }

  // Sort by department sort_order (ascending) — fetch departments for sort_order
  const { data: deptList } = await supabase
    .from('departments')
    .select('department_code, sort_order')
    .eq('is_active', true);
  const sortOrderMap = new Map<string, number>();
  for (const d of deptList || []) {
    sortOrderMap.set(d.department_code, d.sort_order);
  }

  return Array.from(depts.values()).sort((a, b) => {
    const aOrder = sortOrderMap.get(a.departmentCode) ?? 9999;
    const bOrder = sortOrderMap.get(b.departmentCode) ?? 9999;
    return aOrder - bOrder;
  });
}
