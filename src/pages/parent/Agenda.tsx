import { useMemo, useState } from 'react'
import { avecVacances } from '../../components/agenda/agenda'
import { CalendrierMois, moisDe } from '../../components/agenda/CalendrierMois'
import { Chargement, Erreur } from '../../components/ui'
import { aujourdhui, decaler } from '../../lib/dates'
import { useAgenda } from '../../lib/donnees'
import { useSession } from '../../lib/session'

/** Agenda des familles : le mois en grille, lecture seule */
export default function AgendaParent() {
  const { classe } = useSession()
  const r = classe?.reglages
  const auj = aujourdhui()
  const debutAnnee = r?.periodes?.[0]?.debut ?? decaler(auj, -365)
  const finAnnee = r?.vacances?.[r.vacances.length - 1]?.fin ?? decaler(auj, 365)
  const agenda = useAgenda(debutAnnee, finAnnee)
  const [mois, setMois] = useState(moisDe(auj))
  const [choisi, setChoisi] = useState(auj)
  const elements = useMemo(() => avecVacances(agenda.data ?? [], r), [agenda.data, r])

  if (agenda.isLoading) return <Chargement />
  if (agenda.error) return <Erreur message={(agenda.error as Error).message} />

  return (
    <CalendrierMois
      mois={mois} onMois={setMois} elements={elements} reglages={r}
      choisi={choisi} onChoisir={(j) => { setChoisi(j); if (moisDe(j) !== mois) setMois(moisDe(j)) }}
    />
  )
}
