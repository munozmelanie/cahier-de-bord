import clsx from 'clsx'
import { NIVEAUX } from '../../lib/matieres'
import { ABREV } from './outils'

/**
 * Quatre gros boutons ronds de positionnement.
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
    <div className="flex shrink-0 gap-1.5" role="radiogroup" aria-label={label}>
      {NIVEAUX.map((n) => {
        const choisi = valeur === n.v
        const propose = !valeur && proposition === n.v
        return (
          <button
            key={n.v}
            type="button"
            role="radio"
            aria-checked={choisi}
            aria-label={`${label} : ${n.nom}${propose ? ' (proposé)' : ''}`}
            title={propose ? `${n.nom} (proposé d'après les évaluations)` : n.nom}
            onClick={() => onChange(choisi ? undefined : n.v)}
            className={clsx(
              'flex size-10 items-center justify-center rounded-full font-titre text-sm font-semibold transition active:scale-90 sm:size-11',
              choisi && 'text-white shadow-sm',
              propose && 'border-[2.5px] border-dashed bg-white',
              !choisi && !propose && 'bg-white/80 opacity-70 hover:opacity-100',
            )}
            style={choisi ? { background: n.couleur } : { color: n.couleur, borderColor: propose ? n.couleur : undefined }}
          >
            {ABREV[n.v]}
          </button>
        )
      })}
    </div>
  )
}
