import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useTangibleAssets } from '@/hooks/useTangibleAssets';
import { buildDeptColorMap, getDeptRowColor } from '@/utils/departmentColors';
import { useDepartments } from '@/hooks/useDepartments';
import { useAssetTypes } from '@/hooks/useAssetTypes';
import { useAuth } from '@/contexts/AuthContext';
import { useGridEditor, GridRow } from '@/hooks/useGridEditor';
import { TangibleAssetRow } from '@/services/assetService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Trash2, Save, RotateCcw, Loader2, Search, Upload, Download, FileDown, ArrowUp, ArrowDown, ArrowUpDown, Filter, X } from 'lucide-react';
// ✅ 날짜 파싱 유틸리티 추가 임포트
import { parseCsvFile, mapTangibleCsvRows, downloadTangibleCsv, downloadTangibleTemplate, parsePurchaseDate } from '@/utils/csv';

interface ColDef {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select';
  required?: boolean;
  options?: { value: string; label: string }[];
}

type SortDir = 'asc' | 'desc' | null;

export default function ITTangibleAssets() {
  const { hasPermission, authUser } = useAuth();
  const { data: assets = [], isLoading, error, refetch } = useTangibleAssets();
  const { data: departments = [], isLoading: deptLoading } = useDepartments();
  const { data: assetTypes = [], isLoading: typeLoading } = useAssetTypes('유형자산');
  const canEdit = hasPermission('MANAGER');
  const csvInputRef = useRef<HTMLInputElement>(null);

  const { rows, addRow, addRows, updateCell, markDeleted, reset, forceSync, dirtyStats, hasDirty, getChanges } = useGridEditor<TangibleAssetRow>(
    assets,
    {
      idField: 'id',
      newRowTemplate: () => ({
        asset_no: '',
        department_code: null,
        asset_type_code: null,
        manufacturer: '',
        model_name: '',
        serial_no: '',
        cpu_spec: '',
        mem_spec: '',
        hdd_spec: '',
        ssd_spec: '',
        screen_size: '',
        os_name: '',
        purpose: '',
        usage: '',
        purchase_date: new Date().toISOString().slice(0, 10),
        issued_date: new Date().toISOString().slice(0, 10),
        note: '',
      } as any),
    },
  );

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [activeFilterCol, setActiveFilterCol] = useState<string | null>(null);

  const columns: ColDef[] = useMemo(() => [
    { key: 'asset_no', label: '관리번호', type: 'text' },
    { key: 'department_code', label: '소속', type: 'select', options: departments.map(d => ({ value: d.department_code, label: d.department_name })) },
    { key: 'usage', label: '배정', type: 'text' },
    { key: 'purpose', label: '용도', type: 'text' },
    { key: 'asset_type_code', label: '종류', type: 'select', options: assetTypes.map(t => ({ value: t.asset_type_code, label: t.sub_category })) },
    { key: 'manufacturer', label: '제조사', type: 'text' },
    { key: 'model_name', label: '모델', type: 'text' },
    { key: 'serial_no', label: 'S/N', type: 'text' },
    { key: 'cpu_spec', label: 'CPU', type: 'text' },
    { key: 'mem_spec', label: 'MEM', type: 'text' },
    { key: 'hdd_spec', label: 'HDD', type: 'text' },
    { key: 'ssd_spec', label: 'SSD', type: 'text' },
    { key: 'screen_size', label: '화면크기', type: 'text' },
    { key: 'os_name', label: 'OS', type: 'text' },
    { key: 'purchase_date', label: '구매연월', type: 'date' },
    { key: 'issued_date', label: '지급일', type: 'date' },
    { key: 'note', label: '비고', type: 'text' },
  ], [departments, assetTypes]);

  // ✅ [중요] 붙여넣기 시 텍스트를 시스템 내부 값으로 변환하는 함수
  const mapPastedValue = useCallback((col: ColDef, value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return null;

    if (col.key === 'department_code') {
      const dept = departments.find(d => d.department_name === trimmed || d.department_code === trimmed);
      return dept ? dept.department_code : null;
    }

    if (col.key === 'asset_type_code') {
      const lower = trimmed.toLowerCase();
      // 하드코딩 매핑 규칙 적용
      if (lower === 'laptop') return 'T_NOTEBOOK';
      if (lower === 'monitor' || trimmed === '모니터') return 'T_MONITOR';
      if (lower === 'desktop' || trimmed === '데스크탑') return 'T_PC';
      
      const type = assetTypes.find(t => t.sub_category === trimmed || t.asset_type_code === trimmed);
      return type ? type.asset_type_code : null;
    }

    if (col.type === 'date') {
      // 14.01 등을 2014-01-01로 변환하는 유틸리티 사용
      return parsePurchaseDate(trimmed) || trimmed;
    }

    return trimmed;
  }, [departments, assetTypes]);

  // ✅ [중요] 붙여넣기 이벤트 핸들러
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;

    e.preventDefault();
    const clipboardData = e.clipboardData.getData('text');
    if (!clipboardData) return;

    const rowsData = clipboardData.split(/\r?\n/).filter(line => line.trim() !== '');
    const newAssets: any[] = [];

    rowsData.forEach(line => {
      const cells = line.split('\t');
      const rowData: any = {};

      columns.forEach((col, idx) => {
        if (cells[idx] !== undefined) {
          rowData[col.key] = mapPastedValue(col, cells[idx]);
        }
      });
      
      if (!rowData.issued_date) rowData.issued_date = new Date().toISOString().slice(0, 10);
      newAssets.push(rowData);
    });

    if (newAssets.length > 0) {
      addRows(newAssets);
      toast.success(`${newAssets.length}건의 데이터가 추가되었습니다.`);
    }
  }, [columns, addRows, mapPastedValue]);

  // ... (visibleRows, handleSort, handleSave 등은 기존 로직 유지)

  if (isLoading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      {/* 상단 헤더 및 버튼 생략 (기존 코드 유지) */}
      
      <div className="glass-card overflow-hidden rounded-xl">
        <div className="overflow-x-auto scrollbar-thin" style={{ maxHeight: '70vh' }}>
          {/* ✅ table에 onPaste와 tabIndex 부여 */}
          <table 
            className="w-full text-xs outline-none" 
            onPaste={handlePaste}
            tabIndex={0}
          >
            <thead className="sticky top-0 z-10">
              {/* ... existing thead ... */}
            </thead>
            <tbody>
              {/* ... existing tbody mapping ... */}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}