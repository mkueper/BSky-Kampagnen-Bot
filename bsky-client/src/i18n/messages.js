const messages = {
  de: {
    common: {
      actions: {
        retry: 'Erneut versuchen',
        viewProfile: 'Profil ansehen',
        close: 'Schließen',
        save: 'Speichern',
        saving: 'Speichert…'
      },
      status: {
        loading: 'Lade…',
        searching: 'Suche läuft…',
        autoLoading: 'Weitere Ergebnisse werden automatisch geladen…',
        noResults: 'Keine Ergebnisse gefunden.'
      },
      errors: {
        generic: 'Es ist ein Fehler aufgetreten.',
        loadMoreFailed: 'Weitere Ergebnisse konnten nicht geladen werden.'
      }
    },
    nav: {
      home: 'Home',
      search: 'Suchen',
      notifications: 'Mitteilungen',
      chat: 'Chat',
      feeds: 'Feeds',
      lists: 'Listen',
      saved: 'Gespeichert',
      blocks: 'Blockliste',
      profile: 'Profil',
      settings: 'Einstellungen',
      clientSettings: 'Client-Einstellungen',
      dashboard: 'Dashboard',
      newPost: 'Neuer Post',
      newPostAria: 'Neuen Post erstellen',
      newThread: 'Neuer Thread',
      newThreadAria: 'Neuen Thread erstellen',
      themeButton: 'Theme',
      themeSwitch: 'Theme wechseln – nächstes: {label}',
      notificationsWithCount: '{label} ({count} neu)',
      chatWithCount: '{label} ({count} neu)',
      logout: 'Abmelden',
      logoutPending: 'Abmelden…',
      accountSwitchTitle: 'Account wechseln',
      addAccount: 'Weiteren Account hinzufügen',
      viewProfile: 'Zum Profil',
      activeAccount: 'Aktiv',
      noAccounts: 'Keine Accounts gefunden.'
    },
    login: {
      heading: 'Bluesky Login',
      addAccountHeading: 'Account hinzufügen',
      subtitleStandalone: 'Melde dich mit einem App-Passwort an. Deine Sitzung bleibt lokal im Client.',
      serviceLabel: 'Service-URL',
      identifierLabel: 'Identifier (Handle/E-Mail)',
      passwordLabel: 'App-Passwort',
      passwordHelp: 'App-Passwort erstellen',
      rememberCredentials: 'Service-URL und Identifier merken',
      rememberSession: 'Angemeldet bleiben (Session speichern)',
      submitBusy: 'Anmeldung läuft…',
      submitLabel: 'Anmelden',
      errorFallback: 'Login fehlgeschlagen.',
      footerHintStandalone: 'Tipp: App-Passwörter lassen sich im Bluesky-Account unter „Settings → App Passwords“ verwalten.'
    },
    theme: {
      mode: {
        light: 'Hell',
        dim: 'Gedimmt',
        dark: 'Dunkel',
        midnight: 'Mitternacht'
      }
    },
    app: {
      status: {
        switchAccount: 'Konto wird gewechselt…'
      }
    },
    layout: {
      headers: {
        notifications: 'Mitteilungen',
        blocks: 'Persönliche Blockliste',
        saved: 'Gespeicherte Beiträge'
      },
      notifications: {
        tabAll: 'Alle',
        tabMentions: 'Erwähnungen',
        configure: 'Filter konfigurieren',
        listAll: 'Mitteilungen',
        listMentions: 'Erwähnungen'
      },
      thread: {
        title: 'Thread-Ansicht',
        back: 'Zurück zur Timeline',
        actions: {
          unroll: 'Thread entrollen',
          refresh: 'Aktualisieren'
        }
      },
      timeline: {
        tabs: {
          discover: 'Discover',
          following: 'Following',
          friendsPopular: 'Popular with Friends',
          mutuals: 'Mutuals',
          bestOfFollows: 'Best of Follows'
        },
        feedButton: 'Feeds',
        pinnedFeeds: 'Gepinnte Feeds',
        noPins: 'Noch keine Pins vorhanden.',
        feedManagerHint: 'Feed-Manager über die Seitenleiste öffnen.',
        feedFallback: 'Feed',
        languageFilterLabel: 'Sprachfilter',
        language: {
          all: 'Alle Sprachen',
          de: 'Deutsch',
          en: 'Englisch',
          fr: 'Französisch',
          es: 'Spanisch'
        }
      }
    },
    profile: {
      relation: {
        followsYou: 'Folgt dir',
        youFollow: 'Von dir gefolgt',
        muted: 'Stummgeschaltet',
        blocked: 'Blockiert',
        blockedYou: 'Blockiert dich'
      },
      stats: {
        followers: 'Follower',
        following: 'Folge ich',
        posts: 'Beiträge'
      },
      menu: {
        copyLink: 'Link zum Profil kopieren',
        searchPosts: 'Posts durchsuchen',
        addStarterPack: 'Zu Startpaketen hinzufügen',
        addToList: 'Zu Listen hinzufügen',
        mute: 'Account stummschalten',
        unmute: 'Stummschaltung aufheben',
        block: 'Account blockieren',
        unblock: 'Blockierung aufheben',
        report: 'Account melden',
        relationHeading: 'Beziehung',
        labelsHeading: 'Labels',
        labelFallback: 'Label'
      },
      follow: {
        following: 'Gefolgt',
        follow: 'Folgen',
        followingTitle: 'Du folgst diesem Profil bereits',
        followTitle: 'Folgen (bald verfügbar)'
      },
      actions: {
        back: 'Zurück',
        notificationsLabel: 'Benachrichtigungen verwalten',
        notificationsTitle: 'Benachrichtigungen (bald verfügbar)',
        messageLabel: 'Nachricht senden',
        messageTitle: 'Nachricht (bald verfügbar)',
        editProfile: 'Profil bearbeiten',
        moreLabel: 'Weitere Aktionen',
        moreTitle: 'Aktionen'
      },
      labels: {
        assigned: '{count, plural, one {# Kennzeichnung wurde diesem Account zugeordnet} other {# Kennzeichnungen wurden diesem Account zugeordnet}}'
      },
      hidden: {
        heading: 'Beiträge ausgeblendet',
        blockedBy: 'Dieser Account blockiert dich. Beiträge, Antworten und Medien werden ausgeblendet.',
        youBlocked: 'Du blockierst diesen Account. Beiträge, Antworten und Medien bleiben ausgeblendet, bis du die Blockierung aufhebst.'
      },
      confirm: {
        mute: {
          title: 'Account stummschalten',
          description: 'Beiträge dieses Accounts stummschalten? Diese Beiträge werden ausgeblendet.',
          confirm: 'Stummschalten'
        },
        unmute: {
          title: 'Stummschaltung aufheben',
          description: 'Die Stummschaltung dieses Accounts aufheben?',
          confirm: 'Aufheben'
        },
        block: {
          title: 'Account blockieren',
          description: 'Blockierte Accounts werden ausgeblendet und können nicht interagieren.',
          confirm: 'Blockieren'
        },
        unblock: {
          title: 'Blockierung aufheben',
          description: 'Blockierung dieses Accounts aufheben?',
          confirm: 'Aufheben'
        }
      },
      errors: {
        muteToggleFailed: 'Stummschalten fehlgeschlagen',
        unblockFailed: 'Blockierung aufheben fehlgeschlagen',
        blockFailed: 'Blockieren fehlgeschlagen',
        noActor: 'Kein Profil zum Anzeigen ausgewählt.',
        loadFailed: 'Profil konnte nicht geladen werden.',
        notFound: 'Profil nicht gefunden.'
      },
      tabs: {
        posts: 'Beiträge',
        replies: 'Antworten',
        media: 'Medien',
        videos: 'Videos',
        likes: 'Likes'
      }
    },
    settingsPage: {
      title: 'Einstellungen',
      empty: 'Aktuell gibt es hier keine konfigurierbaren Optionen.'
    },
    chat: {
      header: {
        title: 'Chats',
        newChat: '+ Neuer Chat',
        settings: 'Chat-Einstellungen',
        newChatPending: 'Neuer Chat wird später implementiert.'
      },
      list: {
        description: 'Deine laufenden Konversationen.',
        empty: 'Noch keine Chats vorhanden.',
        loading: 'Chats werden geladen…',
        errorTitle: 'Fehler beim Laden deiner Chats.',
        errorBody: 'Chats konnten nicht geladen werden.',
        loadMore: 'Mehr laden',
        loadingMore: 'Lädt…',
        requestLabel: 'Anfrage',
        untitled: 'Konversation',
        noMessages: 'Keine Nachrichten',
        actions: {
          more: 'Weitere Aktionen',
          viewProfile: 'Zum Profil',
          muteConversation: 'Konversation stummschalten',
          blockAccount: 'Account blockieren',
          reportConversation: 'Konversation melden',
          leaveConversation: 'Konversation verlassen'
        },
        preview: {
          you: 'Du',
          deleted: 'Nachricht gelöscht',
          attachment: 'Anhang',
          noText: 'Kein Text'
        }
      },
      settings: {
        title: 'Chat-Einstellungen',
        allowHeading: 'Erlaube neue Nachrichten von',
        option: {
          everyone: 'Jedem',
          following: 'Nutzer, denen ich folge',
          nobody: 'Niemand'
        },
        hint: 'Du kannst laufende Konversationen fortsetzen, unabhängig von dieser Einstellung.'
      },
      conversation: {
        subtitleFallback: 'Direktnachrichten',
        loading: 'Konversation wird geladen…',
        errorTitle: 'Konversation konnte nicht geladen werden.',
        empty: 'Noch keine Nachrichten.',
        loadOlder: 'Ältere Nachrichten laden',
        loadingOlder: 'Lädt…',
        inputPlaceholder: 'Nachricht schreiben…',
        send: 'Senden',
        sending: 'Senden…',
        sendError: 'Nachricht konnte nicht gesendet werden.',
        deletedMessage: 'Nachricht gelöscht',
        unknownSender: 'Unbekannt'
      }
    },
    search: {
      header: {
        title: 'Suche',
        placeholder: 'Nach Posts oder Personen suchen…',
        submit: 'Suchen',
        clear: 'Eingabe löschen'
      },
      tabs: {
        top: 'Top',
        latest: 'Neueste',
        people: 'Personen'
      },
      prefixes: {
        title: 'Such-Prefixe',
        hint: 'Format: {value}'
      },
      recent: {
        title: 'Letzte Suchanfragen',
        empty: 'Gib einen Suchbegriff ein, um Bluesky zu durchsuchen.',
        profileTitle: 'Zuletzt angesehene Profile',
        profileEmpty: 'Noch keine Profil-Historie vorhanden.',
        profileClear: 'Alle entfernen',
        profileRemove: 'Profil entfernen',
        queryTitle: 'Letzte Suchanfragen',
        queryEmpty: 'Gib einen Suchbegriff ein, um Bluesky zu durchsuchen.',
        queryClear: 'Verlauf löschen',
        queryRemove: 'Suche entfernen',
        resultCount: '{count} Treffer',
        resultCountUnknown: 'Treffer: –',
        lastSearchedAt: 'Zuletzt: {value}',
        lastSearchedUnknown: 'Zuletzt: –'
      },
      hashtag: {
        titleAll: '#{tag} – Posts ansehen',
        titleUser: '#{tag} – Posts des Nutzers ansehen',
        titleFallback: 'Hashtags – Posts ansehen',
        subtitleAll: 'Von allen Nutzern',
        errorHeading: 'Fehler beim Laden der Hashtag-Suche.',
        errorBody: 'Suche fehlgeschlagen.'
      }
    },
    timeline: {
      status: {
        error: 'Fehler: {message}',
        empty: 'Keine Einträge gefunden.',
        languageFilteredEmpty: 'Keine Beiträge in dieser Sprache.',
        languageSearchFailed: 'Sprachsuche fehlgeschlagen.',
        loadingMore: 'Mehr laden…',
        endReached: 'Ende erreicht'
      },
      thread: {
        titleWithName: 'Thread von {name}',
        titleFallback: 'Thread',
        actions: {
          unroll: 'Unroll',
          refresh: 'Aktualisieren'
        },
        noAuthorPosts: 'Keine Beiträge des Autors gefunden.',
        branches: {
          title: 'Verzweigungen',
          unknown: 'Unbekannt',
          noText: 'Kein Text verfügbar.'
        },
        depthStub: {
          title: 'Weitere Antworten',
          action: 'Fortsetzen ({count})',
          description: 'Noch mehr Antworten in dieser Verzweigung.',
          helperTitle: 'Fortsetzung tieferer Ebenen',
          parentLabel: 'Übergeordneter Beitrag',
          empty: 'Keine weiteren Antworten.',
          backLevel: 'Zurück zur vorherigen Ebene',
          backTimeline: 'Zurück zur Thread-Ansicht'
        }
      },
      unrollModal: {
        back: 'Zurück',
        title: 'Autor-Thread lesen'
      }
    },
    saved: {
      status: {
        error: 'Fehler: {message}',
        empty: 'Keine gespeicherten Beiträge gefunden.',
        loadingMore: 'Mehr laden…',
        endReached: 'Ende erreicht'
      }
    },
    blocks: {
      title: 'Persönliche Blockliste',
      subtitle: 'Alle Accounts, die du blockierst.',
      note:
        'Blockierte Accounts können nicht in deinen Threads antworten, dich erwähnen oder anderweitig mit dir interagieren. Du wirst ihre Inhalte nicht sehen und sie werden daran gehindert, deine zu sehen.',
      errorTitle: 'Fehler beim Laden deiner Blockliste.',
      errorBody: 'Blockliste konnte nicht geladen werden.',
      loading: 'Blockliste wird geladen…',
      empty: 'Du hast aktuell keine Accounts blockiert.',
      loadMore: 'Mehr laden',
      loadingMore: 'Lädt…',
      actions: {
        more: 'Weitere Aktionen',
        viewProfile: 'Profil anzeigen',
        copyLink: 'Link zum Profil kopieren',
        unblock: 'Blockierung aufheben',
        unblocking: 'Blockierung wird aufgehoben…'
      }
    },
    skeet: {
      quote: {
        authorUnknown: 'Unbekannt',
        authorMissing: 'Autorinformationen wurden nicht mitgeliefert.',
        undoSuccess: 'Zitat zurückgezogen.',
        undoError: 'Zitat konnte nicht zurückgezogen werden.',
        status: {
          blocked: 'Dieser Beitrag ist geschützt oder blockiert.',
          not_found: 'Der Original-Beitrag wurde entfernt oder ist nicht mehr verfügbar.',
          detached: 'Der Original-Beitrag wurde losgelöst und kann nicht angezeigt werden.',
          unavailable: 'Der Original-Beitrag kann nicht angezeigt werden.'
        }
      },
      context: {
        unknownActor: 'Jemand',
        repost: '{actor} hat repostet',
        like: '{actor} gefällt das'
      },
      moderation: {
        loading: 'Moderation wird geladen…',
        filteredTitle: 'Ausgeblendeter Beitrag',
        filteredBody: 'Dieser Beitrag ist durch deine Moderationseinstellungen ausgeblendet.',
        warningTitle: 'Inhalt ausgeblendet',
        warningBody: 'Dieser Beitrag wurde wegen deiner Moderationseinstellungen ausgeblendet.',
        warningLabel: 'Label: {label}',
        show: 'Anzeigen',
        hide: 'Ausblenden',
        multiLabel: '{count} Kennzeichnungen',
        noticeLabel: 'Label: {label}',
        noticeBody: 'Hinweis aus Moderationseinstellungen.'
      },
      media: {
        imageOpen: 'Bild vergrößert anzeigen',
        videoOpen: 'Video öffnen',
        videoLabel: 'Video',
        gifAlt: 'GIF',
        gifAltTitle: 'GIF: {title}',
        gifBadge: 'GIF',
        gifHint: 'Klicken zum Anzeigen',
        youtubeInlineHint: 'Klicken zum Abspielen',
        openOriginal: 'Original öffnen'
      },
      actions: {
        reply: 'Antworten',
        like: 'Gefällt mir',
        bookmarkAdd: 'Merken',
        bookmarkRemove: 'Gespeichert',
        share: 'Teilen',
        shareAria: 'Beitrag teilen',
        moreOptions: 'Mehr Optionen',
        translate: 'Übersetzen',
        translating: 'Übersetze…',
        copyText: 'Post-Text kopieren',
        copyTextSuccess: 'Text kopiert',
        copySuccess: 'Kopiert',
        copyPrompt: 'Zum Kopieren',
        showMore: 'Mehr davon anzeigen',
        showLess: 'Weniger davon anzeigen',
        muteThread: 'Thread stummschalten',
        muteWords: 'Wörter und Tags stummschalten',
        hidePost: 'Post für mich ausblenden',
        muteAccount: 'Account stummschalten',
        muteAccountSuccess: 'Account wurde stummgeschaltet.',
        muteAccountError: 'Account konnte nicht stummgeschaltet werden.',
        blockAccount: 'Account blockieren',
        blockAccountSuccess: 'Account wurde blockiert.',
        blockAccountError: 'Account konnte nicht blockiert werden.',
        reportPost: 'Post melden',
        placeholder: '{label} ist noch nicht verfügbar.',
        pinPost: 'An dein Profil anheften',
        editInteractions: 'Interaktionseinstellungen bearbeiten',
        deletePost: 'Post löschen',
        deletePostSuccess: 'Post gelöscht.',
        deletePostError: 'Post konnte nicht gelöscht werden.',
        confirmDeleteTitle: 'Post löschen?',
        confirmDeleteDescription: 'Dieser Schritt ist endgültig. Der Post wird dauerhaft entfernt.'
      },
      share: {
        linkCopied: 'Link zum Post kopiert',
        copyLink: 'Link zum Post kopieren',
        directMessage: 'Direktnachricht',
        directMessageAction: 'Per Direktnachricht senden',
        embed: 'Embed',
        embedAction: 'Post einbetten'
      },
      translation: {
        title: 'Übersetzung',
        detected: 'Erkannt: {language}',
        via: 'Automatisch übersetzt via LibreTranslate',
        close: 'Schließen',
        error: 'Übersetzung konnte nicht abgerufen werden.'
      }
    },
    notifications: {
      status: {
        loadError: 'Mitteilungen konnten nicht geladen werden.',
        empty: 'Keine Mitteilungen gefunden.',
        loading: 'Lade…',
        autoLoading: 'Weitere Mitteilungen werden automatisch geladen…',
        refreshing: 'Aktualisiere…'
      },
      settings: {
        title: 'Mitteilungen bearbeiten',
        subtitle: 'Wähle, welche Mitteilungen im Client oder per Push angezeigt werden.',
        loading: 'Einstellungen werden geladen…',
        loadError: 'Einstellungen konnten nicht geladen werden.',
        saveError: 'Einstellungen konnten nicht gespeichert werden.',
        actions: {
          edit: 'Anpassen',
          close: 'Schließen'
        },
        channels: {
          push: 'Push-Mitteilungen',
          inApp: 'In-App-Mitteilungen',
          off: 'Aus'
        },
        include: {
          title: 'Von',
          all: 'Alle',
          follows: 'Personen, denen ich folge'
        },
        like: 'Gefällt mir',
        follow: 'Neue Follower',
        reply: 'Antworten',
        mention: 'Erwähnungen',
        quote: 'Zitate',
        repost: 'Reposts',
        likeViaRepost: '„Gefällt mir“ für deine Reposts',
        repostViaRepost: 'Reposts deiner Reposts',
        activity: 'Aktivität von anderen',
        misc: 'Alles andere',
        activityListTitle: 'Abonnierte Accounts',
        activityEmpty: 'Keine abonnierten Accounts.',
        activityLoadMore: 'Mehr laden',
        activityLoadingMore: 'Lädt…',
        activityLoading: 'Aktivitätsabos werden geladen…',
        activityLoadError: 'Aktivitätsabos konnten nicht geladen werden.',
        description: {
          like: 'Mitteilungen erhalten, wenn Personen deine Posts mit „Gefällt mir“ markieren.',
          follow: 'Mitteilungen erhalten, wenn dir jemand folgt.',
          reply: 'Mitteilungen erhalten, wenn jemand auf deine Posts antwortet.',
          mention: 'Mitteilungen erhalten, wenn dich jemand erwähnt.',
          quote: 'Mitteilungen erhalten, wenn jemand deine Posts zitiert.',
          repost: 'Mitteilungen erhalten, wenn jemand deine Posts repostet.',
          likeViaRepost:
            'Mitteilungen erhalten, wenn Personen Posts mit „Gefällt mir“ markieren, die du repostet hast.',
          repostViaRepost: 'Mitteilungen erhalten, wenn jemand Posts repostet, die du repostet hast.',
          misc: 'Mitteilungen für alles andere, z. B. wenn jemand über eines deiner Startpakete beitritt.',
          activity: 'Mitteilungen zu Posts und Antworten von ausgewählten Accounts erhalten.'
        }
      },
      subject: {
        post: 'Beitrag',
        reply: 'Antwort',
        repost: 'Repost'
      },
      card: {
        authorUnknown: 'Unbekannt',
        authorMissing:
          'Profilangaben wurden von Bluesky für diese Benachrichtigung nicht mitgeliefert.',
        openThread: 'Thread öffnen',
        actions: {
          reply: 'Antworten',
          like: 'Gefällt mir',
          quoteUndoSuccess: 'Zitat zurückgezogen.',
          quoteUndoError: 'Zitat konnte nicht zurückgezogen werden.'
        }
      },
      actors: {
        collapse: 'Ausblenden',
        expandLabel: '{count} weitere anzeigen'
      },
      preview: {
        profileFallback: 'Profil',
        videoOpen: 'Video öffnen',
        videoLabel: 'Video',
        originalPost: 'Originaler Beitrag',
        quoted: {
          authorMissing: 'Autorinformationen wurden nicht mitgeliefert.',
          status: {
            blocked: 'Dieser Beitrag ist geschützt oder blockiert.',
            not_found:
              'Der Original-Beitrag wurde entfernt oder ist nicht mehr verfügbar.',
            detached:
              'Der Original-Beitrag wurde losgelöst und kann nicht angezeigt werden.'
          }
        }
      },
      actions: {
        loadMore: 'Mehr laden…'
      },
      reason: {
        like: {
          label: 'Like',
          targetSubject: 'deinen {subjectType}',
          targetRepost: 'deinen Repost',
          single: 'gefällt {target}.',
          multi:
            'und {count} weitere haben {target} mit „Gefällt mir“ markiert.'
        },
        likeViaRepost: {
          label: 'Like via Repost'
        },
        repost: {
          label: 'Repost',
          actionSubject: 'deinen {subjectType} erneut geteilt',
          actionRepost: 'deinen Repost erneut geteilt',
          single: 'hat {action}.',
          multi: 'und {count} weitere haben {action}.'
        },
        repostViaRepost: {
          label: 'Repost via Repost'
        },
        follow: {
          label: 'Follow',
          single: 'folgt dir jetzt.',
          multi: 'und {count} weitere folgen dir jetzt.'
        },
        reply: {
          label: 'Reply',
          single: 'hat auf deinen {subjectType} geantwortet.'
        },
        mention: {
          label: 'Mention',
          single: 'hat dich in einem {subjectType} erwähnt.'
        },
        quote: {
          label: 'Quote',
          single: 'hat deinen {subjectType} zitiert.',
          multi: 'und {count} weitere haben deinen {subjectType} zitiert.'
        },
        subscribedPost: {
          label: 'Subscribed Post',
          single: 'hat einen abonnierten Beitrag veröffentlicht.'
        },
        system: {
          label: 'System ({name})',
          description: 'Systembenachrichtigung von Bluesky.'
        },
        activity: {
          label: 'Aktivität',
          description: 'hat eine Aktion ausgeführt.'
        }
      }
    },
    compose: {
      titleNew: 'Neuer Post',
      titleThread: 'Neuer Thread',
      titleReply: 'Antworten',
      titleQuote: 'Post zitieren',
      cancel: 'Abbrechen',
      submit: 'Posten',
      previewUnavailableStandalone:
        'Link-Vorschau ist im Standalone-Modus derzeit nicht verfügbar.',
      discardTitle: 'Entwurf verwerfen',
      discardMessage:
        'Bist du sicher, dass du diesen Entwurf verwerfen möchtest?',
      discardConfirm: 'Verwerfen',
      thread: {
        empty: 'Thread ist leer.',
        exceedsLimit: 'Mindestens ein Segment überschreitet das Limit.',
        sendFailed: 'Thread konnte nicht gesendet werden.',
        sending: 'Sende…',
        convertButton: 'In Thread umwandeln',
        convertHint: 'Antwort in einen Thread umwandeln, um mehrere Posts zu senden.'
      },
      interactions: {
        buttonTitle: 'Interaktionen konfigurieren',
        loading: 'Lade Interaktionseinstellungen…',
        loadError: 'Interaktionseinstellungen konnten nicht geladen werden.',
        saveError: 'Einstellungen konnten nicht gespeichert werden.',
        retry: 'Erneut versuchen',
        title: 'Post-Interaktionseinstellungen',
        subtitle: 'Bestimme, wer antworten oder zitieren darf.',
        replyHeading: 'Wer kann antworten',
        option: {
          everyone: 'Jeder',
          limited: 'Nur ausgewählte Gruppen',
          followers: 'Follower',
          following: 'Personen, denen du folgst',
          mentioned: 'Erwähnte Accounts',
          oneList: '1 Liste',
          multiList: '{count} Listen',
          none: 'Keine Ausnahmen'
        },
        summary: {
          everyone: 'Antworten: Jeder',
          restricted: 'Antworten: Begrenzt',
          none: 'Antworten: Niemand'
        },
        checkbox: {
          followers: 'Deine Follower',
          'followers.desc': 'Accounts, die dir folgen.',
          following: 'Personen, denen du folgst',
          'following.desc': 'Erhalte Antworten aus deinem Feed.',
          mentioned: 'Personen, die du erwähnst',
          'mentioned.desc': 'Gilt für alle @-Erwähnungen im Post.',
          lists: 'Aus deinen Listen auswählen'
        },
        lists: {
          loading: 'Listen werden geladen…',
          empty: 'Du hast noch keine Listen erstellt.',
          selected: '{count} Listen ausgewählt',
          helper: 'Keine Liste ausgewählt.',
          disabled: 'Aktiviere „Nur ausgewählte Gruppen“, um Listen zu verwenden.',
          error: 'Listen konnten nicht geladen werden.'
        },
        quotes: {
          title: 'Zitieren dieses Posts erlauben',
          desc: 'Deaktiviert die Möglichkeit, deinen Post zu zitieren.',
          allowed: 'Zitate: erlaubt',
          disabled: 'Zitate: deaktiviert'
        },
        note: 'Diese Auswahl gilt auch zukünftig als Standard.'
      },
      context: {
        replyLabel: 'Antwort auf',
        quoteLabel: 'Zitat von',
        quoteRemove: 'Zitat entfernen',
        authorMissing: 'Autorinformationen wurden nicht mitgeliefert.'
      },
      media: {
        altRequired: 'Bitte ALT-Text für alle Medien hinzufügen.'
      },
      preview: {
        placeholder: 'Dein Text erscheint hier.',
        emptyHint: 'Füge Text, Medien oder einen Link hinzu, um die Vorschau zu sehen.',
        loading: 'Lade Vorschau…',
        error: 'Link-Vorschau konnte nicht geladen werden.',
        timeout: 'Link-Vorschau hat zu lange gebraucht.',
        dismiss: 'Link-Vorschau entfernen'
      }
    },
    clientSettings: {
      tabs: {
        layout: 'Darstellung',
        video: 'Medien',
        services: 'Externe Dienste',
        placeholder: 'Dieser Bereich wird demnächst freigeschaltet.'
      },
      title: 'Client-Einstellungen',
      subtitle: 'Diese Optionen gelten nur lokal auf diesem Gerät.',
      close: 'Schließen',
      general: {
        languageTitle: 'Sprache',
        languageBody: 'Steuert die Sprache für Navigation, Buttons und Meldungen. Die Auswahl wird lokal gespeichert.',
        languageLabel: 'Anzeigesprache',
        languageHint: 'Wirken sofort und nur auf diesem Gerät – perfekt, wenn du mehrere Accounts mit unterschiedlichen Sprachen nutzt.',
        languageSelectHint: 'Ändern'
      },
      sections: {
        gifsTitle: 'GIF-Integration',
        gifsDescription: 'Aktiviere Tenor, um GIFs direkt aus dem Composer auswählen zu können.',
        translationTitle: 'Übersetzungshilfe',
        translationDescription: 'Konfiguriere LibreTranslate und wähle einen Web-Fallback für Übersetzungen.',
        postsTitle: 'Beiträge',
        postsDescription: 'Steuert die Darstellung von Antworten, Threads und Zeitangaben.',
        unrollTitle: 'Unroll',
        unrollDescription: 'Passe an, wie der Unroll-Dialog Threads darstellt.',
        composerTitle: 'Composer',
        composerDescription: 'Steuert lokale Hilfen beim Antworten und Zitieren.',
        mediaTitle: 'Medien',
        mediaDescription: 'Steuert, wie externe Medien in Beiträgen dargestellt werden.',
        timeTitle: 'Zeitangaben',
        timeDescription: 'Steuert, ob Zeitstempel relativ oder absolut dargestellt werden.',
        videoSourcesTitle: 'Externe Video-Quellen',
        videoSourcesDescription: 'Lege fest, welche externen Video-Hosts als Vorschau oder Inline-Player erscheinen dürfen.'
      },
      tenorToggle: 'Tenor-GIFs aktivieren',
      tenorKeyLabel: 'Tenor API-Key',
      tenorKeyPlaceholder: 'API-Key einfügen',
      tenorKeyHelp: 'Der Key wird nur lokal gespeichert. Ohne Key ist die Tenor-Suche deaktiviert.',
      composer: {
        showReplyPreviewLabel: 'Antwort-Vorschau anzeigen',
        showReplyPreviewHelp: 'Blendet den Beitrag ein, auf den du antwortest. Deaktiviere die Option für ein kompakteres Composer-Layout.'
      },
      media: {
        autoPlayGifsLabel: 'GIFs automatisch abspielen',
        autoPlayGifsHelp: 'Kann Performance und Datenverbrauch erhöhen.',
        inlineVideoLabel: 'Videos inline abspielen',
        inlineVideoHelp: 'Videos werden erst nach Klick gestartet (kein Autoplay).',
        requireAltTextLabel: 'ALT-Text verpflichtend',
        requireAltTextHelp: 'Wenn aktiv, kann der Composer nur senden, wenn alle Medien einen ALT-Text haben.',
        videoAllowListEnabledLabel: 'Externe Video-Hosts aktivieren',
        videoAllowListEnabledHelp: 'Wenn deaktiviert, werden externe Videos immer als normale Links angezeigt.',
        videoAllowListLabel: 'Externe Video-Hosts',
        videoAllowListLimit: 'Max. 10',
        videoAllowListPlaceholder: 'z. B. youtube.com',
        videoAllowListAdd: 'Hinzufügen',
        videoAllowListRemove: 'Host entfernen',
        videoAllowListEmpty: 'Keine Hosts eingetragen.',
        videoAllowListHelp: 'Nur diese externen Hosts dürfen als Video-Vorschau oder Inline-Player erscheinen.'
      },
      time: {
        absoluteLabel: 'Absolute Zeitangaben anzeigen',
        absoluteHelp: 'Zeigt z. B. 20.12.2025, 11:35 statt „vor 3 Min.“.'
      },
      translation: {
        enableLabel: 'Übersetzungshilfe anzeigen',
        baseUrlLabel: 'LibreTranslate-Server',
        baseUrlPlaceholder: 'z. B. http://localhost:5000',
        baseUrlHelp: 'Nur lokale oder private Endpunkte werden akzeptiert. Der Pfad /translate wird automatisch ergänzt.',
        fallbackLabel: 'Web-Übersetzer als Fallback',
        fallbackHelp: 'Wenn der Server nicht erreichbar ist, wird der ausgewählte Dienst in einem neuen Tab geöffnet.',
        fallbackChange: 'Ändern',
        fallback: {
          google: 'Google Translate',
          deepl: 'DeepL',
          bing: 'Microsoft Translator',
          yandex: 'Yandex Translate',
          none: 'Kein Fallback'
        }
      },
      unroll: {
        showDividersLabel: 'Trennlinien zwischen Posts anzeigen',
        showDividersHelp: 'Deaktiviere die Trennlinien für eine kompakteste Darstellung.'
      },
      future: {
        heading: 'Weitere Optionen',
        body: 'Weitere Optionen – z. B. Darstellung und lokale Workflows – folgen hier in Kürze.'
      },
      language: {
        options: {
          de: 'Deutsch',
          en: 'Englisch'
        }
      },
      save: 'Speichern'
    },
  },
  en: {
    common: {
      actions: {
        retry: 'Retry',
        viewProfile: 'View profile',
        close: 'Close',
        save: 'Save',
        saving: 'Saving…'
      }
    },
    nav: {
      home: 'Home',
      search: 'Search',
      notifications: 'Notifications',
      chat: 'Chat',
      feeds: 'Feeds',
      lists: 'Lists',
      saved: 'Saved',
      blocks: 'Blocks',
      profile: 'Profile',
      settings: 'Settings',
      clientSettings: 'Client settings',
      dashboard: 'Dashboard',
      newPost: 'New post',
      newPostAria: 'Create new post',
      newThread: 'New thread',
      newThreadAria: 'Create new thread',
      themeButton: 'Theme',
      themeSwitch: 'Switch theme – next: {label}',
      notificationsWithCount: '{label} ({count} new)',
      logout: 'Sign out',
      logoutPending: 'Signing out…',
      accountSwitchTitle: 'Switch account',
      addAccount: 'Add another account',
      viewProfile: 'View profile',
      activeAccount: 'Active',
      noAccounts: 'No accounts available.'
    },
    login: {
      heading: 'Bluesky login',
      addAccountHeading: 'Add account',
      subtitleStandalone: 'Sign in with an app password. Your session stays local in the client.',
      serviceLabel: 'Service URL',
      identifierLabel: 'Identifier (handle/email)',
      passwordLabel: 'App password',
      passwordHelp: 'Create app password',
      rememberCredentials: 'Remember service URL and identifier',
      rememberSession: 'Stay signed in (store session)',
      submitBusy: 'Signing in…',
      submitLabel: 'Sign in',
      errorFallback: 'Login failed.',
      footerHintStandalone: 'Tip: Manage app passwords in your Bluesky account under “Settings → App Passwords”.'
    },
    search: {
      header: {
        title: 'Search',
        placeholder: 'Search posts or people…',
        submit: 'Search',
        clear: 'Clear search'
      },
      tabs: {
        top: 'Top',
        latest: 'Latest',
        people: 'People'
      },
      prefixes: {
        title: 'Search prefixes',
        hint: 'Format: {value}'
      },
      recent: {
        title: 'Recent searches',
        empty: 'Enter a term to search Bluesky.',
        profileTitle: 'Recently viewed profiles',
        profileEmpty: 'No profile history yet.',
        profileClear: 'Clear all',
        profileRemove: 'Remove profile',
        queryTitle: 'Recent searches',
        queryEmpty: 'Enter a term to search Bluesky.',
        queryClear: 'Clear history',
        queryRemove: 'Remove search',
        resultCount: '{count} results',
        resultCountUnknown: 'Results: —',
        lastSearchedAt: 'Last: {value}',
        lastSearchedUnknown: 'Last: —'
      },
      hashtag: {
        titleAll: '#{tag} – view posts',
        titleUser: '#{tag} – view user posts',
        titleFallback: 'Hashtags – view posts',
        subtitleAll: 'From every user',
        errorHeading: 'Failed to load hashtag search.',
        errorBody: 'Search failed.'
      }
    },
    skeet: {
      quote: {
        authorUnknown: 'Unknown',
        authorMissing: 'Author information is missing.',
        undoSuccess: 'Quote removed.',
        undoError: 'Quote could not be removed.',
        status: {
          blocked: 'This post is protected or blocked.',
          not_found: 'The original post was removed or is no longer available.',
          detached: 'The original post was detached and cannot be shown.',
          unavailable: 'The original post cannot be displayed.'
        }
      },
      context: {
        unknownActor: 'Someone',
        repost: '{actor} reposted this',
        like: '{actor} liked this'
      },
      moderation: {
        loading: 'Loading moderation…',
        filteredTitle: 'Hidden post',
        filteredBody: 'This post is hidden by your moderation settings.',
        warningTitle: 'Content hidden',
        warningBody: 'This post was hidden by your moderation settings.',
        warningLabel: 'Label: {label}',
        show: 'Show',
        hide: 'Hide',
        multiLabel: '{count} labels',
        noticeLabel: 'Label: {label}',
        noticeBody: 'Moderation notice.'
      },
      media: {
        imageOpen: 'View image in full size',
        videoOpen: 'Open video',
        videoLabel: 'Video',
        gifAlt: 'GIF',
        gifAltTitle: 'GIF: {title}',
        gifBadge: 'GIF',
        gifHint: 'Click to view',
        youtubeInlineHint: 'Click to play',
        openOriginal: 'Open original'
      },
      actions: {
        reply: 'Reply',
        like: 'Like',
        bookmarkAdd: 'Bookmark',
        bookmarkRemove: 'Saved',
        share: 'Share',
        shareAria: 'Share post',
        moreOptions: 'More options',
        translate: 'Translate',
        translating: 'Translating…',
        copyText: 'Copy post text',
        copyTextSuccess: 'Text copied',
        copySuccess: 'Copied',
        copyPrompt: 'Copy text',
        showMore: 'Show more like this',
        showLess: 'Show less like this',
        muteThread: 'Mute thread',
        muteWords: 'Mute words & tags',
        hidePost: 'Hide post for me',
        muteAccount: 'Mute account',
        muteAccountSuccess: 'Account muted.',
        muteAccountError: 'Failed to mute account.',
        blockAccount: 'Block account',
        blockAccountSuccess: 'Account blocked.',
        blockAccountError: 'Failed to block account.',
        reportPost: 'Report post',
        placeholder: '{label} is not available yet.',
        pinPost: 'Pin to your profile',
        editInteractions: 'Edit interaction settings',
        deletePost: 'Delete post',
        deletePostSuccess: 'Post deleted.',
        deletePostError: 'Could not delete post.',
        confirmDeleteTitle: 'Delete post?',
        confirmDeleteDescription: 'This action is permanent. The post will be removed.'
      },
      share: {
        linkCopied: 'Post link copied',
        copyLink: 'Copy post link',
        directMessage: 'Direct message',
        directMessageAction: 'Send via direct message',
        embed: 'Embed',
        embedAction: 'Embed this post'
      },
      translation: {
        title: 'Translation',
        detected: 'Detected: {language}',
        via: 'Automatically translated via LibreTranslate',
        close: 'Close',
        error: 'Translation could not be fetched.'
      }
    },
    settingsPage: {
      title: 'Settings',
      empty: 'There are no configurable options here right now.'
    },
    chat: {
      header: {
        title: 'Chats',
        newChat: '+ New chat',
        settings: 'Chat settings',
        newChatPending: 'New chat will arrive soon.'
      },
      list: {
        description: 'Your ongoing conversations.',
        empty: 'No chats available yet.',
        loading: 'Loading chats…',
        errorTitle: 'Failed to load your chats.',
        errorBody: 'Chats could not be loaded.',
        loadMore: 'Load more',
        loadingMore: 'Loading…',
        requestLabel: 'Request',
        untitled: 'Conversation',
        noMessages: 'No messages',
        actions: {
          more: 'More actions',
          viewProfile: 'View profile',
          muteConversation: 'Mute conversation',
          blockAccount: 'Block account',
          reportConversation: 'Report conversation',
          leaveConversation: 'Leave conversation'
        },
        preview: {
          you: 'You',
          deleted: 'Message deleted',
          attachment: 'Attachment',
          noText: 'No text'
        }
      },
      settings: {
        title: 'Chat settings',
        allowHeading: 'Allow new messages from',
        option: {
          everyone: 'Everyone',
          following: 'People I follow',
          nobody: 'Nobody'
        },
        hint: 'You can continue existing conversations regardless of this setting.'
      }
    },
    timeline: {
      status: {
        error: 'Error: {message}',
        empty: 'No entries found.',
        languageFilteredEmpty: 'No posts in this language.',
        languageSearchFailed: 'Language search failed.',
        loadingMore: 'Load more…',
        endReached: 'End reached'
      },
      thread: {
        titleWithName: 'Thread by {name}',
        titleFallback: 'Thread',
        actions: {
          unroll: 'Unroll',
          refresh: 'Refresh'
        },
        noAuthorPosts: 'No posts from this author found.',
        branches: {
          title: 'Branches',
          unknown: 'Unknown',
          noText: 'No text available.'
        },
        depthStub: {
          title: 'More replies',
          action: 'Continue ({count})',
          description: 'More replies are hidden in this branch.',
          helperTitle: 'Continuing deeper levels',
          parentLabel: 'Parent post',
          empty: 'No more replies.',
          backLevel: 'Back to previous level',
          backTimeline: 'Back to thread view'
        }
      },
      unrollModal: {
        back: 'Back',
        title: 'Read author thread'
      }
    },
    blocks: {
      title: 'Personal block list',
      subtitle: 'All accounts you block.',
      note:
        'Blocked accounts cannot reply in your threads, mention you or interact with you in any way. Their content stays hidden from you and they are prevented from viewing yours.',
      errorTitle: 'Failed to load your block list.',
      errorBody: 'Could not load the block list.',
      loading: 'Loading block list…',
      empty: 'You are not blocking any accounts.',
      loadMore: 'Load more',
      loadingMore: 'Loading…',
      actions: {
        more: 'More actions',
        viewProfile: 'View profile',
        copyLink: 'Copy profile link',
        unblock: 'Unblock account',
        unblocking: 'Unblocking…'
      }
    },
    notifications: {
      status: {
        loadError: 'Notifications could not be loaded.',
        empty: 'No notifications found.',
        loading: 'Loading…',
        autoLoading: 'More notifications are loading automatically…',
        refreshing: 'Refreshing…'
      },
      settings: {
        title: 'Edit notifications',
        subtitle: 'Choose which notifications should appear in-app or via push.',
        loading: 'Loading preferences…',
        loadError: 'Preferences could not be loaded.',
        saveError: 'Preferences could not be saved.',
        actions: {
          edit: 'Edit',
          close: 'Close'
        },
        channels: {
          push: 'Push notifications',
          inApp: 'In-app notifications',
          off: 'Off'
        },
        include: {
          title: 'From',
          all: 'All',
          follows: 'People you follow'
        },
        like: 'Likes',
        follow: 'New followers',
        reply: 'Replies',
        mention: 'Mentions',
        quote: 'Quotes',
        repost: 'Reposts',
        likeViaRepost: 'Likes on your reposts',
        repostViaRepost: 'Reposts of your reposts',
        activity: 'Activity from others',
        misc: 'Everything else',
        activityListTitle: 'Subscribed accounts',
        activityEmpty: 'No subscribed accounts.',
        activityLoadMore: 'Load more',
        activityLoadingMore: 'Loading…',
        activityLoading: 'Loading activity subscriptions…',
        activityLoadError: 'Activity subscriptions could not be loaded.',
        description: {
          like: 'Get notified when people like your posts.',
          follow: 'Get notified when someone follows you.',
          reply: 'Get notified when someone replies to your posts.',
          mention: 'Get notified when someone mentions you.',
          quote: 'Get notified when someone quotes your posts.',
          repost: 'Get notified when someone reposts your posts.',
          likeViaRepost: 'Get notified when people like posts you reposted.',
          repostViaRepost: 'Get notified when someone reposts posts you reposted.',
          misc: 'Notifications for everything else, like when someone joins via your starter packs.',
          activity: 'Get notifications about posts and replies from selected accounts.'
        }
      },
      subject: {
        post: 'Post',
        reply: 'Reply',
        repost: 'Repost'
      },
      card: {
        authorUnknown: 'Unknown',
        authorMissing: 'Bluesky did not provide profile details for this notification.',
        openThread: 'Open thread',
        actions: {
          reply: 'Reply',
          like: 'Like',
          quoteUndoSuccess: 'Quote removed.',
          quoteUndoError: 'Quote could not be removed.'
        }
      },
      actors: {
        collapse: 'Hide',
        expandLabel: 'Show {count} more'
      },
      preview: {
        profileFallback: 'Profile',
        videoOpen: 'Open video',
        videoLabel: 'Video',
        originalPost: 'Original post',
        quoted: {
          authorMissing: 'Author information is missing.',
          status: {
            blocked: 'This post is protected or blocked.',
            not_found: 'The original post was removed or is no longer available.',
            detached: 'The original post was detached and cannot be shown.'
          }
        }
      },
      actions: {
        loadMore: 'Load more…'
      },
      reason: {
        like: {
          label: 'Like',
          targetSubject: 'your {subjectType}',
          targetRepost: 'your repost',
          single: 'liked {target}.',
          multi: 'and {count} others liked {target}.'
        },
        likeViaRepost: {
          label: 'Like via repost'
        },
        repost: {
          label: 'Repost',
          actionSubject: 'reshared your {subjectType}',
          actionRepost: 'reshared your repost',
          single: '{action}.',
          multi: 'and {count} others {action}.'
        },
        repostViaRepost: {
          label: 'Repost via repost'
        },
        follow: {
          label: 'Follow',
          single: 'is now following you.',
          multi: 'and {count} others are now following you.'
        },
        reply: {
          label: 'Reply',
          single: 'replied to your {subjectType}.'
        },
        mention: {
          label: 'Mention',
          single: 'mentioned you in a {subjectType}.'
        },
        quote: {
          label: 'Quote',
          single: 'quoted your {subjectType}.',
          multi: 'and {count} others quoted your {subjectType}.'
        },
        subscribedPost: {
          label: 'Subscribed post',
          single: 'posted a subscribed post.'
        },
        system: {
          label: 'System ({name})',
          description: 'System notification from Bluesky.'
        },
        activity: {
          label: 'Activity',
          description: 'performed an action.'
        }
      }
    },
    theme: {
      mode: {
        light: 'Light',
        dim: 'Dimmed',
        dark: 'Dark',
        midnight: 'Midnight'
      }
    },
    app: {
      status: {
        switchAccount: 'Switching account…'
      }
    },
    layout: {
      headers: {
        notifications: 'Notifications',
        blocks: 'Personal block list',
        saved: 'Saved posts'
      },
      notifications: {
        tabAll: 'All',
        tabMentions: 'Mentions',
        configure: 'Configure filters',
        listAll: 'Notifications',
        listMentions: 'Mentions'
      },
      thread: {
        title: 'Thread view',
        back: 'Back to timeline',
        actions: {
          unroll: 'Unroll',
          refresh: 'Refresh'
        }
      },
      timeline: {
        tabs: {
          discover: 'Discover',
          following: 'Following',
          friendsPopular: 'Popular with friends',
          mutuals: 'Mutuals',
          bestOfFollows: 'Best of follows'
        },
        feedButton: 'Feeds',
        pinnedFeeds: 'Pinned feeds',
        noPins: 'No pins yet.',
        feedManagerHint: 'Open the feed manager via the sidebar.',
        feedFallback: 'Feed',
        languageFilterLabel: 'Language filter',
        language: {
          all: 'All languages',
          de: 'German',
          en: 'English',
          fr: 'French',
          es: 'Spanish'
        }
      }
    },
    compose: {
      titleNew: 'New post',
      titleThread: 'New thread',
      titleReply: 'Reply',
      titleQuote: 'Quote post',
      cancel: 'Cancel',
      submit: 'Post',
      previewUnavailableStandalone: 'Link preview is not available in standalone mode yet.',
      discardTitle: 'Discard draft',
      discardMessage: 'Are you sure you want to discard this draft?',
      discardConfirm: 'Discard',
      thread: {
        empty: 'Thread is empty.',
        exceedsLimit: 'At least one segment exceeds the limit.',
        sendFailed: 'Thread could not be posted.',
        sending: 'Sending…',
        convertButton: 'Convert to thread',
        convertHint: 'Switch this reply into thread mode to send multiple posts.'
      },
      interactions: {
        buttonTitle: 'Configure interactions',
        loading: 'Loading interaction settings…',
        loadError: 'Interaction settings could not be loaded.',
        saveError: 'Settings could not be saved.',
        retry: 'Try again',
        title: 'Post interaction settings',
        subtitle: 'Decide who can reply or quote.',
        replyHeading: 'Who can reply',
        option: {
          everyone: 'Everyone',
          limited: 'Selected groups only',
          followers: 'Followers',
          following: 'People you follow',
          mentioned: 'Mentioned accounts',
          oneList: '1 list',
          multiList: '{count} lists',
          none: 'No exceptions'
        },
        summary: {
          everyone: 'Replies: everyone',
          restricted: 'Replies: limited',
          none: 'Replies: nobody'
        },
        checkbox: {
          followers: 'Your followers',
          'followers.desc': 'Accounts that follow you.',
          following: 'People you follow',
          'following.desc': 'Get replies from your feed.',
          mentioned: 'People you mention',
          'mentioned.desc': 'Applies to every @ mention in the post.',
          lists: 'Pick from your lists'
        },
        lists: {
          loading: 'Loading lists…',
          empty: 'You have not created any lists yet.',
          selected: '{count} lists selected',
          helper: 'No list selected.',
          disabled: 'Enable “Selected groups only” to use lists.',
          error: 'Lists could not be loaded.'
        },
        quotes: {
          title: 'Allow quoting this post',
          desc: 'Disables the ability to quote your post.',
          allowed: 'Quotes: allowed',
          disabled: 'Quotes: disabled'
        },
        note: 'This choice also becomes your default.'
      },
      context: {
        replyLabel: 'Replying to',
        quoteLabel: 'Quoting',
        quoteRemove: 'Remove quote',
        authorMissing: 'Author information is missing.'
      },
      media: {
        altRequired: 'Please add ALT text for all media.'
      },
      preview: {
        placeholder: 'Your text will appear here.',
        emptyHint: 'Add text, media or a link to see the preview.',
        loading: 'Loading preview…',
        error: 'Link preview could not be loaded.',
        timeout: 'Link preview request timed out.',
        dismiss: 'Remove link preview'
      }
    },
    clientSettings: {
      tabs: {
        layout: 'Appearance',
        video: 'Media',
        services: 'External services',
        placeholder: 'This section will be unlocked soon.'
      },
      title: 'Client settings',
      subtitle: 'Applies only to this device and this standalone client.',
      close: 'Close',
      general: {
        languageTitle: 'Language',
        languageBody: 'Applies to navigation, buttons, and dialogs. Stored locally for each device.',
        languageLabel: 'Display language',
        languageHint: 'Takes effect immediately and only on this device—ideal for multi-account setups with different locales.',
        languageSelectHint: 'Change'
      },
      sections: {
        gifsTitle: 'GIF integration',
        gifsDescription: 'Enable Tenor to search and insert GIFs right from the composer.',
        translationTitle: 'Translation helper',
        translationDescription: 'Configure LibreTranslate and choose a web fallback for translations.',
        postsTitle: 'Posts',
        postsDescription: 'Controls reply context, thread display, and timestamp formatting.',
        unrollTitle: 'Unroll',
        unrollDescription: 'Control how the unroll dialog renders author threads.',
        composerTitle: 'Composer',
        composerDescription: 'Control how replies and quotes show helpful context.',
        mediaTitle: 'Media',
        mediaDescription: 'Controls how external media appears in posts.',
        timeTitle: 'Time display',
        timeDescription: 'Choose whether timestamps appear as relative or absolute values.',
        videoSourcesTitle: 'External video sources',
        videoSourcesDescription: 'Choose which external video hosts may appear as previews or inline players.'
      },
      tenorToggle: 'Enable Tenor GIFs',
      tenorKeyLabel: 'Tenor API key',
      tenorKeyPlaceholder: 'Enter API key',
      tenorKeyHelp: 'The key is stored locally and never shared with other services.',
      composer: {
        showReplyPreviewLabel: 'Show reply preview',
        showReplyPreviewHelp: 'Displays the post you are replying to. Disable it for a tighter composer layout.'
      },
      media: {
        autoPlayGifsLabel: 'Auto-play GIFs',
        autoPlayGifsHelp: 'May increase performance and data usage.',
        inlineVideoLabel: 'Play videos inline',
        inlineVideoHelp: 'Videos start only after click (no autoplay).',
        requireAltTextLabel: 'Require ALT text',
        requireAltTextHelp: 'When enabled, the composer can only send if all media have ALT text.',
        videoAllowListEnabledLabel: 'Enable external video hosts',
        videoAllowListEnabledHelp: 'When disabled, external videos are always rendered as regular links.',
        videoAllowListLabel: 'External video hosts',
        videoAllowListLimit: 'Max 10',
        videoAllowListPlaceholder: 'e.g. youtube.com',
        videoAllowListAdd: 'Add',
        videoAllowListRemove: 'Remove host',
        videoAllowListEmpty: 'No hosts added.',
        videoAllowListHelp: 'Only these external hosts may appear as video previews or inline players.'
      },
      time: {
        absoluteLabel: 'Show absolute timestamps',
        absoluteHelp: 'Shows e.g. Dec 20, 2025, 11:35 instead of “3 min ago”.'
      },
      translation: {
        enableLabel: 'Show translation helper',
        baseUrlLabel: 'LibreTranslate server',
        baseUrlPlaceholder: 'e.g. http://localhost:5000',
        baseUrlHelp: 'Only local/private hosts are allowed. The /translate suffix is appended automatically.',
        fallbackLabel: 'Web translator fallback',
        fallbackHelp: 'If the server is unavailable, the selected service opens in a new tab.',
        fallbackChange: 'Change',
        fallback: {
          google: 'Google Translate',
          deepl: 'DeepL',
          bing: 'Microsoft Translator',
          yandex: 'Yandex Translate',
          none: 'No fallback'
        }
      },
      unroll: {
        showDividersLabel: 'Show dividers between posts',
        showDividersHelp: 'Disable the dividers for the most compact layout.'
      },
      future: {
        heading: 'More options coming soon',
        body: 'More layout tweaks and local workflow settings will follow soon.'
      },
      language: {
        options: {
          de: 'German',
          en: 'English'
        }
      },
      save: 'Save'
    },
    profile: {
      relation: {
        followsYou: 'Follows you',
        youFollow: 'Followed by you',
        muted: 'Muted',
        blocked: 'Blocked',
        blockedYou: 'Blocked you'
      },
      stats: {
        followers: 'Followers',
        following: 'Following',
        posts: 'Posts'
      },
      menu: {
        copyLink: 'Copy profile link',
        searchPosts: 'Search posts',
        addStarterPack: 'Add to starter packs',
        addToList: 'Add to lists',
        mute: 'Mute account',
        unmute: 'Unmute account',
        block: 'Block account',
        unblock: 'Unblock account',
        report: 'Report account',
        relationHeading: 'Relationship',
        labelsHeading: 'Labels',
        labelFallback: 'Label'
      },
      follow: {
        following: 'Following',
        follow: 'Follow',
        followingTitle: 'You already follow this profile',
        followTitle: 'Follow (coming soon)'
      },
      actions: {
        back: 'Back',
        notificationsLabel: 'Manage notifications',
        notificationsTitle: 'Notifications (coming soon)',
        messageLabel: 'Send message',
        messageTitle: 'Message (coming soon)',
        editProfile: 'Edit profile',
        moreLabel: 'More actions',
        moreTitle: 'Actions'
      },
      labels: {
        assigned: '{count, plural, one {# label assigned to this account} other {# labels assigned to this account}}'
      },
      hidden: {
        heading: 'Posts hidden',
        blockedBy: 'This account blocked you. Posts, replies, and media are hidden.',
        youBlocked: 'You blocked this account. Posts, replies, and media remain hidden until you unblock it.'
      },
      confirm: {
        mute: {
          title: 'Mute account',
          description: 'Mute posts from this account? They will be hidden.',
          confirm: 'Mute'
        },
        unmute: {
          title: 'Unmute account',
          description: 'Unmute this account?',
          confirm: 'Unmute'
        },
        block: {
          title: 'Block account',
          description: 'Blocked accounts are hidden and cannot interact with you.',
          confirm: 'Block'
        },
        unblock: {
          title: 'Unblock account',
          description: 'Unblock this account?',
          confirm: 'Unblock'
        }
      },
      errors: {
        muteToggleFailed: 'Mute toggle failed.',
        unblockFailed: 'Failed to unblock account.',
        blockFailed: 'Failed to block account.',
        noActor: 'No profile selected.',
        loadFailed: 'Profile could not be loaded.',
        notFound: 'Profile not found.'
      },
      tabs: {
        posts: 'Posts',
        replies: 'Replies',
        media: 'Media',
        videos: 'Videos',
        likes: 'Likes'
      }
    },
  }
}

export default messages
