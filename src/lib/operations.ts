import type { PipelineOperation, SerializedCondition } from "./pipelineEngine";

export type DiffType = "delete" | "modify" | "add" | "highlight";

export interface ComputeResult {
  label: string;
  expression: string;
  value: number | string;
  /** Safe column key as matched in the parser (used to restore real header in UI). */
  columnSafe?: string;
}

// Interfaces and types used by the UI were kept.
// Logic has been moved to backend/app/services/operations.py