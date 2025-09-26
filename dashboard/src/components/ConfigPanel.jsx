import { useEffect, useMemo, useState } from "react";
import { useToast } from "../hooks/useToast";

const NUMBER_FIELDS = ["postRetries", "postBackoffMs", "postBackoffMaxMs"];

const LABELS = {
  scheduleTime: "Cron-Ausdruck",
  timeZone: "Zeitzone",
  postRetries: "Maximale Wiederholversuche",
  postBackoffMs: "Basis-Backoff (ms)",
  postBackoffMaxMs: "Maximaler Backoff (ms)",
};

function formatNumberInput(value) {
  return value == null ? "" : String(value);
}

function normalizeFormPayload(values) {
  return {
    scheduleTime: values.scheduleTime?.trim(),
    timeZone: values.timeZone?.trim(),
    postRetries: values.postRetries !== "" ? Number(values.postRetries) : null,
    postBackoffMs: values.postBackoffMs !== "" ? Number(values.postBackoffMs) : null,
    postBackoffMaxMs: values.postBackoffMaxMs !== "" ? Number(values.postBackoffMaxMs) : null,
  };
}

export default function ConfigPanel() {
  const toast = useToast();
  const [formValues, setFormValues] = useState({
    scheduleTime: "",
    timeZone: "",
    postRetries: "",
    postBackoffMs: "",
    postBackoffMaxMs: "",
  });
  const [initialValues, setInitialValues] = useState(formValues);
  const [defaults, setDefaults] = useState(formValues);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const hasChanges = useMemo(() => {
    return Object.keys(formValues).some((key) => String(formValues[key]) !== String(initialValues[key] ?? ""));
  }, [formValues, initialValues]);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/settings/scheduler");
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Fehler beim Laden der Einstellungen.");
        }
        const data = await res.json();
        const nextValues = {
          scheduleTime: data.values?.scheduleTime ?? "",
          timeZone: data.values?.timeZone ?? "",
          postRetries: formatNumberInput(data.values?.postRetries),
          postBackoffMs: formatNumberInput(data.values?.postBackoffMs),
          postBackoffMaxMs: formatNumberInput(data.values?.postBackoffMaxMs),
        };
        const nextDefaults = {
          scheduleTime: data.defaults?.scheduleTime ?? "",
          timeZone: data.defaults?.timeZone ?? "",
          postRetries: formatNumberInput(data.defaults?.postRetries),
          postBackoffMs: formatNumberInput(data.defaults?.postBackoffMs),
          postBackoffMaxMs: formatNumberInput(data.defaults?.postBackoffMaxMs),
        };
        if (!ignore) {
          setFormValues(nextValues);
          setInitialValues(nextValues);
          setDefaults(nextDefaults);
        }
      } catch (error) {
        console.error("Fehler beim Laden der Einstellungen:", error);
        toast.error({
          title: "Konfiguration",
          description: error.message || "Einstellungen konnten nicht geladen werden.",
        });
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, [toast]);

  const updateField = (key, value) => {
    setFormValues((current) => ({ ...current, [key]: value }));
  };

  const resetToDefaults = () => {
    setFormValues(defaults);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!hasChanges) {
      toast.info({ title: "Keine Änderungen", description: "Die Einstellungen sind bereits aktuell." });
      return;
    }

    const payload = normalizeFormPayload(formValues);

    if (!payload.scheduleTime) {
      toast.error({ title: "Cron-Ausdruck fehlt", description: "Bitte einen gültigen Cron-Ausdruck angeben." });
      return;
    }
    if (!payload.timeZone) {
      toast.error({ title: "Zeitzone fehlt", description: "Bitte eine Zeitzone angeben." });
      return;
    }
    for (const key of NUMBER_FIELDS) {
      const value = payload[key];
      if (value == null || Number.isNaN(value) || value < 0) {
        toast.error({
          title: "Ungültiger Wert",
          description: `${LABELS[key]} muss eine positive Zahl sein.`,
        });
        return;
      }
    }

    setSaving(true);
    try {
      const res = await fetch("/api/settings/scheduler", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Speichern fehlgeschlagen.");
      }

      const data = await res.json();
      const nextValues = {
        scheduleTime: data.values?.scheduleTime ?? payload.scheduleTime,
        timeZone: data.values?.timeZone ?? payload.timeZone,
        postRetries: formatNumberInput(data.values?.postRetries),
        postBackoffMs: formatNumberInput(data.values?.postBackoffMs),
        postBackoffMaxMs: formatNumberInput(data.values?.postBackoffMaxMs),
      };
      const nextDefaults = {
        scheduleTime: data.defaults?.scheduleTime ?? defaults.scheduleTime,
        timeZone: data.defaults?.timeZone ?? defaults.timeZone,
        postRetries: formatNumberInput(data.defaults?.postRetries ?? defaults.postRetries),
        postBackoffMs: formatNumberInput(data.defaults?.postBackoffMs ?? defaults.postBackoffMs),
        postBackoffMaxMs: formatNumberInput(data.defaults?.postBackoffMaxMs ?? defaults.postBackoffMaxMs),
      };
      setFormValues(nextValues);
      setInitialValues(nextValues);
      setDefaults(nextDefaults);

      toast.success({
        title: "Einstellungen gespeichert",
        description: "Scheduler und Retry-Strategie wurden aktualisiert.",
      });
    } catch (error) {
      console.error("Fehler beim Speichern der Einstellungen:", error);
      toast.error({
        title: "Speichern fehlgeschlagen",
        description: error.message || "Die Einstellungen konnten nicht gespeichert werden.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-border bg-background-elevated p-6 shadow-soft lg:p-10">
        <div className="flex flex-col gap-2 pb-6 md:flex-row md:items-baseline md:justify-between">
          <div>
            <h3 className="text-2xl font-semibold">Scheduler & Retries</h3>
            <p className="text-sm text-foreground-muted">
              Passe Cron, Zeitzone und Retry-Strategie für den Kampagnen-Bot an.
            </p>
          </div>
          <div className="text-xs text-foreground-muted">
            <p>Standardwerte basieren auf deiner aktuellen .env.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="scheduleTime" className="text-sm font-semibold text-foreground">
                {LABELS.scheduleTime}
              </label>
              <input
                id="scheduleTime"
                type="text"
                value={formValues.scheduleTime}
                onChange={(e) => updateField("scheduleTime", e.target.value)}
                disabled={loading || saving}
                className="w-full rounded-2xl border border-border bg-background-subtle px-4 py-3 text-sm text-foreground shadow-soft focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60"
                placeholder={defaults.scheduleTime}
              />
              <p className="text-xs text-foreground-muted">
                Beispiele: <code className="font-mono">0 * * * *</code> (stündlich), <code className="font-mono">*/5 * * * *</code> (alle 5 Minuten)
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="timeZone" className="text-sm font-semibold text-foreground">
                {LABELS.timeZone}
              </label>
              <input
                id="timeZone"
                type="text"
                value={formValues.timeZone}
                onChange={(e) => updateField("timeZone", e.target.value)}
                disabled={loading || saving}
                className="w-full rounded-2xl border border-border bg-background-subtle px-4 py-3 text-sm text-foreground shadow-soft focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60"
                placeholder={defaults.timeZone}
              />
              <p className="text-xs text-foreground-muted">IANA-Zeitzone, z. B. Europe/Berlin oder UTC.</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {NUMBER_FIELDS.map((key) => (
              <div key={key} className="space-y-2">
                <label htmlFor={key} className="text-sm font-semibold text-foreground">
                  {LABELS[key]}
                </label>
                <input
                  id={key}
                  type="number"
                  min="0"
                  value={formValues[key]}
                  onChange={(e) => updateField(key, e.target.value)}
                  disabled={loading || saving}
                  className="w-full rounded-2xl border border-border bg-background-subtle px-4 py-3 text-sm text-foreground shadow-soft focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60"
                  placeholder={defaults[key]}
                />
              </div>
            ))}
          </div>

          <div className="flex flex-wrap justify-between gap-3 border-t border-border-muted pt-6">
            <div className="text-xs text-foreground-muted">
              <p>
                <span className="font-semibold">Standardwerte:</span> Cron {defaults.scheduleTime}, Zeitzone {defaults.timeZone},
                Retries {defaults.postRetries}, Backoff {defaults.postBackoffMs}ms (max. {defaults.postBackoffMaxMs}ms)
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={resetToDefaults}
                disabled={loading || saving}
                className="rounded-2xl border border-border px-5 py-2.5 text-sm font-medium text-foreground transition hover:bg-background-subtle disabled:opacity-60"
              >
                Zurücksetzen auf Standard
              </button>
              <button
                type="submit"
                disabled={loading || saving || !hasChanges}
                className="rounded-2xl bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground shadow-soft transition hover:shadow-card disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Speichern…" : "Einstellungen speichern"}
              </button>
            </div>
          </div>
        </form>
      </section>

      <section className="rounded-3xl border border-border bg-background-subtle p-6 shadow-soft lg:p-8">
        <h4 className="text-lg font-semibold">Tipps</h4>
        <ul className="mt-4 space-y-2 text-sm text-foreground-muted">
          <li>• Cron-Ausdrücke beziehen sich auf die Serverzeit – achte bei Deployment auf die korrekte Zeitzone.</li>
          <li>• Backoff-Werte steuern Wartezeiten zwischen Retry-Versuchen und helfen bei Rate-Limits.</li>
          <li>• Änderungen greifen sofort – der Scheduler wird automatisch neugestartet.</li>
        </ul>
      </section>
    </div>
  );
}
