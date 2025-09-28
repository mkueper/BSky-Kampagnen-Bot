import { useMemo, useState } from "react";
import * as Tabs from "@radix-ui/react-tabs";
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

function ThreadDashboardView({
  threads,
  loading,
  error,
  onReload,
  onEditThread,
  onDeleteThread,
  onRestoreThread,
  onDestroyThread,
}) {
  const [activeTab, setActiveTab] = useState("planned");
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

  const plannedThreads = useMemo(() => {
    const items = Array.isArray(threads) ? threads : [];
    return items.filter((thread) => thread.status === "scheduled" || thread.status === "draft");
  }, [threads]);

  const publishedThreads = useMemo(() => {
    const items = Array.isArray(threads) ? threads : [];
    return items.filter((thread) => thread.status === "published");
  }, [threads]);

  const trashedThreads = useMemo(() => {
    const items = Array.isArray(threads) ? threads : [];
    return items.filter((thread) => thread.status === "deleted");
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
        </div>

        <div className="mt-6">
          <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <Tabs.List className="inline-flex rounded-full bg-background-subtle p-1 text-sm font-medium">
              <Tabs.Trigger
                value="planned"
                className={`rounded-full px-4 py-2 transition ${
                  activeTab === "planned" ? "bg-background-elevated shadow-soft" : "text-foreground-muted hover:text-foreground"
                }`}
              >
                Geplant
              </Tabs.Trigger>
              <Tabs.Trigger
                value="published"
                className={`rounded-full px-4 py-2 transition ${
                  activeTab === "published" ? "bg-background-elevated shadow-soft" : "text-foreground-muted hover:text-foreground"
                }`}
              >
                Veröffentlicht
              </Tabs.Trigger>
              <Tabs.Trigger
                value="deleted"
                className={`rounded-full px-4 py-2 transition ${
                  activeTab === "deleted" ? "bg-background-elevated shadow-soft" : "text-foreground-muted hover:text-foreground"
                }`}
              >
                Papierkorb
              </Tabs.Trigger>
            </Tabs.List>

            <Tabs.Content value="planned">
              <ThreadOverview
                threads={plannedThreads}
                loading={loading}
                error={error}
                onReload={onReload}
                onEditThread={onEditThread}
                onDeleteThread={onDeleteThread}
                mode="default"
              />
            </Tabs.Content>

            <Tabs.Content value="published">
              <ThreadOverview
                threads={publishedThreads}
                loading={loading}
                error={error}
                onReload={onReload}
                onEditThread={onEditThread}
                onDeleteThread={onDeleteThread}
                mode="default"
              />
            </Tabs.Content>

            <Tabs.Content value="deleted">
              {trashedThreads.length > 0 ? (
                <ThreadOverview
                  threads={trashedThreads}
                  loading={loading}
                  error={error}
                  onReload={onReload}
                  onRestoreThread={onRestoreThread}
                  onDestroyThread={onDestroyThread}
                  mode="deleted"
                />
              ) : (
                <p className="rounded-3xl border border-border bg-background-subtle px-4 py-6 text-sm text-foreground-muted">
                  Der Papierkorb ist leer.
                </p>
              )}
            </Tabs.Content>
          </Tabs.Root>
        </div>
      </section>
    </div>
  );
}

export default ThreadDashboardView;
