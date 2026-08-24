import { FileSpreadsheet, X, Plus } from "lucide-react";
import type { ExcelFile } from "@/lib/useSpreadsheet";

interface FileTabsProps {
  files: ExcelFile[];
  activeFileId: string | null;
  onSelect: (id: string) => void;
  /** Removes all sheets belonging to the given sourceFileId */
  onRemove: (sourceFileId: string) => void;
  onAddNew: () => void;
}

export default function FileTabs({ files, activeFileId, onSelect, onRemove, onAddNew }: FileTabsProps) {
  const activeFile = files.find((f) => f.id === activeFileId);

  // One tab per unique sourceFileId (one tab per uploaded Excel file)
  const seen = new Set<string>();
  const uniqueFiles = files.filter((f) => {
    if (seen.has(f.sourceFileId)) return false;
    seen.add(f.sourceFileId);
    return true;
  });

  return (
    <div className="flex items-center w-full border-t border-sheet-grid bg-sheet-header overflow-x-auto scrollbar-thin shrink-0 h-8">
      <div className="flex">
        {uniqueFiles.map((file) => {
          const isActive = activeFile?.sourceFileId === file.sourceFileId;
          // When clicking an inactive file tab, switch to its first sheet
          const firstSheetId = files.find((f) => f.sourceFileId === file.sourceFileId)?.id ?? file.id;
          const totalRows = files
            .filter((f) => f.sourceFileId === file.sourceFileId)
            .reduce((sum, f) => sum + f.data.length, 0);

          return (
            <div
              key={file.sourceFileId}
              onClick={() => { if (!isActive) onSelect(firstSheetId); }}
              className={`group flex items-center gap-1.5 px-3 py-1 cursor-pointer transition-all border-r border-sheet-grid min-w-[120px] max-w-[200px] shrink-0 text-xs ${
                isActive
                  ? "bg-card text-foreground font-medium border-b-2 border-b-primary"
                  : "bg-transparent text-muted-foreground hover:bg-accent/50 border-b-2 border-b-transparent"
              }`}
            >
              <FileSpreadsheet className={`h-3 w-3 shrink-0 ${isActive ? "text-primary" : "opacity-70"}`} />
              <span className="truncate">{file.fileName}</span>
              <span className="text-[9px] text-muted-foreground/70">{totalRows}r</span>
              <button
                onClick={(e) => { e.stopPropagation(); onRemove(file.sourceFileId); }}
                className={`p-0.5 rounded transition-all ${isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"} hover:bg-destructive/15 text-muted-foreground hover:text-destructive`}
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </div>
          );
        })}
      </div>
      <div className="px-1 shrink-0">
        <button onClick={onAddNew} className="p-1 rounded hover:bg-accent text-muted-foreground transition-colors" title="Add file">
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
