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
  info: [CalendarDays, '#2E5BFF', '#E6ECFF'], fete: [PartyPopper, '#DB2D84', '#FCE4F0'], vacances: [Sun, '#B37400', '#FFF4DC'],
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

  return (
    <div className="flex flex-col gap-4">
      {(aSigner > 0 || aLire > 0) && (
        <Link to="/carnet" className={clsx('flex items-center gap-3 rounded-3xl p-3 text-white shadow-doux', aSigner ? 'bg-alerte' : 'bg-bateau')}>
          <span className="flex size-11 items-center justify-center rounded-2xl bg-white/20">{aSigner ? <Signature className="size-6" /> : <PenLine className="size-6" />}</span>
          <span className="font-titre text-3xl font-semibold">{aSigner || aLire}</span>
          <span className="text-sm font-bold opacity-90">{aSigner ? 'à signer' : 'nouveau'}</span>
          <ChevronRight className="ml-auto size-6" />
        </Link>
      )}

      <CarteInfo icone={BookCheck} couleur="#13A35B" fond="#E1F6EA" titre="Devoirs" nombre={restants}
        action={<span className="rounded-full bg-encre px-3 py-1 text-sm font-bold text-white">{maj1(fmtJourCourt(prochain))}</span>}>
        {pourProchain.length ? (
          <div className="flex flex-col gap-2">
            {pourProchain.map((d) => <CarteDevoir key={d.id} d={d} fait={faits.includes(d.id)} onFait={() => basculer(d.id)} />)}
          </div>
        ) : <p className="py-2 text-center text-2xl text-trait">—</p>}
        <Link to="/devoirs" className="mt-3 flex justify-end text-bateau" aria-label="Tous les devoirs"><ChevronRight className="size-6" /></Link>
      </CarteInfo>

      {resume && (
        <CarteInfo icone={Sun} couleur="#F2A516" fond="#FFF4DC" titre="En classe"
          action={<span className="rounded-full bg-ambre-clair px-3 py-1 text-sm font-bold text-ambre-fonce">{resume.date === auj ? "Aujourd'hui" : maj1(fmtJourCourt(resume.date))}</span>}>
          {resume.mot && <p className="mb-3 rounded-2xl bg-ambre-clair px-3 py-2">{resume.mot}</p>}
          <div className="grid grid-cols-2 gap-2">
            {resume.items.map((it, i) => {
              const m = matiere(it.matiere)
              const I = m.icone
              return (
                <div key={i} className="flex flex-col gap-2 rounded-2xl p-3" style={{ background: m.fond }}>
                  <span className="flex size-9 items-center justify-center rounded-xl bg-white" style={{ color: m.couleur }}><I className="size-5" /></span>
                  <span className="text-sm font-bold leading-snug text-encre">{it.texte.replace(/^[^:]{2,20}:\s*/, '')}</span>
                </div>
              )
            })}
          </div>
        </CarteInfo>
      )}

      {bientot.length > 0 && (
        <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1">
          {bientot.map((e) => {
            const [I, c, f] = TYPES[e.type]
            return (
              <Link key={e.id} to="/agenda" className="flex w-36 shrink-0 snap-start flex-col gap-2 rounded-3xl bg-white p-3 shadow-doux">
                <div className="flex items-center justify-between">
                  <span className="flex flex-col leading-none">
                    <span className="font-titre text-3xl font-semibold" style={{ color: c }}>{format(parseISO(e.date), 'd')}</span>
                    <span className="text-xs font-bold text-brume">{format(parseISO(e.date), 'MMM', { locale: fr })}</span>
                  </span>
                  <span className="flex size-9 items-center justify-center rounded-xl" style={{ background: f, color: c }}><I className="size-5" /></span>
                </div>
                <span className="line-clamp-3 text-sm font-bold leading-snug">{e.titre}</span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
