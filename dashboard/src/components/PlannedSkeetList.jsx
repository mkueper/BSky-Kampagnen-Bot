import PlatformBadges from "./PlatformBadges";
import Button from "./ui/Button";
import Card from "./ui/Card";

function PlannedSkeetList({ skeets, onEdit, onDelete, getRepeatDescription }) {
  if (skeets.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border-muted bg-background-subtle p-8 text-center text-sm text-foreground-muted">
        <p className="font-medium text-foreground">Noch keine Skeets geplant.</p>
        <p className="mt-2">Nutze den Skeetplaner, um deinen ersten Beitrag zu terminieren.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {skeets.map((skeet) => (
        <Card key={skeet.id} id={`skeet-${skeet.id}`}>
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-3">
              <PlatformBadges skeet={skeet} />
              <p className="text-sm text-foreground-muted">{getRepeatDescription(skeet)}</p>
              <p className="text-base font-medium leading-relaxed text-foreground">{skeet.content}</p>
              {skeet.targetPlatforms?.length > 0 && (
                <p className="text-xs uppercase tracking-[0.25em] text-foreground-subtle">
                  {skeet.targetPlatforms.join(" • ")}
                </p>
              )}
            </div>
            <div className="flex flex-shrink-0 items-center gap-2 self-end md:self-start">
              <Button variant="secondary" onClick={() => onEdit(skeet)}>Bearbeiten</Button>
              <Button variant="destructive" onClick={() => onDelete(skeet)}>Löschen</Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

export default PlannedSkeetList;
