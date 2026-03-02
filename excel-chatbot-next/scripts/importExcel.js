const XLSX = require("xlsx");
const Database = require("better-sqlite3");

const db = new Database("sales.db");

const workbook = XLSX.readFile("data.xlsx");
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet);

// Drop the table to force schema to recreate explicitly with the new column
db.exec(`DROP TABLE IF EXISTS sales`);

// Create table
db.exec(`
  CREATE TABLE sales (
    Year INTEGER,
    Territory TEXT,
    "Industry Sector" TEXT,
    "State/Province" TEXT,
    Country TEXT,
    "Product Segment" TEXT,
    "Product Group" TEXT,
    "Trade Sales Quantity" REAL,
    "Trade Sales Gallons" REAL,
    "Trade Sales Dollars" REAL,
    "Product Line" TEXT
  )
`);

// Insert rows
const stmt = db.prepare(`
  INSERT INTO sales 
  (Year, Territory, "Industry Sector", "State/Province", Country, "Product Segment", "Product Group", "Trade Sales Quantity", "Trade Sales Gallons", "Trade Sales Dollars", "Product Line")
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

// Using a transaction for speed since there are ~170k rows
const insertMany = db.transaction((rows) => {
  for (const row of rows) {
    stmt.run(
      Number(row.Year) || null,
      row.Territory ? String(row.Territory).trim() : null,
      row["Industry Sector"] ? String(row["Industry Sector"]).trim() : null,
      row["State/Province"] ? String(row["State/Province"]).trim() : null,
      row.Country ? String(row.Country).trim() : null,
      row["Product Segment"] ? String(row["Product Segment"]).trim() : null,
      row["Product Group"] ? String(row["Product Group"]).trim() : null,
      Number(row["Trade Sales Quantity"]) || 0,
      Number(row["Trade Sales Gallons"]) || 0,
      Number(row["Trade Sales Dollars (Group)"] || row["Trade Sales Dollars"]) || 0,
      (row["Product Line"] || row.Product || "").trim()
    );
  }
});

insertMany(data);

console.log(`Imported successfully. Inserted ${data.length} rows.`);
