import { useEffect, useMemo, useRef, useState } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import {
  DownloadIcon,
  GearIcon,
  HamburgerMenuIcon,
  MoonIcon,
  ShadowIcon,
  Pencil2Icon,
  SunIcon,
  UploadIcon,
  ViewHorizontalIcon,
} from "@radix-ui/react-icons";
import PlannedSkeetList from "./components/PlannedSkeetList";
import PublishedSkeetList from "./components/PublishedSkeetList";
import SkeetForm from "./components/SkeetForm";
import ConfigPanel from "./components/ConfigPanel";
import ScrollTopButton from "./components/ScrollTopButton";
import { useSkeets } from "./hooks/useSkeets";
import { formatTime } from "./utils/formatTime";
import { getRepeatDescription } from "./utils/timeUtils";
import { useToast } from "./hooks/useToast";

const PLATFORM_LABELS = {
  bluesky: "Bluesky",
  mastodon: "Mastodon",
};

const NAV_ITEMS = [
  { id: "dashboard", label: "Übersicht", icon: ViewHorizontalIcon },
  { id: "config", label: "Konfiguration", icon: GearIcon },
  { id: "skeetplaner", label: "Skeet planen", icon: Pencil2Icon },
];

const THEMES = ["light", "dark", "midnight"];
const THEME_CONFIG = {
  light: { label: "Helles Theme", colorScheme: "light", icon: SunIcon },
  dark: { label: "Dunkles Theme", colorScheme: "dark", icon: MoonIcon },
  midnight: { label: "Mitternacht", colorScheme: "dark", icon: ShadowIcon },
};
const DEFAULT_THEME = THEMES[0];

function SummaryCard({ title, value, helper }) {
  return (
    <div className="rounded-2xl border border-border bg-background-elevated shadow-soft transition hover:-translate-y-0.5 hover:shadow-card">
      <div className="space-y-3 p-5">
        <p className="text-sm font-medium text-foreground-muted">{title}</p>
        <p className="text-3xl font-semibold md:text-4xl">{value}</p>
        {helper ? <div className="space-y-2 text-sm leading-relaxed text-foreground-muted">{helper}</div> : null}
      </div>
    </div>
  );
}

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
  const [menuOpen, setMenuOpen] = useState(false);
  const [editingSkeet, setEditingSkeet] = useState(null);
  const [activeDashboardTab, setActiveDashboardTab] = useState("planned");
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const importInputRef = useRef(null);
  const toast = useToast();

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
    replyErrors,
  } = useSkeets();

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
        description: "Der geplante Skeet wurde entfernt.",
      });
    } catch (error) {
      console.error("Fehler beim Löschen des Skeets:", error);
      toast.error({
        title: "Löschen fehlgeschlagen",
        description: error.message || "Fehler beim Löschen des Skeets.",
      });
    }
  };

  const handleFormSaved = () => {
    setEditingSkeet(null);
    loadSkeets();
    setActiveView("dashboard");
    setActiveDashboardTab("planned");
  };

  const handleCancelEdit = () => {
    setEditingSkeet(null);
    setActiveView("dashboard");
    setMenuOpen(false);
    toast.info({
      title: "Bearbeitung abgebrochen",
      description: "Der Skeet wurde nicht verändert.",
    });
  };

  const upcomingSkeet = useMemo(() => {
    const entries = plannedSkeets
      .map((skeet) => {
        if (!skeet.scheduledAt) return null;
        const date = new Date(skeet.scheduledAt);
        return Number.isNaN(date.getTime()) ? null : { ...skeet, scheduledDate: date };
      })
      .filter(Boolean)
      .sort((a, b) => a.scheduledDate - b.scheduledDate);
    return entries[0] ?? null;
  }, [plannedSkeets]);

  const aggregatedMetrics = useMemo(() => {
    const likes = publishedSkeets.reduce((acc, skeet) => acc + (Number(skeet.likesCount) || 0), 0);
    const reposts = publishedSkeets.reduce((acc, skeet) => acc + (Number(skeet.repostsCount) || 0), 0);
    return { likes, reposts };
  }, [publishedSkeets]);

  const overviewStats = useMemo(() => [
    { label: "Geplante Skeets", value: plannedSkeets.length },
    { label: "Veröffentlichte Skeets", value: publishedSkeets.length },
    { label: "Likes gesamt", value: aggregatedMetrics.likes },
    { label: "Reposts gesamt", value: aggregatedMetrics.reposts },
  ], [plannedSkeets.length, publishedSkeets.length, aggregatedMetrics]);

  const upcomingDate = upcomingSkeet ? formatTime(upcomingSkeet.scheduledAt || upcomingSkeet.scheduledDate, "dateOnly") : '-';
  const upcomingTime = upcomingSkeet ? formatTime(upcomingSkeet.scheduledAt || upcomingSkeet.scheduledDate, "timeOnly") : null;
  const upcomingSnippet = useMemo(() => {
    if (!upcomingSkeet) return null;
    const normalized = (upcomingSkeet.content ?? "").replace(/\s+/g, " ").trim();
    if (!normalized) return "Kein Inhalt hinterlegt";
    return normalized.length > 200 ? `${normalized.slice(0, 200)}…` : normalized;
  }, [upcomingSkeet]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-[1400px] px-3 py-6 sm:px-6 lg:px-10">
        <aside
          className={`
            fixed inset-y-6 left-3 z-30 w-64 rounded-3xl border border-border bg-background-elevated shadow-card transition-transform duration-200
            md:static md:block md:translate-x-0 ${menuOpen ? "translate-x-0" : "-translate-x-[110%] md:-translate-x-0"}
          `}
        >
          <div className="flex h-full flex-col p-6">
            <div className="flex items-center justify-between pb-6">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-foreground-subtle">Control Center</p>
                <h1 className="mt-1 text-xl font-semibold">Kampagnen-Bot</h1>
              </div>
              <button
                type="button"
                className="rounded-full p-2 text-foreground-muted transition hover:bg-background-subtle hover:text-foreground"
                onClick={() => setMenuOpen(false)}
              >
                <HamburgerMenuIcon className="h-5 w-5 rotate-180 md:hidden" />
                <span className="sr-only">Navigation schließen</span>
              </button>
            </div>

            <nav className="flex flex-1 flex-col gap-2">
              {NAV_ITEMS.map((navItem) => {
                const { id, label, icon } = navItem;
                const isActive = id === activeView;
                const Icon = icon;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setActiveView(id);
                      setMenuOpen(false);
                    }}
                    className={`
                      flex items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium transition
                      ${isActive ? "bg-primary text-primary-foreground shadow-soft" : "text-foreground-muted hover:bg-background-subtle"}
                    `}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{label}</span>
                  </button>
                );
              })}
            </nav>

          </div>
        </aside>

        {menuOpen ? (
          <div
            className="fixed inset-0 z-20 bg-gradient-to-br from-black/30 via-black/20 to-black/40 backdrop-blur-sm md:hidden"
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />
        ) : null}

        <div className="ml-0 flex-1 md:ml-8">
          <header className="sticky top-0 z-10 mb-6 rounded-3xl border border-border bg-background-elevated/80 px-5 py-4 shadow-soft backdrop-blur supports-[backdrop-filter]:bg-background-elevated/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="rounded-2xl border border-border-muted bg-background-subtle/80 p-2 text-foreground-muted transition hover:bg-background-subtle md:hidden"
                  onClick={() => setMenuOpen(true)}
                >
                  <HamburgerMenuIcon className="h-5 w-5" />
                  <span className="sr-only">Navigation öffnen</span>
                </button>
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-foreground-subtle">
                    {activeView === "dashboard" ? "Übersicht" : activeView === "config" ? "Konfiguration" : "Skeetplaner"}
                  </p>
                  <h2 className="text-xl font-semibold md:text-2xl">
                    {activeView === "dashboard" && "Bluesky Kampagnen-Dashboard"}
                    {activeView === "config" && "Einstellungen & Automatisierung"}
                    {activeView === "skeetplaner" && (editingSkeet ? "Skeet bearbeiten" : "Neuen Skeet planen")}
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-2">
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
              </div>
            </div>
          </header>

          <main className="space-y-8 pb-16">
            {activeView === "dashboard" && (
              <div className="space-y-8">
                <section className="grid gap-4 md:grid-cols-3">
                  <article className="rounded-3xl border border-border bg-background-elevated shadow-soft md:col-span-2">
                    <div className="flex flex-col gap-4 p-6">
                      <div>
                        <h3 className="text-lg font-semibold">Kampagnen-Überblick</h3>
                        <p className="text-sm text-foreground-muted">Status deiner geplanten und veröffentlichten Skeets.</p>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        {overviewStats.map(({ label, value }) => (
                          <div key={label} className="rounded-2xl border border-border-muted bg-background-subtle/60 px-4 py-3">
                            <p className="text-xs uppercase tracking-[0.3em] text-foreground-muted">{label}</p>
                            <p className="mt-2 text-3xl font-semibold text-foreground md:text-4xl">{value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </article>
                  <SummaryCard
                    title="Nächster Termin"
                    value={upcomingDate}
                    helper={upcomingSkeet ? (
                      <div className="space-y-3">
                        {upcomingTime ? <span className="block font-semibold text-foreground">{`${upcomingTime} Uhr`}</span> : null}
                        <div className="rounded-2xl border border-border-muted bg-background-subtle/70 px-4 py-3 text-foreground">
                          {upcomingSnippet}
                        </div>
                      </div>
                    ) : "Noch nichts geplant"}
                  />
                </section>

                <section className="rounded-3xl border border-border bg-background-elevated shadow-soft">
                  <div className="flex flex-col gap-4 border-b border-border-muted px-6 py-5 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">Campaign Activity</h3>
                      <p className="text-sm text-foreground-muted">Verwalte geplante und veröffentlichte Skeets inklusive Replies & Reaktionen.</p>
                    </div>
                    <Tabs.Root value={activeDashboardTab} onValueChange={setActiveDashboardTab} className="inline-flex rounded-full bg-background-subtle p-1 text-sm font-medium">
                      <Tabs.List className="flex">
                        <Tabs.Trigger
                          value="planned"
                          className={`rounded-full px-4 py-2 transition ${
                            activeDashboardTab === "planned"
                              ? "bg-background-elevated shadow-soft"
                              : "text-foreground-muted hover:text-foreground"
                          }`}
                        >
                          Geplant
                        </Tabs.Trigger>
                        <Tabs.Trigger
                          value="published"
                          className={`rounded-full px-4 py-2 transition ${
                            activeDashboardTab === "published"
                              ? "bg-background-elevated shadow-soft"
                              : "text-foreground-muted hover:text-foreground"
                          }`}
                        >
                          Veröffentlicht
                        </Tabs.Trigger>
                      </Tabs.List>
                    </Tabs.Root>
                  </div>

                  <div className="px-6 pb-6">
                    {activeDashboardTab === "planned" ? (
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
            replyErrors={replyErrors}
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
                </section>
              </div>
            )}

            {activeView === "config" && <ConfigPanel />}

            {activeView === "skeetplaner" && (
              <section className="rounded-3xl border border-border bg-background-elevated p-6 shadow-soft lg:p-10">
                <SkeetForm onSkeetSaved={handleFormSaved} editingSkeet={editingSkeet} onCancelEdit={handleCancelEdit} />
              </section>
            )}
          </main>
          <ScrollTopButton />
        </div>
      </div>
    </div>
  );
}

export default App;
