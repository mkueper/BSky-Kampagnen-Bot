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
      dashboard: 'Dashboard',
      newPost: 'Neuer Post',
      newPostAria: 'Neuen Post erstellen',
      themeButton: 'Theme',
      themeSwitch: 'Theme wechseln – nächstes: {label}',
      notificationsWithCount: '{label} ({count} neu)'
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
      recent: {
        title: 'Letzte Suchanfragen',
        empty: 'Gib einen Suchbegriff ein, um Bluesky zu durchsuchen.'
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
      title: 'Blockliste',
      subtitle: 'Alle Accounts, die du aktuell blockierst.',
      errorTitle: 'Fehler beim Laden deiner Blockliste.',
      errorBody: 'Blockliste konnte nicht geladen werden.',
      loading: 'Blockliste wird geladen…',
      empty: 'Du hast aktuell keine Accounts blockiert.',
      loadMore: 'Mehr laden',
      loadingMore: 'Lädt…'
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
      discardTitle: 'Entwurf verwerfen',
      discardMessage:
        'Bist du sicher, dass du diesen Entwurf verwerfen möchtest?',
      discardConfirm: 'Verwerfen'
    }
  },
  en: {
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
      discardTitle: 'Entwurf verwerfen',
      discardMessage: 'Bist du sicher, dass du diesen Entwurf verwerfen möchtest?',
      discardConfirm: 'Verwerfen'
    }
  }
}

export default messages
