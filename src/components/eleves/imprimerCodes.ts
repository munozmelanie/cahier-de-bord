import type { Classe, Eleve } from '../../lib/types'

export const ADRESSE_APPLI = 'https://munozmelanie.github.io/cahier-de-bord/'

const echapper = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))

/** Ouvre une page à imprimer : 8 coupons par feuille A4, un par élève */
export function imprimerCodes(eleves: Eleve[], classe: Classe) {
  const w = window.open('', '_blank')
  if (!w) return false
  const entete = [classe.nom, classe.enseignant_nom, classe.ecole].filter(Boolean).map((x) => echapper(String(x))).join(' · ')
  const coupon = (e: Eleve) => `
    <div class="coupon">
      <div class="haut"><span class="logo"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 18H2a4 4 0 0 0 4 4h12a4 4 0 0 0 4-4Z"/><path d="M21 14 10 2 3 14h18Z"/><path d="M10 2v16"/></svg></span><span><b>Cahier de bord</b><br><small>${entete}</small></span></div>
      <p class="prenom">${echapper(e.prenom)}</p>
      <p class="code">${echapper(e.code_famille)}</p>
      <ol>
        <li>Ouvrez <b>${ADRESSE_APPLI.replace('https://', '')}</b></li>
        <li>Créez un compte et tapez ce code</li>
        <li>C'est prêt : devoirs, carnet, livret</li>
      </ol>
    </div>`
  const pages: string[] = []
  for (let i = 0; i < eleves.length; i += 8) pages.push(`<div class="page">${eleves.slice(i, i + 8).map(coupon).join('')}</div>`)
  w.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Codes familles</title>
<style>
  @page { size: A4; margin: 10mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: "Atkinson Hyperlegible", Arial, sans-serif; color: #1E2A47; }
  .page { display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: repeat(4, 69mm); break-after: page; }
  .page:last-child { break-after: auto; }
  .coupon { border: 1px dashed #A3ACC2; padding: 6mm 7mm; display: flex; flex-direction: column; gap: 2mm; break-inside: avoid; }
  .haut { display: flex; align-items: center; gap: 3mm; font-size: 11pt; line-height: 1.2; }
  .haut small { color: #6A7593; font-size: 8.5pt; }
  .logo { display: inline-flex; width: 9mm; height: 9mm; border-radius: 3mm; background: #2E5BFF; align-items: center; justify-content: center; }
  .prenom { margin: 1mm 0 0; font-size: 18pt; font-weight: 700; }
  .code { margin: 0; font-size: 22pt; font-weight: 700; letter-spacing: 2pt; color: #2E5BFF; font-family: "Courier New", monospace; }
  ol { margin: 0; padding-left: 5mm; font-size: 9.5pt; line-height: 1.45; }
  @media screen { body { background: #F5F7FC; } .page { width: 190mm; margin: 10mm auto; background: #fff; } }
</style></head><body>${pages.join('')}
<script>window.onload = function () { setTimeout(function () { window.print() }, 250) }<\/script></body></html>`)
  w.document.close()
  return true
}
