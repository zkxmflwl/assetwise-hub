import Papa from 'papaparse';

/**
 * Parse a CSV file, supporting UTF-8 and attempting CP949/EUC-KR fallback.
 */
export function parseCsvFile(file: File): Promise<Record<string, string>[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      encoding: 'UTF-8',
      complete: (results) => {
        if (results.errors.length > 0) {
          const critical = results.errors.filter(e => e.type === 'Delimiter' || e.type === 'FieldMismatch');
          if (critical.length > 0) {
            reject(new Error(`CSV 파싱 오류: ${critical[0].message}`));
            return;
          }
        }
        resolve(results.data as Record<string, string>[]);
      },
      error: (err) => reject(new Error(`CSV 파싱 실패: ${err.message}`)),
    });
  });
}

/**
 * Download data as a CSV file (UTF-8 BOM for Excel compatibility).
 */
export function downloadCsv(filename: string, headers: string[], rows: string[][]) {
  const csv = Papa.unparse({ fields: headers, data: rows });
  const bom = '\uFEFF';
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Normalize text for matching: trim, lowercase.
 */
export function normalizeText(s: string | null | undefined): string {
  return (s ?? '').trim().toLowerCase();
}

/**
 * Parse "YY.MM" purchase date format to "YYYY-MM-DD".
 * Returns null if parsing fails.
 */
export function parsePurchaseDate(val: string | null | undefined): string | null {
  if (!val) return null;
  const trimmed = val.trim();

  // Try YYYY-MM-DD or YYYY-MM first
  if (/^\d{4}-\d{2}(-\d{2})?$/.test(trimmed)) {
    return trimmed.length === 7 ? `${trimmed}-01` : trimmed;
  }

  // Try YY.MM
  const match = trimmed.match(/^(\d{2})\.(\d{2})$/);
  if (!match) return null;

  const yy = parseInt(match[1], 10);
  const mm = parseInt(match[2], 10);
  if (mm < 1 || mm > 12) return null;

  const year = yy <= 69 ? 2000 + yy : 1900 + yy;
  return `${year}-${String(mm).padStart(2, '0')}-01`;
}

/**
 * Format purchase_date (YYYY-MM-DD) back to YY.MM for CSV download.
 */
export function formatPurchaseDateForCsv(date: string | null | undefined): string {
  if (!date) return '';
  const match = date.match(/^(\d{4})-(\d{2})/);
  if (!match) return date;
  const yy = match[1].slice(2);
  return `${yy}.${match[2]}`;
}

// ── Tangible asset CSV mapping ──

const TANGIBLE_CSV_HEADERS = [
  '관리번호', '소속', '배정', '용도', '종류', '제조사', '모델',
  'S/N', 'CPU', 'MEM', 'HDD', 'SSD', '화면크기', 'OS', '구매연월', '비고',
];

const TANGIBLE_CSV_TO_DB: Record<string, string> = {
  '관리번호': 'asset_no',
  '소속': 'department_code',
  '배정': 'user_name',
  '용도': 'purpose',
  '종류': 'asset_type_code',
  '제조사': 'manufacturer',
  '모델': 'model_name',
  'S/N': 'serial_no',
  'CPU': 'cpu_spec',
  'MEM': 'mem_spec',
  'HDD': 'hdd_spec',
  'SSD': 'ssd_spec',
  '화면크기': 'screen_size',
  'OS': 'os_name',
  '구매연월': 'purchase_date',
  '비고': 'note',
};

interface LookupTables {
  departments: { department_code: string; department_name: string }[];
  assetTypes: { asset_type_code: string; sub_category: string }[];
}

export interface CsvMapResult<T> {
  rows: T[];
  warnings: string[];
  successCount: number;
  failCount: number;
}

export function mapTangibleCsvRows(
  csvRows: Record<string, string>[],
  lookup: LookupTables,
  existingAssetNos: Set<string>,
): CsvMapResult<Record<string, any>> {
  const today = new Date().toISOString().slice(0, 10);
  const mapped: Record<string, any>[] = [];
  const warnings: string[] = [];
  let failCount = 0;

  // Build lookup maps
  const deptMap = new Map(lookup.departments.map(d => [normalizeText(d.department_name), d.department_code]));
  const typeMap = new Map(lookup.assetTypes.map(t => [normalizeText(t.sub_category), t.asset_type_code]));

  for (let i = 0; i < csvRows.length; i++) {
    const csv = csvRows[i];
    const lineNum = i + 2; // 1-indexed + header
    const row: Record<string, any> = {
      manager_name: '',
      usage_location: '',
      issued_date: today,
    };
    let hasError = false;

    for (const [csvKey, dbKey] of Object.entries(TANGIBLE_CSV_TO_DB)) {
      const val = csv[csvKey]?.trim() ?? '';

      if (dbKey === 'department_code') {
        if (val) {
          const code = deptMap.get(normalizeText(val));
          if (code) {
            row[dbKey] = code;
          } else {
            warnings.push(`${lineNum}행: 부서 "${val}" 매핑 실패`);
            row[dbKey] = null;
          }
        } else {
          row[dbKey] = null;
        }
      } else if (dbKey === 'asset_type_code') {
        if (val) {
          const code = typeMap.get(normalizeText(val));
          if (code) {
            row[dbKey] = code;
          } else {
            warnings.push(`${lineNum}행: 자산유형 "${val}" 매핑 실패`);
            row[dbKey] = null;
          }
        } else {
          row[dbKey] = null;
        }
      } else if (dbKey === 'purchase_date') {
        const parsed = parsePurchaseDate(val);
        if (val && !parsed) {
          warnings.push(`${lineNum}행: 구매연월 "${val}" 형식 오류`);
        }
        row[dbKey] = parsed;
      } else {
        row[dbKey] = val || null;
      }
    }

    // Duplicate check (existing + within CSV)
    if (row.asset_no && existingAssetNos.has(row.asset_no)) {
      warnings.push(`${lineNum}행: 관리번호 "${row.asset_no}" 중복 - 스킵`);
      failCount++;
      continue;
    }

    if (row.asset_no) existingAssetNos.add(row.asset_no);
    mapped.push(row);
  }

  return { rows: mapped, warnings, successCount: mapped.length, failCount };
}

export function tangibleRowToCsvRow(
  row: Record<string, any>,
  lookup: LookupTables,
): string[] {
  const deptMap = new Map(lookup.departments.map(d => [d.department_code, d.department_name]));
  const typeMap = new Map(lookup.assetTypes.map(t => [t.asset_type_code, t.sub_category]));

  return [
    row.asset_no ?? '',
    deptMap.get(row.department_code) ?? row.department_code ?? '',
    row.user_name ?? '',
    row.purpose ?? '',
    typeMap.get(row.asset_type_code) ?? row.asset_type_code ?? '',
    row.manufacturer ?? '',
    row.model_name ?? '',
    row.serial_no ?? '',
    row.cpu_spec ?? '',
    row.mem_spec ?? '',
    row.hdd_spec ?? '',
    row.ssd_spec ?? '',
    row.screen_size ?? '',
    row.os_name ?? '',
    formatPurchaseDateForCsv(row.purchase_date),
    row.note ?? '',
  ];
}

export function downloadTangibleCsv(
  rows: Record<string, any>[],
  lookup: LookupTables,
  filename = 'IT_유형자산.csv',
) {
  const data = rows.map(r => tangibleRowToCsvRow(r, lookup));
  downloadCsv(filename, TANGIBLE_CSV_HEADERS, data);
}

export function downloadTangibleTemplate() {
  downloadCsv('IT_유형자산_템플릿.csv', TANGIBLE_CSV_HEADERS, []);
}

// ── Intangible asset CSV mapping ──

const INTANGIBLE_CSV_HEADERS = [
  '라이선스명', '공급사', '수량', '부서', '자산유형', '시작일', '만료일', '비고',
];

const INTANGIBLE_CSV_TO_DB: Record<string, string> = {
  '라이선스명': 'license_name',
  '공급사': 'vendor_name',
  '수량': 'quantity',
  '부서': 'department_code',
  '자산유형': 'asset_type_code',
  '시작일': 'start_date',
  '만료일': 'expiry_date',
  '비고': 'note',
};

export function mapIntangibleCsvRows(
  csvRows: Record<string, string>[],
  lookup: LookupTables,
): CsvMapResult<Record<string, any>> {
  const today = new Date().toISOString().slice(0, 10);
  const mapped: Record<string, any>[] = [];
  const warnings: string[] = [];
  let failCount = 0;

  const deptMap = new Map(lookup.departments.map(d => [normalizeText(d.department_name), d.department_code]));
  const typeMap = new Map(lookup.assetTypes.map(t => [normalizeText(t.sub_category), t.asset_type_code]));

  for (let i = 0; i < csvRows.length; i++) {
    const csv = csvRows[i];
    const lineNum = i + 2;
    const row: Record<string, any> = {};
    let skip = false;

    for (const [csvKey, dbKey] of Object.entries(INTANGIBLE_CSV_TO_DB)) {
      const val = csv[csvKey]?.trim() ?? '';

      if (dbKey === 'department_code') {
        if (val) {
          const code = deptMap.get(normalizeText(val));
          if (code) row[dbKey] = code;
          else { warnings.push(`${lineNum}행: 부서 "${val}" 매핑 실패`); row[dbKey] = null; }
        } else row[dbKey] = null;
      } else if (dbKey === 'asset_type_code') {
        if (val) {
          const code = typeMap.get(normalizeText(val));
          if (code) row[dbKey] = code;
          else { warnings.push(`${lineNum}행: 자산유형 "${val}" 매핑 실패`); row[dbKey] = null; }
        } else row[dbKey] = null;
      } else if (dbKey === 'quantity') {
        row[dbKey] = val ? parseInt(val, 10) || 0 : 0;
      } else if (dbKey === 'start_date' || dbKey === 'expiry_date') {
        row[dbKey] = val && /^\d{4}-\d{2}-\d{2}$/.test(val) ? val : (val ? (warnings.push(`${lineNum}행: ${csvKey} "${val}" 형식 오류 (YYYY-MM-DD)`), today) : today);
      } else if (dbKey === 'license_name') {
        if (!val) { warnings.push(`${lineNum}행: 라이선스명 비어 있음 - 스킵`); skip = true; failCount++; }
        row[dbKey] = val;
      } else {
        row[dbKey] = val || null;
      }
    }

    if (!skip) mapped.push(row);
  }

  return { rows: mapped, warnings, successCount: mapped.length, failCount };
}

export function intangibleRowToCsvRow(
  row: Record<string, any>,
  lookup: LookupTables,
): string[] {
  const deptMap = new Map(lookup.departments.map(d => [d.department_code, d.department_name]));
  const typeMap = new Map(lookup.assetTypes.map(t => [t.asset_type_code, t.sub_category]));

  return [
    row.license_name ?? '',
    row.vendor_name ?? '',
    String(row.quantity ?? 0),
    deptMap.get(row.department_code) ?? row.department_code ?? '',
    typeMap.get(row.asset_type_code) ?? row.asset_type_code ?? '',
    row.start_date ?? '',
    row.expiry_date ?? '',
    row.note ?? '',
  ];
}

export function downloadIntangibleCsv(
  rows: Record<string, any>[],
  lookup: LookupTables,
  filename = 'IT_무형자산.csv',
) {
  const data = rows.map(r => intangibleRowToCsvRow(r, lookup));
  downloadCsv(filename, INTANGIBLE_CSV_HEADERS, data);
}

export function downloadIntangibleTemplate() {
  downloadCsv('IT_무형자산_템플릿.csv', INTANGIBLE_CSV_HEADERS, []);
}
