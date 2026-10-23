import clsx from 'clsx'
import { CheckCircle2, Eraser } from 'lucide-react'
import { useEffect, useMemo, useState, type MouseEvent } from 'react'
import { useToast } from '../ui'
import { useEcrire } from '../../lib/donnees'
import { NIVEAUX } from '../../lib/matieres'
import { BLOCS_LSU } from '../../lib/referentielLsu'
import type { Eleve, LsuBilan, LsuClasse } from '../../lib/types'
import { COLONNES_LIVRET } from './Document'
import { Point } from './Niveaux'
import { elementsDuDomaine, NOM_COURT_LSU, type ElementTravaille } from './outils'

type Edition = { el: ElementTravaille; eleve: Eleve | null; x: number; y: number }

/**
 * Toute la classe, un bloc à la fois : une ligne par élément du programme, une colonne par élève.
 * Un clic sur un rond pour positionner un élève ; « Tous » pour remplir les cases vides d'une ligne.
 */
export function VueClasse({ classeId, bilan, eleves, parEleve, props, classeLsu, onOuvrir }: {
  classeId: string; bilan: string; eleves: Eleve[]; parEleve: Map<string, LsuBilan>
  props: Record<string, Record<string, number>>; classeLsu: LsuClasse | undefined; onOuvrir: (index: number) => void
}) {
  const ecrire = useEcrire()
  const toast = useToast()
  const [blocId, setBlocId] = useState(BLOCS_LSU[0].id)
  const [edition, setEdition] = useState<Edition | null>(null)
  const bloc = BLOCS_LSU.find((b) => b.id === blocId) ?? BLOCS_LSU[0]
  const doms = useMemo(() => bloc.domaines.map((dm) => ({ dm, els: elementsDuDomaine(classeLsu, dm) })).filter((x) => x.els.length), [bloc, classeLsu])

  useEffect(() => {
    if (!edition) return
    const fermer = (e: KeyboardEvent) => { if (e.key === 'Escape') setEdition(null) }
    const defil = () => setEdition(null)
    window.addEventListener('keydown', fermer)
    window.addEventListener('scroll', defil, true)
    return () => { window.removeEventListener('keydown', fermer); window.removeEventListener('scroll', defil, true) }
  }, [edition])

  const ouvrir = (ev: MouseEvent<HTMLButtonElement>, el: ElementTravaille, eleve: Eleve | null) => {
    const r = ev.currentTarget.getBoundingClientRect()
    setEdition({ el, eleve, x: Math.min(Math.max(r.left + r.width / 2, 130), window.innerWidth - 130), y: r.bottom + 6 })
  }

  const positionner = async (v: number | undefined) => {
    if (!edition) return
    const { el, eleve } = edition
    setEdition(null)
    // Un élève, ou toute la ligne (seulement les cases vides)
    const cibles = eleve ? [eleve] : eleves.filter((e) => !parEleve.get(e.id)?.positions?.[el.cle])
    if (!cibles.length) return
    const lignes = cibles.map((e) => {
      const positions = { ...(parEleve.get(e.id)?.positions ?? {}) }
      if (v === undefined) delete positions[el.cle]
      else positions[el.cle] = v
      return { classe_id: classeId, eleve_id: e.id, bilan, positions }
    })
    try {
      await ecrire.mutateAsync({ op: 'upsert', table: 'lsu_bilans', onConflict: 'eleve_id,bilan', ligne: lignes })
      if (!eleve) toast(`${lignes.length} élève${lignes.length > 1 ? 's' : ''} positionné${lignes.length > 1 ? 's' : ''}`)
    } catch (e) {
      toast((e as Error).message, 'erreur')
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Enseignement">
        {BLOCS_LSU.map((b) => (
          <button key={b.id} type="button" role="tab" aria-selected={b.id === blocId} onClick={() => setBlocId(b.id)} title={b.nom}
            className={clsx('h-8 shrink-0 rounded-full px-3 text-sm font-semibold transition',
              b.id === blocId ? 'bg-encre text-white' : 'bg-white text-encre/80 shadow-doux hover:text-encre')}>
            {NOM_COURT_LSU[b.id] ?? b.nom}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-2xl bg-white shadow-doux">
        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-[1] min-w-[15rem] bg-white px-4 pb-2 pt-3 text-left align-bottom text-xs font-semibold text-brume sm:min-w-[22rem]">
                Éléments du programme
              </th>
              <th className="px-1 pb-2 align-bottom text-[11px] font-semibold text-brume">Tous</th>
              {eleves.map((e, i) => (
                <th key={e.id} className="h-24 w-9 px-0 pb-2 align-bottom">
                  <button type="button" onClick={() => onOuvrir(i)} title={`Ouvrir le livret de ${e.prenom}`}
                    className="mx-auto block rotate-180 whitespace-nowrap text-xs font-semibold text-encre [writing-mode:vertical-rl] hover:text-bateau">
                    {e.prenom}
                    {parEleve.get(e.id)?.publie && <CheckCircle2 className="mb-1 inline size-3.5 text-succes" aria-label="Publié" />}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {doms.map(({ dm, els }) => [
              !bloc.seul && (
                <tr key={dm.id}>
                  <td colSpan={eleves.length + 2} className="sticky left-0 border-t border-trait bg-papier px-4 py-1.5 text-xs font-semibold text-encre">{dm.nom}</td>
                </tr>
              ),
              ...els.map((el) => (
                <tr key={el.cle} className="group">
                  <td className="sticky left-0 z-[1] border-t border-trait bg-white px-4 py-1.5 text-[13px] leading-snug text-encre group-hover:bg-[#FAFBFC]">{el.libelle}</td>
                  <td className="border-t border-trait px-1 text-center group-hover:bg-[#FAFBFC]">
                    <button type="button" onClick={(ev) => ouvrir(ev, el, null)} title="Remplir les cases vides de la ligne"
                      className="rounded-lg px-1.5 py-1 text-[11px] font-semibold text-bateau hover:bg-bateau-clair">Tous</button>
                  </td>
                  {eleves.map((e) => (
                    <td key={e.id} className="border-t border-trait p-0 text-center group-hover:bg-[#FAFBFC]">
                      <button type="button" onClick={(ev) => ouvrir(ev, el, e)} aria-label={`${e.prenom}, ${el.libelle}`}
                        className={clsx('mx-auto flex size-9 items-center justify-center rounded-lg transition hover:bg-encre/[.05]',
                          edition?.eleve?.id === e.id && edition.el.cle === el.cle && 'bg-bateau-clair')}>
                        <Point v={parEleve.get(e.id)?.positions?.[el.cle]} propose={props[e.id]?.[el.cle]} />
                      </button>
                    </td>
                  ))}
                </tr>
              )),
            ])}
          </tbody>
        </table>
        {!doms.length && <p className="px-4 pb-4 text-sm text-brume">Aucun élément travaillé dans cet enseignement pour la période.</p>}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-xs text-brume">
        {NIVEAUX.map((n, k) => (
          <span key={n.v} className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full" style={{ background: n.couleur }} />{COLONNES_LIVRET[k]}</span>
        ))}
        <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full border-[1.5px] border-dashed border-brume" />Proposé d'après les évaluations</span>
      </div>

      {edition && (
        <>
          <button type="button" className="fixed inset-0 z-40 cursor-default" aria-label="Fermer" onClick={() => setEdition(null)} />
          <div role="dialog" aria-label={edition.el.libelle}
            className="fixed z-50 w-64 -translate-x-1/2 rounded-2xl bg-white p-1.5 shadow-flotte"
            style={{ left: edition.x, top: Math.min(edition.y, window.innerHeight - 250) }}>
            <p className="px-2.5 pb-1.5 pt-1 text-xs leading-snug text-brume">
              <span className="font-semibold text-encre">{edition.eleve ? edition.eleve.prenom : 'Cases vides de la ligne'}</span><br />{edition.el.libelle}
            </p>
            {NIVEAUX.map((n, k) => {
              const actuel = !!edition.eleve && parEleve.get(edition.eleve.id)?.positions?.[edition.el.cle] === n.v
              return (
                <button key={n.v} type="button" onClick={() => positionner(n.v)}
                  className={clsx('flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm font-medium transition hover:bg-papier', actuel && 'bg-papier font-semibold')}>
                  <span className="size-3 rounded-full" style={{ background: n.couleur }} />{COLONNES_LIVRET[k]}
                </button>
              )
            })}
            {edition.eleve && (
              <button type="button" onClick={() => positionner(undefined)} className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm text-brume hover:bg-papier">
                <Eraser className="size-3.5" /> Effacer
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
