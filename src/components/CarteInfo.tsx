import clsx from 'clsx'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

/** Carte simple : petite icône, titre, compteur discret, puis le contenu. */
export function CarteInfo({ icone: Icone, couleur, fond, nombre, titre, action, children, onClick, className }: {
  icone: LucideIcon; couleur: string; fond: string; nombre?: ReactNode; titre: string
  action?: ReactNode; children?: ReactNode; onClick?: () => void; className?: string
}) {
  const Tete = onClick ? 'button' : 'div'
  return (
    <section className={clsx('rounded-3xl bg-white p-4 shadow-doux', className)} aria-label={titre}>
      <div className="flex min-h-8 items-center gap-2">
        <Tete type={onClick ? 'button' : undefined} onClick={onClick} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg" style={{ background: fond, color: couleur }}>
            <Icone className="size-4" strokeWidth={2.2} />
          </span>
          <span className="truncate text-[15px] font-semibold text-encre">{titre}</span>
          {nombre !== undefined && nombre !== 0 && (
            <span className="shrink-0 rounded-full bg-encre/[.06] px-2 text-xs font-semibold leading-5 tabular-nums text-brume">{nombre}</span>
          )}
        </Tete>
        {action}
      </div>
      {children && <div className="mt-3">{children}</div>}
    </section>
  )
}
