import { useCallback, useRef } from 'react';
import { useThreadState, useThreadDispatch } from '../context/ThreadContext.jsx';
import { fetchThread as fetchThreadApi } from '../modules/shared';

function detectThreadMetadata (data) {
  try {
    const focus = data?.focus || null
    const parents = Array.isArray(data?.parents) ? data.parents : []
    if (!focus) return { isAuthorThread: false, rootAuthorDid: null, focusAuthorDid: null }
    const focusAuthorDid = focus?.author?.did || null
    const parentRootAuthorDid = parents.length > 0 ? parents[0]?.author?.did || null : null
    if (focusAuthorDid && parentRootAuthorDid) {
      const isAuthorThread = focusAuthorDid === parentRootAuthorDid
      return { isAuthorThread, rootAuthorDid: parentRootAuthorDid, focusAuthorDid }
    }
    if (focusAuthorDid && parents.length === 0) {
      const ownReplies = Array.isArray(focus?.replies) ? focus.replies : []
      const hasOwnContinuation = ownReplies.some((reply) => reply?.author?.did === focusAuthorDid)
      return {
        isAuthorThread: hasOwnContinuation,
        rootAuthorDid: hasOwnContinuation ? focusAuthorDid : null,
        focusAuthorDid
      }
    }
    return { isAuthorThread: false, rootAuthorDid: parentRootAuthorDid, focusAuthorDid }
  } catch {
    return { isAuthorThread: false, rootAuthorDid: null, focusAuthorDid: null }
  }
}

const HISTORY_LIMIT = 10

export function useThread() {
  const { threadState, threadViewVariant } = useThreadState();
  const dispatch = useThreadDispatch();
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

  const loadThread = useCallback(async (uri, { rememberScroll = false, pushHistory = true, viewMode = 'full' } = {}) => {
    const normalized = String(uri || '').trim();
    if (!normalized) return;
    const requestId = ++requestIdRef.current;

    if (rememberScroll) {
      const el = getScrollContainer();
      if (el) threadScrollPosRef.current = el.scrollTop || 0;
    }

    if (
      pushHistory &&
      threadState.active &&
      threadState.uri &&
      threadState.uri !== normalized
    ) {
      const snapshot = { ...threadState };
      threadHistoryRef.current = [...threadHistoryRef.current, snapshot].slice(-HISTORY_LIMIT);
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
        viewMode,
        isAuthorThread: false,
        rootAuthorDid: null,
        focusAuthorDid: null
      },
    });

    try {
      const data = await fetchThreadApi(normalized);
      if (requestId !== requestIdRef.current) return;
      const { isAuthorThread: nextIsAuthorThread, rootAuthorDid, focusAuthorDid } = detectThreadMetadata(data)
      dispatch({
        type: 'SET_THREAD_STATE',
        payload: {
          active: true,
          loading: false,
          error: '',
          data,
          uri: normalized,
          viewMode,
          isAuthorThread: nextIsAuthorThread,
          rootAuthorDid,
          focusAuthorDid
        }
      });
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
          viewMode,
          isAuthorThread: false,
          rootAuthorDid: null,
          focusAuthorDid: null
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
    dispatch({
      type: 'SET_THREAD_STATE',
      payload: { active: false, loading: false, error: '', data: null, uri: null, viewMode: 'full', isAuthorThread: false, rootAuthorDid: null, focusAuthorDid: null }
    });
    dispatch({ type: 'CLOSE_THREAD_UNROLL' });
    const el = getScrollContainer();
    if (el) el.scrollTop = threadScrollPosRef.current || 0;
  }, [dispatch, getScrollContainer]);

  const selectThreadFromItem = useCallback((item) => {
    const uri = item?.uri || item?.raw?.post?.uri;
    if (!uri) return;
    if (threadState.uri && threadState.uri === uri) return;
    loadThread(uri, { rememberScroll: !threadState.active, viewMode: 'full' });
  }, [loadThread, threadState.active, threadState.uri]);

  const reloadThread = useCallback(() => {
    if (threadState.uri) loadThread(threadState.uri, { pushHistory: false, viewMode: threadState.viewMode || 'full' });
  }, [threadState.uri, loadThread]);

  const setThreadViewVariant = useCallback((variant) => {
    if (typeof variant !== 'string') return;
    dispatch({ type: 'SET_THREAD_VIEW_VARIANT', payload: variant });
  }, [dispatch]);

  return {
    threadState,
    threadViewVariant,
    loadThread,
    closeThread,
    selectThreadFromItem,
    reloadThread,
    threadHistoryRef,
    setThreadViewVariant,
  };
}
