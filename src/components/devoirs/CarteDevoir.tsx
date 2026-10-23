import clsx from 'clsx'
import { Check, Clock, Eye } from 'lucide-react'
import { fmtJourCourt } from '../../lib/dates'
import { matiere } from '../../lib/matieres'
import type { Devoir } from '../../lib/types'
import { typeDevoir } from './devoirsOutils'

/** Un devoir : liseré de la couleur de la matière, texte, date discrète */
export function CarteDevoir({ d, montrer = 'rien', onClick, statut, fait, onFait }: {
  d: Devoir; montrer?: 'pour' | 'donne' | 'rien'; onClick?: () => void; statut?: boolean; fait?: boolean; onFait?: () => void
}) {
  const m = matiere(d.matiere)
  const Icone = m.icone
  const t = typeDevoir(d.type)
  const evaluation = d.type === 'evaluation'
  const Corps = onClick ? 'button' : 'div'
  return (
    <div className={clsx('flex items-center gap-2 rounded-xl border-l-[3px] py-2 pl-2.5 pr-2', fait && 'opacity-50')}
      style={{ background: m.fond, borderLeftColor: m.couleur }}>
      <Corps type={onClick ? 'button' : undefined} onClick={onClick} className="flex min-w-0 flex-1 items-start gap-2 text-left">
        <Icone className="mt-0.5 size-4 shrink-0" strokeWidth={2.2} style={{ color: m.couleur }} aria-label={m.nom} />
        <span className="min-w-0 flex-1">
          <span className={clsx('line-clamp-3 text-sm font-medium leading-snug text-encre', fait && 'line-through')}>{d.texte}</span>
          {(montrer !== 'rien' || evaluation || d.type !== 'travail') && (
            <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-brume">
              {evaluation && <span className="font-semibold text-alerte">Évaluation</span>}
              {!evaluation && d.type !== 'travail' && <span>{t.label}</span>}
              {montrer === 'pour' && <span>pour {fmtJourCourt(d.pour_le)}</span>}
              {montrer === 'donne' && <span>donné {fmtJourCourt(d.donne_le)}</span>}
            </span>
          )}
        </span>
        {statut && (d.publie
          ? <Eye className="mt-0.5 size-4 shrink-0 text-succes" aria-label="Visible des familles" />
          : <Clock className="mt-0.5 size-4 shrink-0 text-brume" aria-label="Publié en fin de journée" />)}
      </Corps>
      {onFait && (
        <button type="button" onClick={onFait} aria-pressed={fait} aria-label={fait ? 'Pas fait' : 'Fait'}
          className={clsx('flex size-7 shrink-0 items-center justify-center rounded-full transition', fait ? 'bg-succes text-white' : 'border-2 border-encre/15 bg-white/70 text-transparent hover:border-succes hover:text-succes')}>
          <Check className="size-3.5" strokeWidth={3} />
        </button>
      )}
    </div>
  )
}
