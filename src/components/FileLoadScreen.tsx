import { useState, useCallback, useRef } from "react";
import { Upload, FileSpreadsheet, ArrowLeft } from "lucide-react";
import logoUrl from "@/assets/logo.png";
import { backendApi } from "@/lib/api";
import type { CellStyleMap } from "@/lib/cellStyles";

interface FileLoadScreenProps {
  onLoad: (name: string, data?: Record<string, string>[], columns?: string[], styles?: CellStyleMap, titleRows?: Record<string, string>[], sourceFileId?: string, fileName?: string) => void;
  hasFiles?: boolean;
  onBack?: () => void;
}

export default function FileLoadScreen({ onLoad, hasFiles, onBack }: FileLoadScreenProps) {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setLoading(true);
    try {
      const response = await backendApi.uploadFile(file);
      const { sourceFileId, fileName, sheets } = response;
      
      if (sheets.length === 1) {
        const { data, titleRows, columns, styles, sheetName } = sheets[0];
        // Convert styles object to Map
        const styleMap = new Map(Object.entries(styles));
        onLoad(fileName, data, columns, styleMap, titleRows, sourceFileId);
      } else {
        for (const { data, titleRows, columns, styles, sheetName } of sheets) {
          const styleMap = new Map(Object.entries(styles));
          onLoad(sheetName, data, columns, styleMap, titleRows, sourceFileId, fileName);
        }
      }
    } catch (e) { 
      console.error(e);
      alert("Could not parse this file via server."); 
    }
    finally { setLoading(false); }
  }, [onLoad]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-8">
      <div className="w-full max-w-lg text-center">
        {hasFiles && onBack && (
          <button onClick={onBack} className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-3 w-3" /> Back to workspace
          </button>
        )}
        <div className="mb-8">
          <img src={logoUrl} alt="Magic Excel" className="w-20 h-20 object-contain mx-auto mb-4 text-primary" />
          {/* <FileSpreadsheet className="mx-auto mb-4 h-12 w-12 text-primary" /> */}
          <h1 className="text-2xl font-bold text-foreground">Magic Excel</h1>
          <p className="mt-2 text-sm text-muted-foreground">Excel-like Spreadsheet with AI Automation</p>
        </div>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`rounded-lg border-2 border-dashed p-12 transition-all mb-6 cursor-pointer ${dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
        >
          <input ref={inputRef} type="file" accept=".xls,.xlsx,.csv" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFile(file); }} />
          {loading ? (
            <>
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="text-sm font-medium text-foreground">Parsing file & extracting styles…</p>
            </>
          ) : (
            <>
              <Upload className="mx-auto mb-4 h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">Drop .xls, .xlsx, or .csv file here</p>
              <p className="mt-1 text-xs text-muted-foreground">or click to browse — formatting is preserved!</p>
            </>
          )}
        </div>
        <div className="flex gap-3 justify-center">
          <button onClick={() => onLoad("Sales_Report.xlsx")} className="px-4 py-2 text-xs rounded-md border border-border hover:bg-accent transition-colors">
            Load Sample: Sales
          </button>
          <button onClick={() => onLoad("Employee_Data.xlsx")} className="px-4 py-2 text-xs rounded-md border border-border hover:bg-accent transition-colors">
            Load Sample: Employees
          </button>
        </div>
        <p className="mt-6 text-xs text-muted-foreground">All data stays in your browser.</p>
      </div>
    </div>
  );
}