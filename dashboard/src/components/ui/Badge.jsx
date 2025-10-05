
function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

const base = "inline-flex items-center gap-1 rounded-full font-semibold uppercase tracking-[0.2em] shadow-sm";

const sizes = {
  sm: "px-2 py-0.5 text-[10px]",
  md: "px-3 py-1 text-xs",
};

const variants = {
  neutral: "border border-border bg-background-subtle text-foreground-muted",
  outline: "border border-border bg-background text-foreground-muted",
  success: "border-transparent bg-emerald-500/90 text-white",
  warning: "border-transparent bg-amber-500/90 text-black",
  destructive: "border-transparent bg-destructive/90 text-destructive-foreground",
};

export default function Badge({
  variant = "neutral",
  size = "md",
  icon = null,
  className,
  children,
  ...props
}) {
  const cls = cn(base, sizes[size] || sizes.md, variants[variant] || variants.neutral, className);
  return (
    <span className={cls} {...props}>
      {icon != null ? <span aria-hidden="true">{icon}</span> : null}
      {children}
    </span>
  );
}
