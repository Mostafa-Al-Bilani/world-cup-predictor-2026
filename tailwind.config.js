/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        pitch: {
          900: '#021f16',
          800: '#073123',
          700: '#0d4b34',
        },
        gold: {
          300: '#f7d987',
          400: '#f1c453',
          500: '#d8a51f',
        },
      },
      boxShadow: {
        glow: '0 0 40px rgba(16, 185, 129, 0.22)',
        gold: '0 18px 60px rgba(216, 165, 31, 0.22)',
      },
      backgroundImage: {
        'stadium-radial':
          'radial-gradient(circle at 20% 15%, rgba(250, 204, 21, 0.2), transparent 26%), radial-gradient(circle at 78% 0%, rgba(16, 185, 129, 0.22), transparent 28%), linear-gradient(135deg, #020617 0%, #042f2e 58%, #111827 100%)',
        'pitch-lines':
          'linear-gradient(90deg, rgba(255,255,255,.08) 1px, transparent 1px), linear-gradient(rgba(255,255,255,.08) 1px, transparent 1px)',
      },
    },
  },
  plugins: [],
};
