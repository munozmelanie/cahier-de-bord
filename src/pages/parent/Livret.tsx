import { CalendarX2, Flag, GraduationCap, HandHelping, ListChecks, Quote } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ABREV, bilansDe, DOMAINE_COURT, ICONE_LSU, lignesElements, NOM_COURT_LSU } from '../../components/lsu/outils'
import { Chargement, Onglets, Vide } from '../../components/ui'
import { useLsuClasse, useTable } from '../../lib/donnees'
import { LSU, NIVEAUX, matiere, niveau } from '../../lib/matieres'
import { useSession } from '../../lib/session'
import type { LsuBilan } from '../../lib/types'

/** Pastille ronde d'un niveau (NA, PA, A, D), nom complet en infobulle */
function Pastille({ v }: { v: number }) {
  const n = niveau(v)
  if (!n) return null
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-full font-titre text-sm font-semibold text-white shadow-sm"
      style={{ background: n.couleur }} title={n.nom} aria-label={n.nom}>
      {ABREV[n.v]}
    </span>
  )
}

export default function Livret() {
  const { enfant, classe } = useSession()
  const tousBilans = useMemo(() => bilansDe(classe?.reglages), [classe?.reglages])
  const livrets = useTable<LsuBilan>('lsu_bilans', ['famille', enfant?.id], (q) => q.eq('eleve_id', enfant!.id), !!enfant)
  const [ouverts, setOuverts] = useState<Record<string, boolean>>({})

  // Bilans publiés, du plus récent au plus ancien
  const publies = useMemo(() => {
    const ordre = new Map(tousBilans.map((b, i) => [b.id, i]))
    return (livrets.data ?? []).filter((l) => l.publie).sort((a, b) => (ordre.get(b.bilan) ?? 0) - (ordre.get(a.bilan) ?? 0))
  }, [livrets.data, tousBilans])
  const [choix, setChoix] = useState<string | null>(null)
  const livret = publies.find((l) => l.bilan === choix) ?? publies[0]
  const bilan = tousBilans.find((b) => b.id === livret?.bilan)
  const elements = useLsuClasse(livret?.bilan ?? '')

  if (livrets.isLoading) return <Chargement />
  if (!livret) return <Vide icone={GraduationCap} texte="Pas encore de livret" />

  const el = elements.data?.[0]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {publies.length > 1 ? (
          <Onglets valeur={livret.bilan} onChange={setChoix}
            options={publies.map((l) => ({ id: l.bilan, label: tousBilans.find((b) => b.id === l.bilan)?.nom ?? l.bilan }))} />
        ) : (
          <span className="inline-flex items-center gap-2 rounded-full bg-encre px-3 py-1.5 text-sm font-bold text-white">
            <GraduationCap className="size-4" /> {bilan?.nom ?? livret.bilan}
          </span>
        )}
        {livret.absences != null && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 font-titre text-lg font-semibold text-alerte shadow-doux"
            title="Demi-journées d'absence">
            <CalendarX2 className="size-5" /> {livret.absences}
          </span>
        )}
      </div>

      {/* Légende : une pastille par niveau */}
      <div className="grid grid-cols-4 gap-1.5">
        {NIVEAUX.map((n) => (
          <span key={n.v} className="flex flex-col items-center gap-1 rounded-2xl py-2 text-center text-[11px] font-bold leading-tight" style={{ background: n.fond, color: n.couleur }}>
            <Pastille v={n.v} />
            {n.court}
          </span>
        ))}
      </div>

      {livret.appreciation_generale?.trim() && (
        <section className="flex gap-3 rounded-3xl bg-bateau p-4 text-white shadow-doux" aria-label="Appréciation générale">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-white/20"><Quote className="size-5" /></span>
          <p className="whitespace-pre-line text-lg leading-relaxed">{livret.appreciation_generale}</p>
        </section>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {LSU.map((m) => {
          const app = livret.appreciations?.[m.id]?.trim()
          const doms = m.domaines.filter((d) => livret.positions?.[d.id])
          if (!app && !doms.length) return null
          const mat = matiere(ICONE_LSU[m.id])
          const Icone = mat.icone
          const unSeul = m.domaines.length === 1
          const travaille = lignesElements(el?.elements?.[m.id])
          return (
            <section key={m.id} className="flex flex-col gap-3 rounded-[26px] p-4" style={{ background: mat.fond }} aria-label={m.nom}>
              <div className="flex items-center gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm" style={{ color: mat.couleur }}>
                  <Icone className="size-6" strokeWidth={2.2} />
                </span>
                <span className="min-w-0 flex-1 truncate font-titre text-lg font-semibold text-encre" title={m.nom}>{NOM_COURT_LSU[m.id] ?? m.nom}</span>
                {unSeul && doms[0] && <Pastille v={livret.positions[doms[0].id]} />}
                {travaille.length > 0 && (
                  <button type="button" onClick={() => setOuverts((o) => ({ ...o, [m.id]: !o[m.id] }))} aria-expanded={!!ouverts[m.id]}
                    aria-label="Ce qui a été travaillé" title="Ce qui a été travaillé"
                    className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/70 transition hover:bg-white" style={{ color: mat.couleur }}>
                    <ListChecks className="size-5" />
                  </button>
                )}
              </div>
              {!unSeul && doms.length > 0 && (
                <ul className="flex flex-col gap-2">
                  {doms.map((d) => (
                    <li key={d.id} className="flex items-center justify-between gap-3">
                      <span className="min-w-0 text-sm font-bold" style={{ color: mat.couleur }} title={d.nom}>{DOMAINE_COURT[d.id] ?? d.nom}</span>
                      <Pastille v={livret.positions[d.id]} />
                    </li>
                  ))}
                </ul>
              )}
              {app && <p className="whitespace-pre-line rounded-2xl bg-white/90 px-3 py-2.5 leading-relaxed text-encre">{app}</p>}
              {travaille.length > 0 && ouverts[m.id] && (
                <ul className="flex flex-col gap-1 text-sm font-bold leading-snug" style={{ color: mat.couleur }}>
                  {travaille.map((t, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full" style={{ background: mat.couleur }} />
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )
        })}
      </div>

      {livret.accompagnement?.trim() && (
        <section className="flex gap-3 rounded-3xl bg-white p-4 shadow-doux" aria-label="Accompagnement">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-ambre-clair text-ambre-fonce"><HandHelping className="size-5" /></span>
          <p className="whitespace-pre-line text-encre">{livret.accompagnement}</p>
        </section>
      )}
      {el?.projets?.trim() && (
        <section className="flex gap-3 rounded-3xl bg-white p-4 shadow-doux" aria-label="Projets de la classe">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-succes-clair text-succes"><Flag className="size-5" /></span>
          <p className="whitespace-pre-line text-encre">{el.projets}</p>
        </section>
      )}
    </div>
  )
}
