import { useEffect, useRef, useState } from "react";
import SkeetForm from "./SkeetForm";
import { formatTime } from "./utils/formatTime";
import { classNames } from "./utils/classNames";
import { getRepeatDescription } from "./utils/timeUtils";
import "./styles/App.css";

/**
 * React-Hauptansicht des Dashboards.
 *
 * Aufgabenüberblick:
 *  - Lädt Skeets aus dem Backend und normalisiert deren Struktur.
 *  - Verwaltet Tabs (Dashboard/Config/Formular sowie Geplant/Veröffentlicht).
 *  - Koordiniert das Nachladen von Reaktionen und Replies pro Skeet.
 *  - Dient als zentraler Verteiler für Formularereignisse (Anlegen/Bearbeiten).
 */

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
  // Innerhalb der Dashboard-Ansicht kann zwischen "planned" und "published" gewechselt werden.
  const [dashboardView, setDashboardView] = useState("planned");
  const [skeets, setSkeets] = useState([]);
  // Replies werden pro Skeet gespeichert, um Tab-Wechsel ruckelfrei zu halten.
  const [repliesBySkeet, setRepliesBySkeet] = useState({});
  const [activeCardTabs, setActiveCardTabs] = useState({});
  const [loadingReplies, setLoadingReplies] = useState({});
  const [menuOpen, setMenuOpen] = useState(false);
  const [editingSkeet, setEditingSkeet] = useState(null);
  const menuRef = useRef(null);

  // Schließt das Burger-Menü, wenn außerhalb geklickt wird.
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

  /**
   * Skeets vom Backend anfordern, JSON-Felder normalisieren und lokale States synchron halten.
   */
  const loadSkeets = async () => {
    const res = await fetch("/api/skeets");
    if (res.ok) {
      const data = await res.json();
      const normalized = data.map((item) => ({
        ...item,
        targetPlatforms: parseTargetPlatforms(item.targetPlatforms),
      }));
      setSkeets(normalized);
      setActiveCardTabs((current) => {
        const next = {};
        normalized.forEach((skeet) => {
          next[skeet.id] = current[skeet.id] ?? "skeet";
        });
        return next;
      });
      setRepliesBySkeet((current) => {
        const next = {};
        normalized.forEach((skeet) => {
          if (current[skeet.id]) {
            next[skeet.id] = current[skeet.id];
          }
        });
        return next;
      });
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

  /**
   * Likes/Reposts eines Skeets nachladen. Anschließend wird die gesamte
   * Liste aktualisiert, damit auch parallele Änderungen sichtbar werden.
   */
  const fetchReactions = async (id) => {
    try {
      const res = await fetch(`/api/reactions/${id}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Fehler beim Laden der Reaktionen.");
        return;
      }

      const data = await res.json();

      await loadSkeets();

      alert(`Likes: ${data.likes}, Reposts: ${data.reposts}`);
    } catch (error) {
      console.error("Fehler beim Laden der Reaktionen:", error);
      alert("Fehler beim Laden der Reaktionen.");
    }
  };

  const showSkeetContent = (id) => {
    setActiveCardTabs((current) => ({ ...current, [id]: "skeet" }));
  };

  /**
   * Replies-Tab aktivieren. Replies werden nur beim ersten Öffnen geladen und
   * anschließend im Cache gehalten, um Layout-Sprünge zu vermeiden.
   */
  const showRepliesContent = async (id) => {
    setActiveCardTabs((current) => ({ ...current, [id]: "replies" }));

    if (Object.prototype.hasOwnProperty.call(repliesBySkeet, id)) {
      return;
    }

    setLoadingReplies((current) => ({ ...current, [id]: true }));

    try {
      const res = await fetch(`/api/replies/${id}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Fehler beim Laden der Replies.");
        return;
      }
      const data = await res.json();
      setRepliesBySkeet((current) => ({ ...current, [id]: data }));
    } catch (error) {
      console.error("Fehler beim Laden der Replies:", error);
      alert("Fehler beim Laden der Replies.");
    } finally {
      setLoadingReplies((current) => ({ ...current, [id]: false }));
    }
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
    setDashboardView("planned");
  };

  const handleCancelEdit = () => {
    setEditingSkeet(null);
    setActiveTab("dashboard");
    setMenuOpen(false);
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
        <div className="dashboard-page">
          <h1>Bluesky Kampagnen-Dashboard</h1>

          <div className="dashboard-subtabs">
            <button
              className={classNames(
                "dashboard-subtab",
                dashboardView === "planned" && "active"
              )}
              onClick={() => setDashboardView("planned")}
            >
              🕒 Geplant
            </button>
            <button
              className={classNames(
                "dashboard-subtab",
                dashboardView === "published" && "active"
              )}
              onClick={() => setDashboardView("published")}
            >
              ✅ Veröffentlicht
            </button>
          </div>

          <div className="dashboard-subtab-content">
            <div className="dashboard-subtab-scroll">
              {dashboardView === "planned" ? (
                plannedSkeets.length > 0 ? (
                  <ul className="skeet-list">
                    {plannedSkeets.map((skeet) => (
                      <li key={skeet.id} className="skeet-item skeet-planned">
                        <div className="skeet-card-panel">
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
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>Keine geplanten Skeets.</p>
                )
              ) : publishedSkeets.length > 0 ? (
                <ul className="skeet-list">
                  {publishedSkeets.map((skeet) => {
                    const activeCardTab = activeCardTabs[skeet.id] ?? "skeet";
                    const replies = repliesBySkeet[skeet.id] ?? [];
                    const isLoading = Boolean(loadingReplies[skeet.id]);

                    return (
                      <li key={skeet.id} className="skeet-item skeet-published">
                        <div className="skeet-card-tabs">
                          <button
                            className={classNames(
                              "skeet-card-tab",
                              activeCardTab === "skeet" && "active"
                            )}
                            onClick={() => showSkeetContent(skeet.id)}
                          >
                            🗂 Skeet
                          </button>
                          <button
                            className={classNames(
                              "skeet-card-tab",
                              activeCardTab === "replies" && "active"
                            )}
                            onClick={() => showRepliesContent(skeet.id)}
                          >
                            💬 Antworten
                          </button>
                        </div>

                        <div className="skeet-card-panel">
                          {activeCardTab === "replies" ? (
                            <div className="skeet-card-replies">
                              {isLoading ? (
                                <p className="skeet-card-replies-loading">Antworten werden geladen…</p>
                              ) : replies.length > 0 ? (
                                <ul className="replies-list">
                                  {replies.map((reply, index) => (
                                    <li key={`${reply.authorHandle}-${reply.createdAt ?? index}`}>
                                      <p>
                                        <strong>{reply.authorHandle}</strong>
                                      </p>
                                      <p className="reply-content">{reply.content}</p>
                                      {reply.createdAt && (
                                        <p className="reply-meta">{formatTime(reply.createdAt)}</p>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="skeet-card-replies-empty">Keine Antworten vorhanden.</p>
                              )}
                            </div>
                          ) : (
                            <>
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
                              <div className="skeet-actions">
                                <button onClick={() => fetchReactions(skeet.id)}>
                                  Reaktionen anzeigen
                                </button>
                              </div>
                              <p className="skeet-stats">
                                Likes: {skeet.likesCount} | Reposts: {skeet.repostsCount}
                              </p>
                            </>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p>Keine veröffentlichten Skeets.</p>
              )}
            </div>
          </div>
        </div>
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
