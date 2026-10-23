import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Servi par GitHub Pages sous https://munozmelanie.github.io/cahier-de-bord/
export default defineConfig({
  base: '/cahier-de-bord/',
  plugins: [react()],
})
