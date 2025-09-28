import { useMemo } from "react";

function formatDate(value) {
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

function MainOverviewView({ threads, plannedSkeets, publishedSkeets }) {
  const threadStats = useMemo(() => {
    const items = Array.isArray(threads) ? threads : [];
    const active = items.filter((thread) => thread.status !== "deleted");
    const planned = active.filter((thread) => thread.status === "scheduled" || thread.status === "draft");
    const published = active.filter((thread) => thread.status === "published");
    return {
      total: active.length,
      planned: planned.length,
      published: published.length,
      next: planned
        .map((thread) => ({ thread, date: new Date(thread.scheduledAt || 0) }))
        .filter(({ date }) => !Number.isNaN(date.getTime()))
        .sort((a, b) => a.date - b.date)[0]?.thread,
    };
  }, [threads]);

  const skeetStats = useMemo(() => {
    const planned = Array.isArray(plannedSkeets) ? plannedSkeets : [];
    const published = Array.isArray(publishedSkeets) ? publishedSkeets : [];
    const nextPlanned = planned
      .map((skeet) => ({ skeet, date: new Date(skeet.scheduledAt || 0) }))
      .filter(({ date }) => !Number.isNaN(date.getTime()))
      .sort((a, b) => a.date - b.date)[0]?.skeet;

    return {
      plannedCount: planned.length,
      publishedCount: published.length,
      likes: published.reduce((sum, item) => sum + (Number(item.likesCount) || 0), 0),
      reposts: published.reduce((sum, item) => sum + (Number(item.repostsCount) || 0), 0),
      next: nextPlanned,
    };
  }, [plannedSkeets, publishedSkeets]);

  const upcomingSkeets = useMemo(() => {
    const planned = Array.isArray(plannedSkeets) ? plannedSkeets : [];
    return planned
      .map((skeet) => ({ skeet, date: new Date(skeet.scheduledAt || 0) }))
      .filter(({ date }) => !Number.isNaN(date.getTime()))
      .sort((a, b) => a.date - b.date)
      .slice(0, 3)
      .map(({ skeet }) => skeet);
  }, [plannedSkeets]);

  const upcomingThreads = useMemo(() => {
    const items = Array.isArray(threads) ? threads : [];
    return items
      .filter((thread) => thread.status === "scheduled")
      .map((thread) => ({ thread, date: new Date(thread.scheduledAt || 0) }))
      .filter(({ date }) => !Number.isNaN(date.getTime()))
      .sort((a, b) => a.date - b.date)
      .slice(0, 3)
      .map(({ thread }) => thread);
  }, [threads]);

  return (
    <div className="space-y-8">
      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-3xl border border-border bg-background-elevated px-5 py-4 shadow-soft">
          <p className="text-xs uppercase tracking-[0.3em] text-foreground-muted">Geplante Skeets</p>
          <p className="mt-2 text-3xl font-semibold text-foreground lg:text-4xl">{skeetStats.plannedCount}</p>
        </article>
        <article className="rounded-3xl border border-border bg-background-elevated px-5 py-4 shadow-soft">
          <p className="text-xs uppercase tracking-[0.3em] text-foreground-muted">Veröffentlichte Skeets</p>
          <p className="mt-2 text-3xl font-semibold text-foreground lg:text-4xl">{skeetStats.publishedCount}</p>
        </article>
        <article className="rounded-3xl border border-border bg-background-elevated px-5 py-4 shadow-soft">
          <p className="text-xs uppercase tracking-[0.3em] text-foreground-muted">Geplante Threads</p>
          <p className="mt-2 text-3xl font-semibold text-foreground lg:text-4xl">{threadStats.planned}</p>
        </article>
        <article className="rounded-3xl border border-border bg-background-elevated px-5 py-4 shadow-soft">
          <p className="text-xs uppercase tracking-[0.3em] text-foreground-muted">Veröffentlichte Threads</p>
          <p className="mt-2 text-3xl font-semibold text-foreground lg:text-4xl">{threadStats.published}</p>
        </article>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded-3xl border border-border bg-background-elevated p-6 shadow-soft">
          <h3 className="text-lg font-semibold">Nächster Skeet</h3>
          {skeetStats.next ? (
            <div className="mt-3 space-y-2 text-sm">
              <p className="font-medium text-foreground">{formatDate(skeetStats.next.scheduledAt)}</p>
              <p className="text-foreground-muted">
                {(skeetStats.next.content || "").toString().trim() || "Kein Inhalt vorhanden"}
              </p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-foreground-muted">Kein geplanter Skeet.</p>
          )}
        </article>

        <article className="rounded-3xl border border-border bg-background-elevated p-6 shadow-soft">
          <h3 className="text-lg font-semibold">Nächster Thread</h3>
          {threadStats.next ? (
            <div className="mt-3 space-y-2 text-sm">
              <p className="font-medium text-foreground">{formatDate(threadStats.next.scheduledAt)}</p>
              <p className="text-foreground-muted">
                {(threadStats.next.title || threadStats.next.segments?.[0]?.content || "")
                  .toString()
                  .trim() || "Kein Titel hinterlegt"}
              </p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-foreground-muted">Kein geplanter Thread.</p>
          )}
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-3xl border border-border bg-background-elevated p-6 shadow-soft">
          <h3 className="text-lg font-semibold">Bevorstehende Skeets</h3>
          {upcomingSkeets.length ? (
            <ul className="mt-3 space-y-3 text-sm">
              {upcomingSkeets.map((skeet) => (
                <li key={skeet.id} className="rounded-2xl border border-border bg-background-subtle p-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-foreground-muted">{formatDate(skeet.scheduledAt)}</p>
                  <p className="mt-1 text-foreground">{skeet.content?.toString().trim() || "(kein Inhalt)"}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-foreground-muted">Keine anstehenden Skeets.</p>
          )}
        </article>

        <article className="rounded-3xl border border-border bg-background-elevated p-6 shadow-soft">
          <h3 className="text-lg font-semibold">Bevorstehende Threads</h3>
          {upcomingThreads.length ? (
            <ul className="mt-3 space-y-3 text-sm">
              {upcomingThreads.map((thread) => (
                <li key={thread.id} className="rounded-2xl border border-border bg-background-subtle p-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-foreground-muted">{formatDate(thread.scheduledAt)}</p>
                  <p className="mt-1 text-foreground">
                    {(thread.title || thread.segments?.[0]?.content || "").toString().trim() || "(kein Titel)"}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-foreground-muted">Keine anstehenden Threads.</p>
          )}
        </article>
      </section>
    </div>
  );
}

export default MainOverviewView;
