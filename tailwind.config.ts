import TailwindConfig from '@convex-dev/design-system/tailwind.config';

export default {
  ...TailwindConfig,
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './app/styles/**/*.{css,scss}',
    './node_modules/@convex-dev/design-system/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      ...TailwindConfig.theme?.extend,
      borderColor: {
        ...TailwindConfig.theme?.extend?.borderColor,
        DEFAULT: 'rgba(var(--border-transparent))',
      },
      keyframes: TailwindConfig.theme?.extend?.keyframes,
      animation: TailwindConfig.theme?.extend?.animation,
      fontFamily: {
        display: [
          'GT America',
          'Inter Variable',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'Noto Sans',
          'sans-serif',
          'Apple Color Emoji',
          'Segoe UI Emoji',
          'Segoe UI Symbol',
          'Noto Color Emoji',
          'sans-serif',
        ],
      },
      colors: {
        ...TailwindConfig.theme?.extend?.colors,
        bolt: {
          elements: {
            background: {
              depth: {
                1: 'var(--bolt-elements-bg-depth-1)',
                2: 'var(--bolt-elements-bg-depth-2)',
                3: 'var(--bolt-elements-bg-depth-3)',
                4: 'var(--bolt-elements-bg-depth-4)',
              },
            },
            code: {
              background: 'var(--bolt-elements-code-background)',
              text: 'var(--bolt-elements-code-text)',
            },
            button: {
              primary: {
                background: 'var(--bolt-elements-button-primary-background)',
                backgroundHover: 'var(--bolt-elements-button-primary-backgroundHover)',
                text: 'var(--bolt-elements-button-primary-text)',
              },
              secondary: {
                background: 'var(--bolt-elements-button-secondary-background)',
                backgroundHover: 'var(--bolt-elements-button-secondary-backgroundHover)',
                text: 'var(--bolt-elements-button-secondary-text)',
              },
              danger: {
                background: 'var(--bolt-elements-button-danger-background)',
                backgroundHover: 'var(--bolt-elements-button-danger-backgroundHover)',
                text: 'var(--bolt-elements-button-danger-text)',
              },
            },
            item: {
              contentDefault: 'var(--bolt-elements-item-contentDefault)',
              contentActive: 'var(--bolt-elements-item-contentActive)',
              contentAccent: 'var(--bolt-elements-item-contentAccent)',
              contentDanger: 'var(--bolt-elements-item-contentDanger)',
              backgroundDefault: 'var(--bolt-elements-item-backgroundDefault)',
              backgroundActive: 'var(--bolt-elements-item-backgroundActive)',
              backgroundAccent: 'var(--bolt-elements-item-backgroundAccent)',
              backgroundDanger: 'var(--bolt-elements-item-backgroundDanger)',
            },
            actions: {
              background: 'var(--bolt-elements-actions-background)',
              code: {
                background: 'var(--bolt-elements-actions-code-background)',
              },
            },
            artifacts: {
              background: 'var(--bolt-elements-artifacts-background)',
              backgroundHover: 'var(--bolt-elements-artifacts-backgroundHover)',
              borderColor: 'var(--bolt-elements-artifacts-borderColor)',
              inlineCode: {
                background: 'var(--bolt-elements-artifacts-inlineCode-background)',
                text: 'var(--bolt-elements-artifacts-inlineCode-text)',
              },
            },
            messages: {
              background: 'var(--bolt-elements-messages-background)',
              linkColor: 'var(--bolt-elements-messages-linkColor)',
              code: {
                background: 'var(--bolt-elements-messages-code-background)',
              },
              inlineCode: {
                background: 'var(--bolt-elements-messages-inlineCode-background)',
                text: 'var(--bolt-elements-messages-inlineCode-text)',
              },
            },
            icon: {
              success: 'var(--bolt-elements-icon-success)',
              error: 'var(--bolt-elements-icon-error)',
            },
            preview: {
              addressBar: {
                background: 'var(--bolt-elements-preview-addressBar-background)',
                backgroundHover: 'var(--bolt-elements-preview-addressBar-backgroundHover)',
                backgroundActive: 'var(--bolt-elements-preview-addressBar-backgroundActive)',
                text: 'var(--bolt-elements-preview-addressBar-text)',
                textActive: 'var(--bolt-elements-preview-addressBar-textActive)',
              },
            },
            terminals: {
              background: 'var(--bolt-elements-terminals-background)',
              buttonBackground: 'var(--bolt-elements-terminals-buttonBackground)',
            },
            dividerColor: 'var(--bolt-elements-dividerColor)',
            loader: {
              background: 'var(--bolt-elements-loader-background)',
              progress: 'var(--bolt-elements-loader-progress)',
            },
            prompt: {
              background: 'var(--bolt-elements-prompt-background)',
            },
            cta: {
              background: 'var(--bolt-elements-cta-background)',
              text: 'var(--bolt-elements-cta-text)',
            },
          },
        },
        gray: {
          50: '#FAFAFA',
          100: '#F5F5F5',
          200: '#E5E5E5',
          300: '#D4D4D4',
          400: '#A3A3A3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
          950: '#0A0A0A',
        },
        green: {
          50: '#F0FDF4',
          100: '#DCFCE7',
          200: '#BBF7D0',
          300: '#86EFAC',
          400: '#4ADE80',
          500: '#22C55E',
          600: '#16A34A',
          700: '#15803D',
          800: '#166534',
          900: '#14532D',
          950: '#052E16',
        },
        orange: {
          50: '#FFFAEB',
          100: '#FEEFC7',
          200: '#FEDF89',
          300: '#FEC84B',
          400: '#FDB022',
          500: '#F79009',
          600: '#DC6803',
          700: '#B54708',
          800: '#93370D',
          900: '#792E0D',
        },
        red: {
          50: '#FEF2F2',
          100: '#FEE2E2',
          200: '#FECACA',
          300: '#FCA5A5',
          400: '#F87171',
          500: '#EF4444',
          600: '#DC2626',
          700: '#B91C1C',
          800: '#991B1B',
          900: '#7F1D1D',
          950: '#450A0A',
        },
      },
      transitionTimingFunction: {
        'bolt-cubic-bezier': 'cubic-bezier(0.4,0,0.2,1)',
      },
      maxWidth: {
        chat: 'var(--chat-max-width)',
      },
    },
  },
  plugins: [...(TailwindConfig.plugins || [])],
} satisfies typeof TailwindConfig;
