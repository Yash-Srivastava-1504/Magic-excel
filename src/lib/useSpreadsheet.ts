import { useState, useCallback, useEffect } from "react";
import { backendApi } from "./api";
import type { ChatMessage } from "@/components/ChatPanel";
import { type CellStyleMap } from "./cellStyles";
import { type PipelineExecutionResult, type PipelineOperation } from "./pipelineEngine";
import { SpreadsheetRow, generateMockData, getPresetForFile } from "./mockData";
import {
  beginPipelineRun,
  endPipelineRun,
  previewText,
} from "./pipelineRunLogger";

export type AppPhase = "load" | "workspace";
export type ProcessingState = "idle" | "processing" | "preview";

export interface UndoEntry {
  label: string;
  pipeline: PipelineOperation[];
  timestamp: number;
}

export interface ExcelFile {
  id: string;
  name: string;
  fileName: string;
  sourceFileId: string;
  data: SpreadsheetRow[];
  titleRows: SpreadsheetRow[];
  columns: string[];
  cellStyles: CellStyleMap;
  undoStack: UndoEntry[];
  pipeline: PipelineOperation[];
  processingState: ProcessingState;
}

function createMessageId() {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function useSpreadsheet() {
  const [phase, setPhase] = useState<AppPhase>("load");
  const [files, setFiles] = useState<ExcelFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [computeResult, setComputeResult] = useState<any | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [pipelineResult, setPipelineResult] = useState<PipelineExecutionResult | null>(null);

  const hydrateResult = useCallback((res: any): PipelineExecutionResult => ({
    ...res,
    cellStyles: new Map(Object.entries(res.cellStyles || {})),
    highlightedRowIds: new Set(res.highlightedRowIds || []),
    deletedRowIds: new Set(res.deletedRowIds || []),
    activeScopeIds: res.activeScopeIds ? new Set(res.activeScopeIds) : null,
    steps: (res.steps || []).map((step: any) => ({
      ...step,
      affectedRowIds: new Set(step.affectedRowIds || [])
    }))
  }), []);

  const [newColumnPrompt, setNewColumnPrompt] = useState<{
    suggestedName: string;
    originalInput: string;
    initialOps: PipelineOperation[];
  } | null>(null);

  const [stylePromptSession, setStylePromptSession] = useState<{
    ops: PipelineOperation[];
    allCommands: string[];
    currentIndex: number;
    results: string[];
    fileId: string;
    scope: Set<number> | null;
  } | null>(null);

  const activeFile = files.find((f) => f.id === activeFileId) || null;

  const updatePipelineResult = useCallback(async (file: ExcelFile) => {
    if (!file) return;
    try {
      const res = await backendApi.previewPipeline(
        file.data,
        file.columns,
        file.cellStyles,
        file.pipeline
      );
      setPipelineResult(hydrateResult(res));
    } catch (e) {
      console.error("Failed to update pipeline result:", e);
    }
  }, []);

  useEffect(() => {
    if (activeFile) {
      updatePipelineResult(activeFile);
    } else {
      setPipelineResult(null);
    }
  }, [activeFile?.data, activeFile?.columns, activeFile?.cellStyles, activeFile?.pipeline, updatePipelineResult]);

  const addChatMessage = useCallback((msg: Omit<ChatMessage, "id" | "timestamp">) => {
    setChatMessages((prev) => [...prev, { ...msg, id: createMessageId(), timestamp: Date.now() }]);
  }, []);

  const loadFile = useCallback(
    (
      name: string,
      realData?: Record<string, string>[],
      realColumns?: string[],
      importedStyles?: CellStyleMap,
      realTitleRows?: Record<string, string>[],
      sourceFileId?: string,
      fileName?: string,
    ) => {
      const id = `file_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const srcId = sourceFileId ?? id;
      let data: SpreadsheetRow[];
      let columns: string[];
      let titleRows: SpreadsheetRow[] = [];
      if (realData && realColumns) {
        data = realData as SpreadsheetRow[];
        columns = realColumns;
        if (realTitleRows) titleRows = realTitleRows as SpreadsheetRow[];
      } else {
        const preset = getPresetForFile(name);
        const result = generateMockData(100, preset);
        data = result.data;
        columns = result.columns;
      }
      const newFile: ExcelFile = {
        id, name, fileName: fileName ?? name, sourceFileId: srcId,
        data, columns, titleRows,
        undoStack: [],
        pipeline: [],
        processingState: "idle",
        cellStyles: importedStyles ?? new Map(),
      };
      setFiles((prev) => [...prev, newFile]);
      setActiveFileId(id);
      setPhase("workspace");
    },
    [],
  );

  const switchFile = useCallback((id: string) => setActiveFileId(id), []);

  const updateActiveFile = useCallback(
    (updater: (file: ExcelFile) => ExcelFile) => {
      setFiles((prev) => prev.map((f) => (f.id === activeFileId ? updater(f) : f)));
    },
    [activeFileId],
  );

  const submitCommand = useCallback(
    (input: string) => {
      console.log("[useSpreadsheet] Submitting command to backend:", input);
      if (!activeFile || !pipelineResult) {
        console.warn("[useSpreadsheet] Cannot submit command: activeFile or pipelineResult missing");
        return;
      }

      addChatMessage({ role: "user", content: input });
      updateActiveFile((f) => ({ ...f, processingState: "processing" }));

      const run = async () => {
        beginPipelineRun({ source: "submitCommand", userInput: input });
        let runStatus: "success" | "error" = "success";
        let runError: unknown;
        const runSummary: Record<string, unknown> = {};

        try {
          const scope = pipelineResult.highlightedRowIds.size > 0
            ? Array.from(pipelineResult.highlightedRowIds)
            : undefined;

          const rawResponse = await backendApi.submitCommand(
            input,
            pipelineResult.columns,
            pipelineResult.transformedData,
            scope
          );
          const response = {
            ...rawResponse,
            // If the backend returns operations, we don't need hydration for ops,
            // but if there's a preview in the response (future optimization), we would.
          };

          if (response.exitEarly && response.computeResults.length > 0) {
            const results = response.computeResults;
            setComputeResult(results[0]);
            addChatMessage({
              role: "assistant",
              content:
                results.length <= 1
                  ? "Here is the result."
                  : results.map((r: any) => `${r.label} = ${r.value}`).join("\n"),
              computeResult: results[0],
              pipelineAdded: false,
              opsCount: 0,
            });
            updateActiveFile((f) => ({
              ...f,
              processingState: f.pipeline.length > 0 ? "preview" : "idle",
            }));
            return;
          }

          const ops = response.operations;
          if (!ops || ops.length === 0) {
            updateActiveFile(f => ({ ...f, processingState: f.pipeline.length > 0 ? "preview" : "idle" }));
            addChatMessage({ role: "assistant", content: "I couldn't understand that request." });
            return;
          }

          const computeOps = ops.filter((op) => op.type === "compute");
          const regularOps = ops.filter((op) => op.type !== "compute");

          // Handle special cases handled by frontend before (New Column, Color Prompt)
          const addMatch = ops.find((o) => o.type === "add_column");
          if (addMatch) {
            const suggestedName = addMatch.payload.column || "NewColumn";
            setNewColumnPrompt({ suggestedName, originalInput: input, initialOps: ops });
            addChatMessage({
              role: "assistant",
              content: "I've opened a dialog for you to name your new column and set its default value.",
            });
            updateActiveFile(f => ({ ...f, processingState: "idle" }));
            return;
          }

          const styleOps = regularOps.filter(o =>
            o.type === "style" &&
            o.payload &&
            ["color", "bgcolor", "fontsize"].includes(String(o.payload.styleProp || "").toLowerCase())
          );

          if (styleOps.length > 0) {
            setStylePromptSession({
              ops: styleOps,
              allCommands: ops.map(o => o.label),
              currentIndex: 0,
              results: [],
              fileId: activeFile.id,
              scope: scope ? new Set(scope) : null
            });
            addChatMessage({
              role: "assistant",
              content: `I've prepared a style prompt for you. Please use the popup to choose the exact ${styleOps.length === 1 ? "value" : "values"} you'd like to apply.`,
            });
            updateActiveFile(f => ({ ...f, processingState: "idle" }));
            return;
          }

          if (computeOps.length > 0) setComputeResult(computeOps[0].payload.computeResult);

          addChatMessage({
            role: "assistant",
            content: regularOps.length
              ? regularOps.map((o) => o.label).join(", ")
              : computeOps.length > 0
                ? "Here is the result."
                : "Done — no changes needed.",
            computeResult: computeOps[0]?.payload.computeResult,
            pipelineAdded: regularOps.length > 0,
            opsCount: regularOps.length,
          });

          updateActiveFile(f => ({
            ...f,
            pipeline: [...f.pipeline, ...regularOps],
            processingState: "preview"
          }));

        } catch (e) {
          runStatus = "error";
          runError = e;
          console.error(e);
          addChatMessage({
            role: "assistant",
            content: "Something went wrong while processing your request on the server.",
          });
          updateActiveFile((f) => ({ ...f, processingState: f.pipeline.length > 0 ? "preview" : "idle" }));
        } finally {
          endPipelineRun({ status: runStatus, error: runError, summary: runSummary });
        }
      };
      setTimeout(run, 400);
    },
    [activeFile, pipelineResult, updateActiveFile, addChatMessage],
  );

  const removeFromStack = useCallback(
    (index: number) => {
      updateActiveFile((f) => {
        const newPipeline = f.pipeline.filter((_, i) => i !== index);
        return { ...f, pipeline: newPipeline, processingState: newPipeline.length > 0 ? "preview" : "idle" };
      });
    },
    [updateActiveFile],
  );

  /**
   * Edit an existing op at a specific pipeline index.
   * Sends the current op as `editingOp` context so the LLM modifies it
   * surgically rather than generating from scratch.
   * The returned op(s) splice at `editIndex`, replacing only that position.
   */
  const editCommandAtIndex = useCallback(
    (input: string, editIndex: number) => {
      if (!activeFile || !pipelineResult) return;

      const editingOp = activeFile.pipeline[editIndex];
      if (!editingOp) return;

      addChatMessage({ role: "user", content: `[Edit op ${editIndex + 1}] ${input}` });
      updateActiveFile((f) => ({ ...f, processingState: "processing" }));

      const run = async () => {
        beginPipelineRun({ source: "editCommandAtIndex", userInput: input });
        let runStatus: "success" | "error" = "success";
        let runError: unknown;

        try {
          const scope = pipelineResult.highlightedRowIds.size > 0
            ? Array.from(pipelineResult.highlightedRowIds)
            : undefined;

          const rawResponse = await backendApi.submitCommand(
            input,
            pipelineResult.columns,
            pipelineResult.transformedData,
            scope,
            editingOp,   // ← the key addition: send the op being replaced
          );

          // Compute-only exit: show result but don't mutate stack
          if (rawResponse.exitEarly && rawResponse.computeResults.length > 0) {
            setComputeResult(rawResponse.computeResults[0]);
            addChatMessage({
              role: "assistant",
              content: rawResponse.computeResults.map((r: any) => `${r.label} = ${r.value}`).join("\n"),
              computeResult: rawResponse.computeResults[0],
              pipelineAdded: false,
              opsCount: 0,
            });
            updateActiveFile((f) => ({ ...f, processingState: f.pipeline.length > 0 ? "preview" : "idle" }));
            return;
          }

          const ops = rawResponse.operations;
          if (!ops || ops.length === 0) {
            updateActiveFile((f) => ({ ...f, processingState: f.pipeline.length > 0 ? "preview" : "idle" }));
            addChatMessage({ role: "assistant", content: "I couldn't understand that edit request." });
            return;
          }

          // add_column → open naming dialog (same flow as submitCommand)
          const addMatch = ops.find((o) => o.type === "add_column");
          if (addMatch) {
            const suggestedName = addMatch.payload.column || "NewColumn";
            setNewColumnPrompt({ suggestedName, originalInput: input, initialOps: ops });
            addChatMessage({
              role: "assistant",
              content: "I've opened a dialog for you to name your new column.",
            });
            updateActiveFile((f) => ({ ...f, processingState: "idle" }));
            return;
          }

          // style color/bgcolor/fontsize → open style picker
          const regularOps = ops.filter((o) => o.type !== "compute");
          const styleOps = regularOps.filter((o) =>
            o.type === "style" &&
            o.payload &&
            ["color", "bgcolor", "fontsize"].includes(String(o.payload.styleProp || "").toLowerCase())
          );
          if (styleOps.length > 0) {
            setStylePromptSession({
              ops: styleOps,
              allCommands: ops.map((o) => o.label),
              currentIndex: 0,
              results: [],
              fileId: activeFile.id,
              scope: scope ? new Set(scope) : null,
            });
            addChatMessage({ role: "assistant", content: "Please choose the style value in the popup." });
            updateActiveFile((f) => ({ ...f, processingState: "idle" }));
            return;
          }

          // Normal path: splice returned ops at editIndex, replacing 1 op
          updateActiveFile((f) => {
            const newPipeline = [...f.pipeline];
            newPipeline.splice(editIndex, 1, ...regularOps);
            return { ...f, pipeline: newPipeline, processingState: "preview" };
          });

          addChatMessage({
            role: "assistant",
            content: regularOps.map((o) => o.label).join(", "),
            pipelineAdded: true,
            opsCount: regularOps.length,
          });

        } catch (e) {
          runStatus = "error";
          runError = e;
          console.error(e);
          addChatMessage({ role: "assistant", content: "Something went wrong while editing that operation." });
          updateActiveFile((f) => ({ ...f, processingState: f.pipeline.length > 0 ? "preview" : "idle" }));
        } finally {
          endPipelineRun({ status: runStatus, error: runError, summary: {} });
        }
      };

      setTimeout(run, 400);
    },
    [activeFile, pipelineResult, updateActiveFile, addChatMessage],
  );

  const confirmOperation = useCallback(async () => {
    if (!activeFile || !pipelineResult) return;
    updateActiveFile((f) => {
      const deletedIds = pipelineResult.deletedRowIds;
      const remainingData = pipelineResult.transformedData.filter(r => !deletedIds.has(r.ID));

      const stylesFromBackend = pipelineResult.cellStyles;
      const cellStylesMap = stylesFromBackend instanceof Map
        ? stylesFromBackend
        : new Map(Object.entries(stylesFromBackend || {}));

      return {
        ...f,
        data: remainingData,
        columns: pipelineResult.columns,
        cellStyles: cellStylesMap,
        undoStack: [...f.undoStack, { label: "Apply Pipeline", pipeline: [...f.pipeline], timestamp: Date.now() }],
        pipeline: [],
        processingState: "idle",
      };
    });
    addChatMessage({ role: "assistant", content: "✓ Pipeline committed successfully." });
  }, [activeFile, pipelineResult, updateActiveFile, addChatMessage]);

  const cancelOperation = useCallback(() => {
    updateActiveFile((f) => ({ ...f, pipeline: [], processingState: "idle" }));
  }, [updateActiveFile]);

  const undo = useCallback(() => {
    if (!activeFile || activeFile.undoStack.length === 0) return;
    updateActiveFile((f) => {
      const last = f.undoStack[f.undoStack.length - 1];
      return {
        ...f,
        pipeline: last.pipeline,
        undoStack: f.undoStack.slice(0, -1)
      };
    });
  }, [activeFile, updateActiveFile]);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => {
      const next = prev.filter((f) => f.id !== id);
      if (id === activeFileId && next.length > 0) setActiveFileId(next[0].id);
      else if (next.length === 0) { setActiveFileId(null); setPhase("load"); }
      return next;
    });
  }, [activeFileId]);

  const resolveNewColumn = useCallback(
    async (name: string, defaultValue: string) => {
      if (!newColumnPrompt || !activeFile || !pipelineResult) return;
      const { originalInput } = newColumnPrompt;
      setNewColumnPrompt(null);
      updateActiveFile(f => ({ ...f, processingState: "processing" }));

      beginPipelineRun({
        source: "resolveNewColumn",
        userInput: `${previewText(originalInput, 280)} → column "${name}" default "${previewText(defaultValue, 80)}"`,
      });
      let runStatus: "success" | "error" = "success";
      let runError: unknown;

      try {
        const response = await backendApi.finalizeNewColumn(
          name,
          defaultValue,
          newColumnPrompt.initialOps,
          pipelineResult.transformedData,
          activeFile.columns,
          activeFile.cellStyles
        );

        const regularOps = response.steps
          .map(s => s.operation)
          .filter(o => o.type !== "compute");

        addChatMessage({
          role: "assistant",
          content: `Added column "${name}" and initialized with "${defaultValue}".`,
          pipelineAdded: true,
          opsCount: regularOps.length,
        });

        updateActiveFile(f => ({
          ...f,
          pipeline: [...f.pipeline, ...regularOps],
          processingState: "preview"
        }));
        setPipelineResult(hydrateResult(response));
      } catch (e) {
        runStatus = "error";
        runError = e;
        console.error(e);
        addChatMessage({
          role: "assistant",
          content: "Could not finish adding the column on the server.",
        });
        updateActiveFile(f => ({ ...f, processingState: f.pipeline.length > 0 ? "preview" : "idle" }));
      } finally {
        endPipelineRun({ status: runStatus, error: runError });
      }
    },
    [newColumnPrompt, activeFile, pipelineResult, updateActiveFile, addChatMessage]
  );

  const resolveStylePrompt = useCallback(
    async (values: string[]) => {
      if (!stylePromptSession || !activeFile || !pipelineResult) return;
      const { allCommands, scope } = stylePromptSession;
      setStylePromptSession(null);

      let valIdx = 0;
      const patched = allCommands.map((cmd) => {
        // Find if this command corresponds to one of our styled ops
        // We can just use the #PROMPT# logic if the backend returned it, 
        // or a regex replacement for color/bgcolor/fontsize values.

        if (cmd.includes("#PROMPT#")) {
          return cmd.replace("#PROMPT#", values[valIdx++] || "");
        }

        // Fallback: if the backend didn't return #PROMPT#, we replace the trailing value
        const styleMatch = cmd.match(/style\s+@?.*?\s+(color|bgcolor|fontsize)\s+(#?[^\s]+)/i);
        if (styleMatch) {
          const currentVal = styleMatch[2];
          return cmd.replace(currentVal, values[valIdx++] || currentVal);
        }

        return cmd;
      });

      beginPipelineRun({
        source: "resolveStylePrompt",
        userInput: previewText(patched.join(" | "), 400),
      });
      updateActiveFile(f => ({ ...f, processingState: "processing" }));
      try {
        const response = await backendApi.submitCommand(
          patched.join("\n"),
          pipelineResult.columns,
          pipelineResult.transformedData,
          scope ? Array.from(scope) : undefined
        );
        const regularOps = response.operations.filter(o => o.type !== "compute");
        addChatMessage({
          role: "assistant",
          content: "✓ Style choices confirmed. I've added the operations to your pipeline.",
          pipelineAdded: true,
          opsCount: regularOps.length
        });
        updateActiveFile(f => ({ ...f, pipeline: [...f.pipeline, ...regularOps], processingState: "preview" }));
      } catch (e) {
        console.error(e);
        addChatMessage({
          role: "assistant",
          content: "Could not apply those style changes via server.",
        });
        updateActiveFile(f => ({ ...f, processingState: "preview" }));
      } finally {
        endPipelineRun({
          status: "success",
          summary: { path: "resolve_style_prompt", stylePatchCount: patched.length },
        });
      }
    },
    [stylePromptSession, activeFile, pipelineResult, updateActiveFile, addChatMessage],
  );

  const addPipelineOperations = useCallback(async (ops: PipelineOperation[], commit: boolean) => {
    try {
      updateActiveFile((f) => {
        const nextPipeline = [...f.pipeline, ...ops];
        if (!commit) {
          return { ...f, pipeline: nextPipeline, processingState: "preview" };
        }
        return { ...f, pipeline: nextPipeline, processingState: "processing" };
      });

      if (commit) {
        // If committing, we need to get the final data from the backend
        if (activeFile) {
          const nextPipeline = [...activeFile.pipeline, ...ops];
          const resRaw = await backendApi.previewPipeline(
            activeFile.data,
            activeFile.columns,
            activeFile.cellStyles,
            nextPipeline
          );
          const res = hydrateResult(resRaw);
          const deletedIds = res.deletedRowIds;
          const remainingData = res.transformedData.filter(r => !deletedIds.has(r.ID));

          updateActiveFile(f => ({
            ...f,
            data: remainingData,
            columns: res.columns,
            cellStyles: res.cellStyles,
            undoStack: [...f.undoStack, { label: "Run Stack", pipeline: nextPipeline, timestamp: Date.now() }],
            pipeline: [],
            processingState: "idle"
          }));
          addChatMessage({ role: "assistant", content: `✓ Applied ${ops.length} operations.` });
        }
      }
    } catch (e) {
      console.error("[useSpreadsheet] addPipelineOperations", e);
      addChatMessage({
        role: "assistant",
        content: "Could not update the pipeline via server.",
      });
      updateActiveFile(f => ({ ...f, processingState: "preview" }));
    }
  }, [activeFile, updateActiveFile, addChatMessage]);

  return {
    phase,
    files,
    activeFileId,
    activeFile,
    pipelineResult,
    computeResult,
    chatMessages,
    loadFile,
    switchFile,
    submitCommand,
    editCommandAtIndex,
    removeFromStack,
    confirmOperation,
    cancelOperation,
    undo,
    removeFile,
    removeSourceFile: removeFile,
    resolveNewColumn,
    newColumnPrompt,
    onCancelNewColumn: () => setNewColumnPrompt(null),
    resolveStylePrompt,
    stylePromptSession,
    onCancelStylePrompt: () => setStylePromptSession(null),
    addPipelineOperations,
  };
}