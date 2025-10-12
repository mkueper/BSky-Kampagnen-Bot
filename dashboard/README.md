# Dashboard (Vite + React)

- Entwicklung: `npm run dev` im Ordner `dashboard/`
- Build: `npm run build` erzeugt `dashboard/dist/`
- Vorschau: `npm run preview`

Hinweise
- Das Backend (Express) liefert den gebauten Inhalt aus `dashboard/dist/` automatisch aus.
- Im Projektroot baut `npm run build:all` das Dashboard mit (Backend benötigt keinen Build).
- Bei Änderung von `VITE_*`-Variablen: Frontend neu bauen (`npm run build`).
