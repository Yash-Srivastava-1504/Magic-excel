import { useState } from "react";
import { Check, X, Trash2, ChevronDown, ChevronRight, Zap, AlertCircle, BookMarked } from "lucide-react";
import type { ProcessingState } from "@/lib/useSpreadsheet";
import type { PipelineOperation, PipelineStep } from "@/lib/pipelineEngine";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

interface OperationPreviewProps {
  pipeline: PipelineOperation[];
  steps: PipelineStep[];
  processingState: ProcessingState;
  onConfirm: () => void;
  onCancel: () => void;
  onRemove: (index: number) => void;
  onSaveStack: (name: string) => void;
  rowCount: number;
}

const DIFF_META = {
  highlight: { badge: "badge-highlight", connector: "bg-violet-500/40", dot: "bg-violet-500", label: "SHW", rowColor: "text-violet-600" },
  delete: { badge: "badge-delete", connector: "bg-red-500/40", dot: "bg-red-500", label: "DEL", rowColor: "text-red-600" },
  modify: { badge: "badge-modify", connector: "bg-amber-500/40", dot: "bg-amber-500", label: "MOD", rowColor: "text-amber-600" },
  add: { badge: "badge-add", connector: "bg-emerald-500/40", dot: "bg-emerald-500", label: "ADD", rowColor: "text-emerald-600" }
} as const;

function getMeta(type: string) {
  if (type === "highlight") return DIFF_META.highlight;
  if (type === "delete_rows" || type === "remove_duplicates" || type === "delete_column") return DIFF_META.delete;
  if (type === "add_column") return DIFF_META.add;
  return DIFF_META.modify;
}

function StepCard({ op, step, index, total, processingState, onRemove }: { op: PipelineOperation; step: PipelineStep | undefined; index: number; total: number; processingState: ProcessingState; onRemove: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const meta = getMeta(op.type);
  const isLast = index === total - 1;

  return (
    <div className="relative flex gap-3">
      <div className="flex flex-col items-center shrink-0 pt-1">
        <div className={`w-2 h-2 rounded-full shrink-0 ${meta.dot} shadow-sm`} />
        {!isLast && <div className={`w-px flex-1 mt-1 mb-0 min-h-[24px] ${meta.connector} opacity-50`} />}
      </div>
      <div className="flex-1 mb-3 rounded-lg border bg-card/80 border-border/40 overflow-hidden transition-all duration-150 hover:shadow-sm">
        <div className="flex items-center gap-2 px-3 py-2">
          <span className="text-[10px] font-mono text-muted-foreground/60 w-3 shrink-0">{index + 1}</span>
          <span className={`text-[10px] font-mono font-semibold px-2 py-1 rounded-md ${meta.badge} shrink-0`}>{meta.label}</span>
          <span className="flex-1 text-xs font-mono text-foreground truncate leading-tight">{op.label}</span>
          <button onClick={() => setExpanded(v => !v)} className="p-0.5 text-muted-foreground/50 hover:text-muted-foreground">{expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}</button>
          <button onClick={onRemove} className="p-0.5 text-muted-foreground/30 hover:text-red-400"><Trash2 className="h-3 w-3" /></button>
        </div>
        <div className="px-3 pb-2 flex flex-col gap-0.5">
          {step?.status === "error" ? (
            <div className="flex items-center gap-1.5 text-[10px] text-destructive font-mono font-semibold">
              <AlertCircle className="h-2.5 w-2.5" />
              <span>{step.errorMessage || "Operation failed"}</span>
            </div>
          ) : (
            <span className={`text-[10px] font-mono ${meta.rowColor}`}>{step?.summary || (processingState === "processing" ? "Parsing..." : "Pending...")}</span>
          )}
        </div>
        {expanded && (
          <div className="border-t border-border/40 bg-background/60 px-3 py-2">
            <pre className="text-[10px] font-mono text-muted-foreground whitespace-pre-wrap leading-relaxed overflow-x-auto scrollbar-thin">
              {JSON.stringify(op.payload || {}, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

function StatPill({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg bg-secondary/40 border border-border/40 min-w-0">
      <span className={`text-sm font-mono font-semibold leading-none ${accent ?? "text-foreground"}`}>{value}</span>
      <span className="text-[9px] uppercase tracking-widest text-muted-foreground/60 font-medium">{label}</span>
    </div>
  );
}

export default function OperationPreview({
  pipeline = [],
  steps = [],
  processingState,
  onConfirm,
  onCancel,
  onRemove,
  onSaveStack,
  rowCount,
}: OperationPreviewProps) {
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveName, setSaveName] = useState("");

  const safePipeline = pipeline || [];
  const safeSteps = steps || [];
  const hasOps = safePipeline.length > 0;

  const totalAffected = (() => {
    const allIds = new Set<number>();
    safeSteps.forEach(s => {
      if (s?.affectedRowIds) {
        s.affectedRowIds.forEach(id => allIds.add(id));
      }
    });
    return allIds.size;
  })();

  return (
    <div className="flex flex-col flex-1 min-h-0 select-none">
      <div className="px-4 pt-4 pb-3 border-b border-border/50">
        {hasOps && (
          <div className="grid grid-cols-3 gap-1.5">
            <StatPill label="ops" value={safePipeline.length} />
            <StatPill label="rows" value={totalAffected} accent="text-amber-400" />
            <StatPill label="impact" value={`${Math.round((totalAffected / Math.max(rowCount, 1)) * 100)}%`} accent="text-primary" />
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto px-4 py-4 min-h-0">
        {!hasOps && processingState === "idle" && (
          <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
            <div className="w-10 h-10 rounded-full bg-secondary/60 border border-border/40 flex items-center justify-center"><Zap className="h-4 w-4 text-muted-foreground/40" /></div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">No operations queued</p>
              <p className="text-[10px] text-muted-foreground/50 mt-1">Type a command below.</p>
            </div>
          </div>
        )}

        {processingState === "processing" && (
          <div className="flex items-center gap-2.5 py-3 px-1">
            <div className="relative h-3 w-3"><div className="absolute inset-0 rounded-full border-2 border-primary/20" /><div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>
            <span className="text-xs font-mono text-primary">Parsing command…</span>
          </div>
        )}

        {hasOps && (
          <div>
            {safePipeline.map((op, i) => (
              <StepCard key={op.id || i} op={op} step={safeSteps[i]} index={i} total={safePipeline.length} processingState={processingState} onRemove={() => onRemove(i)} />
            ))}
            {processingState !== "processing" && (
              <div className="flex items-center gap-2 pl-5 mt-1 mb-2">
                <div className="h-px flex-1 bg-border/30 border-dashed" />
                <span className="text-[10px] text-muted-foreground/40 font-mono shrink-0">+ next command</span>
                <div className="h-px flex-1 bg-border/30" />
              </div>
            )}
          </div>
        )}

        {hasOps && totalAffected / Math.max(rowCount, 1) > 0.5 && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
            <AlertCircle className="h-3 w-3 text-amber-400 mt-0.5 shrink-0" />
            <p className="text-[10px] text-amber-400/80 leading-relaxed">Over half your rows are affected. Review carefully.</p>
          </div>
        )}
      </div>

      {hasOps && (
        <div className="border-t border-border/50 p-3 space-y-2 bg-card/40">
          {showSaveDialog ? (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 mb-3">
              <p className="text-[11px] font-semibold text-primary mb-2 flex items-center gap-1.5"><BookMarked className="h-3 w-3" /> Name this stack</p>
              <input autoFocus value={saveName} onChange={e => setSaveName(e.target.value)} placeholder="e.g. Data Cleaning..." className="w-full bg-background border border-border/60 rounded-md px-3 py-1.5 text-xs font-mono outline-none mb-2" />
              <div className="flex gap-2">
                <Button size="sm" className="flex-1 h-7 text-xs" disabled={!saveName.trim()} onClick={() => { onSaveStack(saveName.trim()); setShowSaveDialog(false); }}><Check className="h-3 w-3" /> Save</Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowSaveDialog(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <Button onClick={() => setShowSaveDialog(true)} size="sm" variant="outline" className="w-full gap-1.5 font-mono text-xs h-7 border-primary/30 text-primary/80"><BookMarked className="h-3 w-3" /> Save as Stack</Button>
          )}

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" className="w-full gap-1.5 font-mono text-xs h-8 bg-primary hover:bg-primary/90"><Check className="h-3 w-3" /> Commit Changes</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Commit changes</AlertDialogTitle>
                <AlertDialogDescription>Apply {safePipeline.length} operations to the dataset?</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onConfirm}>Commit</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button onClick={onCancel} variant="ghost" size="sm" className="w-full gap-1.5 font-mono text-xs h-7 text-muted-foreground"><X className="h-3 w-3" /> Discard Queue</Button>
        </div>
      )}
    </div>
  );
}