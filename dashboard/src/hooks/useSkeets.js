import { useCallback, useEffect, useState } from "react";

function parseTargetPlatforms(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn("Konnte targetPlatforms nicht parsen:", error);
    }
  }

  return [];
}

export function useSkeets() {
  const [skeets, setSkeets] = useState([]);
  const [repliesBySkeet, setRepliesBySkeet] = useState({});
  const [activeCardTabs, setActiveCardTabs] = useState({});
  const [loadingReplies, setLoadingReplies] = useState({});
  const [loadingReactions, setLoadingReactions] = useState({});
  const [reactionStats, setReactionStats] = useState({});
  const [replyErrors, setReplyErrors] = useState({});

  const loadSkeets = useCallback(async () => {
    try {
      const res = await fetch("/api/skeets");
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Fehler beim Laden der Skeets.");
      }

      const data = await res.json();
      const normalized = data.map((item) => ({
        ...item,
        targetPlatforms: parseTargetPlatforms(item.targetPlatforms),
      }));

      setSkeets(normalized);
      setActiveCardTabs((current) => {
        const next = {};
        normalized.forEach((skeet) => {
          next[skeet.id] = current[skeet.id] ?? "skeet";
        });
        return next;
      });
      setRepliesBySkeet((current) => {
        const next = {};
        normalized.forEach((skeet) => {
          if (current[skeet.id]) {
            next[skeet.id] = current[skeet.id];
          }
        });
        return next;
      });
      setReplyErrors((current) => {
        const next = {};
        normalized.forEach((skeet) => {
          if (current[skeet.id]) {
            next[skeet.id] = current[skeet.id];
          }
        });
        return next;
      });
    } catch (error) {
      console.error("Fehler beim Laden der Skeets:", error);
    }
  }, []);

  useEffect(() => {
    loadSkeets();
  }, [loadSkeets]);

  const showSkeetContent = useCallback((id) => {
    setActiveCardTabs((current) => ({ ...current, [id]: "skeet" }));
  }, []);

  const showRepliesContent = useCallback(
    async (id) => {
      setActiveCardTabs((current) => ({ ...current, [id]: "replies" }));

      if (Object.prototype.hasOwnProperty.call(repliesBySkeet, id)) {
        return;
      }

      setLoadingReplies((current) => ({ ...current, [id]: true }));

      try {
        const res = await fetch(`/api/replies/${id}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          console.error("Fehler beim Laden der Replies:", data.error || "Unbekannter Fehler");
          return;
        }
        const data = await res.json();
        const items = Array.isArray(data) ? data : data?.items || [];
        const errors = Array.isArray(data) ? null : data?.errors || null;

        setRepliesBySkeet((current) => ({ ...current, [id]: items }));
        setReplyErrors((current) => {
          const next = { ...current };
          if (errors && Object.keys(errors).length > 0) {
            next[id] = errors;
          } else {
            delete next[id];
          }
          return next;
        });
      } catch (error) {
        console.error("Fehler beim Laden der Replies:", error);
        setReplyErrors((current) => ({ ...current, [id]: { general: error.message || "Unbekannter Fehler" } }));
      } finally {
        setLoadingReplies((current) => ({ ...current, [id]: false }));
      }
    },
    [repliesBySkeet]
  );

  const fetchReactions = useCallback(
    async (id) => {
      setLoadingReactions((current) => ({ ...current, [id]: true }));

      try {
        const res = await fetch(`/api/reactions/${id}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Fehler beim Laden der Reaktionen.");
        }

        const data = await res.json();
        setReactionStats((current) => ({ ...current, [id]: data }));

        await loadSkeets();

        const total = data?.total ?? {};
        const totalLikes = typeof total.likes === "number" ? total.likes : "?";
        const totalReposts = typeof total.reposts === "number" ? total.reposts : "?";
        console.info(`Reaktionen für ${id}: Likes ${totalLikes}, Reposts ${totalReposts}`, data);
        if (data?.errors) {
          console.warn(`Fehler beim Abrufen einzelner Plattformen für ${id}:`, data.errors);
        }
      } catch (error) {
        console.error("Fehler beim Laden der Reaktionen:", error);
      } finally {
        setLoadingReactions((current) => {
          const next = { ...current };
          delete next[id];
          return next;
        });
      }
    },
    [loadSkeets]
  );

  return {
    skeets,
    plannedSkeets: skeets.filter((s) => !s.postUri),
    publishedSkeets: skeets.filter((s) => s.postUri),
    loadSkeets,
    fetchReactions,
    showSkeetContent,
    showRepliesContent,
    activeCardTabs,
    repliesBySkeet,
    loadingReplies,
    loadingReactions,
    reactionStats,
    replyErrors,
  };
}
