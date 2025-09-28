import { useEffect, useMemo, useState } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import PlannedSkeetList from "../PlannedSkeetList";
import PublishedSkeetList from "../PublishedSkeetList";
import DeletedSkeetList from "../DeletedSkeetList";
import ThreadOverview from "../ThreadOverview";

/**
 * Zusammenstellung aller Dashboard-Kacheln und Listen.
 *
 * App.jsx liefert lediglich die Daten und Aktionen – das Dashboard kümmert sich
 * um Darstellung, Sortierung und kleine Interaktionen (Tabwechsel, Sortierung
 * der veröffentlichten Skeets).
 */
function DashboardView({
  plannedSkeets,
  publishedSkeets,
  deletedSkeets,
  onEditSkeet,
  onDeleteSkeet,
  onRestoreSkeet,
  onPermanentDeleteSkeet,
  onFetchReactions,
  onShowSkeetContent,
  onShowRepliesContent,
  activeCardTabs,
  repliesBySkeet,
  replyErrors,
  loadingReplies,
  loadingReactions,
  reactionStats,
  formatTime,
  getRepeatDescription,
  platformLabels,
  activeTab,
  onTabChange,
  threads,
  threadsLoading,
  threadsError,
  onReloadThreads,
  onEditThread,
  onDeleteThread,
}) {
  const [publishedSortOrder, setPublishedSortOrder] = useState("desc");

  useEffect(() => {
    if (activeTab !== "published") {
      setPublishedSortOrder("desc");
    }
  }, [activeTab]);

  const upcomingSkeet = useMemo(() => {
    const entries = plannedSkeets
      .map((skeet) => {
        if (!skeet.scheduledAt) return null;
        const date = new Date(skeet.scheduledAt);
        return Number.isNaN(date.getTime()) ? null : { ...skeet, scheduledDate: date };
      })
      .filter(Boolean)
      .sort((a, b) => a.scheduledDate - b.scheduledDate);
    return entries[0] ?? null;
  }, [plannedSkeets]);

  const upcomingDate = upcomingSkeet ? formatTime(upcomingSkeet.scheduledAt || upcomingSkeet.scheduledDate, "dateOnly") : "-";
  const upcomingTime = upcomingSkeet ? formatTime(upcomingSkeet.scheduledAt || upcomingSkeet.scheduledDate, "timeOnly") : null;
  const upcomingSnippet = useMemo(() => {
    if (!upcomingSkeet) return null;
    const normalized = (upcomingSkeet.content ?? "").replace(/\s+/g, " ").trim();
    if (!normalized) return "Kein Inhalt hinterlegt";
    return normalized.length > 200 ? `${normalized.slice(0, 200)}…` : normalized;
  }, [upcomingSkeet]);

  const aggregatedMetrics = useMemo(() => {
    const likes = publishedSkeets.reduce((acc, skeet) => acc + (Number(skeet.likesCount) || 0), 0);
    const reposts = publishedSkeets.reduce((acc, skeet) => acc + (Number(skeet.repostsCount) || 0), 0);
    return { likes, reposts };
  }, [publishedSkeets]);

  const overviewStats = useMemo(
    () => [
      { label: "Geplante Skeets", value: plannedSkeets.length },
      { label: "Veröffentlichte Skeets", value: publishedSkeets.length },
      { label: "Likes gesamt", value: aggregatedMetrics.likes },
      { label: "Reposts gesamt", value: aggregatedMetrics.reposts },
    ],
    [plannedSkeets.length, publishedSkeets.length, aggregatedMetrics]
  );

  const sortedPublishedSkeets = useMemo(() => {
    const items = [...publishedSkeets];
    const resolveDate = (entry) => {
      const candidates = [entry.postedAt, entry.scheduledAt, entry.createdAt];
      for (const value of candidates) {
        if (!value) continue;
        const parsed = new Date(value);
        if (!Number.isNaN(parsed.getTime())) {
          return parsed.getTime();
        }
      }
      return 0;
    };
    items.sort((a, b) => {
      const dateA = resolveDate(a);
      const dateB = resolveDate(b);
      return publishedSortOrder === "asc" ? dateA - dateB : dateB - dateA;
    });
    return items;
  }, [publishedSkeets, publishedSortOrder]);

  return (
    <div className="space-y-8">
      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-3xl border border-border bg-background-elevated shadow-soft md:col-span-2">
          <div className="flex flex-col gap-4 p-6">
            <div>
              <h3 className="text-lg font-semibold">Kampagnen-Überblick</h3>
              <p className="text-sm text-foreground-muted">Status deiner geplanten und veröffentlichten Skeets.</p>
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
        <SummaryCard
          title="Nächster Termin"
          value={upcomingDate}
          helper={
            upcomingSkeet ? (
              <div className="space-y-3">
                {upcomingTime ? <span className="block font-semibold text-foreground">{`${upcomingTime} Uhr`}</span> : null}
                <div className="rounded-2xl border border-border-muted bg-background-subtle/70 px-4 py-3 text-foreground">{upcomingSnippet}</div>
              </div>
            ) : (
              "Noch nichts geplant"
            )
          }
        />
      </section>

      <ThreadOverview
        threads={threads}
        loading={threadsLoading}
        error={threadsError}
        onReload={onReloadThreads}
        onEditThread={onEditThread}
        onDeleteThread={onDeleteThread}
      />

      <section className="rounded-3xl border border-border bg-background-elevated shadow-soft">
        <div className="flex flex-col gap-4 border-b border-border-muted px-6 py-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-semibold">Campaign Activity</h3>
            <p className="text-sm text-foreground-muted">Verwalte geplante und veröffentlichte Skeets inklusive Replies &amp; Reaktionen.</p>
          </div>
          <div className="flex flex-col gap-3 text-sm font-medium md:flex-row md:items-center md:gap-3">
            <Tabs.Root value={activeTab} onValueChange={onTabChange} className="inline-flex rounded-full bg-background-subtle p-1">
              <Tabs.List className="flex">
                <Tabs.Trigger
                  value="planned"
                  className={`rounded-full px-4 py-2 transition ${activeTab === "planned" ? "bg-background-elevated shadow-soft" : "text-foreground-muted hover:text-foreground"}`}
                >
                  Geplant
                </Tabs.Trigger>
                <Tabs.Trigger
                  value="published"
                  className={`rounded-full px-4 py-2 transition ${activeTab === "published" ? "bg-background-elevated shadow-soft" : "text-foreground-muted hover:text-foreground"}`}
                >
                  Veröffentlicht
                </Tabs.Trigger>
                <Tabs.Trigger
                  value="deleted"
                  className={`rounded-full px-4 py-2 transition ${activeTab === "deleted" ? "bg-background-elevated shadow-soft" : "text-foreground-muted hover:text-foreground"}`}
                >
                  Papierkorb
                </Tabs.Trigger>
              </Tabs.List>
            </Tabs.Root>
            {activeTab === "published" ? (
              <div className="self-start rounded-full border border-border bg-background-subtle px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-foreground-muted">
                <span className="sr-only">Sortierung veröffentlichter Skeets</span>
                <div className="mt-1 flex gap-1 text-[0.75rem] normal-case tracking-normal text-foreground">
                  <button
                    type="button"
                    onClick={() => setPublishedSortOrder("desc")}
                    className={`rounded-full px-3 py-1 transition ${
                      publishedSortOrder === "desc" ? "bg-background shadow-soft" : "text-foreground-muted hover:text-foreground"
                    }`}
                    aria-pressed={publishedSortOrder === "desc"}
                  >
                    Neu zuerst
                  </button>
                  <button
                    type="button"
                    onClick={() => setPublishedSortOrder("asc")}
                    className={`rounded-full px-3 py-1 transition ${
                      publishedSortOrder === "asc" ? "bg-background shadow-soft" : "text-foreground-muted hover:text-foreground"
                    }`}
                    aria-pressed={publishedSortOrder === "asc"}
                  >
                    Alt zuerst
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="px-6 pb-6">
          {activeTab === "planned" ? (
            <PlannedSkeetList
              skeets={plannedSkeets}
              onEdit={onEditSkeet}
              onDelete={onDeleteSkeet}
              getRepeatDescription={getRepeatDescription}
            />
          ) : activeTab === "published" ? (
            <PublishedSkeetList
              skeets={sortedPublishedSkeets}
              activeCardTabs={activeCardTabs}
              repliesBySkeet={repliesBySkeet}
              replyErrors={replyErrors}
              loadingReplies={loadingReplies}
              loadingReactions={loadingReactions}
              onShowSkeetContent={onShowSkeetContent}
              onShowRepliesContent={onShowRepliesContent}
              onFetchReactions={onFetchReactions}
              reactionStats={reactionStats}
              platformLabels={platformLabels}
              formatTime={formatTime}
            />
          ) : (
            <DeletedSkeetList
              skeets={deletedSkeets}
              onRestore={onRestoreSkeet}
              onPermanentDelete={onPermanentDeleteSkeet}
              formatTime={formatTime}
            />
          )}
        </div>
      </section>
    </div>
  );
}

function SummaryCard({ title, value, helper }) {
  return (
    <div className="rounded-3xl border border-border bg-background-elevated shadow-soft">
      <div className="space-y-3 p-5">
        <p className="text-sm font-medium text-foreground-muted">{title}</p>
        <p className="text-3xl font-semibold md:text-4xl">{value}</p>
        {helper ? <div className="space-y-2 text-sm leading-relaxed text-foreground-muted">{helper}</div> : null}
      </div>
    </div>
  );
}

export default DashboardView;
