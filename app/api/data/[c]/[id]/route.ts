import { NextRequest, NextResponse } from 'next/server';
import { checkRef, db } from '@/lib/db';
import { errorResponse, requireAuth } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ c: string; id: string }> };

async function body(req: NextRequest): Promise<Record<string, unknown>> {
  const b = await req.json();
  if (!b || typeof b !== 'object' || Array.isArray(b)) throw new Error('Date invalide.');
  return b;
}

// set: înlocuiește documentul
export async function PUT(req: NextRequest, { params }: Ctx) {
  const deny = await requireAuth();
  if (deny) return deny;
  try {
    const { c, id } = await params;
    checkRef(c, id);
    const data = await body(req);
    await (await db()).query(
      `INSERT INTO docs (c, id, data, updated_at) VALUES ($1, $2, $3::jsonb, now())
       ON CONFLICT (c, id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
      [c, id, JSON.stringify(data)],
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e, 400);
  }
}

// update: completează câmpurile (documentul trebuie să existe)
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const deny = await requireAuth();
  if (deny) return deny;
  try {
    const { c, id } = await params;
    checkRef(c, id);
    const data = await body(req);
    const r = await (await db()).query(
      'UPDATE docs SET data = data || $3::jsonb, updated_at = now() WHERE c = $1 AND id = $2',
      [c, id, JSON.stringify(data)],
    );
    if (!r.rowCount) return NextResponse.json({ error: 'Documentul nu există.' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e, 400);
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const deny = await requireAuth();
  if (deny) return deny;
  try {
    const { c, id } = await params;
    checkRef(c, id);
    await (await db()).query('DELETE FROM docs WHERE c = $1 AND id = $2', [c, id]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e, 400);
  }
}
