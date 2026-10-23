import { ChevronDown, GraduationCap } from 'lucide-react'
import { useMemo, useState } from 'react'
import { EtiquetteNiveau } from '../../components/lsu/Niveaux'
import { bilansDe, ICONE_LSU, lignesElements } from '../../components/lsu/outils'
import { Chargement, Onglets, Vide } from '../../components/ui'
import { useLsuClasse, useTable } from '../../lib/donnees'
import { LSU, matiere } from '../../lib/matieres'
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
  if (!livret) return <Vide icone={GraduationCap} texte="Le livret apparaîtra ici quand il sera publié" />

  const el = elements.data?.[0]
  const accompagnement = livret.accompagnement?.trim()

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-encre">Livret</h1>
          <p className="mt-0.5 text-sm text-brume">{bilan?.nom ?? livret.bilan}</p>
        </div>
        {publies.length > 1 && (
          <Onglets valeur={livret.bilan} onChange={setChoix} options={publies.map((l) => ({ id: l.bilan, label: l.bilan }))} />
        )}
      </div>

      {livret.appreciation_generale?.trim() && (
        <section className="rounded-3xl bg-white p-5 shadow-doux" aria-label="Appréciation générale">
          <h2 className="mb-2 text-sm font-semibold text-brume">Appréciation générale</h2>
          <p className="whitespace-pre-line text-[17px] leading-relaxed text-encre">{livret.appreciation_generale}</p>
          {(livret.absences != null || accompagnement) && (
            <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2 border-t border-trait pt-3 text-sm">
              {livret.absences != null && <div><dt className="text-brume">Absences</dt><dd className="font-semibold text-encre">{livret.absences} demi-journée{livret.absences > 1 ? 's' : ''}</dd></div>}
              {accompagnement && <div><dt className="text-brume">Accompagnement</dt><dd className="font-semibold text-encre">{accompagnement}</dd></div>}
            </dl>
          )}
        </section>
      )}

      {LSU.map((m) => {
        const app = livret.appreciations?.[m.id]?.trim()
        const doms = m.domaines.filter((d) => livret.positions?.[d.id])
        if (!app && !doms.length) return null
        const couleur = matiere(ICONE_LSU[m.id]).couleur
        const unSeul = m.domaines.length === 1
        const travaille = lignesElements(el?.elements?.[m.id])
        return (
          <section key={m.id} className="rounded-3xl bg-white shadow-doux" aria-label={m.nom}>
            <div className="flex items-center gap-3 px-4 pb-2 pt-4">
              <h2 className="flex min-w-0 flex-1 items-center gap-2.5 font-semibold text-encre">
                <span className="size-2.5 shrink-0 rounded-full" style={{ background: couleur }} />{m.nom}
              </h2>
              {unSeul && doms[0] && <EtiquetteNiveau v={livret.positions[doms[0].id]} />}
            </div>
            {!unSeul && doms.length > 0 && (
              <ul className="px-4">
                {doms.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-3 border-t border-trait/70 py-2 first:border-t-0">
                    <span className="min-w-0 pl-5 text-sm text-encre/85">{d.nom}</span>
                    <EtiquetteNiveau v={livret.positions[d.id]} />
                  </li>
                ))}
              </ul>
            )}
            {app && <p className="whitespace-pre-line px-4 pb-1 pl-9 pt-1 leading-relaxed text-encre">{app}</p>}
            {travaille.length > 0 ? (
              <details className="group px-4 pb-3 pt-1">
                <summary className="ml-5 inline-flex cursor-pointer list-none items-center gap-1 text-sm font-semibold text-bateau [&::-webkit-details-marker]:hidden">
                  Ce qui a été travaillé <ChevronDown className="size-4 transition group-open:rotate-180" />
                </summary>
                <ul className="ml-5 mt-2 flex flex-col gap-1.5 text-sm leading-snug text-encre/80">
                  {travaille.map((t, i) => (
                    <li key={i} className="flex items-start gap-2"><span className="mt-[7px] size-1 shrink-0 rounded-full bg-brume" />{t}</li>
                  ))}
                </ul>
              </details>
            ) : <div className="pb-3" />}
          </section>
        )
      })}

      {!livret.appreciation_generale?.trim() && (livret.absences != null || accompagnement) && (
        <section className="rounded-3xl bg-white p-4 text-sm shadow-doux">
          {livret.absences != null && <p><span className="text-brume">Absences : </span><b>{livret.absences}</b> demi-journée{livret.absences > 1 ? 's' : ''}</p>}
          {accompagnement && <p><span className="text-brume">Accompagnement : </span><b>{accompagnement}</b></p>}
        </section>
      )}
      {el?.projets?.trim() && (
        <section className="rounded-3xl bg-white p-4 shadow-doux" aria-label="Projets de la classe">
          <h2 className="mb-1.5 text-sm font-semibold text-brume">Projets et parcours de la classe</h2>
          <p className="whitespace-pre-line text-encre">{el.projets}</p>
        </section>
      )}
    </div>
  )
}
