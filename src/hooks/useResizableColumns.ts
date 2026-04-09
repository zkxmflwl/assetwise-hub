import { useState, useCallback, useEffect } from 'react';

export interface ColumnSizing {
  [columnId: string]: number;
}

export interface RowSizing {
  [rowId: string]: number;
}

export function useResizableColumns(storageKey?: string) {
  const [columnSizing, setColumnSizing] = useState<ColumnSizing>({});
  const [rowSizing, setRowSizing] = useState<RowSizing>({});

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

  useEffect(() => {
    if (storageKey && Object.keys(columnSizing).length > 0) {
      localStorage.setItem(`col-sizing-${storageKey}`, JSON.stringify(columnSizing));
    }
  }, [columnSizing, storageKey]);

  useEffect(() => {
    if (storageKey && Object.keys(rowSizing).length > 0) {
      localStorage.setItem(`row-sizing-${storageKey}`, JSON.stringify(rowSizing));
    }
  }, [rowSizing, storageKey]);

  const onColResizeStart = useCallback(
    (columnId: string, startX: number, currentWidth: number) => {
      const startWidth = currentWidth;

      const onMouseMove = (e: MouseEvent) => {
        const diff = e.clientX - startX;
        const newWidth = Math.max(50, startWidth + diff);
        setColumnSizing((prev) => ({ ...prev, [columnId]: newWidth }));
      };

      const onMouseUp = () => {
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

  const onRowResizeStart = useCallback(
    (rowId: string, startY: number, currentHeight: number) => {
      const startHeight = currentHeight;

      const onMouseMove = (e: MouseEvent) => {
        const diff = e.clientY - startY;
        const newHeight = Math.max(24, startHeight + diff);
        setRowSizing((prev) => ({ ...prev, [rowId]: newHeight }));
      };

      const onMouseUp = () => {
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