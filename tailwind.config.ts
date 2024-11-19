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
        'title': ['2.5rem', { lineHeight: '3rem', fontWeight: '700' }],
        'subtitle': ['2rem', { lineHeight: '2.5rem', fontWeight: '600' }],
        'body': ['1rem', { lineHeight: '1.5rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'xs': ['0.75rem', { lineHeight: '1rem' }],
      },
      fontFamily: {
        'title': ['var(--font-geist-sans)'],
        'body': ['var(--font-geist-mono)']
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        olive: {
          50: '#F8FAF5',
          100: '#E8EED8',
          200: '#D2DCBB',
          300: '#BBC99E',
          400: '#A9B48F',
          500: '#708238',
          600: '#4A5D23',
          700: '#374518',
          800: '#242D10',
          900: '#121608',
        },
        oil: {
          50: '#FFF7E6',
          100: '#FFE4B3',
          200: '#FFD180',
          300: '#FFBE4D',
          400: '#FFD700',
          500: '#B8860B',
          600: '#996C00',
          700: '#7A5200',
          800: '#5C3D00',
          900: '#3D2800',
        },
        earth: {
          50: '#FAF5F2',
          100: '#E6D5C9',
          200: '#D2B48C',
          300: '#BE9370',
          400: '#8B4513',
          500: '#654321',
          600: '#4D3219',
          700: '#362210',
          800: '#1E1108',
          900: '#070300',
        },
        slate: {
          50: '#F8FAFA',
          100: '#E6EDED',
          200: '#BFCFCF',
          300: '#99B1B1',
          400: '#729393',
          500: '#2F4F4F',
          600: '#263F3F',
          700: '#1C2F2F',
          800: '#131F1F',
          900: '#0A1010',
        }
      },
      borderRadius: {
        'drop': '40% 60% 60% 40% / 60% 30% 70% 40%',
        'sm': '0.375rem',
        'md': '0.5rem',
        'lg': '0.75rem',
        'xl': '1rem',
        '2xl': '1.5rem',
      },
      boxShadow: {
        'oil': '0 4px 6px -1px rgba(184, 134, 11, 0.1)',
        'sm': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'md': '0 4px 6px -1px rgb(0 0 0 / 0.1)',
        'lg': '0 10px 15px -3px rgb(0 0 0 / 0.1)',
        'xl': '0 20px 25px -5px rgb(0 0 0 / 0.1)',
      },
      backgroundImage: {
        'oil-gradient': 'linear-gradient(to right, var(--tw-colors-oil-50), var(--tw-colors-oil-400))',
        'olive-gradient': 'linear-gradient(to right, var(--tw-colors-olive-50), var(--tw-colors-olive-400))',
        'earth-gradient': 'linear-gradient(to right, var(--tw-colors-earth-50), var(--tw-colors-earth-400))',
        'gradient-radial': 'radial-gradient(circle at 30% 30%, var(--tw-gradient-stops))',
      },
      spacing: {
        '18': '4.5rem',
        '112': '28rem',
        '128': '32rem',
        '144': '36rem',
      },
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
      },
      transitionProperty: {
        'height': 'height',
        'spacing': 'margin, padding',
      },
      animation: {
        'float': 'float 25s infinite ease-in-out',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translate(0, 0) rotate(0deg) scale(1)' },
          '20%': { transform: 'translate(25px, -35px) rotate(120deg) scale(1.1)' },
          '40%': { transform: 'translate(-20px, -45px) rotate(240deg) scale(0.9)' },
          '60%': { transform: 'translate(-30px, -25px) rotate(360deg) scale(1.05)' },
          '80%': { transform: 'translate(15px, -15px) rotate(480deg) scale(0.95)' },
        }
      }
    },
  },
  plugins: [],
};

export default config;
