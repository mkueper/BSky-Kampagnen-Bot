import { FormEvent, useEffect, useMemo, useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { save as showSaveDialog } from '@tauri-apps/api/dialog';
import { writeTextFile } from '@tauri-apps/api/fs';
import './styles.css';
import {
  AVAILABLE_PLATFORMS,
  RECURRENCE_OPTIONS,
  WEEKDAY_OPTIONS,
  formatScheduleSummary,
  formatSkeetDraft,
} from '@bsky-bot/shared';

type Recurrence = (typeof RECURRENCE_OPTIONS)[number]['id'];

type Draft = {
  id: string;
  body: string;
  platforms: string[];
  recurrence: Recurrence;
  scheduledDate: string | null;
  scheduledTime: string;
  repeatDayOfWeek: number | null;
  repeatDayOfMonth: number | null;
  updatedAt: string;
};

type DefaultSchedule = {
  date: string;
  time: string;
};

const DEFAULT_PLATFORMS = AVAILABLE_PLATFORMS.map((platform) => platform.id);
const JSON_SPACES = 2;

function getDefaultSchedule(): DefaultSchedule {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  const year = tomorrow.getFullYear();
  const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const day = String(tomorrow.getDate()).padStart(2, '0');
  return { date: `${year}-${month}-${day}`, time: '09:00' };
}

function createDraftId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `draft-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}

function computeDraftIso(draft: Draft, defaults: DefaultSchedule): string {
  const timeValue = draft.scheduledTime || defaults.time;
  if (draft.recurrence === 'none') {
    const dateValue = draft.scheduledDate || defaults.date;
    return `${dateValue}T${timeValue}`;
  }
  const today = new Date();
  const datePart = today.toISOString().slice(0, 10);
  return `${datePart}T${timeValue}`;
}

function formatDraftSummary(draft: Draft, defaults: DefaultSchedule): string {
  return formatScheduleSummary({
    scheduledFor: computeDraftIso(draft, defaults),
    recurrence: draft.recurrence,
    repeatDayOfWeek: draft.repeatDayOfWeek ?? undefined,
    repeatDayOfMonth: draft.repeatDayOfMonth ?? undefined,
  });
}

function formatDraftSnippet(body: string): string {
  const trimmed = body.trim();
  if (!trimmed) {
    return '—';
  }
  if (trimmed.length <= 160) {
    return trimmed;
  }
  return `${trimmed.slice(0, 160)}…`;
}

function normalizeDrafts(input: unknown, defaults: DefaultSchedule): Draft[] {
  const rawDrafts = Array.isArray(input) ? input : [];
  const now = new Date().toISOString();

  const normalized = rawDrafts
    .map((raw) => {
      if (typeof raw !== 'object' || raw === null) {
        return null;
      }

      const draft = raw as Record<string, unknown>;
      const id = typeof draft.id === 'string' && draft.id.trim().length > 0 ? draft.id : createDraftId();
      const body = typeof draft.body === 'string' ? draft.body : '';
      const recurrence =
        typeof draft.recurrence === 'string' && RECURRENCE_OPTIONS.some((option) => option.id === draft.recurrence)
          ? (draft.recurrence as Recurrence)
          : 'none';

      const scheduledTime =
        typeof draft.scheduledTime === 'string' && draft.scheduledTime.trim().length > 0
          ? draft.scheduledTime
          : defaults.time;

      const scheduledDate =
        recurrence === 'none'
          ? typeof draft.scheduledDate === 'string' && draft.scheduledDate.trim().length > 0
            ? draft.scheduledDate
            : defaults.date
          : null;

      const repeatDayOfWeek =
        recurrence === 'weekly' && typeof draft.repeatDayOfWeek === 'number'
          ? draft.repeatDayOfWeek
          : null;
      const repeatDayOfMonth =
        recurrence === 'monthly' && typeof draft.repeatDayOfMonth === 'number'
          ? draft.repeatDayOfMonth
          : null;

      const platforms = Array.isArray(draft.platforms)
        ? draft.platforms.filter((entry) => typeof entry === 'string')
        : DEFAULT_PLATFORMS;
      const uniquePlatforms = platforms.length > 0 ? Array.from(new Set(platforms)) : [...DEFAULT_PLATFORMS];

      const updatedAt = typeof draft.updatedAt === 'string' && draft.updatedAt.trim().length > 0 ? draft.updatedAt : now;

      return {
        id,
        body,
        platforms: uniquePlatforms,
        recurrence,
        scheduledDate,
        scheduledTime,
        repeatDayOfWeek,
        repeatDayOfMonth,
        updatedAt,
      } satisfies Draft;
    })
    .filter((draft): draft is Draft => draft !== null);

  normalized.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  return normalized;
}

async function persistDrafts(drafts: Draft[]) {
  await invoke('save_drafts', { data: JSON.stringify(drafts) });
}

export default function App() {
  const defaultSchedule = useMemo(getDefaultSchedule, []);
  const platformLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    AVAILABLE_PLATFORMS.forEach((platform) => {
      map.set(platform.id, platform.label);
    });
    return map;
  }, []);

  const [body, setBody] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([...DEFAULT_PLATFORMS]);
  const [recurrence, setRecurrence] = useState<Recurrence>('none');
  const [scheduledDate, setScheduledDate] = useState(defaultSchedule.date);
  const [scheduledTime, setScheduledTime] = useState(defaultSchedule.time);
  const [repeatDayOfWeek, setRepeatDayOfWeek] = useState<number | null>(null);
  const [repeatDayOfMonth, setRepeatDayOfMonth] = useState<number | null>(null);

  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loadingDrafts, setLoadingDrafts] = useState(true);
  const [draftsPath, setDraftsPath] = useState<string | null>(null);
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const draftsPromise = invoke<string>('load_drafts');
        const pathPromise = invoke<string>('get_drafts_path').then((value) => value).catch(() => null);
        const [rawDrafts, rawPath] = await Promise.all([draftsPromise, pathPromise]);
        if (!active) {
          return;
        }

        try {
          const parsed = JSON.parse(rawDrafts);
          setDrafts(normalizeDrafts(parsed, defaultSchedule));
        } catch (error) {
          console.error('Konnte gespeicherte Entwürfe nicht parsen.', error);
          setDrafts([]);
        }

        if (rawPath) {
          setDraftsPath(rawPath);
        }
      } catch (error) {
        console.error('Konnte Entwürfe nicht laden.', error);
        if (active) {
          setDrafts([]);
        }
      } finally {
        if (active) {
          setLoadingDrafts(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [defaultSchedule]);

  useEffect(() => {
    if (!feedback) {
      return;
    }
    const timer = window.setTimeout(() => setFeedback(null), 4000);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const scheduleSummary = useMemo(
    () =>
      formatScheduleSummary({
        scheduledFor: computeDraftIso(
          {
            id: 'current',
            body,
            platforms: selectedPlatforms,
            recurrence,
            scheduledDate: recurrence === 'none' ? scheduledDate : null,
            scheduledTime,
            repeatDayOfWeek: recurrence === 'weekly' ? repeatDayOfWeek : null,
            repeatDayOfMonth: recurrence === 'monthly' ? repeatDayOfMonth : null,
            updatedAt: new Date().toISOString(),
          },
          defaultSchedule,
        ),
        recurrence,
        repeatDayOfWeek: recurrence === 'weekly' ? repeatDayOfWeek ?? undefined : undefined,
        repeatDayOfMonth: recurrence === 'monthly' ? repeatDayOfMonth ?? undefined : undefined,
      }),
    [body, selectedPlatforms, recurrence, scheduledDate, scheduledTime, repeatDayOfWeek, repeatDayOfMonth, defaultSchedule],
  );

  const hasCustomSchedule = useMemo(() => {
    const timeDiff = scheduledTime !== defaultSchedule.time;

    if (recurrence === 'none') {
      return scheduledDate !== defaultSchedule.date || timeDiff;
    }

    if (recurrence === 'weekly') {
      return timeDiff || repeatDayOfWeek !== null;
    }

    if (recurrence === 'monthly') {
      return timeDiff || repeatDayOfMonth !== null;
    }

    return timeDiff;
  }, [recurrence, scheduledDate, scheduledTime, defaultSchedule, repeatDayOfWeek, repeatDayOfMonth]);

  const isEditing = editingDraftId !== null;

  const resetForm = () => {
    setBody('');
    setSelectedPlatforms([...DEFAULT_PLATFORMS]);
    setRecurrence('none');
    setScheduledDate(defaultSchedule.date);
    setScheduledTime(defaultSchedule.time);
    setRepeatDayOfWeek(null);
    setRepeatDayOfMonth(null);
    setEditingDraftId(null);
    setFormError(null);
    setFeedback(null);
  };

  const togglePlatform = (platformId: string) => {
    setSelectedPlatforms((current) =>
      current.includes(platformId)
        ? current.filter((id) => id !== platformId)
        : [...current, platformId],
    );
  };

  const toggleWeekday = (value: number) => {
    setRepeatDayOfWeek((current) => (current === value ? null : value));
  };

  const handleRecurrenceChange = (value: Recurrence) => {
    setRecurrence(value);
    if (value !== 'weekly') {
      setRepeatDayOfWeek(null);
    }
    if (value !== 'monthly') {
      setRepeatDayOfMonth(null);
    }
    setScheduledTime((current) => current || defaultSchedule.time);
    if (value === 'none') {
      setScheduledDate((current) => current || defaultSchedule.date);
    } else {
      setScheduledDate('');
    }
  };

  const handleResetSchedule = () => {
    setScheduledDate(recurrence === 'none' ? defaultSchedule.date : '');
    setScheduledTime(defaultSchedule.time);
    setRepeatDayOfWeek(null);
    setRepeatDayOfMonth(null);
  };

  const handleEditDraft = (draftId: string) => {
    const target = drafts.find((draft) => draft.id === draftId);
    if (!target) {
      return;
    }

    setEditingDraftId(target.id);
    setBody(target.body);
    setSelectedPlatforms(target.platforms.length ? [...target.platforms] : [...DEFAULT_PLATFORMS]);
    setRecurrence(target.recurrence);
    setScheduledTime(target.scheduledTime || defaultSchedule.time);
    if (target.recurrence === 'none') {
      setScheduledDate(target.scheduledDate ?? defaultSchedule.date);
    } else {
      setScheduledDate('');
    }
    setRepeatDayOfWeek(target.recurrence === 'weekly' ? target.repeatDayOfWeek : null);
    setRepeatDayOfMonth(target.recurrence === 'monthly' ? target.repeatDayOfMonth : null);
    setFormError(null);
    setFeedback(null);
  };

  const handleDeleteDraft = async (draftId: string) => {
    const target = drafts.find((draft) => draft.id === draftId);
    if (!target) {
      return;
    }

    if (!window.confirm('Entwurf wirklich löschen?')) {
      return;
    }

    const previousDrafts = drafts;
    const nextDrafts = drafts.filter((draft) => draft.id !== draftId);
    setDrafts(nextDrafts);
    try {
      await persistDrafts(nextDrafts);
      setFeedback('Entwurf gelöscht.');
      if (editingDraftId === draftId) {
        resetForm();
      }
    } catch (error) {
      console.error('Konnte Entwurf nicht löschen.', error);
      setFormError('Löschen fehlgeschlagen.');
      setDrafts(previousDrafts);
    }
  };

  const handleExportDrafts = async () => {
    setFormError(null);
    setFeedback(null);

    if (!drafts.length) {
      setFormError('Keine Entwürfe zum Exportieren vorhanden.');
      return;
    }

    const timestamp = new Date().toISOString().replace(/[:]/g, '-').replace(/\..*/, '');
    const suggestedName = `skeet-drafts-${timestamp}.json`;

    try {
      const targetPath = await showSaveDialog({
        defaultPath: suggestedName,
        filters: [{ name: 'JSON', extensions: ['json'] }],
      });

      if (!targetPath) {
        return;
      }

      await writeTextFile(targetPath, JSON.stringify(drafts, null, JSON_SPACES));
      setFeedback('Entwürfe exportiert.');
    } catch (error) {
      console.error('Export fehlgeschlagen.', error);
      setFormError('Export fehlgeschlagen.');
    }
  };

  const handleSaveDraft = async () => {
    setFormError(null);
    setFeedback(null);

    const trimmedBody = body.trim();
    if (!trimmedBody) {
      setFormError('Bitte gib einen Inhalt ein.');
      return;
    }

    if (selectedPlatforms.length === 0) {
      setFormError('Mindestens eine Plattform auswählen.');
      return;
    }

    if (recurrence === 'weekly' && repeatDayOfWeek === null) {
      setFormError('Bitte einen Wochentag auswählen.');
      return;
    }

    if (recurrence === 'monthly' && repeatDayOfMonth === null) {
      setFormError('Bitte einen Tag im Monat festlegen.');
      return;
    }

    const timeValue = scheduledTime || defaultSchedule.time;
    const dateValue = recurrence === 'none' ? scheduledDate || defaultSchedule.date : null;

    const draftToSave: Draft = {
      id: editingDraftId ?? createDraftId(),
      body: trimmedBody,
      platforms: [...selectedPlatforms],
      recurrence,
      scheduledDate: recurrence === 'none' ? dateValue : null,
      scheduledTime: timeValue,
      repeatDayOfWeek: recurrence === 'weekly' ? repeatDayOfWeek : null,
      repeatDayOfMonth: recurrence === 'monthly' ? repeatDayOfMonth : null,
      updatedAt: new Date().toISOString(),
    };

    const previousDrafts = drafts;
    const nextDrafts = [draftToSave, ...drafts.filter((entry) => entry.id !== draftToSave.id)];
    setDrafts(nextDrafts);

    try {
      await persistDrafts(nextDrafts);
      setFeedback('Entwurf gespeichert.');
      resetForm();
    } catch (error) {
      console.error('Speichern fehlgeschlagen.', error);
      setFormError('Speichern fehlgeschlagen.');
      setDrafts(previousDrafts);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void handleSaveDraft();
  };

  const formatUpdatedAt = (timestamp: string): string => {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) {
      return 'Unbekannt';
    }
    return date.toLocaleString('de-DE');
  };

  return (
    <div className="app">
      <header className="app__header">
        <h1>BSky Kampagnen Companion</h1>
        <p>Skeets bequem auf dem Desktop vorbereiten – offline-fähig per Tauri.</p>
      </header>
      <main className="app__content">
        <form className="card form-card" onSubmit={handleSubmit}>
          <div className="section">
            <h2>Plattformen</h2>
            <div className="chip-row">
              {AVAILABLE_PLATFORMS.map((platform) => {
                const isActive = selectedPlatforms.includes(platform.id);
                return (
                  <button
                    key={platform.id}
                    type="button"
                    className={`chip ${isActive ? 'chip--active' : ''}`}
                    onClick={() => togglePlatform(platform.id)}
                  >
                    {platform.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="section">
            <h2>Wiederholung</h2>
            <div className="chip-row">
              {RECURRENCE_OPTIONS.map((option) => {
                const isActive = recurrence === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    className={`chip ${isActive ? 'chip--active' : ''}`}
                    onClick={() => handleRecurrenceChange(option.id)}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="section">
            <h2>Planung</h2>
            <div className="schedule-row">
              {recurrence === 'none' && (
                <label>
                  Geplantes Datum
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(event) => setScheduledDate(event.target.value)}
                  />
                </label>
              )}
              <label>
                Geplante Uhrzeit
                <input
                  type="time"
                  value={scheduledTime}
                  onChange={(event) => setScheduledTime(event.target.value)}
                  placeholder="HH:MM"
                />
              </label>
              {recurrence === 'weekly' && (
                <label>
                  Wochentag
                  <select
                    value={repeatDayOfWeek ?? ''}
                    onChange={(event) => {
                      const { value } = event.target;
                      if (value === '') {
                        setRepeatDayOfWeek(null);
                        return;
                      }
                      const numeric = Number(value);
                      setRepeatDayOfWeek(Number.isNaN(numeric) ? null : numeric);
                    }}
                  >
                    <option value="">Bitte wählen</option>
                    {WEEKDAY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {recurrence === 'monthly' && (
                <label>
                  Tag im Monat
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={repeatDayOfMonth ?? ''}
                    onChange={(event) => {
                      const { value } = event.target;
                      if (value === '') {
                        setRepeatDayOfMonth(null);
                        return;
                      }
                      const numeric = Number(value);
                      if (!Number.isFinite(numeric)) {
                        return;
                      }
                      setRepeatDayOfMonth(Math.min(Math.max(Math.round(numeric), 1), 31));
                    }}
                  />
                </label>
              )}
              {hasCustomSchedule && (
                <button type="button" className="secondary-button" onClick={handleResetSchedule}>
                  Zurücksetzen
                </button>
              )}
            </div>
            <p className="schedule-summary">{scheduleSummary}</p>
          </div>

          <label>
            Inhalt
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Was möchtest du posten?"
              rows={8}
            />
          </label>

          <div className="form-actions">
            <button type="submit" className="primary-button">
              {isEditing ? 'Änderungen speichern' : 'Entwurf speichern'}
            </button>
            <button type="button" className="button-ghost" onClick={resetForm}>
              Neuer Entwurf
            </button>
          </div>

          {formError ? <p className="form-message form-message--error">{formError}</p> : null}
          {feedback ? <p className="form-message form-message--success">{feedback}</p> : null}
        </form>

        <section className="card draft-list">
          <div className="draft-list__header">
            <div>
              <h2 className="draft-list__title">Gespeicherte Entwürfe</h2>
              {draftsPath ? (
                <p className="draft-list__hint">
                  Automatisch gespeichert unter <code>{draftsPath}</code>
                </p>
              ) : null}
            </div>
            <div className="draft-list__actions">
              <button
                type="button"
                className="button-ghost"
                onClick={handleExportDrafts}
                disabled={!drafts.length}
              >
                Als JSON exportieren
              </button>
            </div>
          </div>

          {loadingDrafts ? (
            <p className="draft-list__empty">Lade Entwürfe …</p>
          ) : drafts.length === 0 ? (
            <p className="draft-list__empty">Noch keine Entwürfe gespeichert.</p>
          ) : (
            <ul className="draft-list__items">
              {drafts.map((draft) => {
                const snippet = formatDraftSnippet(draft.body);
                const summary = formatDraftSummary(draft, defaultSchedule);
                const platformSummary = draft.platforms
                  .map((id) => platformLabelMap.get(id) ?? id)
                  .join(', ');

                return (
                  <li
                    key={draft.id}
                    className={`draft-item ${editingDraftId === draft.id ? 'draft-item--active' : ''}`}
                  >
                    <div className="draft-item__main">
                      <p className="draft-item__body">{snippet}</p>
                      <div className="draft-item__meta">
                        <span>{summary}</span>
                        <span>{platformSummary}</span>
                      </div>
                      <p className="draft-item__timestamp">Aktualisiert: {formatUpdatedAt(draft.updatedAt)}</p>
                    </div>
                    <div className="draft-item__actions">
                      <button type="button" className="button-ghost" onClick={() => handleEditDraft(draft.id)}>
                        Bearbeiten
                      </button>
                      <button type="button" className="button-danger" onClick={() => handleDeleteDraft(draft.id)}>
                        Löschen
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
