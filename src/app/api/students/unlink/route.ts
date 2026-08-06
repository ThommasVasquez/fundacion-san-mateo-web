import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

/**
 * Suelta una tarjeta, viniendo de fuera.
 *
 * La pareja de students/link, y existe por lo mismo: dar de baja a alguien desde
 * las apps lo borraba del backend de la puerta y no de aquí, así que la tarjeta
 * quedaba libre en un sistema y ocupada en el otro. El síntoma es de los que no
 * llevan a la causa: intentas matricular a otra persona con esa tarjeta, la
 * página dice que ya tiene dueño, y ese dueño es alguien que ya no existe.
 *
 * Se suelta la tarjeta y se deja al alumno. Borrarlo también sería tentador y
 * sería un error: aquí vive el padrón del instituto, con su curso y su historial
 * de asistencia; el backend de la puerta solo sabía de quién era una tarjeta.
 * Una baja allí significa "esta tarjeta ya no abre", no "esta persona no existe".
 */

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Ver la nota en attendance/scan: el byte de versión no viaja en el decimal. */
function tarjetaDecimal(tagUid: string): number | null {
  const hex = tagUid.trim().toUpperCase();
  if (!/^[0-9A-F]{10}$/.test(hex)) return null;
  const b = hex.match(/../g)!.map((x) => parseInt(x, 16));
  return (((b[1] << 24) >>> 0) + (b[2] << 16) + (b[3] << 8) + b[4]);
}

export async function POST(req: Request) {
  try {
    const expected = process.env.ATTENDANCE_API_KEY;
    if (!expected) {
      return NextResponse.json({ error: 'Servicio no configurado' }, { status: 503 });
    }
    const provided = req.headers.get('x-api-key');
    if (!provided || !safeEqual(provided, expected)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { tag_uid } = await req.json();
    if (!tag_uid) {
      return NextResponse.json({ error: 'Falta tag_uid' }, { status: 400 });
    }

    const tagHex = String(tag_uid).replace(/\s+/g, '').toUpperCase();
    const decimal = tarjetaDecimal(tagHex);

    const soltadas = await sql`
      UPDATE students
         SET rfid_tag_uid = NULL, tarjeta_numero = NULL
       WHERE rfid_tag_uid = ${tagHex}
          OR (${decimal}::bigint IS NOT NULL AND tarjeta_numero = ${decimal}::bigint)
   RETURNING nombre`;

    // Que no hubiera nadie no es un error: la baja puede llegar dos veces, o
    // ser de una tarjeta que aquí nunca se vinculó. El resultado buscado -- que
    // esa tarjeta no sea de nadie -- se cumple igual.
    return NextResponse.json({
      status: soltadas.length > 0 ? 'liberada' : 'no_estaba',
      soltadas: soltadas.map((s: { nombre: string }) => s.nombre),
    });
  } catch (error: any) {
    console.error('students/unlink:', error);
    return NextResponse.json(
      { error: 'Error al liberar', details: error?.message ?? String(error) },
      { status: 500 },
    );
  }
}
