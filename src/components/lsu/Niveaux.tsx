import clsx from 'clsx'
import { Check } from 'lucide-react'
import { NIVEAUX, niveau } from '../../lib/matieres'

/** Noms des colonnes, comme sur le livret officiel */
export const COLONNES: Record<number, string> = { 1: 'Non atteints', 2: 'Partiellement', 3: 'Atteints', 4: 'Dépassés' }

/** Largeur commune des quatre colonnes (en-tête et lignes restent alignés) */
export const LARGEUR_NIVEAUX = 'w-full sm:w-[22rem]'

/** En-tête des quatre colonnes */
export function EnteteNiveaux({ className }: { className?: string }) {
  return (
    <div className={clsx('grid grid-cols-4', LARGEUR_NIVEAUX, className)} aria-hidden>
      {NIVEAUX.map((n) => (
        <span key={n.v} className="flex items-center justify-center gap-1.5 text-center text-[11px] font-semibold leading-tight text-brume sm:text-xs">
          <span className="hidden size-2 shrink-0 rounded-full sm:inline-block" style={{ background: n.couleur }} />
          {COLONNES[n.v]}
        </span>
      ))}
    </div>
  )
}

/**
 * Une ligne de positionnement : une case par niveau.
 * Validé : rond plein. Proposé d'après les évaluations : rond en pointillé (un clic le valide).
 * Cliquer le niveau validé l'efface.
 */
export function LigneNiveaux({ valeur, proposition, onChange, label }: {
  valeur?: number; proposition?: number; onChange: (v: number | undefined) => void; label: string
}) {
  return (
    <div className={clsx('grid grid-cols-4', LARGEUR_NIVEAUX)} role="radiogroup" aria-label={label}>
      {NIVEAUX.map((n) => {
        const choisi = valeur === n.v
        const propose = !valeur && proposition === n.v
        return (
          <button key={n.v} type="button" role="radio" aria-checked={choisi}
            aria-label={`${COLONNES[n.v]}${propose ? ' (proposé)' : ''}`}
            title={propose ? `${n.nom} : proposé d'après les évaluations` : n.nom}
            onClick={() => onChange(choisi ? undefined : n.v)}
            className="group flex h-10 items-center justify-center rounded-lg transition hover:bg-encre/[.03]">
            <span
              className={clsx('flex size-[22px] items-center justify-center rounded-full border-2 transition group-active:scale-90',
                !choisi && !propose && 'border-[#D5D9E2] group-hover:border-current')}
              style={choisi
                ? { background: n.couleur, borderColor: n.couleur, color: '#fff' }
                : propose ? { borderColor: n.couleur, borderStyle: 'dashed', color: n.couleur } : { color: n.couleur }}
            >
              {choisi && <Check className="size-3.5" strokeWidth={3.2} />}
            </span>
          </button>
        )
      })}
    </div>
  )
}

/** Niveau affiché en lecture : pastille de couleur + nom (familles, impression écran) */
export function EtiquetteNiveau({ v }: { v: number | undefined }) {
  const n = niveau(v)
  if (!n) return null
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold text-encre" style={{ background: n.fond }} title={n.nom}>
      <span className="size-2 rounded-full" style={{ background: n.couleur }} />
      {COLONNES[n.v]}
    </span>
  )
}

/** Petit rond pour la vue de la classe */
export function Point({ v, propose }: { v?: number; propose?: number }) {
  const n = niveau(v)
  const p = !n ? niveau(propose) : undefined
  return (
    <span
      className="block size-4 rounded-full"
      style={n ? { background: n.couleur } : p ? { border: `2px dashed ${p.couleur}` } : { border: '2px solid #E3E6EC' }}
    />
  )
}
