# talktoExl

**Enterprise Spreadsheet Automation — tell your data what to do.**

talktoExl is a browser-based spreadsheet engine that lets you transform, filter, and manipulate Excel data in plain English. Just type what you want, use `@` before column names, preview every change before committing, and undo anything with one click. No formulas. No scripting. No SQL.

---

## How It Works

Type what you want to do in the command bar. Use `@` before any column name so talktoExl knows which columns you're referring to. The AI figures out the rest.

```
show me all rows where @Vehicle_Speed is greater than @Speed_Limit
delete drunk drivers where @Alcohol_Consumption is Yes and no seatbelt
set @Status to Critical where @Score is below @Threshold
```

You can be as specific or as casual as you want — mix plain English with `@column` references freely.

---

## Features

### Natural Language Command Bar
Type anything. The AI interprets your intent and maps it to the right operation on your data.

- `@` to mention a column — autocomplete dropdown appears instantly
- `#` to switch between loaded files inline
- `Ctrl + Click` any column header to append it to your command

### Multi-Column Expression Engine
Under the hood, conditions support real arithmetic across columns — so the AI can handle requests like:

```
show rows where speed is more than double the limit
find cases where marks percentage is below the passing threshold
```

Any combination of columns, arithmetic, and comparisons works.

### Operation Pipeline
Commands don't apply immediately — they queue into a pipeline. Stack as many operations as you want, preview them all together in the grid, then commit or discard the entire batch.

- Each operation shows its type, affected row count, and impact percentage
- Expand any step to inspect its structured breakdown
- Remove individual steps without clearing the whole stack
- Warning appears when over 50% of rows are affected

### Show Scoping
When you use `show` or `highlight`, everything that follows in the pipeline is automatically scoped to only those rows:

```
show me rows where @speed exceeds the @limit     ← scopes to matching rows
delete the ones where @alcohol was involved     ← only runs on those rows
set @status to Fatal where no @seatbelt worn     ← still scoped
```

- Multiple show commands broaden the scope (more rows added each time)
- Scoped rows get a **violet left border** in the grid
- Operation fills (red/amber/green) layer on top independently
- Rows outside the scope are dimmed
- If a scoped row doesn't match the next operation — border stays, no fill, moves on

### Undo Stack
Every committed operation is saved with a timestamp. The history bar at the bottom shows recent operations. Click **Undo** to open the full history — revert to any point instantly.

### Multi-File Support
Load multiple Excel, XLS, or CSV files simultaneously. Switch between them from the sidebar or mention a file inline with `#filename`. Each file has its own independent pipeline and undo stack.

### Column Inspector
Click any column header to see its type, unique value count, and value distribution. `Ctrl + Click` any header to append `@ColumnName` directly to the command bar.

### Data Grid
- Virtualised rendering — handles thousands of rows without slowdown
- Inline cell editing with type validation
- Pending deletions shown with strikethrough and red tint
- Pending modifications show old value struck through next to new value in amber

---

## Getting Started

**1. Upload a file** — drag and drop an `.xlsx`, `.xls`, or `.csv` file, or click to browse. Your data never leaves the browser.

**2. Type what you want** — click the command bar at the bottom and describe what you want to do. Use `@` before column names.

**3. Preview** — see the changes highlighted in the grid before anything is committed.

**4. Commit or discard** — click **Commit** to apply the whole pipeline, or **Discard** to throw it away.

---

## Environment Variables

```env
VITE_HF_TOKEN=your_huggingface_token
```

---

## Tech Stack

- **React** + **TypeScript**
- **Tailwind CSS**
- **xlsx** for Excel parsing
- **HuggingFace Router** (OpenAI-compatible) for AI
- Fully client-side — no backend, no database, no data leaves the browser

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

---

## All data stays in your browser. No external storage. No tracking.