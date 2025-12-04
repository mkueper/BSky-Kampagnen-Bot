import { Button, Card } from "@bsky-kampagnen-bot/shared-ui";
import PlatformBadges from "./PlatformBadges";
import ContentWithLinkPreview from "./ContentWithLinkPreview";
import SkeetHistoryPanel from "./skeets/SkeetHistoryPanel.jsx";

function PlannedSkeetList({
  skeets,
  onEdit,
  onDelete,
  getRepeatDescription,
  highlightedId = null,
  showPendingActions = false,
  onPublishPendingOnce,
  onDiscardPending
}) {
  if (skeets.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border-muted bg-background-subtle p-8 text-center text-sm text-foreground-muted">
        <p className="font-medium text-foreground">Noch keine Posts geplant.</p>
        <p className="mt-2">Nutze den Planer, um deinen ersten Post zu terminieren.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {skeets.map((skeet) => {
        const isHighlighted = highlightedId === skeet.id
        const showHistoryPanel = typeof skeet.repeat === "string" && skeet.repeat !== "none"
        const isPendingManual = skeet.status === "pending_manual"
        return (
          <Card
            key={skeet.id}
            id={`skeet-${skeet.id}`}
            className={isHighlighted ? 'ring-2 ring-primary/40 ring-offset-2 ring-offset-background' : undefined}
          >
            <div className="flex flex-col lg:flex-row lg:items-start">
              <div className="min-w-0 flex-1 space-y-3 lg:border-r-2 border-border bg-background">
                <PlatformBadges skeet={skeet} />
                <p className="text-sm text-foreground-muted">{getRepeatDescription(skeet)}</p>
                <ContentWithLinkPreview
                  content={skeet.content}
                  mediaCount={Array.isArray(skeet.media) ? skeet.media.length : 0}
                  className="text-base font-medium leading-relaxed text-foreground whitespace-pre-wrap break-words"
                />
                {Array.isArray(skeet.media) && skeet.media.length > 0 ? (
                  <div className="mt-2 grid grid-cols-2 gap-2 pr-4">
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
              </div>
              <div className="skeet-meta-column">
                <div className="flex w-full flex-row flex-wrap items-center gap-2">
                  <Button variant="secondary" onClick={() => onEdit(skeet)}>Bearbeiten</Button>
                  <Button variant="destructive" onClick={() => onDelete(skeet)}>Löschen</Button>
                </div>
                {showPendingActions && isPendingManual ? (
                  <div className="mt-4 flex w-full flex-row flex-wrap items-center gap-2">
                    <Button
                      variant="primary"
                      onClick={() => onPublishPendingOnce && onPublishPendingOnce(skeet)}
                    >
                      Jetzt senden
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => onDiscardPending && onDiscardPending(skeet)}
                    >
                      Termin überspringen
                    </Button>
                  </div>
                ) : null}
                {showHistoryPanel ? (
                  <div className="mt-4 w-full">
                    <SkeetHistoryPanel skeetId={skeet.id} repeat={skeet.repeat} />
                  </div>
                ) : null}
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  );
}

export default PlannedSkeetList;
