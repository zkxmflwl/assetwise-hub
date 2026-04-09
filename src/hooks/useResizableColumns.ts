import { useState, useCallback, useRef, useEffect } from 'react';

export interface ColumnSizing {
  [columnId: string]: number;
}

export interface RowSizing {
  [rowId: string]: number;
}

export function useResizableColumns(storageKey?: string) {
  const [columnSizing, setColumnSizing] = useState<ColumnSizing>({});
  const [rowSizing, setRowSizing] = useState<RowSizing>({});
  const colResizingRef = useRef<{
    columnId: string;
    startX: number;
    startWidth: number;
  } | null>(null);
  const rowResizingRef = useRef<{
    rowId: string;
    startY: number;
    startHeight: number;
  } | null>(null);

  // Load saved sizes from localStorage
  useEffect(() => {
    if (storageKey) {
      try {
        const savedCol = localStorage.getItem(`col-sizing-${storageKey}`);
        if (savedCol) setColumnSizing(JSON.parse(savedCol));
        const savedRow = localStorage.getItem(`row-sizing-${storageKey}`);
        if (savedRow) setRowSizing(JSON.parse(savedRow));
      } catch {
        // ignore
      }
    }
  }, [storageKey]);

  // Save column sizes
  useEffect(() => {
    if (storageKey && Object.keys(columnSizing).length > 0) {
      localStorage.setItem(`col-sizing-${storageKey}`, JSON.stringify(columnSizing));
    }
  }, [columnSizing, storageKey]);

  // Save row sizes
  useEffect(() => {
    if (storageKey && Object.keys(rowSizing).length > 0) {
      localStorage.setItem(`row-sizing-${storageKey}`, JSON.stringify(rowSizing));
    }
  }, [rowSizing, storageKey]);

  // ── Column resize ──
  const onColResizeStart = useCallback(
    (columnId: string, startX: number, currentWidth: number) => {
      colResizingRef.current = { columnId, startX, startWidth: currentWidth };

      const onMouseMove = (e: MouseEvent) => {
        if (!colResizingRef.current) return;
        const diff = e.clientX - colResizingRef.current.startX;
        const newWidth = Math.max(50, colResizingRef.current.startWidth + diff);
        setColumnSizing((prev) => ({ ...prev, [colResizingRef.current!.columnId]: newWidth }));
      };

      const onMouseUp = () => {
        colResizingRef.current = null;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };

      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    },
    [],
  );

  // ── Row resize ──
  const onRowResizeStart = useCallback(
    (rowId: string, startY: number, currentHeight: number) => {
      rowResizingRef.current = { rowId, startY, startHeight: currentHeight };

      const onMouseMove = (e: MouseEvent) => {
        if (!rowResizingRef.current) return;
        const diff = e.clientY - rowResizingRef.current.startY;
        const newHeight = Math.max(24, rowResizingRef.current.startHeight + diff);
        setRowSizing((prev) => ({ ...prev, [rowResizingRef.current!.rowId]: newHeight }));
      };

      const onMouseUp = () => {
        rowResizingRef.current = null;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };

      document.body.style.cursor = 'row-resize';
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    },
    [],
  );

  const getRowHeight = useCallback(
    (rowId: string): number | undefined => rowSizing[rowId],
    [rowSizing],
  );

  const resetSizing = useCallback(() => {
    setColumnSizing({});
    setRowSizing({});
    if (storageKey) {
      localStorage.removeItem(`col-sizing-${storageKey}`);
      localStorage.removeItem(`row-sizing-${storageKey}`);
    }
  }, [storageKey]);

  return {
    columnSizing,
    setColumnSizing,
    rowSizing,
    getRowHeight,
    onColResizeStart,
    onRowResizeStart,
    resetSizing,
  };
}
