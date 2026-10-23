import clsx from 'clsx'
import { BookCheck, Check, CircleDashed, Copy, Monitor, Plus, Printer, Scissors, Trash2, Users2, X, type LucideIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useDevoirsDonnes, useEcrire } from '../../lib/donnees'
import { hhmm } from '../../lib/dates'
import { useClasse } from '../../lib/session'
import type { AFaire, Devoir, Seance } from '../../lib/types'
import { DevoirEditeur } from '../devoirs/DevoirEditeur'
import { LigneDevoir } from '../devoirs/LigneDevoir'
import { Bascule, Bouton, BoutonIcone, Champ, ChoixMatiere, Feuille, Saisie, Texte, useConfirmation, useToast } from '../ui'

export const TYPES_A_FAIRE: { id: NonNullable<AFaire['type']>; label: string; icone: LucideIcon }[] = [
  { id: 'imprimer', label: 'Imprimer', icone: Printer },
  { id: 'projeter', label: 'Projeter', icone: Monitor },
  { id: 'distribuer', label: 'Distribuer', icone: Users2 },
  { id: 'preparer', label: 'Préparer', icone: Scissors },
]
export const iconeAFaire = (t?: AFaire['type']) => TYPES_A_FAIRE.find((x) => x.id === t)?.icone ?? Printer

const STATUTS: { id: Seance['statut']; label: string; icone: LucideIcon; classe: string }[] = [
  { id: 'prevue', label: 'Prévue', icone: CircleDashed, classe: 'bg-encre text-white' },
  { id: 'faite', label: 'Faite', icone: Check, classe: 'bg-succes text-white' },
  { id: 'non_faite', label: 'Pas faite', icone: X, classe: 'bg-alerte text-white' },
]

export type BrouillonSeance = Partial<Seance> & { date: string }

export function SeanceEditeur({ base, onFermer }: { base: BrouillonSeance | null; onFermer: () => void }) {
  const classe = useClasse()
  const ecrire = useEcrire()
  const toast = useToast()
  const { demander, fenetre } = useConfirmation()
  const [s, setS] = useState<BrouillonSeance | null>(base)
  const [devoir, setDevoir] = useState<(Partial<Devoir> & { donne_le: string }) | null>(null)
  const [nouvelAFaire, setNouvelAFaire] = useState('')
  const devoirs = useDevoirsDonnes(base?.date ?? '', base?.date ?? '')
  useEffect(() => setS(base), [base])
  if (!s) return null
  const maj = (p: Partial<Seance>) => setS({ ...s, ...p })
  const aFaire = s.a_faire ?? []
  const devoirsSeance = (devoirs.data ?? []).filter((d) => s.id && d.seance_id === s.id)
  const dansResume = (s.pour_familles ?? '') !== '-'

  async function enregistrer(fermer = true) {
    if (!s) return null
    const ligne = {
      classe_id: classe.id, date: s.date, debut: s.debut || null, fin: s.fin || null, matiere: s.matiere ?? null,
      titre: (s.titre ?? '').trim(), objectif: s.objectif || null, deroule: s.deroule || null, materiel: s.materiel || null,
      a_faire: aFaire, pour_familles: s.pour_familles ?? null, bilan: s.bilan || null, statut: s.statut ?? 'prevue',
      sequence_id: s.sequence_id ?? null, etape_id: s.etape_id ?? null, progression_id: s.progression_id ?? null,
    }
    try {
      let id = s.id
      if (id) await ecrire.mutateAsync({ op: 'update', table: 'seances', id, patch: ligne })
      else {
        const r = (await ecrire.mutateAsync({ op: 'insert', table: 'seances', ligne })) as any[]
        id = r?.[0]?.[0]?.id
        setS({ ...s, id })
      }
      toast('Séance enregistrée')
      if (fermer) onFermer()
      return id ?? null
    } catch (e) { toast((e as Error).message, 'erreur'); return null }
  }

  function supprimer() {
    demander('Supprimer cette séance ?', async () => {
      if (s?.id) await ecrire.mutateAsync({ op: 'delete', table: 'seances', id: s.id })
      toast('Séance supprimée'); onFermer()
    })
  }
  async function dupliquer() {
    if (!s) return
    const { id, ...reste } = s
    setS({ ...reste, statut: 'prevue' })
    toast('Copie prête')
  }
  async function ajouterDevoir() {
    const id = s?.id ?? (await enregistrer(false))
    if (id && s) setDevoir({ donne_le: s.date, matiere: s.matiere, seance_id: id })
  }

  return (
    <>
      <Feuille ouverte onFermer={onFermer} large titre={s.id ? (s.titre || 'Séance') : 'Nouvelle séance'}
        pied={<>
          {s.id && <BoutonIcone icone={Trash2} label="Supprimer" onClick={supprimer} className="mr-auto text-alerte" />}
          {s.id && <BoutonIcone icone={Copy} label="Dupliquer" onClick={dupliquer} />}
          <Bouton variante="secondaire" onClick={onFermer}>Annuler</Bouton>
          <Bouton onClick={() => enregistrer()} enCours={ecrire.isPending}>Enregistrer</Bouton>
        </>}>
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap gap-1.5">
            {STATUTS.map((st) => {
              const Icone = st.icone
              const actif = (s.statut ?? 'prevue') === st.id
              return (
                <button key={st.id} type="button" onClick={() => maj({ statut: st.id })} aria-label={st.label} title={st.label}
                  className={clsx('flex size-10 items-center justify-center rounded-full', actif ? st.classe : 'border border-trait bg-white text-brume')}>
                  <Icone className="size-5" />
                </button>
              )
            })}
          </div>

          <ChoixMatiere valeur={s.matiere ?? null} onChange={(m) => maj({ matiere: m })} />

          <div className="grid grid-cols-[1fr_auto_auto] gap-3">
            <Champ label="Titre">{(id) => <Saisie id={id} value={s.titre ?? ''} onChange={(e) => maj({ titre: e.target.value })} />}</Champ>
            <Champ label="Début">{(id) => <Saisie id={id} type="time" value={hhmm(s.debut)} onChange={(e) => maj({ debut: e.target.value })} className="w-28" />}</Champ>
            <Champ label="Fin">{(id) => <Saisie id={id} type="time" value={hhmm(s.fin)} onChange={(e) => maj({ fin: e.target.value })} className="w-28" />}</Champ>
          </div>

          <Champ label="Objectif">{(id) => <Texte id={id} value={s.objectif ?? ''} onChange={(e) => maj({ objectif: e.target.value })} />}</Champ>
          <Champ label="Déroulé">{(id) => <Texte id={id} rows={4} value={s.deroule ?? ''} onChange={(e) => maj({ deroule: e.target.value })} />}</Champ>
          <Champ label="Matériel">{(id) => <Texte id={id} value={s.materiel ?? ''} onChange={(e) => maj({ materiel: e.target.value })} />}</Champ>

          <div className="flex flex-col gap-2">
            <p className="flex items-center gap-1.5 text-sm font-bold"><Printer className="size-4 text-bateau" /> À préparer</p>
            {aFaire.map((a, i) => {
              const Icone = iconeAFaire(a.type)
              return (
                <div key={i} className="flex items-center gap-2 rounded-2xl bg-white px-3 py-2">
                  <button type="button" title="Changer le type" onClick={() => {
                    const ordre = TYPES_A_FAIRE.map((t) => t.id)
                    const suivant = ordre[(ordre.indexOf(a.type ?? 'imprimer') + 1) % ordre.length]
                    maj({ a_faire: aFaire.map((x, j) => (j === i ? { ...x, type: suivant } : x)) })
                  }} className="text-bateau"><Icone className="size-5" /></button>
                  <span className="flex-1">{a.label}</span>
                  <BoutonIcone icone={X} label="Retirer" className="size-8" onClick={() => maj({ a_faire: aFaire.filter((_, j) => j !== i) })} />
                </div>
              )
            })}
            <form className="flex gap-2" onSubmit={(e) => {
              e.preventDefault()
              if (!nouvelAFaire.trim()) return
              maj({ a_faire: [...aFaire, { label: nouvelAFaire.trim(), type: 'imprimer' }] }); setNouvelAFaire('')
            }}>
              <Saisie value={nouvelAFaire} onChange={(e) => setNouvelAFaire(e.target.value)} aria-label="Ajouter une chose à préparer" />
              <BoutonIcone type="submit" icone={Plus} label="Ajouter" variante="doux" />
            </form>
          </div>

          <div className="flex flex-col gap-3 rounded-3xl bg-white p-4">
            <Bascule actif={dansResume} onChange={(v) => maj({ pour_familles: v ? '' : '-' })} label="Résumé familles" />
            {dansResume && (
              <Saisie value={s.pour_familles ?? ''} onChange={(e) => maj({ pour_familles: e.target.value })}
                placeholder={s.titre} aria-label="Phrase pour les familles" />
            )}
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-sm font-bold"><BookCheck className="size-4 text-succes" /> Devoirs</p>
              <BoutonIcone icone={Plus} label="Ajouter un devoir" variante="doux" className="size-9" onClick={ajouterDevoir} />
            </div>
            {devoirsSeance.map((d) => <LigneDevoir key={d.id} d={d} onClick={() => setDevoir(d)} />)}
          </div>

          <Champ label="Bilan">{(id) => <Texte id={id} value={s.bilan ?? ''} onChange={(e) => maj({ bilan: e.target.value })} />}</Champ>
        </div>
      </Feuille>
      <DevoirEditeur base={devoir} onFermer={() => setDevoir(null)} />
      {fenetre}
    </>
  )
}
