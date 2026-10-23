import clsx from 'clsx'
import { Wand2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Bouton, Saisie, Texte } from '../ui'
import { useEcrire } from '../../lib/donnees'
import { LSU, matiere, type MatiereLsu } from '../../lib/matieres'
import { MODE_DEMO } from '../../lib/supabase'
import type { Eleve, LsuBilan } from '../../lib/types'
import { EtatEnregistrement } from '../evaluations/EtatEnregistrement'
import { EnteteNiveaux, LigneNiveaux } from './Niveaux'
import { ICONE_LSU, useEnregistrementDiffere } from './outils'

type Brouillon = Pick<LsuBilan, 'positions' | 'appreciations' | 'appreciation_generale' | 'absences' | 'accompagnement'>

const CHAMP_DOUX = 'border-transparent bg-papier hover:border-trait focus:bg-white'

/**
 * Livret d'un élève pour un bilan, présenté comme le bilan périodique du LSU :
 * une ligne par sous-domaine, quatre colonnes de positionnement, une appréciation par matière.
 * Monté avec key = élève : changer d'élève enregistre ce qui attend.
 */
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
      <div className="flex flex-wrap items-center gap-3">
        {entete}
        <div className="ml-auto flex items-center gap-3">
          {aValider.length > 0 && (
            <Bouton variante="doux" taille="s" icone={Wand2} onClick={toutValider} title="Reprendre les niveaux calculés d'après les évaluations">
              Valider {aValider.length} proposition{aValider.length > 1 ? 's' : ''}
            </Bouton>
          )}
          <EtatEnregistrement etat={etat} />
        </div>
      </div>

      {/* Noms des colonnes, toujours visibles en défilant */}
      <div className={clsx('sticky z-10 -mb-2 flex items-center rounded-2xl bg-papier/95 px-4 py-2 backdrop-blur', MODE_DEMO ? 'top-9' : 'top-0')}>
        <span className="hidden flex-1 text-xs font-semibold text-brume sm:block">Objectifs d'apprentissage</span>
        <EnteteNiveaux />
      </div>

      {LSU.map((m) => (
        <Matiere key={m.id} m={m} b={b} proposees={proposees} position={position}
          appreciation={(t) => maj({ appreciations: { ...b.appreciations, [m.id]: t } })} />
      ))}

      <section className="flex flex-col gap-4 rounded-3xl bg-white p-4 shadow-doux" aria-label="Bilan de la période">
        <h3 className="text-[15px] font-semibold text-encre">Bilan de la période</h3>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm text-brume">Appréciation générale</span>
          <Texte rows={3} className={CHAMP_DOUX} value={b.appreciation_generale ?? ''}
            onChange={(e) => maj({ appreciation_generale: e.target.value })} />
        </label>
        <div className="grid gap-4 sm:grid-cols-[13rem_1fr]">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-brume">Absences (demi-journées)</span>
            <Saisie type="number" inputMode="numeric" min={0} value={b.absences ?? ''} placeholder="0" className={CHAMP_DOUX}
              onChange={(e) => maj({ absences: e.target.value === '' ? null : Math.max(0, Number(e.target.value)) })} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-brume">Accompagnement</span>
            <Saisie value={b.accompagnement ?? ''} placeholder="PPRE, PAP, PPS…" className={CHAMP_DOUX}
              onChange={(e) => maj({ accompagnement: e.target.value })} />
          </label>
        </div>
      </section>
    </div>
  )
}

function Matiere({ m, b, proposees, position, appreciation }: {
  m: MatiereLsu; b: Brouillon; proposees: Record<string, number>
  position: (d: string, v: number | undefined) => void; appreciation: (t: string) => void
}) {
  const couleur = matiere(ICONE_LSU[m.id]).couleur
  const unSeul = m.domaines.length === 1
  const titre = (
    <h3 className="flex min-w-0 flex-1 items-center gap-2.5 text-[15px] font-semibold text-encre">
      <span className="size-2.5 shrink-0 rounded-full" style={{ background: couleur }} />
      {m.nom}
    </h3>
  )
  return (
    <section className="overflow-hidden rounded-3xl bg-white shadow-doux" aria-label={m.nom}>
      {unSeul ? (
        <div className="flex flex-col gap-1 px-4 py-2 sm:flex-row sm:items-center">
          <div className="flex-1 py-1.5">{titre}</div>
          <LigneNiveaux label={m.nom} valeur={b.positions[m.domaines[0].id]} proposition={proposees[m.domaines[0].id]}
            onChange={(v) => position(m.domaines[0].id, v)} />
        </div>
      ) : (
        <>
          <div className="px-4 pb-1 pt-3.5">{titre}</div>
          {m.domaines.map((d) => (
            <div key={d.id} className="flex flex-col gap-0.5 px-4 py-1 sm:flex-row sm:items-center">
              <span className="min-w-0 flex-1 pl-5 pt-1.5 text-sm text-encre/85 sm:pt-0">{d.nom}</span>
              <LigneNiveaux label={d.nom} valeur={b.positions[d.id]} proposition={proposees[d.id]} onChange={(v) => position(d.id, v)} />
            </div>
          ))}
        </>
      )}
      <div className="px-4 pb-3.5 pt-1">
        <Texte rows={1} aria-label={`Appréciation en ${m.nom}`} placeholder="Appréciation" className={clsx(CHAMP_DOUX, 'text-[15px]')}
          value={b.appreciations[m.id] ?? ''} onChange={(e) => appreciation(e.target.value)} />
      </div>
    </section>
  )
}
