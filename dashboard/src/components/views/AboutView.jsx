import Card from "../ui/Card";

export default function AboutView() {
  const project = 'BSky Kampagnen Bot';
  const author = 'Michael Küper';
  const assistant = 'S.A.R.A.H (OpenAI ChatGPT-5)';

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
          <li><span className="font-medium text-foreground">{assistant}</span> – Agentische Unterstützung & Code‑Assistenz</li>
        </ul>
      </Card>
    </div>
  );
}
