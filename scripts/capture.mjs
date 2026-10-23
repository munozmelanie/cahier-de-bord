// Capture d'écran en mode démo : node scripts/capture.mjs <port> <route> <enseignant|parent> <sortie.png> [largeur] [hauteur]
// Le serveur doit tourner : npx vite --port <port> --strictPort
import { chromium } from 'playwright'
const [port, route = '/', persona = 'enseignant', sortie = 'capture.png', largeur = '1280', hauteur = '900'] = process.argv.slice(2)
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const p = await b.newPage({ viewport: { width: Number(largeur), height: Number(hauteur) }, deviceScaleFactor: 1 })
const erreurs = []
p.on('pageerror', (e) => erreurs.push(e.message))
p.on('console', (m) => { if (m.type() === 'error') erreurs.push(m.text()) })
await p.addInitScript((persona) => {
  localStorage.setItem('cdb-demo', '1')
  localStorage.setItem('cdb-demo-persona', persona)
}, persona)
await p.goto(`http://localhost:${port}/cahier-de-bord/?demo#${route}`, { waitUntil: 'networkidle' })
await p.waitForTimeout(800)
await p.screenshot({ path: sortie, fullPage: true })
if (erreurs.length) console.log('ERREURS:\n' + erreurs.filter((e) => !/fonts\.g/.test(e)).join('\n'))
else console.log('ok', sortie)
await b.close()
