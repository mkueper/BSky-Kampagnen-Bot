import { useEffect, useMemo, useState } from "react";
import { HamburgerMenuIcon, ChevronDownIcon, ChevronRightIcon } from "@radix-ui/react-icons";
import ScrollTopButton from "../ScrollTopButton";

/**
 * High-level layout wrapper for the dashboard application.
 *
 * Responsibilities:
 * - renders the persistent sidebar navigation and mobile overlay
 * - provides the sticky header with caller-supplied title/subtitle/actions
 * - positions the main content area and the global scroll-to-top button
 *
 * The component is intentionally dumb: navigation items and header content are
 * passed in from the outside so that the business logic can stay in App.jsx.
 */
function AppLayout({
  navItems,
  activeView,
  onSelectView,
  headerCaption,
  headerTitle,
  headerActions,
  children,
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  const activeNavItemLabel = useMemo(() => {
    for (const item of navItems) {
      if (item.id === activeView) {
        return item.label;
      }
      if (Array.isArray(item.children)) {
        const child = item.children.find((entry) => entry.id === activeView);
        if (child) {
          return child.label;
        }
      }
    }
    return "";
  }, [navItems, activeView]);

  const [openGroups, setOpenGroups] = useState(() => {
    const initial = {};
    navItems.forEach((item) => {
      if (Array.isArray(item.children) && item.children.length > 0) {
        const isActive = item.children.some((child) => child.id === activeView);
        initial[item.id] = isActive;
      }
    });
    return initial;
  });

  useEffect(() => {
    setOpenGroups((current) => {
      const next = { ...current };
      navItems.forEach((item) => {
        if (Array.isArray(item.children) && item.children.length > 0) {
          const isActive = item.children.some((child) => child.id === activeView);
          if (isActive) {
            next[item.id] = true;
          }
        }
      });
      return next;
    });
  }, [activeView, navItems]);

  const handleSelectView = (viewId) => {
    onSelectView(viewId);
    setMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-[1400px] px-3 py-6 sm:px-6 lg:px-10">
        <aside
          className={`fixed inset-y-6 left-3 z-30 w-64 rounded-3xl border border-border bg-background-elevated shadow-card transition-transform duration-200 md:static md:block md:translate-x-0 ${
            menuOpen ? "translate-x-0" : "-translate-x-[110%] md:-translate-x-0"
          }`}
          aria-label="Hauptnavigation"
        >
          <div className="flex h-full flex-col p-6">
            <div className="flex items-center justify-between pb-6">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-foreground-subtle">Control Center</p>
                <h1 className="mt-1 text-xl font-semibold">Kampagnen-Bot</h1>
              </div>
              <button
                type="button"
                className="rounded-full p-2 text-foreground-muted transition hover:bg-background-subtle hover:text-foreground md:hidden"
                onClick={() => setMenuOpen(false)}
              >
                <HamburgerMenuIcon className="h-5 w-5 rotate-180" />
                <span className="sr-only">Navigation schließen</span>
              </button>
            </div>

            <nav className="flex flex-1 flex-col gap-2">
              {navItems.map((item) => {
                const { id, label, icon: Icon, children } = item;
                const hasChildren = Array.isArray(children) && children.length > 0;
                const isChildActive = hasChildren ? children.some((child) => child.id === activeView) : false;
                const isActive = id === activeView || isChildActive;

                if (!hasChildren) {
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => handleSelectView(id)}
                      className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium transition ${
                        isActive ? "bg-primary text-primary-foreground shadow-soft" : "text-foreground-muted hover:bg-background-subtle"
                      }`}
                    >
                      {Icon ? <Icon className="h-5 w-5" /> : null}
                      <span>{label}</span>
                    </button>
                  );
                }

                const expanded = openGroups[id] ?? false;

                return (
                  <div key={id} className="space-y-2">
                    <button
                      type="button"
                      onClick={() => {
                        setOpenGroups((current) => ({ ...current, [id]: true }));
                        if (Array.isArray(children) && children.length > 0) {
                          handleSelectView(children[0].id);
                        }
                      }}
                      className={`flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium transition ${
                        isActive ? "bg-primary text-primary-foreground shadow-soft" : "text-foreground-muted hover:bg-background-subtle"
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        {Icon ? <Icon className="h-5 w-5" /> : null}
                        {label}
                      </span>
                      {expanded ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
                    </button>

                    {expanded ? (
                      <div className="ml-8 flex flex-col gap-2">
                        {children.map((child) => {
                          const childActive = child.id === activeView;
                          return (
                            <button
                              key={child.id}
                              type="button"
                              onClick={() => handleSelectView(child.id)}
                              className={`flex items-center gap-3 rounded-2xl px-4 py-2 text-left text-sm transition ${
                                childActive
                                  ? "bg-primary text-primary-foreground shadow-soft"
                                  : "text-foreground-muted hover:bg-background-subtle"
                              }`}
                            >
                              <span>{child.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
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
                  {headerCaption ? (
                    <p className="text-xs uppercase tracking-[0.25em] text-foreground-subtle">{headerCaption}</p>
                  ) : null}
                  <h2 className="text-xl font-semibold md:text-2xl">{headerTitle || activeNavItemLabel}</h2>
                </div>
              </div>

              {headerActions ? (
                <div className="flex items-center gap-2">{headerActions}</div>
              ) : null}
            </div>
          </header>

          <main className="space-y-8 pb-16">{children}</main>
          <ScrollTopButton />
        </div>
      </div>
    </div>
  );
}

export default AppLayout;
