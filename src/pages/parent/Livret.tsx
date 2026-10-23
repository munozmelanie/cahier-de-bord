import { Check, GraduationCap } from 'lucide-react'
import { useMemo, useState } from 'react'
import { BilanLivret, EnTeteLivret, TableauLivret } from '../../components/lsu/Document'
import { bilansDe } from '../../components/lsu/outils'
import { Bouton, Chargement, Onglets, Vide, useToast } from '../../components/ui'
import { useLsuClasse, useRafraichir, useTable } from '../../lib/donnees'
import { useSession } from '../../lib/session'
import { db, verif } from '../../lib/supabase'
import type { LsuBilan } from '../../lib/types'

/** Livret des familles : le bilan périodique, présenté comme le livret officiel */
export default function Livret() {
  const { enfant, classe } = useSession()
  const toast = useToast()
  const rafraichir = useRafraichir()
  const tousBilans = useMemo(() => bilansDe(classe?.reglages), [classe?.reglages])
  const livrets = useTable<LsuBilan>('lsu_bilans', ['famille', enfant?.id], (q) => q.eq('eleve_id', enfant!.id), !!enfant)
  const [enCours, setEnCours] = useState(false)

  // Bilans publiés, du plus récent au plus ancien
  const publies = useMemo(() => {
    const ordre = new Map(tousBilans.map((b, i) => [b.id, i]))
    return (livrets.data ?? []).filter((l) => l.publie).sort((a, b) => (ordre.get(b.bilan) ?? 0) - (ordre.get(a.bilan) ?? 0))
  }, [livrets.data, tousBilans])
  const [choix, setChoix] = useState<string | null>(null)
  const livret = publies.find((l) => l.bilan === choix) ?? publies[0]
  const bilan = tousBilans.find((b) => b.id === livret?.bilan)
  const elements = useLsuClasse(livret?.bilan ?? '')

  if (livrets.isLoading || elements.isLoading) return <Chargement />
  if (!livret || !bilan || !classe || !enfant) return <Vide icone={GraduationCap} texte="Le livret apparaîtra ici quand il sera publié" />

  async function vu() {
    setEnCours(true)
    try {
      verif(await db.rpc('livret_vu', { p_livret: livret.id }))
      rafraichir('lsu_bilans')
      toast('Merci, c\'est noté')
    } catch (e) { toast((e as Error).message, 'erreur') } finally { setEnCours(false) }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-encre">Livret</h1>
          <p className="mt-0.5 text-sm text-brume">{bilan.nom}</p>
        </div>
        {publies.length > 1 && (
          <Onglets valeur={livret.bilan} onChange={setChoix} options={publies.map((l) => ({ id: l.bilan, label: l.bilan }))} />
        )}
      </div>

      {!livret.vu_le && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-bateau-clair px-4 py-3">
          <p className="min-w-0 flex-1 text-sm font-medium text-bateau-fonce">Après l'avoir lu, indiquez que vous en avez pris connaissance.</p>
          <Bouton taille="s" icone={Check} onClick={vu} enCours={enCours}>J'ai pris connaissance</Bouton>
        </div>
      )}

      <article className="flex flex-col gap-5 rounded-2xl bg-white p-4 shadow-doux sm:p-6">
        <EnTeteLivret classe={classe} bilan={bilan} eleve={enfant} nbBilans={tousBilans.length} />
        <TableauLivret classeLsu={elements.data?.[0]} positions={livret.positions ?? {}} />
        <BilanLivret
          classe={classe}
          directeur={classe.reglages?.directeur_nom}
          projets={elements.data?.[0]?.projets}
          publieLe={livret.publie_le}
          vuLe={livret.vu_le}
          appreciation={<p className="whitespace-pre-line leading-relaxed">{livret.appreciation_generale}</p>}
          accompagnement={livret.accompagnement?.trim() ? <p>Accompagnement : {livret.accompagnement}</p> : undefined}
          visaParents={
            <Bouton taille="s" variante="secondaire" icone={Check} onClick={vu} enCours={enCours} className="mt-2">J'ai pris connaissance</Bouton>
          }
        />
      </article>
    </div>
  )
}
