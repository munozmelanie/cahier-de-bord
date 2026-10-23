import { fmtHeure, fmtJour, fmtJourCourt } from '../../lib/dates'
import { matiere } from '../../lib/matieres'
import type { Classe, Devoir, Seance } from '../../lib/types'
import { trierSeances } from './outils'

const esc = (s: string | null | undefined) =>
  (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const lignes = (s: string | null | undefined) => esc(s).replace(/\n/g, '<br>')

/** Cahier journal imprimable (A4 paysage) : récapitulatif puis une page par jour */
export function imprimerCahierJournal(classe: Classe, jours: string[], seances: Seance[], devoirs: Devoir[]) {
  const w = window.open('', '_blank')
  if (!w) return false
  const recap = jours.map((j) => {
    const dv = devoirs.filter((d) => d.donne_le === j)
    const af = trierSeances(seances.filter((s) => s.date === j)).flatMap((s) => s.a_faire ?? [])
    return `<div class="recap-jour"><h3>${esc(fmtJour(j))}</h3>
      <p class="t">Devoirs à donner</p>${dv.length ? `<ul>${dv.map((d) => `<li><b>${esc(matiere(d.matiere).court)}</b> ${esc(d.texte)} <i>(pour ${esc(fmtJourCourt(d.pour_le))})</i></li>`).join('')}</ul>` : '<p class="vide">—</p>'}
      <p class="t">À préparer</p>${af.length ? `<ul>${af.map((a) => `<li>${a.lien ? `<a href="${esc(a.lien)}">${esc(a.label)}</a>` : esc(a.label)}</li>`).join('')}</ul>` : '<p class="vide">—</p>'}
    </div>`
  }).join('')
  const pages = jours.map((j) => {
    const l = trierSeances(seances.filter((s) => s.date === j))
    if (!l.length) return ''
    return `<section class="page"><h2>${esc(fmtJour(j))}</h2>
      <table><thead><tr><th class="h">Horaire</th><th>Séance</th><th class="m">Matériel et à préparer</th><th class="b">Bilan</th></tr></thead><tbody>
      ${l.map((s) => {
        const m = matiere(s.matiere)
        return `<tr${s.statut === 'non_faite' ? ' class="nf"' : ''}>
          <td class="h"><b>${esc(fmtHeure(s.debut))}</b><br>${esc(fmtHeure(s.fin))}</td>
          <td><span class="mat" style="background:${m.fond};color:${m.couleur}">${esc(m.court)}</span> <b>${esc(s.titre)}</b>
            ${s.objectif ? `<p><i>Objectif :</i> ${lignes(s.objectif)}</p>` : ''}${s.deroule ? `<p>${lignes(s.deroule)}</p>` : ''}</td>
          <td class="m">${lignes(s.materiel)}${(s.a_faire ?? []).length ? `<ul>${s.a_faire.map((a) => `<li>${a.lien ? `<a href="${esc(a.lien)}">${esc(a.label)}</a>` : esc(a.label)}</li>`).join('')}</ul>` : ''}</td>
          <td class="b">${lignes(s.bilan)}</td></tr>`
      }).join('')}
      </tbody></table></section>`
  }).join('')

  w.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Cahier journal</title>
  <style>
    @page { size: A4 landscape; margin: 12mm; }
    body { font-family: Arial, sans-serif; font-size: 10.5pt; color: #1E2A47; margin: 0; }
    h1 { font-size: 18pt; margin: 0 0 4mm; } h2 { font-size: 14pt; margin: 0 0 3mm; text-transform: capitalize; }
    h3 { font-size: 11pt; margin: 0 0 2mm; text-transform: capitalize; }
    .recap { display: grid; grid-template-columns: repeat(${Math.min(jours.length, 4)}, 1fr); gap: 4mm; }
    .recap-jour { border: 1px solid #E2E7F1; border-radius: 3mm; padding: 3mm; break-inside: avoid; }
    .t { font-weight: bold; margin: 2mm 0 1mm; font-size: 9.5pt; color: #6A7593; } .vide { color: #A3ACC2; margin: 0; }
    ul { margin: 0; padding-left: 4mm; } li { margin: 0.5mm 0; }
    .page { break-before: page; }
    table { width: 100%; border-collapse: collapse; } th { text-align: left; background: #F5F7FC; font-size: 9pt; }
    th, td { border: 1px solid #E2E7F1; padding: 2mm; vertical-align: top; } tr { break-inside: avoid; }
    .h { width: 15mm; } .m { width: 62mm; } .b { width: 45mm; }
    .mat { border-radius: 2mm; padding: 0.3mm 1.5mm; font-size: 8.5pt; font-weight: bold; }
    p { margin: 1mm 0 0; } .nf td { color: #A3ACC2; text-decoration: line-through; }
    a { color: #1E3FCC; }
  </style></head><body>
  <h1>Cahier journal · ${esc(classe.nom)} · semaine du ${esc(fmtJourCourt(jours[0]))}</h1>
  <div class="recap">${recap}</div>${pages}
  <script>window.onload = () => setTimeout(() => window.print(), 300)</script>
  </body></html>`)
  w.document.close()
  return true
}
