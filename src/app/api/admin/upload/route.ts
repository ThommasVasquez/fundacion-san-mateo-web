import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
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
