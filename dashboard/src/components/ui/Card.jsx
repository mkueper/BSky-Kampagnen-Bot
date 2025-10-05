import React from "react";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function Card({ className, children, hover = true, padding = "p-5", ...props }) {
  const base = "group rounded-2xl border border-border bg-background-subtle/60 shadow-soft transition";
  const hoverCls = hover ? "hover:-translate-y-0.5 hover:bg-background-elevated hover:shadow-card" : "";
  const cls = cn(base, padding, hoverCls, className);
  return (
    <article className={cls} {...props}>
      {children}
    </article>
  );
}

