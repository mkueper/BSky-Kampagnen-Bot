import { useEffect, useMemo, useRef, useState } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import {
  DownloadIcon,
  GearIcon,
  HamburgerMenuIcon,
  MoonIcon,
  Pencil2Icon,
  SunIcon,
  UploadIcon,
  ViewHorizontalIcon,
} from "@radix-ui/react-icons";
import PlannedSkeetList from "./components/PlannedSkeetList";
import PublishedSkeetList from "./components/PublishedSkeetList";
import SkeetForm from "./SkeetForm";
import { useSkeets } from "./hooks/useSkeets";
import { formatTime } from "./utils/formatTime";
import { getRepeatDescription } from "./utils/timeUtils";

const PLATFORM_LABELS = {
  bluesky: "Bluesky",
  mastodon: "Mastodon",
};

const NAV_ITEMS = [
  { id: "dashboard", label: "Übersicht", icon: ViewHorizontalIcon },
  { id: "config", label: "Konfiguration", icon: GearIcon },
  { id: "skeetplaner", label: "Skeet planen", icon: Pencil2Icon },
];

function SummaryCard({ title, value, helper }) {
  return (
    <div className="rounded-2xl border border-border bg-background-elevated shadow-soft transition hover:-translate-y-0.5 hover:shadow-card">
      <div className="space-y-1 p-5">
        <p className="text-sm font-medium text-foreground-muted">{title}</p>
        <p className="text-3xl font-semibold md:text-4xl">{value}</p>
        {helper ? <p className="text-xs text-foreground-subtle">{helper}</p> : null}
      </div>
    </div>
  );
}

function App() {
  const [activeView, setActiveView] = useState("dashboard");
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "light";
    const stored = window.localStorage.getItem("theme");
    if (stored === "light" || stored === "dark") {
      return stored;
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
  const [userHasExplicitTheme, setUserHasExplicitTheme] = useState(() => {
    if (typeof window === "undefined") return false;
    const stored = window.localStorage.getItem("theme");
    return stored === "light" || stored === "dark";
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const [editingSkeet, setEditingSkeet] = useState(null);
  const [activeDashboardTab, setActiveDashboardTab] = useState("planned");
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const importInputRef = useRef(null);

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
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
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
      if (!userHasExplicitTheme) {
        setTheme(event.matches ? "dark" : "light");
      }
    };
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [userHasExplicitTheme]);

  const handleToggleTheme = () => {
    setUserHasExplicitTheme(true);
    setTheme((current) => (current === "light" ? "dark" : "light"));
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
    } catch (error) {
      console.error("Fehler beim Export der Skeets:", error);
      window.alert(error.message || "Fehler beim Export der Skeets.");
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
      window.alert("Import erfolgreich abgeschlossen.");
    } catch (error) {
      console.error("Fehler beim Import der Skeets:", error);
      window.alert(error.message || "Fehler beim Import der Skeets.");
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
    } catch (error) {
      console.error("Fehler beim Löschen des Skeets:", error);
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
              {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
                const isActive = id === activeView;
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

            <div className="mt-6 flex items-center justify-between rounded-2xl bg-background-subtle p-4">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-foreground-subtle">Theme</p>
                <p className="text-sm font-medium">
                  {theme === "light" ? "Helles Design" : "Dunkles Design"}
                </p>
              </div>
              <button
                type="button"
                className="rounded-full bg-background-elevated p-2 text-foreground transition hover:bg-primary hover:text-primary-foreground"
                onClick={handleToggleTheme}
                aria-label={theme === "light" ? "Dunkles Theme aktivieren" : "Helles Theme aktivieren"}
              >
                {theme === "light" ? <MoonIcon className="h-5 w-5" /> : <SunIcon className="h-5 w-5" />}
              </button>
            </div>
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
                  <SummaryCard title="Geplante Skeets" value={plannedSkeets.length} helper="Nächste Veröffentlichung im Blick" />
                  <SummaryCard
                    title="Veröffentlichte Skeets"
                    value={publishedSkeets.length}
                    helper={`Likes ${aggregatedMetrics.likes} • Reposts ${aggregatedMetrics.reposts}`}
                  />
                  <SummaryCard
                    title="Nächster Termin"
                    value={upcomingSkeet ? formatTime(upcomingSkeet.scheduledAt || upcomingSkeet.scheduledDate) : "–"}
                    helper={upcomingSkeet ? upcomingSkeet.content.slice(0, 48) + (upcomingSkeet.content.length > 48 ? "…" : "") : "Noch nichts geplant"}
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

            {activeView === "config" && (
              <section className="grid gap-6 md:grid-cols-2">
                <div className="rounded-3xl border border-border bg-background-elevated p-8 shadow-soft">
                  <h3 className="text-xl font-semibold">Veröffentlichungsfenster</h3>
                  <p className="mt-2 text-sm text-foreground-muted">
                    Plane, wie häufig der Scheduler neue Skeets prüft, steuere die Zeitzone und konfiguriere optional Mastodon.
                    Weitere Automatisierungsschritte kannst du hier ergänzen.
                  </p>
                  <ul className="mt-6 space-y-4 text-sm text-foreground-muted">
                    <li className="flex items-start gap-3">
                      <span className="mt-1 h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
                      <span><strong>Cron & Zeitzone:</strong> Werte aus deiner <code>.env</code> wie <code>SCHEDULE_TIME</code> und <code>TIME_ZONE</code>.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="mt-1 h-2 w-2 rounded-full bg-accent" aria-hidden="true" />
                      <span><strong>Retry-Strategie:</strong> Passe <code>POST_RETRIES</code> und Backoff-Einstellungen direkt an.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="mt-1 h-2 w-2 rounded-full bg-foreground-muted" aria-hidden="true" />
                      <span><strong>Security:</strong> Bewahre App-Passwörter sicher in <code>.env</code> oder im Secret-Store auf.</span>
                    </li>
                  </ul>
                </div>
                <div className="rounded-3xl border border-border bg-background-elevated p-8 shadow-soft">
                  <h3 className="text-xl font-semibold">Next Steps</h3>
                  <p className="mt-2 text-sm text-foreground-muted">
                    Dieser Bereich ist vorbereitet für detaillierte UI-Controls (z. B. Pro-Plattform Settings oder Notification-Trigger).
                    Ergänze hier gerne weitere Sektionen wie automatisierte Antworten oder Analytics.
                  </p>
                  <div className="mt-6 rounded-2xl border border-dashed border-border-muted p-6 text-sm text-foreground-muted">
                    <p className="font-medium text-foreground">Ideen für kommende Features</p>
                    <ul className="mt-3 space-y-2">
                      <li>• Webhooks für eingehende Replies</li>
                      <li>• Automatische Veröffentlichung mehrerer Skeets im Thread</li>
                      <li>• Export nach CSV / Markdown</li>
                    </ul>
                  </div>
                </div>
              </section>
            )}

            {activeView === "skeetplaner" && (
              <section className="rounded-3xl border border-border bg-background-elevated p-6 shadow-soft lg:p-10">
                <SkeetForm onSkeetSaved={handleFormSaved} editingSkeet={editingSkeet} onCancelEdit={handleCancelEdit} />
              </section>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

export default App;
