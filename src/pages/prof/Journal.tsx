import { CalendarDays, CalendarPlus, Maximize2, Printer, Sparkles } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AssistantIA, type DemandeIA } from '../../components/AssistantIA'
import { CalendrierSemaine } from '../../components/CalendrierSemaine'
import { CarteSeance } from '../../components/journal/CarteSeance'
import { Journee } from '../../components/journal/Journee'
import { imprimerCahierJournal } from '../../components/journal/impression'
import { remplirDepuisEdt, trierSeances } from '../../components/journal/outils'
import { Badge, BoutonIcone, Chargement, Entete, NavPas, useToast } from '../../components/ui'
import { useDevoirsDonnes, useRafraichir, useSeances } from '../../lib/donnees'
import { aujourdhui, decaler, estJourClasse, fmtJour, iso, jourClasseSuivant, joursSemaine, lundiDe, maj1, periodeDe, semaineDansPeriode } from '../../lib/dates'
import { useClasse } from '../../lib/session'
import type { Seance } from '../../lib/types'

const fmtCourtSansJour = (s: string) => format(parseISO(s), 'd MMM', { locale: fr })
const lundiCourant = () => iso(lundiDe(new Date(aujourdhui() + 'T12:00:00')))

export default function Journal() {
  const { date } = useParams()
  return date ? <VueJour date={date} /> : <VueSemaine />
}

function VueJour({ date }: { date: string }) {
  const classe = useClasse()
  const nav = useNavigate()
  const periode = periodeDe(date, classe.reglages)
  return (
    <Journee
      date={date}
      retour={<Link to={`/journal?semaine=${iso(lundiDe(new Date(date + 'T12:00:00')))}`} className="mb-1 inline-flex items-center gap-1 text-sm font-bold text-bateau" title="Semaine"><CalendarDays className="size-4" /></Link>}
      titre={maj1(fmtJour(date))}
      sousTitre={periode ? <Badge>{periode.id} · S{semaineDansPeriode(date, periode)}</Badge> : undefined}
      actions={<NavPas label="Jour" precedent={() => nav(`/journal/${jourClasseSuivant(date, classe.reglages, -1)}`)} suivant={() => nav(`/journal/${jourClasseSuivant(date, classe.reglages)}`)} auMilieu={() => nav(`/journal/${aujourdhui()}`)} />}
    />
  )
}

function VueSemaine() {
  const classe = useClasse()
  const toast = useToast()
  const nav = useNavigate()
  const rafraichir = useRafraichir()
  const params = new URLSearchParams(window.location.hash.split('?')[1] ?? '')
  const [lundi, setLundi] = useState(() => params.get('semaine') ?? lundiCourant())
  const jours = useMemo(() => joursSemaine(lundi, classe.reglages), [lundi, classe.reglages])
  const fin = decaler(lundi, 6)
  const seances = useSeances(lundi, fin)
  const devoirs = useDevoirsDonnes(lundi, fin)
  const [ia, setIa] = useState<DemandeIA | null>(null)
  const [remplissage, setRemplissage] = useState(false)
  const periode = periodeDe(jours.find((j) => periodeDe(j, classe.reglages)) ?? lundi, classe.reglages)

  const parJour = useMemo(() => {
    const m = new Map<string, Seance[]>()
    for (const j of jours) m.set(j, trierSeances((seances.data ?? []).filter((s) => s.date === j)))
    return m
  }, [seances.data, jours])

  async function remplirSemaine() {
    setRemplissage(true)
    let n = 0
    try {
      for (const j of jours) if (estJourClasse(j, classe.reglages)) n += await remplirDepuisEdt(classe, j, seances.data ?? [])
      rafraichir('seances')
      toast(n ? `${n} séances ajoutées` : 'Rien à ajouter')
    } catch (e) { toast((e as Error).message, 'erreur') } finally { setRemplissage(false) }
  }

  return (
    <>
      <Entete
        titre="Cahier journal"
        sousTitre={periode ? <Badge>{periode.id} · S{semaineDansPeriode(lundi, periode)}</Badge> : undefined}
        actions={<>
          <BoutonIcone icone={Sparkles} label="Remplir la semaine avec ChatGPT" variante="secondaire" onClick={() => setIa({ type: 'semaine', lundi })} />
          <BoutonIcone icone={CalendarPlus} label="Remplir depuis l'emploi du temps" variante="secondaire" onClick={remplirSemaine} disabled={remplissage} />
          <BoutonIcone icone={Printer} label="Imprimer la semaine" variante="secondaire" onClick={() => { if (!imprimerCahierJournal(classe, jours, seances.data ?? [], devoirs.data ?? [])) toast('Autorise les fenêtres pour imprimer', 'erreur') }} />
          <NavPas label={fmtCourtSansJour(lundi)} precedent={() => setLundi(decaler(lundi, -7))} suivant={() => setLundi(decaler(lundi, 7))} auMilieu={() => setLundi(lundiCourant())} />
        </>}
      />
      {seances.isLoading ? <Chargement /> : (
        <CalendrierSemaine
          jours={jours}
          reglages={classe.reglages}
          compte={(j) => parJour.get(j)?.length ?? 0}
          actionJour={(j) => <BoutonIcone icone={Maximize2} label="Ouvrir la journée" className="size-8" onClick={() => nav(`/journal/${j}`)} />}
          rendu={(j) => {
            const l = parJour.get(j) ?? []
            return l.length
              ? l.map((s) => <CarteSeance key={s.id} s={s} compacte onOuvrir={() => nav(`/journal/${j}`)} />)
              : <button type="button" onClick={() => nav(`/journal/${j}`)} className="rounded-2xl border-2 border-dashed border-trait py-6 text-brume" aria-label="Préparer la journée"><CalendarPlus className="mx-auto size-6" /></button>
          }}
        />
      )}
      <AssistantIA demande={ia} onFermer={() => setIa(null)} />
    </>
  )
}
