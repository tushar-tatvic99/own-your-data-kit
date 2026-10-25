/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./index.html"
  ],
  theme: {
    extend: {
      colors: {
        slate: {
          900: '#0F172A',
          800: '#1E293B',
          700: '#334155',
          600: '#475569',
          500: '#64748B',
          100: '#F1F5F9',
          50: '#F8FAFC'
        },
        emerald: {
          600: '#059669',
          500: '#10B981',
          50: '#ECFDF5'
        },
        amber: {
          600: '#D97706',
          500: '#F59E0B',
          50: '#FFFBEB'
        }
      }
    },
  },
  plugins: [],
}
