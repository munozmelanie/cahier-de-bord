import clsx from 'clsx'
import { Plus, X } from 'lucide-react'
import { useState } from 'react'
import { BoutonIcone, Liste, Saisie, Texte } from '../ui'
import { useEcrire } from '../../lib/donnees'
import { matiere } from '../../lib/matieres'
import { REFERENTIEL_LSU } from '../../lib/referentielLsu'
import type { LsuClasse } from '../../lib/types'
import { EtatEnregistrement } from '../evaluations/EtatEnregistrement'
import { analyserElements, composerElements, ICONE_LSU, NOM_COURT_LSU, useEnregistrementDiffere } from './outils'

type Choix = Record<string, { coches: string[]; libres: string[] }>
type Etat = { choix: Choix; projets: string }

const PROJETS = 'projets'

const lire = (actuel: LsuClasse | undefined): Choix =>
  Object.fromEntries(REFERENTIEL_LSU.map((m) => {
    const { coches, libres } = analyserElements(m.matiere, actuel?.elements?.[m.matiere])
    return [m.matiere, { coches: [...coches], libres }]
  }))

/** Éléments du programme travaillés pendant la période (communs à la classe), enregistrés au fil de l'eau */
export function Programme({ classeId, bilan, actuel }: { classeId: string; bilan: string; actuel: LsuClasse | undefined }) {
  const ecrire = useEcrire()
  const [e, setE] = useState<Etat>(() => ({ choix: lire(actuel), projets: actuel?.projets ?? '' }))
  const [sel, setSel] = useState<string>(REFERENTIEL_LSU[0].matiere)
  const [nouveau, setNouveau] = useState('')

  const { planifier, etat } = useEnregistrementLsu(classeId, bilan, ecrire.mutateAsync)
  const maj = (f: (avant: Etat) => Etat) => setE((avant) => { const apres = f(avant); planifier(apres); return apres })

  const basculer = (m: string, libelle: string) => maj((a) => {
    const c = a.choix[m]
    const coches = c.coches.includes(libelle) ? c.coches.filter((x) => x !== libelle) : [...c.coches, libelle]
    return { ...a, choix: { ...a.choix, [m]: { ...c, coches } } }
  })
  const ajouter = (m: string) => {
    const t = nouveau.trim()
    if (!t) return
    maj((a) => ({ ...a, choix: { ...a.choix, [m]: { ...a.choix[m], libres: [...a.choix[m].libres, t] } } }))
    setNouveau('')
  }
  const retirer = (m: string, i: number) =>
    maj((a) => ({ ...a, choix: { ...a.choix, [m]: { ...a.choix[m], libres: a.choix[m].libres.filter((_, j) => j !== i) } } }))

  const nb = (m: string) => (e.choix[m]?.coches.length ?? 0) + (e.choix[m]?.libres.length ?? 0)
  const ref = REFERENTIEL_LSU.find((m) => m.matiere === sel)
  const c = ref ? e.choix[ref.matiere] : undefined

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[14rem_1fr]">
      {/* Choix de la matière */}
      <nav className="hidden flex-col gap-0.5 lg:sticky lg:top-12 lg:flex" aria-label="Matières">
        {REFERENTIEL_LSU.map((m) => (
          <button key={m.matiere} type="button" onClick={() => setSel(m.matiere)} aria-current={sel === m.matiere}
            className={clsx('flex h-9 items-center gap-2.5 rounded-xl px-3 text-left text-sm transition',
              sel === m.matiere ? 'bg-white font-semibold text-encre shadow-doux' : 'font-medium text-encre/80 hover:bg-encre/[.04]')}>
            <span className="size-2 shrink-0 rounded-full" style={{ background: matiere(ICONE_LSU[m.matiere]).couleur }} />
            <span className="min-w-0 flex-1 truncate">{NOM_COURT_LSU[m.matiere] ?? m.nom}</span>
            {nb(m.matiere) > 0 && <span className="text-xs tabular-nums text-brume">{nb(m.matiere)}</span>}
          </button>
        ))}
        <button type="button" onClick={() => setSel(PROJETS)} aria-current={sel === PROJETS}
          className={clsx('mt-2 flex h-9 items-center gap-2.5 rounded-xl px-3 text-left text-sm transition',
            sel === PROJETS ? 'bg-white font-semibold text-encre shadow-doux' : 'font-medium text-encre/80 hover:bg-encre/[.04]')}>
          <span className="size-2 shrink-0 rounded-full bg-brume" />
          Projets et parcours
        </button>
      </nav>
      <Liste className="lg:hidden" value={sel} onChange={(ev) => setSel(ev.target.value)} aria-label="Matière">
        {REFERENTIEL_LSU.map((m) => <option key={m.matiere} value={m.matiere}>{NOM_COURT_LSU[m.matiere] ?? m.nom}{nb(m.matiere) ? ` (${nb(m.matiere)})` : ''}</option>)}
        <option value={PROJETS}>Projets et parcours</option>
      </Liste>

      <section className="rounded-3xl bg-white p-4 shadow-doux sm:p-5">
        <div className="mb-4 flex items-center gap-3">
          <h3 className="min-w-0 flex-1 text-[15px] font-semibold text-encre">{sel === PROJETS ? 'Projets et parcours de la classe' : ref?.nom}</h3>
          <EtatEnregistrement etat={etat} />
        </div>

        {sel === PROJETS ? (
          <Texte rows={4} value={e.projets} placeholder="Parcours citoyen, artistique, éducatif de santé, projets de la classe…"
            className="border-transparent bg-papier focus:bg-white" onChange={(ev) => { const v = ev.target.value; maj((a) => ({ ...a, projets: v })) }} />
        ) : ref && c ? (
          <div className="flex flex-col gap-5">
            {ref.sousDomaines.map((sd) => (
              <div key={sd.id} className="flex flex-col">
                {ref.sousDomaines.length > 1 && <p className="mb-1 px-2 text-xs font-semibold text-brume">{sd.nom}</p>}
                {sd.elements.map((el) => {
                  const coche = c.coches.includes(el.libelle)
                  return (
                    <label key={el.id} className="flex cursor-pointer items-start gap-3 rounded-xl px-2 py-2 transition hover:bg-papier">
                      <input type="checkbox" checked={coche} onChange={() => basculer(ref.matiere, el.libelle)}
                        className="mt-0.5 size-[18px] shrink-0 cursor-pointer rounded accent-bateau" />
                      <span className={clsx('text-sm leading-snug', coche ? 'font-medium text-encre' : 'text-encre/80')}>{el.libelle}</span>
                    </label>
                  )
                })}
              </div>
            ))}

            <div className="flex flex-col gap-1 border-t border-trait pt-4">
              <p className="mb-1 px-2 text-xs font-semibold text-brume">Autres éléments travaillés</p>
              {c.libres.map((l, i) => (
                <div key={`${l}-${i}`} className="group flex items-start gap-3 rounded-xl px-2 py-1.5 hover:bg-papier">
                  <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-brume" />
                  <span className="min-w-0 flex-1 text-sm font-medium leading-snug text-encre">{l}</span>
                  <button type="button" onClick={() => retirer(ref.matiere, i)} aria-label={`Retirer « ${l} »`} title="Retirer"
                    className="text-brume opacity-60 transition hover:text-alerte group-hover:opacity-100"><X className="size-4" /></button>
                </div>
              ))}
              <form className="mt-1 flex gap-2" onSubmit={(ev) => { ev.preventDefault(); ajouter(ref.matiere) }}>
                <Saisie value={nouveau} onChange={(ev) => setNouveau(ev.target.value)} placeholder="Ajouter un élément"
                  aria-label={`Ajouter un élément en ${ref.nom}`} className="border-transparent bg-papier py-2 focus:bg-white" />
                <BoutonIcone type="submit" icone={Plus} label="Ajouter" variante="doux" className="size-10" />
              </form>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  )
}

/** Enregistrement différé de la ligne lsu_classe */
function useEnregistrementLsu(classeId: string, bilan: string, envoyer: (v: any) => Promise<unknown>) {
  return useEnregistrementDiffere<Etat>((v) => envoyer({
    op: 'upsert', table: 'lsu_classe', onConflict: 'classe_id,bilan',
    ligne: {
      classe_id: classeId, bilan, projets: v.projets.trim() || null,
      elements: Object.fromEntries(REFERENTIEL_LSU
        .map((m) => [m.matiere, composerElements(m.matiere, new Set(v.choix[m.matiere].coches), v.choix[m.matiere].libres)])
        .filter(([, t]) => t)),
    },
  }))
}
