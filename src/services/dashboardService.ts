import { supabase } from '@/integrations/supabase/client';
import { fetchActiveProjectCount, fetchMonthlyOrderCount, fetchActiveProjectsByDept, fetchMonthlyOrdersByDept } from './businessProjectService';
import { fetchSalesSummary, fetchYtdByDepartment, fetchYtdSummary, fetchSameMonthLastYear } from './salesService';

export interface DashboardStats {
  ytdSales: number;
  ytdPurchase: number;
  ytdNetSales: number;
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
}

export async function fetchDashboardStats(monthKey: string): Promise<DashboardStats> {
  const [y, m] = monthKey.split('-').map(Number);
  const prevMonthKey = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;

  const [salesData, prevSalesData, activeProjectCount, monthlyOrderCount] = await Promise.all([
    fetchSalesSummary(monthKey),
    fetchSalesSummary(prevMonthKey),
    fetchActiveProjectCount(monthKey),
    fetchMonthlyOrderCount(monthKey),
  ]);

  const monthlySales = salesData.reduce((s, r) => s + Number(r.sales_amount || 0), 0);
  const monthlyPurchase = salesData.reduce((s, r) => s + Number(r.purchase_amount || 0), 0);

  const hasPrev = prevSalesData.length > 0;
  const prevMonthlySales = hasPrev ? prevSalesData.reduce((s, r) => s + Number(r.sales_amount || 0), 0) : null;
  const prevMonthlyPurchase = hasPrev ? prevSalesData.reduce((s, r) => s + Number(r.purchase_amount || 0), 0) : null;

  return {
    monthlySales,
    monthlyPurchase,
    monthlyNetSales: monthlySales - monthlyPurchase,
    prevMonthlySales,
    prevMonthlyPurchase,
    prevMonthlyNetSales: prevMonthlySales !== null && prevMonthlyPurchase !== null ? prevMonthlySales - prevMonthlyPurchase : null,
    activeProjectCount,
    monthlyOrderCount,
  };
}

export async function fetchDeptSummary(monthKey: string): Promise<DeptSummaryRow[]> {
  const year = monthKey.split('-')[0];
  const [y, m] = monthKey.split('-').map(Number);
  const prevMonthKey = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;

  const [monthlyData, prevMonthData, ytdData, lastYearData, activeByDept] = await Promise.all([
    fetchSalesSummary(monthKey),
    fetchSalesSummary(prevMonthKey),
    fetchYtdByDepartment(year.toString(), monthKey),
    fetchSameMonthLastYear(monthKey),
    fetchActiveProjectsByDept(monthKey),
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
        yoyChange: null, activeProjects: 0,
      });
    }
    const d = depts.get(r.department_code)!;
    d.ytdSales += Number(r.sales_amount || 0);
    d.ytdPurchase += Number(r.purchase_amount || 0);
    d.ytdNetSales = d.ytdSales - d.ytdPurchase;
  }

  // YoY
  const lastYearMap = new Map<string, number>();
  for (const r of lastYearData) {
    lastYearMap.set(r.department_code, Number(r.sales_amount || 0));
  }
  for (const [code, d] of depts) {
    const ly = lastYearMap.get(code);
    if (ly !== undefined) {
      d.yoyChange = d.monthlySales - ly;
    }
  }

  // Active projects
  for (const [code, count] of Object.entries(activeByDept)) {
    if (depts.has(code)) {
      depts.get(code)!.activeProjects = count;
    }
  }

  return Array.from(depts.values()).sort((a, b) => a.departmentName.localeCompare(b.departmentName, 'ko'));
}
