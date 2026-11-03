import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { errorResponse, requireAuth } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Toate documentele, grupate pe colecții.
export async function GET() {
  const deny = await requireAuth();
  if (deny) return deny;
  try {
    const { rows } = await (await db()).query('SELECT c, id, data FROM docs');
    const out: Record<string, Record<string, unknown>> = {};
    for (const r of rows) (out[r.c] ||= {})[r.id] = r.data;
    return NextResponse.json({ collections: out }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return errorResponse(e);
  }
}
