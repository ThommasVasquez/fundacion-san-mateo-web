import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_c9bvh2eQYkTF@ep-long-dew-39869189-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  const todayStr = new Date().toISOString().split('T')[0];

  console.log(`Populating demo absence follow-ups for today (${todayStr}) with real students...`);

  // Find real active students from Turno Noche
  const nightStudents = await sql`
    SELECT id, nombre, grado 
    FROM students 
    WHERE activo = TRUE AND UPPER(grado) LIKE '%NOCHE%' 
    LIMIT 3
  `;

  // Find real active students from Turno Diurno
  const dayStudents = await sql`
    SELECT id, nombre, grado 
    FROM students 
    WHERE activo = TRUE AND UPPER(grado) NOT LIKE '%NOCHE%' 
    LIMIT 3
  `;

  console.log('Night students found:', nightStudents);
  console.log('Day students found:', dayStudents);

  if (nightStudents.length > 0) {
    const s1 = nightStudents[0];
    await sql`
      INSERT INTO absence_followups (student_id, fecha, turno, se_llamo, estado_llamada, comentarios, registrado_por)
      VALUES (
        ${s1.id}::uuid, ${todayStr}::date, 'NOCHE', TRUE, 'contesto', 
        'EJEMPLO DE DEMO: Madre informa que el alumno asistió a cita médica. Promete enviar incapacidad.', 
        'Secretaría Académica'
      )
      ON CONFLICT (student_id, fecha) DO UPDATE SET
        se_llamo = EXCLUDED.se_llamo,
        estado_llamada = EXCLUDED.estado_llamada,
        comentarios = EXCLUDED.comentarios;
    `;
  }

  if (nightStudents.length > 1) {
    const s2 = nightStudents[1];
    await sql`
      INSERT INTO absence_followups (student_id, fecha, turno, se_llamo, estado_llamada, comentarios, registrado_por)
      VALUES (
        ${s2.id}::uuid, ${todayStr}::date, 'NOCHE', FALSE, 'pendiente', 
        'EJEMPLO DE DEMO: Alerta automática transferida al turno mañana. Pendiente por realizar llamada.', 
        'Sistema Automático'
      )
      ON CONFLICT (student_id, fecha) DO UPDATE SET
        se_llamo = EXCLUDED.se_llamo,
        estado_llamada = EXCLUDED.estado_llamada,
        comentarios = EXCLUDED.comentarios;
    `;
  }

  if (dayStudents.length > 0) {
    const s3 = dayStudents[0];
    await sql`
      INSERT INTO absence_followups (student_id, fecha, turno, se_llamo, estado_llamada, comentarios, registrado_por)
      VALUES (
        ${s3.id}::uuid, ${todayStr}::date, 'DIURNO', TRUE, 'no_contesto', 
        'EJEMPLO DE DEMO: Se intentó llamar en 2 ocasiones a las 8:30 AM y 9:15 AM pero mandó a buzón.', 
        'Secretaría Académica'
      )
      ON CONFLICT (student_id, fecha) DO UPDATE SET
        se_llamo = EXCLUDED.se_llamo,
        estado_llamada = EXCLUDED.estado_llamada,
        comentarios = EXCLUDED.comentarios;
    `;
  }

  console.log('Demo absence follow-ups populated successfully.');
}

main().catch(console.error);
