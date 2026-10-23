import { CalendarDays, ChevronDown } from 'lucide-react'
import { useMemo, useState } from 'react'
import { avecVacances, CarteEvenement, parMois } from '../../components/agenda/agenda'
import { Bouton, Chargement, Erreur, Vide } from '../../components/ui'
import { aujourdhui, decaler } from '../../lib/dates'
import { useAgenda } from '../../lib/donnees'
import { useSession } from '../../lib/session'

export default function AgendaParent() {
  const { classe } = useSession()
  const r = classe?.reglages
  const debutAnnee = r?.periodes?.[0]?.debut ?? decaler(aujourdhui(), -365)
  const finAnnee = r?.vacances?.[r.vacances.length - 1]?.fin ?? decaler(aujourdhui(), 365)
  const agenda = useAgenda(debutAnnee, finAnnee)
  const [passes, setPasses] = useState(false)
  const auj = aujourdhui()

  const { avenir, finis } = useMemo(() => {
    const tout = avecVacances(agenda.data ?? [], r)
    return {
      avenir: parMois(tout.filter((e) => (e.fin ?? e.date) >= auj)),
      finis: parMois(tout.filter((e) => (e.fin ?? e.date) < auj).reverse()),
    }
  }, [agenda.data, r, auj])

  if (agenda.isLoading) return <Chargement />
  if (agenda.error) return <Erreur message={(agenda.error as Error).message} />

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-titre text-3xl font-semibold text-encre">Agenda</h1>
      {avenir.length === 0 ? <Vide icone={CalendarDays} texte="Rien de prévu pour le moment." /> : avenir.map((g) => (
        <section key={g.mois}>
          <h2 className="mb-2 font-titre text-xl font-semibold capitalize text-encre">{g.mois}</h2>
          <div className="flex flex-col gap-2">{g.elements.map((e) => <CarteEvenement key={e.cle} e={e} />)}</div>
        </section>
      ))}
      {finis.length > 0 && (
        passes ? finis.map((g) => (
          <section key={'p' + g.mois}>
            <h2 className="mb-2 font-titre text-xl font-semibold capitalize text-brume">{g.mois}</h2>
            <div className="flex flex-col gap-2">{g.elements.map((e) => <CarteEvenement key={e.cle} e={e} attenue />)}</div>
          </section>
        )) : (
          <Bouton variante="secondaire" icone={ChevronDown} onClick={() => setPasses(true)} className="self-center">Voir les événements passés</Bouton>
        )
      )}
    </div>
  )
}
