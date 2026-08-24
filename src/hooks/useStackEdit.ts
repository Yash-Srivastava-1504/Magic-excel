import { useState, useCallback } from "react";
import { backendApi } from "@/lib/api";
import type { PipelineOperation } from "@/lib/pipelineEngine";
import type { SavedStack } from "@/lib/api";

export interface NewColContext {
  suggestedName: string;
  originalInput: string;
  mode: "edit" | "insert";
  targetIndex: number;
}

export interface UseStackEditOptions {
  stack: SavedStack;
  columns: string[];
  liveData: Array<Record<string, unknown>>;
}

export function useStackEdit({ stack, columns, liveData }: UseStackEditOptions) {
  const [name, setName] = useState(stack.name);
  const [ops, setOps] = useState<PipelineOperation[]>([...stack.ops]);
  const [editingIndex, setEditingIndex] = useState(-1);
  const [editInput, setEditInput] = useState("");
  const [editMode, setEditMode] = useState<"edit" | "replace">("edit");
  const [insertingIndex, setInsertingIndex] = useState(-1);
  const [insertInput, setInsertInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newColContext, setNewColContext] = useState<NewColContext | null>(null);

  const handleApplyEdit = useCallback(async () => {
    if (!editInput.trim() || editingIndex === -1) return;
    setIsProcessing(true);
    setError(null);
    try {
      const editingOp = ops[editingIndex];
      const resp = await backendApi.submitCommand(
        editInput, 
        columns, 
        liveData, 
        undefined, 
        editingOp, 
        editMode
      );
      
      const addOp = resp.operations.find(o => o.type === "add_column");
      if (addOp) {
        const suggestedName = addOp.payload.column || "NewColumn";
        setNewColContext({ suggestedName, originalInput: editInput, mode: "edit", targetIndex: editingIndex });
        setIsProcessing(false);
        return;
      }

      const regularOps = resp.operations.filter(o => o.type !== "compute");
      setOps((prev) => {
        const n = [...prev];
        n.splice(editingIndex, 1, ...regularOps);
        return n;
      });
      setEditingIndex(-1);
      setEditInput("");
    } catch (e: any) {
      setError(e.message || "Failed to edit task.");
    } finally {
      setIsProcessing(false);
    }
  }, [editInput, editingIndex, columns, liveData]);

  const handleApplyInsert = useCallback(async () => {
    const target = insertingIndex === -2 ? -1 : insertingIndex;
    if (!insertInput.trim()) return;
    setIsProcessing(true);
    setError(null);
    try {
      const resp = await backendApi.submitCommand(insertInput, columns, liveData);
      
      if (resp.exitEarly && resp.computeResults.length > 0) {
        setError("Aggregate-only questions belong in the main sheet command bar, not the stack inserter.");
        setIsProcessing(false);
        return;
      }

      const addOp = resp.operations.find(o => o.type === "add_column");
      if (addOp) {
        const suggestedName = addOp.payload.column || "NewColumn";
        setNewColContext({ suggestedName, originalInput: insertInput, mode: "insert", targetIndex: target });
        setIsProcessing(false);
        return;
      }

      const regularOps = resp.operations.filter(o => o.type !== "compute");
      setOps((prev) => {
        const n = [...prev];
        n.splice(target + 1, 0, ...regularOps);
        return n;
      });
      setInsertingIndex(-1);
      setInsertInput("");
    } catch (e: any) {
      setError(e.message || "Failed to insert task.");
    } finally {
      setIsProcessing(false);
    }
  }, [insertInput, insertingIndex, columns, liveData]);

  const resolveNewColumn = useCallback(
    async (colName: string, defaultValue: string) => {
      if (!newColContext) return;
      const { originalInput, mode, targetIndex } = newColContext;
      setNewColContext(null);
      setIsProcessing(true);
      try {
        // Just like in useSpreadsheet, we send the intent with the user's specific choices
        const finalInput = `${originalInput} (using name "${colName}" and default "${defaultValue}")`;
        const resp = await backendApi.submitCommand(finalInput, columns, liveData);
        
        const regularOps = resp.operations.filter(o => o.type !== "compute");
        setOps((prev) => {
          const next = [...prev];
          if (mode === "edit") next.splice(targetIndex, 1, ...regularOps);
          else next.splice(targetIndex + 1, 0, ...regularOps);
          return next;
        });
        setEditingIndex(-1);
        setInsertingIndex(-1);
        setEditInput("");
        setInsertInput("");
      } catch (e: any) {
        setError(e.message || "Failed to resolve new column.");
      } finally {
        setIsProcessing(false);
      }
    },
    [newColContext, columns, liveData],
  );

  const removeOp = useCallback((index: number) => {
    setOps((p) => p.filter((_, idx) => idx !== index));
  }, []);

  const startEdit = useCallback(
    (index: number) => {
      setEditingIndex(index === editingIndex ? -1 : index);
      setEditInput("");
      setInsertingIndex(-1);
    },
    [editingIndex],
  );

  const startInsert = useCallback(
    (index: number) => {
      setInsertingIndex(index === insertingIndex ? -1 : index);
      setInsertInput("");
      setEditingIndex(-1);
    },
    [insertingIndex],
  );

  const cancelEdit = useCallback(() => setEditingIndex(-1), []);
  const cancelInsert = useCallback(() => setInsertingIndex(-1), []);

  const buildSavePayload = (): SavedStack => ({
    ...stack,
    name: name.trim() || stack.name,
    ops,
  });

  return {
    name,
    setName,
    ops,
    editingIndex,
    editInput,
    setEditInput,
    editMode,
    setEditMode,
    insertingIndex,
    insertInput,
    setInsertInput,
    isProcessing,
    error,
    newColContext,
    setNewColContext,
    handleApplyEdit,
    handleApplyInsert,
    resolveNewColumn,
    removeOp,
    startEdit,
    startInsert,
    cancelEdit,
    cancelInsert,
    buildSavePayload,
  };
}
