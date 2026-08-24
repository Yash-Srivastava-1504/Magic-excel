import { useState, useEffect, useCallback } from "react";
import { backendApi, type SavedStack } from "./api";
import type { PipelineOperation } from "./pipelineEngine";

export function useSupabaseStacks(userId: string | null) {
  const [stacks,  setStacks]  = useState<SavedStack[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const fetchStacks = useCallback(async () => {
    if (!userId) { setStacks([]); return; }
    setLoading(true);
    setError(null);
    try {
      const data = await backendApi.fetchStacks(userId);
      setStacks(data);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load stacks");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { fetchStacks(); }, [fetchStacks]);

  const saveStack = useCallback(async (name: string, ops: PipelineOperation[]) => {
    if (!userId) return;
    try {
      const newStack = await backendApi.saveStack(userId, name, ops);
      setStacks((prev) => [newStack, ...prev]);
    } catch (e: any) {
      setError(e.message);
    }
  }, [userId]);

  const updateStack = useCallback(async (updated: SavedStack) => {
    try {
      const resp = await backendApi.updateStack(updated.id, updated.name, updated.ops);
      setStacks((prev) => prev.map((s) => s.id === updated.id ? resp : s));
    } catch (e: any) {
      setError(e.message);
    }
  }, []);

  const deleteStack = useCallback(async (id: string) => {
    try {
      await backendApi.deleteStack(id);
      setStacks((prev) => prev.filter((s) => s.id !== id));
    } catch (e: any) {
      setError(e.message);
    }
  }, []);

  return { stacks, loading, error, saveStack, updateStack, deleteStack, refetch: fetchStacks };
}
