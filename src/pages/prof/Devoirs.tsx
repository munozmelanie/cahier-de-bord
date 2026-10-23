import { Plus } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useMemo, useState } from 'react'
import { CalendrierSemaine } from '../../components/CalendrierSemaine'
import { CarteDevoir } from '../../components/devoirs/CarteDevoir'
import { DevoirEditeur } from '../../components/devoirs/DevoirEditeur'
import { bornesMois, moisDe, MoisDevoirs, OPTIONS_VUE, useVueDevoirs } from '../../components/devoirs/MoisDevoirs'
import { Bouton, BoutonIcone, Chargement, Entete, NavPas, Onglets } from '../../components/ui'
import { useDevoirsDonnes, useDevoirsPour } from '../../lib/donnees'
import { aujourdhui, decaler, estJourClasse, iso, jourClasseSuivant, joursSemaine, lundiDe } from '../../lib/dates'
import { useClasse } from '../../lib/session'
import type { Devoir } from '../../lib/types'

const lundiCourant = () => iso(lundiDe(new Date(aujourdhui() + 'T12:00:00')))
const fmtCourt = (s: string) => format(parseISO(s), 'd MMM', { locale: fr })

/** Devoirs en calendrier : la semaine (« à faire pour » ou « donnés le ») ou le mois (à faire pour) */
export default function DevoirsProf() {
  const classe = useClasse()
  const [affichage, setAffichage] = useVueDevoirs()
  const [lundi, setLundi] = useState(lundiCourant)
  const [vue, setVue] = useState<'pour' | 'donne'>('pour')
  const [mois, setMois] = useState(() => moisDe(aujourdhui()))
  const [choisi, setChoisi] = useState(aujourdhui)
  const jours = useMemo(() => joursSemaine(lundi, classe.reglages), [lundi, classe.reglages])
  const fin = decaler(lundi, 6)
  const bornes = bornesMois(mois)
  const pour = useDevoirsPour(affichage === 'mois' ? bornes.debut : lundi, affichage === 'mois' ? bornes.fin : fin)
  const donnes = useDevoirsDonnes(lundi, fin)
  const q = affichage === 'mois' || vue === 'pour' ? pour : donnes
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

  /** Nouveau devoir à faire pour `jour` : donné aujourd'hui, ou le jour de classe d'avant s'il tombe plus tôt */
  const nouveauPour = (jour: string) => {
    const veille = jourClasseSuivant(jour, classe.reglages, -1)
    setEdition({ donne_le: jourDonne < jour ? jourDonne : veille, pour_le: jour })
  }

  return (
    <>
      <Entete titre="Devoirs" actions={<>
        <Onglets valeur={affichage} onChange={setAffichage} options={OPTIONS_VUE} />
        {affichage === 'semaine' && <>
          <Onglets valeur={vue} onChange={setVue} options={[{ id: 'pour', label: 'À faire' }, { id: 'donne', label: 'Donnés' }]} />
          <NavPas label={fmtCourt(lundi)} precedent={() => setLundi(decaler(lundi, -7))} suivant={() => setLundi(decaler(lundi, 7))} auMilieu={() => setLundi(lundiCourant())} />
        </>}
        <BoutonIcone icone={Plus} label="Nouveau devoir" variante="primaire" onClick={() => setEdition({ donne_le: jourDonne })} />
      </>} />
      {q.isLoading ? <Chargement /> : affichage === 'mois' ? (
        <MoisDevoirs
          mois={mois} onMois={setMois} devoirs={pour.data ?? []} reglages={classe.reglages}
          choisi={choisi} onChoisir={(j) => { setChoisi(j); if (moisDe(j) !== mois) setMois(moisDe(j)) }}
          action={(j) => <Bouton taille="s" variante="doux" icone={Plus} onClick={() => nouveauPour(j)}>Ajouter</Bouton>}
          rendu={(liste) => liste.map((d) => <CarteDevoir key={d.id} d={d} montrer="donne" statut onClick={() => setEdition(d)} />)}
        />
      ) : (
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
