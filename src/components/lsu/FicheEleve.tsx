import { CheckCheck } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Bouton, Champ, PastilleMatiere, Saisie, Texte } from '../ui'
import { useEcrire } from '../../lib/donnees'
import { LSU } from '../../lib/matieres'
import type { Eleve, LsuBilan } from '../../lib/types'
import { EtatEnregistrement } from '../evaluations/EtatEnregistrement'
import { ChoixNiveau } from './ChoixNiveau'
import { ICONE_LSU, useEnregistrementDiffere } from './outils'

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
        <div className="flex flex-wrap items-center gap-3">
          {aValider.length > 0 && (
            <Bouton variante="doux" taille="s" icone={CheckCheck} onClick={toutValider}>
              Valider les propositions ({aValider.length})
            </Bouton>
          )}
          <EtatEnregistrement etat={etat} />
        </div>
      </div>

      <div className="grid items-start gap-3 lg:grid-cols-2">
        {LSU.map((m) => (
          <section key={m.id} className="flex flex-col gap-3 rounded-3xl bg-white p-4 shadow-doux">
            <h3 className="flex items-center gap-2 font-titre text-lg font-semibold text-encre">
              <PastilleMatiere id={ICONE_LSU[m.id]} taille="s" /> {m.nom}
            </h3>
            {m.domaines.map((d) => (
              <div key={d.id} className="flex flex-col gap-1.5">
                {m.domaines.length > 1 && <p className="text-sm font-bold text-brume">{d.nom}</p>}
                <ChoixNiveau label={d.nom} valeur={b.positions[d.id]} proposition={proposees[d.id]} onChange={(v) => position(d.id, v)} />
              </div>
            ))}
            <Texte
              aria-label={`Appréciation en ${m.nom}`}
              placeholder="Appréciation"
              value={b.appreciations[m.id] ?? ''}
              onChange={(e) => maj({ appreciations: { ...b.appreciations, [m.id]: e.target.value } })}
            />
          </section>
        ))}
      </div>

      <section className="flex flex-col gap-4 rounded-3xl bg-white p-4 shadow-doux">
        <Champ label="Appréciation générale">
          {(id) => <Texte id={id} rows={3} value={b.appreciation_generale ?? ''} onChange={(e) => maj({ appreciation_generale: e.target.value })} />}
        </Champ>
        <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
          <Champ label="Absences" aide="En demi-journées">
            {(id) => (
              <Saisie id={id} type="number" inputMode="numeric" min={0} value={b.absences ?? ''}
                onChange={(e) => maj({ absences: e.target.value === '' ? null : Math.max(0, Number(e.target.value)) })} />
            )}
          </Champ>
          <Champ label="Accompagnement" aide="Facultatif">
            {(id) => <Saisie id={id} value={b.accompagnement ?? ''} onChange={(e) => maj({ accompagnement: e.target.value })} />}
          </Champ>
        </div>
      </section>
    </div>
  )
}
