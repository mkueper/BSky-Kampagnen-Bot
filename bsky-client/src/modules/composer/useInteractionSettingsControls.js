import { useCallback, useEffect, useMemo } from 'react'
import { useComposerDispatch, useComposerState } from '../../context/ComposerContext.jsx'
import {
  fetchPostInteractionSettings,
  savePostInteractionSettings,
  fetchOwnLists
} from '../shared/api/bsky.js'
import {
  createDefaultInteractionData,
  createDefaultInteractionDraft,
  draftToInteractionData,
  summarizeInteractions
} from './interactionSettingsUtils.js'

export function useInteractionSettingsControls (t) {
  const dispatch = useComposerDispatch()
  const { interactionSettings } = useComposerState()

  const data = interactionSettings?.data || createDefaultInteractionData()
  const draft = interactionSettings?.draft || createDefaultInteractionDraft()

  const loadSettings = useCallback(() => {
    dispatch({ type: 'SET_INTERACTION_SETTINGS_LOADING', payload: true })
    fetchPostInteractionSettings()
      .then((settings) => dispatch({ type: 'SET_INTERACTION_SETTINGS_DATA', payload: settings }))
      .catch((error) =>
        dispatch({
          type: 'SET_INTERACTION_SETTINGS_ERROR',
          payload:
            error?.message ||
            t?.('compose.interactions.loadError', 'Interaktionseinstellungen konnten nicht geladen werden.') ||
            'Interaktionseinstellungen konnten nicht geladen werden.'
        })
      )
  }, [dispatch, t])

  useEffect(() => {
    if (!interactionSettings?.initialized && !interactionSettings?.loading) {
      loadSettings()
    }
  }, [interactionSettings?.initialized, interactionSettings?.loading, loadSettings])

  const openModal = useCallback(() => {
    dispatch({ type: 'SET_INTERACTION_MODAL_OPEN', payload: true, error: null })
  }, [dispatch])

  const closeModal = useCallback(() => {
    dispatch({ type: 'SET_INTERACTION_MODAL_OPEN', payload: false })
  }, [dispatch])

  const updateDraft = useCallback(
    (nextDraft) => {
      dispatch({ type: 'SET_INTERACTION_SETTINGS_DRAFT', payload: nextDraft })
    },
    [dispatch]
  )

  const saveInteractions = useCallback(async () => {
    const payload = draftToInteractionData(draft)
    dispatch({ type: 'SET_INTERACTION_SETTINGS_SAVING', payload: true })
    try {
      await savePostInteractionSettings(payload)
      dispatch({ type: 'SET_INTERACTION_SETTINGS_DATA', payload })
      dispatch({ type: 'SET_INTERACTION_MODAL_OPEN', payload: false })
    } catch (error) {
      dispatch({
        type: 'SET_INTERACTION_SETTINGS_ERROR',
        payload:
          error?.message ||
          t?.('compose.interactions.saveError', 'Einstellungen konnten nicht gespeichert werden.') ||
          'Einstellungen konnten nicht gespeichert werden.'
      })
    } finally {
      dispatch({ type: 'SET_INTERACTION_SETTINGS_SAVING', payload: false })
    }
  }, [dispatch, draft, t])

  const loadLists = useCallback(() => {
    if (interactionSettings?.lists?.loading) return
    dispatch({ type: 'SET_INTERACTION_LISTS_LOADING', payload: true })
    fetchOwnLists()
      .then((result) => dispatch({ type: 'SET_INTERACTION_LISTS', payload: result }))
      .catch((error) =>
        dispatch({
          type: 'SET_INTERACTION_LISTS_ERROR',
          payload:
            error?.message ||
            t?.('compose.interactions.lists.error', 'Listen konnten nicht geladen werden.') ||
            'Listen konnten nicht geladen werden.'
        })
      )
  }, [dispatch, interactionSettings?.lists?.loading, t])

  const summary = useMemo(() => summarizeInteractions(data, t), [data, t])

  return {
    interactionSettings: interactionSettings || {
      modalOpen: false,
      loading: true,
      saving: false,
      initialized: false,
      error: null,
      data,
      draft,
      lists: { items: [], loading: false, error: null, loaded: false }
    },
    data,
    draft,
    summary,
    openModal,
    closeModal,
    updateDraft,
    saveInteractions,
    loadLists,
    reloadSettings: loadSettings
  }
}
