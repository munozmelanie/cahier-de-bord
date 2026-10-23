import clsx from 'clsx'
import { Plus, X } from 'lucide-react'
import { useState } from 'react'
import { BoutonIcone, Liste, Saisie, Texte } from '../ui'
import { useEcrire } from '../../lib/donnees'
import { matiere } from '../../lib/matieres'
import { BLOCS_LSU, TOUS_DOMAINES_LIVRET } from '../../lib/referentielLsu'
import type { LsuClasse } from '../../lib/types'
import { EtatEnregistrement } from '../evaluations/EtatEnregistrement'
import { analyserElements, composerElements, couleurLsu, ecrireParcours, lireParcours, PARCOURS, useEnregistrementDiffere, type Parcours } from './outils'

type Choix = Record<string, { coches: string[]; libres: string[] }>
type Etat = { choix: Choix; parcours: Parcours }

export const PARCOURS_ID = 'parcours'

const lire = (actuel: LsuClasse | undefined): Choix =>
  Object.fromEntries(TOUS_DOMAINES_LIVRET.map((dm) => [dm.id, analyserElements(dm.id, actuel?.elements?.[dm.id])]))

/** Éléments du programme travaillés pendant la période et parcours éducatifs (communs à la classe), enregistrés au fil de l'eau */
export function Programme({ classeId, bilan, actuel, ouvrirSur }: { classeId: string; bilan: string; actuel: LsuClasse | undefined; ouvrirSur?: string }) {
  const ecrire = useEcrire()
  const [e, setE] = useState<Etat>(() => ({ choix: lire(actuel), parcours: lireParcours(actuel?.projets) }))
  const [sel, setSel] = useState<string>(ouvrirSur ?? TOUS_DOMAINES_LIVRET[0].id)
  const [nouveau, setNouveau] = useState('')

  const { planifier, etat } = useEnregistrementDiffere<Etat>((v) => ecrire.mutateAsync({
    op: 'upsert', table: 'lsu_classe', onConflict: 'classe_id,bilan',
    ligne: {
      classe_id: classeId, bilan, projets: ecrireParcours(v.parcours),
      // Chaque domaine est écrit, même vide : un domaine absent voudrait dire « tous les éléments »
      elements: Object.fromEntries(TOUS_DOMAINES_LIVRET.map((dm) => [dm.id, composerElements(dm.id, v.choix[dm.id].coches, v.choix[dm.id].libres)])),
    },
  }))
  const maj = (f: (avant: Etat) => Etat) => setE((avant) => { const apres = f(avant); planifier(apres); return apres })

  const basculer = (dm: string, libelle: string) => maj((a) => {
    const c = a.choix[dm]
    const coches = c.coches.includes(libelle) ? c.coches.filter((x) => x !== libelle) : [...c.coches, libelle]
    return { ...a, choix: { ...a.choix, [dm]: { ...c, coches } } }
  })
  const ajouter = (dm: string) => {
    const t = nouveau.trim()
    if (!t) return
    maj((a) => ({ ...a, choix: { ...a.choix, [dm]: { ...a.choix[dm], libres: [...a.choix[dm].libres, t] } } }))
    setNouveau('')
  }
  const retirer = (dm: string, i: number) =>
    maj((a) => ({ ...a, choix: { ...a.choix, [dm]: { ...a.choix[dm], libres: a.choix[dm].libres.filter((_, j) => j !== i) } } }))

  const nb = (dm: string) => (e.choix[dm]?.coches.length ?? 0) + (e.choix[dm]?.libres.length ?? 0)
  const dom = TOUS_DOMAINES_LIVRET.find((x) => x.id === sel)
  const c = dom ? e.choix[dom.id] : undefined
  const bloc = dom && BLOCS_LSU.find((b) => b.id === dom.bloc)

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[15rem_1fr]">
      {/* Choix du domaine */}
      <nav className="hidden flex-col gap-0.5 lg:sticky lg:top-12 lg:flex" aria-label="Domaines">
        {BLOCS_LSU.map((b) => (
          <div key={b.id} className="flex flex-col gap-0.5">
            {!b.seul && <p className="mt-2 px-3 pb-0.5 text-xs font-semibold text-brume">{b.nom}</p>}
            {b.domaines.map((dm) => (
              <button key={dm.id} type="button" onClick={() => setSel(dm.id)} aria-current={sel === dm.id}
                className={clsx('flex min-h-9 items-center gap-2.5 rounded-xl px-3 py-1.5 text-left text-sm leading-tight transition',
                  sel === dm.id ? 'bg-white font-semibold text-encre shadow-doux' : 'font-medium text-encre/80 hover:bg-encre/[.04]')}>
                <span className="size-2 shrink-0 rounded-full" style={{ background: matiere(couleurLsu(dm.id)).couleur }} />
                <span className="min-w-0 flex-1">{b.seul ? b.nom : dm.nom}</span>
                <span className="text-xs tabular-nums text-brume">{nb(dm.id) || '—'}</span>
              </button>
            ))}
          </div>
        ))}
        <button type="button" onClick={() => setSel(PARCOURS_ID)} aria-current={sel === PARCOURS_ID}
          className={clsx('mt-3 flex min-h-9 items-center gap-2.5 rounded-xl px-3 py-1.5 text-left text-sm transition',
            sel === PARCOURS_ID ? 'bg-white font-semibold text-encre shadow-doux' : 'font-medium text-encre/80 hover:bg-encre/[.04]')}>
          <span className="size-2 shrink-0 rounded-full bg-[#5AA9E6]" />
          Parcours éducatifs
        </button>
      </nav>
      <Liste className="lg:hidden" value={sel} onChange={(ev) => setSel(ev.target.value)} aria-label="Domaine">
        {BLOCS_LSU.map((b) => (
          <optgroup key={b.id} label={b.nom}>
            {b.domaines.map((dm) => <option key={dm.id} value={dm.id}>{b.seul ? b.nom : dm.nom} ({nb(dm.id)})</option>)}
          </optgroup>
        ))}
        <option value={PARCOURS_ID}>Parcours éducatifs</option>
      </Liste>

      <section className="rounded-3xl bg-white p-4 shadow-doux sm:p-5">
        <div className="mb-4 flex items-start gap-3">
          <div className="min-w-0 flex-1">
            {sel !== PARCOURS_ID && bloc && !bloc.seul && <p className="text-xs font-semibold text-brume">{bloc.nom}</p>}
            <h3 className="text-[15px] font-semibold text-encre">{sel === PARCOURS_ID ? 'Parcours éducatifs : projets mis en œuvre' : bloc?.seul ? bloc.nom : dom?.nom}</h3>
          </div>
          <EtatEnregistrement etat={etat} />
        </div>

        {sel === PARCOURS_ID ? (
          <div className="flex flex-col gap-4">
            {PARCOURS.map((p) => (
              <label key={p.id} className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold text-encre">{p.nom}</span>
                <Texte rows={2} value={e.parcours[p.id] ?? ''} className="border-transparent bg-papier hover:border-trait focus:bg-white"
                  onChange={(ev) => { const v = ev.target.value; maj((a) => ({ ...a, parcours: { ...a.parcours, [p.id]: v } })) }} />
              </label>
            ))}
            <p className="text-xs text-brume">Communs à toute la classe ; ils apparaissent dans chaque livret de la période.</p>
          </div>
        ) : dom && c ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col">
              {dom.elements.map((el) => {
                const coche = c.coches.includes(el.libelle)
                return (
                  <label key={el.id} className="flex cursor-pointer items-start gap-3 rounded-xl px-2 py-2 transition hover:bg-papier">
                    <input type="checkbox" checked={coche} onChange={() => basculer(dom.id, el.libelle)}
                      className="mt-0.5 size-[18px] shrink-0 cursor-pointer rounded accent-bateau" />
                    <span className={clsx('text-sm leading-snug', coche ? 'font-medium text-encre' : 'text-encre/70')}>{el.libelle}</span>
                  </label>
                )
              })}
            </div>

            <div className="flex flex-col gap-1 border-t border-trait pt-4">
              <p className="mb-1 px-2 text-xs font-semibold text-brume">Éléments ajoutés</p>
              {c.libres.map((l, i) => (
                <div key={`${l}-${i}`} className="group flex items-start gap-3 rounded-xl px-2 py-1.5 hover:bg-papier">
                  <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-brume" />
                  <span className="min-w-0 flex-1 text-sm font-medium leading-snug text-encre">{l}</span>
                  <button type="button" onClick={() => retirer(dom.id, i)} aria-label={`Retirer « ${l} »`} title="Retirer"
                    className="text-brume opacity-60 transition hover:text-alerte group-hover:opacity-100"><X className="size-4" /></button>
                </div>
              ))}
              <form className="mt-1 flex gap-2" onSubmit={(ev) => { ev.preventDefault(); ajouter(dom.id) }}>
                <Saisie value={nouveau} onChange={(ev) => setNouveau(ev.target.value)} placeholder="Ajouter un élément travaillé"
                  aria-label={`Ajouter un élément en ${dom.nom}`} className="border-transparent bg-papier py-2 focus:bg-white" />
                <BoutonIcone type="submit" icone={Plus} label="Ajouter" variante="doux" className="size-10" />
              </form>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  )
}
