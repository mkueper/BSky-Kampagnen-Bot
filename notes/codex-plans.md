1. Datum (TT.MM.JJJJ)
25.12.2025

2. Status (aktueller Stand, keine ToDos)
- Code-Splitting für bsky-client erweitert: `manualChunks` greift jetzt in der aktiven Vite-Config (`bsky-client/vite.config.js`), große Vendor-Pakete sind ausgelagert; `tzdb`-Chunk-Regel entfernt.
- HLS-Playback bleibt lazy: `hls.js` wird nur bei HLS-Quellen geladen; Import ist gecached (`InlineVideoPlayer`, `MediaLightbox`).
- Search-Imports konsolidiert: `SearchProvider`/`SearchHeader` laufen über `modules/search/index.js`, um sporadische Context-Duplikate im Dev-Server zu vermeiden.
- Tests (Vitest, gesamte Repo) liefen erfolgreich; bekannte Warnungen (`@atproto/lex-data` Ponyfills, Backend-Logging `EACCES`) bestehen.

3. Startpunkt (kurze Einleitung für die nächste Session)
Chunking ist deutlich granularer (neuer Bundle-Report liegt vor). Als Nächstes können wir entscheiden, ob weitere Splits (z. B. `hls`-Warnung tolerieren oder Limit anheben) sinnvoll sind und ob der sporadische Search-Context-Fehler weiter beobachtet werden muss.

4. Nächste Schritte (konkrete, umsetzbare ToDos)
1) Optional: neuen Bundle-Report prüfen und entscheiden, ob die `hls`-Warnung bestehen bleiben soll oder ob ein höheres `chunkSizeWarningLimit` nötig ist.
2) Beobachte, ob der sporadische `useSearchContext`-Fehler im Dev-Server erneut auftritt.

5. ToDos nach Priorität, sofern bekannt durchnummerieren, sonst anhängen
1) Provider-Split weiter vorbereiten: kleineres `AppContext`-Refactoring, damit Dispatches nur betroffene Reducer treffen.
2) UI-Service-Logik weiter auslagern: z. B. `SectionRenderer` oder neue Section-Komponenten, damit sie selbst keine Hooks aktivieren, sondern gezielt Services triggern.

6. Abschluss-Check (prüfbare Kriterien, optional)
- `manualChunks` wirken in `bsky-client/vite.config.js` (neue Vendor-Chunks im Build sichtbar).
- HLS wird nur bei `.m3u8` geladen und der Import wird gecached (kein mehrfacher Load).
- Tests wurden zuletzt vollständig durchlaufen.

7. Offene Fragen (Punkte, die nicht automatisch abgearbeitet werden sollen)
- Brauchen neue Feeds/Listen irgendwann doch neben UI-Tab-Polling auch Hintergrund-Logik, oder bleibt die Badge-Only-Strategie ausreichend?
