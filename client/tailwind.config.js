/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        noir: {
          950: '#0a0a0f',
          900: '#14141f',
          800: '#1a1a2a',
          700: '#27272a',
        },
        blood: '#dc2626',
        clue: '#d97706',
        accent: '#2563eb',
        contradiction: '#7c3aed',
      },
      fontFamily: {
        serif: ['"DM Serif Display"', 'serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};
