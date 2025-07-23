import { useState } from "react";

// Hilfsfunktion für Formatierung
function getDefaultDateTime() {
  const now = new Date();
  now.setDate(now.getDate() + 1); // morgen
  now.setHours(9, 0, 0, 0); // 9:00 Uhr
  const isoString = now.toISOString();
  return isoString.slice(0, 16); // yyyy-MM-ddTHH:mm
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
      body: JSON.stringify({ content, scheduledAt }),
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
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
          />
        </label>
      </div>
      <button type="submit">Skeet speichern</button>
    </form>
  );
}

export default SkeetForm;
