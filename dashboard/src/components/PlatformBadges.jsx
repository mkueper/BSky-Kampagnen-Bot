import React from "react";
import Badge from "./ui/Badge";

const PLATFORM_ORDER = ['bluesky', 'mastodon'];
const PLATFORM_ICONS = { bluesky: "🟦", mastodon: "🐘" };

const STATUS_VARIANT = {
  pending: "outline",
  sent: "success",
  failed: "destructive",
  partial: "warning",
  deleted: "outline",
};

const PLATFORM_ACCENTS = {
  bluesky: "ring-offset-2 ring-sky-400/60 hover:ring",
  mastodon: "ring-offset-2 ring-violet-400/60 hover:ring",
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

    if (entry.status === "deleted") {
      const deletedAt = entry.deletedAt ? new Date(entry.deletedAt).toLocaleString() : "";
      return {
        id: platformId,
        status: "deleted",
        title: `${platformId}: entfernt${deletedAt ? `\n${deletedAt}` : ""}`.trim(),
      };
    }

    if (entry.status === "partial") {
      const error = entry.error ? `\n${entry.error}` : "";
      return {
        id: platformId,
        status: "partial",
        title: `${platformId}: teilweise entfernt${error}`.trim(),
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
        <Badge
          key={id}
          title={title}
          size="sm"
          icon={PLATFORM_ICONS[id] ?? "•"}
          variant={STATUS_VARIANT[status] || 'outline'}
          className={`${PLATFORM_ACCENTS[id] || ''}`}
        >
          <span className="normal-case tracking-normal capitalize">{status}</span>
        </Badge>
      ))}
    </div>
  );
}

export default PlatformBadges;
