import clsx from 'clsx'
import { BookCheck, CalendarPlus, Check, Plus, Sparkles, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useDevoirsDonnes, useDevoirsPour, useEcrire, useRafraichir, useSeances } from '../../lib/donnees'
import { aujourdhui, estJourClasse, fmtHeure, jourClasseSuivant, quand, vacancesDe } from '../../lib/dates'
import { useClasse } from '../../lib/session'
import type { Devoir, Seance } from '../../lib/types'
import { AssistantIA, type DemandeIA } from '../AssistantIA'
import { DevoirEditeur } from '../devoirs/DevoirEditeur'
import { LigneDevoir } from '../devoirs/LigneDevoir'
import { ResumeCarte } from '../resume/ResumeCarte'
import { Bouton, BoutonIcone, Chargement, PastilleMatiere, Vide, useToast } from '../ui'
import { remplirDepuisEdt, seanceEnCours, trierSeances } from './outils'
import { Ruban } from './Ruban'
import { iconeAFaire, SeanceEditeur, type BrouillonSeance } from './SeanceEditeur'

function useMaintenant() {
  const [m, setM] = useState(() => new Date())
  useEffect(() => { const t = setInterval(() => setM(new Date()), 60_000); return () => clearInterval(t) }, [])
  return m
}

export function LigneSeance({ s, enCours, onOuvrir, onStatut }: { s: Seance; enCours?: boolean; onOuvrir: () => void; onStatut: (st: Seance['statut']) => void }) {
  const nonFaite = s.statut === 'non_faite'
  const faite = s.statut === 'faite'
  const detail = s.materiel || s.objectif
  return (
    <li className={clsx('group flex items-center gap-3 rounded-2xl px-2 py-2 transition', enCours ? 'bg-white shadow-doux ring-2 ring-bateau' : 'hover:bg-white')}>
      <span className="w-12 shrink-0 text-right text-sm font-bold tabular-nums text-brume">{fmtHeure(s.debut)}</span>
      <button type="button" onClick={onOuvrir} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <PastilleMatiere id={s.matiere} />
        <span className="min-w-0 flex-1">
          <span className={clsx('block font-bold leading-snug', nonFaite && 'text-brume line-through')}>{s.titre || 'Sans titre'}</span>
          {detail && <span className="block truncate text-sm text-brume">{detail}</span>}
        </span>
        {s.a_faire?.length > 0 && (
          <span className="hidden items-center gap-1 text-bateau sm:flex" title={s.a_faire.map((a) => a.label).join(', ')}>
            {s.a_faire.slice(0, 3).map((a, i) => { const I = iconeAFaire(a.type); return <I key={i} className="size-4" /> })}
          </span>
        )}
      </button>
      <span className="flex shrink-0 gap-1">
        <BoutonIcone icone={Check} label="Faite" className={clsx('size-9', faite ? 'bg-succes text-white hover:bg-succes' : 'text-brume')} onClick={() => onStatut(faite ? 'prevue' : 'faite')} />
        <BoutonIcone icone={X} label="Pas faite" className={clsx('size-9', nonFaite ? 'bg-alerte text-white hover:bg-alerte' : 'text-brume')} onClick={() => onStatut(nonFaite ? 'prevue' : 'non_faite')} />
      </span>
    </li>
  )
}

/** Une journée de classe : déroulé, devoirs, à préparer, résumé pour les familles */
export function Journee({ date, ruban = true }: { date: string; ruban?: boolean }) {
  const classe = useClasse()
  const toast = useToast()
  const ecrire = useEcrire()
  const rafraichir = useRafraichir()
  const maintenant = useMaintenant()
  const seances = useSeances(date, date)
  const donnes = useDevoirsDonnes(date, date)
  const demain = jourClasseSuivant(date, classe.reglages)
  const pourDemain = useDevoirsPour(demain, demain)
  const [edition, setEdition] = useState<BrouillonSeance | null>(null)
  const [devoir, setDevoir] = useState<(Partial<Devoir> & { donne_le: string }) | null>(null)
  const [ia, setIa] = useState<DemandeIA | null>(null)
  const [remplissage, setRemplissage] = useState(false)

  const liste = useMemo(() => trierSeances(seances.data ?? []), [seances.data])
  const estAujourdhui = date === aujourdhui()
  const enCours = estAujourdhui ? seanceEnCours(liste, maintenant) : null
  const mn = estAujourdhui ? maintenant.getHours() * 60 + maintenant.getMinutes() : null
  const aFaire = liste.flatMap((s) => (s.a_faire ?? []).map((a) => ({ ...a, seance: s })))
  const vacances = vacancesDe(date, classe.reglages)

  async function statut(s: Seance, st: Seance['statut']) {
    await ecrire.mutateAsync({ op: 'update', table: 'seances', id: s.id, patch: { statut: st } })
  }
  async function remplir() {
    setRemplissage(true)
    try {
      const n = await remplirDepuisEdt(classe, date, liste)
      rafraichir('seances')
      toast(n ? `${n} séances ajoutées` : 'Rien à ajouter')
    } catch (e) { toast((e as Error).message, 'erreur') } finally { setRemplissage(false) }
  }
  const nouvelle = () => {
    const derniere = liste[liste.length - 1]
    setEdition({ date, debut: derniere?.fin ?? '08:45', statut: 'prevue', a_faire: [] })
  }

  if (seances.isLoading) return <Chargement />

  const colonneDroite = (
    <div className="flex flex-col gap-4">
      <section className="rounded-3xl bg-white p-4 shadow-doux">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-titre text-lg font-semibold">Devoirs donnés</h2>
          <BoutonIcone icone={Plus} label="Ajouter un devoir" variante="doux" className="size-9" onClick={() => setDevoir({ donne_le: date })} />
        </div>
        {(donnes.data ?? []).length ? (donnes.data ?? []).map((d) => <LigneDevoir key={d.id} d={d} onClick={() => setDevoir(d)} />)
          : <p className="text-sm text-brume">Aucun.</p>}
      </section>
      {(pourDemain.data ?? []).length > 0 && (
        <section className="rounded-3xl bg-white p-4 shadow-doux">
          <h2 className="mb-2 font-titre text-lg font-semibold">Pour {quand(demain, date)}</h2>
          {(pourDemain.data ?? []).map((d) => <LigneDevoir key={d.id} d={d} mode="donne" statut={false} />)}
        </section>
      )}
      {aFaire.length > 0 && (
        <section className="rounded-3xl bg-white p-4 shadow-doux">
          <h2 className="mb-2 font-titre text-lg font-semibold">À préparer</h2>
          <ul className="flex flex-col gap-2">
            {aFaire.map((a, i) => {
              const I = iconeAFaire(a.type)
              return (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <I className="size-4 shrink-0 text-bateau" />
                  {a.lien ? <a href={a.lien} target="_blank" rel="noreferrer" className="font-bold underline">{a.label}</a> : <span className="font-bold">{a.label}</span>}
                  <span className="ml-auto shrink-0 text-xs text-brume">{fmtHeure(a.seance.debut)}</span>
                </li>
              )
            })}
          </ul>
        </section>
      )}
      <ResumeCarte date={date} seances={liste} devoirs={donnes.data ?? []} />
    </div>
  )

  return (
    <>
      {ruban && liste.length > 0 && <div className="mb-5"><Ruban seances={liste} maintenant={mn} onChoisir={(s) => setEdition(s)} /></div>}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Bouton taille="s" icone={Plus} onClick={nouvelle}>Séance</Bouton>
            <Bouton taille="s" variante="secondaire" icone={CalendarPlus} onClick={remplir} enCours={remplissage}>Depuis l'emploi du temps</Bouton>
            <Bouton taille="s" variante="secondaire" icone={Sparkles} onClick={() => setIa({ type: 'journee', date })}>ChatGPT</Bouton>
          </div>
          {liste.length ? (
            <ul className="flex flex-col gap-1">
              {liste.map((s) => <LigneSeance key={s.id} s={s} enCours={enCours?.id === s.id} onOuvrir={() => setEdition(s)} onStatut={(st) => statut(s, st)} />)}
            </ul>
          ) : vacances || !estJourClasse(date, classe.reglages) ? (
            <Vide icone={BookCheck} texte={vacances ? `Vacances : ${vacances.nom}` : 'Pas classe ce jour-là'} />
          ) : (
            <Vide icone={CalendarPlus} texte="Journée vide" action={<Bouton icone={CalendarPlus} onClick={remplir} enCours={remplissage}>Remplir depuis l'emploi du temps</Bouton>} />
          )}
        </section>
        {colonneDroite}
      </div>
      <SeanceEditeur base={edition} onFermer={() => setEdition(null)} />
      <DevoirEditeur base={devoir} onFermer={() => setDevoir(null)} />
      <AssistantIA demande={ia} onFermer={() => setIa(null)} />
    </>
  )
}

