import XLSX from 'xlsx';

const wb = XLSX.readFile('./ASISTENCIA___2026-2.xlsx');

console.log('=== HOJAS ENCONTRADAS EN EL LIBRO EXCEL ===');
console.log(wb.SheetNames);
console.log(`Total Hojas: ${wb.SheetNames.length}\n`);

wb.SheetNames.forEach((sheetName, idx) => {
  const ws = wb.Sheets[sheetName];
  const ref = ws['!ref'] || 'A1:A1';
  
  // Read first row to see headers
  const json = XLSX.utils.sheet_to_json(ws, { header: 1 });
  const rowCount = json.length;
  const colCount = json[0] ? json[0].length : 0;
  
  console.log(`Sheet ${idx + 1}: "${sheetName}" | Declared Range: ${ref} | Rows with content: ${rowCount} | Header cols: ${colCount}`);
  if (rowCount > 0 && json[0]) {
    console.log(`   Primeros 5 encabezados:`, json[0].slice(0, 7));
  }
});
