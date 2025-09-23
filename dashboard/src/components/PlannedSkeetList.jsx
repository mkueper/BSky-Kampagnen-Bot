import PlatformBadges from "./PlatformBadges";

function PlannedSkeetList({ skeets, onEdit, onDelete, getRepeatDescription }) {
  if (skeets.length === 0) {
    return <p>Keine geplanten Skeets.</p>;
  }

  return (
    <ul className="skeet-list">
      {skeets.map((skeet) => (
        <li key={skeet.id} className="skeet-item skeet-planned">
          <div className="skeet-card-panel">
            <PlatformBadges skeet={skeet} />
            <p>
              <strong>Geplant:</strong> {skeet.content}
            </p>
            <p>
              <em>{getRepeatDescription(skeet)}</em>
            </p>
            {skeet.targetPlatforms?.length > 0 && (
              <p className="skeet-platforms">
                Plattformen: {skeet.targetPlatforms.join(", ")}
              </p>
            )}
            <div className="skeet-actions">
              <button onClick={() => onEdit(skeet)}>Bearbeiten</button>
              <button className="danger" onClick={() => onDelete(skeet)}>
                Löschen
              </button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default PlannedSkeetList;
