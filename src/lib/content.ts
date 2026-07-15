import { sql } from './db';

// Simple cache to prevent hitting Neon constantly during a single page render
const cache = new Map<string, string>();

export async function getContentMap(path: string): Promise<Record<string, string>> {
  try {
    const results = await sql`
      SELECT content_key, value FROM site_content WHERE page_path = ${path} OR page_path = '/'
    `;
    
    const map: Record<string, string> = {};
    for (const row of results) {
      map[row.content_key] = row.value;
    }
    return map;
  } catch (e) {
    console.error("Error fetching content:", e);
    return {};
  }
}

export async function getAllContent() {
  try {
    return await sql`SELECT id, content_key, content_type, value, page_path, updated_at FROM site_content ORDER BY page_path, content_key`;
  } catch (e) {
    console.error("Error fetching all content:", e);
    return [];
  }
}

export async function getTestimonials() {
  try {
    return await sql`SELECT id, text, author, role FROM testimonials ORDER BY order_index ASC`;
  } catch (e) {
    console.error("Error fetching testimonials:", e);
    return [];
  }
}
export async function getDirectoryItems() {
  try {
    return await sql`SELECT id, title, phone FROM directory_items ORDER BY order_index ASC`;
  } catch (e) {
    console.error("Error fetching directory items:", e);
    return [];
  }
}
export async function getPrograms() {
  try {
    return await sql`SELECT * FROM academic_programs ORDER BY is_featured DESC, order_index ASC`;
  } catch (e) {
    console.error("Error fetching programs:", e);
    return [];
  }
}
export async function getProgramByHref(href: string) {
  try {
    const results = await sql`SELECT * FROM academic_programs WHERE href = ${href} LIMIT 1`;
    return results[0] || null;
  } catch (e) {
    console.error(`Error fetching program by href ${href}:`, e);
    return null;
  }
}
export async function getNewsEvents() {
  try {
    return await sql`SELECT * FROM news_events ORDER BY created_at DESC`;
  } catch (e) {
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
    console.error("Error fetching calendar events:", e);
    return [];
  }
}

export async function getBlogPosts() {
  try {
    return await sql`SELECT id, title, slug FROM blog_posts WHERE published = true ORDER BY created_at DESC LIMIT 20`;
  } catch (e) {
    console.error("Error fetching blog posts:", e);
    return [];
  }
}

export async function getFAQs() {
  try {
    return await sql`SELECT id, question, answer, category, order_index FROM faqs WHERE is_active = true ORDER BY category ASC, order_index ASC`;
  } catch (e) {
    console.error("Error fetching FAQs:", e);
    return [];
  }
}

export async function getNormativityDocuments() {
  try {
    return await sql`SELECT id, title, category_key, file_name, external_link, order_index, created_at FROM normativity_documents ORDER BY category_key ASC, order_index ASC`;
  } catch (e) {
    console.error("Error fetching normativity documents:", e);
    return [];
  }
}
