import clsx from 'clsx'
import { CalendarDays, CalendarRange, GraduationCap, Sparkles, type LucideIcon } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useMemo, useState } from 'react'
import { AssistantIA, type DemandeIA } from '../../components/AssistantIA'
import { bilansDe } from '../../components/lsu/outils'
import { Bouton, Entete, Feuille, Saisie } from '../../components/ui'
import { aujourdhui, decaler, estJourClasse, fmtJour, iso, joursSemaine, jourClasseSuivant, lundiDe } from '../../lib/dates'
import { useClasse } from '../../lib/session'

function Tuile({ icone: Icone, titre, detail, couleur, fond, onClick }: { icone: LucideIcon; titre: string; detail: string; couleur: string; fond: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-start gap-3 rounded-3xl bg-white p-4 text-left shadow-doux transition hover:bg-[#FBFBFC]">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl" style={{ background: fond, color: couleur }}>
        <Icone className="size-5" />
      </span>
      <span className="min-w-0 pt-0.5">
        <span className="block font-semibold leading-tight text-encre">{titre}</span>
        <span className="mt-1 block text-sm text-brume">{detail}</span>
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
  const bilans = bilansDe(r)

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
      <Entete titre="Assistant IA" sousTitre="Remplir le cahier ou les livrets avec ChatGPT ou Claude" />

      <div className="grid gap-3 sm:grid-cols-2">
        <Tuile icone={CalendarRange} titre="Cette semaine" detail={`Remplir le cahier journal du ${court(lundi)}`} couleur="#3358E0" fond="#ECF0FF"
          onClick={() => setDemande({ type: 'semaine', lundi })} />
        <Tuile icone={CalendarRange} titre="Semaine prochaine" detail={`Préparer la semaine du ${court(lundiSuivant)}`} couleur="#7B4DFF" fond="#F3EFFF"
          onClick={() => setDemande({ type: 'semaine', lundi: lundiSuivant })} />
        <Tuile icone={CalendarDays} titre="Une journée" detail="Préparer un seul jour de classe" couleur="#F2711C" fond="#FEF2EB" onClick={() => setChoixJour(true)} />
        <Tuile icone={GraduationCap} titre="Appréciations du livret" detail="Rédiger les appréciations de la période" couleur="#13A35B" fond="#EAF7F0"
          onClick={() => bilans.length === 1 ? setDemande({ type: 'appreciations', bilan: bilans[0].id, eleveIds: [] }) : setChoixBilan(true)} />
      </div>

      <Feuille ouverte={choixJour} onFermer={() => setChoixJour(false)} titre="Préparer une journée"
        pied={<Bouton icone={Sparkles} disabled={!estJourClasse(jour, r)} onClick={() => { setChoixJour(false); setDemande({ type: 'journee', date: jour }) }}>Préparer</Bouton>}>
        <div className="flex flex-wrap gap-2">
          {prochains.map((j) => (
            <button key={j} type="button" onClick={() => { setLibre(false); setJour(j) }} title={fmtJour(j)}
              className={clsx('flex w-14 flex-col items-center rounded-xl py-2 leading-none transition', !libre && jour === j ? 'bg-encre text-white' : 'bg-papier text-encre hover:bg-encre/[.06]')}>
              <span className="text-lg font-bold">{format(parseISO(j), 'd')}</span>
              <span className="mt-0.5 text-[11px] font-medium opacity-80">{jourCourt(j)}</span>
            </button>
          ))}
          <button type="button" onClick={() => setLibre(true)} aria-label="Autre date" title="Autre date"
            className={clsx('flex w-14 items-center justify-center rounded-xl transition', libre ? 'bg-encre text-white' : 'bg-papier text-brume hover:bg-encre/[.06]')}>
            <CalendarDays className="size-5" />
          </button>
        </div>
        {libre && <Saisie className="mt-3" type="date" value={jour} onChange={(e) => setJour(e.target.value)} aria-label="Jour" />}
        {!estJourClasse(jour, r) && <p className="mt-3 text-sm font-semibold text-ambre-fonce">Pas de classe ce jour-là</p>}
      </Feuille>

      <Feuille ouverte={choixBilan} onFermer={() => setChoixBilan(false)} titre="Appréciations du livret">
        <div className="grid gap-2 sm:grid-cols-3">
          {bilans.map((b) => (
            <button key={b.id} type="button" onClick={() => { setChoixBilan(false); setDemande({ type: 'appreciations', bilan: b.id, eleveIds: [] }) }}
              className={clsx('flex flex-col gap-0.5 rounded-2xl bg-papier p-4 text-left transition hover:bg-encre/[.06]', b.debut <= auj && auj <= b.fin && 'ring-2 ring-succes')}>
              <span className="text-lg font-bold text-encre">{b.id}</span>
              <span className="text-sm text-brume">{b.nom}</span>
            </button>
          ))}
        </div>
      </Feuille>

      <AssistantIA demande={demande} onFermer={() => setDemande(null)} />
    </div>
  )
}
