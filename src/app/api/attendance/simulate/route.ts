import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { student_id, reader_id, tipo_evento, tag_uid, geolocalizacion } = body;

    // Determine the tag UID to simulate
    let simulatedTagUid = tag_uid;
    
    if (student_id) {
      const students = await sql`SELECT rfid_tag_uid FROM students WHERE id = ${student_id} LIMIT 1`;
      if (students.length > 0) {
        simulatedTagUid = students[0].rfid_tag_uid || `SIM-${student_id.substring(0, 8).toUpperCase()}`;
      }
    }

    if (!simulatedTagUid) {
      simulatedTagUid = `SIM-UNASSIGNED-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    }

    // tipo_evento ya no es obligatorio: omitirlo deja que /scan decida por
    // alternancia, que es justo el camino que interesa poder ensayar aqui.
    if (!reader_id) {
      return NextResponse.json({ error: 'Faltan parámetros (reader_id)' }, { status: 400 });
    }

    // /scan exige la clave incluso viniendo de dentro. Se lee del entorno del
    // servidor, asi que nunca baja al navegador.
    const apiKey = process.env.ATTENDANCE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Servicio no configurado (falta ATTENDANCE_API_KEY)' },
        { status: 503 }
      );
    }

    // Call the scan API route internally via fetch
    const origin = new URL(req.url).origin;
    const res = await fetch(`${origin}/api/attendance/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
      body: JSON.stringify({
        reader_id,
        tag_uid: simulatedTagUid,
        tipo_evento: tipo_evento || 'auto',
        geolocalizacion
      })
    });

    const responseData = await res.json();
    return NextResponse.json({ success: true, simulatedTagUid, scanResponse: responseData });

  } catch (error: any) {
    console.error('Simulation error:', error);
    return NextResponse.json({ error: 'Error al simular escaneo', details: error.message || String(error) }, { status: 500 });
  }
}
