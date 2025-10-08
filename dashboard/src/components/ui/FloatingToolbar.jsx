import React from "react";

function cn(...parts) {
  return parts.filter(Boolean).join(" ");
}

/**
 * FloatingToolbar – wiederverwendbare, feste Toolbar unten in der Ecke.
 *
 * Props:
 * - position: 'bottom-right' | 'bottom-left' (Default: bottom-right)
 * - offset: number (px, Default 16)
 * - safeArea: boolean (Bottom-Offset inkl. iOS Safe Area, Default true)
 * - variant: 'elevated' | 'primary' (Hintergrund/Contrast, Default 'elevated')
 * - className: zusätzliche Klassen
 * - ariaLabel: Label für role="toolbar"
 * - children: Inhalt (Buttons, Trenner etc.)
 */
export default function FloatingToolbar({
  children,
  position = "bottom-right",
  offset = 16,
  safeArea = true,
  variant = "elevated",
  className,
  ariaLabel = "Aktionen",
  style,
  ...rest
}) {
  const bottomValue = safeArea
    ? `calc(${offset}px + env(safe-area-inset-bottom))`
    : `${offset}px`;

  const stylePos = position === "bottom-left"
    ? { bottom: bottomValue, left: `${offset}px` }
    : { bottom: bottomValue, right: `${offset}px` };

  const variants = {
    elevated: "border-border bg-background-elevated/90 text-foreground",
    primary: "border-border bg-primary text-primary-foreground",
  };

  const backdrop = variant === 'elevated' ? "backdrop-blur supports-[backdrop-filter]:bg-background-elevated/80" : "";
  const base = cn(
    "fixed z-40 flex items-center gap-1 rounded-full border px-1 py-1 shadow-card",
    variants[variant] || variants.elevated,
    backdrop,
    className
  );

  return (
    <div
      role="toolbar"
      aria-label={ariaLabel}
      className={base}
      style={{ ...stylePos, ...(style || {}) }}
      {...rest}
    >
      {children}
    </div>
  );
}
