import { Card } from "@bsky-kampagnen-bot/shared-ui";

export default function AboutView() {
  const project = 'BSky Kampagnen Bot';
  const author = 'Michael Küper';
  const assistant_1 = 'S.A.R.A.H (OpenAI ChatGPT-5)';
  const assistant_2 = 'G.I.D.E.O.N. (Google Gemini Assistant)';


  return (
    <div className="space-y-6">
      <Card padding="p-6">
        <h2 className="text-xl font-semibold">Über {project}</h2>
        <p className="mt-2 text-sm text-foreground-muted">
          Dieses Tool unterstützt das Planen, Veröffentlichen und Auswerten von Skeets und Threads.
        </p>
      </Card>
      <Card padding="p-6">
        <h3 className="text-lg font-semibold">Mitwirkende</h3>
        <ul className="mt-3 space-y-1 text-sm">
          <li><span className="font-medium text-foreground">{author}</span> – Projektleitung & Entwicklung</li>
          {assistant_1 && <li><span className="font-medium text-foreground">{assistant_1}</span> – Agentische Unterstützung & Code‑Assistenz</li>}
          {assistant_2 && <li><span className="font-medium text-foreground">{assistant_2}</span> – Agentische Unterstützung & Code‑Assistenz</li>}
          </ul>
      </Card>
    </div>
  );
}
