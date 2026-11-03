// Concatenează sursele din client/ în public/app.js (în ordinea în care depind unele de altele).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ORDER = ['shim', 'core', 'fonts', 'views', 'views2', 'cinv', 'report', 'extras', 'actions'];
const out = ORDER.map((f) => `/* ===== ${f}.js ===== */\n` + readFileSync(join(root, 'client', f + '.js'), 'utf8')).join('\n');
mkdirSync(join(root, 'public'), { recursive: true });
writeFileSync(join(root, 'public', 'app.js'), out);
console.log(`public/app.js: ${(out.length / 1024).toFixed(0)} KB`);
