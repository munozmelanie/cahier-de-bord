import clsx from 'clsx'
import { PaintBucket } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { useEcrire } from '../../lib/donnees'
import { NIVEAUX, TOUS_DOMAINES } from '../../lib/matieres'
import type { Eleve, Evaluation } from '../../lib/types'
import { ABREV, niveauCourt, useEnregistrementDiffere } from '../lsu/outils'
import { EtatEnregistrement } from './EtatEnregistrement'

type Resultats = Evaluation['resultats']

// Ordre au toucher : vide → non atteints → partiellement → atteints → dépassés → vide
const suivant = (v: number | undefined) => (v === undefined ? 1 : v >= 4 ? undefined : v + 1)

export function Legende() {
  return (
    <div className="flex flex-wrap gap-1.5">
      {NIVEAUX.map((n) => (
        <span key={n.v} className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold" style={{ background: n.fond, color: n.couleur }}>
          <span className="font-titre">{ABREV[n.v]}</span> {n.court}
        </span>
      ))}
    </div>
  )
}

export function GrilleResultats({ evaluation, eleves }: { evaluation: Evaluation; eleves: Eleve[] }) {
  const ecrire = useEcrire()
  const [res, setRes] = useState<Resultats>(() => evaluation.resultats ?? {})
  const [remplir, setRemplir] = useState<string | null>(null)
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
    setRemplir(null)
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
    return { pct: Math.round((vals.filter((v) => v >= 3).length / vals.length) * 100), n: vals.length }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Legende />
        <EtatEnregistrement etat={etat} />
      </div>
      <div className="overflow-x-auto rounded-3xl bg-white shadow-doux">
        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-white px-3 py-3 text-left font-titre text-base font-semibold">Élève</th>
              {items.map((it) => (
                <th key={it.id} className="relative min-w-[6.5rem] max-w-[10rem] border-l border-trait px-2 py-2 align-bottom">
                  <div className="flex flex-col items-center gap-1">
                    <span className="line-clamp-3 text-center text-xs font-bold leading-snug text-encre">{it.libelle}</span>
                    {it.domaine && <span className="line-clamp-1 text-center text-[10px] font-bold text-brume">{nomDomaine.get(it.domaine)}</span>}
                    <button
                      type="button"
                      onClick={() => setRemplir(remplir === it.id ? null : it.id)}
                      className="mt-0.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold text-bateau hover:bg-bateau-clair"
                      aria-label={`Remplir les cases vides de « ${it.libelle} »`}
                      title="Remplir les cases vides"
                    >
                      <PaintBucket className="size-3.5" /> Remplir
                    </button>
                  </div>
                  {remplir === it.id && (
                    <div className="absolute left-1/2 top-full z-20 mt-1 flex -translate-x-1/2 gap-1 rounded-2xl bg-white p-1.5 shadow-flotte">
                      {NIVEAUX.map((n) => (
                        <button key={n.v} type="button" onClick={() => remplirColonne(it.id, n.v)}
                          className="size-9 rounded-xl font-titre text-sm font-semibold" style={{ background: n.fond, color: n.couleur }}
                          title={n.nom}>
                          {ABREV[n.v]}
                        </button>
                      ))}
                    </div>
                  )}
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
                    <td key={it.id} className="border-l border-t border-trait p-1 text-center group-hover:bg-papier/60">
                      <button
                        ref={(b) => { if (b) cases.current.set(`${l}-${c}`, b); else cases.current.delete(`${l}-${c}`) }}
                        type="button"
                        onClick={() => fixer(el.id, it.id, suivant(v))}
                        onKeyDown={(e) => clavier(e, l, c, el.id, it.id)}
                        className={clsx('h-10 w-full min-w-[4.5rem] rounded-xl font-titre text-base font-semibold transition active:scale-95',
                          !n && 'border-2 border-dashed border-trait text-brume/50 hover:border-brume/40')}
                        style={n ? { background: n.fond, color: n.couleur } : undefined}
                        aria-label={`${el.prenom}, ${it.libelle} : ${n ? n.nom : 'pas encore évalué'}`}
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
              <th className="sticky left-0 z-10 rounded-bl-3xl border-t-2 border-trait bg-white px-3 py-2 text-left text-xs font-bold text-brume">Réussite</th>
              {items.map((it) => {
                const r = reussite(it.id)
                return (
                  <td key={it.id} className="border-l border-t-2 border-trait px-2 py-2 text-center">
                    {r ? (
                      <span className={clsx('font-titre text-base font-semibold', r.pct >= 75 ? 'text-succes' : r.pct >= 50 ? 'text-ambre-fonce' : 'text-alerte')}>{r.pct} %</span>
                    ) : <span className="text-brume">—</span>}
                  </td>
                )
              })}
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="hidden text-xs text-brume sm:block">Au clavier : touches 1 à 4, 0 pour effacer, flèches pour se déplacer.</p>
    </div>
  )
}
