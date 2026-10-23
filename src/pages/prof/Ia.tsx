import clsx from 'clsx'
import { CalendarDays, CalendarRange, GraduationCap, Sparkles, type LucideIcon } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useMemo, useState } from 'react'
import { AssistantIA, type DemandeIA } from '../../components/AssistantIA'
import { Bouton, Entete, Feuille, Saisie } from '../../components/ui'
import { aujourdhui, decaler, estJourClasse, fmtJour, iso, joursSemaine, jourClasseSuivant, lundiDe } from '../../lib/dates'
import { useClasse } from '../../lib/session'

function Tuile({ icone: Icone, titre, detail, couleur, fond, onClick }: { icone: LucideIcon; titre: string; detail?: string; couleur: string; fond: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex aspect-[4/3] flex-col justify-between rounded-[28px] p-5 text-left transition hover:-translate-y-0.5 hover:shadow-flotte sm:aspect-square"
      style={{ background: fond }}>
      <span className="flex size-14 items-center justify-center rounded-3xl bg-white shadow-sm" style={{ color: couleur }}>
        <Icone className="size-7" />
      </span>
      <span>
        <span className="block font-titre text-xl font-semibold leading-tight text-encre">{titre}</span>
        {detail && <span className="mt-0.5 block text-sm font-bold" style={{ color: couleur }}>{detail}</span>}
      </span>
    </button>
  )
}

const jourCourt = (s: string) => format(parseISO(s), 'EEE', { locale: fr }).replace('.', '')

export default function Ia() {
  const classe = useClasse()
  const r = classe.reglages
  const [demande, setDemande] = useState<DemandeIA | null>(null)
  const [choixJour, setChoixJour] = useState(false)
  const [choixBilan, setChoixBilan] = useState(false)
  const auj = aujourdhui()
  const [jour, setJour] = useState(estJourClasse(auj, r) ? auj : jourClasseSuivant(auj, r))
  const [libre, setLibre] = useState(false)
  const bilans = r.lsu?.bilans ?? []

  // Semaine en cours ; pendant les vacances ou le week-end sans classe, la prochaine semaine de classe
  let lundi = iso(lundiDe(new Date(auj + 'T12:00:00')))
  if (!joursSemaine(lundi, r).some((j) => j >= auj && estJourClasse(j, r))) {
    lundi = iso(lundiDe(new Date(jourClasseSuivant(auj, r) + 'T12:00:00')))
  }
  const lundiSuivant = decaler(lundi, 7)
  const prochains = useMemo(() => {
    const l: string[] = []
    let d = estJourClasse(auj, r) ? auj : jourClasseSuivant(auj, r)
    for (let i = 0; i < 8; i++) { l.push(d); d = jourClasseSuivant(d, r) }
    return l
  }, [auj, r])
  const court = (s: string) => format(parseISO(s), 'd MMM', { locale: fr })

  return (
    <div className="max-w-3xl">
      <Entete titre={<span className="inline-flex items-center gap-3"><Sparkles className="size-8 text-bateau" /> ChatGPT</span>} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tuile icone={CalendarRange} titre="Semaine" detail={court(lundi)} couleur="#2E5BFF" fond="#E6ECFF"
          onClick={() => setDemande({ type: 'semaine', lundi })} />
        <Tuile icone={CalendarRange} titre="Suivante" detail={court(lundiSuivant)} couleur="#7B4DFF" fond="#EEE8FF"
          onClick={() => setDemande({ type: 'semaine', lundi: lundiSuivant })} />
        <Tuile icone={CalendarDays} titre="Journée" couleur="#F2711C" fond="#FFEEDF" onClick={() => setChoixJour(true)} />
        <Tuile icone={GraduationCap} titre="Livret" couleur="#13A35B" fond="#E1F6EA" onClick={() => bilans.length === 1 ? setDemande({ type: 'appreciations', bilan: bilans[0].id, eleveIds: [] }) : setChoixBilan(true)} />
      </div>

      <Feuille ouverte={choixJour} onFermer={() => setChoixJour(false)} titre={<CalendarDays className="size-5 text-[#F2711C]" />}
        pied={<Bouton icone={Sparkles} disabled={!estJourClasse(jour, r)} onClick={() => { setChoixJour(false); setDemande({ type: 'journee', date: jour }) }}>Préparer</Bouton>}>
        <div className="flex flex-wrap gap-2">
          {prochains.map((j) => (
            <button key={j} type="button" onClick={() => { setLibre(false); setJour(j) }} title={fmtJour(j)}
              className={clsx('flex w-14 flex-col items-center rounded-2xl py-2 leading-none transition', !libre && jour === j ? 'bg-encre text-white' : 'bg-white text-encre shadow-sm')}>
              <span className="font-titre text-xl font-semibold">{format(parseISO(j), 'd')}</span>
              <span className="mt-0.5 text-[10px] font-bold uppercase opacity-80">{jourCourt(j)}</span>
            </button>
          ))}
          <button type="button" onClick={() => setLibre(true)} aria-label="Autre date" title="Autre date"
            className={clsx('flex w-14 items-center justify-center rounded-2xl transition', libre ? 'bg-encre text-white' : 'bg-white text-brume shadow-sm')}>
            <CalendarDays className="size-5" />
          </button>
        </div>
        {libre && <Saisie className="mt-3" type="date" value={jour} onChange={(e) => setJour(e.target.value)} aria-label="Jour" />}
        {!estJourClasse(jour, r) && <p className="mt-3 text-sm font-bold text-ambre-fonce">Pas classe</p>}
      </Feuille>

      <Feuille ouverte={choixBilan} onFermer={() => setChoixBilan(false)} titre={<GraduationCap className="size-5 text-[#13A35B]" />}>
        <div className="grid gap-2 sm:grid-cols-3">
          {bilans.map((b) => (
            <button key={b.id} type="button" onClick={() => { setChoixBilan(false); setDemande({ type: 'appreciations', bilan: b.id, eleveIds: [] }) }}
              className={clsx('flex flex-col gap-1 rounded-3xl bg-[#E1F6EA] p-4 text-left transition hover:-translate-y-0.5', b.debut <= auj && auj <= b.fin && 'ring-[3px] ring-[#13A35B]')}>
              <span className="font-titre text-2xl font-semibold text-[#13A35B]">{b.id}</span>
              <span className="text-sm font-bold text-encre">{b.nom}</span>
            </button>
          ))}
        </div>
      </Feuille>

      <AssistantIA demande={demande} onFermer={() => setDemande(null)} />
    </div>
  )
}
