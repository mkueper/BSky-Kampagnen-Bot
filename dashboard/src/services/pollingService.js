// src/services/pollingService.js
// Enthält einen anwendungsunabhängigen Polling-Controller. Er berücksichtigt
// Tab-Sichtbarkeit, Benutzerinteraktionen sowie einen Master-Tab-Mechanismus,
// um mehrfaches Polling bei mehreren offenen Fenstern zu vermeiden.

export function createPollingController({
  // Pflicht: Funktionen, die neue Daten holen (Promise<array|object|null>)
  fetchBluesky,            // async () => { items, cursor? } | null
  fetchMastodon,           // async () => { items } | null   (optional, kann noop sein)
  onData,                  // (source, payload) => void  // z.B. UI/DB-Update
  isRelevantView,          // () => bool  // z.B. true nur auf Dashboard
  getNow = () => Date.now(),
  log = (...args) => console.debug('[poll]', ...args),

  // Konfiguration
  activeIntervalMs = 8_000,   // aktiv (sichtbar + fokussiert + Interaktion)
  idleIntervalMs = 40_000,    // sichtbar, aber keine Interaktion > idleAfterMs
  hiddenIntervalMs = 180_000, // Tab im Hintergrund: vorsichtig, spart Traffic
  minimalPingWhenHidden = false, // wenn false: im Hidden-Modus komplett pausieren
  idleAfterMs = 60_000,       // nach x ms ohne Interaktion -> idle
  backoffMaxMs = 300_000,     // exponentielles Backoff bis max
  backoffStartMs = 10_000,    // Start-Backoff
  jitterRatio = 0.15,         // ±15% Jitter, entkoppelt Clients
  heartbeatMs = 2_000,        // Master-Tab Heartbeat
  channelName = 'bsky-campaign-bot-poll-master',
} = {}) {
  // --- Interner Zustand ----------------------------------------------------
  // Die folgenden Variablen kapseln sämtliche Laufzeitdaten des Controllers.
  let lastInteraction = getNow();
  let timerId = null;
  let stopped = true;
  let isMaster = false;
  let backoffMs = 0;
  let lastBeat = 0;

  // Sichtbarkeits-/Fokus-Status
  let hasFocus = typeof document !== 'undefined' ? document.hasFocus() : true;
  let isHidden = typeof document !== 'undefined' ? document.hidden : false;

  // Tab-Master Election
  const bc = typeof BroadcastChannel !== 'undefined'
    ? new BroadcastChannel(channelName)
    : null;
  const tabId = `${getNow()}-${Math.random().toString(36).slice(2, 8)}`;

  // --- Hilfsfunktionen -----------------------------------------------------
  // Kleinere Utilities, damit das Kern-Handling weiter unten schlanker bleibt.
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const withJitter = (ms) => {
    const delta = ms * jitterRatio;
    const jitter = (Math.random() * 2 - 1) * delta;
    return Math.max(1_000, Math.round(ms + jitter));
  };
  const sinceLastInteraction = () => getNow() - lastInteraction;

  // Ermittelt den aktuellen Betriebsmodus abhängig von Sichtbarkeit und Fokus.
  function currentMode() {
    if (typeof isRelevantView === 'function' && isRelevantView() === false) return 'off';
    if (isHidden) return minimalPingWhenHidden ? 'hidden' : 'paused';
    if (!hasFocus) return 'idle';
    if (sinceLastInteraction() > idleAfterMs) return 'idle';
    return 'active';
  }

  function baseIntervalFor(mode) {
    switch (mode) {
      case 'active': return activeIntervalMs;
      case 'idle': return idleIntervalMs;
      case 'hidden': return hiddenIntervalMs;
      case 'paused': return 0; // komplett pausieren
      default: return idleIntervalMs;
    }
  }

  function nextDelayMs() {
    const mode = currentMode();
    if (mode === 'off' || mode === 'paused') return 0;
    const base = baseIntervalFor(mode);
    const delay = backoffMs > 0 ? Math.max(base, backoffMs) : base;
    return withJitter(delay);
  }

  function schedule() {
    clearTimer();
    const delay = nextDelayMs();
    if (delay <= 0) {
      log('paused (no timer)');
      return;
    }
    timerId = setTimeout(tick, delay);
    log('scheduled', { mode: currentMode(), delay });
  }

  function clearTimer() {
    if (timerId) clearTimeout(timerId);
    timerId = null;
  }

  function resetBackoff() {
    backoffMs = 0;
  }

  function increaseBackoff() {
    backoffMs = Math.min(backoffMaxMs, backoffMs ? backoffMs * 2 : backoffStartMs);
  }

  // Hauptschleife: führt die hinterlegten Fetch-Callbacks aus und reagiert auf Fehler.
  async function tick() {
    if (stopped) return;
    if (!isMaster) {
      // Nur Master-Tab pollt
      schedule();
      return;
    }
    if (currentMode() === 'off' || currentMode() === 'paused') {
      schedule();
      return;
    }

    try {
      // Bluesky: Polling
      if (typeof fetchBluesky === 'function') {
        const resB = await fetchBluesky();
        if (resB) onData?.('bluesky', resB);
      }

      // Mastodon: entweder auch pollend (Fallback) oder noop, wenn Streaming separat läuft
      if (typeof fetchMastodon === 'function') {
        const resM = await fetchMastodon();
        if (resM) onData?.('mastodon', resM);
      }

      resetBackoff();
    } catch (err) {
      log('tick error', err);
      const ra = err && Number.isFinite(err.retryAfterMs) ? err.retryAfterMs : null;
      if (ra != null) {
        backoffMs = clamp(ra, backoffStartMs, backoffMaxMs);
        log('apply retry-after backoff', { backoffMs });
      } else {
        increaseBackoff();
      }
    } finally {
      schedule();
    }
  }

  // --- Sofort-Trigger (z. B. nach „Skeet gesendet“) ---
  // Sofortiges Polling auf Anforderung, etwa nach erfolgreichen Mutationen.
  async function triggerNow({ force = false } = {}) {
    // optional: auch im paused/off Modus anstoßen, wenn force=true
    if (!force && (currentMode() === 'off' || currentMode() === 'paused')) return;
    clearTimer();
    try {
      if (typeof fetchBluesky === 'function') {
        const resB = await fetchBluesky();
        if (resB) onData?.('bluesky', resB);
      }
      if (typeof fetchMastodon === 'function') {
        const resM = await fetchMastodon();
        if (resM) onData?.('mastodon', resM);
      }
      resetBackoff();
    } catch (e) {
      log('triggerNow error', e);
      const ra = e && Number.isFinite(e.retryAfterMs) ? e.retryAfterMs : null;
      if (ra != null) {
        backoffMs = clamp(ra, backoffStartMs, backoffMaxMs);
        log('apply retry-after backoff', { backoffMs });
      } else {
        increaseBackoff();
      }
    } finally {
      schedule();
    }
  }

  // --- Event-Handler: Aktivität erfassen -----------------------------------
  const onVisibility = () => {
    isHidden = document.hidden;
    // Sichtbarkeit ändert die Mode-Logik -> Timer neu setzen
    schedule();
  };
  const onFocus = () => { hasFocus = true; lastInteraction = getNow(); schedule(); };
  const onBlur = () => { hasFocus = false; schedule(); };
  const onInteract = () => { lastInteraction = getNow(); /* kein sofortiges schedule, um Spam zu vermeiden */ };

  // --- Master-Tab Wahl via BroadcastChannel --------------------------------
  function sendBeat() {
    lastBeat = getNow();
    if (bc) bc.postMessage({ type: 'beat', tabId, ts: lastBeat });
  }

  let beatTimer = null;
  // Sendet regelmäßig Herzschläge, damit andere Tabs erkennen, ob ein Master aktiv ist.
  function startBeating() {
    stopBeating();
    beatTimer = setInterval(() => {
      sendBeat();
      // Server-Heartbeat nur vom Master-Tab senden
      if (isMaster && typeof fetch === 'function') {
        try { fetch('/api/heartbeat', { method: 'POST' }); } catch (e)  {console.error(e); }
      }
      // Wenn lange kein fremder Beat gesehen wurde, übernehme Master-Rolle
      // (Die Logik für „isMaster“ sitzt in onMessage)
    }, heartbeatMs);
  }
  function stopBeating() {
    if (beatTimer) clearInterval(beatTimer);
    beatTimer = null;
  }

  let lastForeignBeat = 0;
  if (bc) bc.onmessage = (ev) => {
    const msg = ev.data || {};
    if (msg.tabId === tabId) return;

    if (msg.type === 'beat') {
      lastForeignBeat = msg.ts || getNow();
      // Wenn ein anderer Tab schlägt, gib Master-Rolle ab
      if (isMaster && lastForeignBeat > lastBeat) {
        isMaster = false;
        log('lost master to', msg.tabId);
        schedule();
      }
    } else if (msg.type === 'claim') {
      // Ein Tab versucht Master zu werden -> wer zuletzt „lebt“, gewinnt.
      // Passive Anerkennung: Antworte mit Beat.
      sendBeat();
    }
  };

  // Führt eine sehr einfache Master-Wahl durch: wer nach kurzer Zeit keinen
  // fremden Heartbeat bemerkt, erklärt sich selbst zum Master.
  function electMaster() {
    // Grobe, einfache Election:
    // - Bei Start claimen wir die Master-Rolle
    // - Wenn innerhalb von 1 Heartbeat kein fremder Beat kommt, sind wir Master
    return new Promise((resolve) => {
      const start = getNow();
      if (bc) bc.postMessage({ type: 'claim', tabId, ts: start });
      setTimeout(() => {
        if (getNow() - lastForeignBeat > heartbeatMs * 1.2) {
          isMaster = true;
          log('became master');
        } else {
          isMaster = false;
          log('another master present');
        }
        resolve(isMaster);
      }, heartbeatMs * 1.3);
    });
  }

  // --- Lifecycle ---
  // Startet den Poller: registriert Event-Listener, wählt ggf. den Master-Tab
  // und legt den ersten Timer an.
  async function start() {
    if (!stopped) return;
    stopped = false;

    // Listeners
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibility, { passive: true });
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', onFocus, { passive: true });
      window.addEventListener('blur', onBlur, { passive: true });
      window.addEventListener('mousemove', onInteract, { passive: true });
      window.addEventListener('keydown', onInteract, { passive: true });
      window.addEventListener('touchstart', onInteract, { passive: true });
    }

    startBeating();
    await electMaster();
    schedule();
  }

  // Stoppt sämtliche Aktivitäten und bereinigt Event-Listener.
  function stop() {
    if (stopped) return;
    stopped = true;
    clearTimer();
    stopBeating();

    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', onVisibility);
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('mousemove', onInteract);
      window.removeEventListener('keydown', onInteract);
      window.removeEventListener('touchstart', onInteract);
    }

    try { bc && bc.close(); } catch (e) { console.error(e); }
    log('stopped');
  }

  // Öffentliche Steuerfunktionen, die von außen verwendet werden können.
  return {
    start,
    stop,
    triggerNow,
    isMaster: () => isMaster,
    mode: () => currentMode(),
    config: {
      activeIntervalMs, idleIntervalMs, hiddenIntervalMs,
      idleAfterMs, backoffMaxMs, backoffStartMs, jitterRatio,
      minimalPingWhenHidden
    }
  };
}
