import clsx from 'clsx'
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, parseISO, startOfMonth, startOfWeek } from 'date-fns'
import { fr } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useMemo, type ReactNode } from 'react'
import { aujourdhui, fmtJour, iso, maj1, numJour } from '../../lib/dates'
import type { Reglages } from '../../lib/types'
import { Bouton, BoutonIcone } from '../ui'
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
    <div className="rounded-3xl bg-white p-3 shadow-doux sm:p-4">
      <div className="mb-3 flex items-center gap-2">
        <BoutonIcone icone={ChevronLeft} label="Mois précédent" onClick={() => onMois(decalerMois(mois, -1))} className="size-9" />
        <button type="button" onClick={() => { onMois(moisDe(auj)); onChoisir(auj) }} title="Revenir à aujourd'hui"
          className="flex-1 text-center text-xl font-bold text-encre">
          {maj1(format(parseISO(mois + '-01'), 'MMMM yyyy', { locale: fr }))}
        </button>
        <BoutonIcone icone={ChevronRight} label="Mois suivant" onClick={() => onMois(decalerMois(mois, 1))} className="size-9" />
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {LETTRES.map((l, i) => <span key={i} className="pb-1 text-xs font-semibold text-brume">{l}</span>)}
        {jours.map((j) => {
          const dansMois = moisDe(j) === mois
          const evs = duJour(j)
          const vac = vacancesDuJour(j)
          const ferie = reglages?.feries?.includes(j)
          const sansClasse = !classe.includes(numJour(j))
          const estChoisi = j === choisi
          return (
            <button key={j} type="button" onClick={() => onChoisir(j)} aria-label={maj1(fmtJour(j))} aria-pressed={estChoisi}
              className={clsx('relative flex min-h-[3.25rem] flex-col items-center gap-1 rounded-xl p-1 transition sm:min-h-[5.5rem] sm:items-stretch sm:p-1.5',
                !dansMois && 'opacity-35',
                estChoisi ? 'bg-bateau-clair ring-1 ring-bateau/30' : vac ? '' : 'hover:bg-papier')}
              style={vac && !estChoisi ? { background: '#F1FAF5' } : undefined}>
              <span className={clsx('flex size-6 items-center justify-center rounded-full text-sm font-semibold leading-none sm:-ml-0.5',
                j === auj ? 'bg-bateau text-white' : (sansClasse || ferie) ? 'text-brume' : 'text-encre')}>
                {format(parseISO(j), 'd')}
              </span>
              {/* Téléphone : des points */}
              <span className="flex flex-wrap justify-center gap-0.5 sm:hidden">
                {evs.slice(0, 3).map((e) => <span key={e.cle} className="size-1.5 rounded-full" style={{ background: TYPES_AGENDA[e.type].couleur }} />)}
              </span>
              {/* Ordinateur : des pastilles avec icône */}
              <span className="hidden flex-col gap-0.5 sm:flex">
                {evs.slice(0, 2).map((e) => {
                  const t = TYPES_AGENDA[e.type]
                  const I = t.icone
                  return (
                    <span key={e.cle} className="flex items-center gap-1 truncate rounded-md px-1 py-0.5 text-left text-[11px] font-medium text-encre"
                      style={{ background: t.fond }}>
                      <I className="size-3 shrink-0" style={{ color: t.couleur }} /><span className="truncate">{e.titre}</span>
                    </span>
                  )
                })}
                {evs.length > 2 && <span className="text-left text-[10px] font-semibold opacity-70">+{evs.length - 2}</span>}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )

  const jour = (
    <div className="flex flex-col gap-2 rounded-3xl bg-white p-4 shadow-doux">
      <div className="mb-1 flex items-center gap-2">
        <h2 className="text-[15px] font-semibold text-encre">{maj1(fmtJour(choisi))}</h2>
        <span className="ml-auto flex gap-2">
          {extraEnTete}
          {onAjouter && <Bouton taille="s" variante="doux" icone={Plus} onClick={() => onAjouter(choisi)}>Ajouter</Bouton>}
        </span>
      </div>
      {elementsChoisi.length
        ? elementsChoisi.map((e) => (
          <CarteEvenement key={e.cle} e={e} masque={masque?.(e)} attenue={(e.fin ?? e.date) < auj}
            onClick={onOuvrir && e.ev ? () => onOuvrir(e) : undefined} />
        ))
        : <p className="text-sm text-brume">Rien ce jour-là.</p>}
    </div>
  )

  return (
    <div className={clsx('grid gap-5', !empile && 'lg:grid-cols-[minmax(0,1fr)_320px]')}>
      <div className="min-w-0">{grille}</div>
      <div className="min-w-0">{jour}</div>
    </div>
  )
}
