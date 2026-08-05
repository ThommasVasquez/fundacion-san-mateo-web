import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL || (() => {
  // Antes habia aqui una URL completa, con la contrasena de la base del colegio,
  // en un repositorio publico. Un script de mantenimiento no necesita traer su
  // propia credencial: si falta, que falle y se le pase por el entorno.
  throw new Error("Falta DATABASE_URL. Usa: node --env-file=.env.local " + process.argv[1]);
})());

async function main() {
  const programs = await sql`
    SELECT id, title, href, category FROM academic_programs ORDER BY id;
  `;
  console.log("PROGRAMS IN DB:", programs);
}
main().catch(console.error);
