import { useMemo, useRef, useState } from "react";

const PLATFORM_OPTIONS = [
  { id: "bluesky", label: "Bluesky", limit: 300 },
  { id: "mastodon", label: "Mastodon", limit: 500 },
];

function splitIntoSentences(text) {
  const normalized = text.replace(/\s+/g, " ");
  const pattern = /[^.!?]+[.!?]*(?:\s+|$)/g;
  const sentences = [];
  let match;
  while ((match = pattern.exec(normalized)) !== null) {
    sentences.push(match[0]);
  }
  if (sentences.length === 0) {
    return [normalized];
  }
  return sentences;
}

function hardSplit(text, limit) {
  if (!text) return [""];
  const chunks = [];
  let cursor = 0;
  while (cursor < text.length) {
    chunks.push(text.slice(cursor, cursor + limit));
    cursor += limit;
  }
  return chunks;
}

function formatDateTimeLocal(date) {
  const pad = (value) => String(value).padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function getDefaultScheduledAt() {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 9, 0, 0, 0);
  return formatDateTimeLocal(next);
}

function splitRawSegments(source) {
  const normalized = source.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  const segments = [];
  let buffer = [];

  for (const line of lines) {
    if (line.trim() === "---") {
      segments.push(buffer.join("\n"));
      buffer = [];
    } else {
      buffer.push(line);
    }
  }

  segments.push(buffer.join("\n"));

  if (segments.length === 0) {
    return [""];
  }

  return segments;
}

function computeLimit(selectedPlatforms) {
  if (!selectedPlatforms.length) {
    return null;
  }
  const selectedOptions = PLATFORM_OPTIONS.filter((option) => selectedPlatforms.includes(option.id));
  if (selectedOptions.length === 0) {
    return null;
  }
  return selectedOptions.reduce((min, option) => Math.min(min, option.limit), Infinity);
}

function ThreadForm() {
  const [targetPlatforms, setTargetPlatforms] = useState(["bluesky"]);
  const [source, setSource] = useState("");
  const [appendNumbering, setAppendNumbering] = useState(true);
  const [scheduledAt, setScheduledAt] = useState(() => getDefaultScheduledAt());
  const textareaRef = useRef(null);

  const limit = useMemo(() => computeLimit(targetPlatforms), [targetPlatforms]);

  const rawSegments = useMemo(() => splitRawSegments(source), [source]);

  const effectiveSegments = useMemo(() => {
    if (!Number.isFinite(limit)) {
      return rawSegments.map((segment) => segment.replace(/\s+$/u, ""));
    }
    const reservedForNumbering = appendNumbering ? 8 : 0;
    const effectiveLimit = Math.max(20, limit - reservedForNumbering);
    const result = [];
    rawSegments.forEach((segment) => {
      const trimmed = segment.replace(/\s+$/u, "");
      if (!trimmed) {
        result.push("");
        return;
      }
      if (trimmed.length <= effectiveLimit) {
        result.push(trimmed);
        return;
      }
      const sentences = splitIntoSentences(trimmed);
      let buffer = "";
      sentences.forEach((sentence) => {
        const candidate = buffer ? `${buffer}${sentence}` : sentence;
        if (candidate.trim().length <= effectiveLimit) {
          buffer = candidate;
        } else {
          if (buffer.trim()) {
            result.push(buffer.trim());
          }
          let fallback = sentence.trim();
          if (fallback.length > effectiveLimit) {
            const hardChunks = hardSplit(fallback, effectiveLimit);
            result.push(...hardChunks.slice(0, -1).map((chunk) => chunk.trim()));
            fallback = hardChunks[hardChunks.length - 1];
          }
          buffer = fallback;
        }
      });
      if (buffer.trim()) {
        result.push(buffer.trim());
      }
    });
    return result;
  }, [rawSegments, limit, appendNumbering]);

  const totalSegments = effectiveSegments.length;

  const previewSegments = useMemo(() => {
    return effectiveSegments.map((segment, index) => {
      const trimmedEnd = segment.replace(/\s+$/u, "");
      const numbering = appendNumbering ? `\n\n>${index + 1}/${totalSegments}` : "";
      const formattedContent = appendNumbering ? `${trimmedEnd}${numbering}` : trimmedEnd;
      const characterCount = formattedContent.length;
      const isEmpty = trimmedEnd.trim().length === 0;
      const exceedsLimit = typeof limit === "number" ? characterCount > limit : false;

      return {
        id: index,
        raw: segment,
        formatted: formattedContent,
        characterCount,
        isEmpty,
        exceedsLimit,
      };
    });
  }, [effectiveSegments, appendNumbering, totalSegments, limit]);

  const handleTogglePlatform = (platformId) => {
    setTargetPlatforms((current) => {
      if (current.includes(platformId)) {
        return current.filter((id) => id !== platformId);
      }
      return [...current, platformId];
    });
  };

  const handleInsertSeparator = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const separator = textarea.selectionStart === 0 ? "---\n" : "\n---\n";
    const { selectionStart, selectionEnd, value } = textarea;
    const nextValue = `${value.slice(0, selectionStart)}${separator}${value.slice(selectionEnd)}`;
    setSource(nextValue);

    requestAnimationFrame(() => {
      const cursorPosition = selectionStart + separator.length;
      textarea.selectionStart = cursorPosition;
      textarea.selectionEnd = cursorPosition;
      textarea.focus();
    });
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      handleInsertSeparator();
    }
  };

  const limitLabel = useMemo(() => {
    if (!targetPlatforms.length) {
      return "Keine Plattform ausgewählt";
    }
    if (typeof limit !== "number" || !Number.isFinite(limit)) {
      return "Zeichenlimit nicht bestimmt";
    }
    return `${limit} Zeichen (limitierend)`;
  }, [limit, targetPlatforms.length]);

  const hasValidationIssues = useMemo(() => {
    if (!targetPlatforms.length) {
      return true;
    }
    return previewSegments.some((segment) => segment.isEmpty || segment.exceedsLimit);
  }, [previewSegments, targetPlatforms.length]);

  const handleSubmit = (event) => {
    event.preventDefault();
    // Placeholder für spätere Implementierung.
    console.info("Thread payload", {
      targetPlatforms,
      appendNumbering,
      scheduledAt,
      segments: previewSegments.map((segment) => segment.formatted),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="rounded-3xl border border-border bg-background-elevated p-6 shadow-soft">
            <header className="space-y-3">
              <div>
                <h3 className="text-lg font-semibold">Thread-Inhalt</h3>
                <p className="text-sm text-foreground-muted">
                  Schreibe den gesamten Thread in einem Feld. Du kannst `---` oder STRG+Enter nutzen, um Skeets abzusetzen. Längere Abschnitte
                  werden automatisch passend zerschnitten – wenn möglich am Satzende.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <button
                  type="button"
                  onClick={handleInsertSeparator}
                  className="rounded-full border border-border bg-background-subtle px-3 py-1 text-foreground transition hover:bg-background"
                >
                  Trenner einfügen
                </button>
                <span className="rounded-full bg-background-subtle px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-foreground-muted">
                  Limit: {limitLabel}
                </span>
              </div>
            </header>

            <textarea
              ref={textareaRef}
              value={source}
              onChange={(event) => setSource(event.target.value)}
              onKeyDown={handleKeyDown}
              className="mt-4 h-64 w-full rounded-2xl border border-border bg-background-subtle p-4 font-mono text-sm text-foreground shadow-soft focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="Beispiel:\nIntro zum Thread...\n---\nWeiterer Skeet..."
            />

            <div className="mt-4 space-y-3">
              <fieldset className="space-y-2">
                <legend className="text-sm font-semibold">Zielplattformen</legend>
                <div className="flex flex-wrap gap-3 text-sm">
                  {PLATFORM_OPTIONS.map((option) => {
                    const checked = targetPlatforms.includes(option.id);
                    return (
                      <label key={option.id} className="inline-flex items-center gap-2 rounded-full border border-border bg-background-subtle px-3 py-1 transition hover:bg-background">
                        <input
                          type="checkbox"
                          className="rounded border-border text-primary focus:ring-primary"
                          checked={checked}
                          onChange={() => handleTogglePlatform(option.id)}
                        />
                        <span>
                          {option.label} <span className="text-xs text-foreground-muted">({option.limit})</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <label className="flex items-center gap-3 text-sm font-medium">
                <input
                  type="checkbox"
                  className="rounded border-border text-primary focus:ring-primary"
                  checked={appendNumbering}
                  onChange={(event) => setAppendNumbering(event.target.checked)}
                />
                Automatische Nummerierung (`&gt;1/x`) anhängen
              </label>

              <label className="block text-sm font-medium">
                Geplanter Versand
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(event) => setScheduledAt(event.target.value)}
                  className="mt-1 w-full rounded-2xl border border-border bg-background-subtle px-3 py-2 text-sm text-foreground shadow-soft focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <span className="mt-1 block text-xs text-foreground-muted">Standard: morgen um 09:00 Uhr</span>
              </label>
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="flex flex-col rounded-3xl border border-border bg-background-elevated p-6 shadow-soft lg:max-h-[calc(100vh-4rem)] lg:overflow-hidden">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Vorschau</h3>
              <span className="text-xs uppercase tracking-[0.2em] text-foreground-muted">{totalSegments} Skeet{totalSegments !== 1 ? "s" : ""}</span>
            </div>

            <div className="mt-4 flex-1 space-y-4 overflow-y-auto pr-2 scrollbar-preview lg:min-h-0 lg:pr-3">
              {previewSegments.map((segment, index) => {
                const hasIssue = segment.isEmpty || segment.exceedsLimit;
                return (
                  <article
                    key={segment.id}
                    className={`rounded-2xl border ${
                      hasIssue ? "border-destructive bg-destructive/10" : "border-border bg-background-subtle"
                    } p-4 shadow-soft`}
                  >
                    <header className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-foreground">Skeet {index + 1}</span>
                      <span
                        className={`font-medium ${
                          segment.exceedsLimit
                            ? "text-destructive"
                            : segment.characterCount > (limit ? limit * 0.9 : Infinity)
                            ? "text-amber-500"
                            : "text-foreground-muted"
                        }`}
                      >
                        {segment.characterCount}
                        {limit ? ` / ${limit}` : null}
                      </span>
                    </header>
                    <pre className="mt-3 whitespace-pre-wrap break-words rounded-xl bg-background-subtle/70 p-3 text-sm text-foreground">
{segment.formatted || "(leer)"}
                    </pre>
                    {segment.isEmpty ? (
                      <p className="mt-2 text-sm text-destructive">Segment darf nicht leer sein.</p>
                    ) : null}
                    {segment.exceedsLimit ? (
                      <p className="mt-1 text-sm text-destructive">Zeichenlimit überschritten.</p>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </div>
        </aside>
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-foreground-muted">
          STRG+Enter fügt einen Trenner ein. Lange Abschnitte werden automatisch aufgeteilt. Nummerierung kann optional deaktiviert werden.
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-2xl border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:bg-background-subtle"
            onClick={() => {
              setSource("");
              setScheduledAt(getDefaultScheduledAt());
            }}
          >
            Formular zurücksetzen
          </button>
          <button
            type="submit"
            disabled={hasValidationIssues}
            className="rounded-2xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:shadow-soft disabled:cursor-not-allowed disabled:opacity-60"
          >
            Thread speichern (Coming Soon)
          </button>
        </div>
      </footer>
    </form>
  );
}

export default ThreadForm;
