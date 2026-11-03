import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { errorResponse, requireAuth } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const deny = await requireAuth();
  if (deny) return deny;
  try {
    const { id } = await params;
    if (!/^[a-f0-9]{32}$/.test(id)) return NextResponse.json({ error: 'Fișier inexistent.' }, { status: 404 });
    const { rows } = await (await db()).query('SELECT name, type, data FROM files WHERE id = $1', [id]);
    if (!rows.length) return NextResponse.json({ error: 'Fișier inexistent.' }, { status: 404 });
    const { name, type, data } = rows[0];
    const safeType = type === 'application/pdf' || type.startsWith('image/') ? type : 'application/octet-stream';
    return new NextResponse(new Uint8Array(data), {
      headers: {
        'Content-Type': safeType,
        'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(name)}`,
        'Cache-Control': 'private, max-age=3600',
        'Content-Security-Policy': "sandbox; default-src 'none'; style-src 'unsafe-inline'; img-src data:",
      },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
