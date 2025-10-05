/**
 * @file useClientConfig.js
 * Lädt einmalig die vom Backend freigegebene Client-Konfiguration
 * (u. a. Polling-Intervalle aus der Root-.env via src/config.js).
 */
import { useEffect, useState } from 'react';

export function useClientConfig() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/client-config');
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Fehler beim Laden der Client-Konfiguration.');
        }
        const data = await res.json();
        if (!cancelled) setConfig(data);
      } catch (err) {
        if (!cancelled) setError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { config, loading, error };
}

