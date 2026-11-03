'use client';
import { useEffect } from 'react';

// Bibliotecile externe, apoi aplicația (public/app.js, generat din client/*.js).
const SCRIPTS = [
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js',
  '/app.js',
];

export default function AppLoader() {
  useEffect(() => {
    const w = window as unknown as { __wmLoaded?: boolean };
    if (w.__wmLoaded) return;
    w.__wmLoaded = true;
    for (const src of SCRIPTS) {
      const s = document.createElement('script');
      s.src = src;
      s.async = false; // păstrează ordinea de execuție
      document.body.appendChild(s);
    }
  }, []);
  return null;
}
