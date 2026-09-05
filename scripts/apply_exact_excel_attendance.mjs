import XLSX from 'xlsx';
import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL);

async function retrySql(queryFn, maxRetries = 5, baseDelayMs = 1500) {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await queryFn();
    } catch (err) {
      attempt++;
      if (attempt >= maxRetries) throw err;
      const waitMs = baseDelayMs * Math.pow(2, attempt - 1);
      console.warn(`   ⚠️ Reintentando consulta SQL (intento ${attempt}/${maxRetries}) tras error: ${err.message} (esperando ${waitMs}ms)...`);
      await new Promise(r => setTimeout(r, waitMs));
    }
  }
}

function normalizeStr(str) {
  if (!str) return '';
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
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

  if (norm === 'X' || norm === 'A' || norm === 'FALLA' || norm === 'AUSENTE' || norm === 'F') {
    return { status: 'AUSENTE', note: null };
  }

  if (norm.includes('FESTIVO')) {
    return { status: 'FESTIVO', note: null };
  }

  if (norm.includes('LIBRE') || norm.includes('NO LECTIVO') || norm.includes('DIA LIBRE')) {
    return { status: 'LIBRE', note: null };
  }

  if (norm.includes('COMITE')) {
    return { status: 'COMITE_ACADEMICO', note: null };
  }

  if (norm.includes('PRACTICA') || norm.includes('PR')) {
    return { status: 'PRACTICAS', note: null };
  }

  if (norm.includes('EXCUSA') || norm.includes('MEDICA')) {
    return { status: 'EXCUSA_MEDICA', note: null };
  }

  if (norm.includes('CALENDARIO B') || norm.includes('CB')) {
    return { status: 'CALENDARIO_B', note: null };
  }

  if (norm.includes('TERMINACION')) {
    return { status: 'TERMINACION_DE_SEMESTRE', note: null };
  }

  if (norm.includes('CONGELADO')) {
    return { status: 'CONGELADO', note: null };
  }

  if (norm.includes('NO HUBO CLASE') || norm.includes('NO HAY CLASE') || norm.includes('NO HAY  CLASE')) {
    return { status: 'NO_HUBO_CLASE', note: null };
  }

  // Nota explicativa
  return { status: 'PRESENTE', note: String(cellVal).trim() };
}

async function run() {
  console.log('🚀 Iniciando Carga Rápida y Robusta de ASISTENCIA___2026-2.xlsx...\n');

  const wb = XLSX.readFile('./ASISTENCIA___2026-2.xlsx');
  const groupSheets = [
    'I AIPI', 'II AIPI', 'I DIURNO  A', 'II DIURNO  A', 'II DIURNO B', 'III DIURNO A',
    'I NOCHE A', 'II NOCHE A', 'III NOCHE A', 'I SABADO A', 'III SABADO B', 'II SABADO A ',
    'III SABADO A', 'I SABADO CB', 'I DIURNO A CB ', 'I DIURNO B CB ', 'I PREESCOLAR', 'II PREESCOLAR'
  ];

  // 1. Obtener mapeo de grupos
  const dbGroups = await retrySql(() => sql`SELECT id, nombre FROM groups`);
  const groupMap = new Map();
  dbGroups.forEach(g => {
    groupMap.set(normalizeStr(g.nombre), g.id);
  });

  // 2. Obtener mapeo de estudiantes
  const dbStudents = await retrySql(() => sql`SELECT id, nombre_original, nombre_normalizado FROM students_normalized`);
  const studentMap = new Map();
  dbStudents.forEach(s => {
    studentMap.set(normalizeStr(s.nombre_original), s.id);
    studentMap.set(normalizeStr(s.nombre_normalizado), s.id);
  });

  // 3. Procesar cada hoja
  let totalProcessedRecords = 0;
  let totalAbsences = 0;

  for (const sheetName of groupSheets) {
    const normSheet = normalizeStr(sheetName);
    const groupId = groupMap.get(normSheet);
    if (!groupId) {
      console.error(`❌ Grupo no encontrado en BD: "${sheetName}"`);
      continue;
    }

    const ws = wb.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    const headerRow = data[0];

    const studentCols = [];
    for (let c = 2; c < headerRow.length; c++) {
      const rawName = String(headerRow[c] || '').trim();
      const normName = normalizeStr(rawName);
      if (normName && normName !== 'DIA' && normName !== 'FECHA') {
        const studentId = studentMap.get(normName);
        if (studentId) {
          studentCols.push({ colIdx: c, rawName, normName, studentId });
        } else {
          console.warn(`⚠️ Alumno no encontrado en BD: "${rawName}" en hoja "${sheetName}"`);
        }
      }
    }

    console.log(`\n📋 Procesando Hoja: "${sheetName}" (${studentCols.length} estudiantes)...`);

    // 1. Filtrar filas de fecha válidas
    const validRows = [];
    for (let r = 1; r < data.length; r++) {
      const row = data[r];
      if (!row || row.length === 0) continue;

      const diaTexto = String(row[0] || '').trim().toUpperCase();
      const rawFecha = row[1];
      const { dateStr } = parseExcelDate(rawFecha);
      if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) continue;

      const rowVals = studentCols.map(sc => row[sc.colIdx]);
      const hasAnyMark = rowVals.some(v => String(v).trim() !== '');

      const isWeekend = diaTexto === 'SABADO' || diaTexto === 'DOMINGO';
      const isSaturdayGroup = normSheet.includes('SABADO') || normSheet.includes('SB');

      if (!isSaturdayGroup && isWeekend && !hasAnyMark) continue;
      if (isSaturdayGroup && diaTexto !== 'SABADO' && !hasAnyMark) continue;

      validRows.push({ row, diaTexto, dateStr });
    }

    // 2. Pre-cargar sesiones existentes para este grupo
    const existingSessions = await retrySql(() => sql`
      SELECT id, fecha::text as fecha FROM class_sessions WHERE group_id = ${groupId}::uuid
    `);
    const sessionMap = new Map();
    existingSessions.forEach(s => sessionMap.set(s.fecha, s.id));

    // 3. Crear en lote las sesiones que falten
    const missingSessions = validRows.filter(vr => !sessionMap.has(vr.dateStr));
    if (missingSessions.length > 0) {
      for (const ms of missingSessions) {
        const sessRes = await retrySql(() => sql`
          INSERT INTO class_sessions (group_id, fecha, dia_semana_texto)
          VALUES (${groupId}::uuid, ${ms.dateStr}::date, ${ms.diaTexto || 'CLASE'})
          ON CONFLICT (group_id, fecha) DO UPDATE SET dia_semana_texto = EXCLUDED.dia_semana_texto
          RETURNING id;
        `);
        sessionMap.set(ms.dateStr, sessRes[0].id);
      }
    }

    // 4. Recolectar celdas desduplicadas por estudiante y sesión
    const recordsMap = new Map();

    for (const { row, dateStr } of validRows) {
      const sessionId = sessionMap.get(dateStr);
      if (!sessionId) continue;

      for (const sc of studentCols) {
        let cellVal = row[sc.colIdx];

        // Incorporar actualización de I PREESCOLAR del PDF reciente (26 agosto a 4 sept)
        if (sheetName === 'I PREESCOLAR') {
          if (dateStr === '2026-08-26' && sc.normName.includes('URUEN')) cellVal = 'x';
          if (dateStr === '2026-08-27' && sc.normName.includes('URUEN')) cellVal = 'x';
          if (dateStr === '2026-08-28') cellVal = 'LIBRE';
          if (dateStr === '2026-08-31' && sc.normName.includes('URUEN')) cellVal = 'x';
          if (dateStr === '2026-09-01' && (sc.normName.includes('SIERRA') || sc.normName.includes('URUEN'))) cellVal = 'x';
          if (dateStr === '2026-09-02' && sc.normName.includes('URUEN')) cellVal = 'x';
          if (dateStr === '2026-09-03' && sc.normName.includes('URUEN')) cellVal = 'x';
          if (dateStr === '2026-09-04') cellVal = 'LIBRE';
        }

        const { status, note } = mapExactCellStatus(cellVal);
        const pairKey = `${sc.studentId}_${sessionId}`;

        if (!recordsMap.has(pairKey) || status === 'AUSENTE' || (note && !recordsMap.get(pairKey).observaciones)) {
          recordsMap.set(pairKey, {
            studentId: sc.studentId,
            sessionId,
            estado: status,
            observaciones: note
          });
        }
      }
    }

    const recordsToUpsert = Array.from(recordsMap.values());
    recordsToUpsert.forEach(rec => {
      if (rec.estado === 'AUSENTE') totalAbsences++;
    });

    // 5. Batch upsert a attendance_records_normalized
    const BATCH_SIZE = 500;
    for (let i = 0; i < recordsToUpsert.length; i += BATCH_SIZE) {
      const batch = recordsToUpsert.slice(i, i + BATCH_SIZE);
      const studentIds = batch.map(b => b.studentId);
      const sessionIds = batch.map(b => b.sessionId);
      const estados = batch.map(b => b.estado);
      const notes = batch.map(b => b.observaciones);

      await retrySql(() => sql`
        INSERT INTO attendance_records_normalized (student_id, session_id, estado, observaciones, fuente, sede)
        SELECT 
          u.student_id::uuid, 
          u.session_id::uuid, 
          u.estado, 
          u.observaciones, 
          'EXCEL_OFICIAL', 
          'Sede 1'
        FROM unnest(
          ${studentIds}::uuid[], 
          ${sessionIds}::uuid[], 
          ${estados}::text[], 
          ${notes}::text[]
        ) AS u(student_id, session_id, estado, observaciones)
        ON CONFLICT (student_id, session_id) 
        DO UPDATE SET 
          estado = EXCLUDED.estado,
          observaciones = EXCLUDED.observaciones,
          fuente = 'EXCEL_OFICIAL';
      `);
    }

    totalProcessedRecords += recordsToUpsert.length;
    console.log(`   ✓ ${recordsToUpsert.length} celdas cargadas fielmente para "${sheetName}".`);
  }

  console.log(`\n🎉 PROCESO COMPLETADO CON ÉXITO:`);
  console.log(`   - Celdas procesadas y sincronizadas al 100%: ${totalProcessedRecords}`);
  console.log(`   - Fallas exactas oficiales registradas: ${totalAbsences}`);
}

run().catch(err => {
  console.error('❌ Error ejecutando carga oficial:', err);
  process.exit(1);
});
