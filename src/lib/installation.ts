import { useEffect, useState } from 'react'
import { APERCU } from './supabase'

// Installation de l'appli sur l'écran d'accueil du téléphone.
// Android (Chrome) : le navigateur propose l'installation, on garde l'événement pour un bouton « Installer ».
// iPhone (Safari) : pas d'installation automatique, on montre la marche à suivre (Partager → Sur l'écran d'accueil).

type EvenementInstallation = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

let differe: EvenementInstallation | null = null
const abonnes = new Set<() => void>()
const prevenir = () => abonnes.forEach((f) => f())

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    differe = e as EvenementInstallation
    prevenir()
  })
  window.addEventListener('appinstalled', () => { differe = null; prevenir() })
  // Service worker : nécessaire pour l'installation sur Android (pas dans l'aperçu)
  if (!APERCU && 'serviceWorker' in navigator && location.protocol === 'https:') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL }).catch(() => { /* rien */ })
    })
  }
}

export const estInstallee = () =>
  typeof window !== 'undefined' && (window.matchMedia?.('(display-mode: standalone)').matches || (navigator as any).standalone === true)

export const estIphone = () =>
  typeof navigator !== 'undefined' && (/iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))

export const estTelephone = () =>
  typeof navigator !== 'undefined' && (estIphone() || /Android|Mobile/i.test(navigator.userAgent))

export function useInstallation() {
  const [, maj] = useState(0)
  useEffect(() => {
    const f = () => maj((n) => n + 1)
    abonnes.add(f)
    return () => { abonnes.delete(f) }
  }, [])
  return {
    installee: estInstallee(),
    iphone: estIphone(),
    telephone: estTelephone(),
    /** Android : le bouton « Installer » peut ouvrir la fenêtre du navigateur */
    peutInstaller: !!differe,
    installer: async () => {
      if (!differe) return false
      await differe.prompt()
      const { outcome } = await differe.userChoice
      differe = null
      prevenir()
      return outcome === 'accepted'
    },
  }
}
