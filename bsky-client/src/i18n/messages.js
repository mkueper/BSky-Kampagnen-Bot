const messages = {
  de: {
    common: {
      actions: {
        retry: 'Erneut versuchen',
        viewProfile: 'Profil ansehen'
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
    layout: {
      headers: {
        notifications: 'Mitteilungen',
        blocks: 'Persönliche Blockliste',
        saved: 'Gespeicherte Beiträge'
      },
      notifications: {
        tabAll: 'Alle',
        tabMentions: 'Erwähnungen',
        configure: 'Filter konfigurieren'
      },
      thread: {
        title: 'Thread-Ansicht',
        back: 'Zurück zur Timeline'
      },
      timeline: {
        feedButton: 'Feeds',
        pinnedFeeds: 'Gepinnte Feeds',
        noPins: 'Noch keine Pins vorhanden.',
        feedManagerHint: 'Feed-Manager über die Seitenleiste öffnen.'
      }
    },
    chat: {
      header: {
        title: 'Chats',
        newChat: '+ Neuer Chat',
        settings: 'Chat-Einstellungen'
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
        submit: 'Suchen'
      },
      tabs: {
        top: 'Top',
        latest: 'Neueste',
        people: 'Personen'
      },
      prefixes: {
        title: 'Such-Prefixe',
        hint: 'Format: {value}',
        infoButton: 'Prefix-Hinweise',
        infoTitle: 'Such-Prefixe & Hinweise',
        infoHint: 'Tipp: Drücke ":" um Prefixe direkt auszuwählen.',
        infoEmpty: 'Keine zusätzlichen Hinweise vorhanden.'
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
        status: {
          blocked: 'Dieser Beitrag ist geschützt oder blockiert.',
          not_found:
            'Der Original-Beitrag wurde entfernt oder ist nicht mehr verfügbar.',
          detached:
            'Der Original-Beitrag wurde losgelöst und kann nicht angezeigt werden.',
          unavailable: 'Der Original-Beitrag kann nicht angezeigt werden.'
        }
      },
      media: {
        imageOpen: 'Bild vergrößert anzeigen',
        videoOpen: 'Video öffnen',
        videoLabel: 'Video',
        gifAlt: 'GIF',
        gifAltTitle: 'GIF: {title}',
        gifBadge: 'GIF',
        gifHint: 'Klicken zum Anzeigen'
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
        blockAccount: 'Account blockieren',
        reportPost: 'Post melden',
        placeholder: '{label} ist noch nicht verfügbar.'
      },
      share: {
        linkCopied: 'Link zum Post kopiert',
        copyLink: 'Link zum Post kopieren',
        openInApp: 'Im Kampagnen‑Tool öffnen',
        directMessage: 'Direktnachricht',
        directMessageAction: 'Per Direktnachricht senden',
        embed: 'Embed',
        embedAction: 'Post einbetten'
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
      subject: {
        post: 'Beitrag',
        reply: 'Antwort',
        repost: 'Repost'
      },
      card: {
        authorUnknown: 'Unbekannt',
        authorMissing:
          'Profilangaben wurden von Bluesky für diese Benachrichtigung nicht mitgeliefert.',
        actions: {
          reply: 'Antworten',
          like: 'Gefällt mir'
        }
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
      titleReply: 'Antworten',
      titleQuote: 'Post zitieren',
      cancel: 'Abbrechen',
      submit: 'Posten',
      previewUnavailableStandalone:
        'Link-Vorschau ist im Standalone-Modus derzeit nicht verfügbar.',
      discardTitle: 'Entwurf verwerfen',
      discardMessage:
        'Bist du sicher, dass du diesen Entwurf verwerfen möchtest?',
      discardConfirm: 'Verwerfen'
    },
    clientSettings: {
      title: 'Client-Einstellungen',
      subtitle: 'Diese Optionen gelten nur lokal auf diesem Gerät.',
      close: 'Schließen',
      sections: {
        gifsTitle: 'GIF-Integration',
        gifsDescription: 'Tenor stellt GIF-Suche und Vorschau direkt im Composer bereit.',
        unrollTitle: 'Unroll',
        unrollDescription: 'Steuere, wie Unroll-Threads dargestellt werden.'
      },
      tenorToggle: 'Tenor-GIFs aktivieren',
      tenorKeyLabel: 'Tenor API-Key',
      tenorKeyPlaceholder: 'Key einfügen',
      tenorKeyHelp: 'Der Key wird lokal gespeichert und nie an andere Dienste übertragen.',
      unroll: {
        showDividersLabel: 'Trennlinien zwischen Posts anzeigen',
        showDividersHelp: 'Für eine kompaktere Darstellung kannst du die Trennlinien deaktivieren.'
      },
      future: {
        heading: 'Noch mehr Einstellungen',
        body: 'Weitere Optionen – z. B. Darstellung und lokale Workflows – folgen hier in Kürze.'
      },
      save: 'Speichern'
    }
  },
  en: {
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
        submit: 'Search'
      },
      tabs: {
        top: 'Top',
        latest: 'Latest',
        people: 'People'
      },
      prefixes: {
        title: 'Search prefixes',
        hint: 'Format: {value}',
        infoButton: 'Prefix info',
        infoTitle: 'Search prefixes & hints',
        infoHint: 'Tip: Press ":" to insert a prefix quickly.',
        infoEmpty: 'No prefix hints available.'
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
    chat: {
      header: {
        title: 'Chats',
        newChat: '+ New chat',
        settings: 'Chat settings'
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
    en: {
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
    compose: {
      titleNew: 'New post',
      titleReply: 'Reply',
      titleQuote: 'Quote post',
      cancel: 'Cancel',
      submit: 'Post',
      previewUnavailableStandalone: 'Link preview is not available in standalone mode yet.',
      discardTitle: 'Entwurf verwerfen',
      discardMessage: 'Bist du sicher, dass du diesen Entwurf verwerfen möchtest?',
      discardConfirm: 'Verwerfen'
    },
    clientSettings: {
      title: 'Client settings',
      subtitle: 'Applies only to this device and this standalone client.',
      close: 'Close',
      sections: {
        gifsTitle: 'GIF integration',
        gifsDescription: 'Enable Tenor to search and insert GIFs from the composer.',
        unrollTitle: 'Unroll',
        unrollDescription: 'Control how the unroll dialog renders author threads.'
      },
      tenorToggle: 'Enable Tenor GIFs',
      tenorKeyLabel: 'Tenor API key',
      tenorKeyPlaceholder: 'Enter API key',
      tenorKeyHelp: 'The key is stored locally and never shared with other services.',
      unroll: {
        showDividersLabel: 'Show dividers between posts',
        showDividersHelp: 'Disable the dividers for the most compact layout.'
      },
      future: {
        heading: 'More settings coming soon',
        body: 'Soon you can configure additional layout tweaks and local workflows here.'
      },
      save: 'Save'
    }
  }
}

export default messages
