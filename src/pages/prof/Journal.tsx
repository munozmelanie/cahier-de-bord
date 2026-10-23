import clsx from 'clsx'
import { CalendarDays, CalendarPlus, Printer, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AssistantIA, type DemandeIA } from '../../components/AssistantIA'
import { Journee } from '../../components/journal/Journee'
import { imprimerCahierJournal } from '../../components/journal/impression'
import { remplirDepuisEdt, trierSeances } from '../../components/journal/outils'
import { Badge, Bouton, Chargement, Entete, NavPas, PastilleMatiere, useToast } from '../../components/ui'
import { useDevoirsDonnes, useRafraichir, useSeances } from '../../lib/donnees'
import {
  aujourdhui, decaler, estJourClasse, fmtHeure, fmtJour, fmtJourCourt, fmtJourSemaine, fmtNumero, iso, jourClasseSuivant,
  joursSemaine, lundiDe, maj1, periodeDe, semaineDansPeriode, vacancesDe,
} from '../../lib/dates'
import { useClasse } from '../../lib/session'
import type { Seance } from '../../lib/types'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'

const fmtCourtSansJour = (s: string) => format(parseISO(s), 'd MMM', { locale: fr })

export default function Journal() {
  const { date } = useParams()
  return date ? <VueJour date={date} /> : <VueSemaine />
}

function VueJour({ date }: { date: string }) {
  const classe = useClasse()
  const nav = useNavigate()
  const periode = periodeDe(date, classe.reglages)
  return (
    <>
      <Entete
        retour={<Link to={`/journal?semaine=${iso(lundiDe(new Date(date + 'T12:00:00')))}`} className="mb-1 inline-flex items-center gap-1 text-sm font-bold text-bateau"><CalendarDays className="size-4" /> Semaine</Link>}
        titre={maj1(fmtJour(date))}
        sousTitre={periode ? <Badge>{periode.id} · semaine {semaineDansPeriode(date, periode)}</Badge> : undefined}
        actions={<NavPas label="Jour" precedent={() => nav(`/journal/${jourClasseSuivant(date, classe.reglages, -1)}`)} suivant={() => nav(`/journal/${jourClasseSuivant(date, classe.reglages)}`)} auMilieu={() => nav(`/journal/${aujourdhui()}`)} />}
      />
      <Journee date={date} />
    </>
  )
}

function VueSemaine() {
  const classe = useClasse()
  const toast = useToast()
  const rafraichir = useRafraichir()
  const params = new URLSearchParams(window.location.hash.split('?')[1] ?? '')
  const [lundi, setLundi] = useState(() => params.get('semaine') ?? iso(lundiDe(new Date(aujourdhui() + 'T12:00:00'))))
  const jours = joursSemaine(lundi, classe.reglages)
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
        sousTitre={periode ? <Badge>{periode.id} · semaine {semaineDansPeriode(lundi, periode)}</Badge> : undefined}
        actions={<NavPas label={`Semaine du ${fmtCourtSansJour(lundi)}`} precedent={() => setLundi(decaler(lundi, -7))} suivant={() => setLundi(decaler(lundi, 7))} auMilieu={() => setLundi(iso(lundiDe(new Date(aujourdhui() + 'T12:00:00'))))} />}
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <Bouton taille="s" variante="secondaire" icone={CalendarPlus} onClick={remplirSemaine} enCours={remplissage}>Remplir depuis l'emploi du temps</Bouton>
        <Bouton taille="s" variante="secondaire" icone={Sparkles} onClick={() => setIa({ type: 'semaine', lundi })}>ChatGPT</Bouton>
        <Bouton taille="s" variante="secondaire" icone={Printer} onClick={() => { if (!imprimerCahierJournal(classe, jours, seances.data ?? [], devoirs.data ?? [])) toast('Autorise les fenêtres pour imprimer', 'erreur') }}>Imprimer</Bouton>
      </div>
      {seances.isLoading ? <Chargement /> : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {jours.map((j) => {
            const l = parJour.get(j) ?? []
            const vac = vacancesDe(j, classe.reglages)
            const classeCeJour = estJourClasse(j, classe.reglages)
            const nbDevoirs = (devoirs.data ?? []).filter((d) => d.donne_le === j).length
            return (
              <Link key={j} to={`/journal/${j}`} className={clsx('flex flex-col rounded-3xl bg-white p-4 shadow-doux transition hover:-translate-y-0.5', j === aujourdhui() && 'ring-2 ring-bateau')}>
                <div className="mb-3 flex items-baseline gap-2">
                  <span className="font-titre text-3xl font-semibold leading-none">{fmtNumero(j)}</span>
                  <span className="font-bold capitalize text-brume">{fmtJourSemaine(j)}</span>
                  {nbDevoirs > 0 && <span className="ml-auto"><Badge couleur="succes">{nbDevoirs} devoir{nbDevoirs > 1 ? 's' : ''}</Badge></span>}
                </div>
                {!classeCeJour ? (
                  <p className="rounded-2xl bg-ambre-clair px-3 py-2 text-sm font-bold text-ambre-fonce">{vac ? vac.nom : 'Pas classe'}</p>
                ) : l.length ? (
                  <ul className="flex flex-col gap-1.5">
                    {l.map((s) => (
                      <li key={s.id} className={clsx('flex items-center gap-2 text-sm', s.statut === 'non_faite' && 'text-brume line-through')}>
                        <span className="w-10 shrink-0 text-right text-xs font-bold tabular-nums text-brume">{fmtHeure(s.debut)}</span>
                        <PastilleMatiere id={s.matiere} taille="s" />
                        <span className="min-w-0 flex-1 truncate font-bold">{s.titre}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-brume">Vide</p>
                )}
              </Link>
            )
          })}
        </div>
      )}
      <AssistantIA demande={ia} onFermer={() => setIa(null)} />
    </>
  )
}
