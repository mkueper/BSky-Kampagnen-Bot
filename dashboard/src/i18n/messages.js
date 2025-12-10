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
      config: 'Konfiguration',
      about: 'Über Kampagnen‑Tool'
    },
    about: {
      introTitle: 'Was das {project} macht',
      introBody1:
        'Das {project} hilft dabei, Posts und Threads für verbundene Plattformen zu planen und im Blick zu behalten. Im Mittelpunkt stehen eine übersichtliche Steuerung geplanter Inhalte, klare Statusansichten und ein nachvollziehbarer Versandverlauf.',
      introBody2:
        'Zusätzlich zum Planer bietet das {project} einen eingebetteten Bluesky‑Client für direkte Interaktionen sowie Bereiche zur Konfiguration von Scheduler, Dashboard‑Polling und Zugangsdaten. Ziel ist ein zentrales Control Center für Kampagnenarbeit, das sich an unterschiedliche Umgebungen anpassen lässt.',
      contributorsTitle: 'Mitwirkende',
      roleOwner: 'Konzeption, Entwicklung & Betreuung',
      roleArchitecture: 'Architektur & UI',
      roleAssistant: 'Agentische Unterstützung bei Code, Architektur & UI',
      roleTextAssistant: 'Unterstützung bei Texten & Übersetzungen',
      licenseTitle: 'Open Source & Lizenz',
      licenseBody:
        'Das {project} wird als Open‑Source‑Projekt unter der MIT‑Lizenz entwickelt. Details zur Lizenz finden sich in der Datei LICENSE im Projektverzeichnis. Quellcode & Issues: https://github.com/mkueper/BSky-Kampagnen-Bot',
      supportTitle: 'Support & Feedback',
      supportBody:
        'Feedback, Fehler und Ideen können als Issue im GitHub‑Repo gemeldet werden. Bitte keine Zugangsdaten oder vertraulichen Inhalte in Issues posten.',
      dataTitle: 'Daten & Betrieb',
      dataBody:
        'Inhalte, Planungen und Zugangsdaten werden in deiner eigenen Umgebung gespeichert (Datenbank/Dateisystem). Externe Dienste sind Bluesky (optional Mastodon sowie die Tenor‑GIF‑Suche), die nur im Rahmen der konfigurierten Konten angesprochen werden.',
      deploymentTitle: 'Version & Deployment',
      deploymentBody:
        'Welche Version im Einsatz ist, ergibt sich aus dem jeweiligen Deployment (z. B. Docker‑Tag oder package.json im Repository). Hinweise zu typischen Setups (Docker‑Compose, Node.js + SQLite/Postgres) finden sich im README des Projekts.',
      loading: 'Infoansicht wird geladen…'
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
        config: 'Einstellungen & Automatisierung',
        about: 'Über Kampagnen‑Tool'
      }
    },
    overview: {
      cards: {
        plannedPosts: 'Geplante Posts',
        publishedPosts: 'Veröffentlichte Posts',
        pendingPosts: 'Freizugebende Posts',
        pendingPostsInfoTitle: 'Freizugebende Posts',
        pendingPostsInfoBody:
          'Posts in diesem Bereich warten auf manuelle Freigabe und werden erst danach in den regulären Versand übernommen.',
        pendingPostsInfoAria: 'Hinweis zu freizugebenden Posts anzeigen',
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
      errors: {
        invalidCredentials: 'Benutzername oder Passwort ist ungültig.',
        missingCredentials: 'Bitte Benutzername und Passwort übermitteln.',
        notConfigured: 'Login ist noch nicht konfiguriert.',
        sessionRequired: 'Nicht angemeldet oder Sitzung abgelaufen.'
      },
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
      errorFallback: 'Login fehlgeschlagen.',
      'unconfigured.step2.afterEnv': 'hinterlegen.',
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
          pending: 'Freizugeben',
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
            'Der Planer kann verwendet werden, um erste Posts zu terminieren.',
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
        headingCreate: 'Thread planen',
        headingEdit: 'Thread bearbeiten',
        headingHint:
          'Maximal {limit} Zeichen pro Post für die gewählten Plattformen.',
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
          'Lege im Thread-Editor einen Thread an, um hier eine Vorschau zu sehen.',
        next: {
          title: 'Nächster Thread',
          none: 'Noch nichts geplant',
          noContent: 'Kein Inhalt hinterlegt'
        }
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
          'Status geplanter und veröffentlichter Threads.',
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
          'Status geplanter und veröffentlichter Posts.',
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
    importExport: {
      infoTitle: 'Import & Export von Posts und Threads',
      infoIntro:
        'Posts und Threads können als JSON-Dateien exportiert und später wieder importiert werden – zum Beispiel für Backups, Migrationen oder zum Testen in einer anderen Umgebung.',
      infoFormat:
        'Exportierte Dateien enthalten geplante Posts bzw. Threads mit ihren Feldern (z. B. Inhalt, Zeitpunkte, Wiederholungsregeln) und gegebenenfalls eingebettete Medien als Data-URLs (mit MIME-Typ, optionalem ALT-Text und Binärdaten). Die Struktur entspricht dem in der API-Dokumentation beschriebenen Schema und sollte nicht manuell verändert werden.',
      infoDuplicates:
        'Beim Import wird die Datei als Ganzes eingelesen. Duplikate – etwa dieselbe Kombination aus Inhalt/Titel, Termin und Wiederholungsregeln oder identische Thread-Segmente – werden ignoriert. Ein mehrfaches Importieren derselben Datei legt daher keine doppelten Einträge an.',
      infoAltText:
        'ALT-Texte aus dem Export werden beim Import übernommen und den betroffenen Medien wieder zugeordnet. Wenn Medien nicht im Export enthalten sind, können sie nach dem Import in den Formularen wie gewohnt ergänzt werden.',
      infoHint:
        'In der Praxis ist es sinnvoll, Import und Export zunächst mit einem kleineren Ausschnitt oder in einer Testumgebung auszuprobieren, bevor größere Kampagnenbestände migriert werden.',
      infoAria: 'Hinweis zu Import & Export anzeigen',
      labels: {
        posts: 'Posts',
        threads: 'Threads'
      },
      errors: {
        invalidJson:
          'Die ausgewählte Datei enthält kein gültiges JSON.',
        skeetsExportFailed: 'Fehler beim Export der Posts.',
        threadsExportFailed: 'Fehler beim Export der Threads.',
        skeetsImportFailed: 'Fehler beim Import der Posts.',
        threadsImportFailed: 'Fehler beim Import der Threads.',
        genericExportFailed: 'Fehler beim Export.',
        genericImportFailed: 'Fehler beim Import.'
      },
      success: {
        skeetsExportReadyTitle: 'Post-Export bereit',
        threadsExportReadyTitle: 'Thread-Export bereit',
        skeetsImportDoneTitle: 'Post-Import abgeschlossen',
        threadsImportDoneTitle: 'Thread-Import abgeschlossen',
        fileSaved: 'Datei {filename} wurde gespeichert.',
        exportAbortedTitle: 'Export abgebrochen',
        exportAbortedDescription: 'Der Speichervorgang wurde abgebrochen.',
        genericImportSuccess:
          'Alle Einträge wurden erfolgreich importiert.'
      }
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
        localeHint: 'Steuert die Anzeigesprache des Kampagnen‑Tools.',
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
        saveBusy: 'Übernehmen…',
        saveLabel: 'Übernehmen',
        timeZoneInfoTitle: 'Zeitzone im Scheduler',
        timeZoneInfoIntro:
          'Die Standard-Zeitzone definiert die Referenzzeitzone für Scheduler und Dashboard.',
        timeZoneInfoServer:
          'Cron-Ausdrücke und die Ausführung des Schedulers orientieren sich an der konfigurierten Zeitzone auf dem Server. Die lokale Browser-Zeitzone bleibt davon unabhängig.',
        timeZoneInfoForms:
          'Datums- und Zeitfelder in den Planungsformularen verwenden die Standard-Zeitzone für Vorschlagswerte und Darstellung.',
        timeZoneInfoHint:
          'In den meisten Installationen ist die Zeitzone des Deployment-Standorts (z. B. Europe/Berlin) sinnvoll. UTC eignet sich für rein technische Umgebungen.',
        timeZoneInfoAria: 'Hinweis zur Zeitzone anzeigen',
        errors: {
          timeZoneRequired: 'TIME_ZONE muss angegeben werden.',
          localeRequired: 'LOCALE muss angegeben werden.',
          localeUnsupported: 'LOCALE muss entweder "de" oder "en" sein.'
        }
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
          'Beispiele:\n0 * * * * (stündlich)\n*/5 * * * * (alle 5 Minuten)',
        summary:
          'Standardwerte: Cron {cron}, Zeitzone {tz}, Retries {retries}, Backoff {backoffMs}ms (max. {backoffMaxMs}ms)',
        cronInfoBody: 'Beispiele:\n' +
          '0   *    *    *    *      – jede volle Stunde\n' +
          '*/5 *    *    *    *      – alle 5 Minuten\n' +
          '0   12   *    *    *      – täglich um 12:00\n' +
          '30  7    *    *    *      – täglich um 07:30\n' +
          '0   9    *    *    1      – jeden Montag um 09:00\n' +
          '0   8    1    *    *      – am 1. des Monats um 08:00\n\n',
        cronInfoSummary:
          'Cron-Ausdrücke steuern, wann das Kampagnen‑Tool geplante Posts verarbeitet.',
        retryInfoInline:
          'Bei vorübergehenden Fehlern (z. B. Rate-Limits) werden Posts automatisch erneut versucht. Über Wiederholversuche, Backoff und Grace-Zeit wird festgelegt, wie lange das Nachholen erlaubt ist.',
        retryInfoIntro:
          'Wiederholversuche helfen dabei, vorübergehende Fehler beim Senden von Posts abzufedern – etwa Rate-Limits oder kurzzeitige Verbindungsprobleme.',
        retryInfoRetriesHeading: 'Maximale Wiederholversuche',
        retryInfoRetries:
          'Legt fest, wie oft ein Post nach einem Fehler erneut versucht wird, bevor er als fehlgeschlagen gilt.',
        retryInfoBackoffHeading: 'Basis-Backoff & maximaler Backoff',
        retryInfoBackoff:
          'Der Basis-Backoff bestimmt die anfängliche Wartezeit zwischen zwei Versuchen. Der maximale Backoff begrenzt, wie weit sich diese Wartezeit bei mehrfachen Fehlern erhöhen kann.',
        retryInfoGraceHeading: 'Grace-Zeit für verpasste Termine',
        retryInfoGrace:
          'Die Grace-Zeit legt fest, wie lange nach einem Neustart verpasste Sendezeitpunkte noch nachgeholt werden. Liegt ein Termin außerhalb dieses Fensters, wird der Post nicht mehr automatisch nachträglich versendet.',
        retryInfoHint:
          'Für die meisten Setups ist eine geringe Anzahl an Wiederholversuchen (z. B. 2–3) und eine moderate Grace-Zeit ausreichend, um kurzfristige Ausfälle abzufangen, ohne alte Posts stark zu verzögern.',
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
        saveBusy: 'Übernehmen…',
        saveLabel: 'Übernehmen',
        errors: {
          invalidCron: 'Ungültiger Cron-Ausdruck für den Scheduler.',
          invalidNumbers:
            'POST_RETRIES und Backoff-Werte müssen positive Zahlen sein.',
          invalidGraceWindow:
            'SCHEDULER_GRACE_WINDOW_MINUTES muss mindestens 2 Minuten betragen.'
        }
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
          'Polling ergänzt Live-Updates (SSE) und wird vor allem bei Verbindungsproblemen aktiv.',
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
        saveBusy: 'Übernehmen…',
        saveLabel: 'Übernehmen',
        infoButtonLabel: 'Dashboard-Polling',
        infoTitle: 'Dashboard-Polling & Backoff',
        infoIntro:
          'Dashboard-Polling ergänzt die Live-Updates (SSE), damit Listen für Threads und Posts auch bei Verbindungsproblemen aktualisiert werden können.',
        infoIntervalsHeading: 'Intervalle für Threads & Posts',
        infoIntervals:
          'Aktiv-, Idle- und Hidden-Intervalle steuern, wie häufig Threads und Posts im jeweiligen Zustand abgefragt werden.',
        infoBackoffHeading: 'Backoff & Jitter',
        infoBackoff:
          'Backoff-Werte bestimmen, wie stark Polling bei wiederholten Fehlern verlangsamt wird. Jitter streut die Intervalle leicht, um gleichzeitige Anfragen mehrerer Clients zu vermeiden.',
        infoHeartbeatHeading: 'Heartbeat & aktiver Tab',
        infoHeartbeat:
          'Der Heartbeat signalisiert dem Backend, ob ein aktiver Client vorhanden ist. Nur bei aktiven Clients wird Polling für Engagement-Updates häufiger ausgeführt.',
        infoHint:
          'Für die meisten Setups sind moderate Intervalle ausreichend. Aggressives Polling erhöht die Serverlast und ist meist nur für Debug- oder Testumgebungen sinnvoll.',
        infoAria: 'Hinweis zum Dashboard-Polling anzeigen',
        errors: {
          invalidNumbers:
            'Polling-Intervalle und Backoff-Werte müssen positive Zahlen sein.',
          invalidJitter: 'POLL_JITTER_RATIO muss zwischen 0 und 1 liegen.'
        }
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
        infoTitle: 'Zugangsdaten & Sicherheit',
        infoIntro:
          'Für den Betrieb des Kampagnen‑Tools werden Zugangsdaten für Bluesky (und optional Mastodon) benötigt. Ohne gültige Zugangsdaten sind Scheduler und Dashboard nur eingeschränkt nutzbar.',
        infoBluesky:
          'Bluesky verwendet Server‑URL, Identifier (Handle/E‑Mail) und ein App Password. Das App Password ist ein separates Passwort, das ausschließlich für API‑Zugriffe genutzt werden sollte.',
        infoMastodon:
          'Für Mastodon werden die API‑URL der Instanz und ein Access Token benötigt. Das Access Token sollte nur die Rechte enthalten, die für das Veröffentlichen und Verwalten der Posts erforderlich sind.',
        infoTenor:
          'Optional kann ein Tenor‑API‑Key hinterlegt werden, um die GIF‑Suche im Dashboard zu aktivieren. Ohne Key bleibt die GIF‑Suche deaktiviert, das Planen von Posts ist davon unabhängig.',
        infoSecurity:
          'Zugangsdaten werden serverseitig gespeichert. Felder für Passwörter und Tokens können leer gelassen werden, um vorhandene Werte beizubehalten.',
        infoHint:
          'In der Praxis sollten Zugangsdaten zuerst eingerichtet und getestet werden, bevor Scheduler‑ und Polling‑Einstellungen angepasst werden.',
        infoAria: 'Hinweis zu Zugangsdaten anzeigen',
        required: {
          heading: 'Zugangsdaten erforderlich',
          body:
            'Zunächst sollten Zugangsdaten für Bluesky (und optional Mastodon) hinterlegt werden. Anschließend lassen sich die weiteren Optionen nach Bedarf anpassen.'
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
          heading: 'Externe API-Keys',
          apiKeyLabel: 'Tenor API-Key',
          apiKeyHint:
            'Leer lassen, um den bestehenden Key zu behalten.'
        },
        saveBusy: 'Übernehmen…',
        saveLabel: 'Übernehmen'
      },
      tabs: {
        ariaLabel: 'Konfig-Themen',
        general: 'Allgemein',
        scheduler: 'Scheduler & Retry',
        polling: 'Dashboard-Polling',
        credentials: 'Zugangsdaten'
      }
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
  },
  en: {
    nav: {
      overview: 'Overview',
      skeets: 'Posts',
      'skeets-overview': 'Activity',
      'skeets-plan': 'Schedule',
      threads: 'Threads',
      'threads-overview': 'Activity',
      'threads-plan': 'Schedule thread',
      config: 'Configuration',
      about: 'About Campaign Tool'
    },
    header: {
      caption: {
        overview: 'Campaigns – Overview',
        skeets: 'Posts – Overview',
        'skeets-overview': 'Posts – Overview',
        'skeets-plan': 'Schedule post',
        threads: 'Threads – Overview',
        'threads-overview': 'Threads – Overview',
        'threads-plan': 'Schedule thread',
        config: 'Configuration',
        about: 'About Campaign Tool'
      },
      title: {
        overview: 'Campaigns – Overview',
        skeets: 'Posts – Overview',
        'skeets-overview': 'Posts – Overview',
        'skeets-plan': 'Schedule post',
        threads: 'Threads – Overview',
        'threads-overview': 'Threads – Overview',
        'threads-plan': 'Schedule thread',
        config: 'Settings & Automation',
        about: 'About Campaign Tool'
      }
    },
    overview: {
      cards: {
        plannedPosts: 'Scheduled posts',
        publishedPosts: 'Published posts',
        pendingPosts: 'Posts awaiting approval',
        pendingPostsInfoTitle: 'Posts awaiting approval',
        pendingPostsInfoBody:
          'Posts in this area require manual approval before they are added to the regular schedule.',
        pendingPostsInfoAria: 'Show hint for posts awaiting approval',
        plannedThreads: 'Scheduled threads',
        publishedThreads: 'Published threads'
      },
      next: {
        postTitle: 'Next post',
        threadTitle: 'Next thread',
        noPost: 'No scheduled post.',
        noThread: 'No scheduled thread.',
        noPostContent: 'No content available',
        noThreadTitle: 'No title set'
      },
      upcoming: {
        postsTitle: 'Upcoming posts',
        threadsTitle: 'Upcoming threads',
        noPosts: 'No upcoming posts.',
        noThreads: 'No upcoming threads.',
        noPostContent: '(no content)',
        noThreadTitle: '(no title)'
      },
      aria: {
        toPostsOverview: 'Switch to posts overview',
        toThreadsOverview: 'Switch to threads overview',
        toPendingPosts: 'Show posts awaiting approval'
      }
    },
    login: {
      heading: 'Campaign Tool login',
      subtitle: 'Credentials are managed on the server.',
      errors: {
        invalidCredentials: 'Username or password is invalid.',
        missingCredentials: 'Please provide both username and password.',
        notConfigured: 'Login is not configured yet.',
        sessionRequired: 'Not signed in or session expired.'
      },
      unconfigured: {
        intro:
          'Before anyone can log in, the login has to be configured in the backend:',
        step1:
          'Set the desired admin user in `.env` via `AUTH_USERNAME`.',
        step2: {
          prefix: 'Generate a password hash with',
          suffix: 'and store it as'
        },
        step3: {
          prefix: 'Set a random key as',
          suffix: 'and restart the backend.'
        },
        checkConfig: 'Check configuration'
      },
      usernameLabel: 'Username',
      usernamePlaceholder: 'admin',
      passwordLabel: 'Password',
      submitBusy: 'Signing in…',
      submitLabel: 'Sign in',
      errorFallback: 'Login failed.',
      'unconfigured.step2.afterEnv': 'store it.',
      footerHint:
        'Tip: Multiple admins are possible if cookies are shared or login is protected via a proxy.'
    },
    posts: {
      form: {
        headingEdit: 'Edit post',
        headingCreate: 'Schedule new post',
        maxLengthHint:
          'Maximum {limit} characters for the selected platforms.',
        previewDisabledReason:
          'Link previews cannot be sent together with image attachments.',
        limitExceededTitle: 'Character limit exceeded',
        limitExceededDescription:
          'The post may contain at most {limit} characters for the selected platforms.',
        limitExceededShort: 'Max. {limit} characters.',
        invalidScheduleTitle: 'Invalid schedule',
        invalidScheduleDescription: 'Please check date and time.',
        weeklyMissingDaysTitle: 'Please select weekdays',
        weeklyMissingDaysDescription: 'Select at least one day.',
        monthlyInvalidDayTitle: 'Invalid day of month',
        monthlyInvalidDayDescription:
          'Please choose a value between 1 and 31.',
        noPlatformTitle: 'No platform selected',
        noPlatformDescription:
          'Please select at least one target platform.',
        saveSuccessUpdateTitle: 'Post updated',
        saveSuccessCreateTitle: 'Post scheduled',
        saveSuccessDescription: 'Changes have been saved.',
        saveErrorTitle: 'Saving failed',
        saveErrorDescription: 'Error while saving post.',
        content: {
          label: 'Post text',
          infoAria: 'Show hint for post text',
          placeholder:
            'Write your post here…\nMentions and links are supported.',
          shortHint: 'CTRL+Enter inserts a line break.',
          counterLabel: 'Characters'
        },
        schedule: {
          heading: 'Schedule',
          infoAria: 'Show hint for scheduling',
          repeatLabel: 'Repeat pattern',
          dateLabel: 'Scheduled date',
          timeLabel: 'Scheduled time',
          timezoneHint:
            'Times are interpreted in the configured default time zone.',
          repeatNone: 'No repeat',
          repeatDaily: 'Daily',
          repeatWeekly: 'Weekly',
          repeatMonthly: 'Monthly'
        },
        preview: {
          heading: 'Preview',
          infoAria: 'Show hint for preview'
        },
        infoButtonLabel: 'Info',
        infoButtonTitle: 'Show hint',
        platforms: {
          groupLabel: 'Select platforms',
          mastodonDisabledTitle: 'Mastodon access not configured',
          bluesky: 'Bluesky',
          mastodon: 'Mastodon'
        },
        media: {
          counterLabel: 'Media',
          addImageTitle: 'Add image',
          addImageAria: 'Add image',
          limitReachedTitle: 'Maximum {count} images',
          addGifTitle: 'Add GIF',
          addGifAria: 'Add GIF',
          addGifLabel: 'GIF',
          gifLoadErrorTitle: 'GIF could not be loaded',
          removeSuccessTitle: 'Image removed',
          removeErrorTitle: 'Removal failed',
          removeErrorFallback: 'Image could not be removed.',
          removeButtonTitle: 'Remove image',
          imageAltFallback: 'Image {index}',
          altEditTitle: 'Edit ALT text',
          altAddTitle: 'Add ALT text',
          altSaveErrorFallback: 'ALT text could not be saved.',
          altSaveErrorTitle: 'Error while saving ALT text',
          altBadge: 'ALT',
          altAddBadge: '+ ALT'
        },
        emoji: {
          insertAria: 'Insert emoji',
          insertTitle: 'Insert emoji (Ctrl+.)'
        },
        repeat: {
          label: 'Repeat pattern',
          none: 'No repeat',
          daily: 'Daily',
          weekly: 'Weekly',
          monthly: 'Monthly'
        },
        time: {
          label: 'Scheduled time'
        },
        weekdays: {
          label: 'Weekdays'
        },
        monthlyDay: {
          label: 'Day of month (1–31)'
        },
        date: {
          label: 'Scheduled date'
        },
        cancel: 'Cancel',
        submitUpdate: 'Update post',
        submitCreate: 'Schedule',
        sendNow: {
          buttonBusy: 'Sending…',
          buttonDefault: 'Send now',
          createErrorFallback: 'Post could not be created.',
          unexpectedCreateResponse:
            'Unexpected response while creating post.',
          publishErrorFallback: 'Direct publishing failed.',
          successTitle: 'Published (immediately)',
          successDescription: 'The post was sent immediately.',
          errorTitle: 'Sending failed'
        },
        infoContent: {
          title: 'Hint: Post text',
          body1:
            'Target platforms define the character limit. The smallest value (e.g. Bluesky 300, Mastodon 500) applies.',
          body2:
            'For recurring posts, choose the appropriate pattern (none/weekly/monthly) and provide the required fields.'
        },
        infoPreview: {
          title: 'Hint: Preview',
          body1:
            'Use the buttons to add images or GIFs. Maximum {max} images per post.',
          body2:
            'Images are uploaded when saving. The counter shows the current character count relative to the limit.'
        }
      },
      activity: {
        title: 'Post activity',
        description:
          'Manage scheduled and published posts including replies & reactions.',
        tabs: {
          planned: 'Scheduled',
          published: 'Published',
          pending: 'To approve',
          deleted: 'Trash'
        },
        toolbar: {
          sortNewFirst: 'Newest first',
          sortOldFirst: 'Oldest first',
          refreshVisible: 'Refresh all visible',
          noVisibleTitle: 'No visible entries',
          noVisibleDescription:
            'Scroll the list to make entries visible.',
          refreshErrorTitle: 'Refresh failed',
          refreshErrorDescription: 'Error while refreshing.',
          refreshSuccessTitle: 'Visible entries updated',
          refreshSuccessDescriptionPrefix: 'Posts: ',
          refreshSuccessDescriptionSuffix: ' updated',
          refreshSuccessFailedPart: ' · {count} failed',
          refreshBackendErrorFallback:
            'Error while refreshing visible posts.'
        }
      },
      lists: {
        planned: {
          emptyTitle: 'No posts scheduled yet.',
          emptyBody:
            'Use the planner to schedule your first posts.',
          edit: 'Edit',
          remove: 'Delete',
          publishNow: 'Send',
          skipOnce: 'Discard',
          publishNowTitle: 'Send missed post once',
          skipOnceTitle: 'Discard missed post (do not catch up)'
        },
        published: {
          emptyTitle: 'No published posts yet.',
          emptyBody:
            'Once posts are live, they appear here with all metrics.',
          tabPost: 'Post',
          tabReplies: 'Replies',
          loadingReplies: 'Loading replies…',
          noReplies: 'No replies available.',
          repliesErrorPrefix: 'Error',
          reactionsRefresh: 'Refresh reactions',
          reactionsLoading: 'Loading…',
          retract: 'Withdraw',
          summaryLikes: 'Likes',
          summaryReposts: 'Reposts',
          reactionsErrorPrefix: 'Error: ',
          sentAtPrefix: 'Sent on ',
          platformLikesReposts: 'Likes {likes} · Reposts {reposts}'
        },
        deleted: {
          emptyTitle: 'No deleted posts.',
          emptyBody:
            'Deleted posts appear here and can be reactivated or removed permanently.',
          deletedAtPrefix: 'Deleted on ',
          restore: 'Restore',
          destroy: 'Delete permanently'
        }
      }
    },
    threads: {
      activity: {
        title: 'Thread activity',
        description:
          'Manage scheduled and published threads including replies & reactions.',
        tabs: {
          planned: 'Scheduled',
          published: 'Published',
          deleted: 'Trash'
        },
        toolbar: {
          sortNewFirst: 'Newest first',
          sortOldFirst: 'Oldest first',
          refreshVisible: 'Refresh all visible',
          noVisibleTitle: 'No visible entries',
          noVisibleDescription:
            'Scroll the list to make entries visible.',
          refreshErrorTitle: 'Refresh failed',
          refreshErrorDescription: 'Error while refreshing.',
          refreshSuccessTitle: 'Visible entries updated',
          refreshSuccessDescriptionPrefix: 'Threads: ',
          refreshSuccessDescriptionSuffix: ' updated',
          refreshSuccessFailedPart: ' · {count} failed',
          refreshBackendErrorFallback:
            'Error while refreshing visible threads.',
          mobileSortLabel: 'Sorting of published threads',
          includeRepliesLabel: 'Replies'
        },
        emptyTrash: 'Trash is empty.'
      },
      form: {
        saveSuccessUpdateTitle: 'Thread updated',
        saveSuccessCreateTitle: 'Thread scheduled',
        saveSuccessDescription:
          'Thread contains {count} post{suffix}.',
        headingCreate: 'Schedule thread',
        headingEdit: 'Edit thread',
        headingHint:
          'Maximum {limit} characters per post for the selected platforms.',
        saveErrorUpdateTitle: 'Update failed',
        saveErrorCreateTitle: 'Saving failed',
        saveErrorDescription:
          'Unknown error while saving thread.',
        source: {
          heading: 'Thread content',
          infoAria: 'Show hint for thread content',
          limitLabel: 'Limit: {label}',
          placeholder:
            'Example:\nIntro to the thread…\n---\nNext post…',
          shortHint:
            'CTRL+Enter inserts a separator. Long sections are split automatically. Numbering can be disabled.'
        },
        platforms: {
          legend: 'Target platforms',
          groupLabel: 'Select target platforms',
          mastodonDisabledTitle: 'Mastodon access not configured',
          optionTitle: '{label} ({limit})',
          bluesky: 'Bluesky',
          mastodon: 'Mastodon'
        },
        numbering: {
          label: 'Append automatic numbering (`1/x`)'
        },
        schedule: {
          label: 'Scheduled send',
          hint: 'Default: tomorrow at 09:00'
        },
        emoji: {
          insertAria: 'Insert emoji',
          insertTitle: 'Insert emoji (Ctrl+.)'
        },
        actions: {
          cancel: 'Cancel',
          reset: 'Reset form'
        },
        submitUpdateBusy: 'Updating…',
        submitCreateBusy: 'Scheduling…',
        submitUpdate: 'Update thread',
        submitCreate: 'Schedule',
        preview: {
          heading: 'Preview',
          infoAria: 'Show hint for preview',
          counter: '{count} post{suffix}'
        },
        media: {
          uploadErrorExistingFallback: 'Upload failed.',
          uploadExistingErrorTitle: 'Media upload failed',
          uploadErrorDescription: 'Error while uploading.',
          uploadTempErrorFallback: 'Temporary upload failed.',
          uploadTempErrorTitle: 'Upload failed',
          tooLargeMessage:
            'The file is too large. Maximum {mb} MB allowed.',
          gifTooLargeMessage: 'GIF too large. Maximum {mb} MB.',
          gifLoadErrorMessage: 'GIF could not be loaded.',
          uploadErrorDialogTitle: 'Upload failed',
          uploadErrorDialogBody:
            'The image file could not be uploaded.',
          addImageTitle: 'Add image',
          addGifTitle: 'Add GIF'
        }
      },
      activityExtra: {
        descriptionShort:
          'Status of scheduled and published threads.',
        loading: 'Thread activity is loading…'
      },
      overview: {
        loading: 'Threads are loading…',
        loadErrorTitle: 'Threads could not be loaded',
        loadErrorRetry: 'Retry',
        loadErrorFallback: 'Unknown error',
        emptyTitle: 'No threads stored yet',
        emptyBody:
          'Create a thread in the editor to see a preview here.',
        next: {
          title: 'Next thread',
          none: 'Nothing scheduled yet',
          noContent: 'No content available'
        }
      },
      card: {
        noPlatforms: 'No platforms',
        publishedAtPrefix: 'Published on: ',
        publishedFallback: 'Published',
        noSchedule: 'No date scheduled',
        scheduledAtPrefix: 'Will be posted at: ',
        scheduledForPrefix: 'Scheduled for: ',
        scheduledInvalidPrefix: 'Scheduled for ',
        postLabel: 'Post {index}',
        charactersSuffix: ' characters',
        metricsUpdatedAtPrefix: 'Metrics updated on: ',
        plannedBadge: 'Scheduled',
        showMorePosts: 'Show more posts',
        hideMorePosts: 'Hide additional posts',
        noMorePosts: 'No further posts',
        totalsTitle: 'Total overview',
        totalsLikes: 'Likes',
        totalsReposts: 'Reposts',
        totalsReplies: 'Replies',
        totalsFallback: 'Metrics have been reloaded.',
        perPlatformLine: 'Likes {likes} · Reposts {reposts}',
        repliesToggleLabel: 'Show replies',
        repliesToggleHide: 'Hide replies',
        repliesHeader: 'Replies (newest first)',
        replyPostLabel: 'Post {index}',
        refreshButton: 'Refresh reactions',
        refreshLoading: 'Loading…',
        edit: 'Edit',
        retract: 'Withdraw',
        delete: 'Delete',
        refreshSuccessTitle: 'Reactions updated',
        refreshSuccessDescription:
          'Likes {likes} · Reposts {reposts} · Replies {replies}',
        refreshSuccessFallback: 'Metrics have been reloaded.',
        refreshErrorTitle: 'Update failed',
        refreshErrorDescription:
          'Error while updating reactions.'
      }
    },
    postsExtra: {
      overview: {
        next: {
          title: 'Next post',
          none: 'Nothing scheduled yet'
        }
      },
      activity: {
        descriptionShort:
          'Status of scheduled and published posts.',
        loading: 'Post activity is loading…'
      },
      export: {
        buttonLabel: 'Export posts'
      },
      import: {
        buttonLabel: 'Import posts'
      }
    },
    importExport: {
      infoTitle: 'Import & export of posts and threads',
      infoIntro:
        'Posts and threads can be exported as JSON files and imported again later – for example for backups, migrations or testing in another environment.',
      infoFormat:
        'Exported files contain scheduled posts or threads with all their fields (e.g. content, time points, repeat rules) and optionally embedded media as data URLs (with MIME type, optional ALT text and binary data). The structure matches the schema described in the API documentation and should not be modified manually.',
      infoDuplicates:
        'When importing, the file is processed as a whole. Duplicates – for example the same combination of content/title, schedule and repeat rules or identical thread segments – are ignored. Importing the same file multiple times does not create duplicate entries.',
      infoAltText:
        'ALT texts from the export are restored on import and assigned to the corresponding media again. If media are not included in the export, they can be added as usual in the forms after import.',
      infoHint:
        'In practice, it is a good idea to try import and export first with a smaller sample or in a test environment before migrating larger campaign sets.',
      infoAria: 'Show hint for import & export',
      labels: {
        posts: 'posts',
        threads: 'threads'
      },
      errors: {
        invalidJson:
          'The selected file does not contain valid JSON.',
        skeetsExportFailed: 'Failed to export posts.',
        threadsExportFailed: 'Failed to export threads.',
        skeetsImportFailed: 'Failed to import posts.',
        threadsImportFailed: 'Failed to import threads.',
        genericExportFailed: 'Export failed.',
        genericImportFailed: 'Import failed.'
      },
      success: {
        skeetsExportReadyTitle: 'Post export ready',
        threadsExportReadyTitle: 'Thread export ready',
        skeetsImportDoneTitle: 'Post import completed',
        threadsImportDoneTitle: 'Thread import completed',
        fileSaved: 'File {filename} has been saved.',
        exportAbortedTitle: 'Export cancelled',
        exportAbortedDescription: 'The save operation was cancelled.',
        genericImportSuccess:
          'All entries have been imported successfully.'
      }
    },
    auth: {
      logout: {
        button: 'Sign out'
      }
    },
    config: {
      loading: 'Loading configuration…',
      general: {
        heading: 'General',
        subtitle:
          'Base settings for language and time zone of the campaign tool.',
        labels: {
          locale: 'Display language',
          timeZone: 'Default time zone'
        },
        localeHint: 'Controls the display language of the campaign tool.',
        timeZoneHint:
          'Example: Europe/Berlin or UTC (IANA time zone).',
        toastTitle: 'General settings',
        loadErrorDescription:
          'General settings could not be loaded.',
        saveErrorFallback:
          'Error while saving general settings.',
        saveSuccessTitle: 'General settings saved',
        saveSuccessDescription:
          'Time zone has been updated. The scheduler will use the new setting.',
        saveErrorTitle: 'Saving failed',
        saveErrorDescription:
          'General settings could not be saved.',
        summary: 'Current time zone: {tz}',
        resetButton: 'Reset to default',
        saveBusy: 'Applying…',
        saveLabel: 'Apply',
        timeZoneInfoTitle: 'Time zone in scheduler',
        timeZoneInfoIntro:
          'The default time zone defines the reference time zone for scheduler and dashboard.',
        timeZoneInfoServer:
          'Cron expressions and scheduler execution are based on the configured server time zone. The local browser time zone remains independent of this.',
        timeZoneInfoForms:
          'Date and time fields in scheduling forms use the default time zone for suggested values and display.',
        timeZoneInfoHint:
          'In most installations, the time zone of the deployment location (e.g. Europe/Berlin) is appropriate. UTC is suitable for purely technical environments.',
        timeZoneInfoAria: 'Show hint for time zone',
        errors: {
          timeZoneRequired: 'TIME_ZONE must be provided.',
          localeRequired: 'LOCALE must be provided.',
          localeUnsupported: 'LOCALE must be either "de" or "en".'
        }
      },
      scheduler: {
        toastTitle: 'Configuration',
        loadErrorDescription: 'Settings could not be loaded.',
        noChangesTitle: 'No changes',
        noChangesDescription: 'Settings are already up to date.',
        cronMissingTitle: 'Cron expression missing',
        cronMissingDescription:
          'Please provide a valid cron expression.',
        timeZoneMissingTitle: 'Time zone missing',
        timeZoneMissingDescription:
          'Please provide a time zone.',
        invalidNumberTitle: 'Invalid value',
        invalidNumberDescription:
          '{label} must be a positive number.',
        saveErrorFallback: 'Saving failed.',
        saveSuccessTitle: 'Settings saved',
        saveSuccessDescription:
          'Scheduler and retry strategy have been updated.',
        saveErrorTitle: 'Saving failed',
        saveErrorDescription:
          'Settings could not be saved.',
        heading: 'Scheduler & retry',
        subtitle:
          'Adjust cron, time zone and retry strategy for the campaign tool.',
        hintDefaults:
          'Defaults are based on the current .env.',
        labels: {
          scheduleCronBlockTitle: 'Cron',
          scheduleTime: 'Cron expression',
          timeZone: 'Time zone',
          postRetries: 'Maximum retries',
          postBackoffMs: 'Base backoff (ms)',
          postBackoffMaxMs: 'Maximum backoff (ms)',
          graceWindowMinutes:
            'Grace period for missed runs (minutes)'
        },
        examples:
          'Examples:\n0 * * * * (hourly)\n*/5 * * * * (every 5 minutes)',
        summary:
          'Defaults: Cron {cron}, time zone {tz}, retries {retries}, backoff {backoffMs}ms (max. {backoffMaxMs}ms)',
        cronInfoBody:
          'Examples:\n' +
          '0   *    *    *    *      – every full hour\n' +
          '*/5 *    *    *    *      – every 5 minutes\n' +
          '0   12   *    *    *      – daily at 12:00\n' +
          '30  7    *    *    *      – daily at 07:30\n' +
          '0   9    *    *    1      – every Monday at 09:00\n' +
          '0   8    1    *    *      – on the 1st of the month at 08:00\n\n',
        cronInfoSummary:
          'Cron expressions control when the campaign tool processes scheduled posts.',
        retryInfoInline:
          'For temporary errors (e.g. rate limits) posts are retried automatically. Retries, backoff and grace period define how long catch-up is allowed.',
        retryInfoIntro:
          'Retries help to absorb temporary errors when sending posts – such as rate limits or short network issues.',
        retryInfoRetriesHeading: 'Maximum retries',
        retryInfoRetries:
          'Defines how often a post is retried after an error before it is considered failed.',
        retryInfoBackoffHeading: 'Base backoff & maximum backoff',
        retryInfoBackoff:
          'The base backoff defines the initial wait time between attempts. The maximum backoff limits how far this wait time can increase with repeated errors.',
        retryInfoGraceHeading: 'Grace period for missed runs',
        retryInfoGrace:
          'The grace period defines how long after a restart missed send times are still caught up. If a time is outside this window, the post is no longer sent automatically.',
        retryInfoHint:
          'For most setups a small number of retries (e.g. 2–3) and a moderate grace period are enough to absorb short outages without delaying old posts too much.',
        graceHint:
          'Within this window after the scheduled time, missed posts/threads are still caught up. Minimum: 2 minutes.',
        infoHeading: 'Hints',
        tips: {
          serverTime:
            'Cron expressions refer to server time – make sure the correct time zone is configured when deploying.',
          backoff:
            'Backoff values control wait times between retries and help with rate limits.',
          apply:
            'Changes take effect immediately – the scheduler is restarted automatically.'
        },
        resetButton: 'Reset to defaults',
        saveBusy: 'Applying…',
        saveLabel: 'Apply',
        errors: {
          invalidCron: 'Invalid cron expression for scheduler.',
          invalidNumbers:
            'POST_RETRIES and backoff values must be positive numbers.',
          invalidGraceWindow:
            'SCHEDULER_GRACE_WINDOW_MINUTES must be at least 2 minutes.'
        }
      },
      polling: {
        toastTitle: 'Configuration',
        loadErrorDescription:
          'Client config could not be loaded.',
        noChangesTitle: 'No changes',
        noChangesDescription:
          'Client polling settings are already up to date.',
        invalidValuesTitle: 'Invalid values',
        invalidValuesDescription:
          'Intervals and backoff must be positive numbers.',
        invalidJitterTitle: 'Invalid jitter',
        invalidJitterDescription:
          'POLL_JITTER_RATIO must be between 0 and 1.',
        saveErrorFallback:
          'Error while saving client configuration.',
        saveSuccessTitle: 'Client configuration saved',
        saveSuccessDescription: 'Polling & backoff updated.',
        saveErrorTitle: 'Saving failed',
        saveErrorDescription:
          'Client polling settings could not be saved.',
        heading: 'Dashboard polling',
        subtitle:
          'Control intervals and backoff for thread & post lists.',
        hintDefaults:
          'Polling complements live updates (SSE) and is mainly used when connectivity is poor.',
        labels: {
          threadActiveMs: 'Threads: Active (ms)',
          threadIdleMs: 'Threads: Idle (ms)',
          threadHiddenMs: 'Threads: Hidden (ms)',
          threadMinimalHidden: 'Threads: Minimal ping hidden',
          skeetActiveMs: 'Posts: Active (ms)',
          skeetIdleMs: 'Posts: Idle (ms)',
          skeetHiddenMs: 'Posts: Hidden (ms)',
          skeetMinimalHidden: 'Posts: Minimal ping hidden',
          backoffStartMs: 'Backoff start (ms)',
          backoffMaxMs: 'Backoff max (ms)',
          jitterRatio: 'Jitter ratio (0..1)'
        },
        infoTitle: 'Dashboard polling',
        infoIntro:
          'Dashboard polling complements live updates (SSE) so that thread and post lists can be updated even when connectivity is limited.',
        infoIntervalsHeading: 'Intervals for threads & posts',
        infoIntervals:
          'Active, idle and hidden intervals define how often threads and posts are fetched in each state.',
        infoBackoffHeading: 'Backoff & jitter',
        infoBackoff:
          'Backoff values define how much polling is slowed down after repeated errors. Jitter slightly varies intervals to avoid synchronized requests from multiple clients.',
        infoHeartbeatHeading: 'Heartbeat & active tab',
        infoHeartbeat:
          'The heartbeat signals to the backend whether an active client is present. Polling for engagement updates is more frequent only when there is an active client.',
        infoHint:
          'For most setups, moderate intervals are sufficient. Aggressive polling increases server load and is mainly useful for debugging or tests.',
        infoAria: 'Show hint for dashboard polling',
        errors: {
          invalidNumbers:
            'Polling intervals and backoff values must be positive numbers.',
          invalidJitter: 'POLL_JITTER_RATIO must be between 0 and 1.'
        }
      },
      credentials: {
        toastTitle: 'Credentials',
        heading: 'Credentials',
        subtitle:
          'Server URLs and logins for Bluesky and Mastodon.',
        loading: 'Loading…',
        loadErrorFallback: 'Error while loading credentials.',
        loadErrorDescription:
          'Credentials could not be loaded.',
        saveErrorFallback: 'Error while saving credentials.',
        saveSuccessTitle: 'Saved',
        saveSuccessDescription: 'Credentials updated.',
        saveErrorTitle: 'Saving failed',
        saveErrorDescription:
          'Credentials could not be saved.',
        infoTitle: 'Credentials & security',
        infoIntro:
          'The campaign tool requires credentials for Bluesky (and optionally Mastodon). Without valid credentials, scheduler and dashboard are only partially usable.',
        infoBluesky:
          'Bluesky uses server URL, identifier (handle/email) and an app password. The app password is a separate password that should only be used for API access.',
        infoMastodon:
          'Mastodon requires the API URL of the instance and an access token. The access token should only have the permissions required to publish and manage posts.',
        infoTenor:
          'Optionally, a Tenor API key can be stored to enable GIF search in the dashboard. Without a key, GIF search stays disabled; scheduling posts is unaffected.',
        infoSecurity:
          'Credentials are stored on the server. Password and token fields can be left empty to keep existing values.',
        infoHint:
          'In practice, credentials should be set up and tested first before adjusting scheduler and polling settings.',
        infoAria: 'Show hint for credentials',
        required: {
          heading: 'Credentials required',
          body:
            'First, credentials for Bluesky (and optionally Mastodon) should be configured. Afterwards, further options can be adjusted as needed.'
        },
        bluesky: {
          heading: 'Bluesky',
          serverUrlLabel: 'Server URL',
          identifierLabel: 'Identifier (handle/email)',
          appPasswordLabel: 'App password',
          appPasswordHint:
            'Leave empty to keep existing password.'
        },
        mastodon: {
          heading: 'Mastodon',
          apiUrlLabel: 'API URL',
          accessTokenLabel: 'Access token',
          accessTokenHint:
            'Leave empty to keep existing token.'
        },
        tenor: {
          heading: 'External API keys',
          apiKeyLabel: 'Tenor API key',
          apiKeyHint:
            'Leave empty to keep existing key.'
        },
        saveBusy: 'Applying…',
        saveLabel: 'Apply'
      },
      tabs: {
        ariaLabel: 'Configuration topics',
        general: 'General',
        scheduler: 'Scheduler & retry',
        polling: 'Dashboard polling',
        credentials: 'Credentials'
      }
    },
    about: {
      introTitle: 'What {project} does',
      introBody1:
        '{project} helps you plan and keep track of posts and threads across connected platforms. The focus is on clear scheduling, transparent status views, and a traceable sending history.',
      introBody2:
        'In addition to the scheduler, {project} includes an embedded Bluesky client for direct interactions and configuration areas for the scheduler, dashboard polling, and credentials. The goal is to provide a central control center for campaign work that can adapt to different environments.',
      contributorsTitle: 'Contributors',
      roleOwner: 'Concept, development & maintenance',
      roleArchitecture: 'Architecture & UI',
      roleAssistant: 'Agentic support for code, architecture & UI',
      roleTextAssistant: 'Support for wording & translations',
      licenseTitle: 'Open source & license',
      licenseBody:
        '{project} is developed as an open‑source project under the MIT license. License details can be found in the LICENSE file in the project directory. Source code & issues: https://github.com/mkueper/BSky-Kampagnen-Bot',
      supportTitle: 'Support & feedback',
      supportBody:
        'Feedback, bugs, and ideas can be reported as issues in the GitHub repository. Please avoid posting credentials or other sensitive data in issues.',
      dataTitle: 'Data & operation',
      dataBody:
        'Content, schedules, and credentials are stored in your own environment (database/file system). External services are Bluesky (and optionally Mastodon and the Tenor GIF search), which are only contacted using the configured accounts.',
      deploymentTitle: 'Version & deployment',
      deploymentBody:
        'The running version is determined by your deployment (for example Docker image tag or package.json in the repository). Typical setups (Docker Compose, Node.js + SQLite/Postgres) are described in the project README.',
      loading: 'Loading info view…'
    },
    layout: {
      nav: {
        ariaLabel: 'Main navigation',
        tagline: 'Control Center',
        appName: 'Campaign Tool',
        close: 'Close navigation',
        open: 'Open navigation',
        restore: 'Show navigation'
      }
    },
    common: {
      errors: {
        unknown: 'Unknown error'
      },
      actions: {
        ok: 'OK',
        cancel: 'Cancel'
      }
    }
  }
}

export default messages
