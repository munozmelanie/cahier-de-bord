import { BookCheck, CalendarPlus, Coffee, MessagesSquare, Plus, Printer, Send, Sparkles, Sun } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useDevoirsDonnes, useEcrire, useEdt, useLectures, useMessages, useRafraichir, useSeances } from '../../lib/donnees'
import { aujourdhui, estJourClasse, fmtHeure, minutes, numJour, periodeDe, vacancesDe } from '../../lib/dates'
import { useClasse, useSession } from '../../lib/session'
import type { Devoir, Seance } from '../../lib/types'
import { AssistantIA, type DemandeIA } from '../AssistantIA'
import { CarteInfo } from '../CarteInfo'
import { CarteDevoir } from '../devoirs/CarteDevoir'
import { DevoirEditeur } from '../devoirs/DevoirEditeur'
import { ResumeCarte } from '../resume/ResumeCarte'
import { Bouton, BoutonIcone, Chargement, Entete, Vide, useToast } from '../ui'
import { CarteSeance } from './CarteSeance'
import { remplirDepuisEdt, seanceEnCours, trierSeances } from './outils'
import { iconeAFaire, SeanceEditeur, type BrouillonSeance } from './SeanceEditeur'

function useMaintenant() {
  const [m, setM] = useState(() => new Date())
  useEffect(() => { const t = setInterval(() => setM(new Date()), 60_000); return () => clearInterval(t) }, [])
  return m
}

/** Barre d'outils de la journée : icônes seules */
export function OutilsJournee({ onNouvelle, onRemplir, onIa, remplissage }: { onNouvelle: () => void; onRemplir: () => void; onIa: () => void; remplissage?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <BoutonIcone icone={Sparkles} label="Remplir avec ChatGPT" variante="secondaire" onClick={onIa} />
      <BoutonIcone icone={CalendarPlus} label="Remplir depuis l'emploi du temps" variante="secondaire" onClick={onRemplir} disabled={remplissage} />
      <BoutonIcone icone={Plus} label="Nouvelle séance" variante="primaire" onClick={onNouvelle} />
    </div>
  )
}

/** Une journée : les séances en cartes (avec les pauses), et à côté les cartes devoirs, à préparer, résumé */
export function Journee({ date, titre, sousTitre, actions, retour }: { date: string; titre: ReactNode; sousTitre?: ReactNode; actions?: ReactNode; retour?: ReactNode }) {
  const classe = useClasse()
  const { userId } = useSession()
  const toast = useToast()
  const ecrire = useEcrire()
  const rafraichir = useRafraichir()
  const maintenant = useMaintenant()
  const seances = useSeances(date, date)
  const donnes = useDevoirsDonnes(date, date)
  const periode = periodeDe(date, classe.reglages)
  const edt = useEdt(periode?.id)
  const msgs = useMessages()
  const lect = useLectures()
  const [edition, setEdition] = useState<BrouillonSeance | null>(null)
  const [devoir, setDevoir] = useState<(Partial<Devoir> & { donne_le: string }) | null>(null)
  const [ia, setIa] = useState<DemandeIA | null>(null)
  const [remplissage, setRemplissage] = useState(false)

  const liste = useMemo(() => trierSeances(seances.data ?? []), [seances.data])
  const pauses = useMemo(() => (edt.data ?? []).filter((c) => c.type === 'pause' && c.jour === numJour(date)), [edt.data, date])
  const estAujourdhui = date === aujourdhui()
  const enCours = estAujourdhui ? seanceEnCours(liste, maintenant) : null
  const aFaire = liste.flatMap((s) => (s.a_faire ?? []).map((a) => ({ ...a, seance: s })))
  const vacances = vacancesDe(date, classe.reglages)
  const aLire = useMemo(() => {
    const lus = new Set((lect.data ?? []).filter((l) => l.user_id === userId).map((l) => l.message_id))
    return (msgs.data ?? []).filter((m) => m.auteur_role === 'parent' && !lus.has(m.id)).length
  }, [msgs.data, lect.data, userId])

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


  // Séances et pauses dans l'ordre de la journée
  const fil: ({ t: 'seance'; s: Seance } | { t: 'pause'; libelle: string; debut: string })[] = [
    ...liste.map((s) => ({ t: 'seance' as const, s })),
    ...(liste.length ? pauses.map((p) => ({ t: 'pause' as const, libelle: p.libelle ?? 'Pause', debut: p.debut })) : []),
  ].sort((a, b) => minutes(a.t === 'seance' ? a.s.debut : a.debut) - minutes(b.t === 'seance' ? b.s.debut : b.debut))

  const devoirsDuJour = donnes.data ?? []

  return (
    <>
      <Entete titre={titre} sousTitre={sousTitre} retour={retour}
        actions={<>{actions}<OutilsJournee onNouvelle={nouvelle} onRemplir={remplir} onIa={() => setIa({ type: 'journee', date })} remplissage={remplissage} /></>} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="min-w-0">
          {/* Téléphone : les petites cartes résumées en une ligne, un tap y descend */}
          <div className="mb-3 flex gap-2 lg:hidden">
            {[
              aLire > 0 && { id: 'carte-messages', i: MessagesSquare, c: '#E5484D', f: '#FDE7E8', n: aLire, l: 'Messages' },
              { id: 'carte-preparer', i: Printer, c: '#2E5BFF', f: '#E6ECFF', n: aFaire.length, l: 'À préparer' },
              { id: 'carte-devoirs', i: BookCheck, c: '#13A35B', f: '#E1F6EA', n: devoirsDuJour.length, l: 'Devoirs' },
              { id: 'carte-resume', i: Send, c: '#7B4DFF', f: '#EEE8FF', n: '', l: 'Résumé' },
            ].filter(Boolean).map((x) => {
              const v = x as { id: string; i: typeof Printer; c: string; f: string; n: number | string; l: string }
              return (
                <button key={v.id} type="button" aria-label={v.l} onClick={() => document.getElementById(v.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl py-2 font-titre text-lg font-semibold" style={{ background: v.f, color: v.c }}>
                  <v.i className="size-5" />{v.n}
                </button>
              )
            })}
          </div>
          {seances.isLoading ? <Chargement /> : liste.length ? (
            <div className="flex flex-col gap-2">
              {fil.map((x, i) => x.t === 'seance' ? (
                <CarteSeance key={x.s.id} s={x.s} enCours={enCours?.id === x.s.id} onOuvrir={() => setEdition(x.s)} onStatut={(st) => statut(x.s, st)} />
              ) : (
                <div key={`p${i}`} className="flex items-center gap-2 px-3 py-0.5 text-xs font-bold text-brume/80" title={x.libelle}>
                  <Coffee className="size-4" /> <span className="tabular-nums">{fmtHeure(x.debut)}</span>
                  <span className="h-px flex-1 bg-trait" />
                </div>
              ))}
            </div>
          ) : vacances || !estJourClasse(date, classe.reglages) ? (
            <Vide icone={Sun} texte={vacances ? vacances.nom : 'Pas classe'} />
          ) : (
            <Vide icone={CalendarPlus} texte="Journée vide" action={
              <div className="flex gap-2">
                <Bouton icone={CalendarPlus} onClick={remplir} enCours={remplissage}>Emploi du temps</Bouton>
                <Bouton variante="secondaire" icone={Sparkles} onClick={() => setIa({ type: 'journee', date })}>ChatGPT</Bouton>
              </div>
            } />
          )}
        </section>

        <div className="flex flex-col gap-4">
          {aLire > 0 && (
            <Link to="/carnet" className="block" id="carte-messages">
              <CarteInfo icone={MessagesSquare} couleur="#E5484D" fond="#FDE7E8" nombre={aLire} titre="Messages des familles" />
            </Link>
          )}

          <div id="carte-preparer" className="scroll-mt-4"><CarteInfo icone={Printer} couleur="#2E5BFF" fond="#E6ECFF" nombre={aFaire.length} titre="À préparer">
            {aFaire.length > 0 && (
              <ul className="flex flex-col gap-2">
                {aFaire.map((a, i) => {
                  const I = iconeAFaire(a.type)
                  return (
                    <li key={i} className="flex items-center gap-2 text-sm font-bold">
                      <I className="size-4 shrink-0 text-bateau" />
                      {a.lien ? <a href={a.lien} target="_blank" rel="noreferrer" className="underline">{a.label}</a> : <span>{a.label}</span>}
                    </li>
                  )
                })}
              </ul>
            )}
          </CarteInfo></div>

          <div id="carte-devoirs" className="scroll-mt-4"><CarteInfo icone={BookCheck} couleur="#13A35B" fond="#E1F6EA" nombre={devoirsDuJour.length} titre="Devoirs donnés"
            action={<BoutonIcone icone={Plus} label="Ajouter un devoir" variante="doux" className="size-9" onClick={() => setDevoir({ donne_le: date })} />}>
            {devoirsDuJour.length > 0 && (
              <div className="flex flex-col gap-2">
                {devoirsDuJour.map((d) => <CarteDevoir key={d.id} d={d} montrer="pour" onClick={() => setDevoir(d)} />)}
              </div>
            )}
          </CarteInfo></div>

          <div id="carte-resume" className="scroll-mt-4"><ResumeCarte date={date} seances={liste} devoirs={devoirsDuJour} /></div>
        </div>
      </div>
      <SeanceEditeur base={edition} onFermer={() => setEdition(null)} />
      <DevoirEditeur base={devoir} onFermer={() => setDevoir(null)} />
      <AssistantIA demande={ia} onFermer={() => setIa(null)} />
    </>
  )
}
