import { useState } from "react";
import {
  X,
  ChevronDown,
  ChevronRight,
  Loader2,
  Check,
  AlertCircle,
  BookMarked,
  GripVertical,
  Pencil,
  Trash2,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import NewColumnModal from "./NewColumnModal";
import type { PipelineOperation } from "@/lib/pipelineEngine";
import type { SavedStack } from "./SavedStacksPanel";
import { useStackEdit } from "@/hooks/useStackEdit";
import { useMention } from "@/hooks/useMention";

interface StackEditModalProps {
  stack: SavedStack;
  columns: string[];
  liveData?: Array<Record<string, unknown>>;
  onSave: (updated: SavedStack) => void;
  onClose: () => void;
}

const DIFF_META = {
  highlight: { dot: "bg-violet-500", badge: "badge-highlight", label: "SHW", color: "text-violet-600" },
  delete: { dot: "bg-red-500", badge: "badge-delete", label: "DEL", color: "text-red-600" },
  modify: { dot: "bg-amber-500", badge: "badge-modify", label: "MOD", color: "text-amber-600" },
  add: { dot: "bg-emerald-500", badge: "badge-add", label: "ADD", color: "text-emerald-600" },
};

function getMetaForType(type: string) {
  if (type === "highlight") return DIFF_META.highlight;
  if (type === "delete_rows" || type === "remove_duplicates" || type === "delete_column") return DIFF_META.delete;
  if (type === "add_column") return DIFF_META.add;
  return DIFF_META.modify;
}

function OpRow({ op, index, total, onRemove, onEdit, isEditing }: { op: PipelineOperation; index: number; total: number; onRemove: () => void; onEdit: () => void; isEditing: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const meta = getMetaForType(op.type);
  const isLast = index === total - 1;

  return (
    <div className={`group relative flex gap-4 transition-all duration-300 ${isEditing ? "scale-[1.02] z-20" : "opacity-90 hover:opacity-100"}`}>
      <div className="flex flex-col items-center shrink-0 w-6">
        <div className={`z-10 w-3 h-3 rounded-full border-2 border-background shadow-sm transition-transform group-hover:scale-110 ${meta.dot}`} />
        {!isLast && <div className="absolute top-3 bottom-[-24px] w-[2px] bg-gradient-to-b from-border/60 to-border/20" />}
      </div>

      <div className={`flex-1 mb-6 rounded-xl border transition-all duration-300 overflow-hidden ${isEditing ? "border-primary/50 bg-primary/5 shadow-lg shadow-primary/10" : "border-border/40 bg-card/60 hover:border-border/80 shadow-sm"}`}>
        <div className="flex items-center gap-3 px-4 py-3">
          <GripVertical className="h-3.5 w-3.5 text-muted-foreground/20 shrink-0" />
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold text-muted-foreground/40">#{index + 1}</span>
              <span className={`text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${meta.badge}`}>{meta.label}</span>
            </div>
          </div>
          <span className="flex-1 text-[11px] font-mono truncate font-medium ml-1">{op.label}</span>

          <div className="flex items-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
            <button onClick={() => setExpanded(v => !v)} className="p-1.5 rounded-lg text-muted-foreground/60 hover:bg-muted hover:text-foreground transition-colors">
              {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
            <button onClick={onEdit} className={`p-1.5 rounded-lg transition-colors ${isEditing ? "bg-primary/20 text-primary" : "text-muted-foreground/40 hover:bg-amber-500/10 hover:text-amber-500"}`}>
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button onClick={onRemove} className="p-1.5 rounded-lg text-muted-foreground/40 hover:bg-red-500/10 hover:text-red-500 transition-colors">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        {expanded && (
          <div className="border-t border-border/20 bg-muted/30 px-4 py-3">
            <pre className="text-[10px] font-mono text-muted-foreground/80 leading-relaxed overflow-x-auto selection:bg-primary/20">{JSON.stringify(op.payload || {}, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
}

function MentionArea({ value, onChange, onKeyDown, showMention, mentionIdx, filteredColumns, insertMention, placeholder }: any) {
  return (
    <div className="relative">
      {showMention && filteredColumns.length > 0 && (
        <div className="absolute bottom-full left-0 mb-1 w-full max-w-[200px] rounded-lg border border-border bg-popover shadow-xl z-[250] overflow-hidden">
          <div className="px-2 py-1 border-b border-border bg-muted/50 font-mono text-[9px] text-muted-foreground uppercase">Columns</div>
          <div className="max-h-32 overflow-auto">
            {filteredColumns.map((col: string, i: number) => (
              <div key={col} onClick={() => insertMention(col)} className={`px-3 py-1.5 text-[11px] font-mono cursor-pointer flex items-center gap-2 ${i === mentionIdx ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}>
                <span className={i === mentionIdx ? "text-primary-foreground/60" : "text-muted-foreground"}>@</span>
                <span className="truncate">{col}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <textarea
        autoFocus
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className="w-full bg-background border border-border/60 rounded px-2 py-1.5 text-xs font-mono outline-none resize-none"
        rows={2}
      />
    </div>
  );
}

export default function StackEditModal({ stack, columns, liveData = [], onSave, onClose }: StackEditModalProps) {
  const se = useStackEdit({ stack, columns, liveData });
  const mention = useMention({ columns, columnOnly: true });

  const handleTextChange = (val: string) => {
    if (se.editingIndex !== -1) se.setEditInput(val);
    else se.setInsertInput(val);
    mention.handleMentionChange(val);
  };

  const handleMentionInsert = (col: string) => {
    const isEdit = se.editingIndex !== -1;
    const current = isEdit ? se.editInput : se.insertInput;
    const newVal = mention.insertMention(col, "column", current);
    if (isEdit) se.setEditInput(newVal);
    else se.setInsertInput(newVal);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const currentValue = se.editingIndex !== -1 ? se.editInput : se.insertInput;
    const consumed = mention.handleMentionKeyDown(
      e,
      currentValue,
      (newVal) => {
        if (se.editingIndex !== -1) se.setEditInput(newVal);
        else se.setInsertInput(newVal);
      },
    );
    if (consumed) return;
  };

  const filteredColumns = columns.filter((c) =>
    c.toLowerCase().includes(mention.mentionFilter.toLowerCase()),
  );

  return (
    <div className="fixed inset-0 z-[40] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="bg-popover border border-border shadow-2xl rounded-xl w-full max-w-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
          <BookMarked className="h-4 w-4 text-primary" />
          <input value={se.name} onChange={e => se.setName(e.target.value)} className="flex-1 bg-transparent text-sm font-mono font-semibold outline-none" />
          <button onClick={onClose} className="p-1 rounded hover:bg-accent text-muted-foreground"><X className="h-4 w-4" /></button>
        </div>

        <div className="flex-1 overflow-auto px-8 py-6 space-y-0 relative scrollbar-thin scrollbar-thumb-border/40 scrollbar-track-transparent">
          {se.ops.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-4 text-muted-foreground/40 bg-muted/10 rounded-2xl border-2 border-dashed border-border/40 mx-4">
              <BookMarked className="h-10 w-10 opacity-20" />
              <div className="text-center">
                <p className="text-sm font-medium">No steps in this pipeline</p>
                <p className="text-[10px] font-mono mt-1">Add your first operation to get started</p>
              </div>
              <button
                onClick={() => se.startInsert(-2)}
                className="mt-2 flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 text-primary text-[11px] font-bold hover:bg-primary hover:text-primary-foreground transition-all duration-300"
              >
                <Plus className="h-3.5 w-3.5"/> Initialize Stack
              </button>
            </div>
          ) : (
            <>
              {/* Start Insertion Point */}
              <div className="relative group/add flex justify-center h-8 mb-2">
                <div className="absolute top-0 bottom-0 w-[2px] bg-border/20 left-[11px]" />
                <button
                  onClick={() => se.startInsert(se.insertingIndex === -2 ? -1 : -2)}
                  className={`z-10 group-hover/add:scale-110 transition-all duration-300 w-6 h-6 rounded-full border border-border/40 flex items-center justify-center backdrop-blur-md ${se.insertingIndex === -2 ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20" : "bg-card text-muted-foreground/40 hover:text-primary hover:border-primary/40 shadow-sm"}`}
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>

              {se.insertingIndex === -2 && (
                <div className="ml-10 mb-6 p-4 bg-primary/5 border border-primary/20 rounded-2xl shadow-inner animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex gap-2 items-start">
                    <select disabled className="bg-background border border-border/60 rounded px-2 h-[34px] text-xs font-mono outline-none shrink-0 text-muted-foreground opacity-70 cursor-not-allowed">
                      <option>Add</option>
                    </select>
                    <div className="flex-1">
                      <MentionArea value={se.insertInput} onChange={handleTextChange} onKeyDown={handleKeyDown}
                        showMention={mention.showMention} mentionIdx={mention.mentionIdx} filteredColumns={filteredColumns} insertMention={handleMentionInsert}
                        placeholder="Add task at start..." />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" className="flex-1 h-8 rounded-xl font-mono text-[11px]" onClick={se.handleApplyInsert} disabled={se.isProcessing}>
                      {se.isProcessing ? <Loader2 className="h-3 w-3 animate-spin"/> : <Check className="h-3.5 w-3.5 mr-1.5"/>}Insert at Start
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 rounded-xl font-mono text-[11px]" onClick={se.cancelInsert}>Cancel</Button>
                  </div>
                </div>
              )}

              {se.ops.map((op, i) => (
                <div key={op.id || i} className="group/item">
                  <OpRow op={op} index={i} total={se.ops.length}
                    onRemove={() => se.removeOp(i)}
                    onEdit={() => se.startEdit(i)}
                    isEditing={i === se.editingIndex}
                  />

                  {se.editingIndex === i && (
                    <div className="ml-10 -mt-4 mb-6 p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl shadow-inner animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="flex gap-2 items-start">
                        <select
                          value={se.editMode}
                          onChange={(e) => se.setEditMode(e.target.value as "edit" | "replace")}
                          className="bg-background border border-border/60 rounded px-2 h-[34px] text-xs font-mono outline-none shrink-0 text-muted-foreground"
                        >
                          <option value="edit">Edit</option>
                          <option value="replace">Replace</option>
                        </select>
                        <div className="flex-1">
                          <MentionArea value={se.editInput} onChange={handleTextChange} onKeyDown={handleKeyDown}
                            showMention={mention.showMention} mentionIdx={mention.mentionIdx} filteredColumns={filteredColumns} insertMention={handleMentionInsert}
                            placeholder={se.editMode === "edit" ? "Edit current values/columns..." : "Describe the new action..."} />
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <Button size="sm" className="flex-1 h-8 rounded-xl bg-amber-500 hover:bg-amber-600 font-mono text-[11px]" onClick={se.handleApplyEdit} disabled={se.isProcessing}>
                          {se.isProcessing ? <Loader2 className="h-3 w-3 animate-spin"/> : <Check className="h-3.5 w-3.5 mr-1.5"/>}Modify Step
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 rounded-xl font-mono text-[11px]" onClick={se.cancelEdit}>Cancel</Button>
                      </div>
                      {se.error && <div className="text-[10px] text-red-500 font-mono mt-2 px-1 flex items-center gap-1.5"><AlertCircle className="h-3 w-3" />{se.error}</div>}
                    </div>
                  )}

                  {/* Node Insertion Point */}
                  <div className="relative group/add flex justify-center h-8 -mt-2 mb-2">
                    <div className="absolute top-0 bottom-0 w-[2px] bg-border/20 left-[11px]" />
                    <button
                      onClick={() => se.startInsert(i === se.insertingIndex ? -1 : i)}
                      className={`z-10 group-hover/add:scale-110 transition-all duration-300 w-6 h-6 rounded-full border border-border/40 flex items-center justify-center backdrop-blur-md ${se.insertingIndex === i ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20" : "bg-card text-muted-foreground/40 hover:text-primary hover:border-primary/40 shadow-sm"}`}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {se.insertingIndex === i && (
                    <div className="ml-10 mb-6 p-4 bg-primary/5 border border-primary/20 rounded-2xl shadow-inner animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="flex gap-2 items-start">
                        <select disabled className="bg-background border border-border/60 rounded px-2 h-[34px] text-xs font-mono outline-none shrink-0 text-muted-foreground opacity-70 cursor-not-allowed">
                          <option>Add</option>
                        </select>
                        <div className="flex-1">
                          <MentionArea value={se.insertInput} onChange={handleTextChange} onKeyDown={handleKeyDown}
                            showMention={mention.showMention} mentionIdx={mention.mentionIdx} filteredColumns={filteredColumns} insertMention={handleMentionInsert}
                            placeholder={`Add task after operation ${i+1}...`} />
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <Button size="sm" className="flex-1 h-8 rounded-xl font-mono text-[11px]" onClick={se.handleApplyInsert} disabled={se.isProcessing}>
                          {se.isProcessing ? <Loader2 className="h-3 w-3 animate-spin"/> : <Check className="h-3.5 w-3.5 mr-1.5"/>}Confirm Addition
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 rounded-xl font-mono text-[11px]" onClick={se.cancelInsert}>Cancel</Button>
                      </div>
                      {se.error && <div className="text-[10px] text-red-500 font-mono mt-2 px-1 flex items-center gap-1.5"><AlertCircle className="h-3 w-3" />{se.error}</div>}
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>

        <div className="p-6 border-t border-border bg-muted/30 backdrop-blur-sm flex items-center justify-between gap-4">
          <div className="flex-1">
            <p className="text-[10px] font-mono text-muted-foreground/60 leading-relaxed max-w-sm">
              Finalize your pipeline edits before persisting. Discarding will revert to the last saved state.
            </p>
          </div>
          <div className="flex gap-3 shrink-0">
            <Button variant="outline" className="h-10 px-6 rounded-xl font-mono text-xs hover:bg-background transition-all active:scale-95" onClick={onClose}>
              Discard
            </Button>
            <Button className="h-10 px-8 rounded-xl font-mono text-xs shadow-lg shadow-primary/10 hover:shadow-primary/20 transition-all active:scale-95" onClick={() => onSave(se.buildSavePayload())}>
              <Check className="h-4 w-4 mr-2" /> Commit Changes
            </Button>
          </div>
        </div>
      </div>
      {se.newColContext && (
        <NewColumnModal
          suggestedName={se.newColContext.suggestedName}
          onConfirm={se.resolveNewColumn}
          onClose={() => se.setNewColContext(null)}
        />
      )}
    </div>
  );
}
