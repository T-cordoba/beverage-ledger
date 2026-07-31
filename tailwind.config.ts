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
        chart: {
          1: 'rgb(var(--color-chart-1) / <alpha-value>)',
          2: 'rgb(var(--color-chart-2) / <alpha-value>)',
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
      backgroundImage: {
        landing: 'var(--gradient-landing)',
        vignette: 'var(--gradient-vignette)',
      },
      // Enables the `aria-invalid:` variant, which Tailwind does not ship among
      // its default aria states.
      aria: {
        invalid: 'invalid="true"',
      },
      transitionDuration: {
        fast: 'var(--duration-fast)',
        base: 'var(--duration-base)',
        slow: 'var(--duration-slow)',
        reveal: 'var(--duration-reveal)',
      },
      transitionTimingFunction: {
        out: 'var(--ease-out)',
        reveal: 'var(--ease-reveal)',
      },
      keyframes: {
        'fade-in-up': {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'hero-rise': {
          from: {
            opacity: '0',
            transform: 'translate3d(0, 2rem, 0) scale(0.98)',
            filter: 'blur(6px)',
          },
          to: { opacity: '1', transform: 'translate3d(0, 0, 0) scale(1)', filter: 'blur(0)' },
        },
        'glow-in': {
          from: { opacity: '0', transform: 'scale(1.08)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up var(--duration-enter) var(--ease-out)',
        // `both` holds the from-state during the delay that staggers the hero,
        // and the to-state afterwards — without it every line flashes at its
        // final position before its turn comes.
        'hero-rise': 'hero-rise var(--duration-hero) var(--ease-reveal) both',
        'glow-in': 'glow-in var(--duration-glow) var(--ease-reveal) both',
      },
    },
  },
  plugins: [animate],
};

export default config;
