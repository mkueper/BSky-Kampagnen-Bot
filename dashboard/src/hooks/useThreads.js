import { useCallback, useEffect, useMemo, useRef, useState } from "react";

function parseJson(value, fallback) {
  if (value == null) {
    return fallback;
  }

  if (typeof value === "object") {
    return value;
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed ?? fallback;
    } catch (error) {
      console.warn("Konnte JSON nicht parsen:", error);
      return fallback;
    }
  }

  return fallback;
}

function normalizeThread(raw) {
  const targetPlatformsRaw = parseJson(raw?.targetPlatforms, []);
  const metadataRaw = parseJson(raw?.metadata, {});

  const targetPlatforms = Array.isArray(targetPlatformsRaw) ? targetPlatformsRaw : [];
  const metadata = metadataRaw && typeof metadataRaw === "object" && !Array.isArray(metadataRaw) ? metadataRaw : {};

  const segments = Array.isArray(raw?.segments)
    ? raw.segments.map((segment) => ({
        ...segment,
        reactions: Array.isArray(segment?.reactions) ? segment.reactions : [],
      }))
    : [];

  return {
    id: raw?.id,
    title: raw?.title || "",
    scheduledAt: raw?.scheduledAt || null,
    status: raw?.status || "draft",
    targetPlatforms,
    appendNumbering: Boolean(raw?.appendNumbering ?? true),
    metadata,
    segments,
    createdAt: raw?.createdAt || null,
    updatedAt: raw?.updatedAt || null,
  };
}

const DEFAULT_POLL_INTERVAL_MS = 5000;

function resolveEnvMs(value, fallback) {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed >= 0) {
    return parsed;
  }
  return fallback;
}

const POLL_INTERVAL_MS = resolveEnvMs(import.meta.env.VITE_THREAD_POLL_INTERVAL_MS, DEFAULT_POLL_INTERVAL_MS);

function shouldKeepPolling(thread) {
  // Automatisches Polling ist momentan komplett deaktiviert.
  // setAutoRefresh() wird dadurch immer false – ein Reload passiert nur manuell.
  void thread;
  return false;
}

export function useThreads(options = {}) {
  const { status } = options;
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [pendingFollowUp, setPendingFollowUp] = useState(false);
  const previousStatusesRef = useRef(new Map());

  const loadThreads = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (status) {
        params.set("status", status);
      }

      const res = await fetch(`/api/threads${params.toString() ? `?${params}` : ""}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Fehler beim Laden der Threads.");
      }

      const data = await res.json();
      const normalized = Array.isArray(data) ? data.map(normalizeThread) : [];
      setThreads(normalized);
      setAutoRefresh(normalized.some(shouldKeepPolling));

      let needsFollowUpReload = false;
      const nextStatuses = new Map();
      for (const thread of normalized) {
        const previousStatus = previousStatusesRef.current.get(thread.id);
        if (previousStatus === "publishing" && thread.status === "published") {
          needsFollowUpReload = true;
        }
        nextStatuses.set(thread.id, thread.status);
      }
      previousStatusesRef.current = nextStatuses;

      if (needsFollowUpReload) {
        setPendingFollowUp(true);
      }
    } catch (err) {
      console.error("Thread-Ladevorgang fehlgeschlagen:", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  useEffect(() => {
    if (!autoRefresh) {
      return undefined;
    }

    const interval = setInterval(() => {
      loadThreads();
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [autoRefresh, loadThreads]);

  useEffect(() => {
    if (!pendingFollowUp) {
      return undefined;
    }

    let cancelled = false;
    (async () => {
      try {
        await loadThreads();
      } finally {
        if (!cancelled) {
          setPendingFollowUp(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pendingFollowUp, loadThreads]);

  return {
    threads,
    loading,
    error,
    reload: loadThreads,
    draftThreads: useMemo(() => threads.filter((thread) => thread.status === "draft"), [threads]),
    scheduledThreads: useMemo(() => threads.filter((thread) => thread.status === "scheduled"), [threads]),
    publishedThreads: useMemo(() => threads.filter((thread) => thread.status === "published"), [threads]),
  };
}

export function useThreadDetail(id, { autoLoad = true } = {}) {
  const [thread, setThread] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadThread = useCallback(async () => {
    if (!id) {
      setThread(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/threads/${id}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Fehler beim Laden des Threads.");
      }

      const data = await res.json();
      setThread(normalizeThread(data));
    } catch (err) {
      console.error(`Thread ${id} konnte nicht geladen werden:`, err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (autoLoad) {
      loadThread();
    }
  }, [autoLoad, loadThread]);

  return {
    thread,
    loading,
    error,
    reload: loadThread,
  };
}
