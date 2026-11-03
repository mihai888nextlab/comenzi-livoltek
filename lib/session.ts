// Sesiune semnată HMAC-SHA256. Funcționează atât în middleware (Edge) cât și în rutele Node.
export const SESSION_COOKIE = 'wm_session';
export const SESSION_DAYS = 30;

const enc = new TextEncoder();

function getSecret(): string | null {
  const s = process.env.AUTH_SECRET;
  return s && s.length >= 32 ? s : null;
}

function b64url(buf: ArrayBuffer): string {
  let s = '';
  const b = new Uint8Array(buf);
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function hmac(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64url(await crypto.subtle.sign('HMAC', key, enc.encode(payload)));
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export async function createSession(): Promise<string> {
  const secret = getSecret();
  if (!secret) throw new Error('AUTH_SECRET lipsește sau are mai puțin de 32 de caractere.');
  const payload = `v1.${Date.now() + SESSION_DAYS * 864e5}`;
  return `${payload}.${await hmac(secret, payload)}`;
}

export async function verifySession(token: string | undefined | null): Promise<boolean> {
  const secret = getSecret();
  if (!secret || !token) return false;
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== 'v1') return false;
  const exp = Number(parts[1]);
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  return safeEqual(parts[2], await hmac(secret, `${parts[0]}.${parts[1]}`));
}

export async function passwordMatches(input: string): Promise<boolean> {
  const expected = process.env.APP_PASSWORD;
  if (!expected) return false;
  // compară digest-urile, ca timpul să nu depindă de lungimea parolei
  const d = async (s: string) => b64url(await crypto.subtle.digest('SHA-256', enc.encode(s)));
  return safeEqual(await d(input), await d(expected));
}
