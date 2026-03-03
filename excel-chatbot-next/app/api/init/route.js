import { NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import * as XLSX from 'xlsx';

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }

    // Convert uploaded file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Read the Excel workbook in memory
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const data = XLSX.utils.sheet_to_json(sheet);

    if (data.length === 0) {
        return NextResponse.json({ error: "The uploaded Excel file is empty." }, { status: 400 });
    }

    // Extract raw column names from the first object
    const rawColumns = Object.keys(data[0]);
    
    // Sanitize columns: Trim whitespace, replace spaces with underscores internally if needed, or just quote them.
    // To keep it simple and consistent with previous behavior, we'll keep the exact headers but wrap them in quotes for safety.
    const sanitizedColumns = rawColumns.map(col => col.trim());

    // Connect to local database
    const db = new Database('sales.db');

    // Drop the dynamic table if it already exists
    db.exec(`DROP TABLE IF EXISTS data`);

    // Dynamically build CREATE TABLE statement
    // We will assume all data as TEXT generically, although SQLite uses dynamic typing anyway.
    const createCols = sanitizedColumns.map(col => `"${col}" TEXT`).join(", ");
    db.exec(`CREATE TABLE data (${createCols})`);

    // Dynamically build INSERT INTO statement
    const placeholders = sanitizedColumns.map(() => "?").join(", ");
    const insertCols = sanitizedColumns.map(col => `"${col}"`).join(", ");
    const stmt = db.prepare(`INSERT INTO data (${insertCols}) VALUES (${placeholders})`);

    // Insert all rows using a transaction for speed
    const insertMany = db.transaction((rows) => {
      for (const row of rows) {
        const values = sanitizedColumns.map(col => {
            // Match the exact raw column name to extract the value
            const originalKey = rawColumns.find(k => k.trim() === col);
            let val = row[originalKey];
            
            if (val === undefined || val === null) return null;
            if (typeof val === 'string') return val.trim();
            return val;
        });
        stmt.run(...values);
      }
    });

    insertMany(data);

    return NextResponse.json({ 
        success: true, 
        message: `Successfully processed ${data.length} rows and created a dynamic schema.`,
        columns: sanitizedColumns
    });

  } catch (error) {
    console.error("Initialization API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
