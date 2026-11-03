import { Pool } from 'pg';

export const COLLECTIONS = new Set(['products', 'agents', 'orders', 'payments', 'hexing', 'cinv', 'settings']);
export const ID_RE = /^[A-Za-z0-9_.-]{1,120}$/;

let pool: Pool | null = null;
let ready: Promise<void> | null = null;

function connectionString(): string {
  const cs = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!cs) throw new Error('Lipsește DATABASE_URL (baza de date nu este configurată).');
  return cs;
}

export function getPool(): Pool {
  if (!pool) {
    const cs = connectionString();
    const local = /@(localhost|127\.0\.0\.1)(:|\/)/.test(cs) || cs.includes('host=/');
    pool = new Pool({ connectionString: cs, ssl: local ? false : { rejectUnauthorized: true }, max: 3 });
  }
  return pool;
}

export async function db(): Promise<Pool> {
  const p = getPool();
  if (!ready) {
    ready = p
      .query(`
        CREATE TABLE IF NOT EXISTS docs (
          c text NOT NULL,
          id text NOT NULL,
          data jsonb NOT NULL,
          updated_at timestamptz NOT NULL DEFAULT now(),
          PRIMARY KEY (c, id)
        );
        CREATE TABLE IF NOT EXISTS files (
          id text PRIMARY KEY,
          name text NOT NULL,
          type text NOT NULL,
          size integer NOT NULL,
          data bytea NOT NULL,
          created_at timestamptz NOT NULL DEFAULT now()
        );`)
      .then(() => undefined)
      .catch((e) => {
        ready = null;
        throw e;
      });
  }
  await ready;
  return p;
}

export function checkRef(c: string, id: string) {
  if (!COLLECTIONS.has(c)) throw new Error('Colecție necunoscută.');
  if (!ID_RE.test(id)) throw new Error('Identificator invalid.');
}
