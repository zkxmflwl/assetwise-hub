import { useState, useCallback, useRef, useEffect } from 'react';

export interface ColumnSizing {
  [columnId: string]: number;
}

export function useResizableColumns(storageKey?: string) {
  const [columnSizing, setColumnSizing] = useState<ColumnSizing>({});
  const [rowHeight, setRowHeight] = useState<number>(32); // default row height in px
  const resizingRef = useRef<{
    columnId: string;
    startX: number;
    startWidth: number;
  } | null>(null);

  // Load saved sizes from localStorage
  useEffect(() => {
    if (storageKey) {
      try {
        const saved = localStorage.getItem(`col-sizing-${storageKey}`);
        if (saved) setColumnSizing(JSON.parse(saved));
        const savedRow = localStorage.getItem(`row-height-${storageKey}`);
        if (savedRow) setRowHeight(Number(savedRow));
      } catch {
        // ignore
      }
    }
  }, [storageKey]);

  // Save sizes to localStorage
  useEffect(() => {
    if (storageKey && Object.keys(columnSizing).length > 0) {
      localStorage.setItem(`col-sizing-${storageKey}`, JSON.stringify(columnSizing));
    }
  }, [columnSizing, storageKey]);

  useEffect(() => {
    if (storageKey) {
      localStorage.setItem(`row-height-${storageKey}`, String(rowHeight));
    }
  }, [rowHeight, storageKey]);

  const onResizeStart = useCallback(
    (columnId: string, startX: number, currentWidth: number) => {
      resizingRef.current = { columnId, startX, startWidth: currentWidth };

      const onMouseMove = (e: MouseEvent) => {
        if (!resizingRef.current) return;
        const diff = e.clientX - resizingRef.current.startX;
        const newWidth = Math.max(50, resizingRef.current.startWidth + diff);
        setColumnSizing((prev) => ({ ...prev, [resizingRef.current!.columnId]: newWidth }));
      };

      const onMouseUp = () => {
        resizingRef.current = null;
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

  const resetSizing = useCallback(() => {
    setColumnSizing({});
    setRowHeight(32);
    if (storageKey) {
      localStorage.removeItem(`col-sizing-${storageKey}`);
      localStorage.removeItem(`row-height-${storageKey}`);
    }
  }, [storageKey]);

  return {
    columnSizing,
    setColumnSizing,
    rowHeight,
    setRowHeight,
    onResizeStart,
    resetSizing,
  };
}
