# Gefundene Bugs und kritische Probleme

Hier sind potenzielle Fehler und kritische Design-Entscheidungen, die zu Bugs führen oder die Wartbarkeit stark beeinträchtigen.

## 1. Kritischer Architekturfehler: Frontend-Anwendungen sind nicht isoliert

**Problem:** Das `dashboard` lädt die `bsky-client` Anwendung als Komponente. Dies ist kein Bug im Sinne von "das Programm stürzt ab", aber ein schwerwiegender Architekturfehler, der zukünftige Bugs quasi garantiert und die Wartung extrem erschwert.

**Fundort:**
- `dashboard/src/App.jsx`: Der dynamische Import `const ClientApp = React.lazy(() => import('bsky-client'));` lädt die andere Anwendung.
- `dashboard/package.json`: Die Abhängigkeit `"bsky-client": "workspace:*"` formalisiert dieses Problem.

**Auswirkungen:**
- **Fehlende Isolation:** Änderungen am `bsky-client` (z.B. an dessen State Management, Routing oder globalem CSS) können unbeabsichtigt das `dashboard` zerstören und umgekehrt.
- **Abhängigkeitshölle:** Beide Anwendungen können nicht mehr unabhängig voneinander aktualisiert werden. Eine Inkompatibilität in einer Sub-Abhängigkeit kann beide Systeme lahmlegen.
- **Performance:** Das Laden einer kompletten zweiten React-Anwendung innerhalb einer anderen ist ineffizient und verlangsamt das `dashboard`.

**Empfehlung:** Dies sollte mit hoher Priorität behoben werden, indem die in `gemini-vorschlaege.md` beschriebene Entkopplung durchgeführt wird.
