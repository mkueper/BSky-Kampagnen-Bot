import { useEffect, useState } from "react";

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

    if (content.length > 300) {
      alert("Der Skeet darf maximal 300 Zeichen enthalten!");
      return;
    }

    if (repeat === "none") {
      if (!scheduledDateTime || isNaN(scheduledDateTime.getTime())) {
        alert("Ungültiges Datum oder Uhrzeit.");
        return;
      }
    }

    const normalizedPlatforms = Array.from(new Set(targetPlatforms));
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
    <form onSubmit={handleSubmit} style={{ marginBottom: 20 }}>
      <div className="form-header">
        <h2>{isEditing ? "✏️ Skeet bearbeiten" : "📝 Skeetplaner"}</h2>

        <div className="platforms-inline" role="group" aria-label="Plattformen wählen">
          <label className={`toggle ${targetPlatforms.includes("bluesky") ? "on" : "off"}`}>
            <input
              type="checkbox"
              checked={targetPlatforms.includes("bluesky")}
              onChange={() => togglePlatform("bluesky")}
            />
            Bluesky
          </label>

          <label className={`toggle ${targetPlatforms.includes("mastodon") ? "on" : "off"}`}>
            <input
              type="checkbox"
              checked={targetPlatforms.includes("mastodon")}
              onChange={() => togglePlatform("mastodon")}
            />
            Mastodon
          </label>
        </div>
      </div>

      <div className="form-group">
        <textarea
          required
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Skeet-Text"
          rows={7}
          style={{ width: "100%", marginBottom: 8 }}
        />
        <div
          style={{
            fontSize: "0.9em",
            color: content.length > 300 ? "red" : "#333",
            marginBottom: 8,
          }}
        >
          {content.length}/300 Zeichen
        </div>

        <label htmlFor="repeat">Wiederholen</label>
        <select
          id="repeat"
          value={repeat}
          onChange={(e) => {
            const value = e.target.value;
            setRepeat(value);
            setRepeatDayOfWeek(null);
            setRepeatDayOfMonth(null);
          }}
        >
          <option value="none">Keine Wiederholung</option>
          <option value="daily">Täglich</option>
          <option value="weekly">Wöchentlich</option>
          <option value="monthly">Monatlich</option>
        </select>
      </div>

      {repeat === "weekly" && (
        <div className="form-group">
          <label htmlFor="repeatDayOfWeek">Wochentag</label>
          <select
            id="repeatDayOfWeek"
            value={repeatDayOfWeek ?? ""}
            onChange={(e) => {
              const value = e.target.value;
              setRepeatDayOfWeek(value === "" ? null : Number(value));
            }}
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
        <div className="form-group">
          <label htmlFor="repeatDayOfMonth">Tag im Monat (1–31)</label>
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
          />
        </div>
      )}

      {repeat === "none" && (
        <div className="form-group">
          <label htmlFor="date">Geplantes Datum:</label>
          <input
            id="date"
            type="date"
            value={scheduledDate}
            onChange={(e) => setScheduledDate(e.target.value)}
          />
        </div>
      )}

      <div className="form-group">
        <label htmlFor="time">Geplante Uhrzeit:</label>
        <input
          id="time"
          type="time"
          value={scheduledTime}
          onChange={(e) => setScheduledTime(e.target.value)}
        />
      </div>

      <div className="form-actions">
        {isEditing && (
          <button
            type="button"
            onClick={() => {
              if (onCancelEdit) onCancelEdit();
            }}
            className="secondary"
          >
            Abbrechen
          </button>
        )}
        <button type="submit">{isEditing ? "Skeet aktualisieren" : "Skeet speichern"}</button>
      </div>
    </form>
  );
}

export default SkeetForm;
