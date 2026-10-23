import { format, parseISO } from 'date-fns'
import { NIVEAUX } from '../../lib/matieres'
import { BLOCS_LSU } from '../../lib/referentielLsu'
import type { BilanLsu, Classe, Eleve, LsuBilan, LsuClasse } from '../../lib/types'
import { COLONNES_LIVRET, GRIS } from './Document'
import { echapper, elementsDuDomaine, lireParcours, PARCOURS } from './outils'

const dateCourte = (s: string | null | undefined) => (s ? format(parseISO(s), 'dd/MM/yyyy') : '')

/** Colonnes du tableau, identiques pour chaque bloc */
const COLGROUP = `<colgroup><col style="width:26%"><col><col class="c"><col class="c"><col class="c"><col class="c"></colgroup>`

/** Livret d'un élève, présenté comme le bilan périodique du LSU (A4 portrait) */
function livretHtml(classe: Classe, bilan: BilanLsu, nbBilans: number, eleve: Eleve, ligne: LsuBilan | undefined, lsuClasse: LsuClasse | undefined) {
  const positions = ligne?.positions ?? {}
  const blocs = BLOCS_LSU.map((b) => {
    const doms = b.domaines.map((dm) => ({ dm, els: elementsDuDomaine(lsuClasse, dm) })).filter((x) => x.els.length)
    if (!doms.length) return ''
    const lignes = doms.flatMap(({ dm, els }) => els.map((el, i) => {
      const dom = i === 0 ? `<td rowspan="${els.length}" class="${b.seul ? 'dom seul' : 'dom'}">${echapper(b.seul ? b.nom : dm.nom)}</td>` : ''
      const cases = NIVEAUX.map((n, k) => `<td class="case" style="background:${GRIS[k]}">${positions[el.cle] === n.v ? 'X' : ''}</td>`).join('')
      return `<tr>${dom}<td>${echapper(el.libelle)}</td>${cases}</tr>`
    })).join('')
    return `<table>${COLGROUP}<tbody>${b.seul ? '' : `<tr><td colspan="6" class="bloc">${echapper(b.nom)}</td></tr>`}${lignes}</tbody></table>`
  }).join('')

  const parcours = lireParcours(lsuClasse?.projets)
  const projets = PARCOURS.filter((p) => parcours[p.id]?.trim())
    .map((p) => `<p class="parcours">${echapper(p.nom)}</p><p>${echapper(parcours[p.id])}</p>`).join('')
  const annee = classe.annee || `${bilan.debut.slice(0, 4)}-${Number(bilan.debut.slice(0, 4)) + 1}`
  const cycles: [string, string[]][] = [['2', ['CP', 'CE1', 'CE2']], ['3', ['CM1', 'CM2', '6e']], ['4', ['5e', '4e', '3e']]]
  const publie = ligne?.publie ? dateCourte(ligne.publie_le) : ''
  const directeur = classe.reglages?.directeur_nom ?? ''

  return `
  <section class="page">
    <div class="haut">
      <div class="ecole">${classe.ecole ? `<b>${echapper(classe.ecole)}</b><br>` : ''}${echapper(classe.ville)}</div>
      <table class="cycles">${cycles.map(([c, n]) => `<tr><td class="cy${c === '3' ? ' actif' : ''}">Cycle<br><b>${c}</b></td>${n.map((x) => `<td class="${x === 'CM1' ? 'actif2' : ''}">${x}</td>`).join('')}</tr>`).join('')}</table>
    </div>
    <div class="ident">
      <p><b>Année scolaire ${echapper(annee.replace('-', '/'))}</b></p>
      <p>${echapper(bilan.nom)} du ${dateCourte(bilan.debut)} au ${dateCourte(bilan.fin)}</p>
      <p><b>${echapper([eleve.nom?.toUpperCase(), eleve.prenom].filter(Boolean).join(' '))}</b></p>
      ${classe.enseignant_nom ? `<p>Enseignant(e)(s) : ${echapper(classe.enseignant_nom)}</p>` : ''}
      <p>Classe de ${echapper(classe.nom)}</p>
      <p>Nombre de bilans dans l'année scolaire : ${nbBilans}</p>
    </div>
    <p class="titre">Suivi des acquis scolaires de l'élève</p>
    <table class="tete">${COLGROUP}
      <tr><th rowspan="2">Domaines d'enseignement</th><th rowspan="2">Principaux éléments du programme travaillés durant la période</th>
        <th colspan="4" class="pos"><b>Positionnement</b><br>Objectifs d'apprentissage</th></tr>
      <tr>${COLONNES_LIVRET.map((c, k) => `<th class="vertical" style="background:${GRIS[k]}"><span>${c}</span></th>`).join('')}</tr>
    </table>
    ${blocs}
    <p class="titre">Bilan de l'acquisition des connaissances et compétences</p>
    <div class="cadre"><p class="h">Parcours éducatifs : Projet(s) mis en œuvre dans l'année</p><div class="bleu">${projets || '<p>&nbsp;</p>'}</div></div>
    <div class="cadre"><p class="h">Appréciation générale sur la progression de l'élève</p><div class="texte">${echapper(ligne?.appreciation_generale) || '&nbsp;'}</div>
      ${ligne?.accompagnement?.trim() ? `<div class="texte acc">Accompagnement : ${echapper(ligne.accompagnement)}</div>` : ''}</div>
    <p class="titre">Communication avec les familles</p>
    <table class="visas"><tr>
      <td><b>Visa de l'enseignant(e) / des enseignant(e)s</b><br>${publie ? `Le ${publie}<br>` : ''}${echapper(classe.enseignant_nom)}</td>
      <td><b>Visa de la directrice / du directeur de l'école</b><br>${publie && directeur ? `Le ${publie}<br>` : ''}${echapper(directeur)}</td>
      <td><b>Visa des parents / responsables légaux</b><br><span class="boite">${ligne?.vu_le ? 'X' : '&nbsp;'}</span> Pris connaissance le : ${dateCourte(ligne?.vu_le)}</td>
    </tr></table>
    <p class="pied">${echapper([eleve.nom?.toUpperCase(), eleve.prenom].filter(Boolean).join(' '))}</p>
  </section>`
}

const STYLE = `
  @page { size: A4 portrait; margin: 12mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 8.5pt; color: #111; margin: 0; }
  p { margin: 0; }
  .page { page-break-after: always; }
  .page:last-child { page-break-after: auto; }
  .haut { display: flex; justify-content: space-between; align-items: flex-start; gap: 8mm; margin-bottom: 5mm; font-size: 9pt; line-height: 1.35; }
  .cycles { border-collapse: collapse; width: auto; }
  .cycles td { border: 0; padding: 1.5mm 2.5mm; text-align: center; font-size: 8pt; color: #9aa1ad; background: #f1f2f4; }
  .cycles td.cy { font-size: 6.5pt; line-height: 1.1; }
  .cycles td.actif { background: #3358E0; color: #fff; }
  .cycles td.actif2 { background: #dbe3fd; color: #1c2333; font-weight: bold; }
  .ident { font-size: 9pt; line-height: 1.5; margin-bottom: 4mm; }
  .titre { border: 1px solid #555; text-align: center; font-weight: bold; padding: 1.5mm; margin: 4mm 0 2.5mm; font-size: 9pt; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; margin-bottom: 2.5mm; page-break-inside: auto; }
  tr { page-break-inside: avoid; }
  th, td { border: 1px solid #555; padding: 1.2mm 1.6mm; vertical-align: middle; }
  th { font-weight: normal; }
  col.c { width: 6mm; }
  .tete th.pos { font-size: 7.5pt; }
  .vertical { height: 24mm; padding: 0; }
  .vertical span { display: block; writing-mode: vertical-rl; transform: rotate(180deg); margin: 0 auto; font-size: 7pt; white-space: nowrap; }
  td.bloc { font-weight: bold; }
  td.dom.seul { font-weight: bold; background: #f3f4f6; }
  td.case { text-align: center; font-size: 9pt; padding: 0; }
  .cadre { border: 1px solid #555; margin-bottom: 2.5mm; page-break-inside: avoid; }
  .cadre .h { font-weight: bold; padding: 1.5mm 2mm; font-size: 9pt; }
  .bleu { background: #d6ecfb; padding: 1.5mm 2mm 2.5mm; }
  .bleu p { margin-bottom: 1.2mm; }
  .parcours { font-weight: bold; text-decoration: underline; margin-top: 1mm; }
  .texte { padding: 1mm 2mm 3mm; min-height: 14mm; line-height: 1.4; font-size: 9pt; }
  .texte.acc { min-height: 0; border-top: 1px solid #555; padding-top: 1.5mm; }
  .visas td { background: #fbe7da; vertical-align: top; height: 22mm; line-height: 1.5; }
  .boite { display: inline-block; width: 3.2mm; height: 3.2mm; border: 1px solid #111; text-align: center; line-height: 3mm; font-size: 7pt; margin-right: 1mm; }
  .pied { margin-top: 3mm; font-size: 7.5pt; color: #444; }
`

export function imprimerLivrets(p: {
  classe: Classe
  bilan: BilanLsu
  nbBilans: number
  eleves: Eleve[]
  lignes: LsuBilan[]
  elements: LsuClasse | undefined
}) {
  const parEleve = new Map(p.lignes.map((l) => [l.eleve_id, l]))
  const corps = p.eleves.map((e) => livretHtml(p.classe, p.bilan, p.nbBilans, e, parEleve.get(e.id), p.elements)).join('')
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
