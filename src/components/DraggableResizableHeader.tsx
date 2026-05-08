import { useRef, useMemo } from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown, Filter, X, GripVertical } from 'lucide-react';

// 헤더 레이블 기준 최소 컬럼 너비 계산 (canvas 실측)
function measureTextWidth(text: string): number {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return text.length * 8;
    ctx.font = '600 12px Inter, -apple-system, BlinkMacSystemFont, sans-serif';
    return ctx.measureText(text).width;
  } catch {
    return text.length * 8;
  }
}

interface DraggableResizableHeaderProps {
  colKey: string;
  label: string;
  width?: number;
  sortKey: string | null;
  sortDir: 'asc' | 'desc' | null;
  onSort: (key: string) => void;
  onResizeStart: (colKey: string, startX: number, currentWidth: number, minWidth?: number) => void;
  isDragging: boolean;
  isDragOver: boolean;
  onDragStart: (key: string) => void;
  onDragOver: (key: string) => void;
  onDragEnd: () => void;
  showFilter?: boolean;
  activeFilterCol?: string | null;
  setActiveFilterCol?: (key: string | null) => void;
  filterValue?: string;
  onFilterChange?: (key: string, value: string) => void;
  clearFilter?: (key: string) => void;
}

export default function DraggableResizableHeader({
  colKey,
  label,
  width,
  sortKey,
  sortDir,
  onSort,
  onResizeStart,
  isDragging,
  isDragOver,
  onDragStart,
  onDragOver,
  onDragEnd,
  showFilter,
  activeFilterCol,
  setActiveFilterCol,
  filterValue,
  onFilterChange,
  clearFilter,
}: DraggableResizableHeaderProps) {
  const thRef = useRef<HTMLTableCellElement>(null);

  // 헤더 텍스트 + 아이콘 기반 최소 너비 계산
  // 레이아웃: [px-3 12px] [grip 12px] [gap 4px] [text] [gap 4px] [sort 12px] [?gap 4px] [?filter 16px] [px-3 12px]
  const minWidth = useMemo(() => {
    const textW = measureTextWidth(label);
    const PAD = 24;       // px-3 양쪽
    const GRIP = 16;      // grip 아이콘(12) + gap-1(4)
    const SORT = 16;      // gap-1(4) + sort 아이콘(12)
    const FILTER = 20;    // gap-1(4) + p-0.5×2(4) + filter 아이콘(12)
    return Math.ceil(textW + PAD + GRIP + SORT + (showFilter ? FILTER : 0));
  }, [label, showFilter]);

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const currentWidth = Math.max(minWidth, width || thRef.current?.getBoundingClientRect().width || 100);
    onResizeStart(colKey, e.clientX, currentWidth, minWidth);
  };

  return (
    <th
      ref={thRef}
      style={
        width
          ? { width: `${Math.max(width, minWidth)}px`, minWidth: `${minWidth}px`, maxWidth: `${Math.max(width, minWidth)}px` }
          : { minWidth: `${minWidth}px` }
      }
      className={`relative whitespace-nowrap border-r border-border/50 last:border-r-0 px-3 py-2.5 text-left font-semibold text-foreground select-none
        ${isDragOver ? 'bg-primary/10 border-l-2 border-l-primary' : ''}
        ${isDragging ? 'opacity-50' : ''}
      `}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        const el = document.createElement('div');
        el.textContent = label;
        el.style.cssText =
          'position:absolute;top:-9999px;padding:4px 12px;background:#3b82f6;color:#fff;border-radius:6px;font-size:12px;font-weight:600;white-space:nowrap;';
        document.body.appendChild(el);
        e.dataTransfer.setDragImage(el, 0, 0);
        setTimeout(() => document.body.removeChild(el), 0);
        onDragStart(colKey);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        onDragOver(colKey);
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDragEnd();
      }}
      onDragEnd={onDragEnd}
    >
      <div className="flex items-center gap-1">
        <GripVertical className="h-3 w-3 shrink-0 cursor-grab text-muted-foreground/40 hover:text-muted-foreground active:cursor-grabbing" />
        <button
          onClick={() => onSort(colKey)}
          className="flex items-center gap-1 hover:text-primary transition-colors"
        >
          {label}
          {sortKey === colKey ? (
            sortDir === 'asc' ? (
              <ArrowUp className="h-3 w-3 text-primary" />
            ) : (
              <ArrowDown className="h-3 w-3 text-primary" />
            )
          ) : (
            <ArrowUpDown className="h-3 w-3 opacity-30" />
          )}
        </button>
        {showFilter && setActiveFilterCol && (
          <button
            onClick={() => setActiveFilterCol(activeFilterCol === colKey ? null : colKey)}
            className={`p-0.5 rounded hover:bg-muted-foreground/20 ${filterValue ? 'text-primary' : 'text-muted-foreground/40'}`}
          >
            <Filter className="h-3 w-3" />
          </button>
        )}
      </div>
      {showFilter && activeFilterCol === colKey && onFilterChange && (
        <div className="mt-1 flex items-center gap-1">
          <input
            autoFocus
            value={filterValue || ''}
            onChange={(e) => onFilterChange(colKey, e.target.value)}
            placeholder="필터..."
            className="w-full rounded border border-border bg-background px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {filterValue && clearFilter && (
            <button onClick={() => clearFilter(colKey)} className="text-muted-foreground hover:text-foreground">
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      )}
      <div
        onMouseDown={handleResizeMouseDown}
        className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize bg-transparent hover:bg-primary/30 active:bg-primary/50 transition-colors"
        style={{ touchAction: 'none' }}
      />
    </th>
  );
}
