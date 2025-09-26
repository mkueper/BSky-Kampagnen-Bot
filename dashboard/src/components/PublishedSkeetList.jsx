import PlatformBadges from "./PlatformBadges";

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
  reactionStats,
  platformLabels,
  formatTime,
}) {
  if (skeets.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border-muted bg-background-subtle p-8 text-center text-sm text-foreground-muted">
        <p className="font-medium text-foreground">Noch keine veröffentlichten Skeets.</p>
        <p className="mt-2">Sobald Beiträge live sind, erscheinen sie hier mit allen Kennzahlen.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {skeets.map((skeet) => {
        const activeCardTab = activeCardTabs[skeet.id] ?? "skeet";
        const replies = repliesBySkeet[skeet.id] ?? [];
        const isLoadingReplies = Boolean(loadingReplies[skeet.id]);
        const isFetchingReactions = Boolean(loadingReactions[skeet.id]);
        const reactions = reactionStats[skeet.id]?.platforms ?? {};
        const reactionErrors = reactionStats[skeet.id]?.errors;
        const replyError = replyErrors[skeet.id];

        return (
          <article
            key={skeet.id}
            className="rounded-2xl border border-border bg-background-subtle/60 shadow-soft transition hover:-translate-y-0.5 hover:bg-background-elevated hover:shadow-card"
          >
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
                Beitrag
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
                Antworten
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
                    <p className="text-sm text-foreground-muted">Antworten werden geladen…</p>
                  ) : replies.length > 0 ? (
                    <ul className="space-y-3 text-sm">
                      {replies.map((reply, index) => (
                        <li key={`${reply.authorHandle}-${reply.createdAt ?? index}`} className="rounded-2xl border border-border bg-background-elevated/60 p-4">
                          <p className="font-medium">{reply.authorHandle}</p>
                          {reply.platform ? (
                            <p className="text-xs uppercase tracking-[0.2em] text-foreground-subtle">
                              {platformLabels[reply.platform] || reply.platform}
                            </p>
                          ) : null}
                          <p className="mt-1 whitespace-pre-line leading-relaxed text-foreground-muted">{reply.content}</p>
                          {reply.createdAt && (
                            <p className="mt-2 text-xs uppercase tracking-[0.2em] text-foreground-subtle">
                              {formatTime(reply.createdAt)}
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-foreground-muted">Keine Antworten vorhanden.</p>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-base font-medium leading-relaxed text-foreground">{skeet.content}</p>
                  {skeet.targetPlatforms?.length > 0 && (
                    <p className="text-xs uppercase tracking-[0.25em] text-foreground-subtle">
                      {skeet.targetPlatforms.join(" • ")}
                    </p>
                  )}
                  {skeet.postedAt && (
                    <p className="text-sm text-foreground-muted">
                      Gesendet am <span className="font-medium text-foreground">{formatTime(skeet.postedAt)}</span>
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => onFetchReactions(skeet.id)}
                      disabled={isFetchingReactions}
                      className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:shadow-soft disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isFetchingReactions ? "Lädt…" : "Reaktionen aktualisieren"}
                    </button>
                    <p className="text-sm text-foreground-muted">
                      Likes: <span className="font-semibold text-foreground">{skeet.likesCount}</span> · Reposts: <span className="font-semibold text-foreground">{skeet.repostsCount}</span>
                    </p>
                  </div>

                  {Object.keys(reactions).length > 0 && (
                    <div className="grid gap-3 md:grid-cols-2">
                      {Object.entries(reactions).map(([platformId, stats]) => (
                        <div key={platformId} className="rounded-2xl border border-border bg-background-subtle/80 p-4 text-sm">
                          <p className="font-medium text-foreground">
                            {platformLabels[platformId] || platformId}
                          </p>
                          <p className="mt-1 text-foreground-muted">Likes {stats.likes} · Reposts {stats.reposts}</p>
                        </div>
                      ))}
                      {reactionErrors && (
                        <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                          Fehler: {Object.values(reactionErrors).join(", ")}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}

export default PublishedSkeetList;
