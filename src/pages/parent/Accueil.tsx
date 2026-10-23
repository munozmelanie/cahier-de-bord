import clsx from 'clsx'
import { CalendarDays, ChevronRight, PenLine, Signature } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { CaseFait, useFaits } from '../../components/devoirs/CaseFait'
import { BadgeType } from '../../components/devoirs/devoirsOutils'
import { ListeResume } from '../../components/resume/ResumeCarte'
import { Chargement, PastilleMatiere } from '../../components/ui'
import { useAgenda, useDevoirsPour, useLectures, useMessages, useResumes } from '../../lib/donnees'
import { aujourdhui, decaler, estJourClasse, fmtJour, fmtJourCourt, jourClasseSuivant, maj1, quand } from '../../lib/dates'
import { useSession } from '../../lib/session'

export default function AccueilParent() {
  const { classe, userId } = useSession()
  const auj = aujourdhui()
  const prochain = jourClasseSuivant(auj, classe?.reglages)
  const devoirs = useDevoirsPour(auj, decaler(auj, 21))
  const resumes = useResumes(decaler(auj, -10), auj)
  const agenda = useAgenda(auj, decaler(auj, 45))
  const msgs = useMessages()
  const lect = useLectures()
  const { faits, basculer } = useFaits()

  const pourProchain = (devoirs.data ?? []).filter((d) => d.pour_le === prochain)
  const evaluations = (devoirs.data ?? []).filter((d) => d.type === 'evaluation' && d.pour_le !== prochain)
  const resume = (resumes.data ?? []).find((r) => r.publie)
  const { aLire, aSigner } = useMemo(() => {
    const miennes = (lect.data ?? []).filter((l) => l.user_id === userId)
    const lus = new Set(miennes.map((l) => l.message_id))
    const signes = new Set(miennes.filter((l) => l.signe_le).map((l) => l.message_id))
    const prof = (msgs.data ?? []).filter((m) => m.auteur_role === 'enseignant')
    return { aLire: prof.filter((m) => !lus.has(m.id)).length, aSigner: prof.filter((m) => m.a_signer && !signes.has(m.id)).length }
  }, [msgs.data, lect.data, userId])

  if (devoirs.isLoading) return <Chargement />

  return (
    <div className="flex flex-col gap-5">
      {(aSigner > 0 || aLire > 0) && (
        <Link to="/carnet" className={clsx('flex items-center gap-3 rounded-3xl px-4 py-3 font-bold text-white shadow-doux', aSigner ? 'bg-alerte' : 'bg-bateau')}>
          {aSigner ? <Signature className="size-6" /> : <PenLine className="size-6" />}
          <span className="flex-1">{aSigner ? `${aSigner} mot${aSigner > 1 ? 's' : ''} à signer` : `${aLire} nouveau${aLire > 1 ? 'x' : ''} mot${aLire > 1 ? 's' : ''}`}</span>
          <ChevronRight className="size-5" />
        </Link>
      )}

      <section className="rounded-[28px] bg-white p-5 shadow-doux">
        <h2 className="mb-3 font-titre text-2xl font-semibold">Pour {quand(prochain, auj)}</h2>
        {pourProchain.length ? (
          <ul className="flex flex-col gap-3">
            {pourProchain.map((d) => {
              const fait = faits.includes(d.id)
              return (
                <li key={d.id} className="flex items-center gap-3">
                  <PastilleMatiere id={d.matiere} />
                  <span className={clsx('min-w-0 flex-1 font-bold leading-snug', fait && 'text-brume line-through')}>
                    {d.texte}
                    {d.type !== 'travail' && <span className="ml-2 align-middle"><BadgeType type={d.type} /></span>}
                  </span>
                  <CaseFait fait={fait} onClick={() => basculer(d.id)} />
                </li>
              )
            })}
          </ul>
        ) : <p className="text-brume">Rien de noté.</p>}
        <Link to="/devoirs" className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-bateau">Tous les devoirs <ChevronRight className="size-4" /></Link>
      </section>

      {resume && (
        <section className="rounded-[28px] bg-white p-5 shadow-doux">
          <h2 className="mb-1 font-titre text-2xl font-semibold">{resume.date === auj ? "Aujourd'hui en classe" : 'En classe'}</h2>
          {resume.date !== auj && <p className="mb-2 text-sm font-bold text-brume">{maj1(fmtJour(resume.date))}</p>}
          {resume.mot && <p className="mb-3 mt-2 rounded-2xl bg-ambre-clair px-3 py-2">{resume.mot}</p>}
          <div className="mt-3"><ListeResume items={resume.items} /></div>
        </section>
      )}

      {(evaluations.length > 0 || (agenda.data ?? []).length > 0) && (
        <section className="rounded-[28px] bg-white p-5 shadow-doux">
          <h2 className="mb-3 font-titre text-2xl font-semibold">Bientôt</h2>
          <ul className="flex flex-col gap-3">
            {evaluations.slice(0, 3).map((d) => (
              <li key={d.id} className="flex items-center gap-3">
                <PastilleMatiere id={d.matiere} taille="s" />
                <span className="flex-1 font-bold text-alerte">{d.texte}</span>
                <span className="text-sm font-bold text-brume">{fmtJourCourt(d.pour_le)}</span>
              </li>
            ))}
            {(agenda.data ?? []).slice(0, 3).map((e) => (
              <li key={e.id} className="flex items-center gap-3">
                <span className="flex size-7 items-center justify-center rounded-xl bg-bateau-clair text-bateau"><CalendarDays className="size-4" /></span>
                <span className="flex-1 font-bold">{e.titre}</span>
                <span className="text-sm font-bold text-brume">{fmtJourCourt(e.date)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {!estJourClasse(auj, classe?.reglages) && !resume && pourProchain.length === 0 && (
        <p className="text-center text-brume">Bonnes vacances !</p>
      )}
    </div>
  )
}
