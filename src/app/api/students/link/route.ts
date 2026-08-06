import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

/**
 * Vincula una tarjeta a una persona, viniendo de fuera.
 *
 * Existe porque hay dos sitios donde se matricula y hasta ahora no se hablaban:
 * la página de matrícula de aquí, con la tarjeta en la mano; y las apps de
 * escritorio y móvil, que llevan el lector encima y escriben en el backend de
 * la puerta. Lo segundo no llegaba nunca a esta base, así que quien matriculaba
 * desde el móvil veía su alta en una pantalla y "tarjeta no asignada" en la
 * otra, con razón y sin explicación visible.
 *
 * Se busca por tarjeta y no por nombre: dos personas pueden llamarse igual, y
 * un nombre escrito a mano dos veces no coincide consigo mismo -- una tilde de
 * más y ya son dos alumnos. La tarjeta es única y no se teclea.
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
    // Escribe en el padrón, así que la clave no es opcional. Sin variable
    // configurada se rechaza todo, igual que el endpoint de escaneo.
    const expected = process.env.ATTENDANCE_API_KEY;
    if (!expected) {
      return NextResponse.json({ error: 'Servicio no configurado' }, { status: 503 });
    }
    const provided = req.headers.get('x-api-key');
    if (!provided || !safeEqual(provided, expected)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { tag_uid, nombre, grado, sede } = await req.json();
    if (!tag_uid || !nombre) {
      return NextResponse.json({ error: 'Faltan tag_uid o nombre' }, { status: 400 });
    }

    const tagHex = String(tag_uid).replace(/\s+/g, '').toUpperCase();
    const decimal = tarjetaDecimal(tagHex);

    // ¿La tarjeta ya es de alguien? Se mira por las dos formas, porque los del
    // padrón solo tienen el decimal y los vinculados aquí solo el UID.
    const yaEstan = await sql`
      SELECT id, nombre FROM students
       WHERE rfid_tag_uid = ${tagHex}
          OR (${decimal}::bigint IS NOT NULL AND tarjeta_numero = ${decimal}::bigint)
       LIMIT 1`;

    if (yaEstan.length > 0) {
      // Se actualiza el nombre, no se crea otro. Reasignar una tarjeta a otra
      // persona es una decisión deliberada que se toma en la página de
      // matrícula, mirando a quién se la quitas; no algo que deba ocurrir de
      // rebote porque alguien matriculó desde el móvil sin saber que esa
      // tarjeta ya tenía dueño.
      await sql`
        UPDATE students
           SET nombre = ${nombre},
               rfid_tag_uid = ${tagHex},
               grado = COALESCE(${grado ?? null}, grado),
               sede = COALESCE(${sede ?? null}::smallint, sede)
         WHERE id = ${yaEstan[0].id}`;

      return NextResponse.json({
        status: 'actualizado',
        anterior: yaEstan[0].nombre,
        nombre,
      });
    }

    // Nadie tiene esa tarjeta: alta.
    //
    // grado va NOT NULL y aquí no se conoce -- las apps preguntan nombre,
    // cédula y sede, no curso. Se pone un marcador explícito en vez de un
    // curso inventado: "SIN CURSO" se ve en la tabla y se corrige, un curso
    // plausible puesto a dedo no se ve y no se corrige nunca.
    const creado = await sql`
      INSERT INTO students (nombre, grado, activo, rfid_tag_uid, tarjeta_numero, sede, rol)
           VALUES (${nombre}, ${grado ?? 'SIN CURSO'}, TRUE, ${tagHex},
                   ${decimal}, ${sede ?? null}::smallint, 'Estudiante')
        RETURNING id, nombre, grado`;

    return NextResponse.json({ status: 'creado', ...creado[0] }, { status: 201 });
  } catch (error: any) {
    console.error('students/link:', error);
    return NextResponse.json(
      { error: 'Error al vincular', details: error?.message ?? String(error) },
      { status: 500 },
    );
  }
}
