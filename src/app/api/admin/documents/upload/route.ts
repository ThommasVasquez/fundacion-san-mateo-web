import { NextResponse } from 'next/server';
import { decrypt } from '@/lib/auth';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { sql } from '@/lib/db';

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
    const folder = (formData.get('folder') as string) || 'normativity';

    if (!file || file.size === 0) {
      return NextResponse.json({ error: 'No se ha seleccionado ningún archivo o está vacío.' }, { status: 400 });
    }

    // Límite de 30 MB
    if (file.size > 30 * 1024 * 1024) {
      return NextResponse.json({ error: 'El archivo supera el límite máximo permitido de 30MB.' }, { status: 400 });
    }

    const originalName = file.name || 'documento.pdf';
    const ext = originalName.split('.').pop()?.toLowerCase() || 'pdf';

    // Generar un nombre seguro para el objeto
    const baseName = originalName
      .replace(/\.[^/.]+$/, '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Quitar tildes
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .substring(0, 60);

    const safeFolder = folder.replace(/[^a-zA-Z0-9_-]/g, '') || 'normativity';
    const timestamp = Date.now();
    const fileKey = `${safeFolder}/${timestamp}_${baseName}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const mimeType = file.type || (ext === 'pdf' ? 'application/pdf' : 'application/octet-stream');

    // Obtener contexto de Cloudflare para verificar si R2 está disponible
    let env: any;
    try {
      const cfContext = await getCloudflareContext({ async: true });
      env = cfContext?.env;
    } catch (cfError: any) {
      console.warn('No se pudo obtener el contexto de Cloudflare en upload de documento:', cfError);
    }

    const bucket = env?.IMAGES_BUCKET;

    // 1. Si R2 está activo y disponible, guardar en R2
    if (bucket) {
      try {
        await bucket.put(fileKey, arrayBuffer, {
          httpMetadata: {
            contentType: mimeType,
          },
          customMetadata: {
            originalName,
            uploadedAt: new Date().toISOString(),
          },
        });

        const publicUrl = `/api/documents/file/${fileKey}`;

        return NextResponse.json({
          success: true,
          url: publicUrl,
          file_name: originalName,
          key: fileKey,
          size: file.size,
          storage: 'r2',
        });
      } catch (r2Err) {
        console.warn('Fallo al guardar en R2, procediendo con respaldo en base de datos Postgres:', r2Err);
      }
    }

    // 2. Respaldo de alta resiliencia: Guardar en Postgres (tabla uploaded_documents)
    const base64Data = Buffer.from(arrayBuffer).toString('base64');

    await sql`
      CREATE TABLE IF NOT EXISTS uploaded_documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        file_key TEXT UNIQUE NOT NULL,
        file_name TEXT NOT NULL,
        content_type TEXT NOT NULL,
        data_base64 TEXT NOT NULL,
        file_size INT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_uploaded_documents_file_key ON uploaded_documents (file_key)
    `;

    await sql`
      INSERT INTO uploaded_documents (file_key, file_name, content_type, data_base64, file_size)
      VALUES (${fileKey}, ${originalName}, ${mimeType}, ${base64Data}, ${file.size})
      ON CONFLICT (file_key) DO UPDATE SET
        file_name = EXCLUDED.file_name,
        content_type = EXCLUDED.content_type,
        data_base64 = EXCLUDED.data_base64,
        file_size = EXCLUDED.file_size,
        created_at = NOW()
    `;

    const publicUrl = `/api/documents/file/${fileKey}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      file_name: originalName,
      key: fileKey,
      size: file.size,
      storage: 'postgres',
    });
  } catch (error: any) {
    console.error('Error al subir documento institucional:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno al procesar el documento' },
      { status: 500 }
    );
  }
}

