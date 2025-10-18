
function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

import { forwardRef } from "react";
import { useTheme } from './ThemeContext'

export default forwardRef(function Card({ className, children, hover, padding = "p-5", ...props }, ref) {
  const theme = useTheme()
  const resolvedHover = typeof hover === 'boolean' ? hover : Boolean(theme.cardHover)
  const base = `group rounded-2xl border border-border ${theme.cardBg} shadow-soft transition`;
  const hoverCls = resolvedHover ? "hover:-translate-y-0.5 hover:bg-background-elevated hover:shadow-card" : "";
  const cls = cn(base, padding, hoverCls, className);
  return (
    <article className={cls} ref={ref} {...props}>
      {children}
    </article>
  );
});
