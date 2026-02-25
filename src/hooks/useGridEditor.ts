import { useState, useCallback, useMemo, useEffect, useRef } from 'react';

export type RowStatus = 'clean' | 'new' | 'updated' | 'deleted';

export interface GridRow<T> {
  data: T;
  status: RowStatus;
  tempId: string;
}

export interface GridEditorOptions<T> {
  idField: keyof T;
  newRowTemplate: () => Partial<T>;
}

let _tempCounter = 0;
const genTempId = () => `_tmp_${++_tempCounter}_${Date.now()}`;

export function useGridEditor<T>(
  serverData: T[],
  options: GridEditorOptions<T>,
) {
  const [rows, setRows] = useState<GridRow<T>[]>([]);
  const hasDirtyRef = useRef(false);

  // Sync from server data only when no dirty changes
  useEffect(() => {
    if (hasDirtyRef.current) return;
    setRows(serverData.map((d) => ({
      data: d,
      status: 'clean' as RowStatus,
      tempId: String((d as any)[options.idField] ?? genTempId()),
    })));
  }, [serverData, options.idField]);

  const addRow = useCallback(() => {
    const tempId = genTempId();
    setRows((prev) => [
      { data: { ...options.newRowTemplate() } as T, status: 'new', tempId },
      ...prev,
    ]);
  }, [options]);

  const addRows = useCallback((dataList: Partial<T>[]) => {
    const newRows = dataList.map((d) => ({
      data: { ...options.newRowTemplate(), ...d } as T,
      status: 'new' as RowStatus,
      tempId: genTempId(),
    }));
    setRows((prev) => [...newRows, ...prev]);
  }, [options]);

  const updateCell = useCallback((tempId: string, field: keyof T, value: any) => {
    setRows((prev) => prev.map((r) => {
      if (r.tempId !== tempId) return r;
      const newData = { ...r.data, [field]: value };
      const newStatus: RowStatus = r.status === 'new' ? 'new' : r.status === 'deleted' ? 'deleted' : 'updated';
      return { ...r, data: newData, status: newStatus };
    }));
  }, []);

  const markDeleted = useCallback((tempIds: string[]) => {
    setRows((prev) =>
      prev
        .filter((r) => !(tempIds.includes(r.tempId) && r.status === 'new'))
        .map((r) => {
          if (!tempIds.includes(r.tempId)) return r;
          if (r.status === 'deleted') return { ...r, status: 'clean' as RowStatus }; // toggle off
          return { ...r, status: 'deleted' as RowStatus };
        })
    );
  }, []);

  const reset = useCallback(() => {
    hasDirtyRef.current = false;
    setRows(serverData.map((d) => ({
      data: d,
      status: 'clean' as RowStatus,
      tempId: String((d as any)[options.idField] ?? genTempId()),
    })));
  }, [serverData, options.idField]);

  const forceSync = useCallback(() => {
    hasDirtyRef.current = false;
    setRows(serverData.map((d) => ({
      data: d,
      status: 'clean' as RowStatus,
      tempId: String((d as any)[options.idField] ?? genTempId()),
    })));
  }, [serverData, options.idField]);

  const dirtyStats = useMemo(() => {
    const added = rows.filter((r) => r.status === 'new').length;
    const updated = rows.filter((r) => r.status === 'updated').length;
    const deleted = rows.filter((r) => r.status === 'deleted').length;
    return { added, updated, deleted };
  }, [rows]);

  const hasDirty = dirtyStats.added > 0 || dirtyStats.updated > 0 || dirtyStats.deleted > 0;

  // Keep ref in sync
  useEffect(() => {
    hasDirtyRef.current = hasDirty;
  }, [hasDirty]);

  const getChanges = useCallback(() => ({
    inserts: rows.filter((r) => r.status === 'new').map((r) => r.data),
    updates: rows.filter((r) => r.status === 'updated').map((r) => r.data),
    deletes: rows.filter((r) => r.status === 'deleted').map((r) => r.data),
  }), [rows]);

  return { rows, addRow, addRows, updateCell, markDeleted, reset, forceSync, dirtyStats, hasDirty, getChanges };
}
