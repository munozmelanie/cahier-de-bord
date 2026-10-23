import clsx from 'clsx'
import { CheckCircle2, GraduationCap, ListChecks, MessageSquareQuote, Printer, Send, Sparkles, User, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { AssistantIA, type DemandeIA } from '../../components/AssistantIA'
import { CarteInfo } from '../../components/CarteInfo'
import { CarteEleve } from '../../components/lsu/CarteEleve'
import { ElementsClasse } from '../../components/lsu/ElementsClasse'
import { FicheEleve } from '../../components/lsu/FicheEleve'
import { imprimerLivrets } from '../../components/lsu/impression'
import { bilanDuJour, bilansDe, NB_DOMAINES, propositions } from '../../components/lsu/outils'
import { BoutonIcone, Chargement, Entete, NavPas, Onglets, Vide, useConfirmation, useToast } from '../../components/ui'
import { aujourdhui } from '../../lib/dates'
import { useEcrire, useEleves, useEvaluations, useLsu, useLsuClasse } from '../../lib/donnees'
import { useClasse } from '../../lib/session'

/** Bascule Classe / Élève en icônes */
function ChoixVue({ vue, onChange }: { vue: 'classe' | 'eleve'; onChange: (v: 'classe' | 'eleve') => void }) {
  const bouton = (v: 'classe' | 'eleve', Icone: typeof Users, label: string) => (
    <button type="button" role="tab" aria-selected={vue === v} aria-label={label} title={label} onClick={() => onChange(v)}
      className={clsx('flex h-8 w-10 items-center justify-center rounded-full transition', vue === v ? 'bg-white text-encre shadow-sm' : 'text-brume hover:text-encre')}>
      <Icone className="size-4" />
    </button>
  )
  return (
    <div className="inline-flex gap-1 rounded-full bg-encre/5 p-1" role="tablist">
      {bouton('classe', Users, 'Classe')}
      {bouton('eleve', User, 'Élève')}
    </div>
  )
}

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

  if (!bilan) return <Vide icone={GraduationCap} texte="Aucun bilan dans les réglages" />
  if (eleves.isLoading || lsu.isLoading) return <Chargement />

  const eleve = actifs[Math.min(index, actifs.length - 1)]

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
  const imprimer = (lesquels: typeof actifs) => {
    const ok = imprimerLivrets({ classe, bilan, eleves: lesquels, lignes: lsu.data ?? [], elements })
    if (!ok) toast('Autorise les fenêtres pour imprimer', 'erreur')
  }

  // Chiffres de la classe pour les petites cartes
  const lignes = actifs.map((e) => parEleve.get(e.id))
  const nbPublies = lignes.filter((l) => l?.publie).length
  const nbPositions = lignes.reduce((n, l) => n + Object.keys(l?.positions ?? {}).length, 0)
  const pctPositions = actifs.length ? Math.round((nbPositions / (actifs.length * NB_DOMAINES)) * 100) : 0
  const nbGenerales = lignes.filter((l) => l?.appreciation_generale?.trim()).length
  const publieEleve = !!(eleve && parEleve.get(eleve.id)?.publie)

  return (
    <div>
      <Entete
        titre="Livret"
        actions={<>
          <Onglets valeur={bilan.id} onChange={(v) => setBilanId(v)} options={bilans.map((b) => ({ id: b.id, label: b.id }))} />
          <ChoixVue vue={vue} onChange={setVue} />
          <BoutonIcone icone={ListChecks} label="Éléments du programme travaillés" variante="secondaire" onClick={() => setElementsOuverts(true)} />
          <BoutonIcone icone={Sparkles} label="Appréciations avec ChatGPT" variante="secondaire"
            onClick={() => setDemandeIA({ type: 'appreciations', bilan: bilan.id, eleveIds: vue === 'eleve' && eleve ? [eleve.id] : actifs.map((e) => e.id) })} />
          {vue === 'classe' && <>
            <BoutonIcone icone={Printer} label="Imprimer les livrets de la classe" variante="secondaire" onClick={() => imprimer(actifs)} />
            <BoutonIcone icone={Send} label="Publier tous les livrets aux familles" variante="primaire" onClick={toutPublier} />
          </>}
        </>}
      />

      {actifs.length === 0 ? (
        <Vide icone={Users} texte="Aucun élève" />
      ) : vue === 'classe' ? (
        <>
          <div className="mb-5 grid grid-cols-3 gap-3 lg:max-w-2xl">
            <CarteInfo icone={GraduationCap} couleur="#2E5BFF" fond="#E6ECFF" nombre={`${pctPositions}%`} titre="Positionnements remplis" />
            <CarteInfo icone={MessageSquareQuote} couleur="#7B4DFF" fond="#EEE8FF" nombre={nbGenerales} titre="Appréciations générales rédigées" />
            <CarteInfo icone={CheckCircle2} couleur="#18A058" fond="#E3F6EC" nombre={nbPublies} titre="Livrets publiés aux familles" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {actifs.map((e, i) => (
              <CarteEleve key={e.id} eleve={e} ligne={parEleve.get(e.id)} proposees={props[e.id] ?? {}}
                onOuvrir={() => { setIndex(i); setVue('eleve') }} onPublier={(v) => publier(e.id, v)} />
            ))}
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
            <div className="flex flex-wrap items-center gap-2">
              <NavPas
                label={<span className="font-titre text-lg">{eleve.prenom}</span>}
                precedent={() => setIndex((i) => (i - 1 + actifs.length) % actifs.length)}
                suivant={() => setIndex((i) => (i + 1) % actifs.length)}
              />
              <button type="button" onClick={() => publier(eleve.id, !publieEleve)} aria-pressed={publieEleve}
                aria-label={publieEleve ? 'Retirer le livret' : 'Publier aux familles'} title={publieEleve ? 'Visible des familles (toucher pour retirer)' : 'Publier aux familles'}
                className={clsx('flex size-10 items-center justify-center rounded-full transition', publieEleve ? 'bg-succes text-white' : 'border border-trait bg-white text-brume hover:text-bateau')}>
                {publieEleve ? <CheckCircle2 className="size-5" /> : <Send className="size-5" />}
              </button>
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
