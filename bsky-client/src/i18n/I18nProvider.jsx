import React from 'react'
import { createContext, useContext, useMemo, useState } from 'react'
import messages from './messages.js'

const I18nContext = createContext(null)

function resolveMessage (dictionary, key) {
  if (!key || typeof key !== 'string') return undefined
  return key.split('.').reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : undefined), dictionary)
}

function interpolate (template, params) {
  if (typeof template !== 'string') return template
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (_, token) => {
    if (params[token] === undefined || params[token] === null) return ''
    return String(params[token])
  })
}

export function I18nProvider ({ children, initialLocale = 'de' }) {
  const [locale, setLocale] = useState(initialLocale)

  const value = useMemo(() => {
    const dictionary = messages[locale] || messages.de || {}
    const fallbackDictionary = messages.de || {}

    const t = (key, fallback, params) => {
      const template = resolveMessage(dictionary, key) ?? resolveMessage(fallbackDictionary, key) ?? fallback ?? key
      return interpolate(template, params)
    }

    return {
      locale,
      setLocale,
      t
    }
  }, [locale])

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  )
}

export function useTranslation () {
  const ctx = useContext(I18nContext)
  if (!ctx) {
    throw new Error('useTranslation muss innerhalb eines I18nProvider verwendet werden.')
  }
  return ctx
}
