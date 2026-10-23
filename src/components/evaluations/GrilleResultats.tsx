import clsx from 'clsx'
import { PaintBucket, Target, Users, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { useEcrire } from '../../lib/donnees'
import { NIVEAUX, TOUS_DOMAINES } from '../../lib/matieres'
import type { Eleve, Evaluation } from '../../lib/types'
import { ABREV, DOMAINE_COURT, niveauCourt, useEnregistrementDiffere } from '../lsu/outils'
import { EtatEnregistrement } from './EtatEnregistrement'

type Resultats = Evaluation['resultats']

// Ordre au toucher : vide → non atteints → partiellement → atteints → dépassés → vide
const suivant = (v: number | undefined) => (v === undefined ? 1 : v >= 4 ? undefined : v + 1)

/** Légende des niveaux : des pastilles, le nom complet en infobulle */
export function Legende() {
  return (
    <div className="flex flex-wrap gap-1.5" aria-label="Niveaux">
      {NIVEAUX.map((n) => (
        <span key={n.v} title={n.nom} className="inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2 font-titre text-sm font-semibold" style={{ background: n.fond, color: n.couleur }}>
          {ABREV[n.v]}
        </span>
      ))}
    </div>
  )
}

export function GrilleResultats({ evaluation, eleves }: { evaluation: Evaluation; eleves: Eleve[] }) {
  const ecrire = useEcrire()
  const [res, setRes] = useState<Resultats>(() => evaluation.resultats ?? {})
  const [colonne, setColonne] = useState<string | null>(null)
  const cases = useRef(new Map<string, HTMLButtonElement>())

  // Nouvelle évaluation affichée : on repart de ses résultats enregistrés
  useEffect(() => { setRes(evaluation.resultats ?? {}) }, [evaluation.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const { planifier, etat } = useEnregistrementDiffere<Resultats>(
    (r) => ecrire.mutateAsync({ op: 'update', table: 'evaluations', id: evaluation.id, patch: { resultats: r } }),
  )

  const changer = (maj: (r: Resultats) => Resultats) => {
    setRes((avant) => {
      const apres = maj(avant)
      planifier(apres)
      return apres
    })
  }
  const fixer = (eleve: string, item: string, v: number | undefined) =>
    changer((r) => {
      const ligne = { ...(r[eleve] ?? {}) }
      if (v === undefined) delete ligne[item]
      else ligne[item] = v
      return { ...r, [eleve]: ligne }
    })
  const remplirColonne = (item: string, v: number) => {
    changer((r) => {
      const n = { ...r }
      for (const e of eleves) if (!n[e.id]?.[item]) n[e.id] = { ...(n[e.id] ?? {}), [item]: v }
      return n
    })
    setColonne(null)
  }

  const items = evaluation.items ?? []
  const nomDomaine = useMemo(() => new Map(TOUS_DOMAINES.map((d) => [d.id, d.nom])), [])

  const focus = (l: number, c: number) => cases.current.get(`${l}-${c}`)?.focus()
  const clavier = (e: KeyboardEvent, l: number, c: number, eleve: string, item: string) => {
    if (/^[1-4]$/.test(e.key)) { fixer(eleve, item, Number(e.key)); focus(l + 1, c); e.preventDefault() }
    else if (['0', 'Backspace', 'Delete'].includes(e.key)) { fixer(eleve, item, undefined); e.preventDefault() }
    else if (e.key === 'ArrowDown') { focus(l + 1, c); e.preventDefault() }
    else if (e.key === 'ArrowUp') { focus(l - 1, c); e.preventDefault() }
    else if (e.key === 'ArrowRight') { focus(l, c + 1); e.preventDefault() }
    else if (e.key === 'ArrowLeft') { focus(l, c - 1); e.preventDefault() }
  }

  const reussite = (item: string) => {
    const vals = eleves.map((e) => res[e.id]?.[item]).filter(Boolean) as number[]
    if (!vals.length) return null
    return Math.round((vals.filter((v) => v >= 3).length / vals.length) * 100)
  }
  const ouverte = items.find((it) => it.id === colonne)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Legende />
        <EtatEnregistrement etat={etat} />
      </div>

      {/* Compétence choisie : son libellé et « remplir les cases vides » */}
      {ouverte && (
        <div className="flex flex-wrap items-center gap-3 rounded-3xl bg-white p-3 shadow-doux">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-bateau font-titre text-base font-semibold text-white">
            {items.indexOf(ouverte) + 1}
          </span>
          <span className="min-w-[11rem] flex-1">
            <span className="block font-bold leading-snug text-encre">{ouverte.libelle}</span>
            {ouverte.domaine && <span className="block text-xs font-bold text-brume" title={nomDomaine.get(ouverte.domaine)}>{DOMAINE_COURT[ouverte.domaine] ?? nomDomaine.get(ouverte.domaine)}</span>}
          </span>
          <span className="ml-auto flex items-center gap-1.5" title="Remplir les cases vides">
            <PaintBucket className="size-5 text-bateau" aria-hidden />
            {NIVEAUX.map((n) => (
              <button key={n.v} type="button" onClick={() => remplirColonne(ouverte.id, n.v)}
                className="size-9 rounded-full font-titre text-sm font-semibold transition active:scale-90" style={{ background: n.fond, color: n.couleur }}
                aria-label={`Remplir les cases vides : ${n.nom}`} title={n.nom}>
                {ABREV[n.v]}
              </button>
            ))}
          </span>
          <button type="button" onClick={() => setColonne(null)} aria-label="Fermer" title="Fermer"
            className="flex size-9 items-center justify-center rounded-full text-brume hover:bg-encre/5"><X className="size-5" /></button>
        </div>
      )}

      <div className="w-fit max-w-full overflow-x-auto rounded-3xl bg-white shadow-doux">
        <table className="border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-white px-3 py-2 text-left" aria-label="Élève">
                <Users className="size-5 text-brume" aria-hidden />
              </th>
              {items.map((it, i) => (
                <th key={it.id} className="border-l border-trait px-1 py-2">
                  <button
                    type="button"
                    onClick={() => setColonne(colonne === it.id ? null : it.id)}
                    title={`${it.libelle}${it.domaine ? ` · ${nomDomaine.get(it.domaine)}` : ''}`}
                    aria-label={`Compétence ${i + 1} : ${it.libelle}`}
                    aria-pressed={colonne === it.id}
                    className={clsx('mx-auto flex size-9 items-center justify-center rounded-full font-titre text-base font-semibold transition',
                      colonne === it.id ? 'bg-bateau text-white' : 'bg-bateau-clair text-bateau-fonce hover:bg-bateau/15')}
                  >
                    {i + 1}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {eleves.map((el, l) => (
              <tr key={el.id} className="group">
                <th scope="row" className="sticky left-0 z-10 border-t border-trait bg-white px-3 py-1.5 text-left font-bold text-encre group-hover:bg-papier">
                  {el.prenom}
                </th>
                {items.map((it, c) => {
                  const v = res[el.id]?.[it.id]
                  const n = niveauCourt(v)
                  return (
                    <td key={it.id} className={clsx('border-l border-t border-trait p-1 text-center group-hover:bg-papier/60', colonne === it.id && 'bg-bateau-clair/40')}>
                      <button
                        ref={(b) => { if (b) cases.current.set(`${l}-${c}`, b); else cases.current.delete(`${l}-${c}`) }}
                        type="button"
                        onClick={() => fixer(el.id, it.id, suivant(v))}
                        onKeyDown={(e) => clavier(e, l, c, el.id, it.id)}
                        className={clsx('h-10 w-full min-w-[3.75rem] rounded-xl font-titre text-base font-semibold transition active:scale-95',
                          !n && 'border-2 border-dashed border-trait text-brume/50 hover:border-brume/40')}
                        style={n ? { background: n.fond, color: n.couleur } : undefined}
                        aria-label={`${el.prenom}, ${it.libelle} : ${n ? n.nom : 'pas encore évalué'}`}
                        title={n?.nom}
                      >
                        {n ? ABREV[n.v] : '·'}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th className="sticky left-0 z-10 rounded-bl-3xl border-t-2 border-trait bg-white px-3 py-2 text-left" title="Réussite (atteint ou dépassé)" aria-label="Réussite">
                <Target className="size-5 text-brume" aria-hidden />
              </th>
              {items.map((it) => {
                const pct = reussite(it.id)
                return (
                  <td key={it.id} className="border-l border-t-2 border-trait px-1 py-2 text-center">
                    {pct !== null ? (
                      <span className={clsx('font-titre text-sm font-semibold', pct >= 75 ? 'text-succes' : pct >= 50 ? 'text-ambre-fonce' : 'text-alerte')}
                        title="Atteint ou dépassé">{pct}%</span>
                    ) : <span className="text-brume">·</span>}
                  </td>
                )
              })}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
