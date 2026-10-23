// Champs enregistrés automatiquement quand on quitte la zone de saisie
import { useEffect, useState } from 'react'
import { Saisie, Texte } from '../ui'

export function TexteAuto({ valeur, onSave, placeholder, label, className, etiquette = true, uneLigne, classeBloc }: {
  valeur: string | null; onSave: (v: string | null) => void; placeholder?: string; label: string; className?: string
  /** affiche le nom du champ au-dessus */
  etiquette?: boolean
  /** Entrée valide au lieu d'aller à la ligne */
  uneLigne?: boolean
  classeBloc?: string
}) {
  const [v, setV] = useState(valeur ?? '')
  useEffect(() => { setV(valeur ?? '') }, [valeur])
  const champ = (
    <Texte
      value={v}
      rows={1}
      aria-label={label}
      placeholder={placeholder ?? label}
      className={className}
      onChange={(e) => setV(uneLigne ? e.target.value.replace(/\n/g, ' ') : e.target.value)}
      onKeyDown={(e) => { if (uneLigne && e.key === 'Enter') { e.preventDefault(); (e.target as HTMLTextAreaElement).blur() } }}
      onBlur={() => { const n = v.trim() || null; if (n !== (valeur ?? null)) onSave(n) }}
    />
  )
  if (!etiquette) return champ
  return (
    <div className={classeBloc ?? 'flex min-w-0 flex-col gap-1'}>
      <span className="px-1 text-xs font-semibold text-brume">{label}</span>
      {champ}
    </div>
  )
}

export function SaisieAuto({ valeur, onSave, placeholder, label, className, type = 'text' }: {
  valeur: string | number | null; onSave: (v: string) => void; placeholder?: string; label: string; className?: string; type?: string
}) {
  const [v, setV] = useState(valeur == null ? '' : String(valeur))
  useEffect(() => { setV(valeur == null ? '' : String(valeur)) }, [valeur])
  return (
    <Saisie
      type={type}
      value={v}
      aria-label={label}
      placeholder={placeholder ?? label}
      className={className}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => { if (v !== (valeur == null ? '' : String(valeur))) onSave(v) }}
      onKeyDown={(e) => { if (e.key === 'Enter' && type !== 'textarea') (e.target as HTMLInputElement).blur() }}
    />
  )
}
