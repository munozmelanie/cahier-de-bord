import { Library, Plus, Save, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Bouton, BoutonIcone, Champ, ChoixMatiere, Feuille, Liste, Saisie, useToast } from '../ui'
import { aujourdhui, periodeDe } from '../../lib/dates'
import { useEcrire } from '../../lib/donnees'
import { LSU, matiere as infoMatiere } from '../../lib/matieres'
import type { DomaineLivret, ElementProgramme } from '../../lib/referentielLsu'
import { useClasse } from '../../lib/session'
import type { Evaluation, ItemEval } from '../../lib/types'
import { cleElement, DOMAINE_PAR_MATIERE } from '../lsu/outils'
import { ChoixReferentiel } from './ChoixReferentiel'

const nouvelId = () => Math.random().toString(36).slice(2, 9)

export function ChoixDomaine({ id, valeur, onChange }: { id?: string; valeur: string | null | undefined; onChange: (v: string | null) => void }) {
  return (
    <Liste id={id} value={valeur ?? ''} onChange={(e) => onChange(e.target.value || null)} aria-label="Domaine du LSU" className="py-2 text-sm">
      <option value="">Sans domaine</option>
      {LSU.map((m) => (
        <optgroup key={m.id} label={m.nom}>
          {m.domaines.map((d) => <option key={d.id} value={d.id}>{m.domaines.length > 1 ? d.nom : m.nom}</option>)}
        </optgroup>
      ))}
    </Liste>
  )
}

/** Création ou modification d'une évaluation (sans les résultats) */
export function EditeurEvaluation({ ouverte, evaluation, onFermer, onCree }: {
  ouverte: boolean
  evaluation: Evaluation | null
  onFermer: () => void
  onCree?: (id: string) => void
}) {
  const classe = useClasse()
  const ecrire = useEcrire()
  const toast = useToast()
  const [date, setDate] = useState(aujourdhui())
  const [matiere, setMatiere] = useState<string | null>(null)
  const [titre, setTitre] = useState('')
  const [periode, setPeriode] = useState<string>('')
  const [items, setItems] = useState<ItemEval[]>([])
  const [referentiel, setReferentiel] = useState(false)

  useEffect(() => {
    if (!ouverte) return
    const d = evaluation?.date ?? aujourdhui()
    setDate(d)
    setMatiere(evaluation?.matiere ?? null)
    setTitre(evaluation?.titre ?? '')
    setPeriode(evaluation?.periode ?? periodeDe(d, classe.reglages)?.id ?? '')
    setItems(evaluation?.items?.length ? evaluation.items : [{ id: nouvelId(), libelle: '', domaine: null }])
    setReferentiel(false)
  }, [ouverte, evaluation, classe.reglages])

  const changerMatiere = (m: string) => {
    setMatiere(m)
    const dom = DOMAINE_PAR_MATIERE[m] ?? null
    setItems((l) => l.map((it) => (it.domaine ? it : { ...it, domaine: dom })))
  }
  const changerDate = (d: string) => {
    setDate(d)
    const p = periodeDe(d, classe.reglages)?.id
    if (p) setPeriode(p)
  }
  const majItem = (i: number, patch: Partial<ItemEval>) => setItems((l) => l.map((it, j) => (j === i ? { ...it, ...patch } : it)))
  /** Référentiel : ajoute la compétence (dans la ligne vide s'il y en a une) ou la retire si elle est déjà là */
  const basculerReferentiel = (el: ElementProgramme, dm: DomaineLivret) => setItems((l) => {
    const i = l.findIndex((it) => it.libelle.trim() === el.libelle)
    if (i >= 0) return l.length > 1 ? l.filter((_, j) => j !== i) : [{ ...l[0], libelle: '', domaine: null }]
    const item = { id: nouvelId(), libelle: el.libelle, domaine: dm.id, element: cleElement(dm.id, el.libelle) }
    const vide = l.findIndex((it) => !it.libelle.trim())
    return vide >= 0 ? l.map((it, j) => (j === vide ? { ...item, id: it.id } : it)) : [...l, item]
  })

  async function enregistrer() {
    const propres = items.map((it) => ({ ...it, libelle: it.libelle.trim() })).filter((it) => it.libelle)
    if (!titre.trim()) return toast('Donne un titre à l\'évaluation.', 'erreur')
    if (!propres.length) return toast('Ajoute au moins une compétence.', 'erreur')
    const ligne = { date, matiere, titre: titre.trim(), periode: periode || null, items: propres }
    try {
      if (evaluation) {
        await ecrire.mutateAsync({ op: 'update', table: 'evaluations', id: evaluation.id, patch: ligne })
        toast('Évaluation modifiée')
      } else {
        const [res] = await ecrire.mutateAsync({ op: 'insert', table: 'evaluations', ligne: { ...ligne, classe_id: classe.id, resultats: {} } })
        toast('Évaluation créée')
        const cree = (res as Evaluation[] | undefined)?.[0]
        if (cree) onCree?.(cree.id)
      }
      onFermer()
    } catch (e) {
      toast((e as Error).message, 'erreur')
    }
  }

  return (
    <Feuille
      ouverte={ouverte}
      onFermer={onFermer}
      titre={evaluation ? 'Évaluation' : 'Nouvelle évaluation'}
      large
      pied={<>
        <Bouton variante="secondaire" onClick={onFermer}>Annuler</Bouton>
        <Bouton icone={Save} onClick={enregistrer} enCours={ecrire.isPending}>Enregistrer</Bouton>
      </>}
    >
      <div className="flex flex-col gap-5">
        <Champ label="Titre">{(id) => <Saisie id={id} value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="Les déterminants" autoFocus />}</Champ>
        <div className="grid grid-cols-2 gap-3">
          <Champ label="Date">{(id) => <Saisie id={id} type="date" value={date} onChange={(e) => changerDate(e.target.value)} />}</Champ>
          <Champ label="Période">
            {(id) => (
              <Liste id={id} value={periode} onChange={(e) => setPeriode(e.target.value)}>
                <option value="">—</option>
                {(classe.reglages.periodes ?? []).map((p) => <option key={p.id} value={p.id}>{p.id}</option>)}
              </Liste>
            )}
          </Champ>
        </div>
        <div className="flex flex-col gap-1.5">
          <p className="text-sm font-semibold">Matière</p>
          <ChoixMatiere valeur={matiere} onChange={changerMatiere} />
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold">Compétences</p>
          {items.map((it, i) => (
            <div key={it.id} className="grid grid-cols-[1fr_auto] gap-2 rounded-2xl bg-white p-2 sm:grid-cols-[1fr_15rem_auto]">
              <span className="flex items-center gap-2">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-bateau-clair font-titre text-sm font-semibold text-bateau-fonce">{i + 1}</span>
                <Saisie value={it.libelle} onChange={(e) => majItem(i, { libelle: e.target.value })} placeholder="Reconnaître un déterminant" aria-label={`Compétence ${i + 1}`} className="py-2" />
              </span>
              <div className="order-3 col-span-2 sm:order-none sm:col-span-1">
                <ChoixDomaine valeur={it.domaine} onChange={(v) => majItem(i, { domaine: v, element: null })} />
              </div>
              <BoutonIcone icone={Trash2} label="Retirer" onClick={() => setItems((l) => l.filter((_, j) => j !== i))} disabled={items.length === 1} />
            </div>
          ))}
          {referentiel && (
            <ChoixReferentiel matiereLsu={infoMatiere(matiere).lsu} choisis={new Set(items.map((it) => it.libelle.trim()))}
              onBasculer={basculerReferentiel} onFermer={() => setReferentiel(false)} />
          )}
          <div className="flex items-center gap-2">
            <Bouton variante="doux" icone={Plus}
              onClick={() => setItems((l) => [...l, { id: nouvelId(), libelle: '', domaine: (matiere && DOMAINE_PAR_MATIERE[matiere]) || l[l.length - 1]?.domaine || null }])}>
              Compétence
            </Bouton>
            {!referentiel && <BoutonIcone icone={Library} label="Choisir dans le référentiel du LSU" variante="doux" onClick={() => setReferentiel(true)} />}
          </div>
        </div>
      </div>
    </Feuille>
  )
}
