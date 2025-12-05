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
    login: {
      heading: 'Kampagnen‑Tool Login',
      subtitle: 'Zugangsdaten werden serverseitig verwaltet.',
      unconfigured: {
        intro:
          'Bevor sich jemand anmelden kann, muss der Login im Backend konfiguriert werden:',
        step1:
          'Gewünschten Admin-Benutzer in `.env` via `AUTH_USERNAME` setzen.',
        step2: {
          prefix: 'Passwort-Hash mit',
          suffix: 'generieren und als'
        },
        step3: {
          prefix: 'Einen zufälligen Schlüssel als',
          suffix: 'vergeben und Backend neustarten.'
        },
        checkConfig: 'Konfiguration prüfen'
      },
      usernameLabel: 'Benutzername',
      usernamePlaceholder: 'admin',
      passwordLabel: 'Passwort',
      submitBusy: 'Anmeldung läuft…',
      submitLabel: 'Anmelden',
      footerHint:
        'Tipp: Mehrere Admins sind möglich, wenn die Cookies geteilt oder der Login via Proxy abgesichert wird.'
    },
    posts: {
      form: {
        headingEdit: 'Post bearbeiten',
        headingCreate: 'Neuen Post planen',
        maxLengthHint:
          'Maximal {limit} Zeichen für die gewählten Plattformen.',
        previewDisabledReason:
          'Link-Vorschauen können nicht gemeinsam mit Bildanhängen gesendet werden.',
        limitExceededTitle: 'Zeichenlimit überschritten',
        limitExceededDescription:
          'Der Post darf maximal {limit} Zeichen für die ausgewählten Plattformen enthalten.',
        limitExceededShort: 'Max. {limit} Zeichen.',
        invalidScheduleTitle: 'Ungültige Planung',
        invalidScheduleDescription: 'Bitte Datum und Uhrzeit prüfen.',
        weeklyMissingDaysTitle: 'Bitte Wochentage wählen',
        weeklyMissingDaysDescription: 'Mindestens einen Tag markieren.',
        monthlyInvalidDayTitle: 'Ungültiger Monatstag',
        monthlyInvalidDayDescription:
          'Bitte einen Wert von 1 bis 31 wählen.',
        noPlatformTitle: 'Keine Plattform gewählt',
        noPlatformDescription:
          'Bitte mindestens eine Zielplattform auswählen.',
        saveSuccessUpdateTitle: 'Post aktualisiert',
        saveSuccessCreateTitle: 'Post geplant',
        saveSuccessDescription: 'Die Änderungen wurden übernommen.',
        saveErrorTitle: 'Speichern fehlgeschlagen',
        saveErrorDescription: 'Fehler beim Speichern des Posts.',
        content: {
          label: 'Post-Text',
          infoAria: 'Hinweis zu Post-Text anzeigen',
          placeholder: 'Was soll veröffentlicht werden?',
          counter: '{count}/{limit} Zeichen'
        },
        preview: {
          label: 'Vorschau',
          infoAria: 'Hinweis zur Vorschau anzeigen'
        },
        infoButtonLabel: 'Info',
        infoButtonTitle: 'Hinweis anzeigen',
        platforms: {
          groupLabel: 'Plattformen wählen',
          mastodonDisabledTitle: 'Mastodon-Zugang nicht konfiguriert',
          bluesky: 'Bluesky',
          mastodon: 'Mastodon'
        },
        media: {
          counterLabel: 'Medien',
          addImageTitle: 'Bild hinzufügen',
          addImageAria: 'Bild hinzufügen',
          limitReachedTitle: 'Maximal {count} Bilder',
          addGifTitle: 'GIF hinzufügen',
          addGifAria: 'GIF hinzufügen',
          addGifLabel: 'GIF',
          gifLoadErrorTitle: 'GIF konnte nicht geladen werden',
          removeSuccessTitle: 'Bild entfernt',
          removeErrorTitle: 'Entfernen fehlgeschlagen',
          removeErrorFallback: 'Bild konnte nicht entfernt werden.',
          removeButtonTitle: 'Bild entfernen',
          imageAltFallback: 'Bild {index}',
          altEditTitle: 'Alt‑Text bearbeiten',
          altAddTitle: 'Alt‑Text hinzufügen',
          altSaveErrorFallback: 'Alt‑Text konnte nicht gespeichert werden.',
          altSaveErrorTitle: 'Fehler beim Alt‑Text',
          altBadge: 'ALT',
          altAddBadge: '+ ALT'
        },
        emoji: {
          insertAria: 'Emoji einfügen',
          insertTitle: 'Emoji einfügen (Ctrl+.)'
        },
        repeat: {
          label: 'Wiederholungsmuster',
          none: 'Keine Wiederholung',
          daily: 'Täglich',
          weekly: 'Wöchentlich',
          monthly: 'Monatlich'
        },
        time: {
          label: 'Geplante Uhrzeit'
        },
        weekdays: {
          label: 'Wochentage'
        },
        monthlyDay: {
          label: 'Tag im Monat (1–31)'
        },
        date: {
          label: 'Geplantes Datum'
        },
        cancel: 'Abbrechen',
        submitUpdate: 'Post aktualisieren',
        submitCreate: 'Planen',
        sendNow: {
          buttonBusy: 'Senden…',
          buttonDefault: 'Sofort senden',
          createErrorFallback: 'Post konnte nicht erstellt werden.',
          unexpectedCreateResponse:
            'Unerwartete Antwort beim Erstellen des Posts.',
          publishErrorFallback: 'Direktveröffentlichung fehlgeschlagen.',
          successTitle: 'Veröffentlicht (direkt)',
          successDescription:
            'Der Post wurde unmittelbar gesendet.',
          errorTitle: 'Senden fehlgeschlagen'
        },
        infoContent: {
          title: 'Hinweis: Post-Text',
          body1:
            'Zielplattformen bestimmen das Zeichenlimit. Der kleinste Wert (z. B. Bluesky 300, Mastodon 500) gilt.',
          body2:
            'Für Wiederholungen wähle bitte das passende Muster (keine/wöchentlich/monatlich) und gib die erforderlichen Felder an.'
        },
        infoPreview: {
          title: 'Hinweis: Vorschau',
          body1:
            'Über die Buttons lassen sich Bilder oder GIFs hinzufügen. Maximal {max} Bilder je Post.',
          body2:
            'Bilder werden beim Speichern hochgeladen. Der Zähler zeigt die aktuelle Zeichenanzahl im Verhältnis zum Limit.'
        }
      },
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
    },
    threads: {
      activity: {
        title: 'Thread Aktivität',
        description:
          'Verwalte geplante und veröffentlichte Threads inklusive Antworten & Reaktionen.',
        tabs: {
          planned: 'Geplant',
          published: 'Veröffentlicht',
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
          refreshSuccessDescriptionPrefix: 'Threads: ',
          refreshSuccessDescriptionSuffix: ' aktualisiert',
          refreshSuccessFailedPart: ' · {count} fehlgeschlagen',
          refreshBackendErrorFallback:
            'Fehler beim Aktualisieren der sichtbaren Threads.',
          mobileSortLabel: 'Sortierung veröffentlichter Threads',
          includeRepliesLabel: 'Antworten'
        },
        emptyTrash: 'Der Papierkorb ist leer.'
      },
      form: {
        saveSuccessUpdateTitle: 'Thread aktualisiert',
        saveSuccessCreateTitle: 'Thread geplant',
        saveSuccessDescription: 'Thread enthält {count} Post{suffix}.',
        saveErrorUpdateTitle: 'Aktualisierung fehlgeschlagen',
        saveErrorCreateTitle: 'Speichern fehlgeschlagen',
        saveErrorDescription:
          'Unbekannter Fehler beim Speichern des Threads.',
        source: {
          heading: 'Thread-Inhalt',
          infoAria: 'Hinweis zu Thread-Inhalt anzeigen',
          limitLabel: 'Limit: {label}',
          placeholder:
            'Beispiel:\nIntro zum Thread...\n---\nWeiterer Post...',
          shortHint:
            'STRG+Enter fügt einen Trenner ein. Lange Abschnitte werden automatisch aufgeteilt. Nummerierung kann optional deaktiviert werden.'
        },
        platforms: {
          legend: 'Zielplattformen',
          groupLabel: 'Zielplattformen wählen',
          mastodonDisabledTitle: 'Mastodon-Zugang nicht konfiguriert',
          optionTitle: '{label} ({limit})',
          bluesky: 'Bluesky',
          mastodon: 'Mastodon'
        },
        numbering: {
          label: 'Automatische Nummerierung (`1/x`) anhängen'
        },
        schedule: {
          label: 'Geplanter Versand',
          hint: 'Standard: morgen um 09:00 Uhr'
        },
        emoji: {
          insertAria: 'Emoji einfügen',
          insertTitle: 'Emoji einfügen (Ctrl+.)'
        },
        actions: {
          cancel: 'Abbrechen',
          reset: 'Formular zurücksetzen'
        },
        submitUpdateBusy: 'Aktualisieren…',
        submitCreateBusy: 'Planen…',
        submitUpdate: 'Thread aktualisieren',
        submitCreate: 'Planen',
        preview: {
          heading: 'Vorschau',
          infoAria: 'Hinweis zur Vorschau anzeigen',
          counter: '{count} Post{suffix}'
        },
        media: {
          uploadErrorExistingFallback: 'Upload fehlgeschlagen.',
          uploadExistingErrorTitle: 'Medien-Upload fehlgeschlagen',
          uploadErrorDescription: 'Fehler beim Upload.',
          uploadTempErrorFallback: 'Temporärer Upload fehlgeschlagen.',
          uploadTempErrorTitle: 'Upload fehlgeschlagen',
          tooLargeMessage:
            'Die Datei ist zu groß. Maximal {mb} MB erlaubt.',
          gifTooLargeMessage: 'GIF zu groß. Maximal {mb} MB.',
          gifLoadErrorMessage: 'GIF konnte nicht geladen werden.',
          uploadErrorDialogTitle: 'Upload fehlgeschlagen',
          uploadErrorDialogBody:
            'Die Bilddatei konnte nicht hochgeladen werden.',
          addImageTitle: 'Bild hinzufügen',
          addGifTitle: 'GIF hinzufügen',
          segmentSuccessTitle: 'Post {index}',
          addedDescription: 'Bild hinzugefügt.',
          imageAltFallback: 'Bild {index}',
          altEditTitle: 'Alt‑Text bearbeiten',
          altAddTitle: 'Alt‑Text hinzufügen',
          altSaveErrorFallback: 'Alt‑Text konnte nicht gespeichert werden.',
          altSaveSuccessTitle: 'Alt‑Text gespeichert',
          altSaveErrorTitle: 'Fehler beim Alt‑Text',
          altBadge: 'ALT',
          altAddBadge: '+ ALT',
          removeButtonTitle: 'Bild entfernen',
          counterPerSegment: 'Medien {count}/{max}'
        },
        segment: {
          limitExceeded: 'Zeichenlimit überschritten.'
        },
        sendNow: {
          validationErrorTitle: 'Formular unvollständig',
          validationErrorDescription:
            'Die markierten Probleme sollten vor dem Senden behoben werden.',
          createErrorFallback: 'Thread konnte nicht erstellt werden.',
          unexpectedCreateResponse:
            'Unerwartete Antwort beim Erstellen des Threads.',
          publishErrorFallback: 'Direktveröffentlichung fehlgeschlagen.',
          successTitle: 'Veröffentlicht (direkt)',
          successDescription:
            'Der Thread wurde unmittelbar gesendet und erscheint unter Veröffentlicht.',
          errorTitle: 'Senden fehlgeschlagen',
          errorDescription: 'Unbekannter Fehler beim Senden.',
          buttonBusy: 'Senden…',
          buttonDefault: 'Sofort senden'
        },
        infoButtonLabel: 'Info',
        infoButtonTitle: 'Hinweis anzeigen',
        infoSource: {
          title: 'Hinweis: Thread-Inhalt',
          body1:
            'Der gesamte Thread wird in einem Feld erfasst. --- kann als Trenner genutzt werden, alternativ STRG+Enter.',
          body2:
            'Längere Abschnitte werden automatisch passend zerschnitten – wenn möglich am Satzende. Die Zeichenbegrenzung richtet sich nach den gewählten Plattformen (kleinster Wert gilt).',
          body3:
            'Medien können pro Post in der Vorschau hinzugefügt werden. Maximal {max} Bilder pro Post.',
          body4:
            'Die automatische Nummerierung (1/x) kann im Formular ein- oder ausgeschaltet werden.'
        },
        infoPreview: {
          title: 'Hinweis: Vorschau',
          body1:
            'Jeder Abschnitt bildet einen Post. Über die Buttons in der Vorschau lassen sich pro Post Bilder oder GIFs hinzufügen.',
          body2:
            'Bilder werden beim Speichern hochgeladen (max. {max} je Post).',
          body3:
            'Der Zähler zeigt die aktuelle Zeichenanzahl je Post im Verhältnis zum Limit der ausgewählten Plattformen.',
          body4:
            'Die automatische Nummerierung (1/x) kann im Formular ein- oder ausgeschaltet werden.'
        },
        singleSegment: {
          title: 'Nur ein Segment erkannt',
          keepAsThread: 'Trotzdem als Thread speichern',
          moveToPostsTitle: 'Zum Posts-Planer wechseln',
          moveToPostsDescription:
            'Bitte wechsle zum Posts-Planer und füge den Text ein.',
          moveToPostsButton: 'Zum Posts-Planer wechseln',
          body:
            'Dieser Thread enthält nur ein Segment. Stattdessen kann ein einzelner Post geplant werden.'
        }
      },
      overview: {
        loading: 'Threads werden geladen…',
        loadErrorTitle: 'Threads konnten nicht geladen werden',
        loadErrorRetry: 'Erneut versuchen',
        loadErrorFallback: 'Unbekannter Fehler',
        emptyTitle: 'Noch keine Threads gespeichert',
        emptyBody:
          'Lege im Thread-Editor einen Thread an, um hier eine Vorschau zu sehen.'
      },
      card: {
        noPlatforms: 'Keine Plattformen',
        publishedAtPrefix: 'Veröffentlicht am: ',
        publishedFallback: 'Veröffentlicht',
        noSchedule: 'Kein Termin geplant',
        scheduledAtPrefix: 'Wird gepostet um: ',
        scheduledForPrefix: 'Geplant für: ',
        scheduledInvalidPrefix: 'Geplant für ',
        postLabel: 'Post {index}',
        charactersSuffix: ' Zeichen',
        metricsUpdatedAtPrefix: 'Kennzahlen aktualisiert am: ',
        plannedBadge: 'Geplant',
        showMorePosts: 'Weitere Posts anzeigen',
        hideMorePosts: 'Weitere Posts verbergen',
        noMorePosts: 'Keine weiteren Posts',
        totalsTitle: 'Gesamtübersicht',
        totalsLikes: 'Likes',
        totalsReposts: 'Reposts',
        totalsReplies: 'Antworten',
        totalsFallback: 'Kennzahlen wurden neu geladen.',
        perPlatformLine: 'Likes {likes} · Reposts {reposts}',
        repliesToggleLabel: 'Antworten anzeigen',
        repliesToggleHide: 'Antworten ausblenden',
        repliesHeader: 'Antworten (neueste zuerst)',
        replyPostLabel: 'Post {index}',
        refreshButton: 'Reaktionen aktualisieren',
        refreshLoading: 'Lädt…',
        edit: 'Bearbeiten',
        retract: 'Zurückziehen',
        delete: 'Löschen',
        refreshSuccessTitle: 'Reaktionen aktualisiert',
        refreshSuccessDescription:
          'Likes {likes} · Reposts {reposts} · Antworten {replies}',
        refreshSuccessFallback: 'Kennzahlen wurden neu geladen.',
        refreshErrorTitle: 'Aktualisierung fehlgeschlagen',
        refreshErrorDescription:
          'Fehler beim Aktualisieren der Reaktionen.'
      },
      activityExtra: {
        descriptionShort:
          'Status deiner geplanten und veröffentlichten Threads.',
        loading: 'Thread Aktivität wird geladen…'
      },
      export: {
        buttonLabel: 'Threads exportieren'
      },
      import: {
        buttonLabel: 'Threads importieren'
      }
    },
    postsExtra: {
      overview: {
        next: {
          title: 'Nächster Post',
          none: 'Noch nichts geplant'
        }
      },
      activity: {
        descriptionShort:
          'Status deiner geplanten und veröffentlichten Posts.',
        loading: 'Post-Aktivität wird geladen…'
      },
      export: {
        buttonLabel: 'Posts exportieren'
      },
      import: {
        buttonLabel: 'Posts importieren'
      }
    },
    export: {
      buttonBusy: 'Export…'
    },
    import: {
      buttonBusy: 'Import…'
    },
    auth: {
      logout: {
        button: 'Abmelden'
      }
    },
    config: {
      loading: 'Konfiguration wird geladen…',
      general: {
        heading: 'Allgemein',
        subtitle:
          'Basis-Einstellungen für Sprache und Zeitzone des Kampagnen‑Tools.',
        labels: {
          locale: 'Anzeigesprache',
          timeZone: 'Standard-Zeitzone'
        },
        localeHint:
          'Gilt aktuell nur für das Dashboard-UI. Weitere Bereiche folgen.',
        timeZoneHint:
          'Beispiel: Europe/Berlin oder UTC (IANA-Zeitzone).',
        toastTitle: 'Allgemeine Einstellungen',
        loadErrorDescription:
          'Allgemeine Einstellungen konnten nicht geladen werden.',
        saveErrorFallback:
          'Fehler beim Speichern der allgemeinen Einstellungen.',
        saveSuccessTitle: 'Allgemeine Einstellungen gespeichert',
        saveSuccessDescription:
          'Zeitzone wurde aktualisiert. Der Scheduler verwendet künftig die neue Einstellung.',
        saveErrorTitle: 'Speichern fehlgeschlagen',
        saveErrorDescription:
          'Die allgemeinen Einstellungen konnten nicht gespeichert werden.',
        summary: 'Aktuelle Zeitzone: {tz}',
        resetButton: 'Standard wiederherstellen',
        saveBusy: 'Speichern…',
        saveLabel: 'Allgemeine Einstellungen speichern'
      },
      scheduler: {
        toastTitle: 'Konfiguration',
        loadErrorDescription:
          'Einstellungen konnten nicht geladen werden.',
        noChangesTitle: 'Keine Änderungen',
        noChangesDescription: 'Die Einstellungen sind bereits aktuell.',
        cronMissingTitle: 'Cron-Ausdruck fehlt',
        cronMissingDescription:
          'Bitte einen gültigen Cron-Ausdruck angeben.',
        timeZoneMissingTitle: 'Zeitzone fehlt',
        timeZoneMissingDescription: 'Bitte eine Zeitzone angeben.',
        invalidNumberTitle: 'Ungültiger Wert',
        invalidNumberDescription:
          '{label} muss eine positive Zahl sein.',
        saveErrorFallback: 'Speichern fehlgeschlagen.',
        saveSuccessTitle: 'Einstellungen gespeichert',
        saveSuccessDescription:
          'Scheduler und Retry-Strategie wurden aktualisiert.',
        saveErrorTitle: 'Speichern fehlgeschlagen',
        saveErrorDescription:
          'Die Einstellungen konnten nicht gespeichert werden.',
        heading: 'Scheduler & Retry',
        subtitle:
          'Passe Cron, Zeitzone und Retry-Strategie für das Kampagnen‑Tool an.',
        hintDefaults:
          'Standardwerte basieren auf der aktuellen .env.',
        labels: {
          scheduleCronBlockTitle: 'Cron',
          scheduleTime: 'Cron-Ausdruck',
          timeZone: 'Zeitzone',
          postRetries: 'Maximale Wiederholversuche',
          postBackoffMs: 'Basis-Backoff (ms)',
          postBackoffMaxMs: 'Maximaler Backoff (ms)',
          graceWindowMinutes: 'Grace-Zeit für verpasste Termine (Minuten)'
        },
        examples:
          'Beispiele: 0 * * * * (stündlich), */5 * * * * (alle 5 Minuten)',
        summary:
          'Standardwerte: Cron {cron}, Zeitzone {tz}, Retries {retries}, Backoff {backoffMs}ms (max. {backoffMaxMs}ms)',
        graceHint:
          'Innerhalb dieses Zeitfensters nach dem geplanten Zeitpunkt werden verpasste Posts/Threads noch nachgeholt. Mindestwert: 2 Minuten.',
        infoHeading: 'Hinweise',
        tips: {
          serverTime:
            'Cron-Ausdrücke beziehen sich auf die Serverzeit – beim Deployment sollte auf die korrekte Zeitzone geachtet werden.',
          backoff:
            'Backoff-Werte steuern Wartezeiten zwischen Wiederholversuchen und helfen bei Rate-Limits.',
          apply:
            'Änderungen greifen sofort – der Scheduler wird automatisch neugestartet.'
        },
        resetButton: 'Zurücksetzen auf Standard',
        saveBusy: 'Speichern…',
        saveLabel: 'Einstellungen speichern'
      },
      polling: {
        toastTitle: 'Konfiguration',
        loadErrorDescription:
          'Client-Config konnte nicht geladen werden.',
        noChangesTitle: 'Keine Änderungen',
        noChangesDescription:
          'Die Client-Polling-Einstellungen sind bereits aktuell.',
        invalidValuesTitle: 'Ungültige Werte',
        invalidValuesDescription:
          'Intervalle und Backoff müssen positive Zahlen sein.',
        invalidJitterTitle: 'Ungültiger Jitter',
        invalidJitterDescription:
          'POLL_JITTER_RATIO muss zwischen 0 und 1 liegen.',
        saveErrorFallback:
          'Fehler beim Speichern der Client-Konfiguration.',
        saveSuccessTitle: 'Client-Konfiguration gespeichert',
        saveSuccessDescription: 'Polling & Backoff aktualisiert.',
        saveErrorTitle: 'Speichern fehlgeschlagen',
        saveErrorDescription:
          'Die Client-Polling-Einstellungen konnten nicht gespeichert werden.',
        heading: 'Dashboard-Polling',
        subtitle:
          'Steuere Intervalle und Backoff für Listen (Threads & Posts).',
        hintDefaults:
          'Standardwerte stammen aus der .env bzw. aus Build-Defaults.',
        labels: {
          threadActiveMs: 'Threads: Aktiv (ms)',
          threadIdleMs: 'Threads: Idle (ms)',
          threadHiddenMs: 'Threads: Hidden (ms)',
          threadMinimalHidden: 'Threads: Minimal Ping hidden',
          skeetActiveMs: 'Posts: Aktiv (ms)',
          skeetIdleMs: 'Posts: Idle (ms)',
          skeetHiddenMs: 'Posts: Hidden (ms)',
          skeetMinimalHidden: 'Posts: Minimal Ping hidden',
          backoffStartMs: 'Backoff Start (ms)',
          backoffMaxMs: 'Backoff Max (ms)',
          jitterRatio: 'Jitter Ratio (0..1)',
          heartbeatMs: 'Heartbeat (ms)'
        },
        summary:
          'Standardwerte: Threads {tActive}/{tIdle}/{tHidden}ms, Posts {pActive}/{pIdle}/{pHidden}ms, Backoff {bStart}→{bMax}ms, Jitter {jitter}, Heartbeat {heartbeat}ms',
        resetButton: 'Zurücksetzen auf Standard',
        saveBusy: 'Speichern…',
        saveLabel: 'Einstellungen speichern'
      },
      credentials: {
        toastTitle: 'Zugangsdaten',
        heading: 'Zugangsdaten',
        subtitle:
          'Server-URLs und Logins für Bluesky und Mastodon.',
        loading: 'Lade …',
        loadErrorFallback: 'Fehler beim Laden der Zugangsdaten.',
        loadErrorDescription:
          'Die Zugangsdaten konnten nicht geladen werden.',
        saveErrorFallback: 'Fehler beim Speichern der Zugangsdaten.',
        saveSuccessTitle: 'Gespeichert',
        saveSuccessDescription: 'Zugangsdaten aktualisiert.',
        saveErrorTitle: 'Speichern fehlgeschlagen',
        saveErrorDescription:
          'Die Zugangsdaten konnten nicht gespeichert werden.',
        required: {
          heading: 'Zugangsdaten erforderlich',
          body:
            'Bitte hinterlege zuerst deine Zugangsdaten für Bluesky (und optional Mastodon). Anschließend kannst du die weiteren Optionen nach Bedarf anpassen.'
        },
        bluesky: {
          heading: 'Bluesky',
          serverUrlLabel: 'Server URL',
          identifierLabel: 'Identifier (Handle/E-Mail)',
          appPasswordLabel: 'App Password',
          appPasswordHint:
            'Leer lassen, um das bestehende Passwort zu behalten.'
        },
        mastodon: {
          heading: 'Mastodon',
          apiUrlLabel: 'API URL',
          accessTokenLabel: 'Access Token',
          accessTokenHint:
            'Leer lassen, um das bestehende Token zu behalten.'
        },
        tenor: {
          heading: 'Tenor (GIF Suche)',
          apiKeyLabel: 'API Key',
          apiKeyHint:
            'Leer lassen, um den bestehenden Key zu behalten. Aktiviert die GIF-Suche (Tenor).'
        },
        saveBusy: 'Speichere …',
        saveLabel: 'Zugangsdaten speichern'
      },
      tabs: {
        ariaLabel: 'Konfig-Themen',
        general: 'Allgemein',
        scheduler: 'Scheduler & Retry',
        polling: 'Dashboard-Polling',
        credentials: 'Zugangsdaten'
      }
    },
    about: {
      loading: 'Infoansicht wird geladen…'
    },
    layout: {
      nav: {
        ariaLabel: 'Hauptnavigation',
        tagline: 'Control Center',
        appName: 'Kampagnen‑Tool',
        close: 'Navigation schließen',
        open: 'Navigation öffnen',
        restore: 'Navigation einblenden'
      }
    },
    common: {
      errors: {
        unknown: 'Unbekannter Fehler'
      },
      actions: {
        ok: 'OK',
        cancel: 'Abbrechen'
      }
    }
  }
}

export default messages
