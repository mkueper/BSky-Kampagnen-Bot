import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronUpIcon } from "@radix-ui/react-icons";

function cn(...parts) {
  return parts.filter(Boolean).join(" ");
}

/**
 * Reusable ScrollTopButton
 *
 * Props:
 * - containerId: DOM id of scroll container (default 'app-scroll-container'; falls back to window)
 * - threshold: show button after this many px scrolled (default 400)
 * - position: 'bottom-right' | 'bottom-left' (default 'bottom-right')
 * - offset: number px (default 16)
 * - safeArea: include iOS safe-area bottom (default true)
 * - ariaLabel: string (default 'Scroll to top')
 * - className: extra classes
 * - variant: 'elevated' | 'primary' (default 'primary')
 * - children: optional custom content (defaults to ChevronUpIcon)
 */
const hasScrollableOverflow = (node) => {
  if (!node) return false;
  return node.scrollHeight - node.clientHeight > 2;
};

const getWindowScrollTop = () => {
  if (typeof window === "undefined") return 0;
  if (typeof document !== "undefined" && document.documentElement) {
    return window.scrollY ?? document.documentElement.scrollTop ?? 0;
  }
  return window.scrollY ?? 0;
};

export default function ScrollTopButton({
  containerId = "app-scroll-container",
  threshold = 400,
  position = "bottom-right",
  offset = 16,
  horizontalOffset,
  safeArea = true,
  ariaLabel = "Scroll to top",
  className,
  variant = "primary",
  forceVisible = false,
  manualScroll = false,
  onActivate,
  children,
}) {
  const [internalVisible, setInternalVisible] = useState(false);
  const [pos, setPos] = useState({ bottom: 16, right: 16 });
  const sideOffset = typeof horizontalOffset === "number" ? horizontalOffset : offset;

  const stylePos = useMemo(() => {
    const bottomValue = safeArea
      ? `calc(${offset}px + env(safe-area-inset-bottom))`
      : `${offset}px`;
    return position === "bottom-left"
      ? { bottom: bottomValue, left: `${sideOffset}px` }
      : { bottom: bottomValue, right: `${sideOffset}px` };
  }, [position, offset, safeArea, sideOffset]);

  const updateOffsets = useCallback(() => {
    const el = typeof document !== "undefined" ? document.getElementById(containerId) : null;
    if (!el) {
      setPos(stylePos);
      return;
    }
    const r = el.getBoundingClientRect();
    const isMobileViewport =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(max-width: 768px)").matches;
    const bottomPx = Math.max(offset, window.innerHeight - r.bottom + offset);
    const rightPx = isMobileViewport
      ? sideOffset
      : Math.max(sideOffset, window.innerWidth - r.right + sideOffset);
    const leftPx = isMobileViewport
      ? sideOffset
      : Math.max(sideOffset, r.left + sideOffset);
    if (position === "bottom-left") setPos({ bottom: bottomPx, left: leftPx });
    else setPos({ bottom: bottomPx, right: rightPx });
  }, [containerId, offset, position, sideOffset, stylePos]);

  useEffect(() => {
    if (typeof window === "undefined") return () => {};
    const container = document.getElementById(containerId);

    const updateVisibility = () => {
      const useContainerScroll = hasScrollableOverflow(container);
      const y = useContainerScroll && container ? container.scrollTop : getWindowScrollTop();
      setInternalVisible(y > threshold);
    };

    updateVisibility();
    if (container) container.addEventListener("scroll", updateVisibility, { passive: true });
    window.addEventListener("scroll", updateVisibility, { passive: true });

    const runOffsets = () => {
      updateOffsets();
      updateVisibility();
    };
    runOffsets();
    const onResize = () => runOffsets();
    window.addEventListener("resize", onResize);

    let ro;
    try {
      if (container && "ResizeObserver" in window) {
        ro = new ResizeObserver(runOffsets);
        ro.observe(container);
      }
    } catch (e) {
      console.error("Failed to initialize ResizeObserver for ScrollTopButton:", e);
    }

    return () => {
      if (container) container.removeEventListener("scroll", updateVisibility);
      window.removeEventListener("scroll", updateVisibility);
      window.removeEventListener("resize", onResize);
      try { ro && container && ro.unobserve(container); } catch (e) { console.error(e); }
    };
  }, [containerId, threshold, updateOffsets]);

  const shouldShow = forceVisible || internalVisible;
  if (!shouldShow) return null;

  const scrollToTop = () => {
    const container = document.getElementById(containerId);
    const useContainerScroll = hasScrollableOverflow(container);
    if (useContainerScroll && container) {
      container.scrollTo({ top: 0, behavior: "smooth" });
    } else if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleClick = () => {
    if (!manualScroll) {
      scrollToTop();
    }
    if (typeof onActivate === "function") {
      onActivate();
    }
  };

  const variants = {
    elevated: "border-border bg-background-elevated/90 text-foreground",
    primary: "border-border bg-primary text-primary-foreground",
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "fixed z-50 rounded-full border p-2 shadow-card focus:outline-none focus:ring-2",
        variant === "primary" ? "focus:ring-primary" : "focus:ring-foreground",
        variants[variant] || variants.primary,
        className
      )}
      style={pos}
      aria-label={ariaLabel}
      title={ariaLabel}
    >
      {children || <ChevronUpIcon className="h-5 w-5" />}
    </button>
  );
}
