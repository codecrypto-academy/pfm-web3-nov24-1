import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
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
