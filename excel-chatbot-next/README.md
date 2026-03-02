# Excel Analytics Chatbot (Next.js + OpenAI Code Interpreter)

A full-stack Next.js application that provides a modern, seamless conversational interface for analyzing large Excel datasets. Powered securely by the **OpenAI Responses API (Assistants v2)** and the **Code Interpreter** tool.

This architecture is specifically designed to perform perfect, mathematically accurate data aggregations and spreadsheet analysis by dynamically running Python Pandas code in an invisible cloud sandbox.

## 🚀 Key Features

- **Painless Dynamic Uploads**: Upload an Excel (`.xlsx`) or CSV file directly in the sleek React UI.
- **Persistent Sessions**: Your API key, File IDs, Assistant IDs, and threading context are securely cached in your browser's `localStorage`. You can refresh the page without needing to re-upload an 11MB file!
- **Zero Frontend API Leaks**: The sensitive OpenAI API key is intercepted and processed entirely on the secure Next.js App Router (`/api` layer). Your keys are never exposed in browser Network tabs.
- **Streaming Responses**: Messages are streamed back to the UI in real-time.
- **Premium UI/UX**: Dark mode by default, featuring glass-morphism panels, customized file uploaders, and typing indicators.

---

## 🏗️ Technical Architecture

This application employs the "correct minimal flow" for the OpenAI Assistants API:

1. **Upload (`/api/upload`)**: When an Excel file is selected, the server uploads it securely to OpenAI's Vector/Files storage. It generates an `assistantId` and `fileId`, instantly returning them to the React frontend to cache.
2. **Conversation (`/api/chat`)**: When the user asks a question, the server binds the `fileId` **directly to the message payload** (rather than to the Assistant's global `tool_resources`). This forces the Code Interpreter to actively process the dataset on every query, preventing hallucinations or "missing file" bugs.

### Tech Stack
* **Frontend**: React 18, Next.js 14 App Router, Lucide Icons.
* **Backend**: Node.js, `openai` Node SDK.
* **AI engine**: GPT-4o-mini (Code Interpreter enabled).

---

## 💻 Running it Locally

1. Clone this repository.
2. Ensure you have Node.js 18+ installed.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```
5. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Usage Example
1. You will be greeted by the **Setup Screen**.
2. Input your **OpenAI API Key** (starting with `sk-`).
3. Click to map your `.xlsx` Excel dataset.
4. Click **Start Chatbot**. (Wait ~5 seconds for the cloud dataset initialization).
5. Start asking questions! (e.g., *"What were the total Trade Sales Gallons for the Hardwood category?"*)

> **Note:** If you want to analyze a completely different Excel file, simply click the red **Reset** button in the top right to clear your Local Storage state and start a fresh session!
