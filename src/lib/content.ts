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
