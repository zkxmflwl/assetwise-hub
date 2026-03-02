// Pastel background colors for department-based row coloring
const DEPT_COLORS = [
  'bg-blue-50/70',
  'bg-rose-50/70',
  'bg-amber-50/70',
  'bg-teal-50/70',
  'bg-purple-50/70',
  'bg-cyan-50/70',
  'bg-orange-50/70',
  'bg-lime-50/70',
  'bg-pink-50/70',
  'bg-indigo-50/70',
  'bg-emerald-50/70',
  'bg-fuchsia-50/70',
];

let colorMap: Record<string, string> = {};

export function buildDeptColorMap(departmentCodes: string[]) {
  colorMap = {};
  const sorted = [...new Set(departmentCodes)].sort();
  sorted.forEach((code, i) => {
    colorMap[code] = DEPT_COLORS[i % DEPT_COLORS.length];
  });
  return colorMap;
}

export function getDeptRowColor(departmentCode: string | null | undefined): string {
  if (!departmentCode) return '';
  return colorMap[departmentCode] || '';
}
