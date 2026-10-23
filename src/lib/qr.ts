import QRCode from 'qrcode'
import { MODE_DEMO } from './supabase'

/** Adresse publique de l'appli (les QR codes imprimés pointent toujours ici) */
export const ADRESSE_APPLI = 'https://munozmelanie.github.io/cahier-de-bord/'

/** Adresse à mettre dans un QR code : toujours le vrai site (en démo, la démo du vrai site) */
export const lienAppli = (route: string) => `${ADRESSE_APPLI}${MODE_DEMO ? '?demo' : ''}#${route}`

/** Lien du coupon d'une famille : ouvre « Nouveau compte » avec le code déjà rempli */
export const lienFamille = (code: string) => lienAppli(`/code/${encodeURIComponent(code)}`)

/** QR code en SVG (synchrone, pour les pages à imprimer) */
export function qrSvg(texte: string, couleur = '#1C2333') {
  const qr = QRCode.create(texte, { errorCorrectionLevel: 'M' })
  const n = qr.modules.size
  const d = qr.modules.data
  let chemin = ''
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (d[y * n + x]) chemin += `M${x + 1} ${y + 1}h1v1h-1z`
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n + 2} ${n + 2}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><path d="${chemin}" fill="${couleur}"/></svg>`
}
