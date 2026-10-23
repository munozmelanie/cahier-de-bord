import clsx from 'clsx'
import { ArrowLeft, Layers, Plus, Printer, Sparkles, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { AssistantIA, type DemandeIA } from '../../components/AssistantIA'
import { Placer, type BaseSeance } from '../../components/progressions/Placer'
import { CarteEtape } from '../../components/sequences/CarteEtape'
import { TexteAuto } from '../../components/sequences/ChampAuto'
import { imprimerSequence } from '../../components/sequences/imprimer'
import {
  Badge, Bouton, BoutonIcone, ChoixMatiere, Chargement, Entete, Feuille, Onglets, PastilleMatiere, Vide, useConfirmation, useToast,
} from '../../components/ui'
import { useEcrire, useEtapes, useSequences } from '../../lib/donnees'
import { aujourdhui, periodeCourante } from '../../lib/dates'
import { MATIERES, matiere } from '../../lib/matieres'
import { useClasse } from '../../lib/session'
import type { Etape, Sequence } from '../../lib/types'

export default function Sequences() {
  const classe = useClasse()
  const periodes = classe.reglages.periodes ?? []
  const [filtre, setFiltre] = useState<string>(periodeCourante(aujourdhui(), classe.reglages)?.id ?? 'toutes')
  const [choisie, setChoisie] = useState<string | null>(null)
  const seqs = useSequences()
  const etapes = useEtapes()
  const ecrire = useEcrire()
  const toast = useToast()

  const nbEtapes = useMemo(() => {
    const n = new Map<string, number>()
    for (const e of etapes.data ?? []) n.set(e.sequence_id, (n.get(e.sequence_id) ?? 0) + 1)
    return n
  }, [etapes.data])

  const visibles = (seqs.data ?? []).filter((s) => filtre === 'toutes' || s.periode === filtre)
  const groupes = MATIERES.map((m) => [m.id, visibles.filter((s) => s.matiere === m.id)] as const)
    .concat([['autre', visibles.filter((s) => !MATIERES.some((m) => m.id === s.matiere))]])
    .filter(([, l]) => l.length)
  const seq = seqs.data?.find((s) => s.id === choisie) ?? null

  async function nouvelle() {
    try {
      const [res] = await ecrire.mutateAsync({
        op: 'insert', table: 'sequences',
        ligne: { classe_id: classe.id, matiere: 'francais', titre: 'Nouvelle séquence', periode: filtre === 'toutes' ? periodeCourante(aujourdhui(), classe.reglages)?.id ?? null : filtre },
      })
      const cree = (res as Sequence[])[0]
      if (cree) setChoisie(cree.id)
    } catch (e) { toast((e as Error).message, 'erreur') }
  }

  return (
    <div>
      <Entete titre="Séquences" actions={<Bouton icone={Plus} onClick={nouvelle} enCours={ecrire.isPending && !choisie}>Nouvelle</Bouton>} />
      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className={clsx('min-w-0', seq && 'hidden lg:block')}>
          <div className="mb-4">
            <Onglets valeur={filtre} onChange={setFiltre} options={[{ id: 'toutes', label: 'Toutes' }, ...periodes.map((p) => ({ id: p.id, label: p.id }))]} />
          </div>
          {seqs.isLoading ? <Chargement /> : !groupes.length ? (
            <Vide icone={Layers} texte="Aucune séquence pour l'instant." action={<Bouton icone={Plus} onClick={nouvelle}>Nouvelle séquence</Bouton>} />
          ) : (
            <div className="flex flex-col gap-4">
              {groupes.map(([m, liste]) => (
                <div key={m}>
                  <p className="mb-1.5 px-1 text-sm font-bold" style={{ color: matiere(m).couleur }}>{matiere(m).nom}</p>
                  <ul className="flex flex-col gap-1.5">
                    {liste.map((s) => (
                      <li key={s.id}>
                        <button onClick={() => setChoisie(s.id)}
                          className={clsx('flex w-full items-center gap-3 rounded-2xl bg-white p-2.5 text-left shadow-doux transition',
                            choisie === s.id ? 'ring-2 ring-bateau' : 'hover:ring-2 hover:ring-trait')}>
                          <PastilleMatiere id={s.matiere} taille="s" />
                          <span className="min-w-0 flex-1 truncate font-bold">{s.titre || 'Sans titre'}</span>
                          {s.periode && <Badge couleur="brume">{s.periode}</Badge>}
                          <span className="w-6 shrink-0 text-right text-sm font-bold tabular-nums text-brume">{nbEtapes.get(s.id) ?? 0}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={clsx('min-w-0', !seq && 'hidden lg:block')}>
          {seq ? <Editeur key={seq.id} seq={seq} onRetour={() => setChoisie(null)} /> : (
            <div className="hidden lg:block"><Vide icone={Layers} texte="Choisis une séquence ou crée-en une." /></div>
          )}
        </div>
      </div>
    </div>
  )
}

function Editeur({ seq, onRetour }: { seq: Sequence; onRetour: () => void }) {
  const classe = useClasse()
  const etapes = useEtapes(seq.id)
  const ecrire = useEcrire()
  const toast = useToast()
  const { demander, fenetre } = useConfirmation()
  const [ia, setIa] = useState<DemandeIA | null>(null)
  const [choixMatiere, setChoixMatiere] = useState(false)
  const [ouverte, setOuverte] = useState<string | null>(null)
  const [placer, setPlacer] = useState<BaseSeance | null>(null)
  const m = matiere(seq.matiere)
  const liste = [...(etapes.data ?? [])].sort((a, b) => a.numero - b.numero)

  const maj = (patch: Partial<Sequence>) =>
    ecrire.mutateAsync({ op: 'update', table: 'sequences', id: seq.id, patch }).catch((e) => toast((e as Error).message, 'erreur'))
  const majEtape = (id: string, patch: Partial<Etape>) =>
    ecrire.mutateAsync({ op: 'update', table: 'sequence_etapes', id, patch }).catch((e) => toast((e as Error).message, 'erreur'))

  async function ajouterEtape() {
    const n = Math.max(0, ...liste.map((e) => e.numero)) + 1
    try {
      const [res] = await ecrire.mutateAsync({ op: 'insert', table: 'sequence_etapes', ligne: { classe_id: classe.id, sequence_id: seq.id, numero: n, titre: `Séance ${n}` } })
      const cree = (res as Etape[])[0]
      if (cree) setOuverte(cree.id)
    } catch (e) { toast((e as Error).message, 'erreur') }
  }

  function echanger(i: number, j: number) {
    const a = liste[i], b = liste[j]
    if (!a || !b) return
    ecrire.mutate([
      { op: 'update', table: 'sequence_etapes', id: a.id, patch: { numero: b.numero } },
      { op: 'update', table: 'sequence_etapes', id: b.id, patch: { numero: a.numero } },
    ])
  }

  async function supprimerEtape(e: Etape) {
    const suivantes = liste.filter((x) => x.numero > e.numero)
    await ecrire.mutateAsync([
      { op: 'delete', table: 'sequence_etapes', id: e.id },
      ...suivantes.map((x) => ({ op: 'update' as const, table: 'sequence_etapes', id: x.id, patch: { numero: x.numero - 1 } })),
    ])
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <BoutonIcone icone={ArrowLeft} label="Toutes les séquences" onClick={onRetour} className="lg:hidden" />
        <div className="ml-auto flex gap-2">
          <Bouton variante="doux" icone={Sparkles} onClick={() => setIa({ type: 'sequence', sequenceId: seq.id })}>ChatGPT</Bouton>
          <BoutonIcone icone={Printer} label="Imprimer la fiche" variante="secondaire"
            onClick={() => { if (!imprimerSequence(classe, seq, liste)) toast('Autorise les fenêtres pour imprimer', 'erreur') }} />
          <BoutonIcone icone={Trash2} label="Supprimer la séquence" variante="secondaire"
            onClick={() => demander(`Supprimer « ${seq.titre} » et ses séances ?`, async () => {
              await ecrire.mutateAsync({ op: 'delete', table: 'sequences', id: seq.id })
              onRetour()
            })} />
        </div>
      </div>

      <section className="rounded-3xl bg-white p-4 shadow-doux sm:p-5">
        <div className="flex items-start gap-3">
          <button onClick={() => setChoixMatiere(true)} aria-label={`Matière : ${m.nom}`} title="Changer de matière"><PastilleMatiere id={seq.matiere} taille="l" /></button>
          <div className="min-w-0 flex-1">
            <TexteAuto label="Titre de la séquence" etiquette={false} uneLigne valeur={seq.titre} onSave={(v) => maj({ titre: v ?? '' })}
              className="border-transparent bg-transparent px-1 py-1 font-titre text-2xl font-semibold leading-tight focus:border-trait" />
            <div className="mt-1 flex flex-wrap items-center gap-2 px-1">
              <span className="text-sm font-bold" style={{ color: m.couleur }}>{m.nom}</span>
              <select value={seq.periode ?? ''} onChange={(e) => maj({ periode: e.target.value || null })} aria-label="Période"
                className="h-7 rounded-full border border-trait bg-papier px-2 text-xs font-bold text-brume">
                <option value="">Période</option>
                {(classe.reglages.periodes ?? []).map((p) => <option key={p.id} value={p.id}>{p.id}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <TexteAuto label="Objectifs" valeur={seq.objectifs} onSave={(v) => maj({ objectifs: v })} />
          <TexteAuto label="Compétences" valeur={seq.competences} onSave={(v) => maj({ competences: v })} />
          <TexteAuto label="Notes" valeur={seq.notes} onSave={(v) => maj({ notes: v })} classeBloc="flex min-w-0 flex-col gap-1 md:col-span-2" />
        </div>
      </section>

      {etapes.isLoading ? <Chargement /> : (
        <ol className="flex flex-col gap-2">
          {liste.map((e, i) => (
            <CarteEtape key={e.id} e={e} couleur={m.couleur} premier={i === 0} dernier={i === liste.length - 1}
              ouverte={ouverte === e.id} onOuvrir={() => setOuverte(ouverte === e.id ? null : e.id)}
              onSave={(p) => majEtape(e.id, p)} onMonter={() => echanger(i, i - 1)} onDescendre={() => echanger(i, i + 1)}
              onPlacer={() => setPlacer({ titre: e.titre, matiere: seq.matiere, objectif: e.objectif, deroule: e.deroule, materiel: e.materiel, sequence_id: seq.id, etape_id: e.id })}
              onSupprimer={() => demander(`Supprimer « ${e.titre} » ?`, () => supprimerEtape(e))}
            />
          ))}
        </ol>
      )}
      <div><Bouton variante="secondaire" icone={Plus} onClick={ajouterEtape}>Ajouter une séance</Bouton></div>

      <Feuille ouverte={choixMatiere} onFermer={() => setChoixMatiere(false)} titre="Matière">
        <ChoixMatiere valeur={seq.matiere} onChange={(id) => { maj({ matiere: id }); setChoixMatiere(false) }} />
      </Feuille>
      <Placer base={placer} onFermer={() => setPlacer(null)} />
      <AssistantIA demande={ia} onFermer={() => setIa(null)} />
      {fenetre}
    </div>
  )
}
