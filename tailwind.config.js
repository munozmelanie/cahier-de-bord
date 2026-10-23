/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        papier: '#F5F6F8',
        encre: '#1C2333',
        brume: '#667085',
        trait: '#E5E7EC',
        bateau: { DEFAULT: '#3358E0', clair: '#EDF1FE', fonce: '#2545B8' },
        ambre: { DEFAULT: '#F2A516', clair: '#FEF6E6', fonce: '#A86C00' },
        succes: { DEFAULT: '#18A058', clair: '#E8F6EF' },
        alerte: { DEFAULT: '#E5484D', clair: '#FDEEEE' },
      },
      fontFamily: {
        titre: ['Figtree', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        sans: ['Figtree', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      // Coins plus discrets qu'avant : la hiérarchie se lit sans « bulles »
      borderRadius: { xl: '0.625rem', '2xl': '0.75rem', '3xl': '1rem', xl2: '1rem' },
      boxShadow: {
        // Carte posée à plat : un filet + une ombre à peine visible
        doux: '0 0 0 1px #E8EAEF, 0 1px 2px rgba(16,24,40,.04)',
        flotte: '0 12px 32px rgba(16,24,40,.16), 0 0 0 1px rgba(16,24,40,.04)',
      },
    },
  },
  plugins: [],
}
