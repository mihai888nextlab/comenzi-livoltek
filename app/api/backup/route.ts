import { NextRequest, NextResponse } from 'next/server';
import { checkRef, db } from '@/lib/db';
import { errorResponse, requireAuth } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Export complet (fără fișierele PDF).
export async function GET() {
  const deny = await requireAuth();
  if (deny) return deny;
  try {
    const { rows } = await (await db()).query('SELECT c, id, data AS d FROM docs ORDER BY c, id');
    return NextResponse.json(
      { app: 'comenzi-livoltek', version: 1, exportedAt: new Date().toISOString(), docs: rows },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}

// Import: { docs: [{c, id, d}], mode: 'merge' | 'replace' }
export async function POST(req: NextRequest) {
  const deny = await requireAuth();
  if (deny) return deny;
  const client = await (await db()).connect();
  try {
    const body = await req.json();
    const docs = Array.isArray(body?.docs) ? body.docs : null;
    if (!docs) return NextResponse.json({ error: 'Fișierul nu conține date valide.' }, { status: 400 });
    for (const x of docs) {
      checkRef(String(x?.c), String(x?.id));
      if (!x.d || typeof x.d !== 'object' || Array.isArray(x.d)) throw new Error(`Document invalid: ${x.c}/${x.id}`);
    }
    await client.query('BEGIN');
    if (body.mode === 'replace') await client.query('DELETE FROM docs');
    for (const x of docs) {
      await client.query(
        `INSERT INTO docs (c, id, data, updated_at) VALUES ($1, $2, $3::jsonb, now())
         ON CONFLICT (c, id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
        [x.c, x.id, JSON.stringify(x.d)],
      );
    }
    await client.query('COMMIT');
    return NextResponse.json({ ok: true, count: docs.length });
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    return errorResponse(e, 400);
  } finally {
    client.release();
  }
}
