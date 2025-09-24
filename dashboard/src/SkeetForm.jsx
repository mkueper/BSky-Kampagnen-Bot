import { useEffect, useState } from "react";

const PLATFORM_LIMITS = {
  bluesky: 300,
  mastodon: 500,
};

function resolveMaxLength(selectedPlatforms) {
  const limits = selectedPlatforms
    .map((platform) => PLATFORM_LIMITS[platform])
    .filter((value) => typeof value === "number");

  if (limits.length === 0) {
    return PLATFORM_LIMITS.bluesky;
  }

  return Math.min(...limits);
}

// Hilfsfunktion für Formatierung
function getDefaultDateTime() {
  const now = new Date();
  now.setDate(now.getDate() + 1); // morgen
  now.setHours(9, 0, 0, 0); // 9:00 Uhr
  const offsetMs = now.getTimezoneOffset() * 60 * 1000;
  const localDate = new Date(now.getTime() - offsetMs);
  return localDate.toISOString().slice(0, 16); // yyyy-MM-ddTHH:mm
}

function getDefaultDateParts() {
  const defaultDateTime = getDefaultDateTime();
  const [date, time] = defaultDateTime.split("T");
  return { date, time };
}

function toLocalDateParts(value) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (isNaN(parsed)) {
    return null;
  }

  const offsetMs = parsed.getTimezoneOffset() * 60 * 1000;
  const local = new Date(parsed.getTime() - offsetMs);
  const iso = local.toISOString().slice(0, 16);
  const [date, time] = iso.split("T");
  return { date, time };
}

/**
 * Formular zum Erstellen oder Bearbeiten eines Skeets.
 *
 * @param {Function} onSkeetSaved   Callback nach erfolgreichem Speichern (lädt Liste neu).
 * @param {Object|null} editingSkeet Aktueller Datensatz beim Bearbeiten, sonst null.
 * @param {Function} onCancelEdit   Wird beim Abbrechen aufgerufen (z. B. Tab-Wechsel).
 */
function SkeetForm({ onSkeetSaved, editingSkeet, onCancelEdit }) {
  const { date: defaultDate, time: defaultTime } = getDefaultDateParts();

  const [content, setContent] = useState("");
  const [targetPlatforms, setTargetPlatforms] = useState(["bluesky"]);
  const [scheduledDate, setScheduledDate] = useState(defaultDate);
  const [scheduledTime, setScheduledTime] = useState(defaultTime);
  const [repeat, setRepeat] = useState("none");
  const [repeatDayOfWeek, setRepeatDayOfWeek] = useState(null);
  const [repeatDayOfMonth, setRepeatDayOfMonth] = useState(null);

  const isEditing = Boolean(editingSkeet);
  const maxContentLength = resolveMaxLength(targetPlatforms);

  function resetToDefaults() {
    setContent("");
    setTargetPlatforms(["bluesky"]);
    setRepeat("none");
    setRepeatDayOfWeek(null);
    setRepeatDayOfMonth(null);
    const defaults = getDefaultDateParts();
    setScheduledDate(defaults.date);
    setScheduledTime(defaults.time);
  }

  useEffect(() => {
    if (editingSkeet) {
      setContent(editingSkeet.content ?? "");
      setTargetPlatforms(
        Array.isArray(editingSkeet.targetPlatforms) && editingSkeet.targetPlatforms.length > 0
          ? editingSkeet.targetPlatforms
          : ["bluesky"],
      );
      setRepeat(editingSkeet.repeat ?? "none");
      setRepeatDayOfWeek(
        editingSkeet.repeat === "weekly" && editingSkeet.repeatDayOfWeek != null
          ? Number(editingSkeet.repeatDayOfWeek)
          : null,
      );
      setRepeatDayOfMonth(
        editingSkeet.repeat === "monthly" && editingSkeet.repeatDayOfMonth != null
          ? Number(editingSkeet.repeatDayOfMonth)
          : null,
      );

      const parts = toLocalDateParts(editingSkeet.scheduledAt) ?? getDefaultDateParts();
      setScheduledDate(parts.date);
      setScheduledTime(parts.time);
    } else {
      resetToDefaults();
    }
  }, [editingSkeet]);

  function togglePlatform(name) {
    setTargetPlatforms((prev) => {
      if (prev.includes(name)) {
        if (prev.length === 1) return prev;
        return prev.filter((p) => p !== name);
      }
      return [...prev, name];
    });
  }

  const scheduledDateTime =
    scheduledDate && scheduledTime ? new Date(`${scheduledDate}T${scheduledTime}`) : null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    const normalizedPlatforms = Array.from(new Set(targetPlatforms));
    const submissionLimit = resolveMaxLength(normalizedPlatforms);

    if (content.length > submissionLimit) {
      alert(`Der Skeet darf maximal ${submissionLimit} Zeichen für die ausgewählten Plattformen enthalten!`);
      return;
    }

    if (repeat === "none") {
      if (!scheduledDateTime || isNaN(scheduledDateTime.getTime())) {
        alert("Ungültiges Datum oder Uhrzeit.");
        return;
      }
    }

    if (normalizedPlatforms.length === 0) {
      alert("Bitte mindestens eine Plattform auswählen.");
      return;
    }

    const payload = {
      content,
      scheduledAt:
        scheduledDateTime && !isNaN(scheduledDateTime.getTime()) ? scheduledDateTime : null,
      repeat,
      repeatDayOfWeek,
      repeatDayOfMonth,
      targetPlatforms: normalizedPlatforms,
    };

    const url = isEditing ? `/api/skeets/${editingSkeet.id}` : "/api/skeets";
    const method = isEditing ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      if (!isEditing) {
        resetToDefaults();
      }
      if (onSkeetSaved) onSkeetSaved();
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Fehler beim Speichern des Skeets.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">
            {isEditing ? "Skeet bearbeiten" : "Neuen Skeet planen"}
          </h2>
          <p className="mt-1 text-sm text-foreground-muted">
            Maximal {maxContentLength} Zeichen für die gewählten Plattformen.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Plattformen wählen">
          {["bluesky", "mastodon"].map((platform) => {
            const isActive = targetPlatforms.includes(platform);
            return (
              <label
                key={platform}
                className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-medium transition ${
                  isActive
                    ? "border-primary bg-primary/10 text-primary shadow-soft"
                    : "border-border text-foreground-muted hover:border-primary/50"
                }`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={isActive}
                  onChange={() => togglePlatform(platform)}
                />
                <span className="capitalize">{platform}</span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <label htmlFor="skeet-content" className="text-sm font-semibold text-foreground">
          Skeet-Text
        </label>
        <textarea
          id="skeet-content"
          required
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Was möchtest du veröffentlichen?"
          rows={7}
          className="w-full rounded-2xl border border-border bg-background-subtle px-4 py-3 text-base leading-relaxed text-foreground shadow-soft transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <div
          className={`text-sm ${content.length > maxContentLength ? "text-destructive" : "text-foreground-muted"}`}
        >
          {content.length}/{maxContentLength} Zeichen
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="repeat" className="text-sm font-semibold text-foreground">
            Wiederholungsmuster
          </label>
          <select
            id="repeat"
            value={repeat}
            onChange={(e) => {
              const value = e.target.value;
              setRepeat(value);
              setRepeatDayOfWeek(null);
              setRepeatDayOfMonth(null);
            }}
            className="w-full rounded-2xl border border-border bg-background-subtle px-4 py-3 text-sm text-foreground shadow-soft focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="none">Keine Wiederholung</option>
            <option value="daily">Täglich</option>
            <option value="weekly">Wöchentlich</option>
            <option value="monthly">Monatlich</option>
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="time" className="text-sm font-semibold text-foreground">
            Geplante Uhrzeit
          </label>
          <input
            id="time"
            type="time"
            value={scheduledTime}
            onChange={(e) => setScheduledTime(e.target.value)}
            className="w-full rounded-2xl border border-border bg-background-subtle px-4 py-3 text-sm text-foreground shadow-soft focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {repeat === "weekly" && (
          <div className="space-y-2">
            <label htmlFor="repeatDayOfWeek" className="text-sm font-semibold text-foreground">
              Wochentag
            </label>
            <select
              id="repeatDayOfWeek"
              value={repeatDayOfWeek ?? ""}
              onChange={(e) => {
                const value = e.target.value;
                setRepeatDayOfWeek(value === "" ? null : Number(value));
              }}
              className="w-full rounded-2xl border border-border bg-background-subtle px-4 py-3 text-sm text-foreground shadow-soft focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">Bitte wählen</option>
              <option value="1">Montag</option>
              <option value="2">Dienstag</option>
              <option value="3">Mittwoch</option>
              <option value="4">Donnerstag</option>
              <option value="5">Freitag</option>
              <option value="6">Samstag</option>
              <option value="0">Sonntag</option>
            </select>
          </div>
        )}

        {repeat === "monthly" && (
          <div className="space-y-2">
            <label htmlFor="repeatDayOfMonth" className="text-sm font-semibold text-foreground">
              Tag im Monat (1–31)
            </label>
            <input
              id="repeatDayOfMonth"
              type="number"
              min="1"
              max="31"
              value={repeatDayOfMonth ?? ""}
              onChange={(e) => {
                const value = e.target.value;
                setRepeatDayOfMonth(value === "" ? null : Number(value));
              }}
              className="w-full rounded-2xl border border-border bg-background-subtle px-4 py-3 text-sm text-foreground shadow-soft focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        )}

        {repeat === "none" && (
          <div className="space-y-2">
            <label htmlFor="date" className="text-sm font-semibold text-foreground">
              Geplantes Datum
            </label>
            <input
              id="date"
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="w-full rounded-2xl border border-border bg-background-subtle px-4 py-3 text-sm text-foreground shadow-soft focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        )}
      </div>

      <div className="flex flex-wrap justify-end gap-3">
        {isEditing && (
          <button
            type="button"
            onClick={() => onCancelEdit && onCancelEdit()}
            className="rounded-2xl border border-border px-5 py-2.5 text-sm font-medium text-foreground transition hover:bg-background-subtle"
          >
            Abbrechen
          </button>
        )}
        <button
          type="submit"
          className="rounded-2xl bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground shadow-soft transition hover:shadow-card"
        >
          {isEditing ? "Skeet aktualisieren" : "Skeet speichern"}
        </button>
      </div>
    </form>
  );
}

export default SkeetForm;
