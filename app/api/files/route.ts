import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { db } from '@/lib/db';
import { errorResponse, requireAuth } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX = 4 * 1024 * 1024; // limita Vercel pentru corpul cererii este 4,5 MB

export async function POST(req: NextRequest) {
  const deny = await requireAuth();
  if (deny) return deny;
  try {
    const form = await req.formData();
    const f = form.get('file');
    if (!(f instanceof File)) return NextResponse.json({ error: 'Lipsește fișierul.' }, { status: 400 });
    if (f.size > MAX) return NextResponse.json({ error: 'Fișierul depășește 4 MB.' }, { status: 413 });
    const id = randomBytes(16).toString('hex');
    const buf = Buffer.from(await f.arrayBuffer());
    await (await db()).query('INSERT INTO files (id, name, type, size, data) VALUES ($1, $2, $3, $4, $5)', [
      id,
      f.name.slice(0, 200) || 'fisier',
      f.type || 'application/octet-stream',
      f.size,
      buf,
    ]);
    return NextResponse.json({ id, url: `/api/files/${id}` });
  } catch (e) {
    return errorResponse(e);
  }
}
