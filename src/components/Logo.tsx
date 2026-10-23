import { Sailboat } from 'lucide-react'

export function Logo({ sousTitre }: { sousTitre?: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-11 items-center justify-center rounded-2xl bg-bateau text-white shadow-doux">
        <Sailboat className="size-6" strokeWidth={2.2} />
      </span>
      <div className="min-w-0">
        <p className="font-titre text-xl font-semibold leading-none text-encre">Cahier de bord</p>
        {sousTitre && <p className="mt-1 truncate text-xs font-semibold text-brume">{sousTitre}</p>}
      </div>
    </div>
  )
}
