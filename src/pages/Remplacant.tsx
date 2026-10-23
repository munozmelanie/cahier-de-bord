import { useQuery } from '@tanstack/react-query'
import { BookCheck, ChevronLeft, ChevronRight, Link2Off, Printer, Sailboat, StickyNote, Sun } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { CarteInfo } from '../components/CarteInfo'
import { Chronologie } from '../components/journal/Chronologie'
import { imprimerCahierJournal } from '../components/journal/impression'
import { trierSeances } from '../components/journal/outils'
import { iconeAFaire } from '../components/journal/SeanceEditeur'
import { BoutonIcone, Chargement, Feuille, Vide } from '../components/ui'
import { aujourdhui, decaler, estJourClasse, fmtHeure, fmtJour, fmtJourCourt, jourClasseSuivant, maj1, vacancesDe } from '../lib/dates'
import { matiere } from '../lib/matieres'
import { db, verif } from '../lib/supabase'
import type { Classe, Creneau, Devoir, Reglages, Seance } from '../lib/types'

type Reponse =
  | { erreur: 'lien' }
  | { erreur: 'date'; min: string; max: string }
  | {
    erreur?: undefined
    classe: { nom: string; ecole: string | null; enseignant_nom: string | null }
    reglages: Reglages; mot: string | null; min: string; max: string
    seances: Seance[]; devoirs: Devoir[]; pauses: Creneau[]
  }

/** Page du remplaçant (lien du QR code) : la journée prévue, en lecture seule, sans compte */
export default function Remplacant() {
  const { jeton = '' } = useParams()
  const [date, setDate] = useState(aujourdhui())
  const [ouverte, setOuverte] = useState<Seance | null>(null)
  const premier = useRef(true)

  const q = useQuery<Reponse>({
    queryKey: ['remplacant', jeton, date],
    queryFn: async () => verif(await db.rpc('journal_remplacant', { p_jeton: jeton, p_date: date })) as Reponse,
    staleTime: 60_000,
  })
  const r = q.data && !q.data.erreur ? q.data : null
  const reglages = r?.reglages

  // Un jour sans classe à l'ouverture : on montre le prochain jour de classe
  useEffect(() => {
    if (!reglages || !premier.current) return
    premier.current = false
    if (!estJourClasse(date, reglages)) {
      const suivant = jourClasseSuivant(date, reglages)
      if (r && suivant <= r.max) setDate(suivant)
    }
  }, [reglages, date, r])

  const seances = useMemo(() => trierSeances(r?.seances ?? []), [r?.seances])
  const aFaire = seances.flatMap((s) => (s.a_faire ?? []).map((a) => ({ ...a, seance: s })))
  const aller = (sens: 1 | -1) => setDate((d) => (reglages ? jourClasseSuivant(d, reglages, sens) : decaler(d, sens)))

  if (q.isLoading) return <div className="min-h-dvh"><Chargement /></div>
  if (q.isError || q.data?.erreur === 'lien') {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <Vide icone={Link2Off} texte={q.isError ? 'Impossible de charger la journée. Vérifiez la connexion.' : "Ce lien ne marche plus. Demandez le nouveau QR code à l'enseignante."} />
      </div>
    )
  }

  const classe: Classe | null = r ? { id: '', ville: null, annee: null, ...r.classe, reglages: r.reglages } : null
  const vac = reglages ? vacancesDe(date, reglages) : null
  const min = q.data?.erreur === 'date' ? q.data.min : r?.min
  const max = q.data?.erreur === 'date' ? q.data.max : r?.max

  return (
    <div className="min-h-dvh">
      <header className="border-b border-trait bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <span className="flex size-9 items-center justify-center rounded-xl bg-encre text-white"><Sailboat className="size-5" /></span>
          <div className="min-w-0 leading-tight">
            <p className="font-bold text-encre">Cahier journal</p>
            {r && <p className="truncate text-xs text-brume">{[r.classe.nom, r.classe.enseignant_nom].filter(Boolean).join(', ')}</p>}
          </div>
          {classe && seances.length > 0 && (
            <BoutonIcone icone={Printer} label="Imprimer la journée" variante="secondaire" className="ml-auto"
              onClick={() => imprimerCahierJournal(classe, [date], seances, r?.devoirs ?? [])} />
          )}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-16 pt-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-[-0.01em] text-encre sm:text-[28px]">{maj1(fmtJour(date))}</h1>
            <p className="mt-0.5 text-sm text-brume">{date === aujourdhui() ? "Aujourd'hui. " : ''}Touchez une séance pour voir son déroulé.</p>
          </div>
          <div className="flex items-center gap-1">
            <BoutonIcone icone={ChevronLeft} label="Jour précédent" variante="secondaire" disabled={!!min && date <= min} onClick={() => aller(-1)} />
            <BoutonIcone icone={ChevronRight} label="Jour suivant" variante="secondaire" disabled={!!max && date >= max} onClick={() => aller(1)} />
          </div>
        </div>

        {q.data?.erreur === 'date' ? (
          <Vide icone={Sun} texte="Cette date n'est pas consultable." />
        ) : r && (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <section className="min-w-0">
              {seances.length ? (
                <Chronologie seances={seances} pauses={r.pauses} maintenant={null} onOuvrir={setOuverte} />
              ) : (
                <Vide icone={Sun} texte={vac ? vac.nom : 'Rien de prévu ce jour-là.'} />
              )}
            </section>

            <div className="flex flex-col gap-4">
              {r.mot && (
                <CarteInfo icone={StickyNote} couleur="#A86C00" fond="#FEF6E6" titre={`Mot de ${r.classe.enseignant_nom || "l'enseignante"}`}>
                  <p className="whitespace-pre-line text-sm leading-relaxed text-encre">{r.mot}</p>
                </CarteInfo>
              )}
              {aFaire.length > 0 && (
                <CarteInfo icone={Printer} couleur="#3358E0" fond="#ECF0FF" titre="À préparer" nombre={aFaire.length}>
                  <ul className="flex flex-col gap-2">
                    {aFaire.map((a, i) => {
                      const I = iconeAFaire(a.type)
                      return (
                        <li key={i} className="flex items-center gap-2 text-sm">
                          <I className="size-4 shrink-0 text-bateau" />
                          {a.lien ? <a href={a.lien} target="_blank" rel="noreferrer" className="underline">{a.label}</a> : <span>{a.label}</span>}
                        </li>
                      )
                    })}
                  </ul>
                </CarteInfo>
              )}
              {r.devoirs.length > 0 && (
                <CarteInfo icone={BookCheck} couleur="#13A35B" fond="#EAF7F0" titre="Devoirs à noter" nombre={r.devoirs.length}>
                  <ul className="flex flex-col gap-2.5">
                    {r.devoirs.map((d) => (
                      <li key={d.id} className="flex items-start gap-2.5 text-sm">
                        <span className="mt-1.5 size-2 shrink-0 rounded-full" style={{ background: matiere(d.matiere).couleur }} />
                        <span><span className="font-semibold">Pour {fmtJourCourt(d.pour_le)}</span> : {d.texte}</span>
                      </li>
                    ))}
                  </ul>
                </CarteInfo>
              )}
            </div>
          </div>
        )}
      </main>

      <Feuille ouverte={!!ouverte} onFermer={() => setOuverte(null)} titre={ouverte?.titre || matiere(ouverte?.matiere).court}>
        {ouverte && <DetailSeance s={ouverte} />}
      </Feuille>
    </div>
  )
}

function DetailSeance({ s }: { s: Seance }) {
  const m = matiere(s.matiere)
  const bloc = (titre: string, texte: string | null | undefined) => texte?.trim() ? (
    <div>
      <p className="mb-1 text-xs font-semibold text-brume">{titre}</p>
      <p className="whitespace-pre-line leading-relaxed text-encre">{texte}</p>
    </div>
  ) : null
  return (
    <div className="flex flex-col gap-4">
      <p className="flex items-center gap-2 text-sm text-brume">
        <span className="size-2.5 rounded-full" style={{ background: m.couleur }} />
        {m.nom}{s.debut ? `, ${fmtHeure(s.debut)}${s.fin ? ` à ${fmtHeure(s.fin)}` : ''}` : ''}
      </p>
      {bloc('Objectif', s.objectif)}
      {bloc('Déroulé', s.deroule)}
      {bloc('Matériel', s.materiel)}
      {(s.a_faire ?? []).length > 0 && (
        <div>
          <p className="mb-1 text-xs font-semibold text-brume">À préparer</p>
          <ul className="flex flex-col gap-1.5">
            {s.a_faire.map((a, i) => {
              const I = iconeAFaire(a.type)
              return (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <I className="size-4 shrink-0 text-bateau" />
                  {a.lien ? <a href={a.lien} target="_blank" rel="noreferrer" className="underline">{a.label}</a> : a.label}
                </li>
              )
            })}
          </ul>
        </div>
      )}
      {!s.objectif && !s.deroule && !s.materiel && !(s.a_faire ?? []).length && <p className="text-sm text-brume">Pas de détail pour cette séance.</p>}
    </div>
  )
}
