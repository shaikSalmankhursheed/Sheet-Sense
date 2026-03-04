# 🤖 Sadhana Bot — AI-Powered Excel Analytics

> A full-stack Next.js chatbot that lets you **upload any Excel file** and query it using plain English. Powered by a **two-stage OpenAI GPT-4o-mini pipeline** — first for SQL generation, then for natural language interpretation — backed by a local SQLite engine for fast, private data analysis.

---

## ✨ Features

| Feature | Details |
|---|---|
| 🗂️ **Dynamic Excel Upload** | Upload any `.xlsx` / `.xls` file — schema is auto-detected from column headers |
| 🧠 **Natural Language Queries** | Ask questions in plain English, e.g. *"Total trade sales by country"* |
| 🤖 **Two-Stage AI Pipeline** | Stage 1: GPT generates SQL. Stage 2: GPT interprets the results as a human-readable insight |
| ⚡ **Blazing Fast** | SQL runs in ~50ms–2s via local SQLite, never waiting on cloud sandboxes |
| 📊 **Interactive Charts** | Ask for a pie or bar chart — rendered via Chart.js with hover tooltips |
| 🔤 **Column Autocomplete** | Type 2+ characters in the input to get column name suggestions |
| 🔄 **Session Management** | Swap datasets anytime via the "Change Dataset" button |

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 16 (App Router), React 19 |
| **Styling** | Vanilla CSS — dark mode ChatGPT-inspired design |
| **AI / SQL Generation** | OpenAI Responses API (`gpt-4o-mini`) |
| **AI / Interpretation** | OpenAI Responses API (`gpt-4o-mini`) — second call for human-readable answers |
| **Database** | `better-sqlite3` — fast, synchronous local SQLite |
| **Excel Parsing** | `xlsx` (SheetJS) — parses `.xlsx` in-memory on the backend |
| **Charts** | `chart.js` + `react-chartjs-2` — interactive Pie & Bar charts |
| **Icons** | `lucide-react` |

---

## 🔄 Full Application Workflow

```
User uploads Excel file + enters OpenAI API key
            │
            ▼
   POST /api/init
   ┌─────────────────────────────────────────┐
   │ 1. Parse .xlsx in memory via SheetJS    │
   │ 2. Extract column headers dynamically   │
   │ 3. DROP TABLE IF EXISTS data            │
   │ 4. CREATE TABLE with exact column names │
   │ 5. INSERT all rows via transaction      │
   └─────────────────────────────────────────┘
            │
            ▼
     User types a question
            │
            ▼
   POST /api/query  ── Stage 1: SQL Generation
   ┌─────────────────────────────────────────────────────┐
   │ 1. PRAGMA table_info(data) → read live schema       │
   │ 2. Build prompt: "Table: data, Columns: [...]"      │
   │ 3. Call OpenAI → receives raw SQL string            │
   │ 4. Execute SQL locally via better-sqlite3           │
   └─────────────────────────────────────────────────────┘
            │
            ▼
   POST /api/query  ── Stage 2: AI Interpretation
   ┌─────────────────────────────────────────────────────┐
   │ 5. Take up to 50 result rows + original question    │
   │ 6. Send to OpenAI for natural language analysis     │
   │ 7. Receive concise, insight-rich text response      │
   └─────────────────────────────────────────────────────┘
            │
            ▼
   POST /api/query  ── Stage 3: Chart Detection
   ┌─────────────────────────────────────────────────────┐
   │ 8. Scan question for chart keywords (pie, bar, etc) │
   │ 9. Build chart payload (labels + values, max 15)   │
   └─────────────────────────────────────────────────────┘
            │
            ▼
   Frontend renders:
   - Formatted text with bold Markdown values
   - Interactive Chart.js chart (if requested)
```

---

## 🚀 First-Time Setup Guide

### Prerequisites
- [Node.js 18+](https://nodejs.org/)
- An [OpenAI API key](https://platform.openai.com/account/api-keys) (starts with `sk-`)

### Step 1 — Clone and Install

```bash
git clone <your-repo-url>
cd excel-chatbot-next
npm install
```

### Step 2 — Start the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Step 3 — Upload Your Data

1. You will see the **Setup Screen**
2. Enter your **OpenAI API Key** (`sk-...`)
3. Click the file zone and select your `.xlsx` or `.xls` file
4. Click **Get Started**

The app will automatically:
- Parse your Excel file in memory
- Detect all column headers
- Build a SQLite database on the backend
- Redirect you to the chat interface

> **Note:** For very large files (100k+ rows) this may take 5–15 seconds on first load.

### Step 4 — Start Chatting!

Try questions like:
- *"What is the total trade sales in dollars?"*
- *"Which country has the highest trade sales?"*
- *"Show a bar chart of trade sales by industry sector"*
- *"Top 5 product lines by revenue"*

---

## 🤖 Two-Stage AI Pipeline

Each query goes through two separate OpenAI calls:

| Stage | Role | What it does |
|---|---|---|
| **Stage 1 — SQL Generator** | `gpt-4o-mini` (system prompt) | Translates your plain-English question into a single SQLite `SELECT` statement |
| **Stage 2 — Data Interpreter** | `gpt-4o-mini` (data analyst prompt) | Reads the SQL result rows and writes a concise, insight-rich answer in 1–3 sentences |

**Key behaviours of the interpreter:**
- Leads with the key answer directly
- Uses **bold** for standout numbers, names, and comparisons
- Includes percentage differences when comparing values
- Highlights surprising or noteworthy findings
- Never mentions SQL, databases, or technical details

> **Data Note:** Up to **50 rows** of your query result are sent to OpenAI in Stage 2 for interpretation. If your result has more than 50 rows, only the first 50 are included in the AI prompt.

---

## 📊 Chart Support

Append chart keywords to any query to render an interactive chart:

| Keyword | Chart Type |
|---|---|
| `pie chart`, `pie graph` | 🥧 Pie Chart with legend and percentage tooltips |
| `bar chart`, `bar graph` | 📊 Bar Chart with formatted Y-axis |
| `graph`, `visualize`, `plot` | Auto-detected (defaults to bar) |

**Example:**
> *"Show a pie chart of trade sales dollars by country"*

Charts render with:
- ✅ Hover tooltips with formatted values
- ✅ Animated entry
- ✅ Click-to-toggle legend items
- ✅ Up to 15 slices/bars for readability

---

## 💡 Column Autocomplete

While typing in the chat input, the app suggests matching column names:

- Triggers after **2+ characters** that match any column header
- Navigate with `↑ / ↓` arrow keys
- Accept with `Tab` or `Enter`
- Dismiss with `Escape`

---

## 🔑 Session Management

- Your API key and database state are cached in `localStorage`
- Refreshing the browser will restore your session automatically
- Click **"Change Dataset"** in the sidebar to:
  - Clear the session
  - Upload a new Excel file with a completely different schema

---

## 📁 Project Structure

```
excel-chatbot-next/
├── app/
│   ├── api/
│   │   ├── init/route.js        ← Excel upload → SQLite schema builder
│   │   ├── query/route.js       ← NL → SQL (Stage 1) → AI Interpretation (Stage 2) → Chart data
│   │   └── columns/route.js     ← Returns column names for autocomplete
│   ├── globals.css              ← Full dark-mode ChatGPT-style UI
│   ├── layout.tsx               ← Root layout and metadata
│   └── page.js                  ← Main chat UI + Chart.js components
├── scripts/
│   └── importExcel.js           ← Optional: manual bulk import script
├── public/                      ← Static assets
├── sales.db                     ← Auto-generated SQLite database (gitignored)
└── README.md
```

---

## ⚠️ Notes

- `sales.db` is auto-generated by the app on first upload — do **not** commit it to git
- The app uses `gpt-4o-mini` for cost efficiency. Swap to `gpt-4o` in `app/api/query/route.js` for higher accuracy
- **Data Privacy:** SQL queries run entirely locally. However, up to 50 rows of your *query result* are sent to OpenAI in Stage 2 for interpretation. Raw data that does not match your query is never sent.
- All column headers are sent to OpenAI as part of the SQL generation prompt in Stage 1
