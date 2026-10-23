import clsx from 'clsx'
import { Check, Clock, Eye } from 'lucide-react'
import { fmtJourCourt } from '../../lib/dates'
import { matiere } from '../../lib/matieres'
import type { Devoir } from '../../lib/types'
import { typeDevoir } from './devoirsOutils'

/** Un devoir en carte colorée (couleur de la matière) */
export function CarteDevoir({ d, montrer = 'rien', onClick, statut, fait, onFait }: {
  d: Devoir; montrer?: 'pour' | 'donne' | 'rien'; onClick?: () => void; statut?: boolean; fait?: boolean; onFait?: () => void
}) {
  const m = matiere(d.matiere)
  const Icone = m.icone
  const t = typeDevoir(d.type)
  const TypeIcone = t.icone
  const evaluation = d.type === 'evaluation'
  const Corps = onClick ? 'button' : 'div'
  return (
    <div className={clsx('flex items-center gap-2.5 rounded-2xl p-2', evaluation && 'ring-2 ring-alerte', fait && 'opacity-50')} style={{ background: m.fond }}>
      <Corps type={onClick ? 'button' : undefined} onClick={onClick} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm" style={{ color: m.couleur }} title={m.nom}>
          <Icone className="size-5" strokeWidth={2.2} />
        </span>
        <span className="min-w-0 flex-1">
          <span className={clsx('line-clamp-3 text-sm font-bold leading-snug', evaluation ? 'text-alerte' : 'text-encre', fait && 'line-through')}>{d.texte}</span>
          {montrer !== 'rien' && (
            <span className="mt-0.5 block text-[11px] font-bold" style={{ color: m.couleur }}>
              {montrer === 'pour' ? `→ ${fmtJourCourt(d.pour_le)}` : `${fmtJourCourt(d.donne_le)} →`}
            </span>
          )}
        </span>
        {d.type !== 'travail' && <TypeIcone className="size-4 shrink-0" style={{ color: t.couleur }} aria-label={t.label} />}
        {statut && (d.publie
          ? <Eye className="size-4 shrink-0 text-succes" aria-label="Visible des familles" />
          : <Clock className="size-4 shrink-0 text-ambre-fonce" aria-label="Publié en fin de journée" />)}
      </Corps>
      {onFait && (
        <button type="button" onClick={onFait} aria-pressed={fait} aria-label={fait ? 'Pas fait' : 'Fait'}
          className={clsx('flex size-8 shrink-0 items-center justify-center rounded-full transition', fait ? 'bg-succes text-white' : 'bg-white text-trait hover:text-succes')}>
          <Check className="size-5" strokeWidth={3} />
        </button>
      )}
    </div>
  )
}
