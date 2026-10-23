// « Placer dans le cahier journal » : choisir un jour et un créneau, puis créer la séance
import clsx from 'clsx'
import { CalendarPlus, Check, CalendarDays, Sun } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useEffect, useMemo, useState } from 'react'
import { Bouton, Feuille, Saisie, useToast } from '../ui'
import { useEcrire, useEdt, useSeances } from '../../lib/donnees'
import { aujourdhui, estJourClasse, fmtHeure, fmtJour, jourClasseSuivant, numJour, periodeDe, vacancesDe } from '../../lib/dates'
import { matiere } from '../../lib/matieres'
import { useSession } from '../../lib/session'
import type { Seance } from '../../lib/types'

export type BaseSeance = {
  titre: string
  matiere: string | null
  objectif?: string | null
  deroule?: string | null
  materiel?: string | null
  progression_id?: string | null
  sequence_id?: string | null
  etape_id?: string | null
}

const sec = (h: string) => (h.length === 5 ? h + ':00' : h)
const jourCourt = (s: string) => format(parseISO(s), 'EEE', { locale: fr }).replace('.', '')

export function Placer({ base, onFermer, marquerEnCours }: {
  base: BaseSeance | null
  onFermer: () => void
  /** id de la progression à passer « en cours » une fois placée */
  marquerEnCours?: string | null
}) {
  const { classe } = useSession()
  const r = classe?.reglages
  const toast = useToast()
  const ecrire = useEcrire()
  const prochains = useMemo(() => {
    const a = aujourdhui()
    const l: string[] = []
    let d = estJourClasse(a, r) ? a : jourClasseSuivant(a, r)
    for (let i = 0; i < 8; i++) { l.push(d); d = jourClasseSuivant(d, r) }
    return l
  }, [r])
  const [date, setDate] = useState(prochains[0])
  const [choix, setChoix] = useState<string | null>(null)
  const [libreDate, setLibreDate] = useState(false)
  const [debutLibre, setDebutLibre] = useState('09:00')
  const [finLibre, setFinLibre] = useState('09:45')

  useEffect(() => { if (base) { setDate(prochains[0]); setChoix(null); setLibreDate(false) } }, [base, prochains])

  const periode = periodeDe(date, r)
  const edt = useEdt(periode?.id)
  const seances = useSeances(date, date)
  const creneaux = (edt.data ?? []).filter((c) => c.jour === numJour(date) && c.type === 'cours')
  const occupes = (debut: string) => (seances.data ?? []).filter((s) => s.debut?.slice(0, 5) === debut.slice(0, 5))
  const creneau = creneaux.find((c) => c.id === choix)
  const deja = creneau ? occupes(creneau.debut) : []
  const vac = vacancesDe(date, r)
  const ferme = !estJourClasse(date, r)

  async function placer(remplacer: boolean) {
    if (!classe || !base) return
    const debut = creneau ? creneau.debut : sec(debutLibre)
    const fin = creneau ? creneau.fin : sec(finLibre)
    const ecritures: any[] = []
    if (remplacer) for (const s of deja) ecritures.push({ op: 'delete', table: 'seances', id: s.id })
    const ligne: Partial<Seance> & Record<string, unknown> = {
      classe_id: classe.id, date, debut, fin, matiere: base.matiere, titre: base.titre,
      objectif: base.objectif ?? null, deroule: base.deroule ?? null, materiel: base.materiel ?? null,
      progression_id: base.progression_id ?? null, sequence_id: base.sequence_id ?? null, etape_id: base.etape_id ?? null,
    }
    ecritures.push({ op: 'insert', table: 'seances', ligne })
    if (marquerEnCours) ecritures.push({ op: 'update', table: 'progressions', id: marquerEnCours, patch: { statut: 'en_cours' } })
    try {
      await ecrire.mutateAsync(ecritures)
      toast(`Placé ${fmtJour(date)}`)
      onFermer()
    } catch (e) {
      toast((e as Error).message, 'erreur')
    }
  }

  const m = matiere(base?.matiere)
  const I = m.icone

  return (
    <Feuille
      ouverte={!!base}
      onFermer={onFermer}
      titre={<span className="inline-flex items-center gap-2"><CalendarPlus className="size-5 text-bateau" /> Placer</span>}
      pied={
        deja.length ? (
          <>
            <Bouton variante="secondaire" onClick={() => placer(false)} enCours={ecrire.isPending}>À côté</Bouton>
            <Bouton icone={CalendarPlus} onClick={() => placer(true)} enCours={ecrire.isPending}>Remplacer</Bouton>
          </>
        ) : (
          <Bouton icone={CalendarPlus} onClick={() => placer(false)} enCours={ecrire.isPending} disabled={ferme || (!creneau && creneaux.length > 0)}>
            Placer
          </Bouton>
        )
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 rounded-3xl p-3" style={{ background: m.fond }}>
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm" style={{ color: m.couleur }}><I className="size-6" /></span>
          <p className="min-w-0 flex-1 font-semibold leading-snug text-encre">{base?.titre}</p>
        </div>

        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Jour">
          {prochains.map((j) => (
            <button key={j} type="button" role="radio" aria-checked={!libreDate && date === j} onClick={() => { setLibreDate(false); setDate(j); setChoix(null) }}
              title={fmtJour(j)}
              className={clsx('flex w-12 flex-col items-center rounded-2xl py-1.5 leading-none transition', !libreDate && date === j ? 'bg-encre text-white' : 'bg-white text-encre shadow-sm')}>
              <span className="font-titre text-lg font-semibold">{format(parseISO(j), 'd')}</span>
              <span className="mt-0.5 text-[10px] font-semibold uppercase opacity-80">{jourCourt(j)}</span>
            </button>
          ))}
          <button type="button" onClick={() => setLibreDate(true)} aria-label="Autre date" title="Autre date"
            className={clsx('flex w-12 items-center justify-center rounded-2xl transition', libreDate ? 'bg-encre text-white' : 'bg-white text-brume shadow-sm')}>
            <CalendarDays className="size-5" />
          </button>
        </div>
        {libreDate && <Saisie type="date" value={date} onChange={(e) => { setDate(e.target.value); setChoix(null) }} aria-label="Jour" />}

        {ferme ? (
          <p className="flex items-center gap-2 rounded-2xl bg-ambre-clair px-4 py-3 font-semibold text-ambre-fonce">
            <Sun className="size-5" /> {vac ? vac.nom : 'Pas classe'}
          </p>
        ) : creneaux.length ? (
          <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Créneau">
            {creneaux.map((c) => {
              const pris = occupes(c.debut)
              const actif = choix === c.id
              const cm = matiere(c.matiere)
              const CI = cm.icone
              return (
                <button key={c.id} type="button" role="radio" aria-checked={actif} onClick={() => setChoix(c.id)}
                  className={clsx('relative flex items-center gap-2.5 rounded-2xl p-2 text-left transition', actif ? 'ring-[3px] ring-encre' : 'hover:brightness-95',
                    c.matiere !== base?.matiere && !actif && 'opacity-60')}
                  style={{ background: cm.fond }}>
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white" style={{ color: cm.couleur }}><CI className="size-5" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold tabular-nums" style={{ color: cm.couleur }}>{fmtHeure(c.debut)}</span>
                    <span className="block truncate text-sm font-semibold text-encre">{pris[0]?.titre || c.libelle || cm.court}</span>
                  </span>
                  {pris.length > 0 && <span className="size-2.5 shrink-0 rounded-full bg-ambre" title="Déjà rempli" />}
                  {actif && <Check className="size-5 shrink-0 text-encre" />}
                </button>
              )
            })}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Saisie type="time" value={debutLibre} onChange={(e) => setDebutLibre(e.target.value)} aria-label="Début" />
            <Saisie type="time" value={finLibre} onChange={(e) => setFinLibre(e.target.value)} aria-label="Fin" />
          </div>
        )}
      </div>
    </Feuille>
  )
}
