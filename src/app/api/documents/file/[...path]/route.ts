import { getCloudflareContext } from '@opennextjs/cloudflare';

export async function GET(
  request: Request,
  context: { params: Promise<{ path: string[] }> | { path: string[] } }
) {
  try {
    const resolvedParams = await context.params;
    const pathSegments = resolvedParams.path;

    if (!pathSegments || pathSegments.length === 0) {
      return new Response('Ruta de archivo no especificada', { status: 400 });
    }

    const key = Array.isArray(pathSegments) ? pathSegments.join('/') : String(pathSegments);

    // Seguridad básica contra path traversal
    if (key.includes('..') || key.startsWith('/')) {
      return new Response('Ruta inválida', { status: 400 });
    }

    let env: any;
    try {
      const cfContext = await getCloudflareContext({ async: true });
      env = cfContext?.env;
    } catch (cfError) {
      console.warn('Error al obtener contexto de Cloudflare en file viewer:', cfError);
    }

    const bucket = env?.IMAGES_BUCKET;
    if (!bucket) {
      // Fallback permanente: Si R2 no está configurado, redirigir imágenes al asset institucional correspondiente y sin repeticiones
      if (key.startsWith('images/')) {
        const lowerKey = key.toLowerCase();
        // Hero principal del Home: FSM Inicio
        if (lowerKey.includes('fsm_img_inicio') || lowerKey.includes('fsm_inicio') || lowerKey.includes('img_2_fsm_inicio')) {
          return Response.redirect(new URL('/img/servicio-al-cliente.jpg', request.url), 302);
        }
        // Enfermería
        if (lowerKey.includes('enfermer') || lowerKey.includes('3767')) {
          return Response.redirect(new URL('/img/image18.jpg', request.url), 302);
        }
        // Primera Infancia y Preescolar
        if (lowerKey.includes('copia_2') || lowerKey.includes('preescolar')) {
          return Response.redirect(new URL('/img/image25.jpg', request.url), 302);
        }
        if (lowerKey.includes('infancia')) {
          return Response.redirect(new URL('/img/image27.jpg', request.url), 302);
        }
        // Información, Sistemas y Servicio al Cliente
        if (lowerKey.includes('copia') || lowerKey.includes('sistemas') || lowerKey.includes('cliente')) {
          return Response.redirect(new URL('/img/image8.jpg', request.url), 302);
        }
        // Inglés
        if (lowerKey.includes('ingles') || lowerKey.includes('inglés')) {
          return Response.redirect(new URL('/img/image10.jpg', request.url), 302);
        }
        // Ceremonias y Grados
        if (lowerKey.includes('ceremonia')) {
          return Response.redirect(new URL('/img/image2.png', request.url), 302);
        }
        // Prácticas Hospitalarias
        if (lowerKey.includes('practica')) {
          return Response.redirect(new URL('/img/pract2.jpg', request.url), 302);
        }
        // Calendario Académico
        if (lowerKey.includes('calendario')) {
          return Response.redirect(new URL('/img/banner7.jpg', request.url), 302);
        }
        // Punto de Contacto y Contacto
        if (lowerKey.includes('punto_de_contacto') || lowerKey.includes('contacto')) {
          return Response.redirect(new URL('/img/banner9.jpg', request.url), 302);
        }
        return Response.redirect(new URL('/img/banner6.jpg', request.url), 302);
      }
      return new Response('Almacenamiento no disponible', { status: 503 });
    }

    const object = await bucket.get(key);

    if (!object) {
      if (key.startsWith('images/')) {
        return Response.redirect(new URL('/img/banner6.jpg', request.url), 302);
      }
      return new Response('Documento no encontrado en el almacenamiento', { status: 404 });
    }

    const headers = new Headers();
    if (typeof object.writeHttpMetadata === 'function') {
      object.writeHttpMetadata(headers);
    }

    if (object.httpEtag) {
      headers.set('etag', object.httpEtag);
    }

    // Nombre de archivo para la cabecera Content-Disposition
    const originalName = object.customMetadata?.originalName || key.split('/').pop() || 'documento.pdf';

    // Determinar mimeType
    let contentType = headers.get('Content-Type');
    if (!contentType || contentType === 'application/octet-stream') {
      if (key.endsWith('.pdf')) {
        contentType = 'application/pdf';
      } else if (key.endsWith('.png')) {
        contentType = 'image/png';
      } else if (key.endsWith('.jpg') || key.endsWith('.jpeg')) {
        contentType = 'image/jpeg';
      } else if (key.endsWith('.webp')) {
        contentType = 'image/webp';
      } else if (key.endsWith('.svg')) {
        contentType = 'image/svg+xml';
      } else if (key.endsWith('.gif')) {
        contentType = 'image/gif';
      } else if (key.endsWith('.avif')) {
        contentType = 'image/avif';
      } else {
        contentType = 'application/octet-stream';
      }
      headers.set('Content-Type', contentType);
    }

    headers.set('Content-Disposition', `inline; filename="${encodeURIComponent(originalName)}"`);
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');

    return new Response(object.body, {
      status: 200,
      headers,
    });
  } catch (error: any) {
    console.error('Error al servir documento desde R2:', error);
    return new Response(`Error interno: ${error.message || error}`, { status: 500 });
  }
}
