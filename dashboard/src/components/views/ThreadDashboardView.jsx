import { useMemo, useState } from "react";
import { useToast } from "../../hooks/useToast";
import * as Tabs from "@radix-ui/react-tabs";
import { ArrowDownIcon, ArrowUpIcon, ReloadIcon } from "@radix-ui/react-icons";
import Button from "../ui/Button";
import ThreadOverview from "../ThreadOverview";
import { useVisibleIds } from "../../hooks/useVisibleIds";
import FloatingToolbar from "../ui/FloatingToolbar";

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
  onRetractThread,
}) {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState("planned");
  const [bulkRefreshing, setBulkRefreshing] = useState(false);
  const [bulkIncludeReplies, setBulkIncludeReplies] = useState(false);
  const { getRefForId, visibleIds } = useVisibleIds();
  const stats = useMemo(() => {
    const items = Array.isArray(threads) ? threads : [];
    const active = items.filter((thread) => thread.status !== "deleted");
    const total = active.length;
    const scheduled = active.filter((thread) => thread.status === "scheduled").length;
    const published = active.filter((thread) => thread.status === "published").length;
    const drafts = active.filter((thread) => thread.status === "draft").length;

    return [
      { label: "Threads gesamt", value: total },
      { label: "Geplant", value: scheduled },
      { label: "Veröffentlicht", value: published },
      { label: "Entwürfe", value: drafts },
    ];
  }, [threads]);

  const plannedThreads = useMemo(() => {
    const items = Array.isArray(threads) ? threads : [];
    return items.filter((thread) => thread.status !== "deleted" && (thread.status === "scheduled" || thread.status === "draft"));
  }, [threads]);

  const [publishedSortOrder, setPublishedSortOrder] = useState("desc");
  const publishedThreads = useMemo(() => {
    const items = (Array.isArray(threads) ? threads : []).filter((t) => t.status === "published");
    const resolvePublishedTime = (thread) => {
      const meta = thread?.metadata || {};
      // Bevorzugt lastSuccessAt, sonst lastDispatchAt, dann erstes Segment.postedAt, fallback updatedAt
      const candidates = [meta.lastSuccessAt, meta.lastDispatchAt, thread?.segments?.[0]?.postedAt, thread?.updatedAt];
      for (const value of candidates) {
        if (!value) continue;
        const d = new Date(value);
        if (!Number.isNaN(d.getTime())) return d.getTime();
      }
      return 0;
    };
    items.sort((a, b) => {
      const ta = resolvePublishedTime(a);
      const tb = resolvePublishedTime(b);
      return publishedSortOrder === "asc" ? ta - tb : tb - ta;
    });
    return items;
  }, [threads, publishedSortOrder]);

  const trashedThreads = useMemo(() => {
    const items = Array.isArray(threads) ? threads : [];
    return items.filter((thread) => thread.status === "deleted");
  }, [threads]);

  const nextScheduled = useMemo(() => {
    const items = Array.isArray(threads) ? threads : [];
    const now = new Date();
    const candidates = items
      .filter((thread) => thread.status === "scheduled" && thread.scheduledAt)
      .map((thread) => {
        const date = new Date(thread.scheduledAt);
        if (Number.isNaN(date.getTime()) || date < now) return null;
        return { thread, date };
      })
      .filter(Boolean)
      .sort((a, b) => a.date - b.date);
    return candidates[0] ?? null;
  }, [threads]);

  const overviewStats = stats;
  const nextThreadFormatted = nextScheduled ? formatDateTime(nextScheduled.thread.scheduledAt) : null;
  const [nextThreadDate, nextThreadTimeRaw] = nextThreadFormatted
    ? nextThreadFormatted.split(",").map((part) => part.trim())
    : ["-", ""];
  const nextThreadTime = nextThreadTimeRaw ? `${nextThreadTimeRaw} Uhr` : "";

  const nextThreadHelper = nextScheduled ? (
    <div className="space-y-3">
      {nextThreadTime ? (
        <span className="text-sm font-medium text-foreground">{nextThreadTime}</span>
      ) : null}
      <div className="rounded-2xl border border-border-muted bg-background-subtle/70 px-4 py-3 text-foreground">
        {(nextScheduled.thread.segments?.[0]?.content || "")
          .toString()
          .trim() || "Kein Inhalt hinterlegt"}
      </div>
    </div>
  ) : (
    "Noch nichts geplant"
  );

  return (
    <div className="space-y-8">
      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-3xl border border-border bg-background-elevated shadow-soft md:col-span-2">
          <div className="flex flex-col gap-4 p-6">
            <div>
              <h3 className="text-lg font-semibold">Thread-Überblick</h3>
              <p className="text-sm text-foreground-muted">Status deiner geplanten und veröffentlichten Threads.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {overviewStats.map(({ label, value }) => (
                <div key={label} className="rounded-2xl border border-border-muted bg-background-subtle/60 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.3em] text-foreground-muted">{label}</p>
                  <p className="mt-2 text-3xl font-semibold text-foreground md:text-4xl">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </article>
        <SummaryCard title="Nächster Thread" value={nextThreadDate} helper={nextThreadHelper} />
      </section>

      <section className="rounded-3xl border border-border bg-background-elevated shadow-soft">
        <div className="flex flex-col gap-4 border-b border-border-muted px-6 py-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-semibold">Thread Activity</h3>
            <p className="text-sm text-foreground-muted">Verwalte geplante und veröffentlichte Threads.</p>
          </div>
          <div className="flex flex-col gap-3 text-sm font-medium md:flex-row md:items-center md:gap-3">
            <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="inline-flex rounded-full bg-background-subtle p-1">
              <Tabs.List className="flex" role="tablist" aria-orientation="horizontal">
                {[
                  { value: "planned", label: "Geplant" },
                  { value: "published", label: "Veröffentlicht" },
                  { value: "deleted", label: "Papierkorb" },
                ].map(({ value, label }) => (
                  <Tabs.Trigger
                    key={value}
                    value={value}
                    className={`rounded-full px-4 py-2 transition ${
                      activeTab === value ? "bg-background-elevated shadow-soft" : "text-foreground-muted hover:text-foreground"
                    }`}
                  >
                    {label}
                  </Tabs.Trigger>
                ))}
              </Tabs.List>
            </Tabs.Root>
            {activeTab === "published" ? (
              <div className="self-start flex items-center gap-2 rounded-full border border-border bg-background-subtle px-2 py-1 text-xs font-medium text-foreground-muted">
                <span className="sr-only">Sortierung veröffentlichter Threads</span>
                <div className="flex items-center gap-1">
                  <Button
                    variant={publishedSortOrder === "desc" ? "secondary" : "ghost"}
                    size="icon"
                    onClick={() => setPublishedSortOrder("desc")}
                    aria-pressed={publishedSortOrder === "desc"}
                    title="Neu zuerst"
                  >
                    <ArrowDownIcon className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={publishedSortOrder === "asc" ? "secondary" : "ghost"}
                    size="icon"
                    onClick={() => setPublishedSortOrder("asc")}
                    aria-pressed={publishedSortOrder === "asc"}
                    title="Alt zuerst"
                  >
                    <ArrowUpIcon className="h-4 w-4" />
                  </Button>
                </div>
                <span role="separator" aria-orientation="vertical" className="mx-1 h-5 w-px bg-border" />
                <div className="flex items-center gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-2 text-foreground-muted">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 rounded border-border"
                      checked={bulkIncludeReplies}
                      onChange={(e) => setBulkIncludeReplies(Boolean(e.target.checked))}
                    />
                    <span className="text-xs">Replies</span>
                  </label>
                  <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Alle sichtbaren aktualisieren"
                  title="Alle sichtbaren aktualisieren"
                  onClick={async () => {
                    setBulkRefreshing(true);
                    try {
                      const ids = threads
                        .filter((t) => t.status === 'published')
                        .map((t) => t.id)
                        .filter((id) => visibleIds.includes(id));
                      if (!ids.length) {
                        toast.info({ title: 'Keine sichtbaren Einträge', description: 'Scrolle die Liste, um Einträge sichtbar zu machen.' });
                      } else {
                        const res = await fetch('/api/engagement/refresh-many', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ entity: 'thread', ids, includeReplies: Boolean(bulkIncludeReplies) }),
                        });
                        if (!res.ok) {
                          const data = await res.json().catch(() => ({}));
                          throw new Error(data.error || 'Fehler beim Aktualisieren der sichtbaren Threads.');
                        }
                        const data = await res.json().catch(() => null);
                        const total = data?.total ?? ids.length;
                        const okCount = Array.isArray(data?.results) ? data.results.filter((r) => r.ok).length : 0;
                        const failCount = Math.max(0, total - okCount);
                        toast.success({ title: 'Sichtbare aktualisiert', description: `Threads: ${okCount} aktualisiert${failCount ? ` · ${failCount} fehlgeschlagen` : ''}` });
                        if (typeof onReload === 'function') onReload({ force: true });
                      }
                    } catch (error) {
                      console.error('Bulk-Refresh (sichtbar) fehlgeschlagen:', error);
                      toast.error({ title: 'Aktualisierung fehlgeschlagen', description: error?.message || 'Fehler beim Aktualisieren.' });
                    } finally {
                      setBulkRefreshing(false);
                    }
                  }}
                  disabled={bulkRefreshing || !threads.some((t) => t.status === 'published' && visibleIds.includes(t.id))}
                >
                    <ReloadIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : null}
            {/* Entfernt: alter "Alle aktualisieren"-Button für Threads */}
          </div>
        </div>

        <div className="px-6 pb-6">
          {activeTab === "planned" ? (
            <ThreadOverview
              threads={plannedThreads}
              loading={loading}
              error={error}
              onReload={onReload}
              onEditThread={onEditThread}
              onDeleteThread={onDeleteThread}
              onRetractThread={onRetractThread}
              mode="default"
              getItemRef={getRefForId}
            />
          ) : activeTab === "published" ? (
            <ThreadOverview
              threads={publishedThreads}
              loading={loading}
              error={error}
              onReload={onReload}
              onEditThread={onEditThread}
              onDeleteThread={onDeleteThread}
              onRetractThread={onRetractThread}
              mode="default"
              getItemRef={getRefForId}
            />
          ) : trashedThreads.length > 0 ? (
            <ThreadOverview
              threads={trashedThreads}
              loading={loading}
              error={error}
              onReload={onReload}
              onRestoreThread={onRestoreThread}
              onDestroyThread={onDestroyThread}
              mode="deleted"
              getItemRef={getRefForId}
            />
          ) : (
            <p className="rounded-3xl border border-border bg-background-subtle px-4 py-6 text-sm text-foreground-muted">
              Der Papierkorb ist leer.
            </p>
          )}
        </div>
      </section>

      {activeTab === 'published' ? (
        <FloatingToolbar ariaLabel="Thread-Aktionen" variant="primary">
          <Button
            variant="ghost"
            size="icon"
            className={`text-inherit ${publishedSortOrder === 'desc' ? 'bg-primary-foreground/20' : ''} hover:bg-primary-foreground/15`}
            onClick={() => setPublishedSortOrder('desc')}
            aria-pressed={publishedSortOrder === 'desc'}
            aria-label="Neu zuerst sortieren"
            title="Neu zuerst"
          >
            <ArrowDownIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={`text-inherit ${publishedSortOrder === 'asc' ? 'bg-primary-foreground/20' : ''} hover:bg-primary-foreground/15`}
            onClick={() => setPublishedSortOrder('asc')}
            aria-pressed={publishedSortOrder === 'asc'}
            aria-label="Alt zuerst sortieren"
            title="Alt zuerst"
          >
            <ArrowUpIcon className="h-4 w-4" />
          </Button>
          <span role="separator" aria-orientation="vertical" className="mx-1 h-5 w-px bg-border" />
          <Button
            variant="ghost"
            size="icon"
            className="text-inherit hover:bg-primary-foreground/15"
            aria-label="Alle sichtbaren aktualisieren"
            title="Alle sichtbaren aktualisieren"
            onClick={async () => {
              setBulkRefreshing(true);
              try {
                const ids = threads
                  .filter((t) => t.status === 'published')
                  .map((t) => t.id)
                  .filter((id) => visibleIds.includes(id));
                if (!ids.length) {
                  toast.info({ title: 'Keine sichtbaren Einträge', description: 'Scrolle die Liste, um Einträge sichtbar zu machen.' });
                } else {
                  const res = await fetch('/api/engagement/refresh-many', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ entity: 'thread', ids, includeReplies: Boolean(bulkIncludeReplies) }),
                  });
                  if (!res.ok) {
                    const data = await res.json().catch(() => ({}));
                    throw new Error(data.error || 'Fehler beim Aktualisieren der sichtbaren Threads.');
                  }
                  const data = await res.json().catch(() => null);
                  const total = data?.total ?? ids.length;
                  const okCount = Array.isArray(data?.results) ? data.results.filter((r) => r.ok).length : 0;
                  const failCount = Math.max(0, total - okCount);
                  toast.success({ title: 'Sichtbare aktualisiert', description: `Threads: ${okCount} aktualisiert${failCount ? ` · ${failCount} fehlgeschlagen` : ''}` });
                  if (typeof onReload === 'function') onReload({ force: true });
                }
              } catch (error) {
                console.error('Bulk-Refresh (sichtbar) fehlgeschlagen:', error);
                toast.error({ title: 'Aktualisierung fehlgeschlagen', description: error?.message || 'Fehler beim Aktualisieren.' });
              } finally {
                setBulkRefreshing(false);
              }
            }}
            disabled={bulkRefreshing || !threads.some((t) => t.status === 'published' && visibleIds.includes(t.id))}
          >
            <ReloadIcon className="h-4 w-4" />
          </Button>
        </FloatingToolbar>
      ) : null}
    </div>
  );
}

export default ThreadDashboardView;

function SummaryCard({ title, value, helper }) {
  return (
    <article className="rounded-3xl border border-border bg-background-elevated shadow-soft">
      <div className="flex h-full flex-col gap-4 p-6">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-foreground-muted">{title}</p>
          <p className="mt-2 text-3xl font-semibold text-foreground md:text-4xl">{value}</p>
        </div>
        <div className="text-sm text-foreground-muted">{helper}</div>
      </div>
    </article>
  );
}
