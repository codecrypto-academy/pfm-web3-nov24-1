import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: '1rem',
        sm: '2rem',
        lg: '4rem',
        xl: '5rem',
        '2xl': '6rem',
      },
    },
    extend: {
      fontSize: {
        'title': ['2.5rem !important', { lineHeight: '3rem', fontWeight: '700' }],
        'subtitle': ['2rem !important', { lineHeight: '2.5rem', fontWeight: '600' }],
        'body': ['1rem !important', { lineHeight: '1.5rem' }]
      },
      fontFamily: {
        'title': ['var(--font-geist-sans)'],
        'body': ['var(--font-geist-mono)']
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        olive: {
          light: '#A9B48F',
          DEFAULT: '#708238',
          dark: '#4A5D23',
        },
        oil: {
          light: '#FFF7E6',
          DEFAULT: '#FFD700',
          dark: '#B8860B',
        },
        earth: {
          light: '#D2B48C',
          DEFAULT: '#8B4513',
          dark: '#654321',
        }
      },
      borderRadius: {
        'drop': '40% 60% 60% 40% / 60% 30% 70% 40%',
      },
      boxShadow: {
        'oil': '0 4px 6px -1px rgba(184, 134, 11, 0.1)',
      },
      backgroundImage: {
        'oil-gradient': 'linear-gradient(to right, var(--tw-colors-oil-light), var(--tw-colors-oil))',
      }
    },
  },
  plugins: [],
};

export default config;
