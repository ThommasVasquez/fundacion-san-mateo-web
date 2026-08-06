#!/usr/bin/env node
// Importa el padrón del terminal de control de acceso al padrón único.
//
// Por defecto NO escribe: imprime lo que haría y termina. Escribir requiere
// --ejecutar, y es deliberado — son datos de personas reales, y una importación
// que se lanza sola en cuanto alguien ejecuta el fichero por curiosidad es una
// importación que acaba corriendo dos veces.
//
//   node --env-file=.env.local tools/importar_padron.mjs ~/Downloads/padron.csv
//   node --env-file=.env.local tools/importar_padron.mjs ~/Downloads/padron.csv --ejecutar
//
// Sobre el número de tarjeta, que es lo delicado:
//
// El terminal exporta el ID de 32 bits en decimal. El lector reporta cinco
// bytes, y el primero —el byte de versión— no forma parte de ese número y no es
// constante (en las tarjetas medidas vale 4F, 59, 4F). Así que desde el decimal
// del padrón NO se puede reconstruir el UID que el lector va a leer.
//
// Por eso la clave de cruce es el propio decimal, no el UID: es el único dato
// que los dos lados pueden calcular sin inventarse el byte que les falta.

import { readFileSync } from 'node:fs';

const RUTA = process.argv[2];
const EJECUTAR = process.argv.includes('--ejecutar');

if (!RUTA) {
  console.error('uso: node tools/importar_padron.mjs <padron.csv> [--ejecutar]');
  process.exit(1);
}

// ------------------------------------------------------------------ lectura

/** Un CSV con comas dentro de campos entrecomillados; suficiente para este. */
function parseCsv(texto) {
  const filas = [];
  let campo = '', fila = [], comillas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (comillas) {
      if (c === '"' && texto[i + 1] === '"') { campo += '"'; i++; }
      else if (c === '"') comillas = false;
      else campo += c;
    } else if (c === '"') comillas = true;
    else if (c === ',') { fila.push(campo); campo = ''; }
    else if (c === '\n') { fila.push(campo); filas.push(fila); fila = []; campo = ''; }
    else if (c !== '\r') campo += c;
  }
  if (campo || fila.length) { fila.push(campo); filas.push(fila); }
  return filas;
}

/**
 * Nombres en MAYÚSCULAS y con dobles espacios, tal como los escupe el terminal.
 * Se normaliza el espaciado pero se respetan las mayúsculas: convertirlas a
 * capitalización adivinaría dónde va cada tilde y cada partícula, y una lista
 * de alumnos no es sitio para adivinar cómo se escribe el apellido de nadie.
 */
const limpiarNombre = (s) => s.replace(/\s+/g, ' ').trim();

/** "3  SABADO A" y "3 SABADO  A" son el mismo curso escrito dos veces. */
const limpiarCurso = (s) => s.replace(/\s+/g, ' ').trim().toUpperCase();

const texto = readFileSync(RUTA, 'utf8').replace(/^﻿/, '');
const [cabecera, ...cuerpo] = parseCsv(texto).filter((f) => f.some((c) => c.trim()));
const col = Object.fromEntries(cabecera.map((c, i) => [c.trim(), i]));

const registros = cuerpo.map((f) => ({
  usuarioNro: (f[col['Usuario Nro.']] ?? '').trim(),
  idDispositivo: (f[col['ID en dispositivo']] ?? '').trim(),
  tarjeta: (f[col['Tarjeta Nro.']] ?? '').trim(),
  nombre: limpiarNombre(f[col['Nombre']] ?? ''),
  departamento: (f[col['Departamento']] ?? '').trim(),
  // La cabecera dice "Género" pero el contenido es el rol ("Estudiante"), y
  // "Posición" trae el curso. Se leen por lo que contienen, no por su etiqueta.
  rol: (f[col['Género']] ?? '').trim(),
  curso: limpiarCurso(f[col['Posición']] ?? ''),
  cumpleanos: (f[col['Cumpleaños']] ?? '').trim() || null,
  inicioPracticas: (f[col['Fecha de inicio laboral']] ?? '').trim() || null,
  telefono: (f[col['Teléfono']] ?? '').trim() || null,
  domicilio: (f[col['Domicilio']] ?? '').trim() || null,
  dispositivos: (f[col['Dispositivos']] ?? '').trim() || null,
}));

// ------------------------------------------------------------- clasificación

const conTarjeta = [];
const sinTarjeta = [];
const problemas = [];

for (const r of registros) {
  if (!r.nombre) { problemas.push({ r, por: 'sin nombre' }); continue; }
  if (!r.usuarioNro) { problemas.push({ r, por: 'sin Usuario Nro.' }); continue; }

  if (!/^\d+$/.test(r.tarjeta)) { problemas.push({ r, por: `tarjeta no numérica: "${r.tarjeta}"` }); continue; }

  const num = Number(r.tarjeta);
  // Cero es como el terminal marca "sin tarjeta asignada". No es un error: son
  // los que habrá que matricular a mano junto al lector.
  if (num === 0) { sinTarjeta.push(r); continue; }

  // El ID de un EM4100 son 32 bits. Por encima de eso el dato no puede venir de
  // una tarjeta de estas, así que se aparta en vez de importarse.
  if (num > 0xFFFFFFFF) { problemas.push({ r, por: `fuera del rango de 32 bits: ${num}` }); continue; }

  conTarjeta.push({ ...r, tarjetaNum: num });
}

// Un número de tarjeta en dos personas significa que una de las dos abrirá la
// puerta a nombre de la otra. Se detecta antes de escribir, no después.
const porTarjeta = new Map();
for (const r of conTarjeta) {
  if (!porTarjeta.has(r.tarjetaNum)) porTarjeta.set(r.tarjetaNum, []);
  porTarjeta.get(r.tarjetaNum).push(r);
}
const duplicadas = [...porTarjeta.entries()].filter(([, v]) => v.length > 1);

const porUsuario = new Map();
for (const r of registros) {
  if (!porUsuario.has(r.usuarioNro)) porUsuario.set(r.usuarioNro, []);
  porUsuario.get(r.usuarioNro).push(r);
}
const usuariosRepetidos = [...porUsuario.entries()].filter(([, v]) => v.length > 1);

// ------------------------------------------------------------------ informe

const cursos = [...new Set(registros.map((r) => r.curso).filter(Boolean))].sort();

console.log(`\n=== PADRÓN: ${RUTA} ===`);
console.log(`  filas leídas .................. ${registros.length}`);
console.log(`  con tarjeta, listas ........... ${conTarjeta.length}`);
console.log(`  sin tarjeta (a mano) .......... ${sinTarjeta.length}`);
console.log(`  con problemas ................. ${problemas.length}`);
console.log(`  cursos distintos .............. ${cursos.length}`);

if (duplicadas.length) {
  console.log(`\n  ⚠ TARJETAS COMPARTIDAS POR VARIAS PERSONAS: ${duplicadas.length}`);
  for (const [num, quienes] of duplicadas.slice(0, 10)) {
    console.log(`      ${num}: ${quienes.map((q) => q.nombre).join(' | ')}`);
  }
}
if (usuariosRepetidos.length) {
  console.log(`\n  ⚠ "Usuario Nro." REPETIDO: ${usuariosRepetidos.length}`);
  for (const [n, q] of usuariosRepetidos.slice(0, 10)) {
    console.log(`      ${n}: ${q.map((x) => x.nombre).join(' | ')}`);
  }
}
if (problemas.length) {
  console.log(`\n  ⚠ FILAS APARTADAS:`);
  for (const p of problemas.slice(0, 10)) console.log(`      ${p.por} — ${p.r.nombre || '(sin nombre)'}`);
}

console.log(`\n  A MATRICULAR A MANO (${sinTarjeta.length}):`);
for (const r of sinTarjeta) console.log(`      ${r.usuarioNro.padEnd(12)} ${r.curso.padEnd(14)} ${r.nombre}`);

console.log(`\n  MUESTRA DE LO QUE SE ESCRIBIRÍA:`);
for (const r of conTarjeta.slice(0, 5)) {
  console.log(`      tarjeta ${String(r.tarjetaNum).padStart(9)}  ${r.curso.padEnd(14)} ${r.nombre}`);
}

if (!EJECUTAR) {
  console.log(`\n  → Simulación. No se ha escrito nada.`);
  console.log(`    Añade --ejecutar cuando el formato de tarjeta esté confirmado.\n`);
  process.exit(duplicadas.length || usuariosRepetidos.length || problemas.length ? 2 : 0);
}

// ------------------------------------------------------------------ escritura

if (duplicadas.length || usuariosRepetidos.length) {
  console.error('\n  ✗ Hay duplicados sin resolver. Se aborta antes de escribir.\n');
  process.exit(1);
}

const { neon } = await import('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

let creados = 0, actualizados = 0;
for (const r of conTarjeta.concat(sinTarjeta.map((s) => ({ ...s, tarjetaNum: null })))) {
  const filas = await sql`
    INSERT INTO students (nombre, grado, activo, usuario_nro, id_dispositivo,
                          tarjeta_numero, departamento, rol, telefono, domicilio, dispositivos)
         VALUES (${r.nombre}, ${r.curso || 'SIN CURSO'}, TRUE, ${r.usuarioNro}, ${r.idDispositivo},
                 ${r.tarjetaNum}, ${r.departamento}, ${r.rol}, ${r.telefono}, ${r.domicilio}, ${r.dispositivos})
    -- El WHERE repite el predicado del índice a propósito: students_usuario_nro_idx
    -- es parcial, y Postgres solo lo reconoce para un ON CONFLICT si la sentencia
    -- lo nombra igual. Sin esta línea: "no unique or exclusion constraint matching".
    ON CONFLICT (usuario_nro) WHERE usuario_nro IS NOT NULL DO UPDATE
            SET nombre = EXCLUDED.nombre, grado = EXCLUDED.grado,
                tarjeta_numero = EXCLUDED.tarjeta_numero, departamento = EXCLUDED.departamento,
                rol = EXCLUDED.rol, telefono = EXCLUDED.telefono,
                domicilio = EXCLUDED.domicilio, dispositivos = EXCLUDED.dispositivos
      RETURNING (xmax = 0) AS es_nuevo`;
  filas[0].es_nuevo ? creados++ : actualizados++;
}

console.log(`\n  ✓ ${creados} creados, ${actualizados} actualizados.\n`);
