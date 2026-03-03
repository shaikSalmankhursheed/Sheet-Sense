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

    if (!sql) {
        throw new Error("OpenAI failed to generate a valid SQL prompt.");
    }

    // 2️⃣ Execute SQL locally
    let result;
    try {
        result = db.prepare(sql).all();
    } catch (dbError) {
        console.warn("SQL Execution failed:", dbError.message);
        return NextResponse.json({
            success: false,
            text: "I had trouble gathering the data for that. Could you try rephrasing your question?"
        });
    }

    // 3️⃣ Construct a friendly answer
    let answerText = "";
    if (result && result.length > 0) {
        const firstRow = result[0];
        const keys = Object.keys(firstRow);
        
        // If it's a simple scalar result (like SELECT SUM(...))
        if (result.length === 1 && keys.length === 1) {
            const val = firstRow[keys[0]];
            if (val === null || val === undefined) {
                answerText = "I couldn't find any matching data for that query. Please double-check the filters and try again.";
            } else {
                const formattedVal = typeof val === 'number' ? new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(val) : val;
                answerText = `The result is **${formattedVal}**.`;
            }
        } else if (result.length === 1) {
             // For GROUP BY queries that return a single top result (e.g. highest sector)
             const key = keys.find(k => k !== 'total_sales' && k !== 'count' && !k.includes('(')) || keys[0];
             const valKey = keys.find(k => k !== key);
             
             let description = firstRow[key];
             if (valKey) {
                 const val = firstRow[valKey];
                 const formattedVal = typeof val === 'number' ? new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(val) : val;
                 description += ` (**${formattedVal}**)`;
             }
             answerText = `The top result is **${description}**.`;
        } else {
             // Multi-row result — format as a clean numbered list
             const fmt = (v) => typeof v === 'number'
                 ? new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(v)
                 : (v ?? '—');

             const maxDisplay = 200;
             const display = result.slice(0, maxDisplay);
             const keys = Object.keys(result[0]);
             
             const rows = display.map((row, i) => {
                 const parts = keys.map(k => `**${k}**: ${fmt(row[k])}`).join('  |  ');
                 return `${i + 1}. ${parts}`;
             }).join('\n');

             const suffix = result.length > maxDisplay ? `\n\n_Showing first ${maxDisplay} of ${result.length} results. Refine your query to narrow down further._` : '';
             answerText = `**${result.length} result(s) found:**\n\n${rows}${suffix}`;
        }
    } else {
        answerText = "I looked through the data but couldn't find any results matching your request.";
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
