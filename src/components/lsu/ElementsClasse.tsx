import clsx from 'clsx'
import { Check, ChevronDown, Flag, Plus, Save, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Bouton, BoutonIcone, Feuille, Saisie, Texte, useToast } from '../ui'
import { useEcrire } from '../../lib/donnees'
import { matiere } from '../../lib/matieres'
import { REFERENTIEL_LSU } from '../../lib/referentielLsu'
import type { LsuClasse } from '../../lib/types'
import { analyserElements, composerElements, DOMAINE_COURT, ICONE_LSU, NOM_COURT_LSU } from './outils'

type Choix = Record<string, { coches: Set<string>; libres: string[] }>

const lire = (actuel: LsuClasse | undefined): Choix =>
  Object.fromEntries(REFERENTIEL_LSU.map((m) => [m.matiere, analyserElements(m.matiere, actuel?.elements?.[m.matiere])]))

/** Éléments du programme travaillés (communs à la classe) : éléments officiels à cocher + éléments libres */
export function ElementsClasse({ ouverte, onFermer, classeId, bilan, actuel }: {
  ouverte: boolean; onFermer: () => void; classeId: string; bilan: string; actuel: LsuClasse | undefined
}) {
  const ecrire = useEcrire()
  const toast = useToast()
  const [choix, setChoix] = useState<Choix>(() => lire(actuel))
  const [projets, setProjets] = useState('')
  const [deplie, setDeplie] = useState<string | null>(null)
  const [nouveau, setNouveau] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!ouverte) return
    setChoix(lire(actuel))
    setProjets(actuel?.projets ?? '')
    setNouveau({})
  }, [ouverte, actuel])

  const basculer = (m: string, libelle: string) => setChoix((c) => {
    const coches = new Set(c[m].coches)
    if (coches.has(libelle)) coches.delete(libelle)
    else coches.add(libelle)
    return { ...c, [m]: { ...c[m], coches } }
  })
  const ajouterLibre = (m: string) => {
    const t = (nouveau[m] ?? '').trim()
    if (!t) return
    setChoix((c) => ({ ...c, [m]: { ...c[m], libres: [...c[m].libres, t] } }))
    setNouveau((n) => ({ ...n, [m]: '' }))
  }
  const retirerLibre = (m: string, i: number) =>
    setChoix((c) => ({ ...c, [m]: { ...c[m], libres: c[m].libres.filter((_, j) => j !== i) } }))

  async function enregistrer() {
    const elements = Object.fromEntries(
      REFERENTIEL_LSU.map((m) => [m.matiere, composerElements(m.matiere, choix[m.matiere].coches, choix[m.matiere].libres)])
        .filter(([, texte]) => texte),
    )
    try {
      await ecrire.mutateAsync({
        op: 'upsert', table: 'lsu_classe', onConflict: 'classe_id,bilan',
        ligne: { classe_id: classeId, bilan, elements, projets: projets.trim() || null },
      })
      toast('Éléments enregistrés')
      onFermer()
    } catch (e) {
      toast((e as Error).message, 'erreur')
    }
  }

  return (
    <Feuille ouverte={ouverte} onFermer={onFermer} titre="Éléments travaillés" large
      pied={<>
        <Bouton variante="secondaire" onClick={onFermer}>Annuler</Bouton>
        <Bouton icone={Save} onClick={enregistrer} enCours={ecrire.isPending}>Enregistrer</Bouton>
      </>}>
      <div className="flex flex-col gap-2.5">
        {REFERENTIEL_LSU.map((m) => {
          const mat = matiere(ICONE_LSU[m.matiere])
          const Icone = mat.icone
          const c = choix[m.matiere]
          const n = (c?.coches.size ?? 0) + (c?.libres.length ?? 0)
          const ouvert = deplie === m.matiere
          return (
            <section key={m.matiere} className="rounded-[22px] p-3" style={{ background: mat.fond }} aria-label={m.nom}>
              <button type="button" onClick={() => setDeplie(ouvert ? null : m.matiere)} aria-expanded={ouvert}
                className="flex w-full items-center gap-3 text-left">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm" style={{ color: mat.couleur }}>
                  <Icone className="size-5" strokeWidth={2.2} />
                </span>
                <span className="min-w-0 flex-1 truncate font-titre text-lg font-semibold text-encre" title={m.nom}>{NOM_COURT_LSU[m.matiere] ?? m.nom}</span>
                {n > 0 && <span className="rounded-full px-2 font-titre text-sm font-semibold leading-6 text-white" style={{ background: mat.couleur }}>{n}</span>}
                <ChevronDown className={clsx('size-5 shrink-0 transition', ouvert && 'rotate-180')} style={{ color: mat.couleur }} />
              </button>

              {ouvert && c && (
                <div className="mt-3 flex flex-col gap-3">
                  {m.sousDomaines.map((sd) => (
                    <div key={sd.id} className="flex flex-col gap-1.5">
                      {m.sousDomaines.length > 1 && (
                        <span className="text-xs font-bold" style={{ color: mat.couleur }} title={sd.nom}>{DOMAINE_COURT[sd.id] ?? sd.nom}</span>
                      )}
                      <div className="flex flex-wrap gap-1.5">
                        {sd.elements.map((el) => {
                          const coche = c.coches.has(el.libelle)
                          return (
                            <button key={el.id} type="button" onClick={() => basculer(m.matiere, el.libelle)} aria-pressed={coche}
                              className={clsx('inline-flex max-w-full items-start gap-1.5 rounded-2xl px-3 py-1.5 text-left text-sm font-bold leading-snug transition',
                                coche ? 'text-white shadow-sm' : 'bg-white/80 text-encre hover:bg-white')}
                              style={coche ? { background: mat.couleur } : undefined}>
                              {coche && <Check className="mt-0.5 size-4 shrink-0" strokeWidth={3} />}
                              <span>{el.libelle}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}

                  {c.libres.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {c.libres.map((l, i) => (
                        <span key={`${l}-${i}`} className="inline-flex max-w-full items-start gap-1.5 rounded-2xl border-2 border-dashed bg-white px-3 py-1.5 text-sm font-bold leading-snug text-encre"
                          style={{ borderColor: mat.couleur }}>
                          <span>{l}</span>
                          <button type="button" onClick={() => retirerLibre(m.matiere, i)} aria-label={`Retirer « ${l} »`} title="Retirer" className="text-brume hover:text-alerte">
                            <X className="size-4" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); ajouterLibre(m.matiere) }}>
                    <Saisie value={nouveau[m.matiere] ?? ''} onChange={(e) => setNouveau((x) => ({ ...x, [m.matiere]: e.target.value }))}
                      placeholder="Autre élément" aria-label={`Ajouter un élément en ${m.nom}`} className="bg-white py-2" />
                    <BoutonIcone type="submit" icone={Plus} label="Ajouter" variante="doux" />
                  </form>
                </div>
              )}
            </section>
          )
        })}

        <section className="flex items-start gap-3 rounded-[22px] bg-white p-3 shadow-doux" aria-label="Projets">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-succes-clair text-succes"><Flag className="size-5" /></span>
          <Texte value={projets} onChange={(e) => setProjets(e.target.value)} placeholder="Projets et parcours" aria-label="Projets et parcours" />
        </section>
      </div>
    </Feuille>
  )
}
