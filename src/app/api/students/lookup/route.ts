import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

/**
 * ¿De quién es esta tarjeta?
 *
 * Lo pregunta el backend de la puerta cuando no reconoce una tarjeta. Aquí vive
 * el padrón de verdad -- los 618 del instituto, con su curso-- y allí solo están
 * los que se matricularon desde una app. Sin esta consulta, a un alumno
 * matriculado en esta web la puerta le decía que no: la web lo conocía y quien
 * decide si se abre, no.
 *
 * Copiar las personas al otro lado sería la otra salida, y es la que ya ha dado
 * problemas toda la tarde: dos padrones que se separan en cuanto uno de los dos
 * cambia, y un síntoma -- "se queda esperando" -- que nunca lleva a la causa.
 * Preguntar no duplica nada.
 *
 * Solo lectura, y solo devuelve lo justo para decidir y para nombrar a quien
 * pasa: ni cédula, ni teléfono, ni domicilio salen por aquí.
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

export async function GET(req: Request) {
  try {
    const expected = process.env.ATTENDANCE_API_KEY;
    if (!expected) {
      return NextResponse.json({ error: 'Servicio no configurado' }, { status: 503 });
    }
    const provided = req.headers.get('x-api-key');
    if (!provided || !safeEqual(provided, expected)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const tagUid = new URL(req.url).searchParams.get('tag_uid');
    if (!tagUid) {
      return NextResponse.json({ error: 'Falta tag_uid' }, { status: 400 });
    }

    const tagHex = tagUid.replace(/\s+/g, '').toUpperCase();
    const decimal = tarjetaDecimal(tagHex);

    // Las dos formas: el UID para las vinculadas aquí, el decimal para las 600
    // que vinieron del padrón y solo tienen su número.
    const filas = await sql`
      SELECT id, nombre, grado FROM students
       WHERE activo = TRUE
         AND (rfid_tag_uid = ${tagHex}
              OR (${decimal}::bigint IS NOT NULL AND tarjeta_numero = ${decimal}::bigint))
       LIMIT 1`;

    if (filas.length === 0) {
      return NextResponse.json({ encontrado: false }, { status: 404 });
    }

    return NextResponse.json({
      encontrado: true,
      id: filas[0].id,
      nombre: filas[0].nombre,
      grado: filas[0].grado,
    });
  } catch (error: any) {
    console.error('students/lookup:', error);
    return NextResponse.json(
      { error: 'Error al consultar', details: error?.message ?? String(error) },
      { status: 500 },
    );
  }
}
