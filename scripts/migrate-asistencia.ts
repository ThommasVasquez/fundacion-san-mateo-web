import { neon } from '@neondatabase/serverless';
import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

const sql = neon(process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_c9bvh2eQYkTF@ep-long-dew-39869189-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

// Helper to normalize strings: trim + collapse multiple spaces + uppercase
function normalizeStr(str: any): string {
  if (!str) return '';
  return String(str).trim().replace(/\s+/g, ' ').toUpperCase();
}

// Convert Excel Serial Date to YYYY-MM-DD
function parseExcelDate(val: any): { dateStr: string; dateObj: Date | null } {
  if (!val) return { dateStr: '', dateObj: null };

  // If already a JS Date
  if (val instanceof Date) {
    const yyyy = val.getFullYear();
    const mm = String(val.getMonth() + 1).padStart(2, '0');
    const dd = String(val.getDate()).padStart(2, '0');
    return { dateStr: `${yyyy}-${mm}-${dd}`, dateObj: val };
  }

  // If Excel Serial Number (e.g., 46200)
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

  // If string (e.g., "15/07/2026" or "2026-07-15")
  const str = String(val).trim();
  if (str.includes('/')) {
    const parts = str.split('/');
    if (parts.length === 3) {
      let dd = parts[0].padStart(2, '0');
      let mm = parts[1].padStart(2, '0');
      let yyyy = parts[2];
      if (yyyy.length === 2) yyyy = '20' + yyyy;
      const jsDate = new Date(`${yyyy}-${mm}-${dd}T12:00:00Z`);
      return { dateStr: `${yyyy}-${mm}-${dd}`, dateObj: jsDate };
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

// Day of week Spanish mapping
const SPANISH_DAYS: Record<number, string> = {
  0: 'DOMINGO',
  1: 'LUNES',
  2: 'MARTES',
  3: 'MIERCOLES',
  4: 'JUEVES',
  5: 'VIERNES',
  6: 'SABADO',
};

// Map cell values to normalized AttendanceStatus
function mapAttendanceStatus(cellVal: any): { status: string; isNote: boolean; note?: string } {
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

  // If text is an annotation (e.g., "INGRESO EL 15/07/2026")
  return { status: 'OTRO', isNote: true, note: String(cellVal).trim() };
}

// Infer group shift and type
function inferGroupMeta(groupName: string): { jornada: 'DIURNO' | 'NOCHE' | 'SABADO'; tipo: 'REGULAR' | 'AIPI' | 'PREESCOLAR' | 'CB' } {
  const norm = groupName.toUpperCase();

  let jornada: 'DIURNO' | 'NOCHE' | 'SABADO' = 'DIURNO';
  if (norm.includes('NOCHE')) jornada = 'NOCHE';
  if (norm.includes('SABADO') || norm.includes('SB')) jornada = 'SABADO';

  let tipo: 'REGULAR' | 'AIPI' | 'PREESCOLAR' | 'CB' = 'REGULAR';
  if (norm.includes('AIPI')) tipo = 'AIPI';
  else if (norm.includes('PREESCOLAR')) tipo = 'PREESCOLAR';
  else if (norm.includes('CB')) tipo = 'CB';

  return { jornada, tipo };
}

async function main() {
  console.log('=== INICIANDO ETL DE MIGRACIÓN DE ASISTENCIA (ASISTENCIA___2026-2.xlsx) ===\n');

  const filePath = path.resolve('./ASISTENCIA___2026-2.xlsx');
  if (!fs.existsSync(filePath)) {
    console.error(`ERROR: No se encontró el archivo ${filePath}`);
    process.exit(1);
  }

  const wb = XLSX.readFile(filePath);

  // 1. Ensure Normalized Database Tables Exist in Neon
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

  // Audit Metrics
  const emptyTeacherSheets = [
    'ANDREA MARTINEZ',
    'YESICA LOPEZ',
    'CAMILA BARRETO',
    'MARIBEL GONZALEZ ',
    'JULIAN SACRISTAN'
  ];

  const dateDiscrepancies: Array<{ sheet: string; row: number; fecha: string; diaTexto: string; diaCalculado: string }> = [];
  const unmappedNotes: Array<{ sheet: string; student: string; fecha: string; cellValue: string }> = [];
  const studentGroupMap: Map<string, { originalName: string; groups: Set<string> }> = new Map();
  let totalRecordsInserted = 0;
  let totalSessionsCreated = 0;

  console.log('Processing sheets...');

  for (const sheetName of wb.SheetNames) {
    const normSheetName = normalizeStr(sheetName);

    // Skip empty instructor sheets
    if (emptyTeacherSheets.some(s => normalizeStr(s) === normSheetName)) {
      console.log(`⏩ Omitiendo hoja vacía de instructor: "${sheetName}"`);
      continue;
    }

    const ws = wb.Sheets[sheetName];
    const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    if (data.length < 2) continue;

    // Row 0 contains Headers: Col 0 = DIA, Col 1 = FECHA, Col 2..N = Student Names
    const headerRow = data[0];
    const studentCols: Array<{ colIdx: number; rawName: string; normName: string }> = [];

    for (let c = 2; c < headerRow.length; c++) {
      const rawName = String(headerRow[c] || '').trim();
      const normName = normalizeStr(rawName);
      if (normName && normName !== 'DIA' && normName !== 'FECHA') {
        studentCols.push({ colIdx: c, rawName, normName });

        if (!studentGroupMap.has(normName)) {
          studentGroupMap.set(normName, { originalName: rawName, groups: new Set() });
        }
        studentGroupMap.get(normName)!.groups.add(normSheetName);
      }
    }

    if (studentCols.length === 0) {
      console.log(`⚠️ Hoja sin estudiantes válidos en encabezado: "${sheetName}"`);
      continue;
    }

    // 2. Upsert Group
    const { jornada, tipo } = inferGroupMeta(normSheetName);
    const groupRes = await sql`
      INSERT INTO groups (nombre, nombre_clean, jornada, tipo)
      VALUES (${normSheetName}, ${normSheetName}, ${jornada}, ${tipo})
      ON CONFLICT (nombre) DO UPDATE 
      SET jornada = EXCLUDED.jornada, tipo = EXCLUDED.tipo
      RETURNING id;
    `;
    const groupId = groupRes[0].id;

    // 3. Process Rows (Class Sessions & Attendance Records)
    for (let r = 1; r < data.length; r++) {
      const row = data[r];
      if (!row || row.length === 0) continue;

      const diaTexto = normalizeStr(row[0]);
      const rawFecha = row[1];

      // Stop reading phantom rows if fecha and student values are empty
      if (!rawFecha && studentCols.every(sc => !row[sc.colIdx])) {
        continue;
      }

      const { dateStr, dateObj } = parseExcelDate(rawFecha);
      if (!dateStr || dateStr.length < 8) continue;

      let diaCalculado = '';
      if (dateObj) {
        diaCalculado = SPANISH_DAYS[dateObj.getDay()] || '';
        if (diaTexto && diaCalculado && diaTexto !== diaCalculado) {
          dateDiscrepancies.push({
            sheet: normSheetName,
            row: r + 1,
            fecha: dateStr,
            diaTexto,
            diaCalculado,
          });
        }
      }

      // Upsert Class Session
      const sessionRes = await sql`
        INSERT INTO class_sessions (group_id, fecha, dia_semana_texto, dia_semana_calculado)
        VALUES (${groupId}::uuid, ${dateStr}::date, ${diaTexto}, ${diaCalculado})
        ON CONFLICT (group_id, fecha) DO UPDATE
        SET dia_semana_texto = EXCLUDED.dia_semana_texto, dia_semana_calculado = EXCLUDED.dia_semana_calculado
        RETURNING id;
      `;
      const sessionId = sessionRes[0].id;
      totalSessionsCreated++;

      // Process Attendance for Each Student
      for (const st of studentCols) {
        const cellVal = row[st.colIdx];
        const { status, isNote, note } = mapAttendanceStatus(cellVal);

        if (isNote) {
          unmappedNotes.push({
            sheet: normSheetName,
            student: st.normName,
            fecha: dateStr,
            cellValue: note || '',
          });
        }

        // Upsert Student
        const studentRes = await sql`
          INSERT INTO students_normalized (nombre_normalizado, nombre_original)
          VALUES (${st.normName}, ${st.rawName})
          ON CONFLICT (nombre_normalizado) DO UPDATE
          SET nombre_original = EXCLUDED.nombre_original
          RETURNING id;
        `;
        const studentId = studentRes[0].id;

        // Upsert Enrollment
        await sql`
          INSERT INTO enrollments (student_id, group_id)
          VALUES (${studentId}::uuid, ${groupId}::uuid)
          ON CONFLICT (student_id, group_id) DO NOTHING;
        `;

        // Upsert Attendance Record
        await sql`
          INSERT INTO attendance_records_normalized (
            student_id, session_id, estado, fuente, observaciones, sede
          ) VALUES (
            ${studentId}::uuid, ${sessionId}::uuid, ${status}, 'MANUAL', ${note || null}, 'Sede 1'
          )
          ON CONFLICT (student_id, session_id) DO UPDATE
          SET estado = EXCLUDED.estado, observaciones = COALESCE(EXCLUDED.observaciones, attendance_records_normalized.observaciones);
        `;
        totalRecordsInserted++;
      }
    }
  }

  // 4. Identify Multi-Enrolled Students
  const multiEnrolledStudents: Array<{ student: string; groups: string[] }> = [];
  for (const [studentNorm, data] of studentGroupMap.entries()) {
    if (data.groups.size > 1) {
      multiEnrolledStudents.push({
        student: studentNorm,
        groups: Array.from(data.groups),
      });
    }
  }

  // 5. Generate Migration Audit Report
  const reportMarkdown = `# Informe de Migración de Asistencia (ETL)

**Fecha de Ejecución:** ${new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' })}  
**Archivo Fuente:** \`ASISTENCIA___2026-2.xlsx\`

---

## 📊 Métricas Generales de Migración

- **Total Estudiantes Únicos Normalizados:** ${studentGroupMap.size}
- **Total Sesiones de Clase Creadas:** ${totalSessionsCreated}
- **Total Registros de Asistencia Insertados:** ${totalRecordsInserted}
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

  // Write Markdown Report
  fs.writeFileSync('./migration_report.md', reportMarkdown);

  // Write JSON Report
  fs.writeFileSync('./migration_report.json', JSON.stringify({
    timestamp: new Date().toISOString(),
    totalStudents: studentGroupMap.size,
    totalSessionsCreated,
    totalRecordsInserted,
    emptyTeacherSheets,
    multiEnrolledStudents,
    dateDiscrepancies,
    unmappedNotes,
  }, null, 2));

  console.log('\n=== MIGRACIÓN COMPLETADA CON ÉXITO ===');
  console.log(`✓ Total Estudiantes Únicos: ${studentGroupMap.size}`);
  console.log(`✓ Total Sesiones de Clase: ${totalSessionsCreated}`);
  console.log(`✓ Total Registros de Asistencia: ${totalRecordsInserted}`);
  console.log(`✓ Multimatrículas Detectadas: ${multiEnrolledStudents.length}`);
  console.log(`✓ Discrepancias Día/Fecha: ${dateDiscrepancies.length}`);
  console.log(`✓ Observaciones Mapeadas: ${unmappedNotes.length}`);
  console.log(`\nInforme guardado en: ./migration_report.md y ./migration_report.json`);
}

main().catch(console.error);
