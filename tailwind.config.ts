
import type { Config } from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        body: ['Geist', 'sans-serif'],
        headline: ['Geist', 'sans-serif'],
        'space-grotesk': ['Space Grotesk', 'sans-serif'],
        'dm-sans': ['DM Sans', 'sans-serif'],
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: {
            height: '0',
          },
          to: {
            height: 'var(--radix-accordion-content-height)',
          },
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)',
          },
          to: {
            height: '0',
          },
        },
        fadeSlideIn: {
          '0%': {
            opacity: '0',
            transform: 'translateY(30px)',
            filter: 'blur(8px)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)',
            filter: 'blur(0px)',
          }
        },
        'shape-wave': {
          '0%, 24%, 100%': {
            transform: 'translate3d(0,0,0) scale(1) rotateY(0)',
            'background-color': '#f97316',
            'box-shadow': '0 0 15px rgba(249, 115, 22, 0.3)',
          },
          '12%': {
            transform: 'translate3d(4px,-8px,4px) scale(1.3) rotateY(15deg)',
            'background-color': '#fb923c',
            'box-shadow': '0 0 25px rgba(251, 146, 60, 0.8), 0 0 50px rgba(251, 146, 60, 0.4)',
          },
          '36%': {
            'background-color': '#f97316',
            'box-shadow': '0 0 20px rgba(249, 115, 22, 0.6), 0 0 40px rgba(249, 115, 22, 0.2)',
          }
        },
        'triangle-wave': {
          '0%, 24%, 100%': {
            transform: 'translate3d(0,0,0) scale(1) rotateY(0)',
            'border-bottom-color': '#f97316',
            'filter': 'drop-shadow(0 0 15px rgba(249, 115, 22, 0.3))',
          },
          '12%': {
            transform: 'translate3d(4px,-8px,4px) scale(1.3) rotateY(15deg)',
            'border-bottom-color': '#fb923c',
            'filter': 'drop-shadow(0 0 25px rgba(251, 146, 60, 0.8))',
          },
          '36%': {
            'border-bottom-color': '#f97316',
            'filter': 'drop-shadow(0 0 20px rgba(249, 115, 22, 0.6))',
          }
        },
        spin: {
          from: {
            transform: 'rotate(0deg)',
          },
          to: {
            transform: 'rotate(360deg)',
          },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-slide-in': 'fadeSlideIn 0.8s ease-out both',
        'spin': 'spin 1s linear infinite',
        'shape-wave': 'shape-wave 2.4s ease infinite',
        'triangle-wave': 'triangle-wave 2.4s ease infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate'), require('@tailwindcss/typography')],
} satisfies Config;
