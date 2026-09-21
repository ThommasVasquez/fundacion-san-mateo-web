import { sql } from './db';

/**
 * Next no pide una página dinámica: la exige lanzando.
 *
 * Al prerenderizar, una consulta con `cache: 'no-store'` hace que Next lance su
 * `DynamicServerError` para decir "esta ruta no se puede dejar hecha de
 * antemano". No es un fallo de la consulta, es la señal, y tiene que seguir
 * subiendo. Los `catch` de aquí abajo se la tragaban y devolvían `{}`, así que
 * la página se quedaba prerenderizada -- vacía, y con revalidate 0 apuntado --
 * y ese estado contradictorio es el que respondía 500 en Cloudflare. Pasaba
 * solo en las páginas cuya única fuente de dinamismo era esta consulta:
 * /contacto, /institucion/acerca-de-fsm y /institucion/porque-nosotros.
 *
 * Van también NEXT_REDIRECT y NEXT_NOT_FOUND, que son señales igual que ésta.
 */
function esSenalDeNext(e: unknown): boolean {
  const digest = (e as { digest?: unknown } | null | undefined)?.digest;
  return typeof digest === 'string' && (digest === 'DYNAMIC_SERVER_USAGE' || digest.startsWith('NEXT_'));
}

// Simple cache to prevent hitting Neon constantly during a single page render
const cache = new Map<string, string>();

// Mapeo canónico de imágenes originales por programa y curso
const DEFAULT_PROGRAM_IMAGES: Record<string, string> = {
  '/programa-enfermeria': '/img/image21.jpg',
  '/programa-primera-infancia': '/img/image25.jpg',
  '/programa-sistemas': '/img/image8.jpg',
  '/programa-contabilidad': '/img/servicio-al-cliente.jpg',
  '/curso-soporte-vital-basico': '/img/curso-soporte-vital-basico.jpg',
  '/curso-manejo-de-duelo': '/img/curso-manejo-de-duelo-2.jpg',
  '/curso-pai-inyectologia': '/img/curso-pai-inyectologia.jpg',
  '/curso-primeros-auxilios': '/img/curso-primeros-auxilios.jpg',
  '/curso-suturas': '/img/curso-suturas.jpg',
  '/curso-codigo-blanco-atencion-victimas': '/img/image17.jpg',
  '/curso-socorrismo-y-rescate': '/img/image14.jpg',
};

function getOriginalProgramImage(href?: string | null, title?: string | null): string {
  if (href && DEFAULT_PROGRAM_IMAGES[href]) {
    return DEFAULT_PROGRAM_IMAGES[href];
  }
  const t = `${href || ''} ${title || ''}`.toLowerCase();
  if (t.includes('enfermer')) return '/img/image21.jpg';
  if (t.includes('infancia')) return '/img/image25.jpg';
  if (t.includes('soporte') || t.includes('vital')) return '/img/curso-soporte-vital-basico.jpg';
  if (t.includes('duelo')) return '/img/curso-manejo-de-duelo-2.jpg';
  if (t.includes('pai') || t.includes('inyectolog')) return '/img/curso-pai-inyectologia.jpg';
  if (t.includes('auxilio')) return '/img/curso-primeros-auxilios.jpg';
  if (t.includes('sutura')) return '/img/curso-suturas.jpg';
  if (t.includes('blanco') || t.includes('victima')) return '/img/image17.jpg';
  if (t.includes('socorrismo') || t.includes('rescate')) return '/img/image14.jpg';
  return '/img/banner6.jpg';
}

function sanitizeImageUrl(url: string | null | undefined, fallback: string = '/img/banner6.jpg'): string {
  if (!url) return fallback;
  if (url.startsWith('data:image/')) return fallback;
  if (url === '/img/banner1.jpg' || url.endsWith('/banner1.jpg')) return fallback;
  return url;
}

export async function getContentMap(path: string): Promise<Record<string, string>> {
  try {
    const results = await sql`
      SELECT content_key, value FROM site_content WHERE page_path = ${path} OR page_path = '/'
    `;
    
    const map: Record<string, string> = {};
    for (const row of results) {
      let val = row.value;
      if (val && val.startsWith('data:image/')) {
        val = '/img/banner6.jpg';
      }
      map[row.content_key] = val;
    }
    return map;
  } catch (e) {
    if (esSenalDeNext(e)) throw e;
    console.error("Error fetching content:", e);
    return {};
  }
}

export async function getAllContent() {
  try {
    return await sql`SELECT id, content_key, content_type, value, page_path, updated_at FROM site_content ORDER BY page_path, content_key`;
  } catch (e) {
    if (esSenalDeNext(e)) throw e;
    console.error("Error fetching all content:", e);
    return [];
  }
}

export async function getTestimonials() {
  try {
    return await sql`SELECT id, text, author, role FROM testimonials ORDER BY order_index ASC`;
  } catch (e) {
    if (esSenalDeNext(e)) throw e;
    console.error("Error fetching testimonials:", e);
    return [];
  }
}
export async function getDirectoryItems() {
  try {
    return await sql`SELECT id, title, phone FROM directory_items ORDER BY order_index ASC`;
  } catch (e) {
    if (esSenalDeNext(e)) throw e;
    console.error("Error fetching directory items:", e);
    return [];
  }
}
export async function getPrograms() {
  try {
    await sql`ALTER TABLE academic_programs ADD COLUMN IF NOT EXISTS total_clases INTEGER;`.catch(() => []);
    const results = await sql`
      SELECT id, title, subtitle, description, image_url, href, category, is_featured, order_index, total_clases 
      FROM academic_programs 
      ORDER BY is_featured DESC, order_index ASC
    `;
    return results.map((p: any) => ({
      ...p,
      total_clases: p.total_clases ? Number(p.total_clases) : null,
      image_url: sanitizeImageUrl(p.image_url, getOriginalProgramImage(p.href, p.title))
    }));
  } catch (e) {
    if (esSenalDeNext(e)) throw e;
    console.error("Error fetching programs:", e);
    return [];
  }
}
export async function getProgramByHref(href: string) {
  try {
    const results = await sql`SELECT * FROM academic_programs WHERE href = ${href} LIMIT 1`;
    if (results[0]) {
      const defaultImg = getOriginalProgramImage(results[0].href, results[0].title);
      return {
        ...results[0],
        image_url: sanitizeImageUrl(results[0].image_url, defaultImg)
      };
    }
    return null;
  } catch (e) {
    if (esSenalDeNext(e)) throw e;
    console.error(`Error fetching program by href ${href}:`, e);
    return null;
  }
}
export async function getNewsEvents() {
  try {
    return await sql`SELECT * FROM news_events ORDER BY created_at DESC`;
  } catch (e) {
    if (esSenalDeNext(e)) throw e;
    console.error("Error fetching news events:", e);
    return [];
  }
}

export async function getGallery() {
  const items = await sql`SELECT * FROM gallery_items ORDER BY order_index ASC, created_at DESC`;
  return items;
}
export async function getCalendarEvents() {
  try {
    return await sql`SELECT * FROM academic_calendar WHERE is_active = true ORDER BY start_date ASC`;
  } catch (e) {
    if (esSenalDeNext(e)) throw e;
    console.error("Error fetching calendar events:", e);
    return [];
  }
}

export async function getBlogPosts() {
  try {
    return await sql`SELECT id, title, slug FROM blog_posts WHERE published = true ORDER BY created_at DESC LIMIT 20`;
  } catch (e) {
    if (esSenalDeNext(e)) throw e;
    console.error("Error fetching blog posts:", e);
    return [];
  }
}

export async function getFAQs() {
  try {
    return await sql`SELECT id, question, answer, category, order_index FROM faqs WHERE is_active = true ORDER BY category ASC, order_index ASC`;
  } catch (e) {
    if (esSenalDeNext(e)) throw e;
    console.error("Error fetching FAQs:", e);
    return [];
  }
}

export async function getNormativityDocuments() {
  try {
    return await sql`SELECT id, title, category_key, file_name, external_link, order_index, created_at FROM normativity_documents ORDER BY category_key ASC, order_index ASC`;
  } catch (e) {
    if (esSenalDeNext(e)) throw e;
    console.error("Error fetching normativity documents:", e);
    return [];
  }
}
