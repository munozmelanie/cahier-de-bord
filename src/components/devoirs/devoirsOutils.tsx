import clsx from 'clsx'
import { BookMarked, ClipboardList, Info, Package, PencilLine, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { fmtJourCourt, jourClasseSuivant, semaineSuivante } from '../../lib/dates'
import type { Reglages, TypeDevoir } from '../../lib/types'
import { Saisie } from '../ui'

export const TYPES_DEVOIR: { id: TypeDevoir; label: string; icone: LucideIcon; couleur: string; fond: string }[] = [
  { id: 'travail', label: 'À faire', icone: PencilLine, couleur: '#3358E0', fond: '#ECF0FF' },
  { id: 'lecon', label: 'Leçon', icone: BookMarked, couleur: '#13A35B', fond: '#E1F6EA' },
  { id: 'evaluation', label: 'Évaluation', icone: ClipboardList, couleur: '#E5484D', fond: '#FDE7E8' },
  { id: 'materiel', label: 'Matériel', icone: Package, couleur: '#B37400', fond: '#FFF4DC' },
  { id: 'info', label: 'Info', icone: Info, couleur: '#6A7593', fond: '#ECEFF5' },
]
export const typeDevoir = (t: TypeDevoir) => TYPES_DEVOIR.find((x) => x.id === t) ?? TYPES_DEVOIR[0]

export function BadgeType({ type }: { type: TypeDevoir }) {
  const t = typeDevoir(type)
  const Icone = t.icone
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold" style={{ background: t.fond, color: t.couleur }}>
      <Icone className="size-3.5" /> {t.label}
    </span>
  )
}

export function ChoixType({ valeur, onChange }: { valeur: TypeDevoir; onChange: (t: TypeDevoir) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Type">
      {TYPES_DEVOIR.map((t) => {
        const Icone = t.icone
        const choisi = t.id === valeur
        return (
          <button key={t.id} type="button" role="radio" aria-checked={choisi} onClick={() => onChange(t.id)}
            className={clsx('inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-sm font-semibold transition', choisi ? 'border-current' : 'border-transparent')}
            style={{ background: t.fond, color: t.couleur }}>
            <Icone className="size-4" /> {t.label}
          </button>
        )
      })}
    </div>
  )
}

/** Choix de la date « pour le » : demain, semaine prochaine (N → N+1) ou une date */
export function ChoixPourLe({ donneLe, valeur, onChange, reglages }: { donneLe: string; valeur: string; onChange: (d: string) => void; reglages?: Reglages }) {
  const demain = jourClasseSuivant(donneLe, reglages)
  const semPro = semaineSuivante(donneLe, reglages)
  const [libre, setLibre] = useState(valeur !== demain && valeur !== semPro)
  const puce = (actif: boolean) => clsx('rounded-full px-3 py-1.5 text-sm font-semibold transition', actif ? 'bg-encre text-white' : 'bg-white text-encre border border-trait')
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button type="button" className={puce(!libre && valeur === demain)} onClick={() => { setLibre(false); onChange(demain) }}>
        {fmtJourCourt(demain)}
      </button>
      <button type="button" className={puce(!libre && valeur === semPro)} onClick={() => { setLibre(false); onChange(semPro) }}>
        {fmtJourCourt(semPro)} <span className="opacity-60">(N+1)</span>
      </button>
      {libre ? (
        <Saisie type="date" value={valeur} onChange={(e) => onChange(e.target.value)} className="w-auto py-1.5" aria-label="Pour le" />
      ) : (
        <button type="button" className={puce(false)} onClick={() => setLibre(true)} aria-label="Autre date">…</button>
      )}
    </div>
  )
}
