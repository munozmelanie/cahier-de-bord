import { CalendarDays, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { avecVacances, CarteEvenement, parMois } from '../../components/agenda/agenda'
import { EditeurEvenement } from '../../components/agenda/EditeurEvenement'
import { Bouton, Chargement, Entete, Erreur, Onglets, Vide } from '../../components/ui'
import { aujourdhui, decaler } from '../../lib/dates'
import { useAgenda } from '../../lib/donnees'
import { useClasse } from '../../lib/session'
import type { EvenementAgenda } from '../../lib/types'

export default function AgendaProf() {
  const classe = useClasse()
  const r = classe.reglages
  const debutAnnee = r.periodes?.[0]?.debut ?? decaler(aujourdhui(), -365)
  const finAnnee = r.vacances?.[r.vacances.length - 1]?.fin ?? decaler(aujourdhui(), 365)
  const agenda = useAgenda(debutAnnee, finAnnee)
  const [vue, setVue] = useState<'avenir' | 'tout'>('avenir')
  const [edition, setEdition] = useState<{ ev: EvenementAgenda | null } | null>(null)
  const auj = aujourdhui()

  const groupes = useMemo(() => {
    const tout = avecVacances(agenda.data ?? [], r)
    const liste = vue === 'avenir' ? tout.filter((e) => (e.fin ?? e.date) >= auj) : tout
    return parMois(liste)
  }, [agenda.data, r, vue, auj])

  return (
    <div>
      <Entete titre="Agenda" actions={<Bouton icone={Plus} onClick={() => setEdition({ ev: null })}>Ajouter</Bouton>} />
      <div className="mb-4">
        <Onglets valeur={vue} onChange={setVue} options={[{ id: 'avenir', label: 'À venir' }, { id: 'tout', label: "Toute l'année" }]} />
      </div>
      {agenda.isLoading ? <Chargement /> : agenda.error ? <Erreur message={(agenda.error as Error).message} /> : groupes.length === 0 ? (
        <Vide icone={CalendarDays} texte="Rien de prévu." action={<Bouton icone={Plus} onClick={() => setEdition({ ev: null })}>Ajouter un événement</Bouton>} />
      ) : (
        <div className="flex flex-col gap-6">
          {groupes.map((g) => (
            <section key={g.mois}>
              <h2 className="mb-2 font-titre text-xl font-semibold capitalize text-encre">{g.mois}</h2>
              <div className="grid gap-2 md:grid-cols-2">
                {g.elements.map((e) => (
                  <CarteEvenement key={e.cle} e={e} attenue={(e.fin ?? e.date) < auj} masque={e.ev ? !e.ev.visible_familles : false}
                    onClick={e.ev ? () => setEdition({ ev: e.ev! }) : undefined} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
      <EditeurEvenement ouvert={!!edition} onFermer={() => setEdition(null)} classeId={classe.id} ev={edition?.ev ?? null} />
    </div>
  )
}
