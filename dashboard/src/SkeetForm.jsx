import { useState } from "react";

function SkeetForm({ onSkeetCreated }) {
  const [content, setContent] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");

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
      setScheduledAt("");
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
        rows={5}
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
