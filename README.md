# Comenzi Livoltek – Wiz Mobile

Aplicație Next.js pentru evidența comenzilor clienților, a proformelor, plăților, facturilor Hexing,
facturilor către clienți, stocului, comisioanelor agenților și raportului lunar.

Accesul este protejat cu o singură parolă (`APP_PASSWORD`). Fără sesiune validă, orice pagină
redirecționează la `/login`, iar toate rutele `/api/*` răspund cu 401. Sesiunea este un cookie
`HttpOnly` semnat (HMAC-SHA256 cu `AUTH_SECRET`), valabil 30 de zile.

## Publicare pe Vercel

1. **Proiect nou**: pe vercel.com → *Add New… → Project* → alege acest depozit GitHub → *Deploy*
   (prima publicare poate eșua până configurezi pașii de mai jos – e normal).
2. **Baza de date**: în proiect → *Storage* → *Create Database* → **Neon (Postgres)** → conectează-l
   la proiect (toate mediile). Vercel adaugă automat variabila `DATABASE_URL`. Tabelele se creează
   singure la prima cerere.
3. **Variabile de mediu** (*Settings → Environment Variables*):
   - `APP_PASSWORD` – parola ta de acces (lungă, minim 12 caractere).
   - `AUTH_SECRET` – minim 32 de caractere aleatorii, de ex. rezultatul comenzii
     `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
4. **Redeploy**: *Deployments → … → Redeploy*.
5. **Datele existente**: intră în aplicație → *Setări → Backup date* → încarcă fișierul de backup
   `backup-comenzi-*.json` → *Încarcă backup*.

## Securitate

- Schimbarea `AUTH_SECRET` deconectează imediat toate sesiunile (de ex. dacă ai intrat de pe un
  calculator străin). Schimbarea `APP_PASSWORD` nu închide sesiunile deja deschise – schimbă și
  `AUTH_SECRET` în acest caz.
- Cererile care modifică date sunt acceptate doar de pe același domeniu (protecție CSRF), iar
  pagina are `noindex` și nu poate fi încadrată în alte site-uri.
- Fișierele PDF încărcate se păstrează în baza de date (maxim 4 MB / fișier) și se descarcă doar
  cu sesiune validă.
- Recomandat: păstrează depozitul GitHub **privat**.

## Dezvoltare locală

```bash
cp .env.example .env.local   # completează valorile
npm install
npm run dev                  # http://localhost:3000
```

## Structură

- `app/` – paginile Next.js (`/`, `/login`) și rutele API (`/api/data`, `/api/files`,
  `/api/backup`, `/api/login`, `/api/logout`).
- `middleware.ts` + `lib/session.ts` – autentificarea.
- `lib/db.ts` – conexiunea Postgres; datele sunt păstrate ca documente JSON (`docs`) și fișiere (`files`).
- `client/` – interfața aplicației (JavaScript fără framework). La `npm run build`/`npm run dev`
  fișierele se concatenează în `public/app.js` (`scripts/build-client.mjs`).
  `client/shim.js` face legătura cu API-ul serverului.
