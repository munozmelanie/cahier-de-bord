import type { ReactNode } from 'react'

/** Anneau de progression (à la place des « 10/19 » écrits) */
export function Anneau({ valeur, total, couleur, taille = 36, epaisseur = 4, titre, children }: {
  valeur: number; total: number; couleur: string; taille?: number; epaisseur?: number; titre: string; children?: ReactNode
}) {
  const r = (taille - epaisseur) / 2
  const c = 2 * Math.PI * r
  const p = total ? Math.min(1, Math.max(0, valeur / total)) : 0
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: taille, height: taille }} title={titre} role="img" aria-label={titre}>
      <svg width={taille} height={taille} className="-rotate-90" aria-hidden>
        <circle cx={taille / 2} cy={taille / 2} r={r} fill="none" stroke="#E2E7F1" strokeWidth={epaisseur} />
        {p > 0 && (
          <circle cx={taille / 2} cy={taille / 2} r={r} fill="none" stroke={couleur} strokeWidth={epaisseur}
            strokeDasharray={c} strokeDashoffset={c * (1 - p)} strokeLinecap="round" />
        )}
      </svg>
      {children && <span className="absolute inset-0 flex items-center justify-center" style={{ color: couleur }}>{children}</span>}
    </span>
  )
}
