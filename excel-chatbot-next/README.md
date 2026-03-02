# Sadhana Bot (Next.js + OpenAI Text-to-SQL)

A full-stack Next.js application that provides a blazing-fast conversational interface for analyzing large Excel datasets. Powered by a seamless **OpenAI Responses API** logic that generates pure SQL dynamically and evaluates it instantly using a local **SQLite database**.

This architecture guarantees 100% data security because your raw database is NEVER uploaded to an external server. OpenAI simply dictates the query string to execute locally.

## 🚀 Key Features

- **Blazing Fast Analytics**: Bypass slow Code Interpreter sandboxes. Query 170k+ rows in strictly **~50ms - 2 seconds** depending on the speed of the OpenAI LLM generating the SQL.
- **100% Data Privacy (No Uploads)**: Data is processed and evaluated on the actual backend `better-sqlite3` engine. OpenAI only generates `SELECT * FROM...` strings, receiving zero context about your actual rows.
- **Persistent Sessions**: Your API key caches intelligently in the frontend via `localStorage` for quick re-entry.

---

## 💻 Step-by-Step Setup Guide

Follow these instructions to get the application running on your local machine.

### Step 1: Install Dependencies
Ensure you have Node.js 18+ installed on your system.
Clone the repository and install the required Next.js and SQLite packages:
```bash
npm install
```

### Step 2: Prepare Your Dataset
Ensure your raw Excel file is named exactly `data.xlsx` and is placed in the root of the project directory.

> **Note**: The engine strictly looks for this filename.

### Step 3: Initialize the SQLite Database
Because the application queries a fast SQLite database instead of reading Excel directly during chat, you must run the importer script to convert your `data.xlsx` into `sales.db`.

Run the following command in your terminal:
```bash
node scripts/importExcel.js
```

You should see an output similar to:
`Imported successfully. Inserted 170528 rows.`

This process drops any existing `sales.db` table and recreates it cleanly with all 11 columns mapped and sanitized (trimming whitespace).

### Step 4: Start the Development Server
Once the database `sales.db` is built in the root directory, you can spin up the Next.js frontend:

```bash
npm run dev
```

### Step 5: Authenticate & Chat
1. Open [http://localhost:3000](http://localhost:3000) in your browser.
2. You will be greeted by the **Setup Screen**.
3. Input your **OpenAI API Key** (starting with `sk-`) to authenticate. *This is safely cached locally.*
4. Ask a question! For example: *"Which Industry Sector has the highest number of trade sales in dollars?"*

The OpenAI API will generate a SQLite query, the backend will execute it against the local database, and the frontend will instantly print the natural language result!
