import { fmtHeure, minutes } from '../../lib/dates'
import { matiere } from '../../lib/matieres'
import type { Seance } from '../../lib/types'

/** La journée en une bande : chaque séance à sa place, à sa durée, à sa couleur */
export function Ruban({ seances, maintenant, onChoisir }: { seances: Seance[]; maintenant?: number | null; onChoisir?: (s: Seance) => void }) {
  const avecHeure = seances.filter((s) => s.debut && s.fin)
  if (!avecHeure.length) return null
  const debut = Math.min(...avecHeure.map((s) => minutes(s.debut)))
  const fin = Math.max(...avecHeure.map((s) => minutes(s.fin)))
  const total = Math.max(fin - debut, 1)
  const pos = (m: number) => `${((m - debut) / total) * 100}%`
  const heures: number[] = []
  for (let h = Math.ceil(debut / 60) * 60; h <= fin; h += 60) heures.push(h)

  return (
    <div className="select-none">
      <div className="relative h-14 overflow-hidden rounded-2xl bg-white shadow-doux">
        {avecHeure.map((s) => {
          const m = matiere(s.matiere)
          const largeur = ((minutes(s.fin) - minutes(s.debut)) / total) * 100
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onChoisir?.(s)}
              title={`${fmtHeure(s.debut)} · ${s.titre}`}
              className="absolute inset-y-1.5 rounded-xl transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-encre"
              style={{
                left: `calc(${pos(minutes(s.debut))} + 2px)`, width: `calc(${largeur}% - 4px)`,
                background: s.statut === 'non_faite' ? `repeating-linear-gradient(45deg, ${m.fond}, ${m.fond} 6px, #fff 6px, #fff 12px)` : m.couleur,
                opacity: s.statut === 'faite' ? 0.55 : 1,
              }}
            >
              {largeur > 7 && (
                <m.icone className="mx-auto size-5" style={{ color: s.statut === 'non_faite' ? m.couleur : '#fff' }} strokeWidth={2.4} />
              )}
            </button>
          )
        })}
        {maintenant != null && maintenant >= debut && maintenant <= fin && (
          <div className="pointer-events-none absolute inset-y-0 w-1 -translate-x-1/2 rounded-full bg-encre" style={{ left: pos(maintenant) }}>
            <span className="absolute -top-0 left-1/2 size-3 -translate-x-1/2 rounded-full border-2 border-white bg-encre" />
          </div>
        )}
      </div>
      <div className="relative mt-1 h-4 text-[11px] font-semibold text-brume">
        {heures.map((h) => (
          <span key={h} className="absolute -translate-x-1/2" style={{ left: pos(h) }}>{h / 60}h</span>
        ))}
      </div>
    </div>
  )
}
