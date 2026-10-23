import { Save } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Bouton, Champ, Feuille, PastilleMatiere, Texte, useToast } from '../ui'
import { useEcrire } from '../../lib/donnees'
import { LSU } from '../../lib/matieres'
import type { LsuClasse } from '../../lib/types'
import { ICONE_LSU } from './outils'

/** Éléments du programme travaillés (communs à la classe) et projets du bilan */
export function ElementsClasse({ ouverte, onFermer, classeId, bilan, actuel }: {
  ouverte: boolean; onFermer: () => void; classeId: string; bilan: string; actuel: LsuClasse | undefined
}) {
  const ecrire = useEcrire()
  const toast = useToast()
  const [elements, setElements] = useState<Record<string, string>>({})
  const [projets, setProjets] = useState('')

  useEffect(() => {
    if (!ouverte) return
    setElements(actuel?.elements ?? {})
    setProjets(actuel?.projets ?? '')
  }, [ouverte, actuel])

  async function enregistrer() {
    try {
      await ecrire.mutateAsync({
        op: 'upsert', table: 'lsu_classe', onConflict: 'classe_id,bilan',
        ligne: { classe_id: classeId, bilan, elements, projets: projets.trim() || null },
      })
      toast('Éléments enregistrés')
      onFermer()
    } catch (e) {
      toast((e as Error).message, 'erreur')
    }
  }

  return (
    <Feuille ouverte={ouverte} onFermer={onFermer} titre="Éléments du programme travaillés" large
      pied={<>
        <Bouton variante="secondaire" onClick={onFermer}>Annuler</Bouton>
        <Bouton icone={Save} onClick={enregistrer} enCours={ecrire.isPending}>Enregistrer</Bouton>
      </>}>
      <div className="flex flex-col gap-4">
        {LSU.map((m) => (
          <div key={m.id} className="flex items-start gap-3">
            <span className="pt-7"><PastilleMatiere id={ICONE_LSU[m.id]} taille="s" /></span>
            <div className="flex-1">
              <Champ label={m.nom}>
                {(id) => <Texte id={id} value={elements[m.id] ?? ''} onChange={(e) => setElements({ ...elements, [m.id]: e.target.value })} />}
              </Champ>
            </div>
          </div>
        ))}
        <Champ label="Projets et parcours">{(id) => <Texte id={id} value={projets} onChange={(e) => setProjets(e.target.value)} />}</Champ>
      </div>
    </Feuille>
  )
}
