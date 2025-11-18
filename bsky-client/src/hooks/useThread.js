import { useCallback, useRef } from 'react';
import { useAppState, useAppDispatch } from '../context/AppContext';
import { fetchThread as fetchThreadApi } from '../modules/shared';

export function useThread() {
  const { threadState } = useAppState();
  const dispatch = useAppDispatch();
  const threadScrollPosRef = useRef(0);
  const threadHistoryRef = useRef([]);
  const requestIdRef = useRef(0);

  const getScrollContainer = useCallback(
    () => {
      const doc = typeof globalThis !== 'undefined' ? globalThis.document : null;
      return doc ? doc.getElementById('bsky-scroll-container') : null;
    },
    []
  );

  const loadThread = useCallback(async (uri, { rememberScroll = false } = {}) => {
    const normalized = String(uri || '').trim();
    if (!normalized) return;
    const requestId = ++requestIdRef.current;

    if (rememberScroll) {
      const el = getScrollContainer();
      if (el) threadScrollPosRef.current = el.scrollTop || 0;
    }

    dispatch({
      type: 'SET_THREAD_STATE',
      payload: {
        ...threadState,
        active: true,
        loading: true,
        error: '',
        data: threadState.uri === normalized ? threadState.data : null,
        uri: normalized,
      },
    });

    try {
      const data = await fetchThreadApi(normalized);
      if (requestId !== requestIdRef.current) return;
      dispatch({ type: 'SET_THREAD_STATE', payload: { active: true, loading: false, error: '', data, uri: normalized } });
    } catch (error) {
      if (globalThis?.console?.error) {
        globalThis.console.error('Thread konnte nicht geladen werden', error);
      }
      if (requestId !== requestIdRef.current) return;
      dispatch({
        type: 'SET_THREAD_STATE',
        payload: {
          active: true,
          loading: false,
          data: null,
          uri: normalized,
          error: error?.message || 'Thread konnte nicht geladen werden.',
        },
      });
    }
  }, [dispatch, getScrollContainer, threadState]);

  const closeThread = useCallback((options = {}) => {
    const { force = false } = options;
    const history = threadHistoryRef.current;
    requestIdRef.current += 1;

    if (!force && Array.isArray(history) && history.length > 0) {
      const previous = history[history.length - 1];
      threadHistoryRef.current = history.slice(0, -1);
      dispatch({ type: 'SET_THREAD_STATE', payload: previous || { active: false, loading: false, error: '', data: null, uri: null } });
      return;
    }

    threadHistoryRef.current = [];
    dispatch({ type: 'SET_THREAD_STATE', payload: { active: false, loading: false, error: '', data: null, uri: null } });
    const el = getScrollContainer();
    if (el) el.scrollTop = threadScrollPosRef.current || 0;
  }, [dispatch, getScrollContainer]);

  const selectThreadFromItem = useCallback((item) => {
    const uri = item?.uri || item?.raw?.post?.uri;
    if (!uri) return;
    if (threadState.uri && threadState.uri === uri) return;
    loadThread(uri, { rememberScroll: !threadState.active });
  }, [loadThread, threadState.active, threadState.uri]);

  const reloadThread = useCallback(() => {
    if (threadState.uri) loadThread(threadState.uri);
  }, [threadState.uri, loadThread]);

  return {
    threadState,
    loadThread,
    closeThread,
    selectThreadFromItem,
    reloadThread,
    threadHistoryRef,
  };
}
