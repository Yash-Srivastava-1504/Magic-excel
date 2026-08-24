import { Sheet } from "lucide-react";
import type { ExcelFile } from "@/lib/useSpreadsheet";

interface SheetTabsProps {
  files: ExcelFile[];
  activeFile: ExcelFile;
  onSelect: (id: string) => void;
}

/**
 * Shows sheet tabs for all sheets that belong to the same uploaded Excel file
 * as the current active file. Only renders when there are 2+ sheets.
 */
export default function SheetTabs({ files, activeFile, onSelect }: SheetTabsProps) {
  const sheets = files.filter((f) => f.sourceFileId === activeFile.sourceFileId);
  if (sheets.length < 2) return null;

  return (
    <div className="flex items-center border-t border-sheet-grid bg-sheet-header overflow-x-auto scrollbar-thin shrink-0 h-7 px-1 gap-0.5">
      {sheets.map((sheet) => {
        const isActive = sheet.id === activeFile.id;
        return (
          <button
            key={sheet.id}
            onClick={() => onSelect(sheet.id)}
            className={`flex items-center gap-1 px-3 h-full text-[11px] rounded-t border-x border-t transition-all shrink-0 max-w-[180px] ${
              isActive
                ? "bg-card text-foreground font-medium border-sheet-grid border-b-0 -mb-px z-10"
                : "bg-transparent text-muted-foreground border-transparent hover:bg-accent/40 hover:text-foreground"
            }`}
          >
            <Sheet className={`h-3 w-3 shrink-0 ${isActive ? "text-primary" : "opacity-60"}`} />
            <span className="truncate">{sheet.name}</span>
            {sheet.data.length > 0 && (
              <span className="text-[9px] text-muted-foreground/60 shrink-0">{sheet.data.length}r</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
