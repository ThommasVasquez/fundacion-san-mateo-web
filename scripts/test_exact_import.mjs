import XLSX from 'xlsx';
import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL);

function normalizeStr(str) {
  if (!str) return '';
  return String(str).trim().replace(/\s+/g, ' ').toUpperCase();
}

function parseExcelDate(val) {
  if (!val) return { dateStr: '', dateObj: null };

  if (val instanceof Date) {
    const yyyy = val.getFullYear();
    const mm = String(val.getMonth() + 1).padStart(2, '0');
    const dd = String(val.getDate()).padStart(2, '0');
    return { dateStr: `${yyyy}-${mm}-${dd}`, dateObj: val };
  }

  if (typeof val === 'number') {
    const dateObj = XLSX.SSF.parse_date_code(val);
    if (dateObj) {
      const yyyy = dateObj.y;
      const mm = String(dateObj.m).padStart(2, '0');
      const dd = String(dateObj.d).padStart(2, '0');
      const jsDate = new Date(yyyy, dateObj.m - 1, dateObj.d);
      return { dateStr: `${yyyy}-${mm}-${dd}`, dateObj: jsDate };
    }
  }

  let str = String(val).trim();
  str = str.replace(/(\d{1,2})\/(\d{2})(\d{4})/, '$1/$2/$3');

  if (str.includes('/')) {
    const parts = str.split('/');
    if (parts.length === 3) {
      let dd = parts[0].padStart(2, '0');
      let mm = parts[1].padStart(2, '0');
      let yyyy = parts[2];
      if (yyyy.length === 2) yyyy = '20' + yyyy;
      const jsDate = new Date(`${yyyy}-${mm}-${dd}T12:00:00Z`);
      if (!isNaN(jsDate.getTime())) {
        return { dateStr: `${yyyy}-${mm}-${dd}`, dateObj: jsDate };
      }
    }
  }

  const jsDate = new Date(str);
  if (!isNaN(jsDate.getTime())) {
    const yyyy = jsDate.getFullYear();
    const mm = String(jsDate.getMonth() + 1).padStart(2, '0');
    const dd = String(jsDate.getDate()).padStart(2, '0');
    return { dateStr: `${yyyy}-${mm}-${dd}`, dateObj: jsDate };
  }

  return { dateStr: str, dateObj: null };
}

function mapExactCellStatus(cellVal) {
  const norm = normalizeStr(cellVal);

  if (!norm || norm === 'P' || norm === 'PRESENTE') {
    return { status: 'PRESENTE', note: null };
  }

  if (norm === 'X' || norm === 'FALTA' || norm === 'INASISTENCIA') {
    return { status: 'AUSENTE', note: null };
  }

  if (norm.includes('FESTIVO')) {
    return { status: 'FESTIVO', note: null };
  }

  if (norm.includes('LIBRE')) {
    return { status: 'LIBRE', note: null };
  }

  if (norm.includes('PRACTICA')) {
    return { status: 'PRACTICAS', note: null };
  }

  if (norm.includes('COMITE')) {
    return { status: 'COMITE_ACADEMICO', note: null };
  }

  if (norm.includes('TERMINACION')) {
    return { status: 'TERMINACION_DE_SEMESTRE', note: null };
  }

  if (norm.includes('CLASE NO SE LLEVO') || norm.includes('NO SE LLEVO')) {
    return { status: 'CLASE_NO_SE_LLEVO_A_CABO', note: null };
  }

  if (norm.includes('NO HUBO CLASE') || norm.includes('NO HAY CLASE') || norm.includes('NO HAY  CLASE')) {
    return { status: 'NO_HUBO_CLASE', note: null };
  }

  // Cualquier otra anotación de texto
  return { status: 'PRESENTE', note: String(cellVal).trim() };
}

async function testRun() {
  const wb = XLSX.readFile('./ASISTENCIA___2026-2.xlsx');
  const groupSheets = [
    'I AIPI', 'II AIPI', 'I DIURNO  A', 'II DIURNO  A', 'II DIURNO B', 'III DIURNO A',
    'I NOCHE A', 'II NOCHE A', 'III NOCHE A', 'I SABADO A', 'III SABADO B', 'II SABADO A ',
    'III SABADO A', 'I SABADO CB', 'I DIURNO A CB ', 'I DIURNO B CB ', 'I PREESCOLAR', 'II PREESCOLAR'
  ];

  let totalValidSessions = 0;
  let totalStudentRecords = 0;
  let totalAbsences = 0;
  let totalFestivos = 0;
  let totalLibres = 0;
  let totalPracticas = 0;
  let totalComite = 0;
  let totalPresents = 0;

  for (const sheetName of groupSheets) {
    const ws = wb.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    const headerRow = data[0];

    const studentCols = [];
    for (let c = 2; c < headerRow.length; c++) {
      const rawName = String(headerRow[c] || '').trim();
      const normName = normalizeStr(rawName);
      if (normName && normName !== 'DIA' && normName !== 'FECHA') {
        studentCols.push({ colIdx: c, rawName, normName });
      }
    }

    for (let r = 1; r < data.length; r++) {
      const row = data[r];
      if (!row || row.length === 0) continue;

      const rawFecha = row[1];
      const { dateStr } = parseExcelDate(rawFecha);
      if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) continue;

      // Verificar si la fila tiene alguna marca o si todos los alumnos están vacíos
      const rowVals = studentCols.map(sc => row[sc.colIdx]);
      const hasAnyMark = rowVals.some(v => String(v).trim() !== '');

      // En el Excel, filas donde TODOS están vacíos antes del inicio del semestre o en fines de semana
      // Si la fila está completamente vacía y es fin de semana (o antes del 8 de julio para diurno), no hubo clase
      if (!hasAnyMark) {
        // Fila completamente vacía para este grupo
        continue;
      }

      totalValidSessions++;

      for (const sc of studentCols) {
        let cellVal = row[sc.colIdx];

        // Incorporar actualización de I PREESCOLAR del PDF reciente (26 agosto a 4 sept)
        if (sheetName === 'I PREESCOLAR') {
          if (dateStr === '2026-08-26' && sc.normName.includes('URUEÑA')) cellVal = 'x';
          if (dateStr === '2026-08-27' && sc.normName.includes('URUEÑA')) cellVal = 'x';
          if (dateStr === '2026-08-28') cellVal = 'LIBRE';
          if (dateStr === '2026-08-31' && sc.normName.includes('URUEÑA')) cellVal = 'x';
          if (dateStr === '2026-09-01' && (sc.normName.includes('SIERRA') || sc.normName.includes('URUEÑA'))) cellVal = 'x';
          if (dateStr === '2026-09-02' && sc.normName.includes('URUEÑA')) cellVal = 'x';
          if (dateStr === '2026-09-03' && sc.normName.includes('URUEÑA')) cellVal = 'x';
          if (dateStr === '2026-09-04') cellVal = 'LIBRE';
        }

        const { status } = mapExactCellStatus(cellVal);
        totalStudentRecords++;

        if (status === 'AUSENTE') totalAbsences++;
        else if (status === 'FESTIVO') totalFestivos++;
        else if (status === 'LIBRE') totalLibres++;
        else if (status === 'PRACTICAS') totalPracticas++;
        else if (status === 'COMITE_ACADEMICO') totalComite++;
        else if (status === 'PRESENTE') totalPresents++;
      }
    }
  }

  console.log('=== RESULTADOS DE SIMULACIÓN EXACTA ===');
  console.log('Sesiones con clase real:', totalValidSessions);
  console.log('Total Registros estudiante x sesión:', totalStudentRecords);
  console.log('Total AUSENTE (Fallas exactas del profesor):', totalAbsences);
  console.log('Total FESTIVO:', totalFestivos);
  console.log('Total LIBRE:', totalLibres);
  console.log('Total PRACTICAS:', totalPracticas);
  console.log('Total COMITE ACADEMICO:', totalComite);
  console.log('Total PRESENTE:', totalPresents);
}

testRun();
