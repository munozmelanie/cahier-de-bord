import clsx from 'clsx'
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, parseISO, startOfMonth, startOfWeek } from 'date-fns'
import { fr } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useMemo, type ReactNode } from 'react'
import { aujourdhui, fmtJour, iso, maj1, numJour } from '../../lib/dates'
import type { Reglages } from '../../lib/types'
import { BoutonIcone } from '../ui'
import { CarteEvenement, couvre, TYPES_AGENDA, type ElementAgenda } from './agenda'

const LETTRES = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

/** `mois` au format AAAA-MM */
export const moisDe = (jour: string) => jour.slice(0, 7)
export const decalerMois = (mois: string, n: number) => format(addMonths(parseISO(mois + '-01'), n), 'yyyy-MM')

/**
 * Grille du mois (lundi → dimanche) : pastilles colorées par type, vacances teintées.
 * Un tap sur un jour affiche ses événements en cartes (à côté sur ordinateur, dessous sur téléphone).
 */
export function CalendrierMois({ mois, onMois, elements, reglages, choisi, onChoisir, onAjouter, onOuvrir, masque, extraEnTete, empile }: {
  mois: string; onMois: (m: string) => void; elements: ElementAgenda[]; reglages?: Reglages
  choisi: string; onChoisir: (jour: string) => void
  onAjouter?: (jour: string) => void; onOuvrir?: (e: ElementAgenda) => void; masque?: (e: ElementAgenda) => boolean
  extraEnTete?: ReactNode; empile?: boolean
}) {
  const auj = aujourdhui()
  const jours = useMemo(() => {
    const d = parseISO(mois + '-01')
    return eachDayOfInterval({ start: startOfWeek(startOfMonth(d), { weekStartsOn: 1 }), end: endOfWeek(endOfMonth(d), { weekStartsOn: 1 }) }).map(iso)
  }, [mois])
  const classe = reglages?.jours ?? [1, 2, 4, 5]

  const duJour = (j: string) => elements.filter((e) => e.type !== 'vacances' && couvre(e, j))
  const vacancesDuJour = (j: string) => elements.find((e) => e.type === 'vacances' && couvre(e, j))
  const elementsChoisi = elements.filter((e) => couvre(e, choisi))
    .sort((a, b) => (a.type === 'vacances' ? 1 : 0) - (b.type === 'vacances' ? 1 : 0))

  const grille = (
    <div className="rounded-[28px] bg-white p-3 shadow-doux sm:p-4">
      <div className="mb-3 flex items-center gap-2">
        <BoutonIcone icone={ChevronLeft} label="Mois précédent" onClick={() => onMois(decalerMois(mois, -1))} className="size-9" />
        <button type="button" onClick={() => { onMois(moisDe(auj)); onChoisir(auj) }} title="Revenir à aujourd'hui"
          className="flex-1 text-center font-titre text-2xl font-semibold text-encre">
          {maj1(format(parseISO(mois + '-01'), 'MMMM yyyy', { locale: fr }))}
        </button>
        <BoutonIcone icone={ChevronRight} label="Mois suivant" onClick={() => onMois(decalerMois(mois, 1))} className="size-9" />
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {LETTRES.map((l, i) => <span key={i} className="pb-1 text-xs font-bold text-brume">{l}</span>)}
        {jours.map((j) => {
          const dansMois = moisDe(j) === mois
          const evs = duJour(j)
          const vac = vacancesDuJour(j)
          const ferie = reglages?.feries?.includes(j)
          const sansClasse = !classe.includes(numJour(j))
          const estChoisi = j === choisi
          return (
            <button key={j} type="button" onClick={() => onChoisir(j)} aria-label={maj1(fmtJour(j))} aria-pressed={estChoisi}
              className={clsx('relative flex min-h-[3.25rem] flex-col items-center gap-1 rounded-2xl p-1 transition sm:min-h-[5.5rem] sm:items-stretch sm:p-1.5',
                !dansMois && 'opacity-35',
                estChoisi ? 'bg-encre text-white' : vac ? '' : sansClasse || ferie ? 'bg-papier' : 'hover:bg-papier',
                j === auj && !estChoisi && 'ring-2 ring-bateau')}
              style={vac && !estChoisi ? { background: TYPES_AGENDA.vacances.fond } : undefined}>
              <span className={clsx('font-titre text-base font-semibold leading-none sm:text-left', !estChoisi && (sansClasse || ferie) && 'text-brume')}>
                {format(parseISO(j), 'd')}
              </span>
              {/* Téléphone : des points */}
              <span className="flex flex-wrap justify-center gap-0.5 sm:hidden">
                {evs.slice(0, 3).map((e) => <span key={e.cle} className="size-1.5 rounded-full" style={{ background: estChoisi ? '#fff' : TYPES_AGENDA[e.type].couleur }} />)}
              </span>
              {/* Ordinateur : des pastilles avec icône */}
              <span className="hidden flex-col gap-0.5 sm:flex">
                {evs.slice(0, 2).map((e) => {
                  const t = TYPES_AGENDA[e.type]
                  const I = t.icone
                  return (
                    <span key={e.cle} className="flex items-center gap-1 truncate rounded-lg px-1 py-0.5 text-left text-[11px] font-bold"
                      style={{ background: estChoisi ? 'rgba(255,255,255,.15)' : t.fond, color: estChoisi ? '#fff' : t.couleur }}>
                      <I className="size-3 shrink-0" /><span className="truncate">{e.titre}</span>
                    </span>
                  )
                })}
                {evs.length > 2 && <span className="text-left text-[10px] font-bold opacity-70">+{evs.length - 2}</span>}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )

  const jour = (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="flex size-12 flex-col items-center justify-center rounded-2xl bg-encre leading-none text-white">
          <span className="font-titre text-xl font-semibold">{format(parseISO(choisi), 'd')}</span>
          <span className="text-[10px] font-bold uppercase">{format(parseISO(choisi), 'EEE', { locale: fr }).replace('.', '')}</span>
        </span>
        <span className="ml-auto flex gap-2">
          {extraEnTete}
          {onAjouter && <BoutonIcone icone={Plus} label="Ajouter ce jour-là" variante="primaire" onClick={() => onAjouter(choisi)} />}
        </span>
      </div>
      {elementsChoisi.length
        ? elementsChoisi.map((e) => (
          <CarteEvenement key={e.cle} e={e} masque={masque?.(e)} attenue={(e.fin ?? e.date) < auj}
            onClick={onOuvrir && e.ev ? () => onOuvrir(e) : undefined} />
        ))
        : <p className="py-6 text-center text-2xl text-trait">—</p>}
    </div>
  )

  return (
    <div className={clsx('grid gap-5', !empile && 'lg:grid-cols-[minmax(0,1fr)_320px]')}>
      <div className="min-w-0">{grille}</div>
      <div className="min-w-0">{jour}</div>
    </div>
  )
}
