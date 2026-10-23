import clsx from 'clsx'
import { Check, Coffee, X } from 'lucide-react'
import { minutes } from '../../lib/dates'
import { matiere } from '../../lib/matieres'
import type { Creneau, Seance } from '../../lib/types'
import { iconeAFaire } from './SeanceEditeur'

const PX = 2 // pixels par minute
const MIN_SEANCE = 38 // hauteur minimale d'une séance (px)
const MAX_PAUSE = 44 // une longue pause (repas) est resserrée

/** Axe du temps : linéaire, mais les séances courtes sont agrandies et la pause du midi resserrée */
function construireAxe(seances: Seance[], pauses: Creneau[], debut: number, fin: number) {
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
    const idx = pts.slice(0, -1).map((t, i) => i).filter((i) => couvre(minutes(x.debut), minutes(x.fin), pts[i], pts[i + 1]))
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

/** La journée sur un axe horaire : heures à gauche, chaque séance à sa place et à sa durée */
export function Chronologie({ seances, pauses, maintenant, enCoursId, onOuvrir, onStatut }: {
  seances: Seance[]; pauses: Creneau[]; maintenant: number | null; enCoursId?: string | null
  onOuvrir: (s: Seance) => void; onStatut: (s: Seance, st: Seance['statut']) => void
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
      <div className="relative flex" style={{ height: y(fin) + 8 }}>
        {/* Heures */}
        <div className="relative w-14 shrink-0">
          {etiquettes.map((e) => (
            <span key={e.t} className="absolute right-2 font-titre text-sm font-semibold tabular-nums text-brume" style={{ top: e.y + 2 }}>{heureTxt(e.t)}</span>
          ))}
        </div>
        {/* Grille et cartes */}
        <div className="relative flex-1">

          {pauses.map((p) => (
            <div key={p.id} title={p.libelle ?? 'Pause'} className="absolute inset-x-0 flex items-center justify-center rounded-xl text-brume/70"
              style={{ top: y(minutes(p.debut)) + 2, height: Math.max(y(minutes(p.fin)) - y(minutes(p.debut)) - 4, 6), background: 'repeating-linear-gradient(135deg, #F1F3F8, #F1F3F8 6px, transparent 6px, transparent 12px)' }}>
              {minutes(p.fin) - minutes(p.debut) >= 15 && <Coffee className="size-4" />}
            </div>
          ))}

          {avecHeure.map((s) => {
            const m = matiere(s.matiere)
            const Icone = m.icone
            const haut = y(minutes(s.debut)) + 2
            const hauteur = y(minutes(s.fin)) - y(minutes(s.debut)) - 4
            const { col, nb } = cols.get(s.id) ?? { col: 0, nb: 1 }
            const petit = hauteur < 34
            const nonFaite = s.statut === 'non_faite'
            const faite = s.statut === 'faite'
            return (
              <div key={s.id}
                className={clsx('absolute flex items-center gap-2 overflow-hidden rounded-2xl px-2 shadow-sm transition', enCoursId === s.id && 'ring-[3px] ring-encre')}
                style={{
                  top: haut, height: hauteur, left: `calc(${(col / nb) * 100}% + ${col ? 3 : 0}px)`, width: `calc(${100 / nb}% - ${nb > 1 ? 3 : 0}px)`,
                  background: nonFaite ? `repeating-linear-gradient(45deg, #fff, #fff 8px, ${m.fond} 8px, ${m.fond} 16px)` : m.fond,
                  opacity: faite ? 0.65 : 1,
                }}>
                <button type="button" onClick={() => onOuvrir(s)} className="flex min-w-0 flex-1 items-center gap-2 self-stretch text-left" title={s.titre}>
                  <span className={clsx('flex shrink-0 items-center justify-center rounded-xl bg-white', petit ? 'size-6' : 'size-9')} style={{ color: m.couleur }}>
                    <Icone className={petit ? 'size-3.5' : 'size-5'} strokeWidth={2.3} />
                  </span>
                  <span className={clsx('min-w-0 flex-1 font-bold leading-tight text-encre', petit ? 'truncate text-xs' : 'line-clamp-2 text-sm', nonFaite && 'line-through opacity-60')}>
                    {s.titre || m.court}
                  </span>
                  {!petit && s.a_faire?.length > 0 && (
                    <span className="flex shrink-0 gap-0.5" style={{ color: m.couleur }}>
                      {s.a_faire.slice(0, 2).map((a, i) => { const I = iconeAFaire(a.type); return <I key={i} className="size-4" /> })}
                    </span>
                  )}
                </button>
                <span className="flex shrink-0 gap-1">
                  <button type="button" aria-label="Faite" title="Faite" onClick={() => onStatut(s, faite ? 'prevue' : 'faite')}
                    className={clsx('flex items-center justify-center rounded-full transition', petit ? 'size-6' : 'size-8', faite ? 'bg-succes text-white' : 'bg-white/80 text-brume hover:text-succes')}>
                    <Check className={petit ? 'size-3.5' : 'size-4'} strokeWidth={3} />
                  </button>
                  <button type="button" aria-label="Pas faite" title="Pas faite" onClick={() => onStatut(s, nonFaite ? 'prevue' : 'non_faite')}
                    className={clsx('flex items-center justify-center rounded-full transition', petit ? 'size-6' : 'size-8', nonFaite ? 'bg-alerte text-white' : 'bg-white/80 text-brume hover:text-alerte')}>
                    <X className={petit ? 'size-3.5' : 'size-4'} strokeWidth={3} />
                  </button>
                </span>
              </div>
            )
          })}

          {maintenant != null && maintenant >= debut && maintenant <= fin && (
            <div className="pointer-events-none absolute inset-x-0 z-10 flex items-center" style={{ top: y(maintenant) }}>
              <span className="-ml-1.5 size-3 rounded-full bg-alerte" />
              <span className="h-0.5 flex-1 bg-alerte" />
            </div>
          )}
        </div>
      </div>

      {sansHeure.length > 0 && (
        <div className="mt-4 flex flex-col gap-2 pl-14">
          {sansHeure.map((s) => {
            const m = matiere(s.matiere)
            const Icone = m.icone
            return (
              <button key={s.id} type="button" onClick={() => onOuvrir(s)} className="flex items-center gap-2 rounded-2xl px-2 py-2 text-left" style={{ background: m.fond }}>
                <span className="flex size-9 items-center justify-center rounded-xl bg-white" style={{ color: m.couleur }}><Icone className="size-5" /></span>
                <span className="font-bold">{s.titre || m.court}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
