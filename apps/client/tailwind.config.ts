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
      animation: {
        'bounce-gentle': 'bounceGentle 2s ease-in-out infinite',
        'sparkle': 'sparkle 1.5s ease-in-out infinite',
      },
      keyframes: {
        bounceGentle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        sparkle: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.5', transform: 'scale(0.8)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
