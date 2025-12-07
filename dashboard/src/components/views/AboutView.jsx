export default function AboutView () {
  const project = 'Kampagnen‑Tool'
  const author = 'Michael Küper'
  const assistant_1 = 'S.A.R.A.H (OpenAI ChatGPT-5)'

  return (
    <div className='space-y-6'>
      <section className='space-y-3 rounded-2xl border border-border-muted bg-background-subtle p-4'>
        <h3 className='text-lg font-semibold'>Über das {project}</h3>
        <p className='text-sm text-foreground-muted'>
          Das {project} unterstützt beim Planen, Veröffentlichen und Auswerten von Posts und Threads für verbundene Plattformen. Im Mittelpunkt stehen eine übersichtliche Steuerung geplanter Inhalte, klare Statusansichten und ein transparenter Versandverlauf.
        </p>
        <p className='text-sm text-foreground-muted'>
          Neben den Planungs- und Auswertungsfunktionen bietet das {project} einen eingebetteten Bluesky‑Client für direkte Interaktionen sowie Konfigurationsbereiche für Scheduler, Dashboard‑Polling und Zugangsdaten. Ziel ist ein zentrales Control Center für Kampagnenarbeit, das sich an unterschiedliche Umgebungen anpassen lässt.
        </p>
      </section>
      <section className='space-y-3 rounded-2xl border border-border-muted bg-background-subtle p-4'>
        <h3 className='text-lg font-semibold'>Mitwirkende</h3>
        <ul className='space-y-1 text-sm text-foreground-muted'>
          <li>
            <span className='font-medium text-foreground'>{author}</span> – Projektleitung & Entwicklung
          </li>
          {assistant_1 && (
            <li>
              <span className='font-medium text-foreground'>{assistant_1}</span> – Agentische Unterstützung & Code‑Assistenz
            </li>
          )}
        </ul>
      </section>
    </div>
  )
}
