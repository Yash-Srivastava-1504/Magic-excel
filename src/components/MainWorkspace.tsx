import React, { useState, useCallback } from "react";
import DataGrid from "./DataGrid";
import StylePrompt from "./StylePrompt";
import ExcelMenuBar from "./ExcelMenuBar";
import type { SelectedRange } from "./ExcelMenuBar";
import FileTabs from "./FileTabs";
import SheetTabs from "./SheetTabs";
import RightPanel from "./RightPanel";
import NewColumnModal from "./NewColumnModal";
import PipelineDebugPanel from "./PipelineDebugPanel";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { ChatMessage } from "./ChatPanel";
import type { ExcelFile } from "@/lib/useSpreadsheet";
import type { ComputeResult } from "@/lib/operations";
import { AlertCircle } from "lucide-react";
import type { PipelineExecutionResult, PipelineOperation } from "@/lib/pipelineEngine";

class LocalErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) return (
      <div className="flex-1 flex flex-col items-center justify-center bg-muted/20 text-muted-foreground p-8 text-center border-2 border-dashed border-border m-4 rounded-xl">
        <AlertCircle className="h-8 w-8 mb-4 opacity-50" />
        <h3 className="text-sm font-semibold mb-1">Grid Rendering Error</h3>
        <p className="text-xs max-w-xs">The spreadsheet grid encountered an error. This usually happens if the pipeline produces an unexpected data structure.</p>
        <button onClick={() => window.location.reload()} className="mt-4 text-xs font-semibold text-primary underline">Reload Page</button>
      </div>
    );
    return this.props.children;
  }
}

interface MainWorkspaceProps {
  files: ExcelFile[];
  activeFile: ExcelFile;
  activeFileId: string | null;
  pipelineResult: PipelineExecutionResult | null;
  onSwitchFile: (id: string) => void;
  onRemoveFile: (sourceFileId: string) => void;
  onAddFile: () => void;
  onSubmit: (cmd: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  onRemoveFromStack: (index: number) => void;
  onLoadOpsIntoPending: (ops: PipelineOperation[], commit: boolean) => void;
  onUndo: () => void;
  stylePromptSession: { ops: PipelineOperation[] } | null;
  onResolveStylePrompt: (values: string[]) => void;
  onCancelStylePrompt: () => void;
  computeResult: ComputeResult | null;
  chatMessages: ChatMessage[];
  userId: string;
  username: string;
  onLogout: () => void;
  newColumnPrompt: { suggestedName: string } | null;
  onResolveNewColumn: (name: string, defaultValue: string) => void;
  onCancelNewColumn: () => void;
}

export default function MainWorkspace({
  files, activeFile, activeFileId, pipelineResult, onSwitchFile, onRemoveFile, onAddFile,
  onSubmit, onConfirm, onCancel, onRemoveFromStack, onLoadOpsIntoPending, onUndo,
  stylePromptSession, onResolveStylePrompt, onCancelStylePrompt,
  computeResult, chatMessages, userId, username, onLogout,
  newColumnPrompt, onResolveNewColumn, onCancelNewColumn,
}: MainWorkspaceProps) {
  const [selectedRange, setSelectedRange] = useState<SelectedRange | null>(null);
  const [pendingSwitchId, setPendingSwitchId] = useState<string | null>(null);
  const [pipelineLogOpen, setPipelineLogOpen] = useState(false);

  const handleSelectionChange = useCallback((cells: { rowIndex: number; col: string }[]) => {
    setSelectedRange(cells.length > 0 ? { cells } : null);
  }, []);

  const safePipeline = activeFile?.pipeline || [];

  const requestSwitch = useCallback((id: string) => {
    if (id === activeFileId) return;
    if (safePipeline.length > 0) setPendingSwitchId(id);
    else onSwitchFile(id);
  }, [activeFileId, safePipeline.length, onSwitchFile]);

  const confirmSwitch = useCallback(() => {
    if (!pendingSwitchId) return;
    onCancel();
    onSwitchFile(pendingSwitchId);
    setPendingSwitchId(null);
  }, [pendingSwitchId, onCancel, onSwitchFile]);

  return (
    <div className="flex flex-col h-screen bg-background">
      <ExcelMenuBar
        fileName={activeFile.name}
        onUndo={onUndo}
        undoEnabled={activeFile.undoStack.length > 0}
        username={username}
        onLogout={onLogout}
        cellStyles={activeFile.cellStyles}
        onStyleChange={() => { }}
        selectedRange={selectedRange}
        onOpenPipelineLog={() => setPipelineLogOpen(true)}
      />

      <PipelineDebugPanel open={pipelineLogOpen} onOpenChange={setPipelineLogOpen} />
      
      {activeFile.processingState === "processing" && (
        <div className="h-0.5 w-full bg-primary/10 overflow-hidden shrink-0 relative">
          <div className="absolute inset-0 bg-primary/40 animate-indeterminate-shimmer" />
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">
          <LocalErrorBoundary>
            <DataGrid
              data={activeFile.data}
              columns={activeFile.columns}
              titleRows={activeFile.titleRows}
              pipelineResult={pipelineResult}
              onSelectionChange={handleSelectionChange}
            />
          </LocalErrorBoundary>
          <SheetTabs files={files} activeFile={activeFile} onSelect={requestSwitch} />
          <FileTabs files={files} activeFileId={activeFileId} onSelect={requestSwitch} onRemove={onRemoveFile} onAddNew={onAddFile} />
        </div>

        <div className="w-80 border-l border-border bg-card flex flex-col h-full">
          <RightPanel
            pipeline={safePipeline}
            pipelineResult={pipelineResult}
            processingState={activeFile.processingState}
            onConfirm={onConfirm}
            onCancel={onCancel}
            onRemove={onRemoveFromStack}
            onLoadOpsIntoPending={onLoadOpsIntoPending}
            rowCount={activeFile.data.length}
            colCount={activeFile.columns.length}
            fileName={activeFile.name}
            columns={pipelineResult?.columns || activeFile.columns}
            files={files}
            activeFileData={activeFile.data}
            activeFileColumns={activeFile.columns}
            messages={chatMessages}
            onSubmit={onSubmit}
            onSwitchFile={requestSwitch}
            userId={userId}
            username={username}
            onLogout={onLogout}
          />
        </div>
      </div>

      {stylePromptSession && (
        <StylePrompt 
          ops={stylePromptSession.ops} 
          onResolve={onResolveStylePrompt} 
          onCancel={onCancelStylePrompt} 
        />
      )}
      {newColumnPrompt && <NewColumnModal suggestedName={newColumnPrompt.suggestedName} onConfirm={onResolveNewColumn} onClose={onCancelNewColumn} />}

      <AlertDialog open={pendingSwitchId !== null}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>You have pending operations in the pipeline. Switching now will discard them.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingSwitchId(null)}>Stay here</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSwitch} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Discard &amp; switch</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
