import { useMemo } from "react";
import { Card } from "@bsky-kampagnen-bot/shared-ui";
import { useTranslation } from "../../i18n/I18nProvider.jsx";
import NextScheduledCard from "../ui/NextScheduledCard.jsx";
import { useTheme } from "../ui/ThemeContext.jsx";

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

function MainOverviewView({
  threads,
  plannedSkeets,
  publishedSkeets,
  pendingCount = 0,
  onOpenSkeetsOverview,
  onOpenPendingSkeets,
  onOpenThreadsOverview
}) {
  const { t } = useTranslation();
  const theme = useTheme();
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
    <div className="space-y-4">
      <section className={`rounded-3xl border border-border ${theme.panelBg} shadow-soft p-4`}>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-2xl border border-border-muted bg-background-subtle/60 pl-4 pr-4 flex items-center justify-between">
              <span>{t('overview.cards.plannedPosts', 'Geplante Posts')}</span>
              <span className="font-semibold text-right">{skeetStats.plannedCount}</span>
            </div>
            <div className="rounded-2xl border border-border-muted bg-background-subtle/60 pl-4 pr-4 flex items-center justify-between">
              <span>{t('overview.cards.publishedPosts', 'Veröffentlichte Posts')}</span>
              <span className="font-semibold text-right">{skeetStats.publishedCount}</span>
            </div>
            <div className="rounded-2xl border border-border-muted bg-background-subtle/60 pl-4 pr-4 flex items-center justify-between">
              <span>{t('overview.cards.pendingPosts', 'Freizugebende Posts')}</span>
              <span className="font-semibold text-right">{pendingCount}</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-2xl border border-border-muted bg-background-subtle/60 pl-4 pr-4 flex items-center justify-between">
              <span>{t('overview.cards.plannedThreads', 'Geplante Threads')}</span>
              <span className="font-semibold text-right">{threadStats.planned}</span>
            </div>
            <div className="rounded-2xl border border-border-muted bg-background-subtle/60 pl-4 pr-4 flex items-center justify-between">
              <span>{t('overview.cards.publishedThreads', 'Veröffentlichte Threads')}</span>
              <span className="font-semibold text-right">{threadStats.published}</span>
            </div>
            <div className="flex items-center justify-between ">
              <span className="rounded-2xl border border-border-muted bg-background-subtle/60 pl-4 pr-4 text-foreground-subtle">{t('overview.cards.pendingThreadsLabel', 'Freizugebende Threads')}</span>
              <span className="font-semibold text-foreground-subtle text-right">—</span>
            </div>
          </div>
        </div>
      </section>

      <section className={`rounded-3xl border border-border ${theme.panelBg} shadow-soft p-4`}>
        <div className="grid gap-4 md:grid-cols-2">
          <NextScheduledCard
            title={t('overview.next.postTitle', 'Nächster Post')}
            scheduledAt={skeetStats.next?.scheduledAt}
            content={skeetStats.next?.content}
            emptyLabel={t('overview.next.noPost', 'Kein geplanter Post.')}
            noContentLabel={t('overview.next.noPostContent', 'Kein Inhalt vorhanden')}
            onActivate={
              typeof onOpenSkeetsOverview === 'function'
                ? () => onOpenSkeetsOverview()
                : undefined
            }
            ariaLabel={t('overview.aria.toPostsOverview', 'Zur Posts-Übersicht wechseln')}
          />
          <NextScheduledCard
            title={t('overview.next.threadTitle', 'Nächster Thread')}
            scheduledAt={threadStats.next?.scheduledAt}
            content={
              threadStats.next?.title ||
              threadStats.next?.segments?.[0]?.content
            }
            emptyLabel={t('overview.next.noThread', 'Kein geplanter Thread.')}
            noContentLabel={t('overview.next.noThreadTitle', 'Kein Titel hinterlegt')}
            onActivate={
              typeof onOpenThreadsOverview === 'function'
                ? () => onOpenThreadsOverview()
                : undefined
            }
            ariaLabel={t('overview.aria.toThreadsOverview', 'Zur Thread Übersicht wechseln')}
          />
        </div>
      </section>

      <section className={`rounded-3xl border border-border ${theme.panelBg} shadow-soft p-4`}>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card
            padding="p-6"
            className="border-border-muted bg-background-subtle/60"
          >
            <h3 className="text-lg font-semibold">
              {t('overview.upcoming.postsTitle', 'Bevorstehende Posts')}
            </h3>
            {upcomingSkeets.length ? (
              <ul className="mt-4 space-y-3 text-sm">
                {upcomingSkeets.map((skeet) => (
                  <li
                    key={skeet.id}
                    className="rounded-2xl border border-border bg-background-subtle p-4"
                  >
                    <p className="text-xs uppercase tracking-[0.2em] text-foreground-muted">
                      {formatDate(skeet.scheduledAt)}
                    </p>
                    <p className="mt-1 text-foreground">
                      {skeet.content?.toString().trim() ||
                        t(
                          'overview.upcoming.noPostContent',
                          '(kein Inhalt)'
                        )}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-foreground-muted">
                {t('overview.upcoming.noPosts', 'Keine anstehenden Posts.')}
              </p>
            )}
          </Card>

          <Card
            padding="p-6"
            className="border-border-muted bg-background-subtle/60"
          >
            <h3 className="text-lg font-semibold">
              {t('overview.upcoming.threadsTitle', 'Bevorstehende Threads')}
            </h3>
            {upcomingThreads.length ? (
              <ul className="mt-4 space-y-3 text-sm">
                {upcomingThreads.map((thread) => (
                  <li
                    key={thread.id}
                    className="rounded-2xl border border-border bg-background-subtle p-4"
                  >
                    <p className="text-xs uppercase tracking-[0.2em] text-foreground-muted">
                      {formatDate(thread.scheduledAt)}
                    </p>
                    <p className="mt-1 text-foreground">
                      {(thread.title || thread.segments?.[0]?.content || '')
                        .toString()
                        .trim() ||
                        t(
                          'overview.upcoming.noThreadTitle',
                          '(kein Titel)'
                        )}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-foreground-muted">
                {t(
                  'overview.upcoming.noThreads',
                  'Keine anstehenden Threads.'
                )}
              </p>
            )}
          </Card>
        </div>
      </section>
    </div>
  );
}

export default MainOverviewView;
