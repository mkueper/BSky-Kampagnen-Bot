const PLATFORM_ORDER = ["bluesky", "mastodon"];
const PLATFORM_ICONS = {
  bluesky: "🟦",
  mastodon: "🐘",
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
    <div className="platform-badges">
      {items.map(({ id, status, title }) => (
        <span key={id} className={`badge badge-${status} badge-${id}`} title={title}>
          {PLATFORM_ICONS[id] ?? "•"} {status}
        </span>
      ))}
    </div>
  );
}

export default PlatformBadges;
