import clsx from 'clsx'
import { BookCheck, CalendarDays, GraduationCap, LogOut, MessagesSquare, Sun, type LucideIcon } from 'lucide-react'
import { useMemo } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { BandeauDemo } from '../components/BandeauDemo'
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
      <header className="mx-auto flex max-w-2xl items-center gap-3 px-[max(16px,env(safe-area-inset-left))] pt-5">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-bateau font-titre text-xl font-semibold text-white">
            {enfant?.prenom.slice(0, 1) ?? '?'}
          </span>
          <div className="min-w-0">
            {enfants.length > 1 ? (
              <select
                value={enfant?.id}
                onChange={(e) => choisirEnfant(e.target.value)}
                className="max-w-full rounded-lg bg-transparent font-titre text-xl font-semibold text-encre"
                aria-label="Choisir l'enfant"
              >
                {enfants.map((e) => <option key={e.id} value={e.id}>{e.prenom}</option>)}
              </select>
            ) : (
              <p className="truncate font-titre text-xl font-semibold text-encre">{enfant?.prenom}</p>
            )}
            <p className="truncate text-xs font-bold text-brume">{[classe?.nom, classe?.enseignant_nom, classe?.ecole].filter(Boolean).join(' · ')}</p>
          </div>
        </div>
        <BoutonIcone icone={LogOut} label="Se déconnecter" onClick={deconnexion} />
      </header>

      {/* Onglets en haut sur grand écran */}
      <nav className="mx-auto mt-4 hidden max-w-2xl px-4 sm:block">
        <div className="flex gap-1 rounded-full bg-encre/5 p-1">
          {ONGLETS.map((o) => {
            const Icone = o.icone
            return (
              <NavLink key={o.to} to={o.to} end={o.fin}
                className={({ isActive }) => clsx('flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-sm font-bold transition',
                  isActive ? 'bg-white text-bateau shadow-sm' : 'text-brume hover:text-encre')}>
                <Icone className="size-4" /> {o.label}
                {o.to === '/carnet' && nonLus > 0 && <span className="rounded-full bg-alerte px-1.5 text-[10px] leading-4 text-white">{nonLus}</span>}
              </NavLink>
            )
          })}
        </div>
      </nav>

      <main className="mx-auto max-w-2xl px-[max(16px,env(safe-area-inset-left))] pb-28 pt-5 sm:pb-12">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-trait bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden">
        <div className="grid grid-cols-5">
          {ONGLETS.map((o) => {
            const Icone = o.icone
            return (
              <NavLink key={o.to} to={o.to} end={o.fin}
                className={({ isActive }) => clsx('relative flex flex-col items-center gap-0.5 py-2 text-[11px] font-bold', isActive ? 'text-bateau' : 'text-brume')}>
                <Icone className="size-6" />
                {o.label}
                {o.to === '/carnet' && nonLus > 0 && <span className="absolute right-[22%] top-1 rounded-full bg-alerte px-1.5 text-[10px] leading-4 text-white">{nonLus}</span>}
              </NavLink>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
