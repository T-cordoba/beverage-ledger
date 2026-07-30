import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

/**
 * Every value here points at a token in src/styles/tokens.css. Nothing is
 * declared twice: if a colour or radius needs to change, it changes there.
 */
const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        background: 'rgb(var(--color-bg) / <alpha-value>)',
        foreground: 'rgb(var(--color-text) / <alpha-value>)',
        contrast: 'rgb(var(--color-text-contrast) / <alpha-value>)',
        placeholder: 'rgb(var(--color-text-placeholder) / <alpha-value>)',
        border: 'rgb(var(--color-border) / <alpha-value>)',
        scrim: 'rgb(var(--color-scrim) / <alpha-value>)',
        surface: {
          DEFAULT: 'rgb(var(--color-surface) / <alpha-value>)',
          raised: 'rgb(var(--color-surface-raised) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--color-accent) / <alpha-value>)',
          hover: 'rgb(var(--color-accent-hover) / <alpha-value>)',
        },
        success: 'rgb(var(--color-success) / <alpha-value>)',
        warning: 'rgb(var(--color-warning) / <alpha-value>)',
        info: 'rgb(var(--color-info) / <alpha-value>)',
        danger: {
          DEFAULT: 'rgb(var(--color-danger) / <alpha-value>)',
          strong: 'rgb(var(--color-danger-strong) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
        mono: ['var(--font-mono)'],
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        DEFAULT: 'var(--radius-base)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
        '3xl': 'var(--radius-3xl)',
        full: 'var(--radius-full)',
      },
      zIndex: {
        sticky: 'var(--z-sticky)',
        floating: 'var(--z-floating)',
        overlay: 'var(--z-overlay)',
        modal: 'var(--z-modal)',
        dropdown: 'var(--z-dropdown)',
        popover: 'var(--z-popover)',
        toast: 'var(--z-toast)',
      },
      boxShadow: {
        panel: 'var(--shadow-panel)',
        overlay: 'var(--shadow-overlay)',
      },
      transitionDuration: {
        fast: 'var(--duration-fast)',
        base: 'var(--duration-base)',
        slow: 'var(--duration-slow)',
      },
      transitionTimingFunction: {
        out: 'var(--ease-out)',
      },
      keyframes: {
        'fade-in-up': {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.4s var(--ease-out)',
      },
    },
  },
  plugins: [animate],
};

export default config;
