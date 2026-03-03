import OpenAI from "openai";
import Database from "better-sqlite3";
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { apiKey, message } = await req.json();

    if (!apiKey || !message) {
      return NextResponse.json({ error: "Missing API Key or Message" }, { status: 400 });
    }

    const openai = new OpenAI({ apiKey });
    const db = new Database("sales.db");

    // 1️⃣ Dynamically extract the schema layout from SQLite
    const tableInfo = db.prepare("PRAGMA table_info(data)").all();
    if (!tableInfo || tableInfo.length === 0) {
        throw new Error("No data found in the database. Please upload an Excel file first.");
    }
    
    // Build a text list of columns for GPT
    const dynamicColumns = tableInfo.map(info => `- ${info.name} (${info.type || 'TEXT'})`).join("\n");

    // 2️⃣ Ask GPT to generate SQL
    const response = await openai.responses.create({
      model: "gpt-4o-mini", // Fast model
      input: `
You are a SQLite SQL generator.

Rules:
- If question asks for "count", use COUNT(*)
- If question asks for total or sum, use SUM()
- Always use TRIM() and LOWER() for text comparisons (e.g. LOWER(TRIM(Country)) = LOWER('australia'))
- Always wrap multi-word column names in double quotes (e.g. "Trade Sales Gallons")
- Always return only ONE SELECT statement
- Never return explanation or markdown wrappers, return ONLY the raw SQL string

Table: data
Columns:
${dynamicColumns}

Question:
${message}
`
    });

    // Remove any markdown block characters if the LLM hallucinated them
    const sql = response?.output_text?.replace(/```sql/g, '').replace(/```/g, '').trim();
    console.log('\n🔵 [1] GPT Generated SQL:\n', sql);

    if (!sql) {
        throw new Error("OpenAI failed to generate a valid SQL prompt.");
    }

    // 2️⃣ Execute SQL locally
    let result;
    try {
        result = db.prepare(sql).all();
        console.log(`\n🟡 [2] SQL Result: ${result.length} row(s)`, result.slice(0, 5));
    } catch (dbError) {
        console.warn("SQL Execution failed:", dbError.message);
        return NextResponse.json({
            success: false,
            text: "I had trouble gathering the data for that. Could you try rephrasing your question?"
        });
    }

    // 3️⃣ Send data + original question to OpenAI for natural language interpretation
    let answerText = "";
    if (result && result.length > 0) {
        // Summarise the data for the prompt (cap at 50 rows to stay within token limits)
        const summaryRows = result.slice(0, 50);
        const dataJson = JSON.stringify(summaryRows, null, 2);
        const totalRows = result.length;
        const truncationNote = totalRows > 50 
            ? `\n(Note: Only the first 50 of ${totalRows} rows are shown above.)` 
            : '';

        const interpretResponse = await openai.responses.create({
            model: "gpt-4o-mini",
            input: `You are a sharp, concise data analyst. A user asked a question and you retrieved data to answer it.

User question: "${message}"
Data: ${dataJson}${truncationNote}

Instructions:
- Answer in 1–3 sentences maximum. Be direct — lead with the key answer.
- Use **bold** for standout numbers, names, and comparisons.
- If comparing values, include the percentage difference.
- Highlight anything surprising or noteworthy in a single, punchy sentence.
- Never mention SQL, databases, or technical details. Just give the insight.`
        });

        answerText = interpretResponse?.output_text?.trim() || 
            "I retrieved the data but couldn't generate an interpretation. Please try rephrasing.";
        console.log('\n🟢 [3] AI Interpretation:\n', answerText);

    } else {
        answerText = "I looked through the data but couldn't find any matching records. Please double-check the filters or try rephrasing your question.";
    }

    // 4️⃣ Detect chart requests and build chart data
    const chartKeywords = /\b(chart|graph|pie|bar|plot|visual|visuali[sz]e|show\s+graph)\b/i;
    const wantsChart = chartKeywords.test(message);
    
    let chartData = null;
    if (wantsChart && result && result.length > 1) {
        const keys = Object.keys(result[0]);
        // Heuristic: first TEXT-like key = label, first numeric key = value
        const labelKey = keys.find(k => typeof result[0][k] === 'string' || typeof result[0][k] === 'number' && !Number.isFinite(result[0][k])) || keys[0];
        const valueKey = keys.find(k => typeof result[0][k] === 'number' && k !== labelKey) || keys[1];
        
        if (labelKey && valueKey) {
            const chartType = /pie/i.test(message) ? 'pie' : 'bar';
            // Limit to top 15 slices for readability
            const slices = result.slice(0, 15);
            chartData = {
                type: chartType,
                labels: slices.map(r => String(r[labelKey] ?? '?')),
                values: slices.map(r => Number(r[valueKey]) || 0),
                labelKey,
                valueKey
            };
        }
    }

    return NextResponse.json({
      success: true,
      text: answerText,
      chart: chartData
    });
  } catch (error) {
    console.error("Query API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
