import clsx from 'clsx'
import { CheckCircle2, ChevronLeft, ChevronRight, GraduationCap, Printer, Send, Sparkles, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { AssistantIA, type DemandeIA } from '../../components/AssistantIA'
import { FicheEleve } from '../../components/lsu/FicheEleve'
import { imprimerLivrets } from '../../components/lsu/impression'
import { bilanDuJour, bilansDe, propositions, tousLesElements } from '../../components/lsu/outils'
import { Programme, PARCOURS_ID } from '../../components/lsu/Programme'
import { VueClasse } from '../../components/lsu/VueClasse'
import { Bouton, BoutonIcone, Chargement, Entete, Liste, Onglets, OngletsLigne, Vide, useConfirmation, useToast } from '../../components/ui'
import { aujourdhui } from '../../lib/dates'
import { useEcrire, useEleves, useEvaluations, useLsu, useLsuClasse } from '../../lib/donnees'
import { MODE_DEMO } from '../../lib/supabase'
import { useClasse } from '../../lib/session'
import type { Eleve, LsuBilan } from '../../lib/types'

type Vue = 'eleve' | 'classe' | 'programme'

const nbPositions = (l: LsuBilan | undefined, cles: Set<string>) => Object.keys(l?.positions ?? {}).filter((k) => cles.has(k)).length

export default function Lsu() {
  const classe = useClasse()
  const bilans = useMemo(() => bilansDe(classe.reglages), [classe.reglages])
  const [bilanId, setBilanId] = useState(() => bilanDuJour(bilans, aujourdhui())?.id ?? bilans[0]?.id)
  const bilan = bilans.find((b) => b.id === bilanId) ?? bilans[0]
  const [vue, setVue] = useState<Vue>('eleve')
  const [index, setIndex] = useState(0)
  const [demandeIA, setDemandeIA] = useState<DemandeIA | null>(null)
  const [programmeSur, setProgrammeSur] = useState<string | undefined>(undefined)

  const eleves = useEleves()
  const evals = useEvaluations()
  const lsu = useLsu(bilan?.id ?? '')
  const lsuClasse = useLsuClasse(bilan?.id ?? '')
  const ecrire = useEcrire()
  const toast = useToast()
  const { demander, fenetre } = useConfirmation()

  const actifs = useMemo(() => (eleves.data ?? []).filter((e) => e.actif), [eleves.data])
  const parEleve = useMemo(() => new Map((lsu.data ?? []).map((l) => [l.eleve_id, l])), [lsu.data])
  const elements = lsuClasse.data?.[0]
  const travailles = useMemo(() => tousLesElements(elements), [elements])
  const cles = useMemo(() => new Set(travailles.map((x) => x.cle)), [travailles])
  const props = useMemo(() => propositions(evals.data ?? [], bilan, travailles), [evals.data, bilan, travailles])

  if (!bilan) return <Vide icone={GraduationCap} texte="Aucun bilan dans les réglages" />
  if (eleves.isLoading || lsu.isLoading || lsuClasse.isLoading) return <Chargement />

  const i = Math.min(index, Math.max(actifs.length - 1, 0))
  const eleve = actifs[i]
  const total = travailles.length

  const publier = async (eleveId: string, publie: boolean) => {
    try {
      await ecrire.mutateAsync({
        op: 'upsert', table: 'lsu_bilans', onConflict: 'eleve_id,bilan',
        ligne: { classe_id: classe.id, eleve_id: eleveId, bilan: bilan.id, publie, publie_le: publie ? new Date().toISOString() : null },
      })
      toast(publie ? 'Livret publié' : 'Livret retiré')
    } catch (e) {
      toast((e as Error).message, 'erreur')
    }
  }
  const toutPublier = () => {
    const prets = (lsu.data ?? []).filter((l) => !l.publie)
    if (!prets.length) return toast('Rien de nouveau à publier')
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
  const imprimer = (lesquels: Eleve[]) => {
    if (!imprimerLivrets({ classe, bilan, nbBilans: bilans.length, eleves: lesquels, lignes: lsu.data ?? [], elements })) toast('Autorise les fenêtres pour imprimer', 'erreur')
  }
  const aller = (n: number) => setIndex((n + actifs.length) % actifs.length)

  return (
    <div>
      <Entete
        titre="Livret"
        sousTitre={bilan.nom}
        actions={<>
          {bilans.length > 1 && <Onglets valeur={bilan.id} onChange={(v) => setBilanId(v)} options={bilans.map((b) => ({ id: b.id, label: b.id }))} />}
          <BoutonIcone icone={Sparkles} label="Rédiger les appréciations avec ChatGPT" variante="secondaire"
            onClick={() => setDemandeIA({ type: 'appreciations', bilan: bilan.id, eleveIds: vue === 'eleve' && eleve ? [eleve.id] : actifs.map((e) => e.id) })} />
          <BoutonIcone icone={Printer} label="Imprimer tous les livrets" variante="secondaire" onClick={() => imprimer(actifs)} />
          <Bouton icone={Send} onClick={toutPublier}>Tout publier</Bouton>
        </>}
      />

      <OngletsLigne<Vue> valeur={vue} onChange={(v) => { setProgrammeSur(undefined); setVue(v) }} options={[
        { id: 'eleve', label: 'Par élève' },
        { id: 'classe', label: 'Toute la classe' },
        { id: 'programme', label: 'Programme travaillé', nombre: total },
      ]} />

      {actifs.length === 0 ? (
        <Vide icone={Users} texte="Ajoute tes élèves pour remplir les livrets" />
      ) : vue === 'eleve' && eleve ? (
        <div className="grid items-start gap-6 lg:grid-cols-[12.5rem_1fr]">
          <nav className={clsx('hidden max-h-[calc(100dvh-4rem)] flex-col gap-0.5 overflow-y-auto pb-4 lg:sticky lg:flex', MODE_DEMO ? 'top-12' : 'top-4')} aria-label="Élèves">
            {actifs.map((e, j) => {
              const l = parEleve.get(e.id)
              const n = nbPositions(l, cles)
              return (
                <button key={e.id} type="button" onClick={() => setIndex(j)} aria-current={j === i}
                  className={clsx('flex items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition',
                    j === i ? 'bg-white font-semibold text-encre shadow-doux' : 'font-medium text-encre/80 hover:bg-encre/[.04]')}>
                  <span className="min-w-0 flex-1 truncate">{e.prenom}</span>
                  {l?.publie
                    ? <CheckCircle2 className="size-4 shrink-0 text-succes" aria-label="Publié" />
                    : (
                      <span className="h-1 w-8 shrink-0 overflow-hidden rounded-full bg-trait" title={`${n} sur ${total} positionnés`}>
                        <span className="block h-full rounded-full bg-bateau" style={{ width: `${total ? (n / total) * 100 : 0}%` }} />
                      </span>
                    )}
                </button>
              )
            })}
          </nav>

          <FicheEleve
            key={`${eleve.id}-${bilan.id}`}
            classe={classe}
            bilan={bilan}
            nbBilans={bilans.length}
            eleve={eleve}
            ligne={parEleve.get(eleve.id)}
            classeLsu={elements}
            proposees={props[eleve.id] ?? {}}
            onModifierParcours={() => { setProgrammeSur(PARCOURS_ID); setVue('programme') }}
            entete={<EnteteEleve eleve={eleve} eleves={actifs} index={i} ligne={parEleve.get(eleve.id)} aller={aller} total={total} cles={cles}
              onPublier={(v) => publier(eleve.id, v)} onImprimer={() => imprimer([eleve])} />}
          />
        </div>
      ) : vue === 'classe' ? (
        <VueClasse classeId={classe.id} bilan={bilan.id} eleves={actifs} parEleve={parEleve} props={props} classeLsu={elements}
          onOuvrir={(j) => { setIndex(j); setVue('eleve') }} />
      ) : vue === 'programme' ? (
        <Programme key={`${bilan.id}-${programmeSur ?? ''}`} classeId={classe.id} bilan={bilan.id} actuel={elements} ouvrirSur={programmeSur} />
      ) : null}

      <AssistantIA demande={demandeIA} onFermer={() => setDemandeIA(null)} />
      {fenetre}
    </div>
  )
}

/** Nom de l'élève, changement d'élève, état de publication */
function EnteteEleve({ eleve, eleves, index, ligne, aller, onPublier, onImprimer, total, cles }: {
  eleve: Eleve; eleves: Eleve[]; index: number; ligne: LsuBilan | undefined
  aller: (i: number) => void; onPublier: (v: boolean) => void; onImprimer: () => void; total: number; cles: Set<string>
}) {
  const n = nbPositions(ligne, cles)
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
      <div className="flex items-center gap-1">
        <BoutonIcone icone={ChevronLeft} label="Élève précédent" onClick={() => aller(index - 1)} variante="secondaire" />
        <BoutonIcone icone={ChevronRight} label="Élève suivant" onClick={() => aller(index + 1)} variante="secondaire" />
      </div>
      <div className="min-w-0">
        <Liste value={eleve.id} onChange={(e) => aller(eleves.findIndex((x) => x.id === e.target.value))} aria-label="Élève"
          className="w-auto border-transparent bg-transparent py-0 pl-0 text-xl font-bold focus:ring-0 lg:hidden">
          {eleves.map((e) => <option key={e.id} value={e.id}>{e.prenom}</option>)}
        </Liste>
        <h2 className="hidden truncate text-xl font-bold text-encre lg:block">{eleve.prenom} {eleve.nom ?? ''}</h2>
        <p className="text-xs text-brume">{n} sur {total} éléments positionnés</p>
      </div>
      <div className="flex items-center gap-1.5">
        {ligne?.publie ? (
          <button type="button" onClick={() => onPublier(false)} title="Visible par la famille. Cliquer pour retirer."
            className="inline-flex h-8 items-center gap-1.5 rounded-full bg-succes-clair px-3 text-sm font-semibold text-succes">
            <CheckCircle2 className="size-4" /> Publié
          </button>
        ) : (
          <Bouton variante="secondaire" taille="s" icone={Send} onClick={() => onPublier(true)}>Publier</Bouton>
        )}
        <BoutonIcone icone={Printer} label={`Imprimer le livret de ${eleve.prenom}`} onClick={onImprimer} />
      </div>
    </div>
  )
}
