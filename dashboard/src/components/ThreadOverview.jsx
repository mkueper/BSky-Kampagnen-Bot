import { useState } from "react";
import { useToast } from "../hooks/useToast";
import Button from "./ui/Button";
import Card from "./ui/Card";
const PLATFORM_LABELS = { bluesky: "Bluesky", mastodon: "Mastodon" };

function parseThreadMetadata(thread) {
  const raw = thread?.metadata;
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (error) {
      console.warn("Konnte Thread-Metadaten nicht parsen:", error);
      return {};
    }
  }
  if (typeof raw === "object" && !Array.isArray(raw)) {
    return raw;
  }
  return {};
}

function resolvePublishedDate(thread) {
  const metadata = parseThreadMetadata(thread);
  const candidates = [metadata.lastSuccessAt, metadata.lastDispatchAt, thread?.updatedAt];

  if (Array.isArray(thread?.segments)) {
    const segmentDate = thread.segments.find((segment) => segment?.postedAt)?.postedAt;
    candidates.unshift(segmentDate);
  }

  for (const value of candidates) {
    if (!value) continue;
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }
  return null;
}

function formatScheduledLabel(thread) {
  const formatter = new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  if (thread?.status === "published") {
    const publishedDate = resolvePublishedDate(thread);
    if (publishedDate) {
      return `Veröffentlicht am: ${formatter.format(publishedDate)}`;
    }
    return "Veröffentlicht";
  }

  if (!thread?.scheduledAt) {
    return "Kein Termin geplant";
  }

  const date = new Date(thread.scheduledAt);
  if (Number.isNaN(date.getTime())) {
    return `Geplant für ${thread.scheduledAt}`;
  }

  if (thread.status === "scheduled") {
    return `Wird gepostet um: ${formatter.format(date)}`;
  }

  return `Geplant für: ${formatter.format(date)}`;
}

function ThreadOverview({
  threads,
  loading,
  error,
  onReload,
  onEditThread,
  onDeleteThread,
  onRestoreThread,
  onDestroyThread,
  onRetractThread,
  mode = "default",
  getItemRef,
}) {
  const [expandedThreads, setExpandedThreads] = useState({});
  const [showReplies, setShowReplies] = useState({});
  const [loadingRefresh, setLoadingRefresh] = useState({});
  const toast = useToast();

  const handleToggle = (threadId) => {
    setExpandedThreads((current) => ({ ...current, [threadId]: !current[threadId] }));
  };

  if (loading) {
    return (
      <section className="rounded-3xl border border-border bg-background-elevated p-6 shadow-soft">
        <p className="text-sm text-foreground-muted">Threads werden geladen…</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-3xl border border-destructive/50 bg-destructive/10 p-6 shadow-soft">
        <header className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-destructive">Threads konnten nicht geladen werden</h3>
          <button
            type="button"
            className="text-sm underline disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => (typeof onReload === "function" ? onReload() : undefined)}
            disabled={typeof onReload !== "function"}
          >
            Erneut versuchen
          </button>
        </header>
        <p className="text-sm text-destructive">
          {error?.message || "Unbekannter Fehler"}
        </p>
      </section>
    );
  }

  if (!threads || threads.length === 0) {
    return (
      <section className="rounded-3xl border border-border bg-background-elevated p-6 text-center shadow-soft">
        <h3 className="text-lg font-semibold">Noch keine Threads gespeichert</h3>
        <p className="mt-2 text-sm text-foreground-muted">
          Lege im Thread-Editor einen Thread an, um hier eine Vorschau zu sehen.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      {threads.map((thread) => {
        const segments = Array.isArray(thread.segments) ? thread.segments : [];
        const firstSegment = segments[0] || { content: "", characterCount: 0, sequence: 0 };
        const hasMore = segments.length > 1;
        const isExpanded = Boolean(expandedThreads[thread.id]);
        const isDeletedMode = mode === "deleted";
        const metadata = parseThreadMetadata(thread);
        const platformResults = metadata.platformResults && typeof metadata.platformResults === 'object' ? metadata.platformResults : {};
        const hasSentPlatforms = Object.values(platformResults).some((entry) => entry && entry.status === 'sent');
        const isDemo = (() => {
          try {
            // Demo-Kennzeichen: Segment-Flags oder demo:// IDs
            const anyDemoInPR = Object.values(platformResults).some((entry) => {
              if (!entry || typeof entry !== 'object') return false;
              if (entry.demo === true) return true;
              const segs = Array.isArray(entry.segments) ? entry.segments : [];
              return segs.some((s) => s && s.demo === true);
            });
            const segDemoId = Array.isArray(segments) && segments.some((seg) => typeof seg?.remoteId === 'string' && seg.remoteId.startsWith('demo://'));
            return Boolean(anyDemoInPR || segDemoId);
          } catch { return false; }
        })();
        const canRetract = !isDeletedMode && !isDemo && typeof onRetractThread === 'function' && (thread.status === 'published' || hasSentPlatforms);
        const canEdit = !isDeletedMode && typeof onEditThread === 'function' && thread.status !== 'published';

        // Aggregierte Reaktionen (Replies aus DB; Likes/Reposts bevorzugt aus Metadata-Totals)
        const reactionTotals = (() => {
          const acc = { replies: 0, likes: 0, reposts: 0, quotes: 0 };
          for (const seg of segments) {
            const reactions = Array.isArray(seg?.reactions) ? seg.reactions : [];
            for (const r of reactions) {
              const t = String(r?.type || '').toLowerCase();
              if (t === 'reply') acc.replies++;
              else if (t === 'like') acc.likes++;
              else if (t === 'repost') acc.reposts++;
              else if (t === 'quote') acc.quotes++;
            }
          }
          return acc;
        })();

        const metadataTotals = (() => {
          const total = { likes: 0, reposts: 0, replies: 0 };
          try {
            Object.values(platformResults).forEach((entry) => {
              const t = entry?.totals || {};
              total.likes += Number(t.likes) || 0;
              total.reposts += Number(t.reposts) || 0;
              total.replies += Number(t.replies) || 0;
            });
          } catch {}
          return total;
        })();

        const displayLikes = metadataTotals.likes || reactionTotals.likes;
        const displayReposts = metadataTotals.reposts || reactionTotals.reposts;
        const displayReplies = Math.max(reactionTotals.replies, metadataTotals.replies);

        const perPlatformTotals = (() => {
          const out = [];
          try {
            Object.entries(platformResults).forEach(([platformId, entry]) => {
              if (!entry || typeof entry !== 'object') return;
              const t = entry.totals || {};
              const likes = Number(t.likes) || 0;
              const reposts = Number(t.reposts) || 0;
              out.push({ platformId, likes, reposts });
            });
          } catch {}
          return out;
        })();

        const flatReplies = (() => {
          const out = [];
          for (const seg of segments) {
            const seq = Number(seg?.sequence) ?? 0;
            const reactions = Array.isArray(seg?.reactions) ? seg.reactions : [];
            for (const r of reactions) {
              if (String(r?.type).toLowerCase() === 'reply') {
                out.push({ sequence: seq, author: r.authorHandle || r.authorDisplayName || 'Unbekannt', content: r.content || '' });
              }
            }
          }
          return out;
        })();

        // Ermittele das jüngste metricsUpdatedAt für das erste Segment (sequence)
        const firstSeq = Number(firstSegment.sequence) || 0;
        const lastMetricsUpdatedAt = (() => {
          let latest = 0;
          try {
            Object.values(platformResults).forEach((entry) => {
              if (!entry || typeof entry !== 'object') return;
              const segs = Array.isArray(entry.segments) ? entry.segments : [];
              const seg = segs.find((s) => Number(s?.sequence) === firstSeq);
              const ts = seg?.metricsUpdatedAt || entry.metricsUpdatedAt || null;
              if (!ts) return;
              const t = new Date(ts).getTime();
              if (Number.isFinite(t) && t > latest) latest = t;
            });
          } catch {}
          return latest > 0 ? new Date(latest) : null;
        })();

        const formatUpdatedAt = (date) => {
          if (!date) return null;
          try {
            return new Intl.DateTimeFormat('de-DE', {
              day: '2-digit', month: '2-digit', year: 'numeric',
              hour: '2-digit', minute: '2-digit'
            }).format(date);
          } catch { return null; }
        };

        return (
          <Card key={thread.id} id={`thread-${thread.id}`} ref={typeof getItemRef === 'function' ? getItemRef(thread.id) : undefined}>
            <header className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  {thread.title || `Thread #${thread.id}`}
                </h3>
                <p className="text-sm text-foreground-muted">{formatScheduledLabel(thread)}</p>
              </div>
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-foreground-muted">
                {Array.isArray(thread.targetPlatforms) && thread.targetPlatforms.length
                  ? thread.targetPlatforms.join(" · ")
                  : "Keine Plattformen"}
              </div>
            </header>

            <div className="mt-4 space-y-3 text-sm">
              <div className="rounded-2xl border border-border bg-background-subtle p-4">
                <header className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-foreground-muted">
                  <span>Skeet 1</span>
                  <span>{firstSegment.characterCount ?? firstSegment.content?.length ?? 0} Zeichen</span>
                </header>
                <p className="whitespace-pre-wrap text-foreground">{firstSegment.content || "(leer)"}</p>
                {Array.isArray(firstSegment.media) && firstSegment.media.length > 0 ? (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {firstSegment.media.slice(0, 4).map((m, idx) => (
                      <div key={m.id || idx} className="relative h-28 overflow-hidden rounded-xl border border-border bg-background-subtle/70">
                        <img
                          src={m.previewUrl || ''}
                          alt={m.altText || `Bild ${idx + 1}`}
                          className="absolute inset-0 h-full w-full object-contain"
                          loading="lazy"
                        />
                      </div>
                    ))}
                  </div>
                ) : null}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-3 text-xs text-foreground-muted">
                    <span>Likes: <span className="font-medium text-foreground">{displayLikes}</span></span>
                    <span>Reposts: <span className="font-medium text-foreground">{displayReposts}</span></span>
                    <span>Antworten: <span className="font-medium text-foreground">{displayReplies}</span></span>
                    {lastMetricsUpdatedAt ? (
                      <span className="inline-flex items-center gap-1">
                        <span>·</span>
                        <span>
                          Zuletzt aktualisiert: <span className="font-medium text-foreground">{formatUpdatedAt(lastMetricsUpdatedAt)}</span>
                        </span>
                      </span>
                    ) : null}
                  </div>
                  {hasMore ? (
                    <button type="button" onClick={() => handleToggle(thread.id)} className="text-sm font-medium text-primary transition hover:underline">
                      {isExpanded ? "Weitere Skeets verbergen" : "Weitere Skeets anzeigen"}
                    </button>
                  ) : (
                    <span className="text-xs uppercase tracking-[0.2em] text-foreground-muted">Keine weiteren Skeets</span>
                  )}
                  <div className="flex items-center gap-2">
                    {isDeletedMode ? (
                      <>
                        <Button variant="primary" onClick={() => onRestoreThread?.(thread)}>Reaktivieren</Button>
                        <Button variant="destructive" onClick={() => onDestroyThread?.(thread)}>Endgültig löschen</Button>
                      </>
                    ) : (
                      <>
                        {flatReplies.length > 0 ? (
                          <Button variant="secondary" onClick={() => setShowReplies((c) => ({ ...c, [thread.id]: !c[thread.id] }))}>
                            {showReplies[thread.id] ? "Antworten verbergen" : `Antworten anzeigen (${flatReplies.length})`}
                          </Button>
                        ) : null}
                        {!isDemo && (
                        <Button
                          variant="primary"
                          onClick={async () => {
                            setLoadingRefresh((s) => ({ ...s, [thread.id]: true }));
                            try {
                              const res = await fetch(`/api/threads/${thread.id}/engagement/refresh`, { method: 'POST' });
                              if (!res.ok) {
                                const data = await res.json().catch(() => ({}));
                                throw new Error(data.error || 'Fehler beim Aktualisieren der Reaktionen.');
                              }
                              const data = await res.json().catch(() => null);
                              if (data && data.totals) {
                                const { likes = 0, reposts = 0, replies = 0 } = data.totals || {};
                                toast.success({
                                  title: 'Reaktionen aktualisiert',
                                  description: `Likes ${likes} · Reposts ${reposts} · Antworten ${replies}`,
                                });
                              } else {
                                toast.success({ title: 'Reaktionen aktualisiert', description: 'Kennzahlen wurden neu geladen.' });
                              }
                              if (typeof onReload === 'function') onReload();
                            } catch (e) {
                              console.error('Engagement-Refresh fehlgeschlagen:', e);
                              toast.error({ title: 'Aktualisierung fehlgeschlagen', description: e?.message || 'Fehler beim Aktualisieren der Reaktionen.' });
                            } finally {
                              setLoadingRefresh((s) => ({ ...s, [thread.id]: false }));
                            }
                          }}
                          disabled={Boolean(loadingRefresh[thread.id])}
                        >
                          {loadingRefresh[thread.id] ? 'Lädt…' : 'Reaktionen aktualisieren'}
                        </Button>
                        )}
                        {canEdit ? (
                          <Button variant="secondary" onClick={() => onEditThread?.(thread)}>Bearbeiten</Button>
                        ) : null}
                        {canRetract ? (
                          <Button variant="warning" onClick={() => onRetractThread?.(thread)}>
                            Entfernen
                          </Button>
                        ) : null}
                        <Button variant="destructive" onClick={() => onDeleteThread?.(thread)}>
                          Löschen
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {perPlatformTotals.length > 0 ? (
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {perPlatformTotals.map((p) => (
                      <div key={p.platformId} className="rounded-2xl border border-border bg-background-subtle/80 p-4 text-sm">
                        <p className="font-medium text-foreground">{PLATFORM_LABELS[p.platformId] || p.platformId}</p>
                        <p className="mt-1 text-foreground-muted">Likes {p.likes} · Reposts {p.reposts}</p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              {showReplies[thread.id] && flatReplies.length > 0 ? (
                <div className="rounded-2xl border border-border-muted bg-background-subtle/60 p-4">
                  <header className="mb-3 text-xs uppercase tracking-[0.2em] text-foreground-muted">
                    Antworten (neueste zuerst)
                  </header>
                  <ul className="space-y-2">
                    {flatReplies.slice().reverse().map((r, idx) => (
                      <li key={`${r.sequence}-${idx}`} className="rounded-xl border border-border bg-background p-3">
                        <div className="mb-1 text-xs text-foreground-muted">Skeet {r.sequence + 1}</div>
                        <div className="text-sm">
                          <span className="font-medium">{r.author}</span>: {r.content}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {isExpanded && hasMore ? (
                <div className="space-y-2 border-l border-border-muted pl-4 sm:pl-6">
                  {segments.slice(1).map((segment) => (
                    <div
                      key={segment.id ?? segment.sequence}
                      className="rounded-2xl border border-border bg-background-subtle/60 p-3"
                    >
                      <header className="mb-1 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-foreground-muted">
                        <span>Skeet {segment.sequence + 1}</span>
                        <span>{segment.characterCount} Zeichen</span>
                      </header>
                      <p className="whitespace-pre-wrap text-foreground">{segment.content}</p>
                      {Array.isArray(segment.media) && segment.media.length > 0 ? (
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          {segment.media.slice(0, 4).map((m, idx) => (
                            <div key={m.id || idx} className="relative h-24 overflow-hidden rounded-xl border border-border bg-background-subtle">
                              <img
                                src={m.previewUrl || ''}
                                alt={m.altText || `Bild ${idx + 1}`}
                                className="absolute inset-0 h-full w-full object-contain"
                                loading="lazy"
                              />
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </Card>
        );
      })}
    </section>
  );
}

export default ThreadOverview;
