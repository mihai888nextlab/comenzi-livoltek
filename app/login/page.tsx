'use client';
import { useState } from 'react';

export default function Login() {
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      const r = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw }),
      });
      if (r.ok) {
        window.location.replace('/');
        return;
      }
      const j = await r.json().catch(() => ({}));
      setErr(j.error || 'Autentificarea a eșuat.');
    } catch {
      setErr('Nu se poate contacta serverul.');
    }
    setBusy(false);
  }

  return (
    <main className="login">
      <form onSubmit={submit} className="login-card">
        <h1>Comenzi Livoltek</h1>
        <p className="muted small">Introdu parola ca să intri în aplicație.</p>
        <label>
          Parolă
          <input type="password" autoComplete="current-password" autoFocus value={pw} onChange={(e) => setPw(e.target.value)} />
        </label>
        {err && <div className="msg bad">{err}</div>}
        <button className="btn pri" type="submit" disabled={busy || !pw}>
          {busy ? 'Se verifică…' : 'Intră'}
        </button>
      </form>
    </main>
  );
}
