/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Official Core Brand Palette
        indigo: {
          DEFAULT: '#2F2FE4',
          50: '#F0F2FD',
          100: '#E2E5FB',
          200: '#C5CAF7',
          300: '#A4ACF3',
          400: '#727DEE',
          500: '#4D58E9',
          600: '#2F2FE4', // Primary Indigo
          700: '#2626C7',
          800: '#1E1EA7',
          900: '#14147B',
        },
        royal: {
          DEFAULT: '#162E93',
          50: '#EEF2FC',
          100: '#D5E0F8',
          600: '#162E93', // Royal Blue
          700: '#112474',
          800: '#0C1A55',
        },
        navy: {
          DEFAULT: '#1A1953',
          800: '#1A1953', // Deep Navy
          900: '#13123E',
          950: '#0C0B29',
        },
        midnight: {
          DEFAULT: '#080616', // Midnight
          900: '#080616',
          950: '#04030B',
        },
        // Unified brand scale aligned to Official Palette
        brand: {
          50: '#F0F2FD',
          100: '#E2E5FB',
          200: '#C5CAF7',
          300: '#A4ACF3',
          400: '#727DEE',
          500: '#4D58E9',
          600: '#2F2FE4', // Primary Indigo (#2F2FE4)
          700: '#162E93', // Royal Blue (#162E93)
          800: '#1A1953', // Deep Navy (#1A1953)
          900: '#12113B',
          950: '#080616', // Midnight (#080616)
        },
        // Clinical Presence & NMC Verification (restrained surgical emerald)
        presence: {
          50: '#F0FDF4',
          100: '#DCFCE7',
          200: '#BBF7D0',
          500: '#22C55E',
          600: '#16A34A', // Official Success (#16A34A)
          700: '#15803D',
          800: '#166534',
          900: '#14532D',
        },
        // Emergency & Trauma Beep (strict life-critical crimson)
        urgent: {
          50: '#FEF2F2',
          100: '#FEE2E2',
          200: '#FECACA',
          500: '#EF4444',
          600: '#DC2626', // Official Error/Emergency (#DC2626)
          700: '#B91C1C',
          800: '#991B1B',
          900: '#7F1D1D',
        },
        // Backward compatibility for existing emergency references
        emergency: {
          50: '#FEF2F2',
          100: '#FEE2E2',
          200: '#FECACA',
          500: '#EF4444',
          600: '#DC2626',
          700: '#B91C1C',
          800: '#991B1B',
        },
        // Triage hold, 15m timer & cautionary amber
        hold: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          500: '#F59E0B', // Official Warning (#F59E0B)
          600: '#D97706',
          700: '#B45309',
        },
        // Institutional clinical surface neutrals
        surface: {
          50: '#F8FAFC',  // Main background (#F8FAFC)
          100: '#F1F5F9', // Subtle background (#F1F5F9)
          200: '#E2E8F0', // Border (#E2E8F0)
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B', // Secondary text (#64748B)
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#111827', // Primary text (#111827)
          950: '#080616', // Midnight (#080616)
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
        mono: [
          'JetBrains Mono',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace',
        ],
      },
      boxShadow: {
        '2xs': '0 1px 2px 0 rgb(15 23 42 / 0.04)',
        'xs': '0 1px 3px 0 rgb(15 23 42 / 0.05), 0 1px 2px -1px rgb(15 23 42 / 0.04)',
        'card': '0 1px 3px 0 rgb(15 23 42 / 0.06), 0 1px 2px -1px rgb(15 23 42 / 0.04)',
        'elevated': '0 4px 6px -1px rgb(15 23 42 / 0.07), 0 2px 4px -2px rgb(15 23 42 / 0.05)',
        'modal': '0 20px 25px -5px rgb(15 23 42 / 0.12), 0 8px 10px -6px rgb(15 23 42 / 0.08)',
      },
      borderRadius: {
        'clinical': '0.5rem', // 8px - balanced institutional curve
        'card': '0.75rem',    // 12px - restrained card radius
      },
    },
  },
  plugins: [],
};
