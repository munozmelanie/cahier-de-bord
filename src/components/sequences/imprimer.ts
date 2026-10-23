import { matiere } from '../../lib/matieres'
import type { Classe, Etape, Sequence } from '../../lib/types'

const esc = (s: string | null | undefined) =>
  (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')

/** Ouvre la fiche de préparation dans un nouvel onglet et lance l'impression */
export function imprimerSequence(classe: Classe, s: Sequence, etapes: Etape[]): boolean {
  const m = matiere(s.matiere)
  const bloc = (titre: string, v: string | null | undefined) => (v ? `<div class="bloc"><h4>${titre}</h4><p>${esc(v)}</p></div>` : '')
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${esc(s.titre)}</title>
<style>
  @page { size: A4; margin: 14mm; }
  body { font-family: "Atkinson Hyperlegible", Arial, sans-serif; color: #1E2A47; font-size: 11pt; line-height: 1.45; }
  header { border-bottom: 3px solid ${m.couleur}; padding-bottom: 8px; margin-bottom: 14px; }
  .mat { display: inline-block; background: ${m.fond}; color: ${m.couleur}; font-weight: 700; border-radius: 99px; padding: 2px 10px; font-size: 9pt; }
  h1 { font-size: 20pt; margin: 6px 0 2px; }
  .meta { color: #6A7593; font-size: 9pt; }
  .seance { border: 1px solid #E2E7F1; border-radius: 10px; padding: 10px 12px; margin: 10px 0; break-inside: avoid; }
  .seance h3 { margin: 0 0 6px; font-size: 13pt; }
  .num { display: inline-block; width: 22px; height: 22px; border-radius: 50%; background: ${m.couleur}; color: #fff; text-align: center; line-height: 22px; font-size: 10pt; margin-right: 6px; }
  .bloc h4 { margin: 8px 0 2px; font-size: 9pt; color: #6A7593; }
  .bloc p { margin: 0; }
</style></head><body>
<header>
  <span class="mat">${esc(m.nom)}</span>
  <h1>${esc(s.titre)}</h1>
  <div class="meta">${esc([classe.nom, classe.ecole, s.periode ? 'Période ' + s.periode.replace(/^P/, '') : ''].filter(Boolean).join(' · '))}</div>
</header>
${bloc('Objectifs', s.objectifs)}${bloc('Compétences', s.competences)}${bloc('Notes', s.notes)}
${etapes.map((e) => `<section class="seance"><h3><span class="num">${e.numero}</span>${esc(e.titre)}${e.duree ? ` <span class="meta">· ${e.duree} min</span>` : ''}</h3>
${bloc('Objectif', e.objectif)}${bloc('Déroulé', e.deroule)}${bloc('Matériel', e.materiel)}${bloc('Différenciation', e.differenciation)}${bloc('Évaluation', e.evaluation)}</section>`).join('')}
<script>window.onload = () => { window.print() }</script>
</body></html>`
  const w = window.open('', '_blank')
  if (!w) return false
  w.document.open()
  w.document.write(html)
  w.document.close()
  return true
}
