import { useCallback, useMemo, useState, useEffect } from 'react';
import {
  fetchReactions,
  likePost,
  unlikePost,
  repostPost,
  unrepostPost,
  bookmarkPost,
  unbookmarkPost,
} from '../api/bsky.js';

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

export function useBskyEngagement({
  uri,
  cid,
  initialLikes = 0,
  initialReposts = 0,
  viewer = {},
  fetchOnMount = false,
} = {}) {
  const [likeUri, setLikeUri] = useState(viewer?.like || null);
  const [repostUri, setRepostUri] = useState(viewer?.repost || null);
  const [likeCount, setLikeCount] = useState(toNumber(initialLikes));
  const [repostCount, setRepostCount] = useState(toNumber(initialReposts));
  const [busy, setBusy] = useState(false);
  const [bookmarking, setBookmarking] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [isBookmarked, setIsBookmarked] = useState(Boolean(viewer?.bookmarked));
  const debugEnabled = useMemo(() => resolveDebugFlag(), []);

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

  const toggleLike = useCallback(async () => {
    if (busy) return null;
    setBusy(true);
    try {
      if (!hasLiked) {
        const { targetUri, targetCid } = ensureTarget();
        const actionId = `${Date.now()}-${Math.random().toString(16).slice(2)}`
        safeDebugLog(
          debugEnabled,
          '[engagement]',
          actionId,
          'like:start',
          { uri: targetUri, cid: targetCid, hasLiked, likeUri, likeCount }
        )
        const data = await likePost({ uri: targetUri, cid: targetCid });
        safeDebugLog(debugEnabled, '[engagement]', actionId, 'like:response', data)
        const nextLikeUri = resolveViewerUri(data, 'like') || likeUri || null;
        setLikeUri(nextLikeUri);
        const serverCount = resolveCount(data, 'likeCount', 'likesCount');
        let nextLikeCount = likeCount + 1;
        if (serverCount != null) {
          nextLikeCount = serverCount;
          setLikeCount(serverCount);
        } else {
          setLikeCount((count) => {
            const updated = count + 1;
            nextLikeCount = updated;
            return updated;
          });
        }
        setError('');
        if (debugEnabled) {
          try {
            const verified = await fetchReactions({ uri: targetUri })
            safeDebugLog(debugEnabled, '[engagement]', actionId, 'like:verify', verified)
            if (verified?.viewer && typeof verified.viewer === 'object') {
              if (Object.prototype.hasOwnProperty.call(verified.viewer, 'like')) {
                setLikeUri(verified.viewer.like || null)
              }
            }
            if (verified?.likeCount != null || verified?.likesCount != null) {
              const verifiedLikeCount = toNumber(verified.likeCount ?? verified.likesCount, nextLikeCount)
              setLikeCount(verifiedLikeCount)
              nextLikeCount = verifiedLikeCount
            }
          } catch (verifyError) {
            safeDebugLog(debugEnabled, '[engagement]', actionId, 'like:verifyError', verifyError)
          }
        }
        return { status: 'liked', likeUri: nextLikeUri, likeCount: nextLikeCount };
      } else if (likeUri) {
        const actionId = `${Date.now()}-${Math.random().toString(16).slice(2)}`
        safeDebugLog(
          debugEnabled,
          '[engagement]',
          actionId,
          'unlike:start',
          { uri, cid, hasLiked, likeUri, likeCount }
        )
        const data = await unlikePost({ likeUri, postUri: uri }); // postUri für Re-Fetch
        safeDebugLog(debugEnabled, '[engagement]', actionId, 'unlike:response', data)
        setLikeUri(null);
        const serverCount = resolveCount(data, 'likeCount', 'likesCount');
        let nextLikeCount = Math.max(0, likeCount - 1);
        if (serverCount != null) {
          nextLikeCount = serverCount;
          setLikeCount(serverCount);
        } else {
          setLikeCount((count) => {
            const updated = Math.max(0, count - 1);
            nextLikeCount = updated;
            return updated;
          });
        }
        setError('');
        if (debugEnabled) {
          try {
            const targetUri = String(uri || '').trim()
            if (targetUri) {
              const verified = await fetchReactions({ uri: targetUri })
              safeDebugLog(debugEnabled, '[engagement]', actionId, 'unlike:verify', verified)
              if (verified?.viewer && typeof verified.viewer === 'object') {
                if (Object.prototype.hasOwnProperty.call(verified.viewer, 'like')) {
                  setLikeUri(verified.viewer.like || null)
                }
              }
              if (verified?.likeCount != null || verified?.likesCount != null) {
                const verifiedLikeCount = toNumber(verified.likeCount ?? verified.likesCount, nextLikeCount)
                setLikeCount(verifiedLikeCount)
                nextLikeCount = verifiedLikeCount
              }
            }
          } catch (verifyError) {
            safeDebugLog(debugEnabled, '[engagement]', actionId, 'unlike:verifyError', verifyError)
          }
        }
        return { status: 'unliked', likeUri: null, likeCount: nextLikeCount };
      }
      return null;
    } catch (err) {
      setError(err?.message || 'Aktion fehlgeschlagen');
      return null;
    } finally {
      setBusy(false);
    }
  }, [busy, debugEnabled, hasLiked, likeUri, ensureTarget, likeCount, uri]);

  const toggleRepost = useCallback(async () => {
    if (busy) return null;
    setBusy(true);
    try {
      if (!hasReposted) {
        const { targetUri, targetCid } = ensureTarget();
        const actionId = `${Date.now()}-${Math.random().toString(16).slice(2)}`
        safeDebugLog(
          debugEnabled,
          '[engagement]',
          actionId,
          'repost:start',
          { uri: targetUri, cid: targetCid, hasReposted, repostUri, repostCount }
        )
        const data = await repostPost({ uri: targetUri, cid: targetCid });
        safeDebugLog(debugEnabled, '[engagement]', actionId, 'repost:response', data)
        const nextRepostUri = resolveViewerUri(data, 'repost') || repostUri || null;
        setRepostUri(nextRepostUri);
        const serverCount = resolveCount(data, 'repostCount', 'repostsCount');
        let nextRepostCount = repostCount + 1;
        if (serverCount != null) {
          nextRepostCount = serverCount;
          setRepostCount(serverCount);
        } else {
          setRepostCount((count) => {
            const updated = count + 1;
            nextRepostCount = updated;
            return updated;
          });
        }
        setError('');
        if (debugEnabled) {
          try {
            const verified = await fetchReactions({ uri: targetUri })
            safeDebugLog(debugEnabled, '[engagement]', actionId, 'repost:verify', verified)
            if (verified?.viewer && typeof verified.viewer === 'object') {
              if (Object.prototype.hasOwnProperty.call(verified.viewer, 'repost')) {
                setRepostUri(verified.viewer.repost || null)
              }
            }
            if (verified?.repostCount != null || verified?.repostsCount != null) {
              const verifiedRepostCount = toNumber(verified.repostCount ?? verified.repostsCount, nextRepostCount)
              setRepostCount(verifiedRepostCount)
              nextRepostCount = verifiedRepostCount
            }
          } catch (verifyError) {
            safeDebugLog(debugEnabled, '[engagement]', actionId, 'repost:verifyError', verifyError)
          }
        }
        return { status: 'reposted', repostUri: nextRepostUri, repostCount: nextRepostCount };
      } else if (repostUri) {
        const actionId = `${Date.now()}-${Math.random().toString(16).slice(2)}`
        safeDebugLog(
          debugEnabled,
          '[engagement]',
          actionId,
          'unrepost:start',
          { uri, cid, hasReposted, repostUri, repostCount }
        )
        const data = await unrepostPost({ repostUri, postUri: uri }); // postUri für Re-Fetch
        safeDebugLog(debugEnabled, '[engagement]', actionId, 'unrepost:response', data)
        setRepostUri(null);
        const serverCount = resolveCount(data, 'repostCount', 'repostsCount');
        let nextRepostCount = Math.max(0, repostCount - 1);
        if (serverCount != null) {
          nextRepostCount = serverCount;
          setRepostCount(serverCount);
        } else {
          setRepostCount((count) => {
            const updated = Math.max(0, count - 1);
            nextRepostCount = updated;
            return updated;
          });
        }
        setError('');
        if (debugEnabled) {
          try {
            const targetUri = String(uri || '').trim()
            if (targetUri) {
              const verified = await fetchReactions({ uri: targetUri })
              safeDebugLog(debugEnabled, '[engagement]', actionId, 'unrepost:verify', verified)
              if (verified?.viewer && typeof verified.viewer === 'object') {
                if (Object.prototype.hasOwnProperty.call(verified.viewer, 'repost')) {
                  setRepostUri(verified.viewer.repost || null)
                }
              }
              if (verified?.repostCount != null || verified?.repostsCount != null) {
                const verifiedRepostCount = toNumber(verified.repostCount ?? verified.repostsCount, nextRepostCount)
                setRepostCount(verifiedRepostCount)
                nextRepostCount = verifiedRepostCount
              }
            }
          } catch (verifyError) {
            safeDebugLog(debugEnabled, '[engagement]', actionId, 'unrepost:verifyError', verifyError)
          }
        }
        return { status: 'unreposted', repostUri: null, repostCount: nextRepostCount };
      }
      return null;
    } catch (err) {
      setError(err?.message || 'Aktion fehlgeschlagen');
      return null;
    } finally {
      setBusy(false);
    }
  }, [busy, debugEnabled, hasReposted, repostUri, ensureTarget, repostCount, uri]);

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
          setLikeUri(data.viewer.like || null);
        }
        if (Object.prototype.hasOwnProperty.call(data.viewer, 'repost')) {
          setRepostUri(data.viewer.repost || null);
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
