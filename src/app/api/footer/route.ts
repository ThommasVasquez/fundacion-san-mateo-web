import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [settingsRows, addresses, socials, certifications] = await Promise.all([
      sql`SELECT content_key, value FROM site_content WHERE content_key LIKE 'footer_%'`,
      sql`SELECT id, name, address, order_index FROM footer_addresses ORDER BY order_index ASC`,
      sql`SELECT id, name, url, icon FROM footer_socials`,
      sql`SELECT id, name, image_url, order_index FROM footer_certifications ORDER BY order_index ASC`
    ]);

    const settings: Record<string, string> = {};
    for (const row of (settingsRows as any[])) {
      settings[row.content_key] = row.value;
    }

    return NextResponse.json(
      { 
        settings, 
        addresses: addresses || [], 
        socials: socials || [], 
        certifications: certifications || [] 
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        }
      }
    );
  } catch (error) {
    console.error('Error fetching footer data in /api/footer:', error);
    return NextResponse.json(
      { settings: {}, addresses: [], socials: [], certifications: [] },
      { status: 200 }
    );
  }
}
