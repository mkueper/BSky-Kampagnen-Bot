// dashboard/src/hooks/useVisibleIds.js
import { useEffect, useMemo, useRef, useState } from 'react';

export function useVisibleIds({ root = null, rootMargin = '0px', threshold = 0.1 } = {}) {
  const [visible, setVisible] = useState(() => new Set());
  const observerRef = useRef(null);
  const elementsRef = useRef(new Map());

  useEffect(() => {
    const opts = { root, rootMargin, threshold };
    const obs = new IntersectionObserver((entries) => {
      setVisible((prev) => {
        const next = new Set(prev);
        for (const e of entries) {
          const id = e.target?.dataset?.vid;
          if (!id) continue;
          if (e.isIntersecting) next.add(id);
          else next.delete(id);
        }
        return next;
      });
    }, opts);
    observerRef.current = obs;

    elementsRef.current.forEach((el) => {
      if (el) obs.observe(el);
    });

    return () => {
      obs.disconnect();
      observerRef.current = null;
    };
  }, [root, rootMargin, threshold]);

  const getRefForId = useMemo(
    () => (id) => (el) => {
      const idStr = String(id);
      const prev = elementsRef.current.get(idStr);
      if (prev && observerRef.current) {
        observerRef.current.unobserve(prev);
      }

      if (!el) {
        elementsRef.current.delete(idStr);
        return;
      }

      el.dataset.vid = idStr;
      elementsRef.current.set(idStr, el);
      if (observerRef.current) {
        observerRef.current.observe(el);
      }
    },
    []
  );

  const visibleIds = useMemo(() => Array.from(visible).map((v) => Number(v)).filter(Number.isFinite), [visible]);

  return { getRefForId, visibleIds };
}
