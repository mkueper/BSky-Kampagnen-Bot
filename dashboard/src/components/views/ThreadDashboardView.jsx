import { useMemo } from "react";
import ThreadOverview from "../ThreadOverview";

function formatDateTime(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function ThreadDashboardView({ threads, loading, error, onReload, onEditThread, onDeleteThread }) {
  const stats = useMemo(() => {
    const items = Array.isArray(threads) ? threads : [];
    const total = items.length;
    const scheduled = items.filter((thread) => thread.status === "scheduled").length;
    const published = items.filter((thread) => thread.status === "published").length;
    const drafts = items.filter((thread) => thread.status === "draft").length;

    return [
      { label: "Threads gesamt", value: total },
      { label: "Geplant", value: scheduled },
      { label: "Veröffentlicht", value: published },
      { label: "Entwürfe", value: drafts },
    ];
  }, [threads]);

  const nextScheduled = useMemo(() => {
    const items = Array.isArray(threads) ? threads : [];
    const candidates = items
      .map((thread) => {
        if (!thread?.scheduledAt) return null;
        const date = new Date(thread.scheduledAt);
        if (Number.isNaN(date.getTime())) return null;
        return { thread, date };
      })
      .filter(Boolean)
      .sort((a, b) => a.date - b.date);
    return candidates[0] ?? null;
  }, [threads]);

  return (
    <div className="space-y-8">
      <section className="grid gap-4 lg:grid-cols-4">
        {stats.map(({ label, value }) => (
          <article
            key={label}
            className="rounded-3xl border border-border bg-background-elevated px-5 py-4 shadow-soft"
          >
            <p className="text-xs uppercase tracking-[0.3em] text-foreground-muted">{label}</p>
            <p className="mt-2 text-3xl font-semibold text-foreground lg:text-4xl">{value}</p>
          </article>
        ))}
      </section>

      <section className="rounded-3xl border border-border bg-background-elevated p-6 shadow-soft">
        <h3 className="text-lg font-semibold">Nächster geplanter Thread</h3>
        {nextScheduled ? (
          <div className="mt-4 space-y-2 text-sm text-foreground">
            <p>
              Wird gepostet um <strong>{formatDateTime(nextScheduled.thread.scheduledAt)}</strong>
            </p>
            <p className="text-foreground-muted">
              {(nextScheduled.thread.title || nextScheduled.thread.segments?.[0]?.content || "")
                .toString()
                .trim() || "Kein Titel hinterlegt"}
            </p>
          </div>
        ) : (
          <p className="mt-4 text-sm text-foreground-muted">Kein geplanter Thread vorhanden.</p>
        )}
      </section>

      <section className="rounded-3xl border border-border bg-background-elevated p-6 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">Thread Activity</h3>
            <p className="text-sm text-foreground-muted">
              Alle gespeicherten Threads inklusive Status und Inhalte im Überblick.
            </p>
          </div>
          <div>
            <button
              type="button"
              onClick={() => (typeof onReload === "function" ? onReload() : undefined)}
              disabled={typeof onReload !== "function"}
              className="rounded-2xl border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-background-subtle disabled:cursor-not-allowed disabled:opacity-60"
            >
              Aktualisieren
            </button>
          </div>
        </div>

        <div className="mt-6">
          <ThreadOverview
            threads={threads}
            loading={loading}
            error={error}
            onReload={onReload}
            onEditThread={onEditThread}
            onDeleteThread={onDeleteThread}
          />
        </div>
      </section>
    </div>
  );
}

export default ThreadDashboardView;
