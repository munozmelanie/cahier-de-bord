import clsx from 'clsx'
import { Check, X } from 'lucide-react'
import { fmtHeure, minutes } from '../../lib/dates'
import { matiere } from '../../lib/matieres'
import type { Seance } from '../../lib/types'
import { iconeAFaire } from './SeanceEditeur'

/** Une séance en carte colorée, hauteur selon la durée (comme l'emploi du temps) */
export function CarteSeance({ s, enCours, onOuvrir, onStatut, compacte }: {
  s: Seance; enCours?: boolean; onOuvrir: () => void; onStatut?: (st: Seance['statut']) => void; compacte?: boolean
}) {
  const m = matiere(s.matiere)
  const Icone = m.icone
  const duree = s.debut && s.fin ? minutes(s.fin) - minutes(s.debut) : 30
  const nonFaite = s.statut === 'non_faite'
  const faite = s.statut === 'faite'
  const hauteur = compacte ? undefined : Math.max(60, Math.min(duree, 90) * 1.35)

  return (
    <div
      className={clsx('group relative flex items-center gap-3 rounded-[22px] px-3 transition md:min-h-[var(--h)]', enCours && 'ring-[3px] ring-encre ring-offset-2 ring-offset-papier', compacte ? 'py-2' : 'py-2.5')}
      style={{
        ['--h' as any]: hauteur ? `${hauteur}px` : undefined,
        background: nonFaite ? `repeating-linear-gradient(45deg, #fff, #fff 8px, ${m.fond} 8px, ${m.fond} 16px)` : m.fond,
        opacity: faite ? 0.7 : 1,
      }}
    >
      <button type="button" onClick={onOuvrir} className="flex min-w-0 flex-1 items-center gap-3 self-stretch text-left">
        <span className={clsx('flex shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm', compacte ? 'size-9' : 'size-11')} style={{ color: m.couleur }}>
          <Icone className={compacte ? 'size-5' : 'size-6'} strokeWidth={2.2} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-bold tabular-nums" style={{ color: m.couleur }}>{fmtHeure(s.debut)}</span>
          <span className={clsx('line-clamp-2 font-bold leading-snug text-encre', nonFaite && 'line-through opacity-60')}>{s.titre || m.court}</span>
        </span>
        {s.a_faire?.length > 0 && !compacte && (
          <span className="flex shrink-0 gap-1" style={{ color: m.couleur }} title={s.a_faire.map((a) => a.label).join(' · ')}>
            {s.a_faire.slice(0, 2).map((a, i) => { const I = iconeAFaire(a.type); return <I key={i} className="size-4" /> })}
          </span>
        )}
      </button>
      {onStatut && (
        <span className="flex shrink-0 gap-1.5">
          <button type="button" aria-label="Faite" title="Faite" onClick={() => onStatut(faite ? 'prevue' : 'faite')}
            className={clsx('flex size-8 items-center justify-center rounded-full transition', faite ? 'bg-succes text-white' : 'bg-white/80 text-brume hover:text-succes')}>
            <Check className="size-4" strokeWidth={3} />
          </button>
          <button type="button" aria-label="Pas faite" title="Pas faite" onClick={() => onStatut(nonFaite ? 'prevue' : 'non_faite')}
            className={clsx('flex size-8 items-center justify-center rounded-full transition', nonFaite ? 'bg-alerte text-white' : 'bg-white/80 text-brume hover:text-alerte')}>
            <X className="size-4" strokeWidth={3} />
          </button>
        </span>
      )}
    </div>
  )
}
