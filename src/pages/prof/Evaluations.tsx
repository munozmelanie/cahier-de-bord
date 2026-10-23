import { ArrowLeft, ClipboardCheck, Pencil, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { EditeurEvaluation } from '../../components/evaluations/EditeurEvaluation'
import { GrilleResultats } from '../../components/evaluations/GrilleResultats'
import {
  Badge, Bouton, BoutonIcone, Chargement, Entete, EtiquetteMatiere, Onglets, PastilleMatiere, Vide, useConfirmation, useToast,
} from '../../components/ui'
import { fmtJourCourt, aujourdhui, periodeCourante } from '../../lib/dates'
import { useEcrire, useEleves, useEvaluations } from '../../lib/donnees'
import { useClasse } from '../../lib/session'
import type { Evaluation } from '../../lib/types'

export default function Evaluations() {
  const classe = useClasse()
  const evals = useEvaluations()
  const eleves = useEleves()
  const ecrire = useEcrire()
  const toast = useToast()
  const { demander, fenetre } = useConfirmation()
  const [ouverteId, setOuverteId] = useState<string | null>(null)
  const [editeur, setEditeur] = useState<{ ouverte: boolean; evaluation: Evaluation | null }>({ ouverte: false, evaluation: null })
  const periodes = classe.reglages.periodes ?? []
  const [filtre, setFiltre] = useState<string>(() => periodeCourante(aujourdhui(), classe.reglages)?.id ?? 'toutes')

  const actifs = useMemo(() => (eleves.data ?? []).filter((e) => e.actif), [eleves.data])
  const liste = useMemo(() => (evals.data ?? []).filter((e) => filtre === 'toutes' || e.periode === filtre), [evals.data, filtre])
  const ouverte = evals.data?.find((e) => e.id === ouverteId) ?? null

  const remplissage = (ev: Evaluation) => {
    const total = actifs.length * (ev.items?.length ?? 0)
    if (!total) return 0
    let n = 0
    for (const e of actifs) for (const it of ev.items ?? []) if (ev.resultats?.[e.id]?.[it.id]) n++
    return Math.round((n / total) * 100)
  }

  if (evals.isLoading || eleves.isLoading) return <Chargement />

  if (ouverte) {
    return (
      <div>
        <Entete
          retour={<button onClick={() => setOuverteId(null)} className="mb-2 inline-flex items-center gap-1 text-sm font-bold text-brume hover:text-encre"><ArrowLeft className="size-4" /> Évaluations</button>}
          titre={ouverte.titre || 'Sans titre'}
          sousTitre={<span className="inline-flex flex-wrap items-center gap-2"><EtiquetteMatiere id={ouverte.matiere} /> {fmtJourCourt(ouverte.date)}{ouverte.periode && <Badge couleur="brume">{ouverte.periode}</Badge>}</span>}
          actions={<>
            <BoutonIcone icone={Pencil} label="Modifier" variante="secondaire" onClick={() => setEditeur({ ouverte: true, evaluation: ouverte })} />
            <BoutonIcone icone={Trash2} label="Supprimer" variante="secondaire" onClick={() => demander(`Supprimer « ${ouverte.titre} » et ses résultats ?`, async () => {
              await ecrire.mutateAsync({ op: 'delete', table: 'evaluations', id: ouverte.id })
              setOuverteId(null)
              toast('Évaluation supprimée')
            })} />
          </>}
        />
        <GrilleResultats evaluation={ouverte} eleves={actifs} />
        <EditeurEvaluation ouverte={editeur.ouverte} evaluation={editeur.evaluation} onFermer={() => setEditeur({ ouverte: false, evaluation: null })} />
        {fenetre}
      </div>
    )
  }

  return (
    <div>
      <Entete
        titre="Évaluations"
        actions={<Bouton icone={Plus} onClick={() => setEditeur({ ouverte: true, evaluation: null })}>Nouvelle évaluation</Bouton>}
      />
      {periodes.length > 0 && (
        <div className="mb-4">
          <Onglets valeur={filtre} onChange={setFiltre}
            options={[...periodes.map((p) => ({ id: p.id, label: p.id })), { id: 'toutes', label: 'Toutes' }]} />
        </div>
      )}
      {liste.length === 0 ? (
        <Vide icone={ClipboardCheck} texte="Aucune évaluation pour cette période."
          action={<Bouton icone={Plus} onClick={() => setEditeur({ ouverte: true, evaluation: null })}>Créer une évaluation</Bouton>} />
      ) : (
        <ul className="flex flex-col gap-2">
          {liste.map((ev) => {
            const pct = remplissage(ev)
            return (
              <li key={ev.id}>
                <button onClick={() => setOuverteId(ev.id)}
                  className="flex w-full items-center gap-3 rounded-3xl bg-white p-3 text-left shadow-doux transition hover:shadow-flotte sm:p-4">
                  <PastilleMatiere id={ev.matiere} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-encre">{ev.titre || 'Sans titre'}</p>
                    <p className="text-sm text-brume">{fmtJourCourt(ev.date)} · {ev.items?.length ?? 0} compétence{(ev.items?.length ?? 0) > 1 ? 's' : ''}</p>
                  </div>
                  <div className="flex w-20 flex-col items-end gap-1 sm:w-28">
                    <span className={pct === 100 ? 'text-sm font-bold text-succes' : 'text-sm font-bold text-brume'}>{pct} %</span>
                    <span className="h-1.5 w-full overflow-hidden rounded-full bg-trait">
                      <span className="block h-full rounded-full bg-succes" style={{ width: `${pct}%` }} />
                    </span>
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      )}
      <EditeurEvaluation ouverte={editeur.ouverte} evaluation={editeur.evaluation}
        onFermer={() => setEditeur({ ouverte: false, evaluation: null })} onCree={(id) => setOuverteId(id)} />
      {fenetre}
    </div>
  )
}
