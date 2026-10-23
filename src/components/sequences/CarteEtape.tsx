import { ArrowDown, ArrowUp, CalendarPlus, Clock, Trash2 } from 'lucide-react'
import { BoutonIcone, Feuille } from '../ui'
import { SaisieAuto, TexteAuto } from './ChampAuto'
import type { Etape } from '../../lib/types'
import type { Matiere } from '../../lib/matieres'

/** Une séance de la séquence, en carte numérotée de la couleur de la matière */
export function CarteEtape({ e, m, onOuvrir, onPlacer }: { e: Etape; m: Matiere; onOuvrir: () => void; onPlacer: () => void }) {
  return (
    <li className="flex items-center gap-3 rounded-[22px] p-3" style={{ background: m.fond }}>
      <button type="button" onClick={onOuvrir} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white font-titre text-xl font-semibold shadow-sm" style={{ color: m.couleur }}>
          {e.numero}
        </span>
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 font-bold leading-snug text-encre">{e.titre || '—'}</span>
          {e.duree ? (
            <span className="mt-0.5 inline-flex items-center gap-1 text-xs font-bold" style={{ color: m.couleur }}>
              <Clock className="size-3.5" /> {e.duree} min
            </span>
          ) : null}
        </span>
      </button>
      <BoutonIcone icone={CalendarPlus} label="Placer dans le cahier journal" onClick={onPlacer} className="size-9 bg-white/70" />
    </li>
  )
}

/** Fiche d'une séance (enregistrement automatique à la sortie de chaque champ) */
export function EditeurEtape({ e, m, premier, dernier, onFermer, onSave, onMonter, onDescendre, onPlacer, onSupprimer }: {
  e: Etape | null; m: Matiere; premier: boolean; dernier: boolean; onFermer: () => void
  onSave: (patch: Partial<Etape>) => void; onMonter: () => void; onDescendre: () => void; onPlacer: () => void; onSupprimer: () => void
}) {
  return (
    <Feuille ouverte={!!e} onFermer={onFermer} large
      titre={e ? (
        <span className="inline-flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-xl font-titre text-lg text-white" style={{ background: m.couleur }}>{e.numero}</span>
        </span>
      ) : ''}
      pied={e && <>
        <BoutonIcone icone={Trash2} label="Supprimer la séance" onClick={onSupprimer} className="text-alerte" />
        <BoutonIcone icone={ArrowUp} label="Monter" onClick={onMonter} disabled={premier} />
        <BoutonIcone icone={ArrowDown} label="Descendre" onClick={onDescendre} disabled={dernier} className="mr-auto" />
        <BoutonIcone icone={CalendarPlus} label="Placer dans le cahier journal" variante="primaire" onClick={onPlacer} />
      </>}>
      {e && (
        <div key={e.id} className="flex flex-col gap-3">
          <div className="grid grid-cols-[1fr_6rem] items-end gap-3">
            <TexteAuto label="Titre" uneLigne valeur={e.titre} onSave={(v) => onSave({ titre: v ?? '' })} />
            <div className="flex flex-col gap-1">
              <span className="px-1 text-xs font-bold text-brume">Minutes</span>
              <SaisieAuto label="Durée (min)" placeholder="45" type="number" valeur={e.duree} onSave={(v) => onSave({ duree: v ? Number(v) : null })} />
            </div>
          </div>
          <TexteAuto label="Objectif" valeur={e.objectif} onSave={(v) => onSave({ objectif: v })} />
          <TexteAuto label="Déroulé" valeur={e.deroule} onSave={(v) => onSave({ deroule: v })} className="min-h-[6rem]" />
          <TexteAuto label="Matériel" valeur={e.materiel} onSave={(v) => onSave({ materiel: v })} />
          <div className="grid gap-3 sm:grid-cols-2">
            <TexteAuto label="Différenciation" valeur={e.differenciation} onSave={(v) => onSave({ differenciation: v })} />
            <TexteAuto label="Évaluation" valeur={e.evaluation} onSave={(v) => onSave({ evaluation: v })} />
          </div>
        </div>
      )}
    </Feuille>
  )
}
