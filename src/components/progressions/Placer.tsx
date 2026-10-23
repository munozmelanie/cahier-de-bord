// « Placer dans le cahier journal » : choisir un jour et un créneau, puis créer la séance
import clsx from 'clsx'
import { CalendarPlus, Check } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Badge, Bouton, Champ, Feuille, PastilleMatiere, Saisie, useToast } from '../ui'
import { useEcrire, useEdt, useSeances } from '../../lib/donnees'
import { aujourdhui, estJourClasse, fmtHeure, fmtJour, jourClasseSuivant, numJour, periodeDe, vacancesDe } from '../../lib/dates'
import { matiere } from '../../lib/matieres'
import { useSession } from '../../lib/session'
import type { Seance } from '../../lib/types'

export type BaseSeance = {
  titre: string
  matiere: string | null
  objectif?: string | null
  deroule?: string | null
  materiel?: string | null
  progression_id?: string | null
  sequence_id?: string | null
  etape_id?: string | null
}

const sec = (h: string) => (h.length === 5 ? h + ':00' : h)

export function Placer({ base, onFermer, marquerEnCours }: {
  base: BaseSeance | null
  onFermer: () => void
  /** id de la progression à passer « en cours » une fois placée */
  marquerEnCours?: string | null
}) {
  const { classe } = useSession()
  const r = classe?.reglages
  const toast = useToast()
  const ecrire = useEcrire()
  const premierJour = useMemo(() => {
    const a = aujourdhui()
    return estJourClasse(a, r) ? a : jourClasseSuivant(a, r)
  }, [r])
  const [date, setDate] = useState(premierJour)
  const [choix, setChoix] = useState<string | null>(null)
  const [debutLibre, setDebutLibre] = useState('09:00')
  const [finLibre, setFinLibre] = useState('09:45')

  useEffect(() => { if (base) { setDate(premierJour); setChoix(null) } }, [base, premierJour])

  const periode = periodeDe(date, r)
  const edt = useEdt(periode?.id)
  const seances = useSeances(date, date)
  const creneaux = (edt.data ?? []).filter((c) => c.jour === numJour(date) && c.type === 'cours')
  const occupes = (debut: string) => (seances.data ?? []).filter((s) => s.debut?.slice(0, 5) === debut.slice(0, 5))
  const creneau = creneaux.find((c) => c.id === choix)
  const deja = creneau ? occupes(creneau.debut) : []
  const vac = vacancesDe(date, r)
  const ferme = !estJourClasse(date, r)

  async function placer(remplacer: boolean) {
    if (!classe || !base) return
    const debut = creneau ? creneau.debut : sec(debutLibre)
    const fin = creneau ? creneau.fin : sec(finLibre)
    const ecritures: any[] = []
    if (remplacer) for (const s of deja) ecritures.push({ op: 'delete', table: 'seances', id: s.id })
    const ligne: Partial<Seance> & Record<string, unknown> = {
      classe_id: classe.id, date, debut, fin, matiere: base.matiere, titre: base.titre,
      objectif: base.objectif ?? null, deroule: base.deroule ?? null, materiel: base.materiel ?? null,
      progression_id: base.progression_id ?? null, sequence_id: base.sequence_id ?? null, etape_id: base.etape_id ?? null,
    }
    ecritures.push({ op: 'insert', table: 'seances', ligne })
    if (marquerEnCours) ecritures.push({ op: 'update', table: 'progressions', id: marquerEnCours, patch: { statut: 'en_cours' } })
    try {
      await ecrire.mutateAsync(ecritures)
      toast(`Placé ${fmtJour(date)}`)
      onFermer()
    } catch (e) {
      toast((e as Error).message, 'erreur')
    }
  }

  const m = matiere(base?.matiere)

  return (
    <Feuille
      ouverte={!!base}
      onFermer={onFermer}
      titre="Placer dans le cahier journal"
      pied={
        deja.length ? (
          <>
            <Bouton variante="secondaire" onClick={() => placer(false)} enCours={ecrire.isPending}>Ajouter à côté</Bouton>
            <Bouton icone={CalendarPlus} onClick={() => placer(true)} enCours={ecrire.isPending}>Remplacer</Bouton>
          </>
        ) : (
          <Bouton icone={CalendarPlus} onClick={() => placer(false)} enCours={ecrire.isPending} disabled={ferme || (!creneau && creneaux.length > 0)}>
            Placer
          </Bouton>
        )
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 rounded-2xl bg-white p-3">
          <PastilleMatiere id={base?.matiere} />
          <div className="min-w-0">
            <p className="truncate font-bold">{base?.titre}</p>
            <p className="text-sm" style={{ color: m.couleur }}>{m.court}</p>
          </div>
        </div>

        <Champ label="Jour">
          {(id) => <Saisie id={id} type="date" value={date} onChange={(e) => { setDate(e.target.value); setChoix(null) }} />}
        </Champ>

        {ferme ? (
          <p className="rounded-2xl bg-ambre-clair px-4 py-3 text-sm font-bold text-ambre-fonce">
            {vac ? `Vacances : ${vac.nom}` : 'Pas de classe ce jour-là'}
          </p>
        ) : creneaux.length ? (
          <div className="flex flex-col gap-1.5" role="radiogroup" aria-label="Créneau">
            {creneaux.map((c) => {
              const pris = occupes(c.debut)
              const actif = choix === c.id
              const memeMatiere = c.matiere === base?.matiere
              return (
                <button
                  key={c.id}
                  type="button"
                  role="radio"
                  aria-checked={actif}
                  onClick={() => setChoix(c.id)}
                  className={clsx('flex items-center gap-3 rounded-2xl border-2 bg-white px-3 py-2 text-left transition',
                    actif ? 'border-bateau' : 'border-transparent hover:border-trait')}
                >
                  <span className="w-12 shrink-0 text-sm font-bold tabular-nums text-brume">{fmtHeure(c.debut)}</span>
                  <PastilleMatiere id={c.matiere} taille="s" />
                  <span className={clsx('min-w-0 flex-1 truncate', memeMatiere && 'font-bold')}>{c.libelle ?? matiere(c.matiere).court}</span>
                  {pris.length > 0 && <Badge couleur="ambre">{pris[0].titre || 'Déjà prévu'}</Badge>}
                  {actif && <Check className="size-5 text-bateau" />}
                </button>
              )
            })}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Champ label="Début">{(id) => <Saisie id={id} type="time" value={debutLibre} onChange={(e) => setDebutLibre(e.target.value)} />}</Champ>
            <Champ label="Fin">{(id) => <Saisie id={id} type="time" value={finLibre} onChange={(e) => setFinLibre(e.target.value)} />}</Champ>
          </div>
        )}
      </div>
    </Feuille>
  )
}
