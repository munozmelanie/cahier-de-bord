import clsx from 'clsx'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

/** Petite carte : une bulle d'icône, un chiffre, et le contenu dessous. Pas de titre écrit. */
export function CarteInfo({ icone: Icone, couleur, fond, nombre, titre, action, children, onClick, className }: {
  icone: LucideIcon; couleur: string; fond: string; nombre?: ReactNode; titre: string
  action?: ReactNode; children?: ReactNode; onClick?: () => void; className?: string
}) {
  const Tete = onClick ? 'button' : 'div'
  return (
    <section className={clsx('rounded-3xl bg-white p-4 shadow-doux', className)} aria-label={titre}>
      <div className="flex items-center gap-3">
        <Tete type={onClick ? 'button' : undefined} onClick={onClick} title={titre} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl" style={{ background: fond, color: couleur }}>
            <Icone className="size-6" strokeWidth={2.2} />
          </span>
          {nombre !== undefined && <span className="font-titre text-3xl font-semibold leading-none" style={{ color: couleur }}>{nombre}</span>}
        </Tete>
        {action}
      </div>
      {children && <div className="mt-3">{children}</div>}
    </section>
  )
}
