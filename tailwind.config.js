export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: { extend: {
    colors: {
      cream: 'rgb(var(--c-cream) / <alpha-value>)', sand: 'rgb(var(--c-sand) / <alpha-value>)',
      forest: 'rgb(var(--c-forest) / <alpha-value>)', sage: 'rgb(var(--c-sage) / <alpha-value>)',
      terra: 'rgb(var(--c-terra) / <alpha-value>)', ink: 'rgb(var(--c-ink) / <alpha-value>)',
      card: 'rgb(var(--c-card) / <alpha-value>)', mute: 'rgb(var(--c-mute) / <alpha-value>)',
    },
    fontFamily: { serif: ['"Cormorant Garamond"', 'Georgia', 'serif'], sans: ['"DM Sans"', 'system-ui', 'sans-serif'] },
    boxShadow: { soft: '0 10px 30px -12px rgb(var(--c-forest) / .25)' },
    borderRadius: { '2xl': '1.25rem', '3xl': '1.75rem' },
  } },
  plugins: [],
};
