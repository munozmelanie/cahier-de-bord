import clsx from 'clsx'
import { ArrowDown, ArrowUp, CalendarPlus, ChevronDown, Trash2 } from 'lucide-react'
import { BoutonIcone } from '../ui'
import { SaisieAuto, TexteAuto } from './ChampAuto'
import type { Etape } from '../../lib/types'

export function CarteEtape({ e, couleur, premier, dernier, ouverte, onOuvrir, onSave, onMonter, onDescendre, onPlacer, onSupprimer }: {
  e: Etape; couleur: string; premier: boolean; dernier: boolean; ouverte: boolean; onOuvrir: () => void
  onSave: (patch: Partial<Etape>) => void; onMonter: () => void; onDescendre: () => void; onPlacer: () => void; onSupprimer: () => void
}) {
  return (
    <li className="rounded-3xl bg-white shadow-doux">
      <div className="flex items-center gap-2 p-2 pl-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full font-titre font-semibold text-white" style={{ background: couleur }}>
          {e.numero}
        </span>
        <button onClick={onOuvrir} className="flex min-w-0 flex-1 items-center gap-2 py-1 text-left" aria-expanded={ouverte}>
          <span className="min-w-0 flex-1 truncate font-bold">{e.titre || 'Séance sans titre'}</span>
          {e.duree ? <span className="shrink-0 text-sm text-brume">{e.duree} min</span> : null}
          <ChevronDown className={clsx('size-5 shrink-0 text-brume transition', ouverte && 'rotate-180')} />
        </button>
        <span className="hidden shrink-0 sm:flex">
          <BoutonIcone icone={ArrowUp} label="Monter" onClick={onMonter} disabled={premier} className="size-8" />
          <BoutonIcone icone={ArrowDown} label="Descendre" onClick={onDescendre} disabled={dernier} className="size-8" />
        </span>
        <BoutonIcone icone={CalendarPlus} label="Placer dans le cahier journal" onClick={onPlacer} className="size-8" />
      </div>
      {ouverte && (
        <div className="flex flex-col gap-3 border-t border-trait p-4">
          <div className="grid grid-cols-[1fr_6rem] items-end gap-3">
            <TexteAuto label="Titre" uneLigne valeur={e.titre} onSave={(v) => onSave({ titre: v ?? '' })} />
            <div className="flex flex-col gap-1">
              <span className="px-1 text-xs font-bold text-brume">Durée (min)</span>
              <SaisieAuto label="Durée (min)" placeholder="min" type="number" valeur={e.duree} onSave={(v) => onSave({ duree: v ? Number(v) : null })} />
            </div>
          </div>
          <TexteAuto label="Objectif" valeur={e.objectif} onSave={(v) => onSave({ objectif: v })} />
          <TexteAuto label="Déroulé" valeur={e.deroule} onSave={(v) => onSave({ deroule: v })} className="min-h-[5rem]" />
          <TexteAuto label="Matériel" valeur={e.materiel} onSave={(v) => onSave({ materiel: v })} />
          <TexteAuto label="Différenciation" valeur={e.differenciation} onSave={(v) => onSave({ differenciation: v })} />
          <TexteAuto label="Évaluation" valeur={e.evaluation} onSave={(v) => onSave({ evaluation: v })} />
          <div className="flex items-center justify-between">
            <span className="flex sm:hidden">
              <BoutonIcone icone={ArrowUp} label="Monter" onClick={onMonter} disabled={premier} />
              <BoutonIcone icone={ArrowDown} label="Descendre" onClick={onDescendre} disabled={dernier} />
            </span>
            <BoutonIcone icone={Trash2} label="Supprimer la séance" onClick={onSupprimer} className="ml-auto text-alerte" />
          </div>
        </div>
      )}
    </li>
  )
}
