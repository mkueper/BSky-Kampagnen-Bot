import { useState } from "react";

// const localISODateTime = (utcDateString) => {
//   const date = new Date(utcDateString);
//   const offset = date.getTimezoneOffset(); // in Minuten
//   const localDate = new Date(date.getTime() - offset * 60000);
//   return localDate.toISOString().slice(0, 16); // "YYYY-MM-DDTHH:mm"
// };

// Hilfsfunktion für Formatierung
function getDefaultDateTime() {
  const now = new Date();
  now.setDate(now.getDate() + 1); // morgen
  now.setHours(9, 0, 0, 0); // 9:00 Uhr
  const offsetMs = now.getTimezoneOffset() * 60 * 1000;
  const localDate = new Date(now.getTime() - offsetMs);
  return localDate.toISOString().slice(0, 16); // yyyy-MM-ddTHH:mm String.slice(0, 16); // yyyy-MM-ddTHH:mm
}

function SkeetForm({ onSkeetCreated }) {
  const [content, setContent] = useState("");

  const now = new Date();
  const defaultDate = now.toISOString().slice(0, 10); // yyyy-mm-dd
  const defaultTime = now.toTimeString().slice(0, 5); // HH:mm

  const [scheduledDate, setScheduledDate] = useState(defaultDate);
  const [scheduledTime, setScheduledTime] = useState(defaultTime);
  const [scheduledAt, setScheduled] = useState(`${defaultDate}T${defaultTime}`);
  const fullDateTime = scheduledDate && scheduledTime ? new Date(`${scheduledDate}T${scheduledTime}`) : null;

  const [repeat, setRepeat] = useState("none");
  const [repeatDayOfWeek, setRepeatDayOfWeek] = useState(null);
  const [repeatDayOfMonth, setRepeatDayOfMonth] = useState(null);

  function updateScheduled(date, time) {
    setScheduled(`${date}T${time}`);
  }

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (content.length > 300) {
      alert("Der Skeet darf maximal 300 Zeichen enthalten!");
      return;
    }

    if (!fullDateTime || isNaN(fullDateTime.getTime())) {
      alert("Ungültiges Datum oder Uhrzeit.");
      return;
    }

    const res = await fetch("/api/skeets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content,
        scheduledAt: fullDateTime,
        repeat,
        repeatDayOfWeek,
        repeatDayOfMonth,
      }),
    });

    if (res.ok) {
      setContent("");

      const defaultDateTime = getDefaultDateTime();
      const [defaultDate, defaultTime] = defaultDateTime.split("T");

      setScheduledDate(defaultDate);
      setScheduledTime(defaultTime);

      if (onSkeetCreated) onSkeetCreated();
    } else {
      alert("Fehler beim Anlegen!");
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: 20 }}>
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
            setRepeat(e.target.value);
            // Reset Felder je nach Auswahl
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
            onChange={(e) => setRepeatDayOfWeek(Number(e.target.value))}
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
            onChange={(e) => setRepeatDayOfMonth(Number(e.target.value))}
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
            onChange={(e) => {
              setScheduledDate(e.target.value);
              updateScheduled(e.target.value, scheduledTime);
            }}
          />
        </div>
      )}

      <div className="form-group">
        <label htmlFor="time">Geplante Uhrzeit:</label>
        <input
          id="time"
          type="time"
          value={scheduledTime}
          onChange={(e) => {
            setScheduledTime(e.target.value);
            updateScheduled(scheduledDate, e.target.value);
          }}
        />
      </div>

      <button type="submit">Skeet speichern</button>
    </form>
  );
}

export default SkeetForm;
