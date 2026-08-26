import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

console.log('Testing jsPDF, autoTable, and XLSX imports...');
console.log('jsPDF:', typeof jsPDF);
console.log('autoTable:', typeof autoTable);
console.log('XLSX:', typeof XLSX.writeFile);

const doc = new jsPDF();
doc.text('Test PDF', 10, 10);
autoTable(doc, {
  head: [['Nombre', 'Grado', 'Hora']],
  body: [['Laura Arroyave', '1 AIPI', '08:00 AM']],
});

console.log('PDF generated successfully!');
