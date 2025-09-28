import { useEffect, useRef, useState } from "react";
import {
  DownloadIcon,
  GearIcon,
  LayersIcon,
  MoonIcon,
  Pencil2Icon,
  ShadowIcon,
  SunIcon,
  UploadIcon,
  ViewHorizontalIcon,
} from "@radix-ui/react-icons";
import AppLayout from "./components/layout/AppLayout";
import DashboardView from "./components/views/DashboardView";
import ThreadDashboardView from "./components/views/ThreadDashboardView";
import SkeetForm from "./components/SkeetForm";
import ThreadForm from "./components/ThreadForm";
import ConfigPanel from "./components/ConfigPanel";
import { useSkeets } from "./hooks/useSkeets";
import { useThreadDetail, useThreads } from "./hooks/useThreads";
import { formatTime } from "./utils/formatTime";
import { getRepeatDescription } from "./utils/timeUtils";
import { useToast } from "./hooks/useToast";

const PLATFORM_LABELS = {
  bluesky: "Bluesky",
  mastodon: "Mastodon",
};

const NAV_ITEMS = [
  { id: "dashboard", label: "Übersicht", icon: ViewHorizontalIcon },
  {
    id: "threads",
    label: "Threads",
    icon: LayersIcon,
    children: [
      { id: "threads-overview", label: "Übersicht" },
      { id: "threads-plan", label: "Thread planen" },
    ],
  },
  { id: "skeetplaner", label: "Skeet planen", icon: Pencil2Icon },
  { id: "config", label: "Konfiguration", icon: GearIcon },
];

const HEADER_CAPTIONS = {
  dashboard: "Übersicht",
  "threads-overview": "Threads",
  "threads-plan": "Threadplaner",
  config: "Konfiguration",
  skeetplaner: "Skeetplaner",
};

const HEADER_TITLES = {
  dashboard: "Bluesky Kampagnen-Dashboard",
  "threads-overview": "Thread-Übersicht",
  "threads-plan": "Thread planen",
  config: "Einstellungen & Automatisierung",
  skeetplaner: "Skeet planen",
};

const THEMES = ["light", "dark", "midnight"];
const THEME_CONFIG = {
  light: { label: "Helles Theme", colorScheme: "light", icon: SunIcon },
  dark: { label: "Dunkles Theme", colorScheme: "dark", icon: MoonIcon },
  midnight: { label: "Mitternacht", colorScheme: "dark", icon: ShadowIcon },
};
const DEFAULT_THEME = THEMES[0];

function App() {
  const [activeView, setActiveView] = useState("dashboard");
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return DEFAULT_THEME;
    const stored = window.localStorage.getItem("theme");
    if (stored && THEMES.includes(stored)) {
      return stored;
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : DEFAULT_THEME;
  });
  const [userHasExplicitTheme, setUserHasExplicitTheme] = useState(() => {
    if (typeof window === "undefined") return false;
    const stored = window.localStorage.getItem("theme");
    return Boolean(stored && THEMES.includes(stored));
  });
  const [editingSkeet, setEditingSkeet] = useState(null);
  const [activeDashboardTab, setActiveDashboardTab] = useState("planned");
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [editingThreadId, setEditingThreadId] = useState(null);
  const importInputRef = useRef(null);
  const toast = useToast();

  const {
    plannedSkeets,
    publishedSkeets,
    deletedSkeets,
    loadSkeets,
    fetchReactions,
    showSkeetContent,
    showRepliesContent,
    activeCardTabs,
    repliesBySkeet,
    loadingReplies,
    loadingReactions,
    reactionStats,
    replyErrors,
  } = useSkeets();

  const { threads, loading: threadsLoading, error: threadsError, reload: reloadThreads } = useThreads();
  const { thread: editingThread, loading: loadingEditingThread } = useThreadDetail(editingThreadId, {
    autoLoad: Boolean(editingThreadId),
  });

  useEffect(() => {
    setEditingSkeet((current) => {
      if (!current) return current;
      const updated = [...plannedSkeets, ...publishedSkeets].find((entry) => entry.id === current.id);
      return updated ?? null;
    });
  }, [plannedSkeets, publishedSkeets]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const resolvedTheme = THEMES.includes(theme) ? theme : DEFAULT_THEME;
    const themeSettings = THEME_CONFIG[resolvedTheme];
    root.classList.toggle("dark", resolvedTheme === "dark");
    root.dataset.theme = resolvedTheme;
    root.style.colorScheme = themeSettings?.colorScheme ?? "light";
    if (userHasExplicitTheme) {
      window.localStorage.setItem("theme", resolvedTheme);
    } else {
      window.localStorage.removeItem("theme");
    }
  }, [theme, userHasExplicitTheme]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = (event) => {
      if (!userHasExplicitTheme) {
        setTheme(event.matches ? "dark" : "light");
      }
    };
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [userHasExplicitTheme]);

  const currentTheme = THEMES.includes(theme) ? theme : DEFAULT_THEME;
  const currentThemeConfig = THEME_CONFIG[currentTheme];
  const nextTheme = THEMES[(THEMES.indexOf(currentTheme) + 1) % THEMES.length];
  const nextThemeLabel = THEME_CONFIG[nextTheme]?.label ?? "Theme wechseln";
  const ThemeIcon = currentThemeConfig?.icon ?? SunIcon;

  const handleToggleTheme = () => {
    setUserHasExplicitTheme(true);
    setTheme((current) => {
      const currentTheme = THEMES.includes(current) ? current : DEFAULT_THEME;
      const currentIndex = THEMES.indexOf(currentTheme);
      const nextIndex = (currentIndex + 1) % THEMES.length;
      return THEMES[nextIndex];
    });
  };

  const handleExport = async () => {
    if (typeof window === "undefined") return;
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
      const fallback = `skeets-export-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
      const filename = match ? match[1] : fallback;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success({
        title: "Export bereit",
        description: `Datei ${filename} wurde heruntergeladen.`,
      });
    } catch (error) {
      console.error("Fehler beim Export der Skeets:", error);
      toast.error({
        title: "Export fehlgeschlagen",
        description: error.message || "Fehler beim Export der Skeets.",
      });
    } finally {
      setExporting(false);
    }
  };

  const handleImportClick = () => {
    importInputRef.current?.click();
  };

  const handleImportFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      let payload;
      try {
        payload = JSON.parse(text);
      } catch (error_) {
        console.error("Ungültiges JSON beim Import der Skeets:", error_);
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
      toast.success({
        title: "Import abgeschlossen",
        description: "Alle Skeets wurden erfolgreich importiert.",
      });
    } catch (error) {
      console.error("Fehler beim Import der Skeets:", error);
      toast.error({
        title: "Import fehlgeschlagen",
        description: error.message || "Fehler beim Import der Skeets.",
      });
    } finally {
      setImporting(false);
      if (event.target) event.target.value = "";
    }
  };

  const handleEdit = (skeet) => {
    setEditingSkeet(skeet);
    setActiveView("skeetplaner");
  };

  const handleDelete = async (skeet) => {
    const confirmed = window.confirm("Soll dieser geplante Skeet wirklich gelöscht werden?");
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/skeets/${skeet.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Fehler beim Löschen des Skeets.");
      }
      setEditingSkeet((current) => (current?.id === skeet.id ? null : current));
      await loadSkeets();
      toast.success({
        title: "Skeet gelöscht",
        description: "Der Skeet wurde gelöscht und kann im Papierkorb reaktiviert werden.",
      });
    } catch (error) {
      console.error("Fehler beim Löschen des Skeets:", error);
      toast.error({
        title: "Löschen fehlgeschlagen",
        description: error.message || "Fehler beim Löschen des Skeets.",
      });
    }
  };

  const handleRestore = async (skeet) => {
    try {
      const res = await fetch(`/api/skeets/${skeet.id}/restore`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Fehler beim Reaktivieren des Skeets.");
      }
      await loadSkeets();
      toast.success({
        title: "Skeet reaktiviert",
        description: "Der Skeet wurde wiederhergestellt und erscheint erneut in der Übersicht.",
      });
    } catch (error) {
      console.error("Fehler beim Reaktivieren des Skeets:", error);
      toast.error({
        title: "Reaktivierung fehlgeschlagen",
        description: error.message || "Fehler beim Reaktivieren des Skeets.",
      });
    }
  };

  const handlePermanentDelete = async (skeet) => {
    const confirmed = window.confirm(
      "Soll dieser Skeet endgültig gelöscht werden? Dieser Vorgang kann nicht rückgängig gemacht werden."
    );
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/skeets/${skeet.id}?permanent=1`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Fehler beim endgültigen Löschen des Skeets.");
      }
      setEditingSkeet((current) => (current?.id === skeet.id ? null : current));
      await loadSkeets();
      toast.success({
        title: "Skeet entfernt",
        description: "Der Skeet wurde dauerhaft gelöscht.",
      });
    } catch (error) {
      console.error("Fehler beim endgültigen Löschen des Skeets:", error);
      toast.error({
        title: "Endgültiges Löschen fehlgeschlagen",
        description: error.message || "Fehler beim endgültigen Löschen des Skeets.",
      });
    }
  };

  const handleEditThread = (thread) => {
    setEditingThreadId(thread?.id ?? null);
    setActiveView("threads-plan");
  };

  const handleDeleteThread = async (thread) => {
    if (!thread?.id) return;
    const label = thread.title || `Thread #${thread.id}`;
    const confirmed = window.confirm(`Soll "${label}" wirklich gelöscht werden?`);
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/threads/${thread.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Fehler beim Löschen des Threads.");
      }

      if (editingThreadId === thread.id) {
        setEditingThreadId(null);
      }

      await reloadThreads();

      toast.success({
        title: "Thread gelöscht",
        description: "Der Thread wurde entfernt.",
      });
    } catch (error) {
      console.error("Fehler beim Löschen des Threads:", error);
      toast.error({
        title: "Löschen fehlgeschlagen",
        description: error.message || "Fehler beim Löschen des Threads.",
      });
    }
  };

  const handleFormSaved = () => {
    setEditingSkeet(null);
    loadSkeets();
    setActiveView("dashboard");
    setActiveDashboardTab("planned");
  };

  const handleThreadSaved = () => {
    setEditingThreadId(null);
    reloadThreads();
    setActiveView("threads-overview");
  };

  const handleThreadDeleted = () => {
    setEditingThreadId(null);
    reloadThreads();
    setActiveView("threads-overview");
  };

  const handleCancelEdit = () => {
    setEditingSkeet(null);
    setActiveView("dashboard");
    toast.info({
      title: "Bearbeitung abgebrochen",
      description: "Der Skeet wurde nicht verändert.",
    });
  };

  const handleThreadCancel = () => {
    setEditingThreadId(null);
    setActiveView("threads-overview");
    toast.info({
      title: "Bearbeitung abgebrochen",
      description: "Der Thread wurde nicht verändert.",
    });
  };

  const headerCaption = HEADER_CAPTIONS[activeView] ?? "";
  const headerTitle = HEADER_TITLES[activeView] ?? NAV_ITEMS.find((item) => item.id === activeView)?.label ?? "";

  const headerActions = (
    <>
      <button
        type="button"
        onClick={handleToggleTheme}
        className="rounded-2xl border border-border bg-background-subtle p-2 text-foreground transition hover:bg-background"
        aria-label={`Theme wechseln - nächstes: ${nextThemeLabel}`}
        title={`Theme wechseln - nächstes: ${nextThemeLabel}`}
      >
        <ThemeIcon className="h-4 w-4" />
        <span className="sr-only">Aktuelles Theme: {currentThemeConfig?.label}</span>
      </button>
      <button
        type="button"
        onClick={handleExport}
        disabled={exporting}
        className="inline-flex items-center gap-2 rounded-2xl border border-border bg-background-subtle px-4 py-2 text-sm font-medium text-foreground-muted transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-70"
      >
        <DownloadIcon className="h-4 w-4" />
        {exporting ? "Export…" : "Export"}
      </button>
      <button
        type="button"
        onClick={handleImportClick}
        disabled={importing}
        className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:shadow-soft disabled:cursor-not-allowed disabled:opacity-70"
      >
        <UploadIcon className="h-4 w-4" />
        {importing ? "Import…" : "Import"}
      </button>
      <input
        ref={importInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={handleImportFileChange}
      />
    </>
  );

  let content = null;
  if (activeView === "dashboard") {
    content = (
      <DashboardView
        plannedSkeets={plannedSkeets}
        publishedSkeets={publishedSkeets}
        deletedSkeets={deletedSkeets}
        onEditSkeet={handleEdit}
        onDeleteSkeet={handleDelete}
        onRestoreSkeet={handleRestore}
        onPermanentDeleteSkeet={handlePermanentDelete}
        onFetchReactions={fetchReactions}
        onShowSkeetContent={showSkeetContent}
        onShowRepliesContent={showRepliesContent}
        activeCardTabs={activeCardTabs}
        repliesBySkeet={repliesBySkeet}
        replyErrors={replyErrors}
        loadingReplies={loadingReplies}
        loadingReactions={loadingReactions}
        reactionStats={reactionStats}
        formatTime={formatTime}
        getRepeatDescription={getRepeatDescription}
        platformLabels={PLATFORM_LABELS}
        activeTab={activeDashboardTab}
        onTabChange={setActiveDashboardTab}
      />
    );
  } else if (activeView === "threads-overview") {
    content = (
      <ThreadDashboardView
        threads={threads}
        loading={threadsLoading}
        error={threadsError}
        onReload={reloadThreads}
        onEditThread={handleEditThread}
        onDeleteThread={handleDeleteThread}
      />
    );
  } else if (activeView === "config") {
    content = <ConfigPanel />;
  } else if (activeView === "skeetplaner") {
    content = (
      <section className="rounded-3xl border border-border bg-background-elevated p-6 shadow-soft lg:p-10">
        <SkeetForm onSkeetSaved={handleFormSaved} editingSkeet={editingSkeet} onCancelEdit={handleCancelEdit} />
      </section>
    );
  } else if (activeView === "threads-plan") {
    content = (
      <section className="rounded-3xl border border-border bg-background-elevated p-6 shadow-soft lg:p-10">
        <ThreadForm
          key={editingThreadId || "new"}
          initialThread={editingThreadId ? editingThread : null}
          loading={Boolean(editingThreadId && loadingEditingThread && !editingThread)}
          onThreadSaved={handleThreadSaved}
          onThreadDeleted={handleThreadDeleted}
          onCancel={editingThreadId ? handleThreadCancel : undefined}
        />
      </section>
    );
  }

  return (
    <AppLayout
      navItems={NAV_ITEMS}
      activeView={activeView}
      onSelectView={setActiveView}
      headerCaption={headerCaption}
      headerTitle={headerTitle}
      headerActions={headerActions}
    >
      {content}
    </AppLayout>
  );
}

export default App;
