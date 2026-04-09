import { useState, useCallback, useEffect } from 'react';

export function useColumnDragDrop<T extends { key: string }>(initialColumns: T[], storageKey?: string) {
  const [columnOrder, setColumnOrder] = useState<string[]>([]);
  const [dragState, setDragState] = useState<{
    draggingKey: string | null;
    overKey: string | null;
  }>({ draggingKey: null, overKey: null });

  useEffect(() => {
    if (storageKey) {
      try {
        const saved = localStorage.getItem(`col-order-${storageKey}`);
        if (saved) {
          const parsed = JSON.parse(saved) as string[];
          const initialKeys = new Set(initialColumns.map((c) => c.key));
          const validSaved = parsed.filter((k) => initialKeys.has(k));
          const newKeys = initialColumns.map((c) => c.key).filter((k) => !validSaved.includes(k));
          setColumnOrder([...validSaved, ...newKeys]);
          return;
        }
      } catch {
        // ignore
      }
    }
    setColumnOrder(initialColumns.map((c) => c.key));
  }, [initialColumns, storageKey]);

  useEffect(() => {
    if (storageKey && columnOrder.length > 0) {
      localStorage.setItem(`col-order-${storageKey}`, JSON.stringify(columnOrder));
    }
  }, [columnOrder, storageKey]);

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
    if (storageKey) {
      localStorage.removeItem(`col-order-${storageKey}`);
    }
  }, [initialColumns, storageKey]);

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
