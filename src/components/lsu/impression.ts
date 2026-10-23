import { fmtJourCourt } from '../../lib/dates'
import { LSU, NIVEAUX } from '../../lib/matieres'
import type { BilanLsu, Classe, Eleve, LsuBilan, LsuClasse } from '../../lib/types'
import { echapper } from './outils'

/** Livret d'un élève, présenté comme le bilan périodique du LSU */
function livretHtml(classe: Classe, bilan: BilanLsu, eleve: Eleve, ligne: LsuBilan | undefined, elements: LsuClasse | undefined) {
  const lignes = LSU.map((m) => {
    const rangs = m.domaines.length
    return m.domaines.map((d, i) => {
      const pos = ligne?.positions?.[d.id]
      const cases = NIVEAUX.map((n) => `<td class="niv">${pos === n.v ? '&#10006;' : ''}</td>`).join('')
      const debut = i === 0
        ? `<td class="mat" rowspan="${rangs}"><b>${echapper(m.nom)}</b></td><td class="elem" rowspan="${rangs}">${echapper(elements?.elements?.[m.id])}</td>`
        : ''
      const fin = i === 0 ? `<td class="app" rowspan="${rangs}">${echapper(ligne?.appreciations?.[m.id])}</td>` : ''
      const dom = rangs > 1 ? `<td class="dom">${echapper(d.nom)}</td>` : `<td class="dom"></td>`
      return `<tr>${debut}${dom}${cases}${fin}</tr>`
    }).join('')
  }).join('')

  return `
  <section class="page">
    <header>
      <div>
        <p class="petit">${echapper(classe.ecole)}${classe.ville ? ' – ' + echapper(classe.ville) : ''}</p>
        <h1>Bilan périodique – ${echapper(bilan.nom)}</h1>
        <p class="petit">Du ${fmtJourCourt(bilan.debut)} au ${fmtJourCourt(bilan.fin)} · Année ${echapper(classe.annee)}</p>
      </div>
      <div class="eleve">
        <p class="grand">${echapper(eleve.prenom)} ${echapper(eleve.nom)}</p>
        <p class="petit">${echapper(classe.nom)} · ${echapper(classe.enseignant_nom)}</p>
      </div>
    </header>
    <table>
      <thead>
        <tr>
          <th rowspan="2" class="mat">Domaines d'enseignement</th>
          <th rowspan="2" class="elem">Principaux éléments du programme travaillés</th>
          <th rowspan="2" class="dom"></th>
          <th colspan="4">Positionnement</th>
          <th rowspan="2" class="app">Acquisitions, progrès et difficultés éventuelles</th>
        </tr>
        <tr>${NIVEAUX.map((n) => `<th class="niv vertical"><span>${echapper(n.nom)}</span></th>`).join('')}</tr>
      </thead>
      <tbody>${lignes}</tbody>
    </table>
    ${elements?.projets ? `<div class="bloc"><b>Projets et parcours</b><p>${echapper(elements.projets)}</p></div>` : ''}
    ${ligne?.accompagnement ? `<div class="bloc"><b>Modalités d'accompagnement</b><p>${echapper(ligne.accompagnement)}</p></div>` : ''}
    <div class="bloc"><b>Appréciation générale</b><p>${echapper(ligne?.appreciation_generale)}</p></div>
    <p class="petit">Absences : ${ligne?.absences ?? 0} demi-journée${(ligne?.absences ?? 0) > 1 ? 's' : ''}</p>
    <div class="signatures">
      <div><b>L'enseignante</b><p>${echapper(classe.enseignant_nom)}</p></div>
      <div><b>Signature des parents</b></div>
    </div>
  </section>`
}

const STYLE = `
  @page { size: A4 landscape; margin: 10mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 9pt; color: #111; margin: 0; }
  .page { page-break-after: always; }
  .page:last-child { page-break-after: auto; }
  header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #1E2A47; padding-bottom: 6px; margin-bottom: 8px; }
  h1 { font-size: 15pt; margin: 2px 0; }
  .petit { font-size: 8.5pt; color: #444; margin: 0; }
  .grand { font-size: 14pt; font-weight: bold; margin: 0; text-align: right; }
  .eleve .petit { text-align: right; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #888; padding: 3px 5px; vertical-align: top; }
  th { background: #EEF1F7; font-size: 8pt; }
  .mat { width: 15%; } .elem { width: 24%; } .dom { width: 13%; font-size: 8pt; } .app { width: 30%; }
  .niv { width: 4.5%; text-align: center; vertical-align: middle; font-size: 11pt; }
  .vertical { height: 26mm; vertical-align: bottom; }
  .vertical span { writing-mode: vertical-rl; transform: rotate(180deg); font-weight: normal; font-size: 7.5pt; }
  .bloc { border: 1px solid #888; padding: 4px 6px; margin-top: 6px; min-height: 12mm; }
  .bloc p { margin: 2px 0 0; }
  .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 6px; }
  .signatures div { border: 1px solid #888; padding: 4px 6px; min-height: 18mm; }
  .signatures p { margin: 2px 0 0; }
`

export function imprimerLivrets(p: {
  classe: Classe
  bilan: BilanLsu
  eleves: Eleve[]
  lignes: LsuBilan[]
  elements: LsuClasse | undefined
}) {
  const parEleve = new Map(p.lignes.map((l) => [l.eleve_id, l]))
  const corps = p.eleves.map((e) => livretHtml(p.classe, p.bilan, e, parEleve.get(e.id), p.elements)).join('')
  const titre = p.eleves.length === 1 ? `Livret ${p.eleves[0].prenom} – ${p.bilan.nom}` : `Livrets ${p.classe.nom} – ${p.bilan.nom}`
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${echapper(titre)}</title><style>${STYLE}</style></head>
    <body>${corps}<script>window.addEventListener('load', function () { setTimeout(function () { window.print() }, 250) })</script></body></html>`
  const f = window.open('', '_blank')
  if (!f) return false
  f.document.open()
  f.document.write(html)
  f.document.close()
  return true
}
