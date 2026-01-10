## Verbindlichkeit
Diese Spezifikation ist verbindlich.
Abweichungen oder Erweiterungen sind vor Implementierung abzustimmen.

## Status
Implementiert.

## Ziel

Graceful Expiration im Dashboard (Warnung 5 Minuten vor Ablauf) plus Session-Renew ohne erneuten Login. Optional Auto-Renew, aber nur bei Nutzeraktivität innerhalb der letzten 30 Minuten.

Ausgangslage

Cookie-basierte Session-Auth.

GET /session liefert expiresAt (Unix-Millisekunden).

Session verlängert sich derzeit nur beim Login.

CSRF-Mechanismus vorhanden:

Cookie: kampagnenbot_csrf

Client sendet Header x-csrf-token

Backend prüft Header vs. Cookie timing-safe bei geschützten Endpunkten.

Anforderungen
1) Frontend: Warnung vor Session-Ablauf

Parameter:

warnBefore = 5 Minuten

checkInterval = 30–60 Sekunden

Wenn expiresAt - now <= warnBefore, zeige Banner/Modal:

Text: Session läuft in X Minuten ab.

Button: Verlängern

Optional: Abmelden

Wenn expiresAt <= now: Session abgelaufen → projektübliche Re-Login/Logout-UX.

2) Backend: POST /auth/renew

Endpoint muss CSRF-geschützt sein:

x-csrf-token Header muss mit Cookie kampagnenbot_csrf übereinstimmen (timing-safe).

Verhalten:

Wenn Session gültig: verlängern gemäß AUTH_SESSION_TTL, neues expiresAt zurückgeben (Unix ms).

Wenn Session abgelaufen/ungültig: 401 (oder projektübliche Semantik), keine Verlängerung.

Rate-limit/Cooldown pro Session:

Renew nicht häufiger als alle 2 Minuten (konfigurierbar oder konstante Server-Policy).

Bei zu frühem Renew: 429 oder 200 ohne Verlängerung (bitte festlegen; bevorzugt 429 mit klarer Fehlermeldung).

Response:

JSON { expiresAt: number } (Unix ms)

3) Frontend: Manuelles Renew

Klick auf „Verlängern“:

sendet POST /auth/renew mit Header x-csrf-token (Wert aus Cookie kampagnenbot_csrf)

aktualisiert expiresAt aus Response

schließt Warnung und startet Countdown neu

Fehlerfälle:

401: Session abgelaufen → Re-Login

429: UI zeigt „Zu häufig, bitte kurz warten“ (oder stiller Retry nach Cooldown)

4) Frontend: Auto-Extend (Setting + Idle-Gate)

Setting autoExtendSession (Default: true)

idleCutoff = 30 Minuten

Tracke lastActivityAt anhand echter Interaktion (keydown/pointer/scroll), gedrosselt.

Auto-Renew nur wenn:

autoExtendSession true

Warnfenster aktiv (expiresAt - now <= 5 min)

now - lastActivityAt <= 30 min

Client-seitiger Cooldown (z. B. 2 min) aktiv, um Renew-Spam zu verhindern

Wenn Idle > 30 min: keine Auto-Verlängerung; bei erneuter Aktivität wieder möglich (solange Session noch gültig).

5) Tab-Sync

Synchronisiere tabübergreifend:

lastActivityAt

aktualisiertes expiresAt nach Renew

Empfehlung: BroadcastChannel (Fallback: localStorage events)

Akzeptanzkriterien

Warnung erscheint bei <= 5 min Restlaufzeit.

Button „Verlängern“ verlängert Session ohne Re-Login und aktualisiert expiresAt.

Auto-Extend funktioniert bei Aktivität, aber nicht nach >30 min Idle.

CSRF-Schutz ist aktiv (Header vs Cookie, timing-safe).

Renew ist rate-limited (serverseitig).

Mehrere Tabs sind konsistent.

## Getroffene Entscheidungen

- Renew-Cooldown:
  Bei zu frühem Renew antwortet der Server mit **HTTP 429**
  Begründung: klare Semantik, eindeutige Client-Reaktion.

- Warn-UI:
  Umsetzung als **Banner** (nicht-blockierend)

- Auto-Renew Setting:
  `autoExtendSession` wird **lokal (clientseitig)** persistiert (z. B. localStorage),
  nicht serverseitig synchronisiert.
