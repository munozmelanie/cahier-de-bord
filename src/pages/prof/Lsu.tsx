import clsx from 'clsx'
import { Check, ChevronRight, GraduationCap, ListChecks, Printer, Send, Sparkles, User, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { AssistantIA, type DemandeIA } from '../../components/AssistantIA'
import { ElementsClasse } from '../../components/lsu/ElementsClasse'
import { FicheEleve } from '../../components/lsu/FicheEleve'
import { imprimerLivrets } from '../../components/lsu/impression'
import { bilanDuJour, bilansDe, NB_DOMAINES, propositions } from '../../components/lsu/outils'
import {
  Bascule, Bouton, BoutonIcone, Chargement, Entete, NavPas, Onglets, Vide, useConfirmation, useToast,
} from '../../components/ui'
import { aujourdhui } from '../../lib/dates'
import { useEcrire, useEleves, useEvaluations, useLsu, useLsuClasse } from '../../lib/donnees'
import { LSU } from '../../lib/matieres'
import { useClasse } from '../../lib/session'
import type { LsuBilan } from '../../lib/types'

export default function Lsu() {
  const classe = useClasse()
  const bilans = useMemo(() => bilansDe(classe.reglages), [classe.reglages])
  const [bilanId, setBilanId] = useState(() => bilanDuJour(bilans, aujourdhui())?.id ?? bilans[0]?.id)
  const bilan = bilans.find((b) => b.id === bilanId) ?? bilans[0]
  const [vue, setVue] = useState<'classe' | 'eleve'>('classe')
  const [index, setIndex] = useState(0)
  const [elementsOuverts, setElementsOuverts] = useState(false)
  const [demandeIA, setDemandeIA] = useState<DemandeIA | null>(null)

  const eleves = useEleves()
  const evals = useEvaluations()
  const lsu = useLsu(bilan?.id ?? '')
  const lsuClasse = useLsuClasse(bilan?.id ?? '')
  const ecrire = useEcrire()
  const toast = useToast()
  const { demander, fenetre } = useConfirmation()

  const actifs = useMemo(() => (eleves.data ?? []).filter((e) => e.actif), [eleves.data])
  const parEleve = useMemo(() => new Map((lsu.data ?? []).map((l) => [l.eleve_id, l])), [lsu.data])
  const props = useMemo(() => propositions(evals.data ?? [], bilan), [evals.data, bilan])
  const elements = lsuClasse.data?.[0]

  if (!bilan) return <Vide icone={GraduationCap} texte="Ajoute des bilans dans les réglages." />
  if (eleves.isLoading || lsu.isLoading) return <Chargement />

  const eleve = actifs[Math.min(index, actifs.length - 1)]
  const nbMatieres = LSU.length

  const publier = async (eleveId: string, publie: boolean) => {
    try {
      await ecrire.mutateAsync({
        op: 'upsert', table: 'lsu_bilans', onConflict: 'eleve_id,bilan',
        ligne: { classe_id: classe.id, eleve_id: eleveId, bilan: bilan.id, publie, publie_le: publie ? new Date().toISOString() : null },
      })
      toast(publie ? 'Livret publié aux familles' : 'Livret retiré')
    } catch (e) {
      toast((e as Error).message, 'erreur')
    }
  }
  const toutPublier = () => {
    const prets = (lsu.data ?? []).filter((l) => !l.publie)
    if (!prets.length) return toast('Rien de nouveau à publier.')
    demander(`Publier ${prets.length} livret${prets.length > 1 ? 's' : ''} aux familles ?`, async () => {
      try {
        await ecrire.mutateAsync({
          op: 'upsert', table: 'lsu_bilans', onConflict: 'eleve_id,bilan',
          ligne: prets.map((l) => ({ classe_id: classe.id, eleve_id: l.eleve_id, bilan: bilan.id, publie: true, publie_le: new Date().toISOString() })),
        })
        toast('Livrets publiés')
      } catch (e) {
        toast((e as Error).message, 'erreur')
      }
    })
  }
  const imprimer = (lesquels: typeof actifs) => {
    const ok = imprimerLivrets({ classe, bilan, eleves: lesquels, lignes: lsu.data ?? [], elements })
    if (!ok) toast('Autorise les fenêtres pour imprimer.', 'erreur')
  }

  const etatLigne = (l: LsuBilan | undefined) => ({
    pos: Object.keys(l?.positions ?? {}).length,
    app: Object.values(l?.appreciations ?? {}).filter((t) => t?.trim()).length,
    gen: !!l?.appreciation_generale?.trim(),
  })

  return (
    <div>
      <Entete
        titre="Livret scolaire"
        actions={<>
          <Bouton variante="secondaire" icone={ListChecks} onClick={() => setElementsOuverts(true)}>Éléments travaillés</Bouton>
          <Bouton variante="secondaire" icone={Sparkles}
            onClick={() => setDemandeIA({ type: 'appreciations', bilan: bilan.id, eleveIds: vue === 'eleve' && eleve ? [eleve.id] : actifs.map((e) => e.id) })}>
            ChatGPT
          </Bouton>
        </>}
      />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Onglets valeur={bilan.id} onChange={(v) => setBilanId(v)} options={bilans.map((b) => ({ id: b.id, label: b.nom }))} />
        <Onglets valeur={vue} onChange={setVue} options={[{ id: 'classe', label: 'Classe', icone: Users }, { id: 'eleve', label: 'Élève', icone: User }]} />
      </div>

      {actifs.length === 0 ? (
        <Vide icone={Users} texte="Aucun élève dans la classe." />
      ) : vue === 'classe' ? (
        <>
          <div className="mb-3 flex flex-wrap justify-end gap-2">
            <Bouton variante="secondaire" taille="s" icone={Printer} onClick={() => imprimer(actifs)}>Imprimer la classe</Bouton>
            <Bouton taille="s" icone={Send} onClick={toutPublier}>Tout publier</Bouton>
          </div>
          <div className="overflow-x-auto rounded-3xl bg-white shadow-doux">
            <table className="w-full min-w-[36rem] text-sm">
              <thead>
                <tr className="text-left text-xs font-bold text-brume">
                  <th className="px-4 py-3">Élève</th>
                  <th className="px-3 py-3">Positionnements</th>
                  <th className="px-3 py-3">Appréciations</th>
                  <th className="px-3 py-3 text-center">Générale</th>
                  <th className="px-3 py-3">Familles</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {actifs.map((e, i) => {
                  const l = parEleve.get(e.id)
                  const s = etatLigne(l)
                  const nbProps = Object.keys(props[e.id] ?? {}).filter((d) => !l?.positions?.[d]).length
                  return (
                    <tr key={e.id} className="border-t border-trait hover:bg-papier">
                      <td className="px-4 py-2.5">
                        <button className="font-bold text-encre hover:text-bateau" onClick={() => { setIndex(i); setVue('eleve') }}>{e.prenom}</button>
                      </td>
                      <td className="px-3 py-2.5">
                        <Jauge n={s.pos} total={NB_DOMAINES} />
                        {nbProps > 0 && <span className="ml-2 text-xs font-bold text-bateau">+{nbProps} proposé{nbProps > 1 ? 's' : ''}</span>}
                      </td>
                      <td className="px-3 py-2.5"><Jauge n={s.app} total={nbMatieres} /></td>
                      <td className="px-3 py-2.5 text-center">
                        {s.gen ? <Check className="mx-auto size-5 text-succes" aria-label="Rédigée" /> : <span className="text-brume">—</span>}
                      </td>
                      <td className="px-3 py-2.5">
                        <Bascule actif={!!l?.publie} onChange={(v) => publier(e.id, v)} label={l?.publie ? 'Publié' : ''} />
                      </td>
                      <td className="pr-2">
                        <BoutonIcone icone={ChevronRight} label={`Ouvrir le livret de ${e.prenom}`} onClick={() => { setIndex(i); setVue('eleve') }} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : eleve ? (
        <FicheEleve
          key={`${eleve.id}-${bilan.id}`}
          classeId={classe.id}
          eleve={eleve}
          bilan={bilan.id}
          ligne={parEleve.get(eleve.id)}
          proposees={props[eleve.id] ?? {}}
          entete={
            <div className="flex flex-wrap items-center gap-3">
              <NavPas
                label={<span className="font-titre text-lg">{eleve.prenom}</span>}
                precedent={() => setIndex((i) => (i - 1 + actifs.length) % actifs.length)}
                suivant={() => setIndex((i) => (i + 1) % actifs.length)}
              />
              <Bascule actif={!!parEleve.get(eleve.id)?.publie} onChange={(v) => publier(eleve.id, v)} label="Publié aux familles" />
              <BoutonIcone icone={Printer} label="Imprimer ce livret" variante="secondaire" onClick={() => imprimer([eleve])} />
            </div>
          }
        />
      ) : null}

      <ElementsClasse ouverte={elementsOuverts} onFermer={() => setElementsOuverts(false)} classeId={classe.id} bilan={bilan.id} actuel={elements} />
      <AssistantIA demande={demandeIA} onFermer={() => setDemandeIA(null)} />
      {fenetre}
    </div>
  )
}

function Jauge({ n, total }: { n: number; total: number }) {
  const pct = total ? Math.round((n / total) * 100) : 0
  return (
    <span className="inline-flex items-center gap-2 align-middle">
      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-trait">
        <span className={clsx('block h-full rounded-full', pct === 100 ? 'bg-succes' : 'bg-bateau')} style={{ width: `${pct}%` }} />
      </span>
      <span className="text-xs font-bold text-brume">{n}/{total}</span>
    </span>
  )
}
