import clsx from 'clsx'
import { NIVEAUX } from '../../lib/matieres'
import { ABREV } from './outils'

/**
 * Quatre boutons de positionnement.
 * Valeur validée : pleine. Proposition calculée : en pointillé (un toucher la valide).
 * Toucher la valeur validée l'efface.
 */
export function ChoixNiveau({ valeur, proposition, onChange, label }: {
  valeur?: number
  proposition?: number
  onChange: (v: number | undefined) => void
  label: string
}) {
  return (
    <div className="grid grid-cols-4 gap-1.5" role="radiogroup" aria-label={label}>
      {NIVEAUX.map((n) => {
        const choisi = valeur === n.v
        const propose = !valeur && proposition === n.v
        return (
          <button
            key={n.v}
            type="button"
            role="radio"
            aria-checked={choisi}
            title={propose ? `${n.nom} (proposé d'après les évaluations)` : n.nom}
            onClick={() => onChange(choisi ? undefined : n.v)}
            className={clsx(
              'flex h-10 min-w-0 items-center justify-center rounded-xl px-1 text-xs font-bold transition active:scale-95',
              choisi && 'text-white shadow-sm',
              propose && 'border-2 border-dashed',
              !choisi && !propose && 'opacity-60 hover:opacity-100',
            )}
            style={choisi ? { background: n.couleur } : { background: n.fond, color: n.couleur, borderColor: propose ? n.couleur : undefined }}
          >
            <span className="font-titre text-sm sm:hidden">{ABREV[n.v]}</span>
            <span className="hidden truncate sm:inline">{n.court}</span>
          </button>
        )
      })}
    </div>
  )
}
