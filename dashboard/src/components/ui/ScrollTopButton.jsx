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
 * - ariaLabel: string (default 'Nach oben')
 * - className: extra classes
 * - variant: 'elevated' | 'primary' (default 'primary')
 * - children: optional custom content (defaults to ChevronUpIcon)
 */
export default function ScrollTopButton({
  containerId = "app-scroll-container",
  threshold = 400,
  position = "bottom-right",
  offset = 16,
  safeArea = true,
  ariaLabel = "Nach oben",
  className,
  variant = "primary",
  children,
}) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ bottom: 16, right: 16 });

  const stylePos = useMemo(() => {
    const bottomValue = safeArea
      ? `calc(${offset}px + env(safe-area-inset-bottom))`
      : `${offset}px`;
    return position === "bottom-left"
      ? { bottom: bottomValue, left: `${offset}px` }
      : { bottom: bottomValue, right: `${offset}px` };
  }, [position, offset, safeArea]);

  const updateOffsets = useCallback(() => {
    const el = document.getElementById(containerId);
    if (!el) {
      setPos(stylePos);
      return;
    }
    const r = el.getBoundingClientRect();
    const bottomPx = Math.max(offset, window.innerHeight - r.bottom + offset);
    const rightPx = Math.max(offset, window.innerWidth - r.right + offset);
    const leftPx = Math.max(offset, r.left + offset);
    if (position === "bottom-left") setPos({ bottom: bottomPx, left: leftPx });
    else setPos({ bottom: bottomPx, right: rightPx });
  }, [containerId, offset, position, stylePos]);

  useEffect(() => {
    if (typeof window === "undefined") return () => {};
    const container = document.getElementById(containerId);
    const scrollTarget = container || window;

    const handleScroll = () => {
      const y = container ? container.scrollTop : window.scrollY;
      setVisible(y > threshold);
    };

    handleScroll();
    scrollTarget.addEventListener("scroll", handleScroll, { passive: true });

    updateOffsets();
    const onResize = () => updateOffsets();
    window.addEventListener("resize", onResize);

    let ro;
    try {
      if (container && "ResizeObserver" in window) {
        ro = new ResizeObserver(updateOffsets);
        ro.observe(container);
      }
    } catch {}

    return () => {
      scrollTarget.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", onResize);
      try { ro && container && ro.unobserve(container); } catch {}
    };
  }, [containerId, threshold, updateOffsets]);

  if (!visible) return null;

  const scrollToTop = () => {
    const container = document.getElementById(containerId);
    if (container) container.scrollTo({ top: 0, behavior: "smooth" });
    else window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const variants = {
    elevated: "border-border bg-background-elevated/90 text-foreground",
    primary: "border-border bg-primary text-primary-foreground",
  };

  return (
    <button
      type="button"
      onClick={scrollToTop}
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

