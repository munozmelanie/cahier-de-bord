import QRCode from 'qrcode'

/** Adresse publique de l'appli (les QR codes imprimés pointent toujours ici) */
export const ADRESSE_APPLI = 'https://munozmelanie.github.io/cahier-de-bord/'

/** Lien du coupon d'une famille : ouvre « Nouveau compte » avec le code déjà rempli */
export const lienFamille = (code: string) => `${ADRESSE_APPLI}#/code/${encodeURIComponent(code)}`

/** QR code en SVG (synchrone, pour les pages à imprimer) */
export function qrSvg(texte: string, couleur = '#1C2333') {
  const qr = QRCode.create(texte, { errorCorrectionLevel: 'M' })
  const n = qr.modules.size
  const d = qr.modules.data
  let chemin = ''
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (d[y * n + x]) chemin += `M${x + 1} ${y + 1}h1v1h-1z`
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n + 2} ${n + 2}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><path d="${chemin}" fill="${couleur}"/></svg>`
}
