import assert from 'node:assert/strict'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { runInNewContext } from 'node:vm'
import { build } from 'esbuild'

// Teste le contrat des événements d’installation, sans navigateur ni réseau.
// Les hooks sont neutralisés : chaque lecture demande un nouvel instantané.
const { outputFiles } = await build({
  absWorkingDir: fileURLToPath(new URL('../', import.meta.url)),
  entryPoints: ['src/lib/installation.ts'],
  bundle: true,
  write: false,
  format: 'iife',
  globalName: 'installation',
  define: { 'import.meta.env.BASE_URL': JSON.stringify('/cahier-de-bord/') },
  plugins: [{
    name: 'isolated-installation',
    setup(builder) {
      builder.onResolve({ filter: /^(react|\.\/supabase)$/ }, ({ path }) => ({ path, namespace: 'mock' }))
      builder.onLoad({ filter: /.*/, namespace: 'mock' }, ({ path }) => ({
        contents: path === 'react'
          ? 'export const useState = (value) => [value, () => {}]; export const useEffect = () => {};'
          : 'export const APERCU = true;',
      }))
    },
  }],
})

function environnement() {
  const window = new EventTarget()
  window.matchMedia = () => ({ matches: false })
  const context = {
    window,
    navigator: { userAgent: 'Android Chrome', platform: 'Linux', maxTouchPoints: 1 },
  }
  runInNewContext(outputFiles[0].text, context)
  return { window, lire: () => context.installation.useInstallation() }
}

function proposer(window, { prompt = async () => {}, userChoice = Promise.resolve({ outcome: 'accepted' }) } = {}) {
  const evenement = new Event('beforeinstallprompt', { cancelable: true })
  Object.assign(evenement, { prompt, userChoice })
  window.dispatchEvent(evenement)
  return evenement
}

test('le bouton reste indisponible tant que le navigateur ne propose pas l’installation', async () => {
  const { lire } = environnement()
  assert.equal(lire().peutInstaller, false)
  assert.equal(await lire().installer(), false)
  assert.equal(lire().installee, false)
})

test('beforeinstallprompt réserve l’invite au bouton de l’application', () => {
  const { window, lire } = environnement()
  const evenement = proposer(window)
  assert.equal(evenement.defaultPrevented, true)
  assert.equal(lire().peutInstaller, true)
})

test('deux clics concurrents ne peuvent ouvrir la même invite deux fois', async () => {
  const { window, lire } = environnement()
  let appels = 0
  let confirmer
  const userChoice = new Promise((resolve) => { confirmer = resolve })
  proposer(window, { prompt: async () => { appels += 1 }, userChoice })
  const premier = lire().installer()
  const second = lire().installer()
  assert.equal(appels, 1)
  assert.equal(lire().peutInstaller, false)
  assert.equal(await second, false)
  confirmer({ outcome: 'accepted' })
  assert.equal(await premier, true)
  assert.equal(await lire().installer(), false)
})

test('une invitation annulée rend la main au tutoriel sans réutiliser l’invite', async () => {
  const { window, lire } = environnement()
  proposer(window, { userChoice: Promise.resolve({ outcome: 'dismissed' }) })
  assert.equal(await lire().installer(), false)
  assert.equal(lire().peutInstaller, false)
  assert.equal(lire().installee, false)
})

test('un refus de prompt() rend la main au tutoriel sans erreur non interceptée', async () => {
  const { window, lire } = environnement()
  proposer(window, { prompt: async () => { throw new Error('Invite indisponible') } })
  assert.equal(await lire().installer(), false)
  assert.equal(lire().peutInstaller, false)
})

test('un échec de userChoice rend également la main au tutoriel', async () => {
  const { window, lire } = environnement()
  proposer(window, { userChoice: Promise.reject(new Error('Choix indisponible')) })
  assert.equal(await lire().installer(), false)
  assert.equal(lire().peutInstaller, false)
})

test('appinstalled masque l’aide même dans l’onglet encore ouvert du navigateur', () => {
  const { window, lire } = environnement()
  proposer(window)
  window.dispatchEvent(new Event('appinstalled'))
  assert.equal(lire().installee, true)
  assert.equal(lire().peutInstaller, false)
})
