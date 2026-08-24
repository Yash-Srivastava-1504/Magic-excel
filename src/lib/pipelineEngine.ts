import { type CellStyleMap } from "./cellStyles";

export interface SerializedCondition {
  raw: string;
  referencedColumns: string[];
}

export type OperationType =
  | "delete_rows"
  | "update_cells"
  | "update_cells_all"
  | "add_column"
  | "rename_column"
  | "delete_column"
  | "highlight"
  | "style"
  | "remove_duplicates"
  | "compute";

export interface PipelineOperation {
  id: string;
  type: OperationType;
  label: string;
  payload: Record<string, any>;
}

export interface PipelineStep {
  operation: PipelineOperation;
  affectedRowIds: Set<number>;
  summary: string;
  status: "success" | "error";
  errorMessage?: string;
}

export interface PipelineExecutionResult {
  transformedData: any[];
  columns: string[];
  cellStyles: CellStyleMap;
  steps: PipelineStep[];
  highlightedRowIds: Set<number>;
  activeScopeIds: Set<number> | null;
  deletedRowIds: Set<number>;
}
