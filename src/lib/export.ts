import * as XLSX from 'xlsx';

/**
 * Export an array of plain objects to a downloaded .xlsx file.
 * Keys become column headers (in first-row order).
 */
export function exportToXlsx(filename: string, rows: Record<string, unknown>[]): void {
  const sheet = XLSX.utils.json_to_sheet(rows.length ? rows : [{}]);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, 'Sheet1');
  XLSX.writeFile(book, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
}
