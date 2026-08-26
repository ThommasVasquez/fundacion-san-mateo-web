import { neon } from '@neondatabase/serverless';
import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

const sql = neon(process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_c9bvh2eQYkTF@ep-long-dew-39869189-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

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

const SPANISH_DAYS = {
  0: 'DOMINGO',
  1: 'LUNES',
  2: 'MARTES',
  3: 'MIERCOLES',
  4: 'JUEVES',
  5: 'VIERNES',
  6: 'SABADO',
};

function mapAttendanceStatus(cellVal) {
  const norm = normalizeStr(cellVal);

  if (!norm || norm === 'P' || norm === 'PRESENTE') {
    return { status: 'PRESENTE', isNote: false };
  }

  if (norm === 'X' || norm === 'FALTA' || norm === 'INASISTENCIA') {
    return { status: 'AUSENTE', isNote: false };
  }

  if (norm.includes('FESTIVO')) {
    return { status: 'FESTIVO', isNote: false };
  }

  if (norm.includes('LIBRE')) {
    return { status: 'LIBRE', isNote: false };
  }

  if (norm.includes('PRACTICA')) {
    return { status: 'PRACTICAS', isNote: false };
  }

  if (norm.includes('COMITE')) {
    return { status: 'COMITE_ACADEMICO', isNote: false };
  }

  if (norm.includes('TERMINACION')) {
    return { status: 'TERMINACION_DE_SEMESTRE', isNote: false };
  }

  if (norm.includes('CLASE NO SE LLEVO')) {
    return { status: 'CLASE_NO_SE_LLEVO_A_CABO', isNote: false };
  }

  if (norm.includes('NO HUBO CLASE')) {
    return { status: 'NO_HUBO_CLASE', isNote: false };
  }

  return { status: 'OTRO', isNote: true, note: String(cellVal).trim() };
}

function inferGroupMeta(groupName) {
  const norm = groupName.toUpperCase();

  let jornada = 'DIURNO';
  if (norm.includes('NOCHE')) jornada = 'NOCHE';
  if (norm.includes('SABADO') || norm.includes('SB')) jornada = 'SABADO';

  let tipo = 'REGULAR';
  if (norm.includes('AIPI')) tipo = 'AIPI';
  else if (norm.includes('PREESCOLAR')) tipo = 'PREESCOLAR';
  else if (norm.includes('CB')) tipo = 'CB';

  return { jornada, tipo };
}

async function main() {
  console.log('=== INICIANDO ETL ULTRARÁPIDO UNNEST BATCH DE ASISTENCIA (ASISTENCIA___2026-2.xlsx) ===\n');

  const filePath = path.resolve('./ASISTENCIA___2026-2.xlsx');
  if (!fs.existsSync(filePath)) {
    console.error(`ERROR: No se encontró el archivo ${filePath}`);
    process.exit(1);
  }

  const wb = XLSX.readFile(filePath);

  // 1. Ensure Tables Exist
  await sql`
    CREATE TABLE IF NOT EXISTS students_normalized (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      nombre_normalizado TEXT UNIQUE NOT NULL,
      nombre_original TEXT NOT NULL,
      documento TEXT UNIQUE,
      rfid_tag_uid TEXT,
      estado TEXT DEFAULT 'ACTIVO',
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS groups (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      nombre TEXT UNIQUE NOT NULL,
      nombre_clean TEXT NOT NULL,
      jornada TEXT NOT NULL,
      tipo TEXT DEFAULT 'REGULAR',
      activo BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS enrollments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id UUID NOT NULL REFERENCES students_normalized(id) ON DELETE CASCADE,
      group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      fecha_inicio TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      fecha_fin TIMESTAMPTZ,
      activo BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(student_id, group_id)
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS class_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      fecha DATE NOT NULL,
      dia_semana_texto TEXT,
      dia_semana_calculado TEXT,
      activa BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(group_id, fecha)
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS attendance_records_normalized (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id UUID NOT NULL REFERENCES students_normalized(id) ON DELETE CASCADE,
      session_id UUID NOT NULL REFERENCES class_sessions(id) ON DELETE CASCADE,
      estado TEXT NOT NULL,
      fuente TEXT DEFAULT 'MANUAL',
      observaciones TEXT,
      sede TEXT DEFAULT 'Sede 1',
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(student_id, session_id)
    );
  `;

  const emptyTeacherSheets = [
    'ANDREA MARTINEZ',
    'YESICA LOPEZ',
    'CAMILA BARRETO',
    'MARIBEL GONZALEZ ',
    'JULIAN SACRISTAN'
  ];

  const dateDiscrepancies = [];
  const unmappedNotes = [];
  const studentMap = new Map();
  const groupMap = new Map();
  const sessionList = [];
  const rawRecords = [];

  console.log('1. Indexando datos de Excel en memoria...');

  for (const sheetName of wb.SheetNames) {
    const normSheetName = normalizeStr(sheetName);

    if (emptyTeacherSheets.some(s => normalizeStr(s) === normSheetName)) {
      console.log(`⏩ Omitiendo hoja vacía de instructor: "${sheetName}"`);
      continue;
    }

    const ws = wb.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    if (data.length < 2) continue;

    const headerRow = data[0];
    const studentCols = [];

    for (let c = 2; c < headerRow.length; c++) {
      const rawName = String(headerRow[c] || '').trim();
      const normName = normalizeStr(rawName);
      if (normName && normName !== 'DIA' && normName !== 'FECHA') {
        studentCols.push({ colIdx: c, rawName, normName });

        if (!studentMap.has(normName)) {
          studentMap.set(normName, { rawName, groups: new Set() });
        }
        studentMap.get(normName).groups.add(normSheetName);
      }
    }

    if (studentCols.length === 0) continue;

    groupMap.set(normSheetName, inferGroupMeta(normSheetName));

    for (let r = 1; r < data.length; r++) {
      const row = data[r];
      if (!row || row.length === 0) continue;

      const diaTexto = normalizeStr(row[0]);
      const rawFecha = row[1];

      if (!rawFecha && studentCols.every(sc => !row[sc.colIdx])) continue;

      const { dateStr, dateObj } = parseExcelDate(rawFecha);
      if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) continue;

      let diaCalculado = '';
      if (dateObj) {
        diaCalculado = SPANISH_DAYS[dateObj.getDay()] || '';
        if (diaTexto && diaCalculado && diaTexto !== diaCalculado) {
          dateDiscrepancies.push({ sheet: normSheetName, row: r + 1, fecha: dateStr, diaTexto, diaCalculado });
        }
      }

      sessionList.push({ sheetName: normSheetName, fecha: dateStr, diaTexto, diaCalculado });

      for (const st of studentCols) {
        const cellVal = row[st.colIdx];
        const { status, isNote, note } = mapAttendanceStatus(cellVal);

        if (isNote) {
          unmappedNotes.push({ sheet: normSheetName, student: st.normName, fecha: dateStr, cellValue: note || '' });
        }

        rawRecords.push({
          sheetName: normSheetName,
          studentNorm: st.normName,
          fecha: dateStr,
          status,
          note: note || null,
        });
      }
    }
  }

  console.log(`\nResumen indexado:`);
  console.log(`- Grupos: ${groupMap.size}`);
  console.log(`- Estudiantes Únicos: ${studentMap.size}`);
  console.log(`- Sesiones de Clase: ${sessionList.length}`);
  console.log(`- Registros de Asistencia: ${rawRecords.length}`);

  // 2. Bulk Insert Groups
  console.log('\n2. Carga en masa de Grupos...');
  const groupIds = new Map();
  for (const [gName, meta] of groupMap.entries()) {
    const res = await sql`
      INSERT INTO groups (nombre, nombre_clean, jornada, tipo)
      VALUES (${gName}, ${gName}, ${meta.jornada}, ${meta.tipo})
      ON CONFLICT (nombre) DO UPDATE SET jornada = EXCLUDED.jornada, tipo = EXCLUDED.tipo
      RETURNING id;
    `;
    groupIds.set(gName, res[0].id);
  }

  // 3. UNNEST Bulk Insert Students
  console.log('3. Carga ultrarrápida UNNEST de Estudiantes...');
  const studentIds = new Map();
  const studentNorms = Array.from(studentMap.keys());
  const studentRaws = studentNorms.map(k => studentMap.get(k).rawName);

  const studentRes = await sql`
    INSERT INTO students_normalized (nombre_normalizado, nombre_original)
    SELECT u.norm, u.raw
    FROM UNNEST(${studentNorms}::text[], ${studentRaws}::text[]) AS u(norm, raw)
    ON CONFLICT (nombre_normalizado) DO UPDATE SET nombre_original = EXCLUDED.nombre_original
    RETURNING id, nombre_normalizado;
  `;
  for (const r of studentRes) {
    studentIds.set(r.nombre_normalizado, r.id);
  }

  // 4. UNNEST Bulk Insert Enrollments
  console.log('4. Carga ultrarrápida UNNEST de Matrículas...');
  const enrollStIds = [];
  const enrollGrIds = [];
  for (const [normName, data] of studentMap.entries()) {
    const stId = studentIds.get(normName);
    for (const gName of data.groups) {
      const grId = groupIds.get(gName);
      if (stId && grId) {
        enrollStIds.push(stId);
        enrollGrIds.push(grId);
      }
    }
  }

  await sql`
    INSERT INTO enrollments (student_id, group_id)
    SELECT u.st_id::uuid, u.gr_id::uuid
    FROM UNNEST(${enrollStIds}::text[], ${enrollGrIds}::text[]) AS u(st_id, gr_id)
    ON CONFLICT (student_id, group_id) DO NOTHING;
  `;

  // 5. UNNEST Bulk Insert Class Sessions
  console.log('5. Carga ultrarrápida UNNEST de Sesiones de Clase...');
  const sessionIds = new Map();
  const sessGroupIds = [];
  const sessFechas = [];
  const sessDiasTexto = [];
  const sessDiasCalculados = [];
  const sessKeys = [];

  for (const s of sessionList) {
    const grId = groupIds.get(s.sheetName);
    const key = `${s.sheetName}|${s.fecha}`;
    if (grId && !sessionIds.has(key)) {
      sessionIds.set(key, true);
      sessGroupIds.push(grId);
      sessFechas.push(s.fecha);
      sessDiasTexto.push(s.diaTexto || null);
      sessDiasCalculados.push(s.diaCalculado || null);
      sessKeys.push(key);
    }
  }

  const sessRes = await sql`
    INSERT INTO class_sessions (group_id, fecha, dia_semana_texto, dia_semana_calculado)
    SELECT u.gr_id::uuid, u.fecha::date, u.dia_txt, u.dia_calc
    FROM UNNEST(
      ${sessGroupIds}::text[],
      ${sessFechas}::text[],
      ${sessDiasTexto}::text[],
      ${sessDiasCalculados}::text[]
    ) AS u(gr_id, fecha, dia_txt, dia_calc)
    ON CONFLICT (group_id, fecha) DO UPDATE SET dia_semana_texto = EXCLUDED.dia_semana_texto
    RETURNING id, group_id, fecha;
  `;

  // Map returned sessions
  const groupRevMap = new Map(Array.from(groupIds.entries()).map(([k, v]) => [v, k]));
  for (const r of sessRes) {
    const gName = groupRevMap.get(r.group_id);
    const fStr = r.fecha instanceof Date ? r.fecha.toISOString().split('T')[0] : String(r.fecha).split('T')[0];
    const key = `${gName}|${fStr}`;
    sessionIds.set(key, r.id);
  }

  // 6. UNNEST Bulk Insert Attendance Records in Chunks of 2000
  console.log('6. Carga ultrarrápida UNNEST de Registros de Asistencia...');
  let insertedRecordsCount = 0;
  const CHUNK_SIZE = 2000;

  for (let i = 0; i < rawRecords.length; i += CHUNK_SIZE) {
    const chunk = rawRecords.slice(i, i + CHUNK_SIZE);
    
    const recStIds = [];
    const recSessIds = [];
    const recEstados = [];
    const recFuentes = [];
    const recObs = [];
    const recSedes = [];

    const chunkMap = new Map();
    for (const rec of chunk) {
      const stId = studentIds.get(rec.studentNorm);
      const key = `${rec.sheetName}|${rec.fecha}`;
      const sessId = sessionIds.get(key);

      if (stId && sessId && typeof sessId === 'string') {
        const pairKey = `${stId}|${sessId}`;
        chunkMap.set(pairKey, {
          stId,
          sessId,
          status: rec.status,
          note: rec.note || null,
        });
      }
    }

    for (const item of chunkMap.values()) {
      recStIds.push(item.stId);
      recSessIds.push(item.sessId);
      recEstados.push(item.status);
      recFuentes.push('MANUAL');
      recObs.push(item.note);
      recSedes.push('Sede 1');
    }

    if (recStIds.length > 0) {
      await sql`
        INSERT INTO attendance_records_normalized (
          student_id, session_id, estado, fuente, observaciones, sede
        )
        SELECT 
          u.st_id::uuid, u.se_id::uuid, u.estado, u.fuente, u.obs, u.sede
        FROM UNNEST(
          ${recStIds}::text[],
          ${recSessIds}::text[],
          ${recEstados}::text[],
          ${recFuentes}::text[],
          ${recObs}::text[],
          ${recSedes}::text[]
        ) AS u(st_id, se_id, estado, fuente, obs, sede)
        ON CONFLICT (student_id, session_id) DO UPDATE 
        SET estado = EXCLUDED.estado, observaciones = COALESCE(EXCLUDED.observaciones, attendance_records_normalized.observaciones);
      `;
      insertedRecordsCount += recStIds.length;
    }

    console.log(`   Progreso: ${Math.min(i + CHUNK_SIZE, rawRecords.length)} / ${rawRecords.length} registros cargados...`);
  }

  // 7. Multi-Enrolled Students List
  const multiEnrolledStudents = [];
  for (const [normName, data] of studentMap.entries()) {
    if (data.groups.size > 1) {
      multiEnrolledStudents.push({
        student: normName,
        groups: Array.from(data.groups),
      });
    }
  }

  // 8. Generate Reports
  const reportMarkdown = `# Informe de Migración de Asistencia (ETL)

**Fecha de Ejecución:** ${new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' })}  
**Archivo Fuente:** \`ASISTENCIA___2026-2.xlsx\`

---

## 📊 Métricas Generales de Migración

- **Total Estudiantes Únicos Normalizados:** ${studentMap.size}
- **Total Grupos Registrados:** ${groupMap.size}
- **Total Sesiones de Clase Creadas:** ${sessRes.length}
- **Total Registros de Asistencia Insertados:** ${insertedRecordsCount}
- **Hojas Vacías de Instructores Omitidas:** ${emptyTeacherSheets.length} (\`${emptyTeacherSheets.join('`, `')}\`)

---

## 🔀 Estudiantes Detectados en Múltiples Grupos (Multimatrícula / Transferencias: ${multiEnrolledStudents.length})

${multiEnrolledStudents.map(m => `- **${m.student}**: Matriculado en \`${m.groups.join('`, `')}\``).join('\n')}

---

## ⚠️ Discrepancias Encontradas entre Día de la Semana y Fecha (${dateDiscrepancies.length})

${dateDiscrepancies.slice(0, 50).map(d => `- **Hoja ${d.sheet}** (Fila ${d.row}, Fecha \`${d.fecha}\`): Texto en Excel = **${d.diaTexto}** vs Día Calculado = **${d.diaCalculado}**`).join('\n')}
${dateDiscrepancies.length > 50 ? `\n*... y ${dateDiscrepancies.length - 50} discrepancias adicionales.*` : ''}

---

## 💬 Anotaciones de Texto Libre Mapeadas como Observaciones (${unmappedNotes.length})

${unmappedNotes.slice(0, 50).map(n => `- **${n.student}** (\`${n.sheet}\` - ${n.fecha}): "${n.cellValue}"`).join('\n')}
${unmappedNotes.length > 50 ? `\n*... y ${unmappedNotes.length - 50} observaciones adicionales.*` : ''}
`;

  fs.writeFileSync('./migration_report.md', reportMarkdown);
  fs.writeFileSync('./migration_report.json', JSON.stringify({
    timestamp: new Date().toISOString(),
    totalStudents: studentMap.size,
    totalGroups: groupMap.size,
    totalSessionsCreated: sessRes.length,
    totalRecordsInserted: insertedRecordsCount,
    emptyTeacherSheets,
    multiEnrolledStudents,
    dateDiscrepancies,
    unmappedNotes,
  }, null, 2));

  console.log('\n=== MIGRACIÓN ETL COMPLETADA CON ÉXITO ===');
  console.log(`✓ Total Estudiantes Únicos: ${studentMap.size}`);
  console.log(`✓ Total Grupos: ${groupMap.size}`);
  console.log(`✓ Total Sesiones de Clase: ${sessRes.length}`);
  console.log(`✓ Total Registros de Asistencia: ${insertedRecordsCount}`);
  console.log(`✓ Multimatrículas Detectadas: ${multiEnrolledStudents.length}`);
  console.log(`✓ Discrepancias Día/Fecha: ${dateDiscrepancies.length}`);
  console.log(`✓ Observaciones Mapeadas: ${unmappedNotes.length}`);
  console.log(`\nInformes guardados en: ./migration_report.md y ./migration_report.json`);
}

main().catch(console.error);
