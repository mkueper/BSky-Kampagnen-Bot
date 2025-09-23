import { useCallback, useEffect, useRef, useState } from "react";
import SkeetForm from "./SkeetForm";
import PlatformBadges from "./components/PlatformBadges";
import DashboardTabs from "./components/DashboardTabs";
import { formatTime } from "./utils/formatTime";
import { classNames } from "./utils/classNames";
import { getRepeatDescription } from "./utils/timeUtils";
import "./styles/App.css";

const PLATFORM_LABELS = {
  bluesky: "Bluesky",
  mastodon: "Mastodon",
};

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
  const [dashboardView, setDashboardView] = useState("planned");
  const [skeets, setSkeets] = useState([]);
  const [repliesBySkeet, setRepliesBySkeet] = useState({});
  const [activeCardTabs, setActiveCardTabs] = useState({});
  const [loadingReplies, setLoadingReplies] = useState({});
  const [loadingReactions, setLoadingReactions] = useState({});
  const [reactionStats, setReactionStats] = useState({});
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") {
      return "light";
    }
    const stored = window.localStorage.getItem("theme");
    if (stored === "light" || stored === "dark") {
      return stored;
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
  const [userHasExplicitTheme, setUserHasExplicitTheme] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }
    const stored = window.localStorage.getItem("theme");
    return stored === "light" || stored === "dark";
  });
  const [editingSkeet, setEditingSkeet] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const importFileInputRef = useRef(null);
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

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
    if (userHasExplicitTheme) {
      window.localStorage.setItem("theme", theme);
    } else {
      window.localStorage.removeItem("theme");
    }
  }, [theme, userHasExplicitTheme]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = (event) => {
      if (userHasExplicitTheme) {
        return;
      }
      setTheme(event.matches ? "dark" : "light");
    };
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [userHasExplicitTheme]);

  const toggleTheme = () => {
    setUserHasExplicitTheme(true);
    setTheme((current) => (current === "light" ? "dark" : "light"));
  };

  /**
   * Skeets vom Backend anfordern, JSON-Felder normalisieren und lokale States synchron halten.
   */
  const loadSkeets = useCallback(async () => {
    try {
      const res = await fetch("/api/skeets");
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Fehler beim Laden der Skeets.");
      }

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
    } catch (error) {
      console.error("Fehler beim Laden der Skeets:", error);
    }
  }, []);

  useEffect(() => {
    loadSkeets();
  }, [loadSkeets]);


const handleExport = async () => {
  if (typeof window === "undefined") {
    return;
  }
  setExporting(true);
  try {
    const res = await fetch("/api/skeets/export");
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Fehler beim Export der Skeets.");
    }

    const blob = await res.blob();
    const disposition = res.headers.get("Content-Disposition") || "";
    const match = disposition.match(/filename="?([^";]+)"?/i);
    const fallbackName = `skeets-export-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    const filename = match ? match[1] : fallbackName;

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Fehler beim Export der Skeets:", error);
    if (typeof window !== "undefined") {
      window.alert(error.message || "Fehler beim Export der Skeets.");
    }
  } finally {
    setExporting(false);
  }
};

const handleImportClick = () => {
  importFileInputRef.current?.click();
};

const handleImportFileChange = async (event) => {
  const file = event.target.files && event.target.files[0];
  if (!file) {
    return;
  }

  setImporting(true);
  try {
    const text = await file.text();
    let payload;
    try {
      payload = JSON.parse(text);
    } catch (parseError) {
      throw new Error("Die ausgewählte Datei enthält kein gültiges JSON.");
    }

    const res = await fetch("/api/skeets/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Fehler beim Import der Skeets.");
    }

    await loadSkeets();
    if (typeof window !== "undefined") {
      window.alert("Import erfolgreich abgeschlossen.");
    }
  } catch (error) {
    console.error("Fehler beim Import der Skeets:", error);
    if (typeof window !== "undefined") {
      window.alert(error.message || "Fehler beim Import der Skeets.");
    }
  } finally {
    setImporting(false);
    if (event.target) {
      event.target.value = "";
    }
  }
};


  /**
   * Likes/Reposts eines Skeets nachladen. Anschließend wird die gesamte
   * Liste aktualisiert, damit auch parallele Änderungen sichtbar werden.
   */
  const fetchReactions = async (id) => {
    setLoadingReactions((current) => ({ ...current, [id]: true }));

    try {
      const res = await fetch(`/api/reactions/${id}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Fehler beim Laden der Reaktionen.");
      }

      const data = await res.json();
      setReactionStats((current) => ({ ...current, [id]: data }));

      await loadSkeets();

      const total = data?.total ?? {};
      const totalLikes = typeof total.likes === "number" ? total.likes : "?";
      const totalReposts = typeof total.reposts === "number" ? total.reposts : "?";
      console.info(`Reaktionen für ${id}: Likes ${totalLikes}, Reposts ${totalReposts}`, data);
      if (data?.errors) {
        console.warn(`Fehler beim Abrufen einzelner Plattformen für ${id}:`, data.errors);
      }
    } catch (error) {
      console.error("Fehler beim Laden der Reaktionen:", error);
    } finally {
      setLoadingReactions((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
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
        console.error("Fehler beim Laden der Replies:", data.error || "Unbekannter Fehler");
        return;
      }
      const data = await res.json();
      setRepliesBySkeet((current) => ({ ...current, [id]: data }));
    } catch (error) {
      console.error("Fehler beim Laden der Replies:", error);
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

    try {
      const res = await fetch(`/api/skeets/${skeet.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Fehler beim Löschen des Skeets.");
      }

      setEditingSkeet((current) => (current?.id === skeet.id ? null : current));
      await loadSkeets();
    } catch (error) {
      console.error("Fehler beim Löschen des Skeets:", error);
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
        <div className="menu-actions">
          <button
            className="burger-button"
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            ☰ Menü
          </button>
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={theme === "light" ? "Dunkles Theme aktivieren" : "Helles Theme aktivieren"}
            title={theme === "light" ? "Dunkles Theme aktivieren" : "Helles Theme aktivieren"}
          >
            {theme === "light" ? "🌙" : "☀️"}
          </button>
        </div>

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

          <DashboardTabs
            view={dashboardView}
            onChangeView={setDashboardView}
            exporting={exporting}
            importing={importing}
            onExport={handleExport}
            onImportClick={handleImportClick}
            onFileSelected={handleImportFileChange}
            importInputRef={importFileInputRef}
          />

          <div className="dashboard-subtab-content">
            <div className="dashboard-subtab-scroll">
              {dashboardView === "planned" ? (
                plannedSkeets.length > 0 ? (
                  <ul className="skeet-list">
                    {plannedSkeets.map((skeet) => (
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
                    const isFetchingReactions = Boolean(loadingReactions[skeet.id]);

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
                          <PlatformBadges skeet={skeet} />
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
                                <button
                                  onClick={() => fetchReactions(skeet.id)}
                                  disabled={isFetchingReactions}
                                >
                                  {isFetchingReactions ? "Lädt…" : "Reaktionen anzeigen"}
                                </button>
                              </div>
                              <p className="skeet-stats">
                                Likes: {skeet.likesCount} | Reposts: {skeet.repostsCount}
                              </p>
                              {reactionStats[skeet.id]?.platforms &&
                                Object.keys(reactionStats[skeet.id].platforms).length > 0 && (
                                  <div className="skeet-reactions-breakdown">
                                    {Object.entries(reactionStats[skeet.id].platforms).map(
                                      ([platformId, stats]) => (
                                        <p key={platformId} className="skeet-reactions-entry">
                                          {PLATFORM_LABELS[platformId] || platformId}:
                                          {" "}
                                          Likes {stats.likes} | Reposts {stats.reposts}
                                        </p>
                                      )
                                    )}
                                    {reactionStats[skeet.id]?.errors && (
                                      <p className="skeet-reactions-error">
                                        Fehler: {Object.values(reactionStats[skeet.id].errors).join(", ")}
                                      </p>
                                    )}
                                  </div>
                                )}
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
