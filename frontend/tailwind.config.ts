import type { Config } from 'tailwindcss'

export default {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#0b0c10',
        fg: '#e5e7eb',
        muted: '#9ca3af',
        // Sporty red accent
        accent: '#ef4444',
      }
    },
  },
  plugins: [],
} satisfies Config
