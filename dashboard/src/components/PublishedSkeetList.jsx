import React, { useCallback } from "react";
import { Button, Card } from "@bsky-kampagnen-bot/shared-ui";
import PlatformBadges from "./PlatformBadges";
import ContentWithLinkPreview from "./ContentWithLinkPreview";
import { useVirtualList } from "../hooks/useVirtualList";
import { useTranslation } from "../i18n/I18nProvider.jsx";

function PublishedSkeetList({
  skeets,
  activeCardTabs,
  repliesBySkeet,
  replyErrors,
  loadingReplies,
  loadingReactions,
  onShowSkeetContent,
  onShowRepliesContent,
  onFetchReactions,
  onRetract,
  reactionStats,
  platformLabels,
  formatTime,
  getItemRef,
}) {
  const { t } = useTranslation();
  const isEmpty = skeets.length === 0;
  const shouldVirtualize = skeets.length > 25;
  const scrollParentSelector = useCallback(() => {
    if (typeof document === "undefined") return null;
    return document.getElementById("app-scroll-container");
  }, []);
  const { isReady: virtualReady, virtualItems, totalSize, measureRef } = useVirtualList({
    itemCount: skeets.length,
    estimateSize: 420,
    overscan: 8,
    enabled: shouldVirtualize,
    getScrollElement: scrollParentSelector,
  });

  const renderCardBody = useCallback((skeet) => {
    const activeCardTab = activeCardTabs[skeet.id] ?? "skeet";
    const replies = repliesBySkeet[skeet.id] ?? [];
    const isLoadingReplies = Boolean(loadingReplies[skeet.id]);
    const isFetchingReactions = Boolean(loadingReactions[skeet.id]);
    const storedReactions = (() => {
      const source = skeet.platformResults && typeof skeet.platformResults === "object" ? skeet.platformResults : {};
      const entries = {};
      Object.entries(source).forEach(([platformId, entry]) => {
        if (!entry || typeof entry !== "object") return;
        const metrics = entry.metrics;
        if (!metrics || typeof metrics !== "object") return;
        const likes = Number(metrics.likes) || 0;
        const reposts = Number(metrics.reposts) || 0;
        if (Number.isNaN(likes) && Number.isNaN(reposts)) {
          return;
        }
        entries[platformId] = { likes, reposts };
      });
      return entries;
    })();
    const fetchedReactions = reactionStats[skeet.id]?.platforms ?? {};
    const reactions = { ...storedReactions, ...fetchedReactions };
    const reactionErrors = reactionStats[skeet.id]?.errors;
    const replyError = replyErrors[skeet.id];
    const hasSentPlatforms = Object.values(skeet.platformResults || {}).some((entry) => entry && entry.status === 'sent');
    const isDemo = (() => {
      try {
        if (typeof skeet.postUri === 'string' && skeet.postUri.startsWith('demo://')) return true;
        return Object.values(skeet.platformResults || {}).some((entry) => entry && entry.demo === true);
      } catch { return false; }
    })();
    const canRetract = !isDemo && typeof onRetract === 'function' && (skeet.postUri || hasSentPlatforms);
    const canFetchReactions = !isDemo && Boolean(skeet.postUri || hasSentPlatforms);

    return (
      <>
        <div className="flex items-center gap-2 border-b border-border-muted px-5 pt-4">
          <button
            type="button"
            onClick={() => onShowSkeetContent(skeet.id)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              activeCardTab === "skeet"
                ? "bg-background-elevated text-foreground shadow-soft"
                : "text-foreground-muted hover:text-foreground"
            }`}
          >
            {t('posts.lists.published.tabPost', 'Beitrag')}
          </button>
          <button
            type="button"
            onClick={() => onShowRepliesContent(skeet.id)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              activeCardTab === "replies"
                ? "bg-background-elevated text-foreground shadow-soft"
                : "text-foreground-muted hover:text-foreground"
            }`}
          >
            {t('posts.lists.published.tabReplies', 'Antworten')}
          </button>
        </div>

        <div className="space-y-4 px-5 pb-5 pt-4">
          <PlatformBadges skeet={skeet} />

          {activeCardTab === "replies" ? (
            <div className="rounded-2xl border border-border-muted bg-background-subtle/80 p-4">
              {replyError ? (
                <div className="mb-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  {Object.values(replyError).join(", ")}
                </div>
              ) : null}
              {isLoadingReplies ? (
                <p className="text-sm text-foreground-muted">
                  {t(
                    'posts.lists.published.loadingReplies',
                    'Antworten werden geladen…'
                  )}
                </p>
              ) : replies.length > 0 ? (
                <ul className="space-y-3 text-sm">
                  {replies.map((reply, index) => (
                    <li key={`${reply.authorHandle}-${reply.createdAt ?? index}`} className="rounded-2xl border border-border bg-background p-4">
                      <p className="font-medium">{reply.authorHandle}</p>
                      {reply.platform ? (
                        <p className="text-xs uppercase tracking-[0.2em] text-foreground-subtle">
                          {platformLabels[reply.platform] || reply.platform}
                        </p>
                      ) : null}
                      <p className="mt-1 whitespace-pre-line break-words leading-relaxed text-foreground-muted">{reply.content}</p>
                      {reply.createdAt && (
                        <p className="mt-2 text-xs uppercase tracking-[0.2em] text-foreground-subtle">
                          {formatTime(reply.createdAt)}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-foreground-muted">
                  {t(
                    'posts.lists.published.noReplies',
                    'Keine Antworten vorhanden.'
                  )}
                </p>
              )}
            </div>
          ) : (
            <div className="">
              <div className="space-y-4">
                <ContentWithLinkPreview
                  content={skeet.content}
                  mediaCount={Array.isArray(skeet.media) ? skeet.media.length : 0}
                  className="text-base font-medium leading-relaxed text-foreground whitespace-pre-wrap break-words"
                />
                {Array.isArray(skeet.media) && skeet.media.length > 0 ? (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {skeet.media.slice(0, 4).map((m, idx) => (
                      <div key={m.id || idx} className="relative h-24 overflow-hidden rounded-xl border border-border bg-background-subtle">
                        <img src={m.previewUrl || ''} alt={m.altText || `Bild ${idx + 1}`} className="absolute inset-0 h-full w-full object-contain" loading="lazy" />
                      </div>
                    ))}
                  </div>
                ) : null}
                {skeet.targetPlatforms?.length > 0 && (
                  <p className="text-xs uppercase tracking-[0.25em] text-foreground-subtle">
                    {skeet.targetPlatforms.join(" • ")}
                  </p>
                )}
                {skeet.postedAt && (
                  <p className="text-sm text-foreground-muted">
                    {t('posts.lists.published.sentAtPrefix', 'Gesendet am ')}
                    <span className="font-medium text-foreground">
                      {formatTime(skeet.postedAt)}
                    </span>
                  </p>
                )}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-foreground-muted">
                    {t('posts.lists.published.summaryLikes', 'Likes')}:{' '}
                    <span className="font-semibold text-foreground">
                      {skeet.likesCount}
                    </span>{' '}
                    · {t('posts.lists.published.summaryReposts', 'Reposts')}:{' '}
                    <span className="font-semibold text-foreground">
                      {skeet.repostsCount}
                    </span>
                  </p>
                  {(canFetchReactions || canRetract) && (
                    <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
                      {canRetract ? (
                      <Button
                        variant="secondary"
                        onClick={() => onRetract?.(skeet)}
                      >
                        {t('posts.lists.published.retract', 'Zurückziehen')}
                      </Button>
                      ) : null}
                      {canFetchReactions ? (
                        <Button
                          variant="primary"
                          onClick={() => onFetchReactions(skeet.id)}
                          disabled={isFetchingReactions}
                        >
                          {isFetchingReactions
                            ? t('posts.lists.published.reactionsLoading', 'Lädt…')
                            : t(
                                'posts.lists.published.reactionsRefresh',
                                'Reaktionen aktualisieren'
                              )}
                        </Button>
                      ) : null}
                    </div>
                  )}
                </div>

                {Object.keys(reactions).length > 0 ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    {Object.entries(reactions).map(([platformId, stats]) => (
                      <div key={platformId} className="rounded-2xl border border-border bg-background-subtle/80 p-4 text-sm">
                        <p className="font-medium text-foreground">
                          {platformLabels[platformId] || platformId}
                        </p>
                        <p className="mt-1 text-foreground-muted">
                          {t(
                            'posts.lists.published.platformLikesReposts',
                            'Likes {likes} · Reposts {reposts}',
                            { likes: stats.likes, reposts: stats.reposts }
                          )}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}
                {reactionErrors ? (
                  <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                    {t('posts.lists.published.reactionsErrorPrefix', 'Fehler: ')}
                    {Object.values(reactionErrors).join(", ")}
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </>
    )
  }, [activeCardTabs, formatTime, loadingReactions, loadingReplies, onFetchReactions, onRetract, onShowRepliesContent, onShowSkeetContent, platformLabels, reactionStats, replyErrors, repliesBySkeet]);

  const renderStaticList = () => (
    <div className="space-y-4">
      {skeets.map((skeet) => (
        <Card
          key={skeet.id}
          ref={typeof getItemRef === "function" ? getItemRef(skeet.id) : undefined}
          id={`skeet-${skeet.id}`}
        >
          {renderCardBody(skeet)}
        </Card>
      ))}
    </div>
  );

  const getWrapperRef = useCallback(
    (virtualIndex, skeetId) => {
      const measure = measureRef(virtualIndex);
      const visibleRef = typeof getItemRef === "function" ? getItemRef(skeetId) : null;
      return (node) => {
        measure(node);
        if (visibleRef) {
          visibleRef(node);
        }
      };
    },
    [getItemRef, measureRef]
  );

  if (isEmpty) {
    return (
      <div className="rounded-2xl border border-dashed border-border-muted bg-background-subtle p-8 text-center text-sm text-foreground-muted">
        <p className="font-medium text-foreground">
          {t(
            'posts.lists.published.emptyTitle',
            'Noch keine veröffentlichten Posts.'
          )}
        </p>
        <p className="mt-2">
          {t(
            'posts.lists.published.emptyBody',
            'Sobald Posts live sind, erscheinen sie hier mit allen Kennzahlen.'
          )}
        </p>
      </div>
    );
  }

  if (!shouldVirtualize || !virtualReady) {
    return renderStaticList();
  }

  return (
    <div style={{ height: `${totalSize}px`, position: "relative" }}>
      {virtualItems.map((virtualItem) => {
        const skeet = skeets[virtualItem.index];
        return (
          <div
            key={skeet.id}
            ref={getWrapperRef(virtualItem.index, skeet.id)}
            className="absolute left-0 right-0 pb-4"
            style={{ top: `${virtualItem.start}px` }}
          >
            <Card id={`skeet-${skeet.id}`}>
              {renderCardBody(skeet)}
            </Card>
          </div>
        );
      })}
    </div>
  );
}

export default PublishedSkeetList;
