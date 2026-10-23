import { CalendarX2, CheckCheck, HandHelping, Quote } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Saisie, Texte } from '../ui'
import { useEcrire } from '../../lib/donnees'
import { LSU, matiere } from '../../lib/matieres'
import type { Eleve, LsuBilan } from '../../lib/types'
import { EtatEnregistrement } from '../evaluations/EtatEnregistrement'
import { ChoixNiveau } from './ChoixNiveau'
import { DOMAINE_COURT, ICONE_LSU, NOM_COURT_LSU, useEnregistrementDiffere } from './outils'

type Brouillon = Pick<LsuBilan, 'positions' | 'appreciations' | 'appreciation_generale' | 'absences' | 'accompagnement'>

/** Livret d'un élève pour un bilan. Monté avec key = élève : changer d'élève enregistre ce qui attend. */
export function FicheEleve({ classeId, eleve, bilan, ligne, proposees, entete }: {
  classeId: string
  eleve: Eleve
  bilan: string
  ligne: LsuBilan | undefined
  proposees: Record<string, number>
  entete?: ReactNode
}) {
  const ecrire = useEcrire()
  const [b, setB] = useState<Brouillon>(() => ({
    positions: ligne?.positions ?? {},
    appreciations: ligne?.appreciations ?? {},
    appreciation_generale: ligne?.appreciation_generale ?? '',
    absences: ligne?.absences ?? null,
    accompagnement: ligne?.accompagnement ?? '',
  }))

  const { planifier, etat } = useEnregistrementDiffere<Brouillon>((v) =>
    ecrire.mutateAsync({
      op: 'upsert', table: 'lsu_bilans', onConflict: 'eleve_id,bilan',
      ligne: { classe_id: classeId, eleve_id: eleve.id, bilan, ...v },
    }),
  )

  const maj = (patch: Partial<Brouillon>) => setB((avant) => {
    const apres = { ...avant, ...patch }
    planifier(apres)
    return apres
  })
  const position = (d: string, v: number | undefined) => {
    const p = { ...b.positions }
    if (v === undefined) delete p[d]
    else p[d] = v
    maj({ positions: p })
  }
  const aValider = Object.entries(proposees).filter(([d]) => !b.positions[d])
  const toutValider = () => maj({ positions: { ...Object.fromEntries(aValider), ...b.positions } })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {entete}
        <div className="flex items-center gap-2">
          {aValider.length > 0 && (
            <button type="button" onClick={toutValider} title="Valider les propositions" aria-label={`Valider les ${aValider.length} propositions`}
              className="relative flex size-10 items-center justify-center rounded-full bg-bateau-clair text-bateau transition hover:bg-bateau/15">
              <CheckCheck className="size-5" />
              <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-bateau px-1 text-center text-[11px] font-bold leading-5 text-white">{aValider.length}</span>
            </button>
          )}
          <EtatEnregistrement etat={etat} />
        </div>
      </div>

      <div className="grid items-start gap-3 lg:grid-cols-2">
        {LSU.map((m) => {
          const mat = matiere(ICONE_LSU[m.id])
          const Icone = mat.icone
          const unSeul = m.domaines.length === 1
          return (
            <section key={m.id} className="flex flex-col gap-3 rounded-[26px] p-4" style={{ background: mat.fond }} aria-label={m.nom}>
              <div className="flex items-center gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm" style={{ color: mat.couleur }}>
                  <Icone className="size-6" strokeWidth={2.2} />
                </span>
                <span className="min-w-0 flex-1 truncate font-titre text-lg font-semibold text-encre" title={m.nom}>{NOM_COURT_LSU[m.id] ?? m.nom}</span>
                {unSeul && (
                  <ChoixNiveau label={m.nom} valeur={b.positions[m.domaines[0].id]} proposition={proposees[m.domaines[0].id]} onChange={(v) => position(m.domaines[0].id, v)} />
                )}
              </div>
              {!unSeul && m.domaines.map((d) => (
                <div key={d.id} className="flex flex-wrap items-center justify-between gap-2">
                  <span className="min-w-0 text-sm font-bold" style={{ color: mat.couleur }} title={d.nom}>{DOMAINE_COURT[d.id] ?? d.nom}</span>
                  <ChoixNiveau label={d.nom} valeur={b.positions[d.id]} proposition={proposees[d.id]} onChange={(v) => position(d.id, v)} />
                </div>
              ))}
              <Texte
                aria-label={`Appréciation en ${m.nom}`}
                placeholder="Appréciation"
                className="border-transparent bg-white/90"
                value={b.appreciations[m.id] ?? ''}
                onChange={(e) => maj({ appreciations: { ...b.appreciations, [m.id]: e.target.value } })}
              />
            </section>
          )
        })}
      </div>

      <section className="flex flex-col gap-3 rounded-3xl bg-white p-4 shadow-doux" aria-label="Appréciation générale">
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-bateau-clair text-bateau"><Quote className="size-6" /></span>
          <Texte rows={3} aria-label="Appréciation générale" placeholder="Appréciation générale" value={b.appreciation_generale ?? ''}
            onChange={(e) => maj({ appreciation_generale: e.target.value })} />
        </div>
        <div className="grid gap-3 sm:grid-cols-[auto_1fr]">
          <label className="flex items-center gap-3" title="Absences (demi-journées)">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-alerte-clair text-alerte"><CalendarX2 className="size-6" /></span>
            <Saisie type="number" inputMode="numeric" min={0} value={b.absences ?? ''} aria-label="Absences en demi-journées" placeholder="0"
              className="w-24 text-center font-titre text-lg"
              onChange={(e) => maj({ absences: e.target.value === '' ? null : Math.max(0, Number(e.target.value)) })} />
          </label>
          <label className="flex items-center gap-3" title="Accompagnement (facultatif)">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-ambre-clair text-ambre-fonce"><HandHelping className="size-6" /></span>
            <Saisie value={b.accompagnement ?? ''} aria-label="Accompagnement" placeholder="Accompagnement" onChange={(e) => maj({ accompagnement: e.target.value })} />
          </label>
        </div>
      </section>
    </div>
  )
}
