const PLATFORM_ORDER = ['bluesky', 'mastodon'];
const PLATFORM_ICONS = {
  bluesky: "🟦",
  mastodon: "🐘",
};

const STATUS_STYLES = {
  pending: "border-border bg-background-subtle text-foreground-muted",
  sent: "border-transparent bg-emerald-500/90 text-white",
  failed: "border-transparent bg-destructive/90 text-destructive-foreground",
};

const PLATFORM_ACCENTS = {
  bluesky: "ring-offset-2 ring-sky-400/60",
  mastodon: "ring-offset-2 ring-violet-400/60",
};

function getPlatformSummary(skeet) {
  const results = skeet?.platformResults || {};
  const targets = Array.isArray(skeet?.targetPlatforms) && skeet.targetPlatforms.length > 0
    ? skeet.targetPlatforms
    : Object.keys(results);

  const platforms = targets.length ? targets : PLATFORM_ORDER;

  return platforms.map((platformId) => {
    const entry = results?.[platformId];
    if (!entry) {
      return { id: platformId, status: "pending", title: `${platformId}: geplant` };
    }

    if (entry.status === "sent") {
      const attempts = entry.attempts ? `, Versuche: ${entry.attempts}` : "";
      const postedAt = entry.postedAt ? new Date(entry.postedAt).toLocaleString() : "";
      const uri = entry.uri ? `\n${entry.uri}` : "";
      const timestamp = postedAt ? `\n${postedAt}` : "";
      return {
        id: platformId,
        status: "sent",
        title: `${platformId}: gesendet${attempts}${uri}${timestamp}`,
      };
    }

    if (entry.status === "failed") {
      const attempts = entry.attempts ? ` (Versuche: ${entry.attempts})` : "";
      const error = entry.error ? `\n${entry.error}` : "";
      return {
        id: platformId,
        status: "failed",
        title: `${platformId}: fehlgeschlagen${attempts}${error}`.trim(),
      };
    }

    return { id: platformId, status: "pending", title: `${platformId}: geplant` };
  });
}

function PlatformBadges({ skeet }) {
  const items = getPlatformSummary(skeet);

  return (
    <div className="flex flex-wrap gap-2">
      {items.map(({ id, status, title }) => (
        <span
          key={id}
          title={title}
          className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] shadow-sm transition hover:ring ${
            STATUS_STYLES[status] || STATUS_STYLES.pending
          } ${PLATFORM_ACCENTS[id] || ""}`}
        >
          <span aria-hidden="true">{PLATFORM_ICONS[id] ?? "•"}</span>
          <span className="normal-case tracking-normal capitalize">{status}</span>
        </span>
      ))}
    </div>
  );
}

export default PlatformBadges;
