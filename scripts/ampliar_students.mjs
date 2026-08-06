// Amplía `students` con lo que traía el terminal de control de acceso.
//
//   node --env-file=.env.local scripts/ampliar_students.mjs
//
// Todo se añade como NULL: las filas que ya existen siguen siendo válidas, y
// una columna obligatoria sobre una tabla con datos habría exigido inventar un
// valor por defecto para gente real.
//
// Idempotente — IF NOT EXISTS en cada paso, así que volver a lanzarlo no rompe
// nada ni duplica el índice.

import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

const pasos = [
  // El número con el que esa persona existe en el terminal. Es la clave con la
  // que se reimporta: sin ella, un segundo pase del importador crearía 618
  // alumnos nuevos en vez de actualizar los que ya están.
  `ALTER TABLE students ADD COLUMN IF NOT EXISTS usuario_nro TEXT`,
  `ALTER TABLE students ADD COLUMN IF NOT EXISTS id_dispositivo TEXT`,

  // El ID de 32 bits de la tarjeta, en decimal, tal como lo exporta el terminal.
  //
  // Numérico y no texto, y separado de rfid_tag_uid a propósito: son dos formas
  // distintas del mismo objeto y ninguna se deduce de la otra. El lector reporta
  // cinco bytes y el primero -el de versión- no entra en este número y no es
  // constante, así que desde aquí no se puede reconstruir el UID, ni al revés
  // sin haber leído la tarjeta. Conviven hasta que una lectura real confirme la
  // equivalencia.
  `ALTER TABLE students ADD COLUMN IF NOT EXISTS tarjeta_numero BIGINT`,

  `ALTER TABLE students ADD COLUMN IF NOT EXISTS departamento TEXT`,
  // La exportación titula esta columna "Género" y lo que trae dentro es el rol
  // ("Estudiante"). Se guarda por lo que contiene, no por como lo llamaba el
  // terminal.
  `ALTER TABLE students ADD COLUMN IF NOT EXISTS rol TEXT`,
  `ALTER TABLE students ADD COLUMN IF NOT EXISTS telefono TEXT`,
  `ALTER TABLE students ADD COLUMN IF NOT EXISTS domicilio TEXT`,
  `ALTER TABLE students ADD COLUMN IF NOT EXISTS cumpleanos DATE`,
  // El instituto tiene tiempo lectivo y tiempo de prácticas; el terminal llamaba
  // a esto "Fecha de inicio laboral". Hoy llega vacío en las 618 filas, y se crea
  // igual porque sus protocolos lo contemplan.
  `ALTER TABLE students ADD COLUMN IF NOT EXISTS inicio_practicas DATE`,
  `ALTER TABLE students ADD COLUMN IF NOT EXISTS dispositivos TEXT`,
  // 1 o 2. No viene en la exportación -allí todos son "FSM"-, así que queda
  // nulo hasta que alguien diga qué curso pertenece a qué sede.
  `ALTER TABLE students ADD COLUMN IF NOT EXISTS sede SMALLINT`,

  // Único y parcial: las filas que ya estaban no tienen usuario_nro, y un índice
  // único normal las contaría a todas como el mismo duplicado de NULL.
  `CREATE UNIQUE INDEX IF NOT EXISTS students_usuario_nro_idx
     ON students (usuario_nro) WHERE usuario_nro IS NOT NULL`,

  // Por donde va a buscar el cruce cuando se active.
  `CREATE INDEX IF NOT EXISTS students_tarjeta_numero_idx
     ON students (tarjeta_numero) WHERE tarjeta_numero IS NOT NULL`,
];

// sql.query y no sql`...`: estas sentencias no llevan ningún valor interpolado,
// y el cliente reserva la forma de plantilla para las que sí.
for (const paso of pasos) {
  await sql.query(paso);
  console.log('  ✓', paso.replace(/\s+/g, ' ').slice(0, 80));
}

const cols = await sql`
  SELECT column_name, data_type FROM information_schema.columns
   WHERE table_name = 'students' ORDER BY ordinal_position`;
console.log('\ncolumnas de students:');
for (const c of cols) console.log(`  ${c.column_name} (${c.data_type})`);
