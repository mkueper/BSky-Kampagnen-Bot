const JSON_HEADERS = { 'Content-Type': 'application/json' };

async function requestJson(path, { method = 'GET', body, headers, retries = 1, ...options } = {}) {
  const serializedBody =
    body === undefined ? undefined : (typeof body === 'string' ? body : JSON.stringify(body));

  let attempt = 0;
  let lastError;

  while (attempt <= retries) {
    const init = {
      method,
      headers: { ...(headers || {}) },
      ...options,
    };

    if (serializedBody !== undefined) {
      init.body = serializedBody;
      if (!init.headers['Content-Type']) init.headers['Content-Type'] = 'application/json';
    }

    try {
      const response = await fetch(path, init);

      let data = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok) {
        const message = data?.error || `HTTP ${response.status}`;
        const error = new Error(message);
        error.status = response.status;
        error.data = data;
        throw error;
      }

      return data ?? {};
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt === retries) break;
      attempt += 1;
    }
  }

  if (lastError?.message === 'Failed to fetch') {
    const networkError = new Error('Netzwerkfehler beim Kontaktieren des Backends.');
    networkError.cause = lastError;
    throw networkError;
  }

  throw lastError;
}

export async function fetchTimeline({ tab, cursor, limit } = {}) {
  const params = new URLSearchParams();
  if (tab) params.set('tab', tab);
  if (cursor) params.set('cursor', cursor);
  if (typeof limit === 'number') params.set('limit', String(limit));
  const query = params.toString();
  const data = await requestJson(`/api/bsky/timeline${query ? `?${query}` : ''}`);
  return {
    items: Array.isArray(data?.feed) ? data.feed : [],
    cursor: data?.cursor || null,
  };
}

export async function fetchNotifications({ cursor, markSeen } = {}) {
  const params = new URLSearchParams();
  if (cursor) params.set('cursor', cursor);
  if (markSeen) params.set('markSeen', 'true');
  const query = params.toString();
  const data = await requestJson(`/api/bsky/notifications${query ? `?${query}` : ''}`);
  return {
    items: Array.isArray(data?.notifications) ? data.notifications : [],
    cursor: data?.cursor || null,
  };
}

export async function fetchThread(uri) {
  const params = new URLSearchParams();
  params.set('uri', uri);
  return requestJson(`/api/bsky/thread?${params.toString()}`);
}

export async function likePost({ uri, cid }) {
  return requestJson('/api/bsky/like', {
    method: 'POST',
    body: { uri, cid },
    headers: JSON_HEADERS,
  });
}

export async function unlikePost({ likeUri }) {
  return requestJson('/api/bsky/like', {
    method: 'DELETE',
    body: { likeUri },
    headers: JSON_HEADERS,
  });
}

export async function repostPost({ uri, cid }) {
  return requestJson('/api/bsky/repost', {
    method: 'POST',
    body: { uri, cid },
    headers: JSON_HEADERS,
  });
}

export async function unrepostPost({ repostUri }) {
  return requestJson('/api/bsky/repost', {
    method: 'DELETE',
    body: { repostUri },
    headers: JSON_HEADERS,
  });
}

export async function fetchReactions({ uri }) {
  const params = new URLSearchParams({ uri });
  return requestJson(`/api/bsky/reactions?${params.toString()}`);
}

export { requestJson };
