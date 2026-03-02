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

    // 1️⃣ Ask GPT to generate SQL
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

Table: sales
Columns:
- Year (INTEGER)
- Territory (TEXT)
- Industry Sector (TEXT)
- State/Province (TEXT)
- Country (TEXT)
- Product Segment (TEXT)
- Product Group (TEXT)
- Trade Sales Quantity (REAL)
- Trade Sales Gallons (REAL)
- Trade Sales Dollars (REAL)
- Product Line (TEXT)

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
            const formattedVal = typeof val === 'number' ? new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(val) : val;
            answerText = `The result is **${formattedVal}**.`;
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
             // If they asked a complex query, print formatting nicely
             answerText = `I found ${result.length} result(s). The top value is: ${JSON.stringify(result[0])}`;
        }
    } else {
        answerText = "I looked through the data but couldn't find any results matching your request.";
    }

    return NextResponse.json({
      success: true,
      text: answerText
    });
  } catch (error) {
    console.error("Query API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
