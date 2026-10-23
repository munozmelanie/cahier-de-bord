import clsx from 'clsx'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import { aujourdhui, fmtNumero, minutes, numJour, vacancesDe } from '../../lib/dates'
import { matiere } from '../../lib/matieres'
import type { Creneau, Reglages, Seance } from '../../lib/types'

const PX = 1.35
const jourCourt = (s: string) => format(parseISO(s), 'EEE', { locale: fr }).replace('.', '')

/** Semaine sur un axe horaire commun : heures à gauche, une colonne par jour (comme l'emploi du temps) */
export function SemaineHoraire({ jours, seances, pauses, reglages, onJour }: {
  jours: string[]; seances: Seance[]; pauses: Creneau[]; reglages?: Reglages; onJour: (date: string) => void
}) {
  const auj = aujourdhui()
  const avecHeure = seances.filter((s) => s.debut && s.fin && minutes(s.fin) > minutes(s.debut))
  const bornes = [...avecHeure.flatMap((s) => [minutes(s.debut), minutes(s.fin)]), ...pauses.flatMap((p) => [minutes(p.debut), minutes(p.fin)])]
  const debut = Math.floor((bornes.length ? Math.min(...bornes) : 8 * 60 + 30) / 60) * 60
  const fin = Math.ceil((bornes.length ? Math.max(...bornes) : 16 * 60 + 30) / 60) * 60
  const y = (m: number) => (m - debut) * PX
  const heures: number[] = []
  for (let h = debut; h <= fin; h += 60) heures.push(h)

  return (
    <div className="overflow-x-auto rounded-3xl bg-white p-3 shadow-doux">
      <div className="grid min-w-[680px]" style={{ gridTemplateColumns: `3rem repeat(${jours.length}, minmax(0, 1fr))` }}>
        <div />
        {jours.map((j) => (
          <button key={j} type="button" onClick={() => onJour(j)} className="mb-2 flex items-center justify-center gap-2 rounded-2xl py-1.5 hover:bg-papier">
            <span className={clsx('flex size-10 flex-col items-center justify-center rounded-2xl leading-none', j === auj ? 'bg-bateau text-white' : 'bg-papier text-encre')}>
              <span className="text-base font-bold">{fmtNumero(j)}</span>
              <span className="text-[11px] font-medium">{jourCourt(j)}</span>
            </span>
          </button>
        ))}
        <div className="relative" style={{ height: y(fin) }}>
          {heures.map((h) => <span key={h} className="absolute right-2 -translate-y-1/2 text-xs font-medium tabular-nums text-brume" style={{ top: y(h) }}>{h / 60}h</span>)}
        </div>
        {jours.map((j) => {
          const vac = vacancesDe(j, reglages)
          const duJour = avecHeure.filter((s) => s.date === j)
          return (
            <div key={j} className="relative border-l border-trait" style={{ height: y(fin) }}>
              {heures.map((h) => <div key={h} className="absolute inset-x-0 border-t border-trait/70" style={{ top: y(h) }} />)}
              {vac ? (
                <div className="absolute inset-1 flex items-center justify-center rounded-xl bg-ambre-clair text-center text-sm font-medium text-ambre-fonce">{vac.nom}</div>
              ) : (
                <>
                  {pauses.filter((p) => p.jour === numJour(j)).map((p) => (
                    <div key={p.id} className="absolute inset-x-1 rounded-md bg-encre/[.035]" style={{ top: y(minutes(p.debut)) + 1, height: Math.max(y(minutes(p.fin)) - y(minutes(p.debut)) - 2, 3) }} />
                  ))}
                  {duJour.map((s) => {
                    const m = matiere(s.matiere)
                    const Icone = m.icone
                    const h = y(minutes(s.fin)) - y(minutes(s.debut)) - 3
                    return (
                      <button key={s.id} type="button" onClick={() => onJour(j)} title={s.titre}
                        className={clsx('absolute inset-x-1 flex items-center gap-1.5 overflow-hidden rounded-lg border-l-[3px] px-1.5 text-left transition hover:brightness-[.98]', s.statut === 'non_faite' && 'opacity-50')}
                        style={{ top: y(minutes(s.debut)) + 1.5, height: h, background: m.fond, color: m.couleur, borderLeftColor: m.couleur }}>
                        {h >= 18 && <Icone className="size-3.5 shrink-0" strokeWidth={2.2} />}
                        {h >= 12 && <span className={clsx('min-w-0 font-semibold leading-tight text-encre', h >= 34 ? 'line-clamp-2 text-xs' : 'truncate text-[11px]', s.statut === 'non_faite' && 'line-through')}>{s.titre || m.court}</span>}
                      </button>
                    )
                  })}
                  {!duJour.length && (
                    <button type="button" onClick={() => onJour(j)} aria-label="Préparer la journée" className="absolute inset-1 rounded-xl border border-dashed border-trait hover:bg-papier" />
                  )}
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
