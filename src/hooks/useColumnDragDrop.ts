import { useState, useCallback, useEffect } from 'react';

export function useColumnDragDrop<T extends { key: string }>(initialColumns: T[]) {
  const [columnOrder, setColumnOrder] = useState<string[]>([]);
  const [dragState, setDragState] = useState<{
    draggingKey: string | null;
    overKey: string | null;
  }>({ draggingKey: null, overKey: null });

  // initialColumns가 바뀌면 순서 초기화
  useEffect(() => {
    setColumnOrder(initialColumns.map((c) => c.key));
  }, [initialColumns]);

  const orderedColumns = useCallback(
    (cols: T[]): T[] => {
      if (columnOrder.length === 0) return cols;
      const map = new Map(cols.map((c) => [c.key, c]));
      const ordered: T[] = [];
      for (const key of columnOrder) {
        const col = map.get(key);
        if (col) ordered.push(col);
      }
      for (const col of cols) {
        if (!columnOrder.includes(col.key)) ordered.push(col);
      }
      return ordered;
    },
    [columnOrder],
  );

  const onDragStart = useCallback((key: string) => {
    setDragState({ draggingKey: key, overKey: null });
  }, []);

  const onDragOver = useCallback(
    (key: string) => {
      if (dragState.draggingKey && dragState.draggingKey !== key) {
        setDragState((prev) => ({ ...prev, overKey: key }));
      }
    },
    [dragState.draggingKey],
  );

  const onDragEnd = useCallback(() => {
    if (dragState.draggingKey && dragState.overKey) {
      setColumnOrder((prev) => {
        const newOrder = [...prev];
        const fromIndex = newOrder.indexOf(dragState.draggingKey!);
        const toIndex = newOrder.indexOf(dragState.overKey!);
        if (fromIndex === -1 || toIndex === -1) return prev;
        newOrder.splice(fromIndex, 1);
        newOrder.splice(toIndex, 0, dragState.draggingKey!);
        return newOrder;
      });
    }
    setDragState({ draggingKey: null, overKey: null });
  }, [dragState]);

  const resetOrder = useCallback(() => {
    setColumnOrder(initialColumns.map((c) => c.key));
  }, [initialColumns]);

  return {
    orderedColumns,
    columnOrder,
    dragState,
    onDragStart,
    onDragOver,
    onDragEnd,
    resetOrder,
  };
}
