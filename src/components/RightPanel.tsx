// components/RightPanel.tsx
import { useState, useCallback } from "react";
import { Layers, MessageSquare, ListOrdered, BookMarked } from "lucide-react";
import OperationPreview from "./OperationPreview";
import ChatPanel from "./ChatPanel";
import SavedStacksPanel, { type SavedStack } from "./SavedStacksPanel";
import StackEditModal from "./StackEditModal";
import type { ChatMessage } from "./ChatPanel";
import type { ProcessingState, ExcelFile } from "@/lib/useSpreadsheet";
import type { PipelineOperation, PipelineExecutionResult } from "@/lib/pipelineEngine";

import { useSupabaseStacks } from "@/lib/useSupabaseStacks";

interface RightPanelProps {
  pipeline: PipelineOperation[];
  pipelineResult: PipelineExecutionResult | null;
  processingState: ProcessingState;
  onConfirm: () => void;
  onCancel: () => void;
  onRemove: (index: number) => void;
  onLoadOpsIntoPending: (ops: PipelineOperation[], commit: boolean) => void;
  rowCount: number;
  colCount: number;
  fileName: string;
  columns: string[];
  files: ExcelFile[];
  activeFileData: ExcelFile["data"];
  activeFileColumns: string[];
  messages: ChatMessage[];
  onSubmit: (command: string) => void;
  onSwitchFile: (id: string) => void;
  userId: string;
  username: string;
  onLogout: () => void;
}

type TopTab = "pipeline" | "chat";
type PipelineSubTab = "operations" | "stacks";

export default function RightPanel({
  pipeline,
  pipelineResult,
  processingState,
  onConfirm,
  onCancel,
  onRemove,
  onLoadOpsIntoPending,
  rowCount,
  colCount,
  fileName,
  columns,
  files,
  activeFileData,
  activeFileColumns,
  messages,
  onSubmit,
  onSwitchFile,
  userId,
}: RightPanelProps) {
  const [activeTab, setActiveTab] = useState<TopTab>("chat");
  const [pipelineSubTab, setPipelineSubTab] = useState<PipelineSubTab>("operations");
  const [editingStack, setEditingStack] = useState<SavedStack | null>(null);

  const { stacks, loading, saveStack, updateStack, deleteStack } = useSupabaseStacks(userId);

  const handleSaveStack = useCallback(async (name: string) => {
    if (pipeline.length === 0) return;
    const toSave = pipeline.filter((op) => op.type !== "compute");
    await saveStack(name, toSave);
    setPipelineSubTab("stacks");
    setActiveTab("pipeline");
  }, [pipeline, saveStack]);

  const handlePreviewSavedStack = useCallback((stack: SavedStack) => {
    onLoadOpsIntoPending(stack.ops as PipelineOperation[], false);
    setActiveTab("pipeline");
    setPipelineSubTab("operations");
  }, [onLoadOpsIntoPending]);

  const handleRunSavedStack = useCallback((stack: SavedStack) => {
    onLoadOpsIntoPending(stack.ops as PipelineOperation[], true);
    setActiveTab("pipeline");
    setPipelineSubTab("operations");
  }, [onLoadOpsIntoPending]);

  const handleSaveEditedStack = useCallback(async (updated: SavedStack) => {
    await updateStack(updated);
    setEditingStack(null);
  }, [updateStack]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b border-border bg-card/60 shrink-0">
        <button
          onClick={() => setActiveTab("pipeline")}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-all relative ${activeTab === "pipeline" ? "text-foreground" : "text-muted-foreground/60 hover:text-muted-foreground"
            }`}
        >
          <Layers className="h-3.5 w-3.5" />
          <span>Pipeline</span>
          {pipeline.length > 0 && (
            <span className="ml-1 text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/20 leading-none">
              {pipeline.length}
            </span>
          )}
          {activeTab === "pipeline" && <div className="absolute bottom-0 left-2 right-2 h-[2px] bg-primary rounded-full" />}
        </button>
        <button
          onClick={() => setActiveTab("chat")}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-all relative ${activeTab === "chat" ? "text-foreground" : "text-muted-foreground/60 hover:text-muted-foreground"
            }`}
        >
          <MessageSquare className="h-3.5 w-3.5" />
          <span>Chat</span>
          {activeTab === "chat" && <div className="absolute bottom-0 left-2 right-2 h-[2px] bg-primary rounded-full" />}
        </button>
      </div>

      {activeTab === "pipeline" && (
        <div className="flex gap-1 p-1 bg-card/30 shrink-0">
          <button
            onClick={() => setPipelineSubTab("operations")}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] font-semibold transition-all rounded-md ${pipelineSubTab === "operations" ? "bg-primary/30 text-primary border border-primary/40" : "text-muted-foreground/60 hover:text-primary hover:bg-primary/10"
              }`}
          >
            <ListOrdered className="h-3 w-3" />
            <span>Operations</span>
          </button>
          <button
            onClick={() => setPipelineSubTab("stacks")}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] font-semibold transition-all rounded-md ${pipelineSubTab === "stacks" ? "bg-primary/30 text-primary border border-primary/40" : "text-muted-foreground/60 hover:text-primary hover:bg-primary/10"
              }`}
          >
            <BookMarked className="h-3 w-3" />
            <span>Stacks</span>
            {stacks.length > 0 && (
              <span className="ml-1 text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 leading-none">
                {stacks.length}
              </span>
            )}
          </button>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {activeTab === "pipeline" ? (
          pipelineSubTab === "operations" ? (
            <OperationPreview
              pipeline={pipeline}
              steps={pipelineResult?.steps || []}
              processingState={processingState}
              onConfirm={onConfirm}
              onCancel={onCancel}
              onRemove={onRemove}
              onSaveStack={handleSaveStack}
              rowCount={rowCount}
            />
          ) : (
            <SavedStacksPanel
              stacks={stacks}
              loading={loading}
              onRun={handleRunSavedStack}
              onPreview={handlePreviewSavedStack}
              onEdit={(stack) => setEditingStack(stack)}
              onDelete={deleteStack}
            />
          )
        ) : (
          <ChatPanel
            columns={columns}
            processingState={processingState}
            files={files}
            messages={messages}
            onSubmit={onSubmit}
            onSwitchFile={onSwitchFile}
          />
        )}
      </div>

      {editingStack && (
        <StackEditModal
          stack={editingStack}
          columns={columns}
          liveData={activeFileData as Array<Record<string, unknown>>}
          onSave={handleSaveEditedStack}
          onClose={() => setEditingStack(null)}
        />
      )}
    </div>
  );
}