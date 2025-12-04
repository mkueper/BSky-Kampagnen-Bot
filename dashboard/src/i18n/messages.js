const messages = {
  de: {
    nav: {
      overview: 'Übersicht',
      skeets: 'Posts',
      'skeets-overview': 'Aktivität',
      'skeets-plan': 'Planen',
      threads: 'Threads',
      'threads-overview': 'Aktivität',
      'threads-plan': 'Thread planen',
      'bsky-client': 'Bluesky Client',
      config: 'Konfiguration',
      about: 'Über Kampagnen‑Tool'
    },
    header: {
      caption: {
        overview: 'Kampagnen – Übersicht',
        skeets: 'Posts – Übersicht',
        'skeets-overview': 'Posts – Übersicht',
        'skeets-plan': 'Post planen',
        threads: 'Threads – Übersicht',
        'threads-overview': 'Threads – Übersicht',
        'threads-plan': 'Thread planen',
        'bsky-client': 'Bluesky Client',
        config: 'Konfiguration',
        about: 'Über Kampagnen‑Tool'
      },
      title: {
        overview: 'Kampagnen – Übersicht',
        skeets: 'Posts – Übersicht',
        'skeets-overview': 'Posts – Übersicht',
        'skeets-plan': 'Post planen',
        threads: 'Threads – Übersicht',
        'threads-overview': 'Threads – Übersicht',
        'threads-plan': 'Thread planen',
        'bsky-client': 'BSky Client',
        config: 'Einstellungen & Automatisierung',
        about: 'Über Kampagnen‑Tool'
      }
    },
    overview: {
      cards: {
        plannedPosts: 'Geplante Posts',
        publishedPosts: 'Veröffentlichte Posts',
        pendingPosts: 'Wartende Posts',
        plannedThreads: 'Geplante Threads',
        publishedThreads: 'Veröffentlichte Threads'
      },
      next: {
        postTitle: 'Nächster Post',
        threadTitle: 'Nächster Thread',
        noPost: 'Kein geplanter Post.',
        noThread: 'Kein geplanter Thread.',
        noPostContent: 'Kein Inhalt vorhanden',
        noThreadTitle: 'Kein Titel hinterlegt'
      },
      upcoming: {
        postsTitle: 'Bevorstehende Posts',
        threadsTitle: 'Bevorstehende Threads',
        noPosts: 'Keine anstehenden Posts.',
        noThreads: 'Keine anstehenden Threads.',
        noPostContent: '(kein Inhalt)',
        noThreadTitle: '(kein Titel)'
      },
      aria: {
        toPostsOverview: 'Zur Posts-Übersicht wechseln',
        toThreadsOverview: 'Zur Threads-Übersicht wechseln',
        toPendingPosts: 'Auf Freigabe wartende Posts anzeigen'
      }
    },
    posts: {
      activity: {
        title: 'Post-Aktivität',
        description:
          'Verwalte geplante und veröffentlichte Posts inklusive Antworten & Reaktionen.',
        tabs: {
          planned: 'Geplant',
          published: 'Veröffentlicht',
          pending: 'Wartend',
          deleted: 'Papierkorb'
        },
        toolbar: {
          sortNewFirst: 'Neu zuerst',
          sortOldFirst: 'Alt zuerst',
          refreshVisible: 'Alle sichtbaren aktualisieren',
          noVisibleTitle: 'Keine sichtbaren Einträge',
          noVisibleDescription:
            'Scrolle die Liste, um Einträge sichtbar zu machen.',
          refreshErrorTitle: 'Aktualisierung fehlgeschlagen',
          refreshErrorDescription: 'Fehler beim Aktualisieren.',
          refreshSuccessTitle: 'Sichtbare aktualisiert',
          refreshSuccessDescriptionPrefix: 'Posts: ',
          refreshSuccessDescriptionSuffix: ' aktualisiert',
          refreshSuccessFailedPart: ' · {count} fehlgeschlagen',
          refreshBackendErrorFallback:
            'Fehler beim Aktualisieren der sichtbaren Posts.'
        }
      },
      lists: {
        planned: {
          emptyTitle: 'Noch keine Posts geplant.',
          emptyBody:
            'Nutze den Planer, um deinen ersten Post zu terminieren.',
          edit: 'Bearbeiten',
          remove: 'Löschen',
          publishNow: 'Senden',
          skipOnce: 'Verwerfen',
          publishNowTitle: 'Verpassten Post einmalig senden',
          skipOnceTitle: 'Verpassten Post verwerfen (nicht nachholen)'
        },
        published: {
          emptyTitle: 'Noch keine veröffentlichten Posts.',
          emptyBody:
            'Sobald Posts live sind, erscheinen sie hier mit allen Kennzahlen.',
          tabPost: 'Beitrag',
          tabReplies: 'Antworten',
          loadingReplies: 'Antworten werden geladen…',
          noReplies: 'Keine Antworten vorhanden.',
          repliesErrorPrefix: 'Fehler',
          reactionsRefresh: 'Reaktionen aktualisieren',
          reactionsLoading: 'Lädt…',
          retract: 'Zurückziehen',
          summaryLikes: 'Likes',
          summaryReposts: 'Reposts',
          reactionsErrorPrefix: 'Fehler: ',
          sentAtPrefix: 'Gesendet am ',
          platformLikesReposts: 'Likes {likes} · Reposts {reposts}'
        },
        deleted: {
          emptyTitle: 'Keine gelöschten Posts.',
          emptyBody:
            'Gelöschte Posts erscheinen hier und können reaktiviert oder endgültig entfernt werden.',
          deletedAtPrefix: 'Gelöscht am ',
          restore: 'Reaktivieren',
          destroy: 'Endgültig löschen'
        }
      }
    }
  }
}

export default messages
