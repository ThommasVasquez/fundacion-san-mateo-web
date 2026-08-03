import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { reader_id, tag_uid, tipo_evento, timestamp, geolocalizacion, registrado_por } = body;

    if (!reader_id || !tag_uid || !tipo_evento) {
      return NextResponse.json({ error: 'Faltan parámetros requeridos (reader_id, tag_uid, tipo_evento)' }, { status: 400 });
    }

    if (tipo_evento !== 'entrada' && tipo_evento !== 'salida') {
      return NextResponse.json({ error: 'tipo_evento inválido (debe ser "entrada" o "salida")' }, { status: 400 });
    }

    // 1. Validate reader exists
    const readers = await sql`
      SELECT id, tipo, teacher_id 
      FROM readers 
      WHERE id = ${reader_id} 
      LIMIT 1
    `;

    if (readers.length === 0) {
      return NextResponse.json({ error: 'Lector no registrado' }, { status: 400 });
    }

    const reader = readers[0];
    const origen = reader.tipo === 'mobile_nfc' ? 'movil_profesor' : 'panel';
    const fallbackRegistradoPor = registrado_por || reader.teacher_id || null;

    // 2. Check if Enrollment Mode is active for a student
    const enrollmentKeys = await sql`
      SELECT value 
      FROM site_content 
      WHERE content_key = 'enrollment_active_student_id' 
      LIMIT 1
    `;

    let activeStudentId = null;
    if (enrollmentKeys.length > 0 && enrollmentKeys[0].value.trim() !== '') {
      activeStudentId = enrollmentKeys[0].value.trim();

      console.log(`Enrollment mode active for student ID: ${activeStudentId}. Assigning tag ${tag_uid}...`);

      // Update student's rfid_tag_uid
      await sql`
        UPDATE students 
        SET rfid_tag_uid = ${tag_uid} 
        WHERE id = ${activeStudentId}
      `;

      // Clear enrollment active status in site_content
      await sql`
        UPDATE site_content 
        SET value = '' 
        WHERE content_key = 'enrollment_active_student_id'
      `;
    }

    // 3. Find student by tag_uid
    const students = await sql`
      SELECT id, nombre, grado 
      FROM students 
      WHERE rfid_tag_uid = ${tag_uid} AND activo = TRUE 
      LIMIT 1
    `;

    const eventTime = timestamp ? new Date(timestamp) : new Date();
    const isSincronizado = true; // Direct scan is synchronized by default

    if (students.length > 0) {
      const student = students[0];

      // Insert attendance event
      await sql`
        INSERT INTO attendance_events (
          student_id, rfid_tag_uid, reader_id, tipo_evento, timestamp, origen, sincronizado, geolocalizacion, registrado_por
        ) VALUES (
          ${student.id}, ${tag_uid}, ${reader_id}, ${tipo_evento}, ${eventTime}, ${origen}, ${isSincronizado}, ${geolocalizacion || null}, ${fallbackRegistradoPor}
        )
      `;

      return NextResponse.json({
        status: 'success',
        student: {
          id: student.id,
          nombre: student.nombre,
          grado: student.grado
        },
        message: `Asistencia (${tipo_evento}) registrada con éxito.`
      });
    } else {
      // Unassigned tag event
      await sql`
        INSERT INTO attendance_events (
          student_id, rfid_tag_uid, reader_id, tipo_evento, timestamp, origen, sincronizado, geolocalizacion, registrado_por
        ) VALUES (
          NULL, ${tag_uid}, ${reader_id}, ${tipo_evento}, ${eventTime}, ${origen}, ${isSincronizado}, ${geolocalizacion || null}, ${fallbackRegistradoPor}
        )
      `;

      return NextResponse.json({
        status: 'unassigned',
        message: 'Tarjeta no asignada. Evento guardado para revisión.'
      });
    }

  } catch (error: any) {
    console.error('Scan ingestion error:', error);
    return NextResponse.json({ error: 'Error al procesar el escaneo', details: error.message || String(error) }, { status: 500 });
  }
}
