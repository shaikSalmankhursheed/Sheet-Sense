import * as XLSX from "xlsx";
import Database from "better-sqlite3";

const db = new Database("sales.db");

const workbook = XLSX.readFile("data.xlsx");
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet);

// Create table
db.exec(`
  CREATE TABLE IF NOT EXISTS sales (
    Country TEXT,
    "Trade Sales Gallons" REAL,
    "Trade Sales Dollars" REAL,
    Year INTEGER,
    Product TEXT
  )
`);

// Insert rows
const stmt = db.prepare(`
  INSERT INTO sales 
  (Country, "Trade Sales Gallons", "Trade Sales Dollars", Year, Product)
  VALUES (?, ?, ?, ?, ?)
`);

// Using a transaction for speed since there are ~170k rows
const insertMany = db.transaction((rows) => {
  for (const row of rows) {
    stmt.run(
      row.Country,
      row["Trade Sales Gallons"],
      row["Trade Sales Dollars (Group)"] || row["Trade Sales Dollars"],
      row.Year,
      row["Product Line"] || row.Product
    );
  }
});

insertMany(data);

console.log(`Imported successfully. Inserted ${data.length} rows.`);
