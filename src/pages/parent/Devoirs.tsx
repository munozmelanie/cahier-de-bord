import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useMemo, useState } from 'react'
import { CalendrierSemaine } from '../../components/CalendrierSemaine'
import { useFaits } from '../../components/devoirs/CaseFait'
import { CarteDevoir } from '../../components/devoirs/CarteDevoir'
import { bornesMois, moisDe, MoisDevoirs, OPTIONS_VUE, useVueDevoirs } from '../../components/devoirs/MoisDevoirs'
import { Chargement, NavPas, Onglets } from '../../components/ui'
import { useDevoirsPour } from '../../lib/donnees'
import { aujourdhui, decaler, iso, joursSemaine, lundiDe } from '../../lib/dates'
import { useSession } from '../../lib/session'
import type { Devoir } from '../../lib/types'

const lundiCourant = () => iso(lundiDe(new Date(aujourdhui() + 'T12:00:00')))

/** Devoirs rangés par jour où il faut les faire : la semaine en liste, ou le mois en calendrier */
export default function DevoirsParent() {
  const { classe } = useSession()
  const [affichage, setAffichage] = useVueDevoirs()
  const [lundi, setLundi] = useState(lundiCourant)
  const [mois, setMois] = useState(() => moisDe(aujourdhui()))
  const [choisi, setChoisi] = useState(aujourdhui)
  const jours = useMemo(() => joursSemaine(lundi, classe?.reglages), [lundi, classe?.reglages])
  const bornes = bornesMois(mois)
  const devoirs = useDevoirsPour(affichage === 'mois' ? bornes.debut : lundi, affichage === 'mois' ? bornes.fin : decaler(lundi, 6))
  const { faits, basculer } = useFaits()
  const parJour = useMemo(() => {
    const m = new Map<string, Devoir[]>()
    for (const d of devoirs.data ?? []) m.set(d.pour_le, [...(m.get(d.pour_le) ?? []), d])
    return m
  }, [devoirs.data])
  const carte = (d: Devoir) => <CarteDevoir key={d.id} d={d} fait={faits.includes(d.id)} onFait={() => basculer(d.id)} />

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-encre">Devoirs</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Onglets valeur={affichage} onChange={setAffichage} options={OPTIONS_VUE} />
          {affichage === 'semaine' && (
            <NavPas label={format(parseISO(lundi), 'd MMM', { locale: fr })} precedent={() => setLundi(decaler(lundi, -7))} suivant={() => setLundi(decaler(lundi, 7))} auMilieu={() => setLundi(lundiCourant())} />
          )}
        </div>
      </div>
      {devoirs.isLoading ? <Chargement /> : affichage === 'mois' ? (
        <MoisDevoirs
          mois={mois} onMois={setMois} devoirs={devoirs.data ?? []} reglages={classe?.reglages} empile
          choisi={choisi} onChoisir={(j) => { setChoisi(j); if (moisDe(j) !== mois) setMois(moisDe(j)) }}
          rendu={(liste) => liste.map(carte)}
        />
      ) : (
        <CalendrierSemaine
          jours={jours}
          reglages={classe?.reglages}
          liste
          compte={(j) => (parJour.get(j) ?? []).filter((d) => !faits.includes(d.id)).length}
          rendu={(j) => {
            const l = parJour.get(j) ?? []
            return l.length ? l.map(carte) : <p className="text-sm text-brume">Rien à faire</p>
          }}
        />
      )}
    </div>
  )
}
