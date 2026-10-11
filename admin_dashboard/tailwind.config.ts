import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#0B0F19',
        card: '#111827',
        border: '#1F2937',
        primary: {
          DEFAULT: '#6366F1',
          hover: '#4F46E5',
        },
        accent: {
          gold: '#F59E0B',
          pink: '#EC4899',
          cyan: '#06B6D4',
        },
      },
    },
  },
  plugins: [],
};
export default config;
