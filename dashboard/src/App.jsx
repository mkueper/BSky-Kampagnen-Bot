import { useEffect, useRef, useState } from "react";
import SkeetForm from './SkeetForm';
import DashboardTabs from './components/DashboardTabs';
import PlannedSkeetList from './components/PlannedSkeetList';
import PublishedSkeetList from './components/PublishedSkeetList';
import { useSkeets } from './hooks/useSkeets';
import { formatTime } from './utils/formatTime';
import { classNames } from './utils/classNames';
import { getRepeatDescription } from './utils/timeUtils';
import './styles/App.css';

const PLATFORM_LABELS = {
  bluesky: "Bluesky",
  mastodon: "Mastodon",
};

function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [dashboardView, setDashboardView] = useState("planned");
  const {
    plannedSkeets,
    publishedSkeets,
    loadSkeets,
    fetchReactions,
    showSkeetContent,
    showRepliesContent,
    activeCardTabs,
    repliesBySkeet,
    loadingReplies,
    loadingReactions,
    reactionStats,
  } = useSkeets();
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
  useEffect(() => {
    setEditingSkeet((current) => {
      if (!current) return current;
      const updated = [...plannedSkeets, ...publishedSkeets].find((entry) => entry.id === current.id);
      return updated ?? null;
    });
  }, [plannedSkeets, publishedSkeets]);

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
                <PlannedSkeetList
                  skeets={plannedSkeets}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  getRepeatDescription={getRepeatDescription}
                />
              ) : (
                <PublishedSkeetList
                  skeets={publishedSkeets}
                  activeCardTabs={activeCardTabs}
                  repliesBySkeet={repliesBySkeet}
                  loadingReplies={loadingReplies}
                  loadingReactions={loadingReactions}
                  onShowSkeetContent={showSkeetContent}
                  onShowRepliesContent={showRepliesContent}
                  onFetchReactions={fetchReactions}
                  reactionStats={reactionStats}
                  platformLabels={PLATFORM_LABELS}
                  formatTime={formatTime}
                />
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
