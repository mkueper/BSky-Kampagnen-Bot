import { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import {
  fetchReactions,
  likePost,
  unlikePost,
  repostPost,
  unrepostPost,
  bookmarkPost,
  unbookmarkPost,
} from '../api/bsky.js';
import { useToggleMutationQueue } from './useToggleMutationQueue.js';

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function resolveCount (data, ...keys) {
  for (const key of keys) {
    if (data && Object.prototype.hasOwnProperty.call(data, key) && data[key] != null) {
      return toNumber(data[key]);
    }
  }
  return null;
}

function resolveViewerUri (data, field) {
  if (data?.viewer && typeof data.viewer === 'object' && data.viewer[field]) {
    return data.viewer[field];
  }
  if (typeof data?.recordUri === 'string' && data.recordUri) {
    return data.recordUri;
  }
  return null;
}

function resolveDebugFlag () {
  try {
    const storageFlag = globalThis?.localStorage?.getItem?.('bsky.debug.engagement') === '1'
    if (storageFlag) return true
    const search = globalThis?.location?.search || ''
    if (typeof search === 'string' && search) {
      const params = new URLSearchParams(search)
      if (params.get('debugEngagement') === '1' || params.get('debugEngagement') === 'true') return true
    }
  } catch {
    /* ignore */
  }
  return false
}

function safeDebugLog (enabled, ...args) {
  if (!enabled) return
  try {
    globalThis?.console?.log?.(...args)
  } catch {
    /* ignore */
  }
}

const PENDING_MARKER = 'pending'

function createActionId () {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function useBskyEngagement({
  uri,
  cid,
  initialLikes = 0,
  initialReposts = 0,
  viewer = {},
  fetchOnMount = false,
} = {}) {
  const [likeUri, setLikeUri] = useState(viewer?.like || null);
  const [confirmedLikeUri, setConfirmedLikeUri] = useState(viewer?.like || null);
  const [repostUri, setRepostUri] = useState(viewer?.repost || null);
  const [confirmedRepostUri, setConfirmedRepostUri] = useState(viewer?.repost || null);
  const [likeCount, setLikeCount] = useState(toNumber(initialLikes));
  const [repostCount, setRepostCount] = useState(toNumber(initialReposts));
  const [bookmarking, setBookmarking] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [isBookmarked, setIsBookmarked] = useState(Boolean(viewer?.bookmarked));
  const debugEnabled = useMemo(() => resolveDebugFlag(), []);
  const likeSnapshotRef = useRef({ likeUri, likeCount });
  const repostSnapshotRef = useRef({ repostUri, repostCount });

  useEffect(() => {
    likeSnapshotRef.current = { likeUri, likeCount };
  }, [likeUri, likeCount]);

  useEffect(() => {
    repostSnapshotRef.current = { repostUri, repostCount };
  }, [repostUri, repostCount]);

  const hasLiked = Boolean(likeUri);
  const hasReposted = Boolean(repostUri);

  const ensureTarget = useCallback(() => {
    const targetUri = String(uri || '').trim();
    const targetCid = String(cid || '').trim();
    if (!targetUri || !targetCid) {
      throw new Error('Ungueltiger Beitrag.');
    }
    return { targetUri, targetCid };
  }, [uri, cid]);

  const applyOptimisticLike = useCallback((nextIsOn) => {
    const current = likeSnapshotRef.current;
    const prevIsOn = Boolean(current.likeUri);
    if (prevIsOn === nextIsOn) {
      return { ...current };
    }
    const nextCount = Math.max(0, current.likeCount + (nextIsOn ? 1 : -1));
    const nextUri = nextIsOn
      ? (current.likeUri && current.likeUri !== PENDING_MARKER ? current.likeUri : PENDING_MARKER)
      : null;
    setLikeUri(nextUri);
    setLikeCount(nextCount);
    const snapshot = { likeUri: nextUri, likeCount: nextCount };
    likeSnapshotRef.current = snapshot;
    return snapshot;
  }, []);

  const applyOptimisticRepost = useCallback((nextIsOn) => {
    const current = repostSnapshotRef.current;
    const prevIsOn = Boolean(current.repostUri);
    if (prevIsOn === nextIsOn) {
      return { ...current };
    }
    const nextCount = Math.max(0, current.repostCount + (nextIsOn ? 1 : -1));
    const nextUri = nextIsOn
      ? (current.repostUri && current.repostUri !== PENDING_MARKER ? current.repostUri : PENDING_MARKER)
      : null;
    setRepostUri(nextUri);
    setRepostCount(nextCount);
    const snapshot = { repostUri: nextUri, repostCount: nextCount };
    repostSnapshotRef.current = snapshot;
    return snapshot;
  }, []);

  const finalizeLikeState = useCallback((serverState) => {
    const nextUri = serverState?.uri || null;
    let nextCount = likeSnapshotRef.current.likeCount;
    if (serverState && serverState.count != null) {
      nextCount = toNumber(serverState.count, nextCount);
    } else {
      const prevIsOn = Boolean(likeSnapshotRef.current.likeUri);
      const nextIsOn = Boolean(nextUri);
      if (prevIsOn !== nextIsOn) {
        nextCount = Math.max(0, nextCount + (nextIsOn ? 1 : -1));
      }
    }
    setLikeUri(nextUri);
    setLikeCount(nextCount);
    likeSnapshotRef.current = { likeUri: nextUri, likeCount: nextCount };
    setConfirmedLikeUri(nextUri);
  }, []);

  const finalizeRepostState = useCallback((serverState) => {
    const nextUri = serverState?.uri || null;
    let nextCount = repostSnapshotRef.current.repostCount;
    if (serverState && serverState.count != null) {
      nextCount = toNumber(serverState.count, nextCount);
    } else {
      const prevIsOn = Boolean(repostSnapshotRef.current.repostUri);
      const nextIsOn = Boolean(nextUri);
      if (prevIsOn !== nextIsOn) {
        nextCount = Math.max(0, nextCount + (nextIsOn ? 1 : -1));
      }
    }
    setRepostUri(nextUri);
    setRepostCount(nextCount);
    repostSnapshotRef.current = { repostUri: nextUri, repostCount: nextCount };
    setConfirmedRepostUri(nextUri);
  }, []);

  const queueLikeMutation = useToggleMutationQueue({
    initialState: { uri: confirmedLikeUri, count: likeCount },
    runMutation: useCallback(async (previousState, shouldLike) => {
      const { targetUri, targetCid } = ensureTarget();
      const actionId = createActionId();
      const snapshot = likeSnapshotRef.current;
      if (shouldLike) {
        safeDebugLog(
          debugEnabled,
          '[engagement]',
          actionId,
          'like:start',
          { uri: targetUri, cid: targetCid, hasLiked: Boolean(snapshot.likeUri), likeUri: snapshot.likeUri, likeCount: snapshot.likeCount }
        );
        const data = await likePost({ uri: targetUri, cid: targetCid });
        safeDebugLog(debugEnabled, '[engagement]', actionId, 'like:response', data);
        let nextUri = resolveViewerUri(data, 'like') || data?.recordUri || previousState?.uri || null;
        let nextCount = resolveCount(data, 'likeCount', 'likesCount');
        if (debugEnabled) {
          try {
            const verified = await fetchReactions({ uri: targetUri });
            safeDebugLog(debugEnabled, '[engagement]', actionId, 'like:verify', verified);
            if (verified?.viewer && typeof verified.viewer === 'object' && Object.prototype.hasOwnProperty.call(verified.viewer, 'like')) {
              nextUri = verified.viewer.like || null;
            }
            const verifiedCount = resolveCount(verified, 'likeCount', 'likesCount');
            if (verifiedCount != null) nextCount = verifiedCount;
          } catch (verifyError) {
            safeDebugLog(debugEnabled, '[engagement]', actionId, 'like:verifyError', verifyError);
          }
        }
        return { uri: nextUri, count: nextCount };
      }
      safeDebugLog(
        debugEnabled,
        '[engagement]',
        actionId,
        'unlike:start',
        { uri: targetUri, cid: targetCid, hasLiked: Boolean(snapshot.likeUri), likeUri: snapshot.likeUri, likeCount: snapshot.likeCount }
      );
      const likeRecordUri = previousState?.uri;
      if (!likeRecordUri) {
        safeDebugLog(debugEnabled, '[engagement]', actionId, 'unlike:response', { skipped: true });
        return { uri: null, count: previousState?.count ?? null };
      }
      const data = await unlikePost({ likeUri: likeRecordUri, postUri: targetUri });
      safeDebugLog(debugEnabled, '[engagement]', actionId, 'unlike:response', data);
      let nextCount = resolveCount(data, 'likeCount', 'likesCount');
      let nextUri = null;
      if (debugEnabled) {
        try {
          const verified = await fetchReactions({ uri: targetUri });
          safeDebugLog(debugEnabled, '[engagement]', actionId, 'unlike:verify', verified);
          if (verified?.viewer && typeof verified.viewer === 'object' && Object.prototype.hasOwnProperty.call(verified.viewer, 'like')) {
            nextUri = verified.viewer.like || null;
          }
          const verifiedCount = resolveCount(verified, 'likeCount', 'likesCount');
          if (verifiedCount != null) nextCount = verifiedCount;
        } catch (verifyError) {
          safeDebugLog(debugEnabled, '[engagement]', actionId, 'unlike:verifyError', verifyError);
        }
      }
      return { uri: nextUri, count: nextCount };
    }, [debugEnabled, ensureTarget]),
    onSuccess: finalizeLikeState,
  });

  const queueRepostMutation = useToggleMutationQueue({
    initialState: { uri: confirmedRepostUri, count: repostCount },
    runMutation: useCallback(async (previousState, shouldRepost) => {
      const { targetUri, targetCid } = ensureTarget();
      const actionId = createActionId();
      const snapshot = repostSnapshotRef.current;
      if (shouldRepost) {
        safeDebugLog(
          debugEnabled,
          '[engagement]',
          actionId,
          'repost:start',
          { uri: targetUri, cid: targetCid, hasReposted: Boolean(snapshot.repostUri), repostUri: snapshot.repostUri, repostCount: snapshot.repostCount }
        );
        const data = await repostPost({ uri: targetUri, cid: targetCid });
        safeDebugLog(debugEnabled, '[engagement]', actionId, 'repost:response', data);
        let nextUri = resolveViewerUri(data, 'repost') || data?.recordUri || previousState?.uri || null;
        let nextCount = resolveCount(data, 'repostCount', 'repostsCount');
        if (debugEnabled) {
          try {
            const verified = await fetchReactions({ uri: targetUri });
            safeDebugLog(debugEnabled, '[engagement]', actionId, 'repost:verify', verified);
            if (verified?.viewer && typeof verified.viewer === 'object' && Object.prototype.hasOwnProperty.call(verified.viewer, 'repost')) {
              nextUri = verified.viewer.repost || null;
            }
            const verifiedCount = resolveCount(verified, 'repostCount', 'repostsCount');
            if (verifiedCount != null) nextCount = verifiedCount;
          } catch (verifyError) {
            safeDebugLog(debugEnabled, '[engagement]', actionId, 'repost:verifyError', verifyError);
          }
        }
        return { uri: nextUri, count: nextCount };
      }
      safeDebugLog(
        debugEnabled,
        '[engagement]',
        actionId,
        'unrepost:start',
        { uri: targetUri, cid: targetCid, hasReposted: Boolean(snapshot.repostUri), repostUri: snapshot.repostUri, repostCount: snapshot.repostCount }
      );
      const repostRecordUri = previousState?.uri;
      if (!repostRecordUri) {
        safeDebugLog(debugEnabled, '[engagement]', actionId, 'unrepost:response', { skipped: true });
        return { uri: null, count: previousState?.count ?? null };
      }
      const data = await unrepostPost({ repostUri: repostRecordUri, postUri: targetUri });
      safeDebugLog(debugEnabled, '[engagement]', actionId, 'unrepost:response', data);
      let nextCount = resolveCount(data, 'repostCount', 'repostsCount');
      let nextUri = null;
      if (debugEnabled) {
        try {
          const verified = await fetchReactions({ uri: targetUri });
          safeDebugLog(debugEnabled, '[engagement]', actionId, 'unrepost:verify', verified);
          if (verified?.viewer && typeof verified.viewer === 'object' && Object.prototype.hasOwnProperty.call(verified.viewer, 'repost')) {
            nextUri = verified.viewer.repost || null;
          }
          const verifiedCount = resolveCount(verified, 'repostCount', 'repostsCount');
          if (verifiedCount != null) nextCount = verifiedCount;
        } catch (verifyError) {
          safeDebugLog(debugEnabled, '[engagement]', actionId, 'unrepost:verifyError', verifyError);
        }
      }
      return { uri: nextUri, count: nextCount };
    }, [debugEnabled, ensureTarget]),
    onSuccess: finalizeRepostState,
  });

  const toggleLike = useCallback(async () => {
    const shouldLike = !hasLiked;
    try {
      ensureTarget();
    } catch (err) {
      setError(err?.message || 'Aktion fehlgeschlagen');
      return null;
    }
    const optimistic = applyOptimisticLike(shouldLike);
    try {
      const result = await queueLikeMutation(shouldLike);
      setError('');
      const resolvedCount = result?.count != null ? toNumber(result.count, optimistic.likeCount) : optimistic.likeCount;
      return {
        status: shouldLike ? 'liked' : 'unliked',
        likeUri: result?.uri || null,
        likeCount: resolvedCount,
      };
    } catch (err) {
      if (err?.name === 'AbortError') return null;
      setError(err?.message || 'Aktion fehlgeschlagen');
      return null;
    }
  }, [applyOptimisticLike, ensureTarget, hasLiked, queueLikeMutation]);

  const toggleRepost = useCallback(async () => {
    const shouldRepost = !hasReposted;
    try {
      ensureTarget();
    } catch (err) {
      setError(err?.message || 'Aktion fehlgeschlagen');
      return null;
    }
    const optimistic = applyOptimisticRepost(shouldRepost);
    try {
      const result = await queueRepostMutation(shouldRepost);
      setError('');
      const resolvedCount = result?.count != null ? toNumber(result.count, optimistic.repostCount) : optimistic.repostCount;
      return {
        status: shouldRepost ? 'reposted' : 'unreposted',
        repostUri: result?.uri || null,
        repostCount: resolvedCount,
      };
    } catch (err) {
      if (err?.name === 'AbortError') return null;
      setError(err?.message || 'Aktion fehlgeschlagen');
      return null;
    }
  }, [applyOptimisticRepost, ensureTarget, hasReposted, queueRepostMutation]);

  const busy = false;

  const toggleBookmark = useCallback(async () => {
    if (bookmarking) return null;
    setBookmarking(true);
    try {
      if (!isBookmarked) {
        const { targetUri, targetCid } = ensureTarget();
        const data = await bookmarkPost({ uri: targetUri, cid: targetCid });
        const nextState = data?.viewer && Object.prototype.hasOwnProperty.call(data.viewer, 'bookmarked')
          ? Boolean(data.viewer.bookmarked)
          : true;
        setIsBookmarked(nextState);
        setError('');
        return { status: 'bookmarked', bookmarked: nextState };
      } else {
        const targetUri = String(uri || '').trim();
        if (!targetUri) throw new Error('Ungueltiger Beitrag.');
        const data = await unbookmarkPost({ uri: targetUri });
        const nextState = data?.viewer && Object.prototype.hasOwnProperty.call(data.viewer, 'bookmarked')
          ? Boolean(data.viewer.bookmarked)
          : false;
        setIsBookmarked(nextState);
        setError('');
        return { status: 'unbookmarked', bookmarked: nextState };
      }
    } catch (err) {
      setError(err?.message || 'Aktion fehlgeschlagen');
      return null;
    } finally {
      setBookmarking(false);
    }
  }, [bookmarking, isBookmarked, ensureTarget, uri]);

  const refresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const targetUri = String(uri || '').trim();
      if (!targetUri) throw new Error('Ungueltiger Beitrag.');
      const data = await fetchReactions({ uri: targetUri });
      if (data?.likesCount != null) setLikeCount(toNumber(data.likesCount));
      else if (data?.likeCount != null) setLikeCount(toNumber(data.likeCount));
      if (data?.repostsCount != null) setRepostCount(toNumber(data.repostsCount));
      else if (data?.repostCount != null) setRepostCount(toNumber(data.repostCount));
      if (data?.viewer && typeof data.viewer === 'object') {
        if (Object.prototype.hasOwnProperty.call(data.viewer, 'like')) {
          const nextLike = data.viewer.like || null;
          setLikeUri(nextLike);
          setConfirmedLikeUri(nextLike);
        }
        if (Object.prototype.hasOwnProperty.call(data.viewer, 'repost')) {
          const nextRepost = data.viewer.repost || null;
          setRepostUri(nextRepost);
          setConfirmedRepostUri(nextRepost);
        }
        if (Object.prototype.hasOwnProperty.call(data.viewer, 'bookmarked')) {
          setIsBookmarked(Boolean(data.viewer.bookmarked));
        }
      }
      setError('');
    } catch (err) {
      const code = err?.data?.code || err?.data?.error || null;
      if (code === 'BLSKY_REACTIONS_NOT_FOUND') {
        setError('Beitrag wurde entfernt oder ist nicht mehr verfügbar.');
      } else if (code === 'BLSKY_REACTIONS_RATE_LIMITED') {
        setError('Reaktionen konnten wegen eines Rate-Limits vorübergehend nicht geladen werden.');
      } else if (code === 'BLSKY_REACTIONS_UNAUTHORIZED') {
        setError('Reaktionen konnten nicht geladen werden (nicht angemeldet oder Zugangsdaten ungültig).');
      } else if (code === 'BLSKY_REACTIONS_URI_REQUIRED') {
        setError('Reaktionen konnten nicht geladen werden (URI fehlt).');
      } else {
        setError(err?.message || 'Aktualisieren fehlgeschlagen');
      }
    } finally {
      setRefreshing(false);
    }
  }, [refreshing, uri]);

  const clearError = useCallback(() => setError(''), []);

  useEffect(() => {
    if (fetchOnMount) {
      refresh();
    }
  }, [fetchOnMount, refresh]);
  return {
    likeUri,
    repostUri,
    likeCount,
    repostCount,
    hasLiked,
    hasReposted,
    isBookmarked,
    busy,
    bookmarking,
    refreshing,
    error,
    toggleLike,
    toggleRepost,
    toggleBookmark,
    refresh,
    clearError,
  };
}
