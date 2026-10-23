import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useMemo, useState } from 'react'
import { CalendrierSemaine } from '../../components/CalendrierSemaine'
import { useFaits } from '../../components/devoirs/CaseFait'
import { CarteDevoir } from '../../components/devoirs/CarteDevoir'
import { Chargement, NavPas } from '../../components/ui'
import { useDevoirsPour } from '../../lib/donnees'
import { aujourdhui, decaler, iso, joursSemaine, lundiDe } from '../../lib/dates'
import { useSession } from '../../lib/session'
import type { Devoir } from '../../lib/types'

const lundiCourant = () => iso(lundiDe(new Date(aujourdhui() + 'T12:00:00')))

/** Devoirs de la semaine en calendrier, rangés par jour où il faut les faire */
export default function DevoirsParent() {
  const { classe } = useSession()
  const [lundi, setLundi] = useState(lundiCourant)
  const jours = useMemo(() => joursSemaine(lundi, classe?.reglages), [lundi, classe?.reglages])
  const devoirs = useDevoirsPour(lundi, decaler(lundi, 6))
  const { faits, basculer } = useFaits()
  const parJour = useMemo(() => {
    const m = new Map<string, Devoir[]>()
    for (const d of devoirs.data ?? []) m.set(d.pour_le, [...(m.get(d.pour_le) ?? []), d])
    return m
  }, [devoirs.data])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-encre">Devoirs</h1>
        <NavPas label={format(parseISO(lundi), 'd MMM', { locale: fr })} precedent={() => setLundi(decaler(lundi, -7))} suivant={() => setLundi(decaler(lundi, 7))} auMilieu={() => setLundi(lundiCourant())} />
      </div>
      {devoirs.isLoading ? <Chargement /> : (
        <CalendrierSemaine
          jours={jours}
          reglages={classe?.reglages}
          liste
          compte={(j) => (parJour.get(j) ?? []).filter((d) => !faits.includes(d.id)).length}
          rendu={(j) => {
            const l = parJour.get(j) ?? []
            return l.length
              ? l.map((d) => <CarteDevoir key={d.id} d={d} fait={faits.includes(d.id)} onFait={() => basculer(d.id)} />)
              : <p className="text-sm text-brume">Rien à faire</p>
          }}
        />
      )}
    </div>
  )
}
