import { Plus } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useMemo, useState } from 'react'
import { CalendrierSemaine } from '../../components/CalendrierSemaine'
import { CarteDevoir } from '../../components/devoirs/CarteDevoir'
import { DevoirEditeur } from '../../components/devoirs/DevoirEditeur'
import { BoutonIcone, Chargement, Entete, NavPas, Onglets } from '../../components/ui'
import { useDevoirsDonnes, useDevoirsPour } from '../../lib/donnees'
import { aujourdhui, decaler, estJourClasse, iso, jourClasseSuivant, joursSemaine, lundiDe } from '../../lib/dates'
import { useClasse } from '../../lib/session'
import type { Devoir } from '../../lib/types'

const lundiCourant = () => iso(lundiDe(new Date(aujourdhui() + 'T12:00:00')))
const fmtCourt = (s: string) => format(parseISO(s), 'd MMM', { locale: fr })

/** Devoirs en calendrier : « à faire pour » ou « donnés le » chaque jour de la semaine */
export default function DevoirsProf() {
  const classe = useClasse()
  const [lundi, setLundi] = useState(lundiCourant)
  const [vue, setVue] = useState<'pour' | 'donne'>('pour')
  const jours = useMemo(() => joursSemaine(lundi, classe.reglages), [lundi, classe.reglages])
  const fin = decaler(lundi, 6)
  const pour = useDevoirsPour(lundi, fin)
  const donnes = useDevoirsDonnes(lundi, fin)
  const q = vue === 'pour' ? pour : donnes
  const [edition, setEdition] = useState<(Partial<Devoir> & { donne_le: string }) | null>(null)
  const auj = aujourdhui()
  const jourDonne = estJourClasse(auj, classe.reglages) ? auj : jourClasseSuivant(auj, classe.reglages)

  const parJour = useMemo(() => {
    const m = new Map<string, Devoir[]>()
    for (const d of q.data ?? []) {
      const k = vue === 'pour' ? d.pour_le : d.donne_le
      m.set(k, [...(m.get(k) ?? []), d])
    }
    return m
  }, [q.data, vue])

  return (
    <>
      <Entete titre="Devoirs" actions={<>
        <Onglets valeur={vue} onChange={setVue} options={[{ id: 'pour', label: 'À faire' }, { id: 'donne', label: 'Donnés' }]} />
        <NavPas label={fmtCourt(lundi)} precedent={() => setLundi(decaler(lundi, -7))} suivant={() => setLundi(decaler(lundi, 7))} auMilieu={() => setLundi(lundiCourant())} />
        <BoutonIcone icone={Plus} label="Nouveau devoir" variante="primaire" onClick={() => setEdition({ donne_le: jourDonne })} />
      </>} />
      {q.isLoading ? <Chargement /> : (
        <CalendrierSemaine
          jours={jours}
          reglages={classe.reglages}
          compte={(j) => parJour.get(j)?.length ?? 0}
          actionJour={vue === 'donne' ? (j) => <BoutonIcone icone={Plus} label="Ajouter un devoir ce jour" className="size-8" onClick={() => setEdition({ donne_le: j })} /> : undefined}
          rendu={(j) => (parJour.get(j) ?? []).map((d) => (
            <CarteDevoir key={d.id} d={d} montrer={vue === 'pour' ? 'donne' : 'pour'} statut onClick={() => setEdition(d)} />
          ))}
        />
      )}
      <DevoirEditeur base={edition} onFermer={() => setEdition(null)} />
    </>
  )
}
