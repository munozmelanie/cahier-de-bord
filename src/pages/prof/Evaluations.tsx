import { ArrowLeft, Check, ClipboardCheck, Hourglass, Pencil, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { CarteInfo } from '../../components/CarteInfo'
import { EditeurEvaluation } from '../../components/evaluations/EditeurEvaluation'
import { GrilleResultats } from '../../components/evaluations/GrilleResultats'
import { Anneau } from '../../components/lsu/Anneau'
import {
  BoutonIcone, Chargement, Entete, EtiquetteMatiere, Onglets, Vide, useConfirmation, useToast,
} from '../../components/ui'
import { aujourdhui, fmtJourCourt, periodeCourante } from '../../lib/dates'
import { useEcrire, useEleves, useEvaluations } from '../../lib/donnees'
import { matiere } from '../../lib/matieres'
import { useClasse } from '../../lib/session'
import type { Evaluation } from '../../lib/types'

/** Une évaluation en carte colorée : matière, titre, date, anneau de remplissage */
function CarteEvaluation({ ev, pct, onOuvrir }: { ev: Evaluation; pct: number; onOuvrir: () => void }) {
  const m = matiere(ev.matiere)
  const Icone = m.icone
  const fini = pct === 100
  return (
    <button type="button" onClick={onOuvrir}
      className="flex w-full items-center gap-3 rounded-[22px] p-3 text-left transition hover:-translate-y-0.5"
      style={{ background: m.fond }}>
      <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm" style={{ color: m.couleur }} title={m.nom}>
        <Icone className="size-6" strokeWidth={2.2} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-bold tabular-nums" style={{ color: m.couleur }}>{fmtJourCourt(ev.date)}</span>
        <span className="line-clamp-2 font-bold leading-snug text-encre">{ev.titre || m.court}</span>
      </span>
      <span className="flex shrink-0 rounded-full bg-white p-0.5">
        <Anneau valeur={pct} total={100} couleur={fini ? '#18A058' : m.couleur} taille={40} titre={`${pct} % des résultats saisis`}>
          {fini ? <Check className="size-4" strokeWidth={3} /> : <span className="font-titre text-[11px] font-semibold">{pct}</span>}
        </Anneau>
      </span>
    </button>
  )
}

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

  // Regroupées par période (dans l'ordre des réglages)
  const groupes = useMemo(() => {
    const ordre = new Map(periodes.map((p, i) => [p.id, i]))
    const m = new Map<string, Evaluation[]>()
    for (const ev of liste) {
      const k = ev.periode ?? '—'
      m.set(k, [...(m.get(k) ?? []), ev])
    }
    return [...m.entries()].sort(([a], [b]) => (ordre.get(b) ?? -1) - (ordre.get(a) ?? -1))
  }, [liste, periodes])

  if (evals.isLoading || eleves.isLoading) return <Chargement />

  const nouvelle = () => setEditeur({ ouverte: true, evaluation: null })

  if (ouverte) {
    return (
      <div>
        <Entete
          retour={<button onClick={() => setOuverteId(null)} aria-label="Toutes les évaluations" title="Toutes les évaluations"
            className="mb-2 flex size-9 items-center justify-center rounded-full bg-white text-encre shadow-sm hover:bg-bateau-clair"><ArrowLeft className="size-5" /></button>}
          titre={ouverte.titre || 'Sans titre'}
          sousTitre={<span className="inline-flex flex-wrap items-center gap-2"><EtiquetteMatiere id={ouverte.matiere} /><span className="text-sm font-bold">{fmtJourCourt(ouverte.date)}</span></span>}
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

  const aCompleter = liste.filter((ev) => remplissage(ev) < 100).length

  return (
    <div>
      <Entete
        titre="Évaluations"
        actions={<>
          {periodes.length > 0 && (
            <Onglets valeur={filtre} onChange={setFiltre} options={[...periodes.map((p) => ({ id: p.id, label: p.id })), { id: 'toutes', label: 'Tout' }]} />
          )}
          <BoutonIcone icone={Plus} label="Nouvelle évaluation" variante="primaire" onClick={nouvelle} />
        </>}
      />

      {liste.length === 0 ? (
        <Vide icone={ClipboardCheck} texte="Aucune évaluation" action={<BoutonIcone icone={Plus} label="Nouvelle évaluation" variante="primaire" onClick={nouvelle} />} />
      ) : (
        <>
          <div className="mb-5 grid grid-cols-2 gap-3 sm:max-w-md">
            <CarteInfo icone={ClipboardCheck} couleur="#2E5BFF" fond="#E6ECFF" nombre={liste.length} titre="Évaluations" />
            <CarteInfo icone={Hourglass} couleur="#B37400" fond="#FFF4DC" nombre={aCompleter} titre="Résultats à compléter" />
          </div>
          <div className="flex flex-col gap-5">
            {groupes.map(([periode, evs]) => (
              <section key={periode} aria-label={periode}>
                {(filtre === 'toutes' || groupes.length > 1) && (
                  <span className="mb-2 inline-flex rounded-full bg-encre px-3 py-1 text-xs font-bold text-white">{periode}</span>
                )}
                <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                  {evs.map((ev) => <CarteEvaluation key={ev.id} ev={ev} pct={remplissage(ev)} onOuvrir={() => setOuverteId(ev.id)} />)}
                </div>
              </section>
            ))}
          </div>
        </>
      )}
      <EditeurEvaluation ouverte={editeur.ouverte} evaluation={editeur.evaluation}
        onFermer={() => setEditeur({ ouverte: false, evaluation: null })} onCree={(id) => setOuverteId(id)} />
      {fenetre}
    </div>
  )
}
