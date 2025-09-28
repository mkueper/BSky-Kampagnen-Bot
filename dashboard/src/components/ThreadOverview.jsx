function formatScheduledLabel(thread) {
  if (!thread?.scheduledAt) {
    return thread?.status === "published" ? "Bereits veröffentlicht" : "Kein Termin geplant";
  }

  const date = new Date(thread.scheduledAt);
  if (Number.isNaN(date.getTime())) {
    return `Geplant für ${thread.scheduledAt}`;
  }

  const formatter = new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  if (thread.status === "scheduled") {
    return `Wird gepostet um: ${formatter.format(date)}`;
  }

  return `${thread.status === "published" ? "Veröffentlicht am" : "Geplant für"}: ${formatter.format(date)}`;
}

function ThreadOverview({ threads, loading, error, onReload, onEditThread, onDeleteThread }) {
  if (loading) {
    return (
      <section className="rounded-3xl border border-border bg-background-elevated p-6 shadow-soft">
        <p className="text-sm text-foreground-muted">Threads werden geladen…</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-3xl border border-destructive/50 bg-destructive/10 p-6 shadow-soft">
        <header className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-destructive">Threads konnten nicht geladen werden</h3>
          <button
            type="button"
            className="text-sm underline disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => (typeof onReload === "function" ? onReload() : undefined)}
            disabled={typeof onReload !== "function"}
          >
            Erneut versuchen
          </button>
        </header>
        <p className="text-sm text-destructive">
          {error?.message || "Unbekannter Fehler"}
        </p>
      </section>
    );
  }

  if (!threads || threads.length === 0) {
    return (
      <section className="rounded-3xl border border-border bg-background-elevated p-6 text-center shadow-soft">
        <h3 className="text-lg font-semibold">Noch keine Threads gespeichert</h3>
        <p className="mt-2 text-sm text-foreground-muted">
          Lege im Thread-Editor einen Thread an, um hier eine Vorschau zu sehen.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      {threads.map((thread) => (
        <article key={thread.id} className="rounded-3xl border border-border bg-background-elevated p-6 shadow-soft">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                {thread.title || `Thread #${thread.id}`}
              </h3>
              <p className="text-sm text-foreground-muted">{formatScheduledLabel(thread)}</p>
            </div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-foreground-muted">
              {Array.isArray(thread.targetPlatforms) && thread.targetPlatforms.length
                ? thread.targetPlatforms.join(" · ")
                : "Keine Plattformen"}
            </div>
          </header>

          <ul className="mt-4 space-y-2 text-sm">
            {thread.segments.map((segment) => (
              <li key={segment.id ?? segment.sequence} className="rounded-2xl border border-border bg-background-subtle p-3">
                <header className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-foreground-muted">
                  <span>Skeet {segment.sequence + 1}</span>
                  <span>{segment.characterCount} Zeichen</span>
                </header>
                <p className="whitespace-pre-wrap text-foreground">{segment.content}</p>
              </li>
            ))}
          </ul>

          <footer className="mt-4 flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => onEditThread?.(thread)}
              className="rounded-2xl border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:bg-background-subtle"
            >
              Bearbeiten
            </button>
            <button
              type="button"
              onClick={() => onDeleteThread?.(thread)}
              className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive transition hover:bg-destructive/20"
            >
              Löschen
            </button>
          </footer>
        </article>
      ))}
    </section>
  );
}

export default ThreadOverview;
