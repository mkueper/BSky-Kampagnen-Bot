import { useCallback } from 'react';
import { useUIState, useUIDispatch } from '../context/UIContext.jsx';

export function useMediaLightbox() {
  const { mediaLightbox } = useUIState();
  const dispatch = useUIDispatch();

  const openMediaPreview = useCallback((items = [], startIndex = 0) => {
    if (!Array.isArray(items) || items.length === 0) return;
    const safeIndex = Math.max(0, Math.min(startIndex, items.length - 1));
    dispatch({ type: 'OPEN_MEDIA_LIGHTBOX', payload: { images: items, index: safeIndex } });
  }, [dispatch]);

  const closeMediaPreview = useCallback(() => {
    dispatch({ type: 'CLOSE_MEDIA_LIGHTBOX' });
  }, [dispatch]);

  const navigateMediaPreview = useCallback((direction) => {
    dispatch({ type: 'NAVIGATE_MEDIA_LIGHTBOX', payload: direction });
  }, [dispatch]);

  return {
    mediaLightbox,
    openMediaPreview,
    closeMediaPreview,
    navigateMediaPreview,
  };
}
