import { Pencil, Wand2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Bouton, Saisie, Texte } from '../ui'
import { useEcrire } from '../../lib/donnees'
import type { BilanLsu, Classe, Eleve, LsuBilan, LsuClasse } from '../../lib/types'
import { EtatEnregistrement } from '../evaluations/EtatEnregistrement'
import { BilanLivret, EnTeteLivret, TableauLivret } from './Document'
import { useEnregistrementDiffere } from './outils'

type Brouillon = Pick<LsuBilan, 'positions' | 'appreciation_generale' | 'accompagnement'>

/**
 * Livret d'un élève pour un bilan, présenté comme le bilan périodique du LSU.
 * Monté avec key = élève : changer d'élève enregistre ce qui attend.
 */
export function FicheEleve({ classe, bilan, nbBilans, eleve, ligne, classeLsu, proposees, entete, onModifierParcours }: {
  classe: Classe
  bilan: BilanLsu
  nbBilans: number
  eleve: Eleve
  ligne: LsuBilan | undefined
  classeLsu: LsuClasse | undefined
  proposees: Record<string, number>
  entete?: ReactNode
  onModifierParcours: () => void
}) {
  const ecrire = useEcrire()
  const [b, setB] = useState<Brouillon>(() => ({
    positions: ligne?.positions ?? {},
    appreciation_generale: ligne?.appreciation_generale ?? '',
    accompagnement: ligne?.accompagnement ?? '',
  }))

  const { planifier, etat } = useEnregistrementDiffere<Brouillon>((v) =>
    ecrire.mutateAsync({
      op: 'upsert', table: 'lsu_bilans', onConflict: 'eleve_id,bilan',
      ligne: { classe_id: classe.id, eleve_id: eleve.id, bilan: bilan.id, ...v },
    }),
  )

  const maj = (patch: Partial<Brouillon>) => setB((avant) => {
    const apres = { ...avant, ...patch }
    planifier(apres)
    return apres
  })
  const position = (cle: string, v: number | undefined) => {
    const p = { ...b.positions }
    if (v === undefined) delete p[cle]
    else p[cle] = v
    maj({ positions: p })
  }
  const aValider = Object.entries(proposees).filter(([cle]) => !b.positions[cle])
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

      {/* Le livret, comme la feuille officielle */}
      <article className="flex flex-col gap-5 rounded-2xl bg-white p-4 shadow-doux sm:p-6">
        <EnTeteLivret classe={classe} bilan={bilan} eleve={eleve} nbBilans={nbBilans} />
        <TableauLivret classeLsu={classeLsu} positions={b.positions} proposees={proposees} onPosition={position} />
        <BilanLivret
          classe={classe}
          directeur={classe.reglages?.directeur_nom}
          projets={classeLsu?.projets}
          publieLe={ligne?.publie ? ligne.publie_le : null}
          vuLe={ligne?.vu_le}
          actionParcours={<Bouton variante="fantome" taille="s" icone={Pencil} onClick={onModifierParcours}>Modifier</Bouton>}
          appreciation={
            <Texte rows={3} aria-label="Appréciation générale" placeholder="Écrire l'appréciation générale…" value={b.appreciation_generale ?? ''}
              className="border-transparent bg-papier hover:border-trait focus:bg-white" onChange={(e) => maj({ appreciation_generale: e.target.value })} />
          }
          accompagnement={
            <label className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-brume">Accompagnement (facultatif)</span>
              <Saisie value={b.accompagnement ?? ''} placeholder="PPRE, PAP, PPS…" className="w-auto min-w-0 flex-1 border-transparent bg-papier py-1.5 hover:border-trait focus:bg-white"
                onChange={(e) => maj({ accompagnement: e.target.value })} />
            </label>
          }
        />
      </article>
    </div>
  )
}
