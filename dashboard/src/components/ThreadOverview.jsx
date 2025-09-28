import { useThreads } from "../hooks/useThreads";

function ThreadOverview() {
  const { threads, loading, error, reload } = useThreads();

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
          <button type="button" className="text-sm underline" onClick={reload}>
            Erneut versuchen
          </button>
        </header>
        <p className="text-sm text-destructive">
          {error?.message || "Unbekannter Fehler"}
        </p>
      </section>
    );
  }

  if (threads.length === 0) {
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
              <p className="text-sm text-foreground-muted">
                {thread.status === "scheduled"
                  ? `Geplant für ${thread.scheduledAt || "unbekannt"}`
                  : thread.status === "published"
                  ? "Bereits veröffentlicht"
                  : "Entwurf"}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-foreground-muted">
              {thread.targetPlatforms.join(" · ")}
            </div>
          </header>

          <ul className="mt-4 space-y-2 text-sm">
            {thread.segments.map((segment) => (
              <li key={segment.id} className="rounded-2xl border border-border bg-background-subtle p-3">
                <header className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-foreground-muted">
                  <span>Skeet {segment.sequence + 1}</span>
                  <span>{segment.characterCount} Zeichen</span>
                </header>
                <p className="whitespace-pre-wrap text-foreground">{segment.content}</p>
              </li>
            ))}
          </ul>
        </article>
      ))}
    </section>
  );
}

export default ThreadOverview;
