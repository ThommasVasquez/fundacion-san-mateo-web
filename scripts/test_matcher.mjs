import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL);

function cleanWords(name) {
  if (!name) return [];
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(w => w.length > 1);
}

function levenshtein(a, b) {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

function wordsMatch(wordsA, wordsB) {
  if (wordsA.length === 0 || wordsB.length === 0) return false;
  
  // Exact set match
  const setA = new Set(wordsA);
  const setB = new Set(wordsB);
  if (setA.size === setB.size && [...setA].every(w => setB.has(w))) {
    return true;
  }

  // Count fuzzy matching words (exact match or distance <= 2 for words >= 4 chars)
  let matchedWords = 0;
  const usedB = new Set();

  for (const wa of wordsA) {
    let bestIdx = -1;
    let bestDist = 999;
    for (let i = 0; i < wordsB.length; i++) {
      if (usedB.has(i)) continue;
      const wb = wordsB[i];
      if (wa === wb) {
        bestIdx = i;
        bestDist = 0;
        break;
      }
      const dist = levenshtein(wa, wb);
      if (dist <= 2 && wa.length >= 4 && wb.length >= 4 && dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }
    if (bestIdx !== -1) {
      usedB.add(bestIdx);
      matchedWords++;
    }
  }

  const minLen = Math.min(wordsA.length, wordsB.length);
  // If at least 3 words match, or if both have 2-3 words and >= 2 match
  if (minLen >= 3 && matchedWords >= minLen - 1) return true;
  if (minLen === 2 && matchedWords === 2) return true;
  if (matchedWords >= 3) return true;

  return false;
}

async function run() {
  console.log('Fetching students and students_normalized...');
  const students = await sql`SELECT id, nombre, rfid_tag_uid, tarjeta_numero, usuario_nro, activo, grado FROM students`;
  const normalized = await sql`SELECT id, nombre_original, documento, rfid_tag_uid FROM students_normalized`;

  console.log(`Loaded ${students.length} students and ${normalized.length} normalized.`);

  const studentWordMap = students.map(s => ({
    ...s,
    words: cleanWords(s.nombre)
  }));

  let matchedCount = 0;
  const matches = [];
  const unmatchedNorm = [];

  for (const norm of normalized) {
    const normWords = cleanWords(norm.nombre_original);
    const found = studentWordMap.find(s => wordsMatch(normWords, s.words));

    if (found) {
      matchedCount++;
      matches.push({ norm, student: found });
    } else {
      unmatchedNorm.push(norm);
    }
  }

  console.log(`\nResults:\nMatched: ${matchedCount} / ${normalized.length}`);
  console.log(`Unmatched: ${unmatchedNorm.length}`);

  if (unmatchedNorm.length > 0) {
    console.log('\nRemaining Unmatched Normalized Students:');
    for (const u of unmatchedNorm) {
      console.log(`- ID: ${u.id} | Name: "${u.nombre_original}"`);
    }
  }
}

run().catch(console.error);
