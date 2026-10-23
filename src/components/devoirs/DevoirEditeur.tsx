import { Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useEcrire } from '../../lib/donnees'
import { semaineSuivante } from '../../lib/dates'
import { useClasse } from '../../lib/session'
import type { Devoir, TypeDevoir } from '../../lib/types'
import { Bouton, Champ, ChoixMatiere, Feuille, Texte, useToast } from '../ui'
import { ChoixPourLe, ChoixType } from './devoirsOutils'

type Brouillon = Partial<Devoir> & { donne_le: string }

/** Ajouter ou modifier un devoir. `base` = valeurs de départ (date donnée, matière, séance…) */
export function DevoirEditeur({ base, onFermer }: { base: Brouillon | null; onFermer: () => void }) {
  const classe = useClasse()
  const ecrire = useEcrire()
  const toast = useToast()
  const [d, setD] = useState<Brouillon | null>(base)
  useEffect(() => {
    setD(base ? { type: 'travail', pour_le: semaineSuivante(base.donne_le, classe.reglages), ...base } : null)
  }, [base, classe.reglages])
  if (!d) return null
  const maj = (p: Partial<Devoir>) => setD({ ...d, ...p })

  async function enregistrer() {
    if (!d || !d.texte?.trim()) return
    const ligne = {
      classe_id: classe.id, donne_le: d.donne_le, pour_le: d.pour_le!, matiere: d.matiere ?? null,
      texte: d.texte.trim(), type: (d.type ?? 'travail') as TypeDevoir, seance_id: d.seance_id ?? null,
    }
    try {
      if (d.id) await ecrire.mutateAsync({ op: 'update', table: 'devoirs', id: d.id, patch: ligne })
      else await ecrire.mutateAsync({ op: 'insert', table: 'devoirs', ligne })
      toast(d.id ? 'Devoir modifié' : 'Devoir ajouté')
      onFermer()
    } catch (e) { toast((e as Error).message, 'erreur') }
  }
  async function supprimer() {
    if (!d?.id) return
    await ecrire.mutateAsync({ op: 'delete', table: 'devoirs', id: d.id })
    toast('Devoir supprimé'); onFermer()
  }

  return (
    <Feuille ouverte onFermer={onFermer} titre={d.id ? 'Devoir' : 'Nouveau devoir'}
      pied={<>
        {d.id && <Bouton variante="fantome" icone={Trash2} onClick={supprimer} className="mr-auto text-alerte">Supprimer</Bouton>}
        <Bouton variante="secondaire" onClick={onFermer}>Annuler</Bouton>
        <Bouton onClick={enregistrer} enCours={ecrire.isPending} disabled={!d.texte?.trim()}>Enregistrer</Bouton>
      </>}>
      <div className="flex flex-col gap-4">
        <Champ label="Devoir">{(id) => <Texte id={id} autoFocus value={d.texte ?? ''} onChange={(e) => maj({ texte: e.target.value })} />}</Champ>
        <Champ label="Pour le">{() => <ChoixPourLe donneLe={d.donne_le} valeur={d.pour_le!} onChange={(v) => maj({ pour_le: v })} reglages={classe.reglages} />}</Champ>
        <Champ label="Type">{() => <ChoixType valeur={(d.type ?? 'travail') as TypeDevoir} onChange={(t) => maj({ type: t })} />}</Champ>
        <Champ label="Matière">{() => <ChoixMatiere valeur={d.matiere ?? null} onChange={(m) => maj({ matiere: m })} />}</Champ>
      </div>
    </Feuille>
  )
}
