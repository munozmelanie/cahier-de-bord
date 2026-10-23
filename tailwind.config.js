/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        papier: '#F5F7FC',
        encre: '#1E2A47',
        brume: '#6A7593',
        trait: '#E2E7F1',
        bateau: { DEFAULT: '#2E5BFF', clair: '#E8EEFF', fonce: '#1E3FCC' },
        ambre: { DEFAULT: '#F2A516', clair: '#FFF4DC', fonce: '#B37400' },
        succes: { DEFAULT: '#18A058', clair: '#E3F6EC' },
        alerte: { DEFAULT: '#E5484D', clair: '#FDECEC' },
      },
      fontFamily: {
        titre: ['Fredoka', 'Nunito', 'ui-rounded', 'system-ui', 'sans-serif'],
        sans: ['"Atkinson Hyperlegible"', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      borderRadius: { xl2: '1.25rem' },
      boxShadow: {
        doux: '0 1px 2px rgba(30,42,71,.06), 0 4px 16px rgba(30,42,71,.06)',
        flotte: '0 8px 30px rgba(30,42,71,.18)',
      },
    },
  },
  plugins: [],
}
