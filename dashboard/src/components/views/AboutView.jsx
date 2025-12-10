import { useTranslation } from '../../i18n/I18nProvider.jsx'

export default function AboutView () {
  const project = 'Kampagnen‑Tool'
  const author = 'Michael Küper'
  const assistant_1 = 'S.A.R.A.H (OpenAI ChatGPT-5)'
  const { t } = useTranslation()

  return (
    <div className='space-y-6'>
      <section className='space-y-3 rounded-2xl border border-border-muted bg-background-subtle p-4'>
        <h3 className='text-lg font-semibold'>
          {t('about.introTitle', 'Was das {project} macht').replace('{project}', project)}
        </h3>
        <p className='text-sm text-foreground-muted'>
          {t(
            'about.introBody1',
            'Das {project} hilft dabei, Posts und Threads für verbundene Plattformen zu planen und im Blick zu behalten. Im Mittelpunkt stehen eine übersichtliche Steuerung geplanter Inhalte, klare Statusansichten und ein nachvollziehbarer Versandverlauf.'
          ).replace('{project}', project)}
        </p>
        <p className='text-sm text-foreground-muted'>
          {t(
            'about.introBody2',
            'Zusätzlich zum Planer bietet das {project} einen eingebetteten Bluesky‑Client für direkte Interaktionen sowie Bereiche zur Konfiguration von Scheduler, Dashboard‑Polling und Zugangsdaten. Ziel ist ein zentrales Control Center für Kampagnenarbeit, das sich an unterschiedliche Umgebungen anpassen lässt.'
          ).replace('{project}', project)}
        </p>
      </section>
      <section className='space-y-3 rounded-2xl border border-border-muted bg-background-subtle p-4'>
        <h3 className='text-lg font-semibold'>
          {t('about.contributorsTitle', 'Mitwirkende')}
        </h3>
        <ul className='space-y-1 text-sm text-foreground-muted'>
          <li>
            <span className='font-medium text-foreground'>{author}</span> –{' '}
            {[
              t('about.roleOwner', 'Konzeption, Entwicklung & Betreuung'),
              t('about.roleArchitecture', 'Architektur & UI')
            ].join(', ')}
          </li>
          {assistant_1 && (
            <li>
              <span className='font-medium text-foreground'>{assistant_1}</span> –{' '}
              {[
                t(
                  'about.roleAssistant',
                  'Agentische Unterstützung bei Code, Architektur & UI'
                ),
                t(
                  'about.roleTextAssistant',
                  'Unterstützung bei Texten & Übersetzungen'
                )
              ].join(', ')}
            </li>
          )}
        </ul>
      </section>
      <section className='space-y-3 rounded-2xl border border-border-muted bg-background-subtle p-4'>
        <h3 className='text-lg font-semibold'>
          {t('about.licenseTitle', 'Open Source & Lizenz')}
        </h3>
        <p className='text-sm text-foreground-muted'>
          {t(
            'about.licenseBody',
            'Das {project} wird als Open‑Source‑Projekt unter der MIT‑Lizenz entwickelt. Details zur Lizenz finden sich in der Datei LICENSE im Projektverzeichnis.'
          ).replace('{project}', project)}
        </p>
      </section>
      <section className='space-y-3 rounded-2xl border border-border-muted bg-background-subtle p-4'>
        <h3 className='text-lg font-semibold'>
          {t('about.supportTitle', 'Support & Feedback')}
        </h3>
        <p className='text-sm text-foreground-muted'>
          {t(
            'about.supportBody',
            'Feedback, Fehler und Ideen können als Issue im GitHub‑Repo gemeldet werden. Bitte keine Zugangsdaten oder vertraulichen Inhalte in Issues posten.'
          )}
        </p>
      </section>
      <section className='space-y-3 rounded-2xl border border-border-muted bg-background-subtle p-4'>
        <h3 className='text-lg font-semibold'>
          {t('about.dataTitle', 'Daten & Betrieb')}
        </h3>
        <p className='text-sm text-foreground-muted'>
          {t(
            'about.dataBody',
            'Inhalte, Planungen und Zugangsdaten werden in deiner eigenen Umgebung gespeichert (Datenbank/Dateisystem). Externe Dienste sind Bluesky (optional Mastodon sowie die Tenor‑GIF‑Suche), die nur im Rahmen der konfigurierten Konten angesprochen werden.'
          )}
        </p>
        <p className='text-sm text-foreground-muted'>
          {t(
            'about.deploymentBody',
            'Welche Version im Einsatz ist, ergibt sich aus dem jeweiligen Deployment (z. B. Docker‑Tag oder package.json im Repository). Hinweise zu typischen Setups (Docker‑Compose, Node.js + SQLite/Postgres) finden sich im README des Projekts.'
          )}
        </p>
      </section>
    </div>
  )
}
