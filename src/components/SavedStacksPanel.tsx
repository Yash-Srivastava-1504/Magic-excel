import { useState } from "react";
import {
  BookMarked,
  Play,
  Eye,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  Check,
  X,
} from "lucide-react";
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
import type { PipelineOperation } from "@/lib/pipelineEngine";

export interface SavedStack {
  id: string;
  name: string;
  ops: PipelineOperation[];
  createdAt: number;
}

interface SavedStacksPanelProps {
  stacks: SavedStack[];
  loading?: boolean;
  onRun: (stack: SavedStack) => void;
  onPreview: (stack: SavedStack) => void;
  onEdit: (stack: SavedStack) => void;
  onDelete: (id: string) => void;
}

const DIFF_META = {
  highlight: { dot: "bg-violet-500", badge: "badge-highlight", label: "SHW", color: "text-violet-600" },
  delete: { dot: "bg-red-500", badge: "badge-delete", label: "DEL", color: "text-red-600" },
  modify: { dot: "bg-amber-500", badge: "badge-modify", label: "MOD", color: "text-amber-600" },
  add: { dot: "bg-emerald-500", badge: "badge-add", label: "ADD", color: "text-emerald-600" },
} as const;

function getMetaForType(type: string) {
  if (type === "highlight") return DIFF_META.highlight;
  if (type === "delete_rows" || type === "remove_duplicates" || type === "delete_column") return DIFF_META.delete;
  if (type === "add_column") return DIFF_META.add;
  return DIFF_META.modify;
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function StackCard({ stack, onRun, onPreview, onEdit, onDelete }: { stack: SavedStack; onRun: () => void; onPreview: () => void; onEdit: () => void; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="rounded-lg border-2 border-border/70 bg-card/80 overflow-hidden mb-3 hover:shadow-sm transition-all">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <BookMarked className="h-3.5 w-3.5 text-primary/60 shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="text-xs font-mono font-semibold text-foreground truncate block">{stack.name}</span>
          <span className="text-[10px] text-muted-foreground/50 font-mono">{stack.ops.length} ops · {formatDate(stack.createdAt)}</span>
        </div>
        <button onClick={() => setExpanded(v => !v)} className="p-0.5 text-muted-foreground/40 hover:text-muted-foreground">{expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}</button>
      </div>

      <div className="px-3 pb-2 flex gap-1 flex-wrap">
        {stack.ops.map((op, i) => {
          const meta = getMetaForType(op.type);
          return <span key={i} title={op.label} className={`text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded ${meta.badge}`}>{meta.label}</span>;
        })}
      </div>

      {expanded && (
        <div className="border-t border-border/40 bg-background/40 px-3 py-2 space-y-1.5 max-h-44 overflow-auto scrollbar-thin">
          {stack.ops.map((op, i) => {
            const meta = getMetaForType(op.type);
            return (
              <div key={i} className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${meta.dot}`} />
                <span className="text-[10px] font-mono text-muted-foreground truncate">{op.label}</span>
              </div>
            );
          })}
        </div>
      )}

      <div className="border-t border-border/40 bg-card/30 flex items-center divide-x divide-border/40">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-mono text-emerald-400 hover:bg-emerald-500/10 transition-colors"><Play className="h-3 w-3" /> Run</button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Run stack</AlertDialogTitle><AlertDialogDescription>Apply this stack to your data and commit?</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={onRun}><Play className="h-3 w-3" /> Run</AlertDialogAction></AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <button onClick={onPreview} className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-mono text-primary/70 hover:bg-primary/10 transition-colors"><Eye className="h-3 w-3" /> Preview</button>
        <button onClick={onEdit} className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-mono text-amber-400/80 hover:bg-amber-500/10 transition-colors"><Pencil className="h-3 w-3" /> Edit</button>
        {confirmDelete ? (
          <div className="flex items-center divide-x divide-border/40">
            <button onClick={() => { onDelete(); setConfirmDelete(false); }} className="px-3 py-2 text-[11px] font-mono text-red-400 hover:bg-red-500/10"><Check className="h-3 w-3" /></button>
            <button onClick={() => setConfirmDelete(false)} className="px-3 py-2 text-[11px] font-mono text-muted-foreground hover:bg-accent"><X className="h-3 w-3" /></button>
          </div>
        ) : (
          <button onClick={() => setConfirmDelete(true)} className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-mono text-muted-foreground/50 hover:text-red-400 hover:bg-red-500/10"><Trash2 className="h-3 w-3" /> Delete</button>
        )}
      </div>
    </div>
  );
}

function StackSkeleton() {
  return (
    <div className="rounded-lg border-2 border-border/40 bg-card/40 overflow-hidden mb-3 animate-pulse">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <div className="h-3.5 w-3.5 rounded bg-muted-foreground/10 shrink-0" />
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="h-3 w-32 rounded bg-muted-foreground/10" />
          <div className="h-2.5 w-24 rounded bg-muted-foreground/5" />
        </div>
      </div>
      <div className="px-3 pb-2 flex gap-1">
        <div className="h-4 w-8 rounded bg-muted-foreground/10" />
        <div className="h-4 w-8 rounded bg-muted-foreground/10" />
        <div className="h-4 w-8 rounded bg-muted-foreground/10" />
      </div>
    </div>
  );
}

export default function SavedStacksPanel({ stacks, loading, onRun, onPreview, onEdit, onDelete }: SavedStacksPanelProps) {
  return (
    <div className="flex flex-col flex-1 min-h-0 select-none">
      <div className="px-4 pt-4 pb-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          {stacks.length > 0 && <span className="ml-auto text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">{stacks.length} saved</span>}
        </div>
      </div>
      <div className="flex-1 overflow-auto px-4 py-4 min-h-0">
        {loading ? (
          <div>
            <StackSkeleton />
            <StackSkeleton />
            <StackSkeleton />
          </div>
        ) : stacks.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-10 text-center text-xs text-muted-foreground">
            <p>No stacks saved yet</p>
          </div>
        ) : (
          stacks.map((stack) => <StackCard key={stack.id} stack={stack} onRun={() => onRun(stack)} onPreview={() => onPreview(stack)} onEdit={() => onEdit(stack)} onDelete={() => onDelete(stack.id)} />)
        )}
      </div>
    </div>
  );
}
