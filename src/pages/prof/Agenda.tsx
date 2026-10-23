import { useMemo, useState } from 'react'
import { avecVacances } from '../../components/agenda/agenda'
import { CalendrierMois, moisDe } from '../../components/agenda/CalendrierMois'
import { EditeurEvenement } from '../../components/agenda/EditeurEvenement'
import { Chargement, Entete, Erreur } from '../../components/ui'
import { aujourdhui, decaler } from '../../lib/dates'
import { useAgenda } from '../../lib/donnees'
import { useClasse } from '../../lib/session'
import type { EvenementAgenda } from '../../lib/types'

export default function AgendaProf() {
  const classe = useClasse()
  const r = classe.reglages
  const auj = aujourdhui()
  const debutAnnee = r.periodes?.[0]?.debut ?? decaler(auj, -365)
  const finAnnee = r.vacances?.[r.vacances.length - 1]?.fin ?? decaler(auj, 365)
  const agenda = useAgenda(debutAnnee, finAnnee)
  const [mois, setMois] = useState(moisDe(auj))
  const [choisi, setChoisi] = useState(auj)
  const [edition, setEdition] = useState<{ ev: EvenementAgenda | null; date?: string } | null>(null)
  const elements = useMemo(() => avecVacances(agenda.data ?? [], r), [agenda.data, r])

  return (
    <div>
      <Entete titre="Agenda" />
      {agenda.isLoading ? <Chargement /> : agenda.error ? <Erreur message={(agenda.error as Error).message} /> : (
        <CalendrierMois
          mois={mois} onMois={setMois} elements={elements} reglages={r}
          choisi={choisi} onChoisir={(j) => { setChoisi(j); if (moisDe(j) !== mois) setMois(moisDe(j)) }}
          onAjouter={(j) => setEdition({ ev: null, date: j })}
          onOuvrir={(e) => e.ev && setEdition({ ev: e.ev })}
          masque={(e) => !!e.ev && !e.ev.visible_familles}
        />
      )}
      <EditeurEvenement ouvert={!!edition} onFermer={() => setEdition(null)} classeId={classe.id} ev={edition?.ev ?? null} dateInitiale={edition?.date} />
    </div>
  )
}
