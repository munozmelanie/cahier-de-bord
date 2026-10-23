import { CalendarX2, GraduationCap } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ABREV, bilansDe, ICONE_LSU } from '../../components/lsu/outils'
import { Chargement, Entete, Onglets, PastilleMatiere, Vide } from '../../components/ui'
import { fmtJourCourt } from '../../lib/dates'
import { useLsuClasse, useTable } from '../../lib/donnees'
import { LSU, NIVEAUX, niveau } from '../../lib/matieres'
import { useSession } from '../../lib/session'
import type { LsuBilan } from '../../lib/types'

export default function Livret() {
  const { enfant, classe } = useSession()
  const tousBilans = useMemo(() => bilansDe(classe?.reglages), [classe?.reglages])
  const livrets = useTable<LsuBilan>('lsu_bilans', ['famille', enfant?.id], (q) => q.eq('eleve_id', enfant!.id), !!enfant)

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
  if (!livret) {
    return (
      <div>
        <Entete titre="Livret" />
        <Vide icone={GraduationCap} texte="Aucun livret publié pour l'instant." />
      </div>
    )
  }

  const el = elements.data?.[0]

  return (
    <div className="flex flex-col gap-4">
      <Entete
        titre="Livret"
        sousTitre={bilan ? `${bilan.nom} · du ${fmtJourCourt(bilan.debut)} au ${fmtJourCourt(bilan.fin)}` : livret.bilan}
      />
      {publies.length > 1 && (
        <Onglets valeur={livret.bilan} onChange={setChoix}
          options={publies.map((l) => ({ id: l.bilan, label: tousBilans.find((b) => b.id === l.bilan)?.nom ?? l.bilan }))} />
      )}

      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        {NIVEAUX.map((n) => (
          <span key={n.v} className="flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-bold" style={{ background: n.fond, color: n.couleur }}>
            <span className="flex size-6 shrink-0 items-center justify-center rounded-lg font-titre text-[11px] text-white" style={{ background: n.couleur }}>{ABREV[n.v]}</span>
            {n.court}
          </span>
        ))}
      </div>

      {livret.appreciation_generale?.trim() && (
        <section className="rounded-3xl bg-bateau p-5 text-white shadow-doux">
          <p className="mb-1 text-sm font-bold text-white/80">Appréciation générale</p>
          <p className="whitespace-pre-line text-lg leading-relaxed">{livret.appreciation_generale}</p>
        </section>
      )}

      {LSU.map((m) => {
        const app = livret.appreciations?.[m.id]?.trim()
        const doms = m.domaines.filter((d) => livret.positions?.[d.id])
        if (!app && !doms.length) return null
        return (
          <section key={m.id} className="flex flex-col gap-3 rounded-3xl bg-white p-4 shadow-doux">
            <h2 className="flex items-center gap-2 font-titre text-lg font-semibold text-encre">
              <PastilleMatiere id={ICONE_LSU[m.id]} taille="s" /> {m.nom}
            </h2>
            {doms.length > 0 && (
              <ul className="flex flex-col gap-2">
                {doms.map((d) => {
                  const n = niveau(livret.positions[d.id])!
                  return (
                    <li key={d.id} className="flex items-center justify-between gap-3">
                      <span className="min-w-0 text-sm text-encre">{m.domaines.length > 1 ? d.nom : 'Positionnement'}</span>
                      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold" style={{ background: n.fond, color: n.couleur }}>
                        <span className="size-2.5 rounded-full" style={{ background: n.couleur }} />
                        {n.court}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
            {app && <p className="whitespace-pre-line rounded-2xl bg-papier px-3 py-2.5 leading-relaxed text-encre">{app}</p>}
            {el?.elements?.[m.id]?.trim() && <p className="text-xs text-brume">Travaillé : {el.elements[m.id]}</p>}
          </section>
        )
      })}

      <div className="flex flex-wrap gap-3">
        <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm font-bold text-encre shadow-doux">
          <CalendarX2 className="size-4 text-brume" />
          {livret.absences ?? 0} demi-journée{(livret.absences ?? 0) > 1 ? 's' : ''} d'absence
        </span>
      </div>
      {livret.accompagnement?.trim() && (
        <section className="rounded-3xl bg-white p-4 shadow-doux">
          <p className="mb-1 text-sm font-bold text-brume">Accompagnement</p>
          <p className="whitespace-pre-line text-encre">{livret.accompagnement}</p>
        </section>
      )}
      {el?.projets?.trim() && (
        <section className="rounded-3xl bg-white p-4 shadow-doux">
          <p className="mb-1 text-sm font-bold text-brume">Projets de la classe</p>
          <p className="whitespace-pre-line text-encre">{el.projets}</p>
        </section>
      )}
    </div>
  )
}
