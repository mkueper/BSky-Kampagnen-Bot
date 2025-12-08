/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    // Wichtig: Auch geteilte Komponenten aus anderen Workspaces einbeziehen!
    '../packages/shared-ui/src/**/*.{js,ts,jsx,tsx}',
    '../packages/media-pickers/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        border: {
          DEFAULT: 'hsl(var(--border))',
          muted: 'hsl(var(--border-muted))',
        },
        background: {
          DEFAULT: 'hsl(var(--background))',
          subtle: 'hsl(var(--background-subtle))',
          elevated: 'hsl(var(--background-elevated))',
          inverted: 'hsl(var(--background-inverted))',
        },
        foreground: {
          DEFAULT: 'hsl(var(--foreground))',
          muted: 'hsl(var(--foreground-muted))',
          subtle: 'hsl(var(--foreground-subtle))',
          inverted: 'hsl(var(--foreground-inverted))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
      },
      boxShadow: {
        card: '0 10px 30px -15px rgba(15, 23, 42, 0.45)',
        soft: '0 8px 20px -12px rgba(15, 23, 42, 0.25)',
      },
      borderRadius: {
        xl: '1.25rem',
      },
      keyframes: {
        'accordion-down': {
          from: { height: 0 },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: 0 },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [],
}
