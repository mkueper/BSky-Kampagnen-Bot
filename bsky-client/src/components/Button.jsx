export default function Button ({
  type = 'button',
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = '',
  children,
  ...rest
}) {
  const base = 'inline-flex items-center justify-center rounded-2xl transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60'
  const sizes = {
    md: 'px-4 py-2 text-sm',
    icon: 'p-2'
  }
  const variants = {
    primary: 'bg-primary text-primary-foreground shadow-soft hover:opacity-95',
    secondary: 'bg-background-subtle text-foreground hover:bg-background',
    ghost: 'text-foreground-muted hover:bg-background-subtle',
    outline: 'border border-border bg-background text-foreground hover:bg-background-subtle'
  }
  const cls = [base, sizes[size] || sizes.md, variants[variant] || variants.primary, className]
    .filter(Boolean)
    .join(' ')
  return (
    <button type={type} disabled={disabled} className={cls} {...rest}>{children}</button>
  )
}
