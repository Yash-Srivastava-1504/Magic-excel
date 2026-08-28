# DataSage (Magic - Excel)

**AI-Powered Spreadsheet Automation Platform — tell your data what to do.**

DataSage (branded as Magic-Excel) is an AI-powered, browser-based spreadsheet automation tool. Think of it as Excel + ChatGPT merged into one product. Upload any Excel / XLS / CSV file, and instead of writing formulas, VBA macros, or SQL, just TYPE what you want in plain English:

```
"delete rows where @Alcohol_Consumption is Yes and @Seatbelt is No"
"highlight all rows where @Speed is greater than @Speed_Limit"
"set @Status to Critical where @Score is below 40"
"what is the average of @Salary?"
```

The AI understands your intent, translates it into a structured pipeline of operations, and previews the changes visually before you commit.

---

## Features

### Natural Language Command Engine
Type anything. The backend runs a two-stage LLM pipeline:
- **Stage 1 (Detect/Compute Agent):** Computes pure aggregates (sum, avg, min, max, etc.) directly using pandas.
- **Stage 2 (Pipeline Extraction Agent):** Translates transformation commands into a list of structured operation strings, which are parsed into typed pipeline operations.

### Operation Pipeline (Non-Destructive)
Commands don't apply immediately. They queue into a pipeline stack, allowing you to preview multiple operations simultaneously.
- See affected row count and impact percentage for each step.
- Remove individual steps, expand them, or clear the stack.
- Commit applies everything; Discard throws it all away.

### Live Diff Overlay
A virtualised spreadsheet grid that smoothly handles thousands of rows:
- Pending deletions show with strikethrough + red tint.
- Pending modifications show old value struck through + new in amber.
- Scoped rows get a violet left border, while out-of-scope rows are dimmed.

### Safe AST Expression Evaluator
The backend uses Python's `ast` module to evaluate conditions and value expressions (e.g., `@Price * 1.18 > @Budget`). A custom `SafeEvaluator` whitelists only safe operations, ensuring no arbitrary code executes on the server.

### Show Scoping
Using `show` or `highlight` automatically scopes subsequent pipeline operations to matching rows. Broaden scopes additively with multiple "show" commands.

### Column Name Sanitisation (ColMap)
Real-world Excel columns with spaces or special characters are safely mapped to Python identifiers before LLM or AST evaluation, and restored seamlessly in the UI.

### Advanced State Management
- **Undo Stack:** Revert to any point in history instantly.
- **Saved Stacks:** Save, list, load, edit, and delete named pipelines (stored in PostgreSQL).
- **Multi-File Support:** Load multiple files with independent tabs, pipelines, and undo histories. Switch easily via `#filename`.
- **Column Inspector:** View inferred types, unique value counts, and distribution inline.

---

## Tech Stack

**Frontend:**
- **React 18** & **TypeScript** (Vite)
- **Tailwind CSS** + **shadcn/ui** (Radix UI primitives)
- **TanStack Query** (React Query) for server state management
- **React Router v6**
- Custom hooks (`useSpreadsheet`, `useAuth`, `useStackEdit`)

**Backend:**
- **Python 3.14** with **FastAPI** (async, ASGI via Uvicorn)
- **PostgreSQL** (via psycopg2) for database storage
- **pandas** for data engine and pipeline execution
- **HuggingFace Router API** for LLM orchestration (OpenAI-compatible)
- **openpyxl** for Excel parsing
- **Pydantic v2** for robust validation
- **python-jose (JWT HS256)** for authentication

**Architecture Highlights:**
- **Stateless Server:** The backend re-executes the pipeline from scratch on every request, allowing the platform to scale horizontally. All committed state resides in-memory on the frontend.
- **REST API:** Modularized endpoints for auth, files, pipeline, llm, and stacks.

---

## Getting Started

**1. Upload a file** — drag and drop an `.xlsx`, `.xls`, or `.csv` file.
**2. Type what you want** — click the command bar and describe the action. Use `@` before column names to autocomplete.
**3. Preview** — review highlighted changes in the grid (red/amber/green overlays).
**4. Commit or discard** — apply the whole pipeline to your data or throw it away and start fresh.

---

## Keyboard Shortcuts

| Key | Action |
|---|---|
| `@` | Open column autocomplete |
| `#` | Open file switcher |
| `↑ / ↓` | Navigate autocomplete |
| `Tab` | Select autocomplete item |
| `Escape` | Close autocomplete / cancel edit |
| `Ctrl + Click` column | Append `@ColumnName` to command bar |