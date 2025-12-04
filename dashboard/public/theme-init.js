// theme-init.js
/* global window, document */
;(function () {
  try {
    var THEMES = ['light', 'dim', 'dark', 'midnight']
    // Solange alle Nicht-'light'-Themes dark sind, reicht das:
    var darkThemes = THEMES.filter(function (name) {
      return name !== 'light'
    })

    var stored = null
	    try {
	      stored = window.localStorage.getItem('theme')
	    } catch {
	      // localStorage evtl. nicht verfügbar (Privacy-Mode etc.)
	    }

    var theme = THEMES.indexOf(stored) !== -1 ? stored : null

    if (!theme) {
      var prefersDark =
        window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches

      if (prefersDark && darkThemes.indexOf('dark') !== -1) {
        theme = 'dark'
      } else {
        theme = THEMES[0] // 'light'
      }
    }

    var root = document.documentElement
    var isDark = darkThemes.indexOf(theme) !== -1

    root.dataset.theme = theme
    root.classList.toggle('dark', isDark)
    root.style.colorScheme = isDark ? 'dark' : 'light'
	  } catch {
	    // Im Zweifel macht React/ThemeProvider später den Rest
	  }
	})()
