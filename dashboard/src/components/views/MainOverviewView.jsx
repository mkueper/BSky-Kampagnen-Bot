import { useMemo } from "react";
import Card from "../ui/Card";

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

  // Aktivitätsseite: nur Kennzahlen – Detailübersichten liegen in den Bereichen
  // "Skeets" und "Threads" und werden nicht mehr in der Aktivität dupliziert.

  return (
    <div className="space-y-8">
      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card padding="px-5 py-4">
          <p className="text-xs uppercase tracking-[0.3em] text-foreground-muted">Geplante Skeets</p>
          <p className="mt-2 text-3xl font-semibold text-foreground lg:text-4xl">{skeetStats.plannedCount}</p>
        </Card>
        <Card padding="px-5 py-4">
          <p className="text-xs uppercase tracking-[0.3em] text-foreground-muted">Veröffentlichte Skeets</p>
          <p className="mt-2 text-3xl font-semibold text-foreground lg:text-4xl">{skeetStats.publishedCount}</p>
        </Card>
        <Card padding="px-5 py-4">
          <p className="text-xs uppercase tracking-[0.3em] text-foreground-muted">Geplante Threads</p>
          <p className="mt-2 text-3xl font-semibold text-foreground lg:text-4xl">{threadStats.planned}</p>
        </Card>
        <Card padding="px-5 py-4">
          <p className="text-xs uppercase tracking-[0.3em] text-foreground-muted">Veröffentlichte Threads</p>
          <p className="mt-2 text-3xl font-semibold text-foreground lg:text-4xl">{threadStats.published}</p>
        </Card>
      </section>

      {null}
    </div>
  );
}

export default MainOverviewView;
