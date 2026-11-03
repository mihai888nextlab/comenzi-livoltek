import { NextRequest, NextResponse } from 'next/server';
import { createSession, passwordMatches, SESSION_COOKIE, SESSION_DAYS } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (!process.env.APP_PASSWORD || !process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) {
    return NextResponse.json(
      { error: 'Aplicația nu este configurată: setează APP_PASSWORD și AUTH_SECRET (minim 32 de caractere) în Vercel.' },
      { status: 500 },
    );
  }
  let password = '';
  try {
    const body = await req.json();
    password = typeof body?.password === 'string' ? body.password : '';
  } catch {}
  if (!(await passwordMatches(password))) {
    // încetinește încercările repetate
    await new Promise((r) => setTimeout(r, 1200));
    return NextResponse.json({ error: 'Parolă greșită.' }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, await createSession(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DAYS * 86400,
  });
  return res;
}
