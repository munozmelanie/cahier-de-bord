import clsx from 'clsx'
import { BookCheck, CalendarDays, GraduationCap, LogOut, MessagesSquare, Sun, type LucideIcon } from 'lucide-react'
import { useMemo } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { BandeauDemo } from '../components/BandeauDemo'
import { CarteInstallation } from '../components/CarteInstallation'
import { BoutonIcone } from '../components/ui'
import { useLectures, useMessages } from '../lib/donnees'
import { useSession } from '../lib/session'

const ONGLETS: { to: string; label: string; icone: LucideIcon; fin?: boolean }[] = [
  { to: '/', label: "Aujourd'hui", icone: Sun, fin: true },
  { to: '/devoirs', label: 'Devoirs', icone: BookCheck },
  { to: '/carnet', label: 'Carnet', icone: MessagesSquare },
  { to: '/agenda', label: 'Agenda', icone: CalendarDays },
  { to: '/livret', label: 'Livret', icone: GraduationCap },
]

function useNonLus() {
  const { userId, enfant } = useSession()
  const msgs = useMessages()
  const lect = useLectures()
  return useMemo(() => {
    const lus = new Set((lect.data ?? []).filter((l) => l.user_id === userId).map((l) => l.message_id))
    return (msgs.data ?? []).filter((m) => m.auteur_role === 'enseignant' && (m.eleve_id == null || m.eleve_id === enfant?.id) && !lus.has(m.id)).length
  }, [msgs.data, lect.data, userId, enfant?.id])
}

export function ParentShell() {
  const { enfants, enfant, choisirEnfant, classe, deconnexion } = useSession()
  const nonLus = useNonLus()
  return (
    <div className="min-h-dvh">
      <BandeauDemo />
      <header className="mx-auto flex max-w-6xl items-center gap-3 px-[max(16px,env(safe-area-inset-left))] pt-5">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-bateau text-lg font-bold text-white">
            {enfant?.prenom.slice(0, 1) ?? '?'}
          </span>
          <div className="min-w-0">
            {enfants.length > 1 ? (
              <select
                value={enfant?.id}
                onChange={(e) => choisirEnfant(e.target.value)}
                className="max-w-full rounded-lg bg-transparent text-lg font-bold text-encre"
                aria-label="Choisir l'enfant"
              >
                {enfants.map((e) => <option key={e.id} value={e.id}>{e.prenom}</option>)}
              </select>
            ) : (
              <p className="truncate text-lg font-bold leading-tight text-encre">{enfant?.prenom}</p>
            )}
            <p className="truncate text-xs text-brume">{[classe?.nom, classe?.enseignant_nom, classe?.ecole].filter(Boolean).join(' · ')}</p>
          </div>
        </div>
        <BoutonIcone icone={LogOut} label="Se déconnecter" onClick={deconnexion} />
      </header>

      {/* Onglets en haut sur grand écran */}
      <nav className="mx-auto mt-4 hidden max-w-6xl px-4 sm:block">
        <div className="flex gap-1 border-b border-trait">
          {ONGLETS.map((o) => {
            const Icone = o.icone
            return (
              <NavLink key={o.to} to={o.to} end={o.fin}
                className={({ isActive }) => clsx('relative -mb-px flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-semibold transition',
                  isActive ? 'border-bateau text-bateau-fonce' : 'border-transparent text-brume hover:text-encre')}>
                <Icone className="size-[18px]" />
                {o.label}
                {o.to === '/carnet' && nonLus > 0 && <span className="rounded-full bg-alerte px-1.5 text-[10px] font-bold leading-4 text-white">{nonLus}</span>}
              </NavLink>
            )
          })}
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-[max(16px,env(safe-area-inset-left))] pb-28 pt-5 sm:pb-12">
        <CarteInstallation className="mb-5" />
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-trait bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden">
        <div className="grid grid-cols-5 px-1 pt-1.5">
          {ONGLETS.map((o) => {
            const Icone = o.icone
            return (
              <NavLink key={o.to} to={o.to} end={o.fin}
                className={({ isActive }) => clsx('flex flex-col items-center gap-0.5 pb-1.5 text-[11px] font-semibold', isActive ? 'text-bateau-fonce' : 'text-brume')}>
                {({ isActive }) => <>
                  <span className={clsx('relative flex h-7 w-12 items-center justify-center rounded-full transition', isActive && 'bg-bateau-clair')}>
                    <Icone className="size-5" />
                    {o.to === '/carnet' && nonLus > 0 && <span className="absolute -top-1 right-1 min-w-4 rounded-full bg-alerte px-1 text-center text-[10px] font-bold leading-4 text-white">{nonLus}</span>}
                  </span>
                  {o.label}
                </>}
              </NavLink>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
