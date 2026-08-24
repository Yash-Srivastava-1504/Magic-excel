# DataSage — System Architecture Overview

## Context
User asked for an architecture map of the project, which has two top-level source trees:
- `app/` — Python/FastAPI backend
- `src/` — React/TypeScript frontend

---

## Tech Stack

| Side | Technology |
|---|---|
| Backend | Python, FastAPI, psycopg2 (PostgreSQL), Pydantic v2, python-jose (JWT), openpyxl, httpx |
| Frontend | React 18, TypeScript, Vite 7, TanStack Query, Radix UI + shadcn/ui, Tailwind CSS, exceljs |
| LLM | HuggingFace Router API (or OpenAI-compatible endpoint) called from backend |
| DB | PostgreSQL (direct psycopg2, no ORM) |

---

## Entry Points

| File | Role |
|---|---|
| `app/main.py` | Backend startup — FastAPI app, CORS, 5 routers mounted |
| `index.html` → `src/main.tsx` | Frontend HTML shell → React root |
| `src/App.tsx` | React root — providers + auth gate |

---

## Backend Structure (`app/`)

```
app/
├── main.py              # FastAPI app, CORS middleware, router registration
├── config.py            # Pydantic Settings: DATABASE_URL, SECRET_KEY, HF_TOKEN, LLM_*
├── prompts.py           # LLM system prompts (SYSTEM_PROMPT, DETECT_COMPUTE_AGENT_PROMPT, NAME_AGENT_PROMPT)
├── api/
│   ├── dependencies.py  # FastAPI dependency injection
│   └── routes/
│       ├── auth.py      # POST /api/v1/auth/login, GET /me
│       ├── files.py     # POST /api/v1/files/upload
│       ├── pipeline.py  # POST /api/v1/pipeline/preview + /execute
│       ├── llm.py       # POST /api/v1/llm/command  (2-stage LLM)
│       └── stacks.py    # CRUD /api/v1/stacks/
├── models/
│   ├── database.py      # psycopg2 connection pool, get_db() context manager
│   └── schemas.py       # Pydantic models: OperationType enum, PipelineOperation, CellStyle*, Auth, etc.
├── services/
│   ├── auth_service.py      # authenticate_user(), create_access_token() (JWT HS256)
│   ├── excel_parser.py      # parse_excel() → openpyxl → SheetInfo list
│   ├── llm_service.py       # run_detect_compute_stage() + generate_pipeline_operations()
│   ├── operations.py        # parse_command() + process_command() — regex DSL parser
│   ├── pipeline_engine.py   # execute_pipeline() — runs all ops in sequence
│   └── pipeline_compiler.py # SafeEvaluator (AST sandbox), compile_conditions/value_expr
└── utils/
    ├── col_map.py       # ColMap: sanitises column names for safe AST eval
    ├── compute_agg.py   # compute_agg(): avg/sum/min/max/median/count/std
    └── llm_client.py    # chat_completion() / chat_completion_json(): async httpx → LLM API
```

---

## Frontend Structure (`src/`)

```
src/
├── main.tsx             # createRoot → <App />
├── App.tsx              # Providers (QueryClient, Theme, Tooltip) + AuthGate
├── pages/
│   ├── Index.tsx        # Root: FileLoadScreen OR MainWorkspace (state from useSpreadsheet)
│   └── NotFound.tsx     # 404
├── components/
│   ├── LoginScreen.tsx       # Auth form → useAuth().login
│   ├── FileLoadScreen.tsx    # Drag/drop upload → backendApi.uploadFile()
│   ├── MainWorkspace.tsx     # Top-level layout shell
│   ├── DataGrid.tsx          # Spreadsheet renderer; shows pipeline preview diff overlay
│   ├── RightPanel.tsx        # Side panel: Chat + Stacks + OperationPreview
│   ├── ChatPanel.tsx         # Chat UI → onSubmit dispatches command
│   ├── ExcelMenuBar.tsx      # Toolbar: undo, user badge, logout
│   ├── OperationPreview.tsx  # Shows pending ops; confirm/cancel buttons
│   ├── SavedStacksPanel.tsx  # Saved stacks list → load/delete
│   ├── ColorPrompt.tsx       # Modal: hex color picker
│   └── NewColumnModal.tsx    # Modal: new column name + default
├── lib/
│   ├── api.ts               # backendApi: all HTTP calls to localhost:8000/api/v1
│   ├── useAuth.ts           # Login/logout + localStorage session persistence
│   ├── useSpreadsheet.ts    # Central state: files, pipeline, pipelineResult, undo stack
│   ├── useSupabaseStacks.ts # Stacks CRUD via backendApi
│   ├── pipelineEngine.ts    # TypeScript types: PipelineOperation, PipelineExecutionResult
│   ├── cellStyles.ts        # CellStyleMap type
│   └── mockData.ts          # Demo/sample file generator
└── hooks/
    ├── useMention.ts        # @-mention autocomplete in chat
    └── useStackEdit.ts      # Stack edit modal state
```

---

## API Routes

All under `http://localhost:8000/api/v1/`

| Method | Path | Service |
|---|---|---|
| POST | `/auth/login` | auth_service → PostgreSQL users table |
| GET | `/auth/me` | JWT decode |
| POST | `/files/upload` | excel_parser → openpyxl |
| POST | `/pipeline/preview` | pipeline_engine → pipeline_compiler |
| POST | `/pipeline/execute` | Same as preview |
| POST | `/llm/command` | llm_service → llm_client → HF/OpenAI API |
| GET/POST/PUT/DELETE | `/stacks/` | PostgreSQL stacks table |

---

## Full Data Flow

```
1. UPLOAD
   FileLoadScreen
     → backendApi.uploadFile(file)
       → POST /files/upload
         → excel_parser.parse_excel() (openpyxl)
           ← SheetInfo[]: data rows, columns, styles, titleRows
   useSpreadsheet: builds ExcelFile[] state → DataGrid renders

2. NATURAL LANGUAGE COMMAND
   ChatPanel (user types)
     → useSpreadsheet.submitCommand(input)
       → backendApi.submitCommand({ input, columns, previewData })
         → POST /llm/command
           Stage 1 — Detect/Compute:
             ColMap sanitises column names
             LLM call (DETECT_COMPUTE_AGENT_PROMPT) → { mode, items[] }
             If mode=compute_only → return aggregate results directly
           Stage 2 — Generate Ops:
             LLM call (SYSTEM_PROMPT) → ["set @Col to ...", "delete rows where ..."]
             operations.process_command() parses each string → PipelineOperation[]
             ColMap restores original column names
           ← { operations[], computeResults[], exitEarly }
   useSpreadsheet: appends ops to activeFile.pipeline → triggers preview

3. PREVIEW
   useSpreadsheet (useEffect on pipeline change)
     → backendApi.previewPipeline(data, columns, styles, pipeline)
       → POST /pipeline/preview
         → pipeline_engine.execute_pipeline()
           apply_operation_to_state() for each op
           SafeEvaluator (AST sandbox) evaluates conditions/value exprs
           ← { transformedData, cellStyles, highlightedRowIds, deletedRowIds }
   DataGrid: renders diff overlay (highlights, strikethroughs)

4. CONFIRM
   OperationPreview "Confirm" button
     → useSpreadsheet.confirmOperation()
       Commits transformedData to activeFile.data (frontend-only, no DB write)
       Pushes old pipeline to undoStack
       Clears pipeline → state = idle

5. SAVE / LOAD STACKS
   SavedStacksPanel
     → backendApi.saveStack(userId, name, ops) → POST /stacks/
     → backendApi.loadStack(id) → re-runs pipeline with saved ops
```

---

## Key Design Decisions

1. **Stateless server execution** — Backend always receives full current data + full pipeline and re-executes from scratch. No spreadsheet state in DB; commits are frontend-only.

2. **Two-stage LLM** — Stage 1 detects if the command is a pure aggregate (sum, avg, count) and returns early. Stage 2 generates the full pipeline ops list.

3. **Safe AST evaluator** — `pipeline_compiler.SafeEvaluator` sandboxes condition/value expressions using Python's `ast` module to prevent arbitrary code execution.

4. **ColMap** — Translates column names with special characters (spaces, `%`, `/`) to safe Python identifiers for AST eval, then restores originals in the response.

5. **Two LLM clients** — `app/utils/llm_client.py` (backend, active) and `src/utils/llmClient.ts` (frontend, legacy). Main flow routes through backend only.

6. **Auth is passcode-based, plain-text** — Dev-only; `auth_service.py` compares `passcode` column directly (no hashing).
