import clsx from 'clsx'
import { BookCheck, CalendarDays, ChevronRight, ClipboardList, PartyPopper, PenLine, Signature, Sun, Users, type LucideIcon } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { CarteInfo } from '../../components/CarteInfo'
import { useFaits } from '../../components/devoirs/CaseFait'
import { CarteDevoir } from '../../components/devoirs/CarteDevoir'
import { Chargement } from '../../components/ui'
import { useAgenda, useDevoirsPour, useLectures, useMessages, useResumes } from '../../lib/donnees'
import { aujourdhui, decaler, fmtJourCourt, jourClasseSuivant, maj1 } from '../../lib/dates'
import { matiere } from '../../lib/matieres'
import { useSession } from '../../lib/session'
import type { EvenementAgenda } from '../../lib/types'

const TYPES: Record<EvenementAgenda['type'], [LucideIcon, string, string]> = {
  sortie: [CalendarDays, '#13A35B', '#E1F6EA'], evaluation: [ClipboardList, '#E5484D', '#FDE7E8'], reunion: [Users, '#7B4DFF', '#EEE8FF'],
  info: [CalendarDays, '#3358E0', '#ECF0FF'], fete: [PartyPopper, '#DB2D84', '#FCE4F0'], vacances: [Sun, '#B37400', '#FFF4DC'],
}

export default function AccueilParent() {
  const { classe, userId, enfant } = useSession()
  const auj = aujourdhui()
  const prochain = jourClasseSuivant(auj, classe?.reglages)
  const devoirs = useDevoirsPour(auj, decaler(auj, 21))
  const resumes = useResumes(decaler(auj, -10), auj)
  const agenda = useAgenda(auj, decaler(auj, 60))
  const msgs = useMessages()
  const lect = useLectures()
  const { faits, basculer } = useFaits()

  const pourProchain = (devoirs.data ?? []).filter((d) => d.pour_le === prochain)
  const resume = (resumes.data ?? []).find((r) => r.publie)
  const { aLire, aSigner } = useMemo(() => {
    const miennes = (lect.data ?? []).filter((l) => l.user_id === userId)
    const lus = new Set(miennes.map((l) => l.message_id))
    const signes = new Set(miennes.filter((l) => l.signe_le).map((l) => l.message_id))
    const prof = (msgs.data ?? []).filter((m) => m.auteur_role === 'enseignant' && (m.eleve_id == null || m.eleve_id === enfant?.id))
    return { aLire: prof.filter((m) => !lus.has(m.id)).length, aSigner: prof.filter((m) => m.a_signer && !signes.has(m.id)).length }
  }, [msgs.data, lect.data, userId, enfant?.id])
  const bientot = useMemo(() => {
    const evals = (devoirs.data ?? []).filter((d) => d.type === 'evaluation' && d.pour_le !== prochain)
      .map((d) => ({ id: d.id, date: d.pour_le, titre: d.texte, type: 'evaluation' as const }))
    const evts = (agenda.data ?? []).map((e) => ({ id: e.id, date: e.date, titre: e.titre, type: e.type }))
    return [...evals, ...evts].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 8)
  }, [devoirs.data, agenda.data, prochain])

  if (devoirs.isLoading) return <Chargement />
  const restants = pourProchain.filter((d) => !faits.includes(d.id)).length

  const quandResume = resume ? (resume.date === auj ? "aujourd'hui" : fmtJourCourt(resume.date)) : ''
  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      {(aSigner > 0 || aLire > 0) && (
        <Link to="/carnet" className={clsx('flex items-center gap-3 rounded-2xl px-4 py-3 font-semibold lg:col-span-2', aSigner ? 'bg-alerte-clair text-alerte' : 'bg-bateau-clair text-bateau-fonce')}>
          {aSigner ? <Signature className="size-5 shrink-0" /> : <PenLine className="size-5 shrink-0" />}
          <span className="flex-1">
            {aSigner ? `${aSigner} mot${aSigner > 1 ? 's' : ''} à signer` : `${aLire} nouveau${aLire > 1 ? 'x' : ''} mot${aLire > 1 ? 's' : ''}`}
          </span>
          <ChevronRight className="size-5" />
        </Link>
      )}

      <CarteInfo icone={BookCheck} couleur="#13A35B" fond="#EAF7F0" titre={`Devoirs pour ${fmtJourCourt(prochain)}`} nombre={restants || undefined}>
        {pourProchain.length ? (
          <div className="flex flex-col gap-2">
            {pourProchain.map((d) => <CarteDevoir key={d.id} d={d} fait={faits.includes(d.id)} onFait={() => basculer(d.id)} />)}
          </div>
        ) : <p className="text-sm text-brume">Rien à faire pour ce jour-là.</p>}
        <Link to="/devoirs" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-bateau">Tous les devoirs <ChevronRight className="size-4" /></Link>
      </CarteInfo>

      {resume && (
        <CarteInfo icone={Sun} couleur="#A86C00" fond="#FEF6E6" titre={`En classe ${quandResume}`}>
          {resume.mot && <p className="mb-3 whitespace-pre-line border-l-2 border-ambre pl-3 text-encre">{resume.mot}</p>}
          <ul className="flex flex-col gap-2">
            {resume.items.map((it, i) => (
              <li key={i} className="flex items-start gap-2.5 text-[15px] leading-snug text-encre">
                <span className="mt-1.5 size-2 shrink-0 rounded-full" style={{ background: matiere(it.matiere).couleur }} />
                {it.texte}
              </li>
            ))}
          </ul>
        </CarteInfo>
      )}

      {bientot.length > 0 && (
        <section className="rounded-3xl bg-white p-4 shadow-doux" aria-label="Bientôt">
          <h2 className="mb-2 text-[15px] font-semibold text-encre">Bientôt</h2>
          <ul className="flex flex-col">
            {bientot.map((e) => {
              const [I, c] = TYPES[e.type]
              return (
                <li key={e.id} className="border-t border-trait/70 first:border-t-0">
                  <Link to="/agenda" className="flex items-center gap-3 py-2.5">
                    <span className="flex w-11 shrink-0 flex-col items-center leading-none">
                      <span className="text-lg font-bold text-encre">{format(parseISO(e.date), 'd')}</span>
                      <span className="text-[11px] text-brume">{format(parseISO(e.date), 'MMM', { locale: fr })}</span>
                    </span>
                    <span className="min-w-0 flex-1 text-sm font-medium leading-snug text-encre">{e.titre}</span>
                    <I className="size-4 shrink-0" style={{ color: c }} />
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}
