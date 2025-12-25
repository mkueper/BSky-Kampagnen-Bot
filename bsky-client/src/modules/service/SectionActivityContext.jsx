import { createContext, useContext } from 'react'

const SectionActivityContext = createContext(null)

export function SectionActivityProvider ({ value, children }) {
  if (value == null) {
    throw new Error('SectionActivityProvider requires a non-null value.')
  }
  return (
    <SectionActivityContext.Provider value={value}>
      {children}
    </SectionActivityContext.Provider>
  )
}

export function useSectionActivity () {
  const context = useContext(SectionActivityContext)
  if (!context) {
    throw new Error('useSectionActivity must be used within a SectionActivityProvider.')
  }
  return context
}
