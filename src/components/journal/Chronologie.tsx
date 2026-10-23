import clsx from 'clsx'
import { Check, X } from 'lucide-react'
import { minutes } from '../../lib/dates'
import { matiere } from '../../lib/matieres'
import type { Creneau, Seance } from '../../lib/types'

const PX = 2 // pixels par minute
const MIN_SEANCE = 40 // hauteur minimale d'une séance (px)
const MAX_PAUSE = 36 // une longue pause (repas) est resserrée

/** Axe du temps : linéaire, mais les séances courtes sont agrandies et la pause du midi resserrée */
function construireAxe(seances: Seance[], pauses: Pick<Creneau, 'debut' | 'fin'>[], debut: number, fin: number) {
  const pts = [...new Set([debut, fin, ...seances.flatMap((x) => [minutes(x.debut), minutes(x.fin)]), ...pauses.flatMap((x) => [minutes(x.debut), minutes(x.fin)])])]
    .filter((t) => t >= debut && t <= fin).sort((a, b) => a - b)
  const haut = pts.slice(0, -1).map((t, i) => (pts[i + 1] - t) * PX)
  const couvre = (a: number, b: number, t0: number, t1: number) => a <= t0 && t1 <= b
  pts.slice(0, -1).forEach((t, i) => {
    const t1 = pts[i + 1]
    const enSeance = seances.some((x) => couvre(minutes(x.debut), minutes(x.fin), t, t1))
    const enPause = pauses.some((x) => couvre(minutes(x.debut), minutes(x.fin), t, t1))
    if (!enSeance && (enPause || t1 - t > 30)) haut[i] = Math.min(haut[i], MAX_PAUSE)
  })
  for (const x of seances) {
    const idx = pts.slice(0, -1).map((_, i) => i).filter((i) => couvre(minutes(x.debut), minutes(x.fin), pts[i], pts[i + 1]))
    const total = idx.reduce((n, i) => n + haut[i], 0)
    if (total > 0 && total < MIN_SEANCE) idx.forEach((i) => { haut[i] *= MIN_SEANCE / total })
  }
  const cum = [0]
  haut.forEach((h) => cum.push(cum[cum.length - 1] + h))
  return (t: number) => {
    if (t <= pts[0]) return 0
    for (let i = 0; i < pts.length - 1; i++) {
      if (t <= pts[i + 1]) return cum[i] + ((t - pts[i]) / (pts[i + 1] - pts[i])) * haut[i]
    }
    return cum[cum.length - 1]
  }
}

/** Répartit en colonnes les séances qui se chevauchent */
function colonnes(l: Seance[]) {
  const res = new Map<string, { col: number; nb: number }>()
  const tries = [...l].sort((a, b) => minutes(a.debut) - minutes(b.debut))
  let groupe: Seance[] = []
  let finGroupe = -1
  const fermer = () => {
    const fins: number[] = []
    for (const s of groupe) {
      let c = fins.findIndex((f) => f <= minutes(s.debut))
      if (c === -1) { c = fins.length; fins.push(0) }
      fins[c] = minutes(s.fin)
      res.set(s.id, { col: c, nb: 0 })
    }
    for (const s of groupe) res.get(s.id)!.nb = fins.length
  }
  for (const s of tries) {
    if (minutes(s.debut) >= finGroupe && groupe.length) { fermer(); groupe = [] }
    groupe.push(s)
    finGroupe = Math.max(finGroupe, minutes(s.fin))
  }
  if (groupe.length) fermer()
  return res
}

const SUIVANT: Record<Seance['statut'], Seance['statut']> = { prevue: 'faite', faite: 'non_faite', non_faite: 'prevue' }
const AIDE: Record<Seance['statut'], string> = {
  prevue: 'Prévue (toucher : faite)', faite: 'Faite (toucher : pas faite)', non_faite: 'Pas faite (toucher : prévue)',
}

/** Case d'état unique : vide = prévue, coche verte = faite, croix rouge = pas faite */
export function CaseStatut({ statut, onChange, petit }: { statut: Seance['statut']; onChange: (s: Seance['statut']) => void; petit?: boolean }) {
  return (
    <button type="button" onClick={() => onChange(SUIVANT[statut])} title={AIDE[statut]} aria-label={AIDE[statut]}
      className={clsx('flex shrink-0 items-center justify-center rounded-full transition active:scale-90', petit ? 'size-6' : 'size-7',
        statut === 'faite' && 'bg-succes text-white',
        statut === 'non_faite' && 'bg-alerte text-white',
        statut === 'prevue' && 'border-2 border-encre/15 bg-white/70 text-transparent hover:border-succes hover:text-succes')}>
      {statut === 'non_faite' ? <X className="size-3.5" strokeWidth={3} /> : <Check className="size-3.5" strokeWidth={3} />}
    </button>
  )
}

type Pause = Pick<Creneau, 'id' | 'debut' | 'fin' | 'libelle'>

/** La journée sur un axe horaire : heures à gauche, chaque séance à sa place et à sa durée */
export function Chronologie({ seances, pauses, maintenant, enCoursId, onOuvrir, onStatut }: {
  seances: Seance[]; pauses: Pause[]; maintenant: number | null; enCoursId?: string | null
  onOuvrir: (s: Seance) => void
  /** Absent : lecture seule (pas de case d'état) */
  onStatut?: (s: Seance, st: Seance['statut']) => void
}) {
  const avecHeure = seances.filter((s) => s.debut && s.fin && minutes(s.fin) > minutes(s.debut))
  const sansHeure = seances.filter((s) => !avecHeure.includes(s))
  const bornes = [...avecHeure.flatMap((s) => [minutes(s.debut), minutes(s.fin)]), ...pauses.flatMap((p) => [minutes(p.debut), minutes(p.fin)])]
  const debut = bornes.length ? Math.min(...bornes) : 8 * 60 + 30
  const fin = bornes.length ? Math.max(...bornes) : 16 * 60 + 30
  const y = construireAxe(avecHeure, pauses, debut, fin)
  const cols = colonnes(avecHeure)
  // Heures de début affichées sur le côté (sans chevauchement)
  const etiquettes: { t: number; y: number }[] = []
  for (const t of [...new Set(avecHeure.map((x) => minutes(x.debut)))].sort((a, b) => a - b)) {
    const yy = y(t)
    if (!etiquettes.length || yy - etiquettes[etiquettes.length - 1].y >= 16) etiquettes.push({ t, y: yy })
  }
  const heureTxt = (t: number) => `${Math.floor(t / 60)}h${String(t % 60).padStart(2, '0')}`

  return (
    <div>
      <div className="relative flex" style={{ height: y(fin) + 6 }}>
        {/* Heures */}
        <div className="relative w-12 shrink-0">
          {etiquettes.map((e) => (
            <span key={e.t} className="absolute right-2.5 text-xs font-medium tabular-nums text-brume" style={{ top: e.y + 4 }}>{heureTxt(e.t)}</span>
          ))}
        </div>
        {/* Cartes */}
        <div className="relative flex-1">
          {pauses.map((p) => {
            const h = Math.max(y(minutes(p.fin)) - y(minutes(p.debut)) - 4, 4)
            return (
              <div key={p.id} className="absolute inset-x-0 flex items-center rounded-lg bg-encre/[.035] px-3"
                style={{ top: y(minutes(p.debut)) + 2, height: h }}>
                {h >= 16 && <span className="truncate text-xs text-brume">{p.libelle || 'Pause'}</span>}
              </div>
            )
          })}

          {avecHeure.map((s) => {
            const m = matiere(s.matiere)
            const Icone = m.icone
            const hauteur = y(minutes(s.fin)) - y(minutes(s.debut)) - 4
            const { col, nb } = cols.get(s.id) ?? { col: 0, nb: 1 }
            const petit = hauteur < 36
            const nonFaite = s.statut === 'non_faite'
            return (
              <div key={s.id}
                className={clsx('absolute flex items-center gap-2 overflow-hidden rounded-xl border-l-[3px] pl-2.5 pr-1.5 transition',
                  enCoursId === s.id && 'ring-2 ring-bateau ring-offset-1', s.statut === 'faite' && 'opacity-70')}
                style={{
                  top: y(minutes(s.debut)) + 2, height: hauteur,
                  left: `calc(${(col / nb) * 100}% + ${col ? 3 : 0}px)`, width: `calc(${100 / nb}% - ${nb > 1 ? 3 : 0}px)`,
                  borderLeftColor: m.couleur,
                  background: nonFaite ? `repeating-linear-gradient(135deg, ${m.fond}, ${m.fond} 7px, #fff 7px, #fff 14px)` : m.fond,
                }}>
                <button type="button" onClick={() => onOuvrir(s)} className="flex min-w-0 flex-1 items-center gap-2 self-stretch text-left" title={s.titre}>
                  <Icone className="size-4 shrink-0" strokeWidth={2.2} style={{ color: m.couleur }} />
                  <span className={clsx('min-w-0 flex-1 font-semibold leading-tight text-encre', petit ? 'truncate text-[13px]' : 'line-clamp-2 text-sm', nonFaite && 'line-through decoration-encre/40')}>
                    {s.titre || m.court}
                  </span>
                </button>
                {onStatut && <CaseStatut statut={s.statut} petit={petit} onChange={(st) => onStatut(s, st)} />}
              </div>
            )
          })}

          {maintenant != null && maintenant >= debut && maintenant <= fin && (
            <div className="pointer-events-none absolute inset-x-0 z-10 flex items-center" style={{ top: y(maintenant) }}>
              <span className="-ml-1 size-2 rounded-full bg-alerte" />
              <span className="h-px flex-1 bg-alerte" />
            </div>
          )}
        </div>
      </div>

      {sansHeure.length > 0 && (
        <div className="mt-3 flex flex-col gap-1.5 pl-12">
          {sansHeure.map((s) => {
            const m = matiere(s.matiere)
            const Icone = m.icone
            return (
              <button key={s.id} type="button" onClick={() => onOuvrir(s)} className="flex items-center gap-2 rounded-xl border-l-[3px] px-2.5 py-2.5 text-left"
                style={{ background: m.fond, borderLeftColor: m.couleur }}>
                <Icone className="size-4 shrink-0" style={{ color: m.couleur }} />
                <span className="text-sm font-semibold">{s.titre || m.court}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
