import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cy: {
          pink: '#FFF0F5',
          cream: '#FFFDE7',
          orange: '#FF6B35',
          coral: '#FF8FA3',
          blue: '#89CFF0',
          lavender: '#E8DEF8',
          mint: '#98DFAF',
          yellow: '#FFE082',
          brown: '#5D4037',
          'warm-gray': '#8D7B68',
        },
      },
      borderRadius: {
        cy: '16px',
        'cy-lg': '20px',
      },
      boxShadow: {
        cy: '0 4px 12px rgba(255, 107, 53, 0.15)',
        'cy-hover': '0 6px 20px rgba(255, 107, 53, 0.25)',
      },
      fontFamily: {
        sans: ['Pretendard', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
