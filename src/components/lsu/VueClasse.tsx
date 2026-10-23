import clsx from 'clsx'
import { CheckCircle2, Eraser } from 'lucide-react'
import { useEffect, useState, type MouseEvent } from 'react'
import { useToast } from '../ui'
import { useEcrire } from '../../lib/donnees'
import { LSU, NIVEAUX, matiere } from '../../lib/matieres'
import type { Eleve, LsuBilan } from '../../lib/types'
import { COLONNES, Point } from './Niveaux'
import { ICONE_LSU } from './outils'

/** Noms très courts des colonnes (le nom complet est en infobulle) */
const COURT: Record<string, string> = {
  'fr.oral': 'Oral', 'fr.lecture': 'Lect.', 'fr.ecriture': 'Écrit', 'fr.langue': 'Langue',
  'ma.nombres': 'Calcul', 'ma.grandeurs': 'Mes.', 'ma.espace': 'Géom.',
  'lv.ecouter': 'Écou.', 'lv.lire': 'Lire', 'lv.parler': 'Parl.', 'lv.ecrire': 'Écrit', 'lv.dialoguer': 'Dial.', 'lv.culture': 'Cult.',
  ap: 'Arts', em: 'Mus.', hda: 'HDA', eps: 'EPS', emc: 'EMC', hg: 'H.-G.', st: 'Sci.',
}

type Edition = { eleve: Eleve; domaine: string; nom: string; x: number; y: number }

/** Toute la classe d'un coup d'œil : une ligne par élève, une colonne par sous-domaine. Un clic sur un rond pour positionner. */
export function VueClasse({ classeId, bilan, eleves, parEleve, props, onOuvrir }: {
  classeId: string; bilan: string; eleves: Eleve[]; parEleve: Map<string, LsuBilan>
  props: Record<string, Record<string, number>>; onOuvrir: (index: number) => void
}) {
  const ecrire = useEcrire()
  const toast = useToast()
  const [edition, setEdition] = useState<Edition | null>(null)

  useEffect(() => {
    if (!edition) return
    const fermer = (e: KeyboardEvent) => { if (e.key === 'Escape') setEdition(null) }
    const defil = () => setEdition(null)
    window.addEventListener('keydown', fermer)
    window.addEventListener('scroll', defil, true)
    return () => { window.removeEventListener('keydown', fermer); window.removeEventListener('scroll', defil, true) }
  }, [edition])

  const ouvrirEdition = (ev: MouseEvent<HTMLButtonElement>, eleve: Eleve, domaine: string, nom: string) => {
    const r = ev.currentTarget.getBoundingClientRect()
    setEdition({ eleve, domaine, nom, x: Math.min(r.left + r.width / 2, window.innerWidth - 120), y: r.bottom + 6 })
  }

  const positionner = async (v: number | undefined) => {
    if (!edition) return
    const { eleve, domaine } = edition
    setEdition(null)
    const positions = { ...(parEleve.get(eleve.id)?.positions ?? {}) }
    if (v === undefined) delete positions[domaine]
    else positions[domaine] = v
    try {
      await ecrire.mutateAsync({
        op: 'upsert', table: 'lsu_bilans', onConflict: 'eleve_id,bilan',
        ligne: { classe_id: classeId, eleve_id: eleve.id, bilan, positions },
      })
    } catch (e) {
      toast((e as Error).message, 'erreur')
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-3xl bg-white shadow-doux">
        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th rowSpan={2} className="sticky left-0 z-[1] min-w-[9rem] bg-white px-4 pb-2 pt-3 text-left align-bottom text-xs font-semibold text-brume">Élève</th>
              {LSU.map((m) => {
                const c = matiere(ICONE_LSU[m.id]).couleur
                return m.domaines.length > 1 ? (
                  <th key={m.id} colSpan={m.domaines.length} className="border-l border-trait px-1 pt-3 text-center text-xs font-semibold text-encre">
                    <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: c }} />{m.id === 'lv' ? 'Anglais' : m.nom}</span>
                  </th>
                ) : (
                  <th key={m.id} rowSpan={2} title={m.nom} className="w-11 border-l border-trait px-0.5 pb-2 align-bottom text-[11px] font-semibold text-encre">
                    <span className="flex flex-col items-center gap-1"><span className="size-2 rounded-full" style={{ background: c }} />{COURT[m.id]}</span>
                  </th>
                )
              })}
              <th rowSpan={2} className="border-l border-trait px-3 pb-2 align-bottom text-[11px] font-semibold text-brume" title="Appréciations rédigées">Appréc.</th>
              <th rowSpan={2} className="px-3 pb-2 align-bottom text-[11px] font-semibold text-brume">Publié</th>
            </tr>
            <tr>
              {LSU.filter((m) => m.domaines.length > 1).flatMap((m) => m.domaines.map((d, i) => (
                <th key={d.id} title={d.nom} className={clsx('w-11 px-0.5 pb-2 pt-1 text-[11px] font-medium text-brume', i === 0 && 'border-l border-trait')}>{COURT[d.id]}</th>
              )))}
            </tr>
          </thead>
          <tbody>
            {eleves.map((e, i) => {
              const l = parEleve.get(e.id)
              const nbApp = Object.values(l?.appreciations ?? {}).filter((t) => t?.trim()).length
              return (
                <tr key={e.id} className="group">
                  <td className="sticky left-0 z-[1] border-t border-trait bg-white px-4 py-1 group-hover:bg-[#FAFBFC]">
                    <button type="button" onClick={() => onOuvrir(i)} className="max-w-[10rem] truncate text-left font-semibold text-encre hover:text-bateau" title={`Ouvrir le livret de ${e.prenom}`}>
                      {e.prenom}
                    </button>
                  </td>
                  {LSU.flatMap((m) => m.domaines.map((d, j) => (
                    <td key={d.id} className={clsx('border-t border-trait p-0 text-center group-hover:bg-[#FAFBFC]', j === 0 && 'border-l')}>
                      <button type="button" onClick={(ev) => ouvrirEdition(ev, e, d.id, d.nom)} aria-label={`${e.prenom}, ${d.nom}`}
                        className={clsx('mx-auto flex size-9 items-center justify-center rounded-lg transition hover:bg-encre/[.05]',
                          edition?.eleve.id === e.id && edition.domaine === d.id && 'bg-bateau-clair')}>
                        <Point v={l?.positions?.[d.id]} propose={props[e.id]?.[d.id]} />
                      </button>
                    </td>
                  )))}
                  <td className="border-l border-t border-trait px-3 text-center text-xs tabular-nums text-brume group-hover:bg-[#FAFBFC]">{nbApp}/{LSU.length}</td>
                  <td className="border-t border-trait px-3 text-center group-hover:bg-[#FAFBFC]">
                    {l?.publie ? <CheckCircle2 className="mx-auto size-[18px] text-succes" aria-label="Publié" /> : <span className="text-trait">—</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-xs text-brume">
        {NIVEAUX.map((n) => (
          <span key={n.v} className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full" style={{ background: n.couleur }} />{COLONNES[n.v]}</span>
        ))}
        <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full border-[1.5px] border-dashed border-brume" />Proposé d'après les évaluations</span>
      </div>

      {edition && (
        <>
          <button type="button" className="fixed inset-0 z-40 cursor-default" aria-label="Fermer" onClick={() => setEdition(null)} />
          <div role="dialog" aria-label={`${edition.eleve.prenom}, ${edition.nom}`}
            className="fixed z-50 w-56 -translate-x-1/2 rounded-2xl bg-white p-1.5 shadow-flotte"
            style={{ left: edition.x, top: Math.min(edition.y, window.innerHeight - 230) }}>
            <p className="px-2.5 pb-1.5 pt-1 text-xs leading-snug text-brume"><span className="font-semibold text-encre">{edition.eleve.prenom}</span><br />{edition.nom}</p>
            {NIVEAUX.map((n) => {
              const actuel = parEleve.get(edition.eleve.id)?.positions?.[edition.domaine] === n.v
              return (
                <button key={n.v} type="button" onClick={() => positionner(n.v)}
                  className={clsx('flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm font-medium transition hover:bg-papier', actuel && 'bg-papier font-semibold')}>
                  <span className="size-3 rounded-full" style={{ background: n.couleur }} />{COLONNES[n.v]}
                </button>
              )
            })}
            <button type="button" onClick={() => positionner(undefined)} className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm text-brume hover:bg-papier">
              <Eraser className="size-3.5" /> Effacer
            </button>
          </div>
        </>
      )}
    </div>
  )
}
