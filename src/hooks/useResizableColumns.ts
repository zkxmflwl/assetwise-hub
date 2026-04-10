import { useState, useCallback } from 'react';

export interface ColumnSizing {
  [columnId: string]: number;
}

export interface RowSizing {
  [rowId: string]: number;
}

export function useResizableColumns() {
  const [columnSizing, setColumnSizing] = useState<ColumnSizing>({});
  const [rowSizing, setRowSizing] = useState<RowSizing>({});

  const onColResizeStart = useCallback(
    (columnId: string, startX: number, currentWidth: number, minWidth = 50) => {
      const startWidth = currentWidth;

      const onMouseMove = (e: MouseEvent) => {
        const diff = e.clientX - startX;
        const newWidth = Math.max(minWidth, startWidth + diff);
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
  }, []);

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
