import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { LoopIcon, QuoteIcon } from "@radix-ui/react-icons";

const VIEWPORT_MARGIN = 12;

export default function RepostMenuButton({
  count,
  hasReposted,
  busy,
  style,
  onRepost,
  onQuote,
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const menuRef = useRef(null);
  const [menuStyle, setMenuStyle] = useState({ left: 0 });

  useLayoutEffect(() => {
    if (!open) return;
    const container = containerRef.current;
    const menu = menuRef.current;
    if (!container || !menu) return;

    const containerRect = container.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;

    let nextStyle = { left: 0 };
    const fitsRight = containerRect.left + menuRect.width <= viewportWidth - VIEWPORT_MARGIN;
    if (fitsRight) {
      nextStyle = { left: 0 };
    } else {
      const spaceOnLeft = containerRect.right - menuRect.width;
      if (spaceOnLeft >= VIEWPORT_MARGIN) {
        nextStyle = { right: 0 };
      } else {
        const offset = Math.max(VIEWPORT_MARGIN - containerRect.left, 0);
        nextStyle = { left: offset };
      }
    }

    setMenuStyle(nextStyle);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const handlePointer = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    const handleKey = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("pointerdown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const handleMainClick = () => {
    if (busy) return;
    if (hasReposted) {
      onRepost();
      return;
    }
    setOpen((prev) => !prev);
  };

  const handleRepost = () => {
    setOpen(false);
    onRepost();
  };

  const handleQuote = () => {
    setOpen(false);
    if (onQuote) onQuote();
  };

  return (
    <div ref={containerRef} className={`relative ${open ? "z-40" : ""}`}>
      <button
        type="button"
        className={`group inline-flex items-center gap-2 transition ${busy ? "opacity-60" : ""}`}
        style={style}
        title={hasReposted ? "Reskeet rückgängig machen" : "Reskeet-Optionen"}
        aria-expanded={open}
        onClick={handleMainClick}
      >
        <LoopIcon className="h-5 w-5 md:h-6 md:w-6" />
        <span className="tabular-nums">{count}</span>
      </button>
      {open ? (
        <div
          ref={menuRef}
          className="absolute top-full mt-2 w-48 rounded-xl border border-border bg-background shadow-card"
          style={menuStyle}
        >
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-background-subtle"
            onClick={handleRepost}
          >
            <LoopIcon className="h-4 w-4" />
            Reposten
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-background-subtle disabled:opacity-50"
            onClick={handleQuote}
            disabled={!onQuote}
          >
            <QuoteIcon className="h-4 w-4" />
            Post zitieren
          </button>
        </div>
      ) : null}
    </div>
  );
}
