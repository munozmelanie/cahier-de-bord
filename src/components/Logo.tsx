const base = import.meta.env.BASE_URL

export function LogoIcone({ className = 'size-11' }: { className?: string }) {
  return <img src={`${base}icone-cahier-de-bord.png`} alt="" width={512} height={512} className={`shrink-0 object-contain ${className}`} />
}

export function Logo({ sousTitre, compact = false }: { sousTitre?: string; compact?: boolean }) {
  return (
    <div className="min-w-0 max-w-full">
      <img src={`${base}logo-cahier-de-bord.png`} alt="Cahier de bord" width={2172} height={724}
        className={`block h-auto max-w-full ${compact ? 'w-48' : 'w-80'}`} />
      {sousTitre && <p className="truncate px-3 text-xs font-semibold text-brume">{sousTitre}</p>}
    </div>
  )
}
