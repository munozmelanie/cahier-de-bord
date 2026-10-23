import { Megaphone, Send, UserRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Bascule, Bouton, Champ, Feuille, Liste, Onglets, Saisie, Texte, useToast } from '../ui'
import { useEcrire } from '../../lib/donnees'
import type { Eleve } from '../../lib/types'

/** Écrire un nouveau mot : à toute la classe ou à une famille (enseignante) */
export function NouveauMotProf({ ouvert, onFermer, classeId, eleves, onEnvoye, eleveInitial }: {
  ouvert: boolean; onFermer: () => void; classeId: string; eleves: Eleve[]; onEnvoye: (id: string) => void; eleveInitial?: string | null
}) {
  const ecrire = useEcrire()
  const toast = useToast()
  const [cible, setCible] = useState<'classe' | 'famille'>('classe')
  const [eleveId, setEleveId] = useState('')
  const [titre, setTitre] = useState('')
  const [texte, setTexte] = useState('')
  const [aSigner, setASigner] = useState(false)

  useEffect(() => {
    if (!ouvert) return
    setCible(eleveInitial ? 'famille' : 'classe'); setEleveId(eleveInitial ?? ''); setTitre(''); setTexte(''); setASigner(false)
  }, [ouvert, eleveInitial])

  const pret = texte.trim() && (cible === 'classe' || eleveId)

  async function envoyer() {
    if (!pret) return
    try {
      const res = await ecrire.mutateAsync({
        op: 'insert', table: 'messages',
        ligne: { classe_id: classeId, eleve_id: cible === 'famille' ? eleveId : null, titre: titre.trim() || null, texte: texte.trim(), a_signer: aSigner },
      })
      const ligne = (res[0] as { id: string }[] | undefined)?.[0]
      toast('Mot envoyé')
      onFermer()
      if (ligne?.id) onEnvoye(ligne.id)
    } catch (e) {
      toast((e as Error).message, 'erreur')
    }
  }

  return (
    <Feuille ouverte={ouvert} onFermer={onFermer} titre="Nouveau mot"
      pied={<>
        <Bouton variante="secondaire" onClick={onFermer}>Annuler</Bouton>
        <Bouton icone={Send} onClick={envoyer} disabled={!pret} enCours={ecrire.isPending}>Envoyer</Bouton>
      </>}>
      <div className="flex flex-col gap-4">
        <Onglets valeur={cible} onChange={setCible} options={[
          { id: 'classe', label: 'Toute la classe', icone: Megaphone },
          { id: 'famille', label: 'Une famille', icone: UserRound },
        ]} />
        {cible === 'famille' && (
          <Champ label="Élève">
            {(id) => (
              <Liste id={id} value={eleveId} onChange={(e) => setEleveId(e.target.value)}>
                <option value="">Choisir…</option>
                {eleves.filter((e) => e.actif).map((e) => <option key={e.id} value={e.id}>{e.prenom}</option>)}
              </Liste>
            )}
          </Champ>
        )}
        <Champ label="Titre">{(id) => <Saisie id={id} value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="Sortie au musée" />}</Champ>
        <Champ label="Message">{(id) => <Texte id={id} value={texte} onChange={(e) => setTexte(e.target.value)} rows={5} />}</Champ>
        <Bascule actif={aSigner} onChange={setASigner} label="À signer par les familles" />
      </div>
    </Feuille>
  )
}

/** Écrire un nouveau mot à l'enseignante (famille) */
export function NouveauMotFamille({ ouvert, onFermer, classeId, eleveId, onEnvoye }: {
  ouvert: boolean; onFermer: () => void; classeId: string; eleveId: string; onEnvoye: (id: string) => void
}) {
  const ecrire = useEcrire()
  const toast = useToast()
  const [titre, setTitre] = useState('')
  const [texte, setTexte] = useState('')
  useEffect(() => { if (ouvert) { setTitre(''); setTexte('') } }, [ouvert])

  async function envoyer() {
    if (!texte.trim()) return
    try {
      const res = await ecrire.mutateAsync({
        op: 'insert', table: 'messages',
        ligne: { classe_id: classeId, eleve_id: eleveId, titre: titre.trim() || null, texte: texte.trim() },
      })
      const ligne = (res[0] as { id: string }[] | undefined)?.[0]
      toast('Mot envoyé')
      onFermer()
      if (ligne?.id) onEnvoye(ligne.id)
    } catch (e) {
      toast((e as Error).message, 'erreur')
    }
  }

  return (
    <Feuille ouverte={ouvert} onFermer={onFermer} titre="Écrire à l'enseignante"
      pied={<>
        <Bouton variante="secondaire" onClick={onFermer}>Annuler</Bouton>
        <Bouton icone={Send} onClick={envoyer} disabled={!texte.trim()} enCours={ecrire.isPending}>Envoyer</Bouton>
      </>}>
      <div className="flex flex-col gap-4">
        <Champ label="Objet">{(id) => <Saisie id={id} value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="Absence, rendez-vous…" />}</Champ>
        <Champ label="Message">{(id) => <Texte id={id} value={texte} onChange={(e) => setTexte(e.target.value)} rows={5} />}</Champ>
      </div>
    </Feuille>
  )
}
