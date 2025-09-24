/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        border: {
          DEFAULT: 'hsl(214 32% 91%)',
          muted: 'hsl(215 25% 84%)',
        },
        background: {
          DEFAULT: 'hsl(210 40% 98%)',
          subtle: 'hsl(211 40% 96%)',
          elevated: 'hsl(0 0% 100%)',
          inverted: 'hsl(224 71% 4%)',
        },
        foreground: {
          DEFAULT: 'hsl(224 71% 4%)',
          muted: 'hsl(220 14% 46%)',
          subtle: 'hsl(220 13% 54%)',
          inverted: 'hsl(210 40% 98%)',
        },
        primary: {
          DEFAULT: 'hsl(221 83% 53%)',
          foreground: 'hsl(210 40% 98%)',
        },
        destructive: {
          DEFAULT: 'hsl(0 84% 60%)',
          foreground: 'hsl(0 0% 98%)',
        },
        accent: {
          DEFAULT: 'hsl(199 89% 48%)',
          foreground: 'hsl(0 0% 100%)',
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
};
