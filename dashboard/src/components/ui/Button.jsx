import React from "react";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

const base = "rounded-xl px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60";

const variants = {
  primary: "bg-primary text-primary-foreground hover:shadow-soft",
  secondary: "border border-border bg-background-elevated text-foreground hover:bg-background",
  neutral: "border border-border bg-background text-foreground hover:bg-background-subtle",
  destructive: "bg-destructive/90 text-destructive-foreground hover:bg-destructive",
  warning: "border border-amber-400 bg-amber-500/10 text-amber-800 hover:bg-amber-500/20",
  ghost: "text-foreground hover:bg-background-subtle",
};

export default function Button({
  as: Tag = "button",
  variant = "secondary",
  className,
  children,
  ...props
}) {
  const cls = cn(base, variants[variant] || variants.secondary, className);
  return (
    <Tag className={cls} {...props}>
      {children}
    </Tag>
  );
}

