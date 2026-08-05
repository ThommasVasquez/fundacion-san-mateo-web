import { NextResponse } from 'next/server';
import { decrypt } from '@/lib/auth';

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
 * Vive bajo /admin y no comprobaba nada.
 *
 * Hoy no llega a escribir — el cuerpo se descarta y se devuelve una URL
 * simulada — así que no hay nada que robar todavía. Pero en cuanto se restaure
 * la escritura en R2, sin esto sería un endpoint de subida abierto a cualquiera
 * que conozca la URL: un desconocido llenando el bucket del colegio, o dejando
 * ahí lo que quisiera para servirlo desde su dominio.
 *
 * El día que se reactive R2, la comprobación ya está puesta.
 */
async function esAdmin(req: Request): Promise<boolean> {
  const session = readCookie(req.headers.get('cookie'), 'session');
  if (!session) return false;
  try {
    const parsed = await decrypt(session);
    return Boolean(parsed && parsed.adminId);
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  try {
    if (!(await esAdmin(req))) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const url = new URL(req.url);
    const key = url.searchParams.get('key');
    const ext = url.searchParams.get('ext');

    if (!key || !ext) {
      return NextResponse.json({ error: 'Falta llave o extensión' }, { status: 400 });
    }

    const arrayBuffer = await req.arrayBuffer();
    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      return NextResponse.json({ error: 'El archivo está vacío' }, { status: 400 });
    }

    // SAFE MODE TEST: Temporarily bypass R2 binding to see if Worker stays alive
    const publicUrl = `https://mock.energysoftmedia.workers.dev/${key}-mock.${ext}`;

    return NextResponse.json({ url: publicUrl, test_size: arrayBuffer.byteLength });

  } catch (error: any) {
    console.error('Safe Mode Upload Error:', error);
    return NextResponse.json({ error: error.message || 'Error', details: String(error) }, { status: 400 });
  }
}
