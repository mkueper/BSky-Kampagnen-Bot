import PlatformBadges from "./PlatformBadges";
import Button from "./ui/Button";
import Card from "./ui/Card";

function DeletedSkeetList({ skeets, onRestore, onPermanentDelete, formatTime }) {
  if (skeets.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border-muted bg-background-subtle p-8 text-center text-sm text-foreground-muted">
        <p className="font-medium text-foreground">Keine gelöschten Skeets.</p>
        <p className="mt-2">Gelöschte Beiträge erscheinen hier und können reaktiviert oder endgültig entfernt werden.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {skeets.map((skeet) => (
        <Card key={skeet.id}>
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-3">
              <PlatformBadges skeet={skeet} />
              {skeet.deletedAt ? (
                <p className="text-sm text-foreground-muted">
                  Gelöscht am <span className="font-medium text-foreground">{formatTime(skeet.deletedAt)}</span>
                </p>
              ) : null}
              <p className="text-base font-medium leading-relaxed text-foreground whitespace-pre-wrap break-words">{skeet.content}</p>
              {skeet.targetPlatforms?.length > 0 && (
                <p className="text-xs uppercase tracking-[0.25em] text-foreground-subtle">
                  {skeet.targetPlatforms.join(" • ")}
                </p>
              )}
            </div>
            <div className="flex flex-shrink-0 items-center gap-2 self-end md:self-start">
              <Button variant="primary" onClick={() => onRestore(skeet)}>Reaktivieren</Button>
              <Button variant="destructive" onClick={() => onPermanentDelete(skeet)}>Endgültig löschen</Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

export default DeletedSkeetList;
