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

    if (!reader_id || !tipo_evento) {
      return NextResponse.json({ error: 'Faltan parámetros (reader_id, tipo_evento)' }, { status: 400 });
    }

    // Call the scan API route internally via fetch
    const origin = new URL(req.url).origin;
    const res = await fetch(`${origin}/api/attendance/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reader_id,
        tag_uid: simulatedTagUid,
        tipo_evento,
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
