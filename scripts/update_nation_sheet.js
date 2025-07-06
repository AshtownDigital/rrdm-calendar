#!/usr/bin/env node
/**
 * update_nation_sheet.js
 *
 * Replaces the "NATION" worksheet in data/HESA Reference Data.xlsx
 * with the contents of a CSV file containing columns Code,Label.
 *
 * Usage:
 *   node scripts/update_nation_sheet.js <path_to_csv>
 *
 * This script must be run from the project root (RRDM repository).
 */

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

if (process.argv.length < 3) {
  console.error('Usage: node scripts/update_nation_sheet.js <path_to_csv>');
  process.exit(1);
}

const csvPath = path.resolve(process.argv[2]);
if (!fs.existsSync(csvPath)) {
  console.error('CSV file not found:', csvPath);
  process.exit(1);
}

const workbookPath = path.join(__dirname, '..', 'data', 'HESA Reference Data.xlsx');
if (!fs.existsSync(workbookPath)) {
  console.error('Workbook not found:', workbookPath);
  process.exit(1);
}

// Read CSV (simple parser: split at first comma so internal commas in label are preserved)
const csvLines = fs.readFileSync(csvPath, 'utf8').split(/\r?\n/).filter(Boolean);
if (csvLines.length < 2) {
  console.error('CSV seems to have no data rows.');
  process.exit(1);
}

// Skip header line if it starts with "Code"
const rows = [];
for (let i = 0; i < csvLines.length; i++) {
  const line = csvLines[i].trim();
  if (!line) continue;
  if (i === 0 && /^code\s*[;,]/i.test(line)) continue; // header
  // Detect delimiter (tab or comma) on first data line
  const delim = /\t/.test(line) ? '\t' : ',';
  const parts = line.split(delim);
  if (parts.length < 2) {
    console.warn('Skipping malformed line:', line);
    continue;
  }
  const code = parts[0].trim();
  const label = parts.slice(1).join(delim).trim();
  rows.push([code, label]);
}

// Build worksheet data array
const sheetData = [['Code', 'Label'], ...rows];
const nationSheet = XLSX.utils.aoa_to_sheet(sheetData);

// Load existing workbook
const workbook = XLSX.readFile(workbookPath);

// Remove old sheet if present
if (workbook.SheetNames.includes('NATION')) {
  delete workbook.Sheets['NATION'];
  workbook.SheetNames = workbook.SheetNames.filter(n => n !== 'NATION');
}

// Insert new sheet at the beginning (index 0)
workbook.SheetNames.unshift('NATION');
workbook.Sheets['NATION'] = nationSheet;

// Write back workbook (overwrites existing file)
XLSX.writeFile(workbook, workbookPath);
console.log('Successfully updated NATION worksheet with', rows.length, 'rows');
