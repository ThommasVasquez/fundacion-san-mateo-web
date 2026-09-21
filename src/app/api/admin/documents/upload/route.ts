import { NextResponse } from 'next/server';
import { decrypt } from '@/lib/auth';
import { getCloudflareContext } from '@opennextjs/cloudflare';

/** Lee una cookie por nombre sin traer dependencias */
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

/** Verifica que el usuario tenga una sesión administrativa activa */
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
      return NextResponse.json({ error: 'No autorizado. Debe iniciar sesión como administrador.' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file || file.size === 0) {
      return NextResponse.json({ error: 'No se ha seleccionado ningún archivo o está vacío.' }, { status: 400 });
    }

    // Límite de 30 MB
    if (file.size > 30 * 1024 * 1024) {
      return NextResponse.json({ error: 'El archivo supera el límite máximo permitido de 30MB.' }, { status: 400 });
    }

    const originalName = file.name || 'documento.pdf';
    const ext = originalName.split('.').pop()?.toLowerCase() || 'pdf';

    // Generar un nombre seguro para el objeto en R2
    const baseName = originalName
      .replace(/\.[^/.]+$/, '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Quitar tildes
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .substring(0, 60);

    const timestamp = Date.now();
    const r2Key = `normativity/${timestamp}_${baseName}.${ext}`;

    // Obtener contexto de Cloudflare
    let env: any;
    try {
      const cfContext = await getCloudflareContext({ async: true });
      env = cfContext?.env;
    } catch (cfError: any) {
      console.warn('No se pudo obtener el contexto de Cloudflare directamente:', cfError);
    }

    const bucket = env?.IMAGES_BUCKET;

    if (!bucket) {
      console.error('El bucket R2 IMAGES_BUCKET no está disponible en este entorno.');
      return NextResponse.json(
        { error: 'El almacenamiento institucional R2 no está disponible en este entorno.' },
        { status: 503 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();

    // Guardar en R2
    await bucket.put(r2Key, arrayBuffer, {
      httpMetadata: {
        contentType: file.type || 'application/pdf',
      },
      customMetadata: {
        originalName,
        uploadedAt: new Date().toISOString(),
      },
    });

    const publicUrl = `/api/documents/file/${r2Key}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      file_name: originalName,
      key: r2Key,
      size: file.size,
    });
  } catch (error: any) {
    console.error('Error al subir documento normativo a R2:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno al procesar el documento' },
      { status: 500 }
    );
  }
}
