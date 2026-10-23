import clsx from 'clsx'
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, parseISO, startOfMonth, startOfWeek } from 'date-fns'
import { fr } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { aujourdhui, estJourClasse, fmtJour, iso, maj1, vacancesDe } from '../../lib/dates'
import { matiere } from '../../lib/matieres'
import type { Devoir, Reglages } from '../../lib/types'
import { BoutonIcone } from '../ui'

const LETTRES = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

/** `mois` au format AAAA-MM */
export const moisDe = (jour: string) => jour.slice(0, 7)
const decalerMois = (mois: string, n: number) => format(addMonths(parseISO(mois + '-01'), n), 'yyyy-MM')

/** Premier et dernier jour affichés dans la grille du mois (semaines complètes) */
export function bornesMois(mois: string) {
  const d = parseISO(mois + '-01')
  return {
    debut: iso(startOfWeek(startOfMonth(d), { weekStartsOn: 1 })),
    fin: iso(endOfWeek(endOfMonth(d), { weekStartsOn: 1 })),
  }
}

/**
 * Devoirs du mois en grille (lundi → dimanche), rangés au jour où il faut les faire.
 * Un clic sur un jour affiche ses devoirs à côté (ordinateur) ou dessous (téléphone, familles).
 */
export function MoisDevoirs({ mois, onMois, devoirs, reglages, choisi, onChoisir, rendu, action, empile }: {
  mois: string; onMois: (m: string) => void; devoirs: Devoir[]; reglages?: Reglages
  choisi: string; onChoisir: (jour: string) => void
  /** Contenu du panneau pour les devoirs du jour choisi */
  rendu: (liste: Devoir[], jour: string) => ReactNode
  /** Bouton dans l'en-tête du panneau (enseignante) */
  action?: (jour: string) => ReactNode
  /** Vue étroite (familles) : grille compacte avec des points, panneau du jour dessous */
  empile?: boolean
}) {
  const auj = aujourdhui()
  const jours = useMemo(() => {
    const d = parseISO(mois + '-01')
    return eachDayOfInterval({ start: startOfWeek(startOfMonth(d), { weekStartsOn: 1 }), end: endOfWeek(endOfMonth(d), { weekStartsOn: 1 }) }).map(iso)
  }, [mois])
  const parJour = useMemo(() => {
    const m = new Map<string, Devoir[]>()
    for (const d of devoirs) m.set(d.pour_le, [...(m.get(d.pour_le) ?? []), d])
    return m
  }, [devoirs])
  const duChoisi = parJour.get(choisi) ?? []

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
          const liste = parJour.get(j) ?? []
          const vac = vacancesDe(j, reglages)
          const sansClasse = !estJourClasse(j, reglages)
          const estChoisi = j === choisi
          return (
            <button key={j} type="button" onClick={() => onChoisir(j)} aria-pressed={estChoisi}
              aria-label={`${maj1(fmtJour(j))}${liste.length ? `, ${liste.length} devoir${liste.length > 1 ? 's' : ''}` : ''}`}
              className={clsx('relative flex min-h-[3.25rem] min-w-0 flex-col items-center gap-1 rounded-xl p-1 transition', !empile && 'sm:min-h-[5.5rem] sm:items-stretch sm:p-1.5',
                !dansMois && 'opacity-35',
                estChoisi ? 'bg-bateau-clair ring-1 ring-bateau/30' : vac ? '' : 'hover:bg-papier')}
              style={vac && !estChoisi ? { background: '#F1FAF5' } : undefined}>
              <span className={clsx('flex size-6 items-center justify-center rounded-full text-sm font-semibold leading-none', !empile && 'sm:-ml-0.5',
                j === auj ? 'bg-bateau text-white' : sansClasse ? 'text-brume' : 'text-encre')}>
                {format(parseISO(j), 'd')}
              </span>
              {/* Téléphone (et vue étroite des familles) : des points */}
              <span className={clsx('flex flex-wrap justify-center gap-0.5', !empile && 'sm:hidden')}>
                {liste.slice(0, 4).map((d) => (
                  <span key={d.id} className="size-1.5 rounded-full" style={{ background: d.type === 'evaluation' ? '#E5484D' : matiere(d.matiere).couleur }} />
                ))}
              </span>
              {/* Ordinateur : des pastilles avec le début du texte */}
              {!empile && <span className="hidden min-w-0 flex-col gap-0.5 sm:flex">
                {liste.slice(0, 2).map((d) => {
                  const evaluation = d.type === 'evaluation'
                  return (
                    <span key={d.id} className={clsx('flex min-w-0 items-center gap-1 rounded-md px-1 py-0.5 text-left text-[11px] font-medium',
                      evaluation ? 'bg-alerte-clair text-alerte' : 'bg-papier text-encre')}>
                      <span className="size-1.5 shrink-0 rounded-full" style={{ background: evaluation ? '#E5484D' : matiere(d.matiere).couleur }} />
                      <span className="truncate">{d.texte}</span>
                    </span>
                  )
                })}
                {liste.length > 2 && <span className="text-left text-[10px] font-semibold text-brume">+{liste.length - 2}</span>}
              </span>}
            </button>
          )
        })}
      </div>
    </div>
  )

  const panneau = (
    <div className="flex flex-col gap-2 rounded-3xl bg-white p-4 shadow-doux">
      <div className="mb-1 flex items-center gap-2">
        <h2 className="text-[15px] font-semibold text-encre">{maj1(fmtJour(choisi))}</h2>
        {duChoisi.length > 0 && <span className="rounded-full bg-encre/[.06] px-2 text-xs font-semibold leading-5 text-brume">{duChoisi.length}</span>}
        {action && <span className="ml-auto">{action(choisi)}</span>}
      </div>
      {duChoisi.length ? rendu(duChoisi, choisi) : <p className="text-sm text-brume">Rien pour ce jour-là.</p>}
    </div>
  )

  return (
    <div className={clsx('grid gap-5', !empile && 'lg:grid-cols-[minmax(0,1fr)_320px]')}>
      <div className="min-w-0">{grille}</div>
      <div className="min-w-0">{panneau}</div>
    </div>
  )
}

export type VueDevoirs = 'semaine' | 'mois'
const CLE_VUE = 'cdb-devoirs-vue'

/** Semaine ou mois, retenu sur cet appareil */
export function useVueDevoirs(): [VueDevoirs, (v: VueDevoirs) => void] {
  const [vue, setVue] = useState<VueDevoirs>(() => {
    try { return localStorage.getItem(CLE_VUE) === 'mois' ? 'mois' : 'semaine' } catch { return 'semaine' }
  })
  const changer = (v: VueDevoirs) => {
    setVue(v)
    try { localStorage.setItem(CLE_VUE, v) } catch { /* rien */ }
  }
  return [vue, changer]
}

export const OPTIONS_VUE: { id: VueDevoirs; label: string }[] = [{ id: 'semaine', label: 'Semaine' }, { id: 'mois', label: 'Mois' }]
