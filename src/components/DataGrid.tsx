import React, { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { X } from "lucide-react";
import type { SpreadsheetRow } from "@/lib/mockData";
import { type CellStyleMap, cellKey, styleToCss } from "@/lib/cellStyles";
import type { PipelineExecutionResult } from "@/lib/pipelineEngine";

interface DataGridProps {
  data: SpreadsheetRow[];
  columns: string[];
  titleRows?: SpreadsheetRow[];
  pipelineResult: PipelineExecutionResult | null;
  onCellEdit?: (rowIndex: number, col: string, newValue: string | number) => void;
  onTitleEdit?: (titleIndex: number, col: string, newValue: string | number) => void;
  onSelectionChange?: (cells: { rowIndex: number; col: string }[]) => void;
}

interface EditingCell { isTitle?: boolean; rowIndex: number; col: string; value: string; }

const ROW_HEIGHT = 28;
const OVERSCAN = 5;
const COL_WIDTH = 120;
const ROW_NUM_WIDTH = 46;

const getColLetter = (i: number): string => {
  let result = "";
  let n = i;
  while (n >= 0) {
    result = String.fromCharCode(65 + (n % 26)) + result;
    n = Math.floor(n / 26) - 1;
  }
  return result;
};

const inferColumnType = (data: SpreadsheetRow[], col: string): "number" | "string" => {
  const samples = data.map((row) => row[col]).filter((v) => v !== null && v !== undefined && v !== "").slice(0, 20);
  if (samples.length === 0) return "string";
  const numericCount = samples.filter((v) => typeof v === "number" || !isNaN(Number(v))).length;
  return numericCount / samples.length > 0.8 ? "number" : "string";
};

export default function DataGrid({ 
  data, 
  columns, 
  titleRows = [], 
  pipelineResult,
  onSelectionChange, 
  onCellEdit, 
  onTitleEdit 
}: DataGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewHeight, setViewHeight] = useState(600);
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [colPopup, setColPopup] = useState<{ col: string; x: number; y: number } | null>(null);

  const displayData    = pipelineResult ? pipelineResult.transformedData : data;
  const displayColumns = pipelineResult ? pipelineResult.columns         : columns;
  const displayStyles  = pipelineResult ? pipelineResult.cellStyles      : new Map();

  const { affectedIds, scopedIds } = useMemo(() => {
    const affected = new Map<number, "delete" | "modify" | "add" | "highlight">();
    const scoped = pipelineResult?.highlightedRowIds || new Set<number>();
    
    if (pipelineResult) {
      pipelineResult.steps.forEach(step => {
        const type = step.operation.type;
        step.affectedRowIds.forEach(id => {
          if (type === "delete_rows" || type === "remove_duplicates") affected.set(id, "delete");
          else if (type === "update_cells" || type === "update_cells_all") affected.set(id, "modify");
          else if (type === "add_column") affected.set(id, "add");
          else if (type === "highlight") affected.set(id, "highlight");
        });
      });
    }
    return { affectedIds: affected, scopedIds: scoped };
  }, [pipelineResult]);

  const originalDataMap = useMemo(() => {
    return new Map(data.map(r => [r.ID, r]));
  }, [data]);

  const columnTypes = useMemo(() => {
    return new Map(displayColumns.map((col) => [col, inferColumnType(displayData, col)]));
  }, [displayData, displayColumns]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([entry]) => setViewHeight(entry.contentRect.height));
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (editingCell && inputRef.current) { inputRef.current.focus(); inputRef.current.select(); }
  }, [editingCell?.rowIndex, editingCell?.col]);

  useEffect(() => {
    if (!onSelectionChange) return;
    if (selectedCell) {
      const col = displayColumns[selectedCell.col];
      if (col) onSelectionChange([{ rowIndex: selectedCell.row, col }]);
    } else {
      onSelectionChange([]);
    }
  }, [selectedCell, displayColumns, onSelectionChange]);

  const onScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => setScrollTop(e.currentTarget.scrollTop), []);

  const totalHeight = displayData.length * ROW_HEIGHT;
  const startIdx = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const endIdx = Math.min(displayData.length, Math.ceil((scrollTop + viewHeight) / ROW_HEIGHT) + OVERSCAN);
  const visibleRows = displayData.slice(startIdx, endIdx);

  const startEdit = (rowIndex: number, row: SpreadsheetRow, col: string, isTitle = false) => {
    setEditingCell({ isTitle, rowIndex, col, value: String(row[col] ?? "") });
  };

  const commitEdit = useCallback(() => {
    if (editingCell) {
      if (editingCell.isTitle && onTitleEdit) onTitleEdit(editingCell.rowIndex, editingCell.col, editingCell.value);
      else if (!editingCell.isTitle && onCellEdit) onCellEdit(editingCell.rowIndex, editingCell.col, editingCell.value);
    }
    setEditingCell(null);
  }, [editingCell, onCellEdit, onTitleEdit]);

  const getRowStyle = (row: SpreadsheetRow): React.CSSProperties => {
    const opType = affectedIds.get(row.ID);
    const isDeleted = pipelineResult?.deletedRowIds.has(row.ID);
    const isScoped = scopedIds.has(row.ID);
    const hasShowOpsActive = scopedIds.size > 0;
    if (isDeleted) return { background: "hsl(var(--diff-delete) / 0.15)", opacity: 0.75, textDecoration: "line-through", textDecorationColor: "hsl(var(--diff-delete) / 0.4)" };
    if (opType === "modify") return { background: "hsl(var(--diff-modify) / 0.15)" };
    if (opType === "add")    return { background: "hsl(var(--diff-add) / 0.15)" };
    if (hasShowOpsActive && !isScoped) return { opacity: 0.45 };
    
    // Default zebra striping for rows
    const absoluteIndex = displayData.indexOf(row);
    if (absoluteIndex % 2 === 1) return { background: "hsl(var(--sheet-zebra))" };
    
    return {};
  };

  const getCellStyleCss = (rowIndex: number, col: string): React.CSSProperties => {
    const key = cellKey(rowIndex, col);
    const style = (displayStyles instanceof Map) 
      ? displayStyles.get(key) 
      : (displayStyles as any)[key];
    const css = styleToCss(style);
    
    // Ensure Flexbox alignments work within the grid cell
    const type = columnTypes.get(col);
    if (!css.textAlign && type === "number") {
      css.textAlign = "center";
    }

    if (css.textAlign) {
      css.justifyContent = css.textAlign === "left" ? "flex-start" : css.textAlign === "right" ? "flex-end" : "center";
    }
    return css;
  };

  const minWidth = ROW_NUM_WIDTH + displayColumns.length * COL_WIDTH;
  const isTitleSelected = selectedCell?.row !== undefined && selectedCell.row <= -1000;
  const titleRowActualIndex = isTitleSelected ? selectedCell.row + 1000 : 0;

  const formulaCellRef = selectedCell
    ? `${getColLetter(selectedCell.col)}${isTitleSelected ? `(Title ${titleRowActualIndex + 1})` : selectedCell.row + 1}`
    : "A1";

  const formulaCellValue = selectedCell
    ? isTitleSelected
      ? String(titleRows[titleRowActualIndex]?.[displayColumns[selectedCell.col]] ?? "")
      : String(displayData[selectedCell.row]?.[displayColumns[selectedCell.col]] ?? "")
    : "";

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex items-center border-b border-sheet-grid bg-card h-7 shrink-0">
        <div className="flex items-center border-r border-sheet-grid px-1 min-w-[80px]"><input className="w-16 text-xs text-center bg-transparent outline-none font-medium font-mono" value={formulaCellRef} readOnly /></div>
        <div className="flex-1 px-2 flex items-center"><span className="text-muted-foreground text-sm mr-2 font-medium">fx</span>
          <input
            className="flex-1 text-xs bg-transparent outline-none font-mono"
            value={formulaCellValue}
            onChange={(e) => {
               if (selectedCell) {
                 if (isTitleSelected && onTitleEdit) onTitleEdit(titleRowActualIndex, displayColumns[selectedCell.col], e.target.value);
                 else if (!isTitleSelected && onCellEdit) onCellEdit(selectedCell.row, displayColumns[selectedCell.col], e.target.value);
               }
            }}
          />
        </div>
      </div>

      <div ref={containerRef} onScroll={onScroll} className="flex-1 overflow-auto scrollbar-thin">
        <div style={{ minWidth }}>
          {titleRows.map((r, rIdx) => {
            const actualRowIndex = -1000 + rIdx;
            return (
              <div key={r.ID} className="flex border-b border-sheet-grid group" style={{ height: ROW_HEIGHT }}>
                 <div className="sticky left-0 z-20 bg-sheet-header border-r border-sheet-grid flex items-center justify-center text-[10px] text-muted-foreground font-semibold" style={{ width: ROW_NUM_WIDTH, minWidth: ROW_NUM_WIDTH }}></div>
                 {displayColumns.map((col, cIdx) => {
                   const isEditing = editingCell?.isTitle && editingCell?.rowIndex === rIdx && editingCell?.col === col;
                   const isSelected = selectedCell?.row === actualRowIndex && selectedCell?.col === cIdx;
                   const cellCSS = getCellStyleCss(actualRowIndex, col);
                   return (
                     <div
                       key={col}
                       onClick={() => { if (!isEditing) setSelectedCell({ row: actualRowIndex, col: cIdx }); }}
                       onDoubleClick={() => startEdit(rIdx, r, col, true)}
                       className={`border-r border-sheet-grid/30 px-1 flex items-center cursor-cell transition-colors ${isSelected ? "outline outline-2 outline-sheet-selected-border bg-sheet-selected z-[5] relative" : "hover:bg-accent/30"} ${isEditing ? "p-0 z-20" : "truncate"}`}
                       style={{ ...cellCSS, width: COL_WIDTH, minWidth: COL_WIDTH, height: ROW_HEIGHT }}
                     >
                       {isEditing ? (
                         <input ref={inputRef} className="w-full h-full bg-background text-foreground border-none outline-none font-[inherit] text-[inherit]" value={editingCell.value} onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })} onBlur={commitEdit} onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditingCell(null); }} />
                       ) : (
                         <span className="truncate w-full">{r[col] ?? ""}</span>
                       )}
                     </div>
                   );
                 })}
              </div>
            );
          })}

          <div className="flex sticky top-0 z-10">
            <div className="sticky left-0 z-20 bg-background/80 border-b border-r border-sheet-grid flex items-center justify-center text-[10px] text-muted-foreground font-medium" style={{ width: ROW_NUM_WIDTH, minWidth: ROW_NUM_WIDTH, height: ROW_HEIGHT }} />
            {displayColumns.map((col, i) => {
              const key = cellKey(-1, col);
              const style = (displayStyles instanceof Map) 
                ? displayStyles.get(key) 
                : (displayStyles as any)[key];
              const headerCSS = styleToCss(style);
              return (
                <div key={col} onClick={(e) => {
                    if (e.ctrlKey || e.metaKey) window.dispatchEvent(new CustomEvent("append-command", { detail: `@${col}` }));
                    else { const rect = e.currentTarget.getBoundingClientRect(); setColPopup({ col, x: rect.left, y: rect.bottom + 4 }); }
                  }}
                  className="bg-sheet-header border-b border-r border-sheet-grid flex items-center justify-center text-xs text-white font-bold cursor-pointer hover:bg-white/10 transition-colors select-none shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                  style={{ width: COL_WIDTH, minWidth: COL_WIDTH, height: ROW_HEIGHT, ...headerCSS }}
                  title={`${col} (${getColLetter(i)})`}
                >
                  <span className="truncate px-1 uppercase tracking-tight text-[10px]">{col}</span>
                </div>
              );
            })}
          </div>

          <div style={{ height: totalHeight, position: "relative" }}>
            {visibleRows.map((row, i) => {
              const absoluteIndex = startIdx + i;
              return (
                <div key={row.ID || absoluteIndex} className="flex text-xs border-b border-sheet-grid/50 transition-colors"
                  style={{ position: "absolute", top: absoluteIndex * ROW_HEIGHT, height: ROW_HEIGHT, width: "100%", ...getRowStyle(row) }}
                >
                  <div 
                    className={`sticky left-0 z-10 border-r border-sheet-grid flex items-center justify-center text-[10px] select-none transition-all duration-300
                      ${(pipelineResult?.activeScopeIds === null || pipelineResult?.activeScopeIds.has(row.ID)) && pipelineResult?.highlightedRowIds.has(row.ID)
                        ? "bg-violet-600 text-white font-bold border-l-4 border-l-violet-800 shadow-[inset_-1px_0_0_rgba(0,0,0,0.1)]" 
                        : pipelineResult?.highlightedRowIds.has(row.ID)
                          ? "bg-violet-400/40 text-violet-700/60 font-medium border-l-2 border-l-violet-400/50"
                          : "bg-background/80 text-muted-foreground/60 font-medium"}`} 
                    style={{ width: ROW_NUM_WIDTH, minWidth: ROW_NUM_WIDTH }}>
                    {absoluteIndex + 1}
                  </div>
                  {displayColumns.map((col, colIdx) => {
                    const isEditing = !editingCell?.isTitle && editingCell?.rowIndex === absoluteIndex && editingCell?.col === col;
                    const isSelected = selectedCell?.row === absoluteIndex && selectedCell?.col === colIdx;
                    const cellCSS = getCellStyleCss(absoluteIndex, col);
                    return (
                      <div key={col} onClick={(e) => {
                          if (isEditing) return;
                          setSelectedCell({ row: absoluteIndex, col: colIdx });
                          if (e.ctrlKey || e.metaKey) { e.preventDefault(); window.dispatchEvent(new CustomEvent("append-command", { detail: String(row[col] ?? "") })); }
                        }}
                        onDoubleClick={() => startEdit(absoluteIndex, row, col)}
                        className={`border-r border-sheet-grid/30 px-1 flex items-center cursor-cell select-none transition-colors ${isSelected ? "outline outline-2 outline-sheet-selected-border bg-sheet-selected z-[5] relative" : ""} ${isEditing ? "p-0 overflow-visible z-20" : "hover:bg-accent/30 truncate"}`}
                        style={{ width: COL_WIDTH, minWidth: COL_WIDTH, ...cellCSS }}
                      >
                        {isEditing ? (
                          <input ref={inputRef} className="w-full h-full bg-card outline-none px-1 text-xs" value={editingCell.value} onChange={(e) => setEditingCell((prev) => prev ? { ...prev, value: e.target.value } : null)} onBlur={commitEdit} onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditingCell(null); }} />
                        ) : (() => {
                          const val = String(row[col] ?? "");
                          const originalRow = originalDataMap.get(row.ID);
                          const originalVal = originalRow ? String(originalRow[col] ?? "") : val;
                          
                          // Only show diff if it's a modification to an EXISTING column.
                          // If 'col' wasn't in the base 'columns' list, it's a new column,
                          // and showing a diff from "" (empty) to the new value is confusing.
                          const isOriginalColumn = columns.includes(col);
                          const hasChanged = isOriginalColumn && val !== originalVal && pipelineResult !== null;

                          return (
                            <div className="truncate w-full flex items-baseline gap-1.5 h-full">
                              {hasChanged && (
                                <span className="text-[10px] text-destructive/70 line-through shrink-0 font-mono decoration-destructive/40">
                                  {originalVal || '""'}
                                </span>
                              )}
                              <span className={`truncate ${hasChanged ? "text-[hsl(var(--diff-modify))] font-semibold" : ""}`}>
                                {val}
                              </span>
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {colPopup && (() => {
        const col = colPopup.col;
        const type = columnTypes.get(col) || "string";
        const validValues = displayData.map((r) => r[col]).filter((v) => v !== null && v !== undefined && v !== "");
        const counts = new Map<string, number>();
        validValues.forEach((v) => { const s = String(v); counts.set(s, (counts.get(s) || 0) + 1); });
        const distribution = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
        const popupWidth = 260;
        const adjustedX = Math.min(colPopup.x, window.innerWidth - popupWidth - 16);
        return (
          <div className="fixed inset-0 z-50 pointer-events-none">
            <div className="absolute inset-0 pointer-events-auto" onClick={() => setColPopup(null)} />
            <div className="absolute bg-popover text-foreground border border-border shadow-2xl rounded-md overflow-hidden flex flex-col pointer-events-auto" style={{ top: colPopup.y, left: adjustedX, width: popupWidth, maxHeight: 400 }}>
              <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/50"><span className="text-xs font-semibold font-mono truncate mr-2">@{col}</span><button onClick={() => setColPopup(null)} className="p-1 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"><X className="h-3 w-3" /></button></div>
              <div className="p-3 space-y-4 overflow-y-auto scrollbar-thin text-xs">
                <div className="grid grid-cols-2 gap-3"><div><div className="text-muted-foreground text-[10px] uppercase tracking-wider mb-0.5">Type</div><div className="font-mono capitalize">{type}</div></div><div><div className="text-muted-foreground text-[10px] uppercase tracking-wider mb-0.5">Unique</div><div className="font-mono">{counts.size}</div></div></div>
                {counts.size > 0 && (
                  <div>
                    <div className="text-muted-foreground text-[10px] uppercase tracking-wider mb-1.5 flex justify-between"><span>Distribution</span><span className="opacity-50">Count</span></div>
                    <div className="space-y-1">
                      {distribution.slice(0, 50).map(([val, count]) => (
                        <div key={val} className="flex items-center font-mono hover:bg-accent rounded px-1 -mx-1 py-0.5 transition-colors">
                          <span className="truncate flex-1 mr-2">{val || <span className="text-muted-foreground italic">empty</span>}</span>
                          <span className="text-muted-foreground text-[10px] mr-2 w-7 text-right">{Math.round((count / Math.max(validValues.length, 1)) * 100)}%</span>
                          <span className="w-6 text-right font-medium">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}