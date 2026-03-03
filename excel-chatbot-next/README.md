# 🤖 Sadhana Bot — AI-Powered Excel Analytics

> A full-stack Next.js chatbot that lets you **upload any Excel file** and query it using plain English. Powered by OpenAI GPT-4o-mini for natural language → SQL translation, and a local SQLite engine for instant, private data analysis.

---

## ✨ Features

| Feature | Details |
|---|---|
| 🗂️ **Dynamic Excel Upload** | Upload any `.xlsx` / `.xls` file — schema is auto-detected from column headers |
| 🧠 **Natural Language Queries** | Ask questions in plain English, e.g. *"Total trade sales by country"* |
| ⚡ **Blazing Fast** | Queries run in ~50ms–2s via local SQLite, never waiting on cloud sandboxes |
| 📊 **Interactive Charts** | Ask for a pie or bar chart — rendered via Chart.js with hover tooltips |
| 🔒 **100% Data Privacy** | Your data never leaves your machine. OpenAI only receives the SQL query string |
| 🔤 **Column Autocomplete** | Type 2+ characters in the input to get column name suggestions |
| 🔄 **Session Management** | Swap datasets anytime via the "Change Dataset" button |

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 14 (App Router), React 18 |
| **Styling** | Vanilla CSS — dark mode ChatGPT-inspired design |
| **AI / SQL Generation** | OpenAI Responses API (`gpt-4o-mini`) |
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
   POST /api/query
   ┌─────────────────────────────────────────────────────┐
   │ 1. PRAGMA table_info(data) → read live schema       │
   │ 2. Build prompt: "Table: data, Columns: [...]"      │
   │ 3. Call OpenAI → receives raw SQL string            │
   │ 4. Execute SQL locally via better-sqlite3           │
   │ 5. Format result as readable text / chart data      │
   └─────────────────────────────────────────────────────┘
            │
            ▼
   Frontend renders:
   - Formatted text with bold Markdown values
   - Interactive Chart.js chart (if requested)
```

---

## � First-Time Setup Guide

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
│   │   ├── query/route.js       ← NL → SQL → result formatter
│   │   └── columns/route.js     ← Returns column names for autocomplete
│   ├── globals.css              ← Full dark-mode ChatGPT-style UI
│   └── page.js                  ← Main chat UI + Chart.js components
├── scripts/
│   └── importExcel.js           ← Optional: manual bulk import script
├── sales.db                     ← Auto-generated SQLite database (gitignored)
└── README.md
```

---

## ⚠️ Notes

- `sales.db` is auto-generated by the app on first upload — do **not** commit it to git
- The app uses `gpt-4o-mini` for cost efficiency. Swap to `gpt-4o` in `app/api/query/route.js` for higher accuracy
- All data processing happens locally — OpenAI **never sees your actual data rows**
