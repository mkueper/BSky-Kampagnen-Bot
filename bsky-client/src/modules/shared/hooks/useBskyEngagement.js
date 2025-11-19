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
        setLikeUri(data?.viewer?.like || null);
        if (data?.totals?.likes != null) {
          setLikeCount(toNumber(data.totals.likes, likeCount));
        } else {
          setLikeCount((count) => count + 1);
        }
      } else if (likeUri) {
        const data = await unlikePost({ likeUri });
        setLikeUri(null);
        if (data?.totals?.likes != null) {
          setLikeCount(toNumber(data.totals.likes, likeCount));
        } else {
          setLikeCount((count) => Math.max(0, count - 1));
        }
      }
      setError('');
    } catch (err) {
      setError(err?.message || 'Aktion fehlgeschlagen');
    } finally {
      setBusy(false);
    }
  }, [busy, hasLiked, likeUri, ensureTarget, likeCount]);

  const toggleRepost = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (!hasReposted) {
        const { targetUri, targetCid } = ensureTarget();
        const data = await repostPost({ uri: targetUri, cid: targetCid });
        setRepostUri(data?.viewer?.repost || null);
        if (data?.totals?.reposts != null) {
          setRepostCount(toNumber(data.totals.reposts, repostCount));
        } else {
          setRepostCount((count) => count + 1);
        }
      } else if (repostUri) {
        const data = await unrepostPost({ repostUri });
        setRepostUri(null);
        if (data?.totals?.reposts != null) {
          setRepostCount(toNumber(data.totals.reposts, repostCount));
        } else {
          setRepostCount((count) => Math.max(0, count - 1));
        }
      }
      setError('');
    } catch (err) {
      setError(err?.message || 'Aktion fehlgeschlagen');
    } finally {
      setBusy(false);
    }
  }, [busy, hasReposted, repostUri, ensureTarget, repostCount]);

  const refresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const targetUri = String(uri || '').trim();
      if (!targetUri) throw new Error('Ungueltiger Beitrag.');
      const data = await fetchReactions({ uri: targetUri });
      if (data?.likesCount != null) setLikeCount(toNumber(data.likesCount));
      if (data?.repostsCount != null) setRepostCount(toNumber(data.repostsCount));
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
       console.log('useBskyEngagement: Fetching on mount for', uri);
      refresh();
    }
  }, [fetchOnMount, uri]);
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
