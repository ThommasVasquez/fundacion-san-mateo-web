#!/usr/bin/env node
// Devuelve su tarjeta a los alumnos que se quedaron sin ninguna, leyéndola de
// los pases que ellos mismos dieron cuando todavía funcionaba.
//
//   node --env-file=.env.local scripts/reparar_tarjetas.mjs
//   node --env-file=.env.local scripts/reparar_tarjetas.mjs --ejecutar
//   node --env-file=.env.local scripts/reparar_tarjetas.mjs --ejecutar --reasignar-eventos
//
// Por defecto NO escribe: imprime lo que haría y termina. Son datos de menores y
// la puerta de un colegio depende de ellos.
//
// ── Qué pasó ────────────────────────────────────────────────────────────────
//
// Un alumno se reconoce por dos caminos, y le vale cualquiera de los dos:
//
//   rfid_tag_uid    lo vinculó alguien con la tarjeta en la mano.
//   tarjeta_numero  vino en el padrón del terminal viejo, en decimal.
//
// Los 618 del padrón solo tenían el segundo. La importación masiva hacía
// `SET tarjeta_numero = EXCLUDED.tarjeta_numero` sin más, así que subir un
// fichero sin columna de tarjeta -- una lista de nombres para corregir cursos,
// por ejemplo -- lo ponía a NULL para todos. Y como esa ruta nunca toca
// rfid_tag_uid, se quedaron sin los dos caminos a la vez: la puerta empezó a
// denegarles y cada pase suyo cayó como "tarjeta sin asignar".
//
// La causa está tapada en students/import (ahora COALESCE, que nunca borra).
// Esto es lo otro: recuperar lo que se perdió.
//
// ── De dónde sale lo perdido ────────────────────────────────────────────────
//
// De attendance_events. Cada pase guarda el UID que se leyó, y los anteriores al
// borrado guardan además el student_id que ese UID resolvió. Ahí está la
// correspondencia que se borró de students, escrita por la propia puerta, una
// vez por cada mañana que el alumno entró. No hay que adivinar nada.
//
// Del UID sí se puede bajar al decimal (se descarta el byte de versión), aunque
// del decimal no se pueda subir al UID. Así que un solo pase recupera las dos
// columnas.
//
// ── Lo que no recupera ──────────────────────────────────────────────────────
//
// A quien nunca llegó a pasar la tarjeta por el lector no lo puede recuperar
// nadie: de esa persona no existe rastro de qué tarjeta lleva. Salen listados al
// final, y para ellos el camino es volver a importar el padrón bueno --el que
// sí trae "Tarjeta Nro."-- o vincularlos a mano.

import { neon } from '@neondatabase/serverless';

const EJECUTAR = process.argv.includes('--ejecutar');
const REASIGNAR = process.argv.includes('--reasignar-eventos');

if (!process.env.DATABASE_URL) {
  console.error('Falta DATABASE_URL. Usa: node --env-file=.env.local scripts/reparar_tarjetas.mjs');
  process.exit(1);
}
const sql = neon(process.env.DATABASE_URL);

/**
 * La misma conversión que hacen scan, lookup y link, copiada a propósito.
 *
 * Un script suelto no debería arrastrar el bundle de Next para tres líneas, y si
 * alguna vez cambia el criterio, que falle aquí de forma visible es mejor que
 * que este fichero siga la nueva regla sin que nadie lo haya revisado.
 */
const tarjetaDecimal = (tagUid) => {
  const hex = tagUid.trim().toUpperCase();
  if (!/^[0-9A-F]{10}$/.test(hex)) return null;
  const b = hex.match(/../g).map((x) => parseInt(x, 16));
  return ((b[1] << 24) >>> 0) + (b[2] << 16) + (b[3] << 8) + b[4];
};

const normalizar = (uid) => String(uid ?? '').replace(/\s+/g, '').toUpperCase();

// ───────────────────────────────────────────────────────────── qué hay roto

// Sin las dos columnas no hay forma de reconocerlos: son exactamente los que la
// puerta está denegando ahora mismo.
const huerfanos = await sql`
  SELECT id, nombre, grado, usuario_nro
    FROM students
   WHERE activo = TRUE
     AND rfid_tag_uid IS NULL
     AND tarjeta_numero IS NULL
   ORDER BY grado, nombre`;

if (huerfanos.length === 0) {
  console.log('\n  No hay ningún alumno activo sin tarjeta. Nada que reparar.\n');
  process.exit(0);
}

// Todos los UID con los que cada uno de ellos fichó alguna vez, con cuántas
// veces. Una sola consulta: son 618 alumnos y el driver va por HTTP.
const historial = await sql`
  SELECT ae.student_id AS id,
         upper(replace(ae.rfid_tag_uid, ' ', '')) AS uid,
         count(*)::int AS pases,
         max(ae.timestamp) AS ultimo
    FROM attendance_events ae
    JOIN students s ON s.id = ae.student_id
   WHERE s.activo = TRUE
     AND s.rfid_tag_uid IS NULL
     AND s.tarjeta_numero IS NULL
   GROUP BY ae.student_id, upper(replace(ae.rfid_tag_uid, ' ', ''))
   ORDER BY count(*) DESC`;

const porAlumno = new Map();
for (const fila of historial) {
  if (!porAlumno.has(fila.id)) porAlumno.set(fila.id, []);
  porAlumno.get(fila.id).push(fila);
}

// Quién tiene ya ocupada cada tarjeta. rfid_tag_uid es UNIQUE, así que asignar
// una que ya es de alguien no es un dato peor: es un INSERT que revienta. Y el
// decimal, aunque no sea único en el esquema, duplicado significa que dos
// personas abren la puerta la una por la otra.
const ocupadas = await sql`
  SELECT id, nombre, rfid_tag_uid, tarjeta_numero
    FROM students
   WHERE rfid_tag_uid IS NOT NULL OR tarjeta_numero IS NOT NULL`;

const uidOcupado = new Map();
const decimalOcupado = new Map();
for (const s of ocupadas) {
  if (s.rfid_tag_uid) uidOcupado.set(normalizar(s.rfid_tag_uid), s);
  if (s.tarjeta_numero !== null) decimalOcupado.set(String(s.tarjeta_numero), s);
}

// ──────────────────────────────────────────────────────────────── decisión

const reparables = [];
const ambiguos = [];
const enConflicto = [];
const sinRastro = [];

for (const alumno of huerfanos) {
  const visto = porAlumno.get(alumno.id) ?? [];
  if (visto.length === 0) { sinRastro.push(alumno); continue; }

  // Más de un UID distinto para la misma persona no se resuelve contando pases.
  // Puede ser una tarjeta que se perdió y se repuso -- y entonces la buena es la
  // última -- o puede ser que alguien compartiera la suya un día. Con la puerta
  // de un colegio de por medio, eso lo decide una persona, no este script.
  const uids = visto.filter((v) => v.uid);
  if (uids.length > 1) { ambiguos.push({ alumno, uids }); continue; }

  const uid = uids[0].uid;
  const decimal = tarjetaDecimal(uid);

  const chocaUid = uidOcupado.get(uid);
  const chocaDecimal = decimal === null ? undefined : decimalOcupado.get(String(decimal));
  if (chocaUid || chocaDecimal) {
    enConflicto.push({ alumno, uid, decimal, duenoActual: chocaUid ?? chocaDecimal });
    continue;
  }

  reparables.push({ alumno, uid, decimal, pases: uids[0].pases, ultimo: uids[0].ultimo });

  // Dentro de esta misma pasada dos alumnos podrían reclamar el mismo UID. El
  // primero se lo queda y el segundo cae en conflicto, en vez de que el segundo
  // UPDATE falle a mitad de la reparación.
  uidOcupado.set(uid, { id: alumno.id, nombre: alumno.nombre });
  if (decimal !== null) decimalOcupado.set(String(decimal), { id: alumno.id, nombre: alumno.nombre });
}

// ──────────────────────────────────────────────────────────────── informe

const fecha = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '—');

console.log(`\n=== ALUMNOS ACTIVOS SIN NINGUNA TARJETA: ${huerfanos.length} ===`);
console.log(`  recuperables desde el histórico ... ${reparables.length}`);
console.log(`  con varios UID (a mano) .......... ${ambiguos.length}`);
console.log(`  la tarjeta ya es de otro ......... ${enConflicto.length}`);
console.log(`  sin ningún pase registrado ....... ${sinRastro.length}`);

if (reparables.length) {
  console.log(`\n  SE LES DEVOLVERÍA SU TARJETA (${reparables.length}):`);
  for (const r of reparables.slice(0, 25)) {
    console.log(
      `      ${r.uid.padEnd(12)} ${String(r.decimal ?? '—').padStart(10)}  ` +
      `${(r.alumno.grado ?? '').padEnd(14)} ${r.alumno.nombre}  ` +
      `(${r.pases} pases, último ${fecha(r.ultimo)})`,
    );
  }
  if (reparables.length > 25) console.log(`      …y ${reparables.length - 25} más.`);
}

if (ambiguos.length) {
  console.log(`\n  ⚠ VARIOS UID PARA LA MISMA PERSONA — se saltan, decídelo a mano:`);
  for (const a of ambiguos) {
    console.log(`      ${a.alumno.nombre} (${a.alumno.grado})`);
    for (const u of a.uids) {
      console.log(`          ${u.uid.padEnd(12)} ${u.pases} pases, último ${fecha(u.ultimo)}`);
    }
  }
}

if (enConflicto.length) {
  console.log(`\n  ⚠ SU TARJETA YA FIGURA A NOMBRE DE OTRO — se saltan:`);
  for (const c of enConflicto) {
    console.log(`      ${c.uid.padEnd(12)} ${c.alumno.nombre}  →  ahora es de ${c.duenoActual.nombre}`);
  }
}

if (sinRastro.length) {
  console.log(`\n  SIN RASTRO EN EL HISTÓRICO (${sinRastro.length}) — hay que reimportar el padrón`);
  console.log(`  con su columna "Tarjeta Nro.", o vincularlos desde Vincular Tarjetas:`);
  for (const s of sinRastro.slice(0, 40)) {
    console.log(`      ${String(s.usuario_nro ?? '—').padEnd(12)} ${(s.grado ?? '').padEnd(14)} ${s.nombre}`);
  }
  if (sinRastro.length > 40) console.log(`      …y ${sinRastro.length - 40} más.`);
}

if (!EJECUTAR) {
  console.log(`\n  → Simulación. No se ha escrito nada.`);
  console.log(`    Añade --ejecutar para aplicarlo.`);
  console.log(`    Añade además --reasignar-eventos para que los pases que ya`);
  console.log(`    quedaron como "sin asignar" vuelvan a su alumno en la hoja.\n`);
  process.exit(0);
}

// ─────────────────────────────────────────────────────────────── escritura

let devueltas = 0;
for (const r of reparables) {
  await sql`
    UPDATE students
       SET rfid_tag_uid = ${r.uid},
           tarjeta_numero = COALESCE(${r.decimal}::bigint, tarjeta_numero)
     WHERE id = ${r.alumno.id}
       -- Por si alguien vinculó a esta persona entre el informe y esta línea:
       -- que la reparación no pise una decisión más reciente que ella misma.
       AND rfid_tag_uid IS NULL
       AND tarjeta_numero IS NULL`;
  devueltas++;
}

console.log(`\n  ✓ ${devueltas} alumnos han recuperado su tarjeta.`);

// Los pases que ya cayeron como "sin asignar" no se arreglan solos: quedaron
// escritos con student_id NULL y ahí siguen. Va detrás de su propia bandera
// porque esto reescribe historial de asistencia, que es otra clase de acto.
//
// tipo_evento no se toca. Cuando el pase entró sin alumno, la alternancia se
// calculó sobre el UID, y ese UID era el suyo: la secuencia entrada/salida ya
// es la correcta, solo le faltaba el nombre delante.
if (REASIGNAR) {
  let eventos = 0;
  for (const r of reparables) {
    const filas = await sql`
      UPDATE attendance_events
         SET student_id = ${r.alumno.id}
       WHERE student_id IS NULL
         AND upper(replace(rfid_tag_uid, ' ', '')) = ${r.uid}
      RETURNING id`;
    eventos += filas.length;
  }
  console.log(`  ✓ ${eventos} pases sueltos han vuelto a su alumno en la hoja de asistencia.`);
}

console.log('');
