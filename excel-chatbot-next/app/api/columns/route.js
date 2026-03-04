import Database from 'better-sqlite3';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const db = new Database('sales.db');
    const tableInfo = db.prepare("PRAGMA table_info(data)").all();

    if (!tableInfo || tableInfo.length === 0) {
      return NextResponse.json({ columns: [] });
    }

    const columns = tableInfo.map(row => row.name);
    return NextResponse.json({ columns });
  } catch (error) {
    return NextResponse.json({ columns: [] });
  }
}
