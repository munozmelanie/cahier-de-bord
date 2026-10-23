import clsx from 'clsx'
import type { Progression } from '../../lib/types'

export const STATUTS_PROG: Record<Progression['statut'], { label: string }> = {
  prevu: { label: 'Prévu' },
  en_cours: { label: 'En cours' },
  fait: { label: 'Fait' },
}
export const STATUT_SUIVANT: Record<Progression['statut'], Progression['statut']> = { prevu: 'en_cours', en_cours: 'fait', fait: 'prevu' }

/** Rond vide (prévu), à moitié (en cours), plein (fait) dans la couleur de la matière */
export function RondStatut({ statut, couleur, taille = 18 }: { statut: Progression['statut']; couleur: string; taille?: number }) {
  const fond = statut === 'fait' ? couleur : statut === 'en_cours' ? `linear-gradient(90deg, ${couleur} 50%, #fff 50%)` : '#fff'
  return (
    <span
      aria-hidden
      className={clsx('inline-block shrink-0 rounded-full')}
      style={{ width: taille, height: taille, border: `2.5px solid ${couleur}`, background: fond }}
    />
  )
}
