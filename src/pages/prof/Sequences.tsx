import clsx from 'clsx'
import { ArrowLeft, Layers, Plus, Printer, Sparkles, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { AssistantIA, type DemandeIA } from '../../components/AssistantIA'
import { Placer, type BaseSeance } from '../../components/progressions/Placer'
import { CarteEtape, EditeurEtape } from '../../components/sequences/CarteEtape'
import { TexteAuto } from '../../components/sequences/ChampAuto'
import { imprimerSequence } from '../../components/sequences/imprimer'
import {
  Bouton, BoutonIcone, ChoixMatiere, Chargement, Entete, Feuille, Onglets, Vide, useConfirmation, useToast,
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

  const ordre = MATIERES.map((m) => m.id)
  const visibles = (seqs.data ?? [])
    .filter((s) => filtre === 'toutes' || s.periode === filtre)
    .sort((a, b) => ordre.indexOf(a.matiere ?? '') - ordre.indexOf(b.matiere ?? '') || a.titre.localeCompare(b.titre))
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

  if (seq) return <Editeur key={seq.id} seq={seq} onRetour={() => setChoisie(null)} />

  return (
    <div>
      <Entete titre="Séquences" actions={<>
        <Onglets valeur={filtre} onChange={setFiltre} options={[{ id: 'toutes', label: 'Tout' }, ...periodes.map((p) => ({ id: p.id, label: p.id }))]} />
        <BoutonIcone icone={Plus} label="Nouvelle séquence" variante="primaire" onClick={nouvelle} disabled={ecrire.isPending} />
      </>} />
      {seqs.isLoading ? <Chargement /> : !visibles.length ? (
        <Vide icone={Layers} texte="Vide" action={<Bouton icone={Plus} onClick={nouvelle}>Séquence</Bouton>} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visibles.map((s) => {
            const m = matiere(s.matiere)
            const I = m.icone
            const n = nbEtapes.get(s.id) ?? 0
            return (
              <button key={s.id} type="button" onClick={() => setChoisie(s.id)}
                className="flex min-h-[9rem] flex-col gap-3 rounded-3xl p-4 text-left transition hover:-translate-y-0.5 hover:shadow-doux"
                style={{ background: m.fond }}>
                <div className="flex items-start justify-between gap-2">
                  <span className="flex size-11 items-center justify-center rounded-2xl bg-white shadow-sm" style={{ color: m.couleur }} title={m.nom}><I className="size-6" /></span>
                  {s.periode && <span className="rounded-full bg-white/80 px-2 text-xs font-semibold leading-6" style={{ color: m.couleur }}>{s.periode}</span>}
                </div>
                <span className="line-clamp-3 flex-1 font-titre text-lg font-semibold leading-snug text-encre">{s.titre || '—'}</span>
                <span className="flex flex-wrap gap-1" aria-label={`${n} séances`}>
                  {Array.from({ length: Math.min(n, 10) }, (_, i) => (
                    <span key={i} className="flex size-5 items-center justify-center rounded-full text-[10px] font-semibold text-white" style={{ background: m.couleur }}>{i + 1}</span>
                  ))}
                  {n > 10 && <span className="text-xs font-semibold" style={{ color: m.couleur }}>+{n - 10}</span>}
                </span>
              </button>
            )
          })}
        </div>
      )}
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
  const I = m.icone
  const liste = [...(etapes.data ?? [])].sort((a, b) => a.numero - b.numero)
  const iOuverte = liste.findIndex((e) => e.id === ouverte)
  const etapeOuverte = iOuverte >= 0 ? liste[iOuverte] : null

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

  const versPlacer = (e: Etape) => setPlacer({ titre: e.titre, matiere: seq.matiere, objectif: e.objectif, deroule: e.deroule, materiel: e.materiel, sequence_id: seq.id, etape_id: e.id })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <BoutonIcone icone={ArrowLeft} label="Toutes les séquences" variante="secondaire" onClick={onRetour} />
        <div className="ml-auto flex gap-2">
          <BoutonIcone icone={Sparkles} label="Proposer les séances avec ChatGPT" variante="secondaire" onClick={() => setIa({ type: 'sequence', sequenceId: seq.id })} />
          <BoutonIcone icone={Printer} label="Imprimer la fiche" variante="secondaire"
            onClick={() => { if (!imprimerSequence(classe, seq, liste)) toast('Autorise les fenêtres pour imprimer', 'erreur') }} />
          <BoutonIcone icone={Trash2} label="Supprimer la séquence" variante="secondaire"
            onClick={() => demander(`Supprimer « ${seq.titre} » et ses séances ?`, async () => {
              await ecrire.mutateAsync({ op: 'delete', table: 'sequences', id: seq.id })
              onRetour()
            })} />
        </div>
      </div>

      <section className="rounded-3xl p-4 sm:p-5" style={{ background: m.fond }}>
        <div className="flex items-start gap-3">
          <button onClick={() => setChoixMatiere(true)} aria-label={`Matière : ${m.nom}`} title={m.nom}
            className="flex size-14 shrink-0 items-center justify-center rounded-3xl bg-white shadow-sm" style={{ color: m.couleur }}>
            <I className="size-7" />
          </button>
          <div className="min-w-0 flex-1">
            <TexteAuto label="Titre de la séquence" etiquette={false} uneLigne valeur={seq.titre} onSave={(v) => maj({ titre: v ?? '' })}
              className="border-transparent bg-transparent px-1 py-1 font-titre text-2xl font-semibold leading-tight focus:border-trait focus:bg-white" />
            <div className="mt-1 flex flex-wrap gap-1 px-1" role="radiogroup" aria-label="Période">
              {(classe.reglages.periodes ?? []).map((p) => {
                const actif = seq.periode === p.id
                return (
                  <button key={p.id} type="button" role="radio" aria-checked={actif} onClick={() => maj({ periode: actif ? null : p.id })}
                    className={clsx('h-7 rounded-full px-2.5 text-xs font-semibold transition', actif ? 'text-white' : 'bg-white/70 text-brume')}
                    style={actif ? { background: m.couleur } : undefined}>
                    {p.id}
                  </button>
                )
              })}
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
        <ol className="grid gap-2 md:grid-cols-2">
          {liste.map((e) => (
            <CarteEtape key={e.id} e={e} m={m} onOuvrir={() => setOuverte(e.id)} onPlacer={() => versPlacer(e)} />
          ))}
          <li>
            <button type="button" onClick={ajouterEtape} aria-label="Ajouter une séance" title="Ajouter une séance"
              className="flex h-full min-h-[4.25rem] w-full items-center justify-center rounded-3xl border-2 border-dashed transition hover:bg-white"
              style={{ borderColor: m.couleur, color: m.couleur }}>
              <Plus className="size-6" />
            </button>
          </li>
        </ol>
      )}

      <EditeurEtape e={etapeOuverte} m={m} premier={iOuverte === 0} dernier={iOuverte === liste.length - 1}
        onFermer={() => setOuverte(null)}
        onSave={(p) => etapeOuverte && majEtape(etapeOuverte.id, p)}
        onMonter={() => echanger(iOuverte, iOuverte - 1)} onDescendre={() => echanger(iOuverte, iOuverte + 1)}
        onPlacer={() => { if (etapeOuverte) { const e = etapeOuverte; setOuverte(null); versPlacer(e) } }}
        onSupprimer={() => { const e = etapeOuverte; if (e) demander(`Supprimer « ${e.titre} » ?`, () => { setOuverte(null); supprimerEtape(e) }) }}
      />
      <Feuille ouverte={choixMatiere} onFermer={() => setChoixMatiere(false)} titre="">
        <ChoixMatiere valeur={seq.matiere} onChange={(id) => { maj({ matiere: id }); setChoixMatiere(false) }} />
      </Feuille>
      <Placer base={placer} onFermer={() => setPlacer(null)} />
      <AssistantIA demande={ia} onFermer={() => setIa(null)} />
      {fenetre}
    </div>
  )
}
