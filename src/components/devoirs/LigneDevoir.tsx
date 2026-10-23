import clsx from 'clsx'
import { Clock, Eye } from 'lucide-react'
import { fmtJourCourt } from '../../lib/dates'
import type { Devoir } from '../../lib/types'
import { PastilleMatiere } from '../ui'
import { BadgeType } from './devoirsOutils'

/** Une ligne de devoir. `mode` : ce qu'on affiche en date secondaire */
export function LigneDevoir({ d, mode = 'pour', onClick, statut = true }: { d: Devoir; mode?: 'pour' | 'donne' | 'aucun'; onClick?: () => void; statut?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={!onClick}
      className={clsx('flex w-full items-start gap-3 rounded-2xl px-2 py-2 text-left', onClick && 'hover:bg-white')}>
      <PastilleMatiere id={d.matiere} taille="s" />
      <span className="min-w-0 flex-1">
        <span className={clsx('block font-semibold leading-snug', d.type === 'evaluation' && 'text-alerte')}>{d.texte}</span>
        <span className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-brume">
          {d.type !== 'travail' && <BadgeType type={d.type} />}
          {mode === 'pour' && <span>pour {fmtJourCourt(d.pour_le)}</span>}
          {mode === 'donne' && <span>donné {fmtJourCourt(d.donne_le)}</span>}
          {statut && (d.publie
            ? <span className="inline-flex items-center gap-1 text-succes"><Eye className="size-3.5" />Visible</span>
            : <span className="inline-flex items-center gap-1 text-ambre-fonce"><Clock className="size-3.5" />Fin de journée</span>)}
        </span>
      </span>
    </button>
  )
}
