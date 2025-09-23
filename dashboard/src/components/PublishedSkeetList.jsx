import PlatformBadges from "./PlatformBadges";
import { classNames } from "../utils/classNames";

function PublishedSkeetList({
  skeets,
  activeCardTabs,
  repliesBySkeet,
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
    return <p>Keine veröffentlichten Skeets.</p>;
  }

  return (
    <ul className="skeet-list">
      {skeets.map((skeet) => {
        const activeCardTab = activeCardTabs[skeet.id] ?? "skeet";
        const replies = repliesBySkeet[skeet.id] ?? [];
        const isLoadingReplies = Boolean(loadingReplies[skeet.id]);
        const isFetchingReactions = Boolean(loadingReactions[skeet.id]);
        const reactions = reactionStats[skeet.id]?.platforms ?? {};
        const reactionErrors = reactionStats[skeet.id]?.errors;

        return (
          <li key={skeet.id} className="skeet-item skeet-published">
            <div className="skeet-card-tabs">
              <button
                className={classNames(
                  "skeet-card-tab",
                  activeCardTab === "skeet" && "active"
                )}
                onClick={() => onShowSkeetContent(skeet.id)}
              >
                🗂 Skeet
              </button>
              <button
                className={classNames(
                  "skeet-card-tab",
                  activeCardTab === "replies" && "active"
                )}
                onClick={() => onShowRepliesContent(skeet.id)}
              >
                💬 Antworten
              </button>
            </div>

            <div className="skeet-card-panel">
              <PlatformBadges skeet={skeet} />
              {activeCardTab === "replies" ? (
                <div className="skeet-card-replies">
                  {isLoadingReplies ? (
                    <p className="skeet-card-replies-loading">Antworten werden geladen…</p>
                  ) : replies.length > 0 ? (
                    <ul className="replies-list">
                      {replies.map((reply, index) => (
                        <li key={`${reply.authorHandle}-${reply.createdAt ?? index}`}>
                          <p>
                            <strong>{reply.authorHandle}</strong>
                          </p>
                          <p className="reply-content">{reply.content}</p>
                          {reply.createdAt && (
                            <p className="reply-meta">{formatTime(reply.createdAt)}</p>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="skeet-card-replies-empty">Keine Antworten vorhanden.</p>
                  )}
                </div>
              ) : (
                <>
                  <p>{skeet.content}</p>
                  {skeet.targetPlatforms?.length > 0 && (
                    <p className="skeet-platforms">
                      Plattformen: {skeet.targetPlatforms.join(", ")}
                    </p>
                  )}
                  {skeet.postedAt && (
                    <p className="skeet-meta">
                      Gesendet am {formatTime(skeet.postedAt)}
                    </p>
                  )}
                  <div className="skeet-actions">
                    <button
                      onClick={() => onFetchReactions(skeet.id)}
                      disabled={isFetchingReactions}
                    >
                      {isFetchingReactions ? "Lädt…" : "Reaktionen anzeigen"}
                    </button>
                  </div>
                  <p className="skeet-stats">
                    Likes: {skeet.likesCount} | Reposts: {skeet.repostsCount}
                  </p>
                  {Object.keys(reactions).length > 0 && (
                    <div className="skeet-reactions-breakdown">
                      {Object.entries(reactions).map(([platformId, stats]) => (
                        <p key={platformId} className="skeet-reactions-entry">
                          {platformLabels[platformId] || platformId}: Likes {stats.likes} | Reposts {stats.reposts}
                        </p>
                      ))}
                      {reactionErrors && (
                        <p className="skeet-reactions-error">
                          Fehler: {Object.values(reactionErrors).join(", ")}
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default PublishedSkeetList;
