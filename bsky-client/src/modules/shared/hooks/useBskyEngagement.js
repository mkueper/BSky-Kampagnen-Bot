import { useCallback, useState, useEffect } from 'react';
import {
  fetchReactions,
  likePost,
  unlikePost,
  repostPost,
  unrepostPost,
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
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

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
    if (busy) return;
    setBusy(true);
    try {
      if (!hasLiked) {
        const { targetUri, targetCid } = ensureTarget();
        const data = await likePost({ uri: targetUri, cid: targetCid });
        const nextLikeUri = resolveViewerUri(data, 'like');
        setLikeUri(nextLikeUri || likeUri || null);
        const serverCount = resolveCount(data, 'likeCount', 'likesCount');
        if (serverCount != null) setLikeCount(serverCount);
        else setLikeCount((count) => count + 1);
      } else if (likeUri) {
        const data = await unlikePost({ likeUri, postUri: uri }); // postUri für Re-Fetch
        setLikeUri(null);
        const serverCount = resolveCount(data, 'likeCount', 'likesCount');
        if (serverCount != null) setLikeCount(serverCount);
        else setLikeCount((count) => Math.max(0, count - 1));
      }
      setError('');
    } catch (err) {
      setError(err?.message || 'Aktion fehlgeschlagen');
    } finally {
      setBusy(false);
    }
  }, [busy, hasLiked, likeUri, ensureTarget, likeCount, uri]);

  const toggleRepost = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (!hasReposted) {
        const { targetUri, targetCid } = ensureTarget();
        const data = await repostPost({ uri: targetUri, cid: targetCid });
        const nextRepostUri = resolveViewerUri(data, 'repost');
        setRepostUri(nextRepostUri || repostUri || null);
        const serverCount = resolveCount(data, 'repostCount', 'repostsCount');
        if (serverCount != null) setRepostCount(serverCount);
        else setRepostCount((count) => count + 1);
      } else if (repostUri) {
        const data = await unrepostPost({ repostUri, postUri: uri }); // postUri für Re-Fetch
        setRepostUri(null);
        const serverCount = resolveCount(data, 'repostCount', 'repostsCount');
        if (serverCount != null) setRepostCount(serverCount);
        else setRepostCount((count) => Math.max(0, count - 1));
      }
      setError('');
    } catch (err) {
      setError(err?.message || 'Aktion fehlgeschlagen');
    } finally {
      setBusy(false);
    }
  }, [busy, hasReposted, repostUri, ensureTarget, repostCount, uri]);

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
      }
      setError('');
    } catch (err) {
      setError(err?.message || 'Aktualisieren fehlgeschlagen');
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
    busy,
    refreshing,
    error,
    toggleLike,
    toggleRepost,
    refresh,
    clearError,
  };
}
