import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { SESSION_COOKIE, verifySession } from './session';

// A doua verificare, în fiecare rută API (pe lângă middleware).
export async function requireAuth(): Promise<NextResponse | null> {
  const jar = await cookies();
  if (await verifySession(jar.get(SESSION_COOKIE)?.value)) return null;
  return NextResponse.json({ error: 'Neautentificat.' }, { status: 401 });
}

export function errorResponse(e: unknown, status = 500) {
  const msg = e instanceof Error ? e.message : String(e);
  console.error(e);
  return NextResponse.json({ error: msg }, { status });
}
