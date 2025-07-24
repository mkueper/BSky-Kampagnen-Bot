import { useState } from "react";

const localISODateTime = (utcDateString) => {
  const date = new Date(utcDateString);
  const offset = date.getTimezoneOffset(); // in Minuten
  const localDate = new Date(date.getTime() - offset * 60000);
  return localDate.toISOString().slice(0, 16); // "YYYY-MM-DDTHH:mm"
};

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
  const [scheduledAt, setScheduledAt] = useState(getDefaultDateTime());

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (content.length > 300) {
      alert("Der Skeet darf maximal 300 Zeichen enthalten!");
      return;
    }

    const res = await fetch("/api/skeets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, scheduledAt: new Date(scheduledAt) }),
    });

    if (res.ok) {
      setContent("");
      setScheduledAt(getDefaultDateTime());
      if (onSkeetCreated) onSkeetCreated();
    } else {
      alert("Fehler beim Anlegen!");
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: 20 }}>
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

      <div>
        <label>
          Geplante Uhrzeit (optional):{" "}
          <input
            type="datetime-local"
            value={localISODateTime(scheduledAt)}
            onChange={(e) => setScheduledAt(e.target.value)}
          />
        </label>
      </div>
      <button type="submit">Skeet speichern</button>
    </form>
  );
}

export default SkeetForm;
