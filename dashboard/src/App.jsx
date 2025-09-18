import { useEffect, useRef, useState } from "react";
import SkeetForm from "./SkeetForm";
import { formatTime } from "./utils/formatTime";
import { classNames } from "./utils/classNames";
import { getRepeatDescription } from "./utils/timeUtils";
import "./styles/App.css";

function parseTargetPlatforms(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn("Konnte targetPlatforms nicht parsen:", error);
    }
  }

  return [];
}

function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [skeets, setSkeets] = useState([]);
  const [replies, setReplies] = useState([]);
  const [selectedSkeetId, setSelectedSkeetId] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editingSkeet, setEditingSkeet] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }

    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuOpen]);

  const loadSkeets = async () => {
    const res = await fetch("/api/skeets");
    if (res.ok) {
      const data = await res.json();
      const normalized = data.map((item) => ({
        ...item,
        targetPlatforms: parseTargetPlatforms(item.targetPlatforms),
      }));
      setSkeets(normalized);
      setEditingSkeet((current) => {
        if (!current) return current;
        const updated = normalized.find((entry) => entry.id === current.id);
        return updated ?? null;
      });
    } else {
      console.error("Fehler beim Laden der Skeets");
    }
  };

  useEffect(() => {
    loadSkeets();
  }, []);

  const fetchReactions = async (id) => {
    const res = await fetch(`/api/reactions/${id}`);
    const data = await res.json();
    alert(`Likes: ${data.likes}, Reposts: ${data.reposts}`);
  };

  const fetchReplies = async (id) => {
    const res = await fetch(`/api/replies/${id}`);
    const data = await res.json();
    setReplies(data);
    setSelectedSkeetId(id);
  };

  const handleEdit = (skeet) => {
    setEditingSkeet(skeet);
    setActiveTab("skeetplaner");
  };

  const handleDelete = async (skeet) => {
    const confirmed = window.confirm("Soll dieser geplante Skeet wirklich gelöscht werden?");
    if (!confirmed) {
      return;
    }

    const res = await fetch(`/api/skeets/${skeet.id}`, { method: "DELETE" });
    if (res.ok) {
      setEditingSkeet((current) => (current?.id === skeet.id ? null : current));
      loadSkeets();
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Fehler beim Löschen des Skeets.");
    }
  };

  const handleFormSaved = () => {
    setEditingSkeet(null);
    loadSkeets();
    setActiveTab("dashboard");
  };

  const handleCancelEdit = () => {
    setEditingSkeet(null);
  };

  const plannedSkeets = skeets.filter((s) => !s.postUri);
  const publishedSkeets = skeets.filter((s) => s.postUri);

  return (
    <div className="App">
      <div className="menu-container">
        <button
          className="burger-button"
          onClick={() => setMenuOpen((prev) => !prev)}
        >
          ☰ Menü
        </button>

        <div
          className={`menu-tabs ${menuOpen ? "open" : "closed"}`}
          ref={menuRef}
        >
          <button
            className={classNames(
              "menu-button",
              activeTab === "dashboard" && "active"
            )}
            onClick={() => {
              setActiveTab("dashboard");
              setMenuOpen(false);
            }}
          >
            🗂 Übersicht
          </button>
          <button
            className={classNames(
              "menu-button",
              activeTab === "config" && "active"
            )}
            onClick={() => {
              setActiveTab("config");
              setMenuOpen(false);
            }}
          >
            ⚙️ Konfiguration
          </button>
          <button
            className={classNames(
              "menu-button",
              activeTab === "skeetplaner" && "active"
            )}
            onClick={() => {
              setActiveTab("skeetplaner");
              setMenuOpen(false);
            }}
          >
            📝 Skeet planen
          </button>
        </div>
      </div>

      {activeTab === "dashboard" && (
        <>
          <h1>Bluesky Kampagnen-Dashboard</h1>
          <h2>🕒 Geplante Skeets</h2>
          <ul className="skeet-list">
            {plannedSkeets.map((skeet) => (
              <li key={skeet.id} className="skeet-item skeet-planned">
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
                  <button onClick={() => handleEdit(skeet)}>Bearbeiten</button>
                  <button className="danger" onClick={() => handleDelete(skeet)}>
                    Löschen
                  </button>
                </div>
              </li>
            ))}
          </ul>
          {plannedSkeets.length === 0 && <p>Keine geplanten Skeets.</p>}
          <h2>✅ Veröffentlicht</h2>
          <ul className="skeet-list">
            {publishedSkeets.map((skeet) => (
              <li key={skeet.id} className="skeet-item skeet-published">
                <p>{skeet.content}</p>
                {skeet.targetPlatforms?.length > 0 && (
                  <p className="skeet-platforms">
                    Plattformen: {skeet.targetPlatforms.join(", ")}
                  </p>
                )}
                {skeet.postedAt && (
                  <p className="skeet-meta">
                    Gesendet am {formatTime(skeet.postedAt)}
                  </p>
                )}
                <button onClick={() => fetchReactions(skeet.id)}>
                  Reaktionen anzeigen
                </button>
                <button onClick={() => fetchReplies(skeet.id)}>
                  Replies anzeigen
                </button>
                <p>
                  Likes: {skeet.likesCount} | Reposts: {skeet.repostsCount}
                </p>
              </li>
            ))}
          </ul>
          {publishedSkeets.length === 0 && (
            <p>Keine veröffentlichten Skeets.</p>
          )}
          {selectedSkeetId && (
            <div className="replies-section">
              <h3>Antworten</h3>
              <ul>
                {replies.map((reply, index) => (
                  <li key={index}>
                    <strong>{reply.authorHandle}:</strong> {reply.content}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {activeTab === "config" && (
        <div className="config-section">
          <h2>⚙️ Konfiguration (noch in Arbeit)</h2>
          <p>
            Hier kannst du später Einstellungen wie Posting-Zeit, Auth-Daten
            oder Layout vornehmen.
          </p>
        </div>
      )}

      {activeTab === "skeetplaner" && (
        <div className="planer-section">
          <SkeetForm
            onSkeetSaved={handleFormSaved}
            editingSkeet={editingSkeet}
            onCancelEdit={handleCancelEdit}
          />
        </div>
      )}
    </div>
  );
}

export default App;
