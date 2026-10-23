// Assistant ChatGPT / Claude par copier-coller (utilise l'abonnement de l'enseignante, sans clé API)
import clsx from 'clsx'
import { useMemo, useState } from 'react'
import { Coquille } from './ia/Coquille'
import { Bascule } from './ui'
import { Clock, Replace, Users } from 'lucide-react'
import { matiere } from '../lib/matieres'
import { typeDevoir } from './devoirs/devoirsOutils'
import {
  useAgenda, useDevoirsDonnes, useEcrire, useEdt, useEleves, useEtapes, useEvaluations, useLsu, useProgressions,
  useSeances, useSequences,
} from '../lib/donnees'
import {
  decaler, estJourClasse, fmtHeure, fmtJourCourt, joursSemaine, maj1, periodeDe, periodeCourante, semaineDansPeriode,
} from '../lib/dates'
import {
  codesEleves, extraireJson as extraire, lireAppreciations, lireEtapes, lireJournal, promptAppreciations, promptJournal, promptSequence,
  type AppreciationIA, type DevoirIA, type EtapeIA, type SeanceIA,
} from '../lib/ia'
import { LSU } from '../lib/matieres'
import { useClasse } from '../lib/session'

export type DemandeIA =
  | { type: 'journee'; date: string }
  | { type: 'semaine'; lundi: string }
  | { type: 'sequence'; sequenceId: string }
  | { type: 'appreciations'; bilan: string; eleveIds: string[] }

export function AssistantIA({ demande, onFermer }: { demande: DemandeIA | null; onFermer: () => void }) {
  if (!demande) return null
  if (demande.type === 'journee' || demande.type === 'semaine') return <JournalIA demande={demande} onFermer={onFermer} />
  if (demande.type === 'sequence') return <SequenceIA sequenceId={demande.sequenceId} onFermer={onFermer} />
  return <AppreciationsIA bilan={demande.bilan} eleveIds={demande.eleveIds} onFermer={onFermer} />
}

// ───────────── Journée / semaine ─────────────

function JournalIA({ demande, onFermer }: { demande: { type: 'journee'; date: string } | { type: 'semaine'; lundi: string }; onFermer: () => void }) {
  const classe = useClasse()
  const r = classe.reglages
  const ecrire = useEcrire()
  const jours = useMemo(
    () => (demande.type === 'journee' ? [demande.date] : joursSemaine(demande.lundi, r).filter((j) => estJourClasse(j, r))),
    [demande, r],
  )
  const debut = jours[0] ?? (demande.type === 'journee' ? demande.date : demande.lundi)
  const fin = jours[jours.length - 1] ?? debut
  const periode = periodeDe(debut, r) ?? periodeCourante(debut, r)
  const semaine = semaineDansPeriode(debut, periode)
  const edt = useEdt(periode?.id)
  const progs = useProgressions(periode?.id)
  const seancesJours = useSeances(debut, fin)
  const seancesAvant = useSeances(decaler(debut, -7), decaler(debut, -1))
  const devoirs = useDevoirsDonnes(decaler(debut, -14), fin)
  const agenda = useAgenda(debut, decaler(fin, 21))
  const [remplacer, setRemplacer] = useState(false)

  const pret = !!(edt.data && progs.data && seancesJours.data && seancesAvant.data && devoirs.data && agenda.data)
  const titre = demande.type === 'journee' ? maj1(fmtJourCourt(demande.date)) : `${maj1(fmtJourCourt(debut))} → ${fmtJourCourt(fin)}`

  const conflits = (s: SeanceIA) => (seancesJours.data ?? []).filter((x) => x.date === s.date && x.debut?.slice(0, 5) === s.debut.slice(0, 5))
  const devoirExiste = (d: DevoirIA) => (devoirs.data ?? []).some((x) => x.pour_le === d.pour_le && x.texte.trim().toLowerCase() === d.texte.toLowerCase())

  if (!jours.length) {
    return (
      <Coquille titre={titre} pret construire={() => ''} analyser={() => { throw new Error('Pas de jour de classe sur cette période.') }}
        apercu={() => null} importer={async () => ''} onFermer={onFermer}
        options={<p className="rounded-2xl bg-ambre-clair px-4 py-3 text-sm font-bold text-ambre-fonce">Pas classe</p>} />
    )
  }

  return (
    <Coquille<{ seances: SeanceIA[]; devoirs: DevoirIA[]; erreurs: string[] }>
      titre={titre}
      pret={pret}
      onFermer={onFermer}
      options={<Bascule actif={remplacer} onChange={setRemplacer} label="Remplacer l'existant" />}
      construire={(precisions) => promptJournal({
        classe, jours, periodeId: periode?.id ?? null, semaine, edt: edt.data ?? [], progressions: progs.data ?? [],
        seancesAvant: seancesAvant.data ?? [], seancesJours: seancesJours.data ?? [], devoirs: devoirs.data ?? [],
        agenda: agenda.data ?? [], remplacer, precisions,
      })}
      analyser={(t) => lireJournal(extraire(t), jours)}
      apercu={(lu) => (
        <div className="flex flex-col gap-4">
          <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(min(100%, ${jours.length > 1 ? '13rem' : '20rem'}), 1fr))` }}>
            {jours.map((j) => {
              const liste = lu.seances.filter((s) => s.date === j)
              if (!liste.length) return null
              return (
                <div key={j} className="flex flex-col gap-1.5">
                  <span className="self-start rounded-full bg-encre px-3 py-1 text-xs font-bold text-white">{maj1(fmtJourCourt(j))}</span>
                  {liste.map((s, i) => {
                    const c = conflits(s)
                    const m = matiere(s.matiere)
                    const I = m.icone
                    return (
                      <div key={i} className={clsx('flex items-center gap-2 rounded-2xl p-1.5', c.length && !remplacer && 'opacity-40')} style={{ background: m.fond }}
                        title={c.length ? (remplacer ? 'Remplace la séance prévue' : 'Créneau déjà rempli : ignorée') : undefined}>
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-white" style={{ color: m.couleur }}><I className="size-4" /></span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[11px] font-bold tabular-nums" style={{ color: m.couleur }}>{fmtHeure(s.debut)}</span>
                          <span className="block truncate text-sm font-bold text-encre">{s.titre}</span>
                        </span>
                        {c.length > 0 && (remplacer ? <Replace className="size-4 shrink-0 text-ambre-fonce" /> : <Clock className="size-4 shrink-0 text-brume" />)}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
          {lu.devoirs.length > 0 && (
            <div className="grid gap-1.5 sm:grid-cols-2">
              {lu.devoirs.map((d, i) => {
                const m = matiere(d.matiere)
                const I = m.icone
                const t = typeDevoir(d.type)
                const TI = t.icone
                return (
                  <div key={i} className={clsx('flex items-center gap-2 rounded-2xl p-1.5', d.type === 'evaluation' && 'ring-2 ring-alerte', devoirExiste(d) && 'opacity-40')} style={{ background: m.fond }}>
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-white" style={{ color: m.couleur }}><I className="size-4" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold leading-snug text-encre">{d.texte}</span>
                      <span className="block text-[11px] font-bold" style={{ color: m.couleur }}>→ {fmtJourCourt(d.pour_le)}</span>
                    </span>
                    {d.type !== 'travail' && <TI className="size-4 shrink-0" style={{ color: t.couleur }} />}
                  </div>
                )
              })}
            </div>
          )}
          {lu.erreurs.length > 0 && <p className="text-xs font-bold text-brume">{lu.erreurs.length} ignoré(s)</p>}
        </div>
      )}
      importer={async (lu) => {
        const ecritures: any[] = []
        let nbS = 0
        for (const s of lu.seances) {
          const c = conflits(s)
          if (c.length && !remplacer) continue
          if (remplacer) c.forEach((x) => ecritures.push({ op: 'delete', table: 'seances', id: x.id }))
          ecritures.push({ op: 'insert', table: 'seances', ligne: { classe_id: classe.id, ...s } })
          nbS++
        }
        const nouveaux = lu.devoirs.filter((d) => !devoirExiste(d))
        if (nouveaux.length) ecritures.push({ op: 'insert', table: 'devoirs', ligne: nouveaux.map((d) => ({ classe_id: classe.id, ...d })) })
        if (!ecritures.length) throw new Error('Rien de nouveau à ajouter.')
        await ecrire.mutateAsync(ecritures)
        return `${nbS} séance(s) et ${nouveaux.length} devoir(s) ajoutés`
      }}
    />
  )
}

// ───────────── Séquence ─────────────

function SequenceIA({ sequenceId, onFermer }: { sequenceId: string; onFermer: () => void }) {
  const classe = useClasse()
  const ecrire = useEcrire()
  const seqs = useSequences()
  const etapes = useEtapes(sequenceId)
  const sequence = seqs.data?.find((s) => s.id === sequenceId)
  const progs = useProgressions(sequence?.periode ?? undefined)
  const [remplacer, setRemplacer] = useState(false)
  const pret = !!(sequence && etapes.data && progs.data)

  return (
    <Coquille<EtapeIA[]>
      titre={sequence?.titre ?? ''}
      pret={pret}
      onFermer={onFermer}
      options={etapes.data?.length ? <Bascule actif={remplacer} onChange={setRemplacer} label="Remplacer l'existant" /> : undefined}
      construire={(precisions) => promptSequence({ classe, sequence: sequence!, etapes: etapes.data ?? [], progressions: progs.data ?? [], remplacer, precisions })}
      analyser={(t) => lireEtapes(extraire(t))}
      apercu={(lu) => {
        const m = matiere(sequence?.matiere)
        return (
          <ol className="grid gap-2 sm:grid-cols-2">
            {lu.map((e, i) => (
              <li key={i} className="flex items-center gap-3 rounded-2xl p-2" style={{ background: m.fond }}>
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white font-titre text-lg font-semibold" style={{ color: m.couleur }}>
                  {(remplacer ? 0 : etapes.data?.length ?? 0) + i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold leading-snug text-encre">{e.titre}</span>
                  {e.duree ? <span className="inline-flex items-center gap-1 text-xs font-bold" style={{ color: m.couleur }}><Clock className="size-3.5" />{e.duree} min</span> : null}
                </span>
              </li>
            ))}
          </ol>
        )
      }}
      importer={async (lu) => {
        const existantes = etapes.data ?? []
        const ecritures: any[] = []
        if (remplacer) existantes.forEach((x) => ecritures.push({ op: 'delete', table: 'sequence_etapes', id: x.id }))
        const depart = remplacer ? 0 : Math.max(0, ...existantes.map((x) => x.numero))
        ecritures.push({
          op: 'insert', table: 'sequence_etapes',
          ligne: lu.map((e, i) => ({ classe_id: classe.id, sequence_id: sequenceId, numero: depart + i + 1, ...e })),
        })
        await ecrire.mutateAsync(ecritures)
        return `${lu.length} séance(s) ajoutée(s)`
      }}
    />
  )
}

// ───────────── Appréciations du LSU ─────────────

function AppreciationsIA({ bilan, eleveIds, onFermer }: { bilan: string; eleveIds: string[]; onFermer: () => void }) {
  const classe = useClasse()
  const ecrire = useEcrire()
  const eleves = useEleves()
  const evals = useEvaluations()
  const lsu = useLsu(bilan)
  const def = classe.reglages.lsu?.bilans?.find((b) => b.id === bilan)
  const choisis = useMemo(
    () => (eleves.data ?? []).filter((e) => e.actif && (eleveIds.length === 0 || eleveIds.includes(e.id))),
    [eleves.data, eleveIds],
  )
  const codes = useMemo(() => codesEleves(choisis), [choisis])
  const evalsBilan = (evals.data ?? []).filter((e) => !def || (e.date >= def.debut && e.date <= def.fin))
  const pret = !!(eleves.data && evals.data && lsu.data)
  const nomMatiere = (k: string) => (LSU.find((m) => m.id === k)?.nom ?? k).replace(/\s*\(.*\)$/, '')

  return (
    <Coquille<AppreciationIA[]>
      titre={def?.nom ?? bilan}
      pret={pret}
      onFermer={onFermer}
      options={<p className="inline-flex items-center gap-2 text-sm font-bold text-brume"><Users className="size-4" />{choisis.length} · prénoms non envoyés</p>}
      construire={(precisions) => promptAppreciations({ classe, bilanNom: def?.nom ?? bilan, codes, evaluations: evalsBilan, bilans: lsu.data ?? [], precisions })}
      analyser={(t) => lireAppreciations(extraire(t), codes)}
      apercu={(lu) => (
        <ul className="grid gap-3 md:grid-cols-2">
          {lu.map((a) => {
            const e = choisis.find((x) => x.id === a.eleve_id)
            return (
              <li key={a.eleve_id} className="flex flex-col gap-2 rounded-3xl bg-white p-3 shadow-sm">
                <span className="flex items-center gap-2">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-bateau font-titre text-white">{e?.prenom.slice(0, 1)}</span>
                  <span className="font-bold">{e?.prenom}</span>
                </span>
                {Object.entries(a.appreciations).map(([k, v]) => (
                  <p key={k} className="text-sm leading-snug"><span className="mr-1 rounded-full bg-encre/5 px-2 text-[11px] font-bold text-brume">{nomMatiere(k)}</span>{v}</p>
                ))}
                {a.appreciation_generale && <p className="rounded-2xl bg-bateau-clair p-2 text-sm leading-snug">{a.appreciation_generale}</p>}
              </li>
            )
          })}
        </ul>
      )}
      importer={async (lu) => {
        const lignes = lu.map((a) => {
          const avant = lsu.data?.find((b) => b.eleve_id === a.eleve_id)
          return {
            classe_id: classe.id, eleve_id: a.eleve_id, bilan,
            appreciations: { ...(avant?.appreciations ?? {}), ...a.appreciations },
            appreciation_generale: a.appreciation_generale ?? avant?.appreciation_generale ?? null,
          }
        })
        await ecrire.mutateAsync({ op: 'upsert', table: 'lsu_bilans', ligne: lignes, onConflict: 'eleve_id,bilan' })
        return `${lignes.length} livret(s) complété(s)`
      }}
    />
  )
}
