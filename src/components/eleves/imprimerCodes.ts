import { ADRESSE_APPLI, lienFamille, qrSvg } from '../../lib/qr'
import type { Classe, Eleve } from '../../lib/types'

export { ADRESSE_APPLI }

const echapper = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))

/** Ouvre une page à imprimer : 8 coupons par feuille A4, un par élève */
export function imprimerCodes(eleves: Eleve[], classe: Classe) {
  const w = window.open('', '_blank')
  if (!w) return false
  const logo = new URL('icone-cahier-de-bord.png', new URL(import.meta.env.BASE_URL, window.location.origin)).href
  const entete = [classe.nom, classe.enseignant_nom, classe.ecole].filter(Boolean).map((x) => echapper(String(x))).join(' · ')
  const coupon = (e: Eleve) => `
    <div class="coupon">
      <div class="haut"><img class="logo" src="${echapper(logo)}" alt="" /><span><b>Cahier de bord</b><br><small>${entete}</small></span></div>
      <div class="corps">
        <div>
          <p class="prenom">${echapper(e.prenom)}</p>
          <ol>
            <li>Scannez le QR code avec l'appareil photo du téléphone.</li>
            <li>Créez votre compte : le code est déjà rempli.</li>
            <li>Installez l'appli en suivant le tutoriel.</li>
          </ol>
        </div>
        <div class="qr">${qrSvg(lienFamille(e.code_famille))}</div>
      </div>
      <p class="sans">Sans QR code : ouvrez <b>${ADRESSE_APPLI.replace('https://', '').replace(/\/$/, '')}</b>, « Nouveau compte », code <b class="code">${echapper(e.code_famille)}</b></p>
    </div>`
  const pages: string[] = []
  for (let i = 0; i < eleves.length; i += 8) pages.push(`<div class="page">${eleves.slice(i, i + 8).map(coupon).join('')}</div>`)
  w.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Codes familles</title>
<style>
  @page { size: A4; margin: 10mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Figtree, Arial, sans-serif; color: #1E2A47; }
  .page { display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: repeat(4, 69mm); break-after: page; }
  .page:last-child { break-after: auto; }
  .coupon { border: 1px dashed #A3ACC2; padding: 5mm 6mm; display: flex; flex-direction: column; gap: 2mm; break-inside: avoid; }
  .haut { display: flex; align-items: center; gap: 3mm; font-size: 11pt; line-height: 1.2; }
  .haut small { color: #6A7593; font-size: 8.5pt; }
  .logo { display: block; width: 9mm; height: 9mm; object-fit: contain; flex-shrink: 0; }
  .corps { display: grid; grid-template-columns: 1fr 30mm; gap: 4mm; align-items: center; flex: 1; }
  .prenom { margin: 0 0 1.5mm; font-size: 17pt; font-weight: 700; }
  .qr svg { width: 30mm; height: 30mm; display: block; }
  .code { font-family: "Courier New", monospace; letter-spacing: 1pt; color: #3358E0; }
  .sans { margin: 0; font-size: 7.5pt; color: #475467; }
  ol { margin: 0; padding-left: 4.5mm; font-size: 9pt; line-height: 1.4; }
  @media screen { body { background: #F5F7FC; } .page { width: 190mm; margin: 10mm auto; background: #fff; } }
</style></head><body>${pages.join('')}
<script>window.onload = function () { setTimeout(function () { window.print() }, 250) }<\/script></body></html>`)
  w.document.close()
  return true
}
