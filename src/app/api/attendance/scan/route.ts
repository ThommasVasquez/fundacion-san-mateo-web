import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { decrypt } from '@/lib/auth';

// El colegio esta en Colombia (UTC-5, sin horario de verano). La jornada tiene
// que partirse por el dia local: usando UTC, el dia cambiaria a las 19:00 hora
// de Bogota y una salida a las 19:30 abriria una jornada nueva.
//
// La zona ('America/Bogota') y la ventana antiduplicados (10 segundos) van
// escritas literalmente dentro de cada consulta, no como parametros: tanto
// "AT TIME ZONE $1" como "$1 || ' seconds'" dependen de que Postgres infiera el
// tipo del parametro, y ahi falla. Si hay que cambiarlas, estan en el SQL.

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Solo lo justo para leer una cookie por nombre, sin traer una dependencia. */
function readCookie(header: string | null, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    if (part.slice(0, eq).trim() !== name) continue;
    return decodeURIComponent(part.slice(eq + 1).trim());
  }
  return undefined;
}

/**
 * El mismo objeto escrito de dos maneras que no se deducen la una de la otra.
 *
 * El lector reporta cinco bytes de un EM4100: uno de versión y cuatro de ID.
 * El terminal de control de acceso del que salió el padrón exporta solo esos
 * cuatro, en decimal, y tira el de versión. Así que desde el padrón no se puede
 * reconstruir lo que el lector va a leer -- falta un byte y no es constante:
 * en las tarjetas medidas vale 4F, 59, 4F.
 *
 * Al revés sí se puede, y es lo que hace esto: de la lectura se descarta el
 * byte de versión y quedan los cuatro que el padrón sí tiene. Por eso el cruce
 * va contra tarjeta_numero y no contra el UID.
 *
 * Solo para diez caracteres hexadecimales. Un UID de 4, 7 o 10 bytes es
 * ISO14443A -- otra tecnología, sin este concepto -- y ahí no hay nada que
 * convertir.
 */
function tarjetaDecimal(tagUid: string): number | null {
  const hex = tagUid.trim().toUpperCase();
  if (!/^[0-9A-F]{10}$/.test(hex)) return null;
  const b = hex.match(/../g)!.map((x) => parseInt(x, 16));
  // Sin el byte 0. >>> 0 para que el desplazamiento no se lea como negativo.
  return (((b[1] << 24) >>> 0) + (b[2] << 16) + (b[3] << 8) + b[4]);
}

type AuthResult = { ok: true } | { ok: false; status: number; error: string };

/**
 * Dos credenciales para una misma puerta, porque hay dos clases de cliente y
 * ninguna puede presentar la del otro.
 *
 * El lector cuelga de un pasillo y lleva su clave compilada dentro: manda
 * x-api-key. La pagina del profesor corre en un navegador, donde una clave seria
 * publica en cuanto alguien abriera el inspector; lo que si tiene es la cookie
 * de sesion que ya obtuvo al iniciar sesion, y esa la pone el navegador sola.
 *
 * Exigir solo la clave dejaria a los profesores fuera de su propia pagina, que
 * llama aqui sin cabecera ninguna. Aceptar solo la sesion dejaria fuera al
 * lector, que no tiene navegador. Valen las dos, por separado.
 */
async function authorize(req: Request): Promise<AuthResult> {
  const expectedKey = process.env.ATTENDANCE_API_KEY;
  const providedKey = req.headers.get('x-api-key');

  if (providedKey) {
    // Este endpoint escribe el historial de asistencia de menores. Si la clave
    // no esta configurada, no hay nada contra lo que comparar, y dar por buena
    // una peticion en ese estado seria abrir el endpoint a cualquiera que sepa
    // la URL. Se falla cerrado.
    if (!expectedKey) {
      console.error('ATTENDANCE_API_KEY no esta configurada; se rechaza el escaneo.');
      return { ok: false, status: 503, error: 'Servicio no configurado (falta ATTENDANCE_API_KEY)' };
    }
    if (!safeEqual(providedKey, expectedKey)) {
      return { ok: false, status: 401, error: 'No autorizado' };
    }
    return { ok: true };
  }

  // Sin clave: solo queda la sesion. Sirve la de profesor y la de admin — las
  // dos son personal del colegio que ya paso por una contrasena.
  const session = readCookie(req.headers.get('cookie'), 'session');
  if (session) {
    try {
      const parsed = await decrypt(session);
      if (parsed && (parsed.teacherId || parsed.adminId)) return { ok: true };
    } catch {
      // Firma invalida o caducada: cae al rechazo de abajo.
    }
  }

  return { ok: false, status: 401, error: 'No autorizado' };
}

/**
 * Decide si el pase es entrada o salida cuando el cliente no lo dice.
 *
 * Alterna sobre el ultimo evento del alumno en el dia local: sin eventos hoy, o
 * si el ultimo fue una salida, toca entrada; en caso contrario, salida. El
 * estado vive aqui y no en el lector, para que reiniciar el ESP32 no lo pierda
 * y para que varios lectores compartan el mismo criterio.
 */
function isAdministrativeStaff(grado: string): boolean {
  const g = (grado || '').toUpperCase();
  return g.includes('SECRETARI') || 
         g.includes('COORDINADOR') || 
         g.includes('ADMINISTRATIV') || 
         g.includes('DOCENTE') || 
         g.includes('DIRECTIV') ||
         g.includes('RECTOR');
}

async function resolveTipoEvento(
  explicit: string | undefined,
  studentId: string | null,
  tagUid: string,
  grado?: string
): Promise<'entrada' | 'salida'> {
  if (explicit === 'entrada' || explicit === 'salida') {
    return explicit;
  }

  if (studentId && isAdministrativeStaff(grado || '')) {
    const lastEvent = await sql`
      SELECT tipo_evento FROM attendance_events
      WHERE student_id = ${studentId}::uuid
        AND DATE(timestamp AT TIME ZONE 'America/Bogota') = CURRENT_DATE
      ORDER BY timestamp DESC LIMIT 1
    `;
    if (lastEvent.length > 0 && lastEvent[0].tipo_evento === 'entrada') {
      return 'salida';
    }
  }

  return 'entrada';
}

export async function POST(req: Request) {
  try {
    // Sin esto, cualquiera que sepa la URL puede inyectar eventos en el
    // historial de asistencia de menores.
    const auth = await authorize(req);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const { reader_id, tag_uid, tipo_evento, timestamp, geolocalizacion, registrado_por } = body;

    if (!reader_id || !tag_uid) {
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos (reader_id, tag_uid)' },
        { status: 400 }
      );
    }

    // tipo_evento pasa a ser opcional: omitirlo (o mandar "auto") delega la
    // decision en el servidor. Se sigue aceptando explicito para montajes con
    // un lector en cada puerta, y para el simulador.
    if (tipo_evento !== undefined && tipo_evento !== 'auto' &&
        tipo_evento !== 'entrada' && tipo_evento !== 'salida') {
      return NextResponse.json(
        { error: 'tipo_evento inválido (debe ser "entrada", "salida" o "auto")' },
        { status: 400 }
      );
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

    // Se calculan antes del modo matrícula porque ambos los necesitan.
    const tagHex = String(tag_uid).replace(/\s+/g, '').toUpperCase();

    // Rechazar lecturas nulas/ficticias de hardware (0000000000 o FFFFFFFFFF)
    // Esto ocurre cuando el módulo lector RFID perdiología comunicación SPI o requiere reinicio.
    if (/^0+$/.test(tagHex) || /^F+$/i.test(tagHex)) {
      return NextResponse.json(
        { error: 'Lectura nula de hardware (0000000000). Verifique las conexiones del lector RFID o reinícielo.' },
        { status: 400 }
      );
    }

    const tarjetaNum = tarjetaDecimal(tagHex);

    // 2. Check if Enrollment Mode is active for a student
    const enrollmentKeys = await sql`
      SELECT value
      FROM site_content
      WHERE content_key = 'enrollment_active_student_id'
      LIMIT 1
    `;

    let activeStudentId = null;
    // Por qué no se pudo vincular, si es que se intentó. Viaja en la respuesta
    // para que la página de matrícula pueda decirlo, sin que eso cueste el pase.
    let enrollmentBlocked: string | null = null;
    if (enrollmentKeys.length > 0 && enrollmentKeys[0].value.trim() !== '') {
      activeStudentId = enrollmentKeys[0].value.trim();

      // ¿La tarjeta ya es de alguien?
      //
      // rfid_tag_uid es único, así que asignar a ciegas una tarjeta que ya tiene
      // dueño reventaba la petición entera con un 500 de clave duplicada: no se
      // matriculaba, no se registraba el pase, y la página de matrícula se
      // quedaba esperando para siempre un escaneo que sí había llegado.
      //
      // Se comprueba antes y se rechaza. Quitarle la tarjeta a quien la tiene
      // para dársela a otro es una decisión que se toma sabiendo a quién se la
      // quitas -- nunca algo que ocurra porque el modo matrícula estaba activo
      // cuando esa persona pasó por la puerta.
      const dueno = await sql`
        SELECT id, nombre FROM students
         WHERE rfid_tag_uid = ${tagHex}
            OR (${tarjetaNum}::bigint IS NOT NULL AND tarjeta_numero = ${tarjetaNum}::bigint)
         LIMIT 1`;

      if (dueno.length > 0 && dueno[0].id !== activeStudentId) {
        // No se vincula, pero el pase SIGUE su curso.
        //
        // Devolver aquí un error abortaba la petición y con ella el registro de
        // asistencia: mientras alguien se dejara el modo matrícula encendido,
        // cada persona que pasaba una tarjeta ya asignada dejaba de fichar. Una
        // pantalla de matrícula abierta y olvidada apagaba la puerta entera, y
        // en los datos no quedaba ni rastro de por qué.
        //
        // La matrícula es una tarea de oficina; el registro de asistencia es lo
        // que no puede fallar. Así que se anota que no se pudo vincular, se
        // deja el modo activo para que puedan probar con otra tarjeta, y se
        // sigue adelante con el pase como cualquier otro día.
        enrollmentBlocked = `Esa tarjeta ya es de ${dueno[0].nombre}. Usa otra, o quítasela primero.`;
        activeStudentId = null;
      } else {
      await sql`
        UPDATE students
           SET rfid_tag_uid = ${tagHex},
               tarjeta_numero = COALESCE(${tarjetaNum}::bigint, tarjeta_numero)
         WHERE id = ${activeStudentId}
      `;

        await sql`
          UPDATE site_content
          SET value = ''
          WHERE content_key = 'enrollment_active_student_id'
        `;
      }
    }

    // 3. Find student by tag_uid
    // Dos formas de encontrar al mismo alumno, porque hay dos formas de que su
    // tarjeta haya llegado hasta aquí:
    //
    //   rfid_tag_uid    la vinculó alguien desde la página de matrícula, con la
    //                   tarjeta en la mano y el lector delante.
    //   tarjeta_numero  vino en el padrón que exportó el terminal viejo, donde
    //                   ya estaba asignada y solo consta su número en decimal.
    //
    // Se buscan las dos a la vez. Exigir la primera obligaría a re-matricular a
    // mano a los seiscientos que ya tenían tarjeta.
    const students = await sql`
      SELECT id, nombre, grado, activo
      FROM students
      WHERE (rfid_tag_uid = ${tagHex}
             OR (${tarjetaNum}::bigint IS NOT NULL AND tarjeta_numero = ${tarjetaNum}::bigint))
      LIMIT 1
    `;

    if (students.length > 0 && !students[0].activo) {
      return NextResponse.json({
        status: 'student_inactive',
        error: `El estudiante ${students[0].nombre} se encuentra en estado APLAZADO / INACTIVO.`,
        student: { id: students[0].id, nombre: students[0].nombre, grado: students[0].grado }
      }, { status: 400 });
    }

    const student = (students.length > 0 && students[0].activo) ? students[0] : null;

    // 4. Descartar reenvios antes de decidir nada: un duplicado que llegue a la
    //    logica de alternancia invertiria el sentido del pase.
    const recent = await sql`
      SELECT tipo_evento, timestamp FROM attendance_events
      WHERE rfid_tag_uid = ${tag_uid}
        AND timestamp > NOW() - INTERVAL '10 seconds'
      ORDER BY timestamp DESC LIMIT 1
    `;

    if (recent.length > 0) {
      return NextResponse.json({
        status: 'duplicate',
        tipo_evento: recent[0].tipo_evento,
        student: student && { id: student.id, nombre: student.nombre, grado: student.grado },
        message: `Pase repetido; se conserva el evento de ${recent[0].tipo_evento}.`
      });
    }

    const resolvedTipo = await resolveTipoEvento(tipo_evento, student ? student.id : null, tag_uid, student ? student.grado : undefined);
    const wasAutomatic = tipo_evento === undefined || tipo_evento === 'auto';

    const eventTime = timestamp ? new Date(timestamp) : new Date();
    const isSincronizado = true; // Direct scan is synchronized by default

    if (student) {
      // Insert attendance event
      await sql`
        INSERT INTO attendance_events (
          student_id, rfid_tag_uid, reader_id, tipo_evento, timestamp, origen, sincronizado, geolocalizacion, registrado_por
        ) VALUES (
          ${student.id}, ${tag_uid}, ${reader_id}, ${resolvedTipo}, ${eventTime}, ${origen}, ${isSincronizado}, ${geolocalizacion || null}, ${fallbackRegistradoPor}
        )
      `;

      return NextResponse.json({
        status: 'success',
        tipo_evento: resolvedTipo,
        automatico: wasAutomatic,
        student: {
          id: student.id,
          nombre: student.nombre,
          grado: student.grado
        },
        message: `Asistencia (${resolvedTipo}) registrada con éxito.`,
        ...(enrollmentBlocked ? { enrollment_error: enrollmentBlocked } : {})
      });
    } else {
      // Unassigned tag event
      await sql`
        INSERT INTO attendance_events (
          student_id, rfid_tag_uid, reader_id, tipo_evento, timestamp, origen, sincronizado, geolocalizacion, registrado_por
        ) VALUES (
          NULL, ${tag_uid}, ${reader_id}, ${resolvedTipo}, ${eventTime}, ${origen}, ${isSincronizado}, ${geolocalizacion || null}, ${fallbackRegistradoPor}
        )
      `;

      return NextResponse.json({
        status: 'unassigned',
        tipo_evento: resolvedTipo,
        automatico: wasAutomatic,
        message: 'Tarjeta no asignada. Evento guardado para revisión.',
        ...(enrollmentBlocked ? { enrollment_error: enrollmentBlocked } : {})
      });
    }

  } catch (error: any) {
    console.error('Scan ingestion error:', error);
    return NextResponse.json({ error: 'Error al procesar el escaneo', details: error.message || String(error) }, { status: 500 });
  }
}
