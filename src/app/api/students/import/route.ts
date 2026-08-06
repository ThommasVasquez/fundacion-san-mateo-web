import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { sql } from '@/lib/db';
import { decrypt } from '@/lib/auth';
import { clasificar, bloqueos, type RegistroPadron } from '@/lib/padron';

/**
 * Alta masiva de alumnos.
 *
 * El fichero se lee en el navegador y aquí llegan filas ya normalizadas. Eso no
 * las hace de fiar: quien tiene la sesión abierta puede mandar a esta ruta lo
 * que quiera sin pasar por la página, así que se vuelve a clasificar y se vuelve
 * a bloquear por duplicados. La validación del navegador es para que el usuario
 * vea lo que va a pasar; esta es la que decide.
 *
 * Se guarda por lotes, y el lote lo parte el cliente. Son 618 alumnos en el caso
 * real, y un Worker tiene un límite de CPU por petición que 618 escrituras
 * seguidas se comen: partido, cada petición termina holgada y la página puede
 * enseñar por dónde va en vez de quedarse en blanco medio minuto.
 *
 * `ON CONFLICT (usuario_nro)` hace que reimportar el mismo fichero actualice en
 * vez de duplicar, que es lo que se espera de "volver a subir la lista con tres
 * alumnos nuevos". El número de tarjeta se respeta tal cual venga: si el padrón
 * trae uno distinto para alguien, manda el padrón.
 */

/** El layout de /admin protege las páginas; una ruta de API tiene que mirarlo ella. */
async function haySesion(): Promise<boolean> {
  try {
    const cookie = (await cookies()).get('session')?.value;
    if (!cookie) return false;
    const parsed = await decrypt(cookie);
    return Boolean(parsed && parsed.adminId);
  } catch {
    return false;
  }
}

/** Un lote grande no acelera nada y acerca el límite de CPU del Worker. */
const LOTE_MAX = 200;

export async function POST(req: Request) {
  try {
    if (!await haySesion()) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const cuerpo = await req.json();
    const registros = cuerpo?.registros as RegistroPadron[] | undefined;
    if (!Array.isArray(registros) || registros.length === 0) {
      return NextResponse.json({ error: 'No llegó ninguna fila' }, { status: 400 });
    }
    if (registros.length > LOTE_MAX) {
      return NextResponse.json(
        { error: `Lote demasiado grande: ${registros.length}, el máximo es ${LOTE_MAX}` },
        { status: 400 },
      );
    }

    // Se reclasifica en el servidor: lo que llegó es una propuesta.
    const clase = clasificar(registros);
    const razones = bloqueos(clase);
    if (razones.length) {
      return NextResponse.json({ error: 'Datos rechazados', razones }, { status: 400 });
    }

    const guardables = clase.conTarjeta.concat(clase.sinTarjeta);

    let creados = 0;
    let actualizados = 0;
    for (const r of guardables) {
      const filas = await sql`
        INSERT INTO students (nombre, grado, activo, usuario_nro, id_dispositivo,
                              tarjeta_numero, departamento, rol, telefono, domicilio, dispositivos)
             VALUES (${r.nombre}, ${r.curso || 'SIN CURSO'}, TRUE, ${r.usuarioNro},
                     ${r.idDispositivo || null}, ${r.tarjetaNum ?? null}, ${r.departamento || null},
                     ${r.rol || null}, ${r.telefono}, ${r.domicilio}, ${r.dispositivos})
        -- El WHERE repite el predicado del índice a propósito: students_usuario_nro_idx
        -- es parcial, y Postgres solo lo reconoce para un ON CONFLICT si la
        -- sentencia lo nombra igual. Sin esta línea: "no unique or exclusion
        -- constraint matching".
        ON CONFLICT (usuario_nro) WHERE usuario_nro IS NOT NULL DO UPDATE
                SET nombre = EXCLUDED.nombre, grado = EXCLUDED.grado,
                    tarjeta_numero = EXCLUDED.tarjeta_numero,
                    departamento = EXCLUDED.departamento, rol = EXCLUDED.rol,
                    telefono = EXCLUDED.telefono, domicilio = EXCLUDED.domicilio,
                    dispositivos = EXCLUDED.dispositivos
          RETURNING (xmax = 0) AS es_nuevo`;
      if (filas[0]?.es_nuevo) creados++;
      else actualizados++;
    }

    return NextResponse.json({ creados, actualizados, procesados: guardables.length });
  } catch (error: any) {
    console.error('students/import:', error);
    return NextResponse.json(
      { error: 'Error al importar', details: error?.message ?? String(error) },
      { status: 500 },
    );
  }
}
