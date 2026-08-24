import { 
    PipelineOperation, 
    PipelineExecutionResult
} from "./pipelineEngine";
import { type ComputeResult } from "./operations";

export interface SavedStack {
    id: string;
    name: string;
    ops: PipelineOperation[];
    createdAt: number;
}

export interface CommandResponse {
    exitEarly: boolean;
    computeResults: ComputeResult[];
    operations: PipelineOperation[];
    plainRewritten?: string;
    plannerInput?: string;
}

const API_BASE_URL = "http://localhost:8000/api/v1";

async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = endpoint.startsWith("http") 
    ? endpoint 
    : `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      ...(!(options.body instanceof FormData) && { "Content-Type": "application/json" }),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Request failed with status ${response.status}`);
  }

  return response.json();
}

/** Interface for the centralized backend API client. */
export interface BackendApi {
    login: (username: string, passcode: string) => Promise<any>;
    uploadFile: (file: File) => Promise<any>;
    previewPipeline: (
        data: any[],
        columns: string[],
        cellStyles: any,
        pipeline: PipelineOperation[],
        scopeIds?: number[]
    ) => Promise<PipelineExecutionResult>;
    submitCommand: (
        input: string,
        columns: string[],
        previewData: any[],
        scopeIds?: number[],
        editingOp?: PipelineOperation,
        editMode?: "edit" | "replace",
    ) => Promise<CommandResponse>;
    fetchStacks: (userId: string) => Promise<SavedStack[]>;
    saveStack: (userId: string, name: string, ops: PipelineOperation[]) => Promise<SavedStack>;
    updateStack: (stackId: string, name: string, ops: PipelineOperation[]) => Promise<SavedStack>;
    deleteStack: (stackId: string) => Promise<void>;
    finalizeNewColumn: (
        name: string,
        defaultValue: any,
        initialOps: PipelineOperation[],
        data: any[],
        columns: string[],
        cellStyles: any
    ) => Promise<PipelineExecutionResult>;
}

export const backendApi: BackendApi = {
    // Auth
    login: async (username: string, passcode: string) => {
        const formData = new FormData();
        formData.append("username", username);
        formData.append("password", passcode);
        return apiCall<any>("/auth/login", {
            method: "POST",
            body: formData,
        });
    },

    // Files
    uploadFile: async (file: File) => {
        const formData = new FormData();
        formData.append("file", file);
        return apiCall<any>("/files/upload", {
            method: "POST",
            body: formData,
        });
    },

    // Pipeline
    previewPipeline: async (
        data: any[], 
        columns: string[], 
        cellStyles: any, 
        pipeline: PipelineOperation[],
        scopeIds?: number[]
    ): Promise<PipelineExecutionResult> => {
        const stylesObj = cellStyles instanceof Map ? Object.fromEntries(cellStyles) : cellStyles;
        return apiCall<PipelineExecutionResult>("/pipeline/preview", {
            method: "POST",
            body: JSON.stringify({
                data,
                columns,
                cellStyles: stylesObj,
                pipeline,
                activeScopeIds: scopeIds
            }),
        });
    },

    finalizeNewColumn: async (
        name: string,
        defaultValue: any,
        initialOps: PipelineOperation[],
        data: any[],
        columns: string[],
        cellStyles: any
    ): Promise<PipelineExecutionResult> => {
        const stylesObj = cellStyles instanceof Map ? Object.fromEntries(cellStyles) : cellStyles;
        return apiCall<PipelineExecutionResult>("/pipeline/finalize-new-column", {
            method: "POST",
            body: JSON.stringify({
                name,
                defaultValue,
                initialOps,
                data,
                columns,
                cellStyles: stylesObj
            }),
        });
    },

    // LLM
    submitCommand: async (
        input: string,
        columns: string[],
        previewData: any[],
        scopeIds?: number[],
        editingOp?: PipelineOperation,
        editMode?: "edit" | "replace",
    ): Promise<CommandResponse> => {
        return apiCall<CommandResponse>("/llm/command", {
            method: "POST",
            body: JSON.stringify({
                input,
                columns,
                previewData,
                scopeIds,
                ...(editingOp ? { editingOp } : {}),
                ...(editMode ? { editMode } : {}),
            }),
        });
    },

    // Stacks
    fetchStacks: async (userId: string): Promise<SavedStack[]> => {
        return apiCall<SavedStack[]>(`/stacks/?user_id=${encodeURIComponent(userId)}`, {
            method: "GET",
        });
    },

    saveStack: async (userId: string, name: string, ops: PipelineOperation[]): Promise<SavedStack> => {
        return apiCall<SavedStack>(`/stacks/?user_id=${encodeURIComponent(userId)}`, {
            method: "POST",
            body: JSON.stringify({ name, ops }),
        });
    },

    updateStack: async (stackId: string, name: string, ops: PipelineOperation[]): Promise<SavedStack> => {
        return apiCall<SavedStack>(`/stacks/${stackId}`, {
            method: "PUT",
            body: JSON.stringify({ name, ops }),
        });
    },

    deleteStack: async (stackId: string): Promise<void> => {
        await apiCall<void>(`/stacks/${stackId}`, {
            method: "DELETE",
        });
    }
};
