import clsx from 'clsx'
import {
  BookCheck, CalendarDays, CalendarRange, ClipboardCheck, GraduationCap, Layers, ListChecks, LogOut, Menu,
  MessagesSquare, NotebookPen, Settings, Sparkles, Sun, Users, type LucideIcon,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Feuille } from '../components/ui'
import { BandeauDemo } from '../components/BandeauDemo'
import { CarteInstallation } from '../components/CarteInstallation'
import { Logo } from '../components/Logo'
import { useLectures, useMessages } from '../lib/donnees'
import { useSession } from '../lib/session'
import { MODE_DEMO } from '../lib/supabase'

type Lien = { to: string; label: string; court?: string; icone: LucideIcon; fin?: boolean }
type Groupe = { titre?: string; liens: Lien[] }

const GROUPES: Groupe[] = [
  {
    liens: [
      { to: '/', label: "Aujourd'hui", icone: Sun, fin: true },
      { to: '/journal', label: 'Cahier journal', court: 'Journal', icone: NotebookPen },
      { to: '/devoirs', label: 'Devoirs', icone: BookCheck },
      { to: '/carnet', label: 'Carnet de liaison', court: 'Carnet', icone: MessagesSquare },
      { to: '/agenda', label: 'Agenda', icone: CalendarDays },
    ],
  },
  {
    titre: 'Préparer',
    liens: [
      { to: '/edt', label: 'Emploi du temps', icone: CalendarRange },
      { to: '/progressions', label: 'Progressions', icone: ListChecks },
      { to: '/sequences', label: 'Séquences', icone: Layers },
    ],
  },
  {
    titre: 'Suivre',
    liens: [
      { to: '/evaluations', label: 'Évaluations', icone: ClipboardCheck },
      { to: '/lsu', label: 'Livret', icone: GraduationCap },
      { to: '/eleves', label: 'Élèves et familles', icone: Users },
    ],
  },
]
const PIED: Lien[] = [
  { to: '/ia', label: 'Assistant IA', icone: Sparkles },
  { to: '/reglages', label: 'Réglages', icone: Settings },
]
// Barre du bas (téléphone) : les quatre pages du quotidien, le reste dans « Menu »
const BAS = GROUPES[0].liens.slice(0, 4)

function useNonLus() {
  const { userId } = useSession()
  const msgs = useMessages()
  const lect = useLectures()
  return useMemo(() => {
    if (!msgs.data || !lect.data) return 0
    const lus = new Set(lect.data.filter((l) => l.user_id === userId).map((l) => l.message_id))
    return msgs.data.filter((m) => m.auteur_role === 'parent' && !lus.has(m.id)).length
  }, [msgs.data, lect.data, userId])
}

const Pastille = ({ n }: { n: number }) =>
  n > 0 ? <span className="ml-auto min-w-5 rounded-full bg-alerte px-1.5 text-center text-[11px] font-bold leading-5 text-white">{n}</span> : null

/** Ligne du menu : icône + nom de la page */
function Element({ l, nonLus = 0, onClick }: { l: Lien; nonLus?: number; onClick?: () => void }) {
  const Icone = l.icone
  return (
    <NavLink
      to={l.to}
      end={l.fin}
      onClick={onClick}
      className={({ isActive }) => clsx('group flex h-10 items-center gap-3 rounded-xl px-3 text-[15px] transition lg:h-9 lg:text-sm',
        isActive ? 'bg-bateau-clair font-semibold text-bateau-fonce' : 'font-medium text-encre/80 hover:bg-encre/[.04] hover:text-encre')}
    >
      {({ isActive }) => <>
        <Icone className={clsx('size-[18px] shrink-0', isActive ? 'text-bateau' : 'text-brume group-hover:text-encre/70')} strokeWidth={2} />
        <span className="truncate">{l.label}</span>
        <Pastille n={nonLus} />
      </>}
    </NavLink>
  )
}

function ListeMenu({ nonLus, onClick }: { nonLus: number; onClick?: () => void }) {
  return (
    <>
      {GROUPES.map((g, i) => (
        <div key={i} className={clsx('flex flex-col gap-0.5', i > 0 && 'mt-5')}>
          {g.titre && <p className="mb-1 px-3 text-xs font-semibold text-brume">{g.titre}</p>}
          {g.liens.map((l) => <Element key={l.to} l={l} nonLus={l.to === '/carnet' ? nonLus : 0} onClick={onClick} />)}
        </div>
      ))}
    </>
  )
}

export function ProfShell() {
  const { deconnexion, classe } = useSession()
  const nonLus = useNonLus()
  const [menu, setMenu] = useState(false)
  const loc = useLocation()
  const dansMenu = !BAS.some((l) => (l.fin ? loc.pathname === l.to : loc.pathname.startsWith(l.to)))

  return (
    <div className="min-h-dvh">
      <BandeauDemo />
      {/* Menu latéral (ordinateur) */}
      <aside className={clsx('fixed bottom-0 left-0 z-30 hidden w-60 flex-col border-r border-trait bg-white lg:flex', MODE_DEMO ? 'top-9' : 'top-0')}>
        <div className="px-5 pb-5 pt-3">
          <Logo compact sousTitre={classe?.nom} />
        </div>
        <nav className="flex-1 overflow-y-auto px-3" aria-label="Pages">
          <ListeMenu nonLus={nonLus} />
        </nav>
        <div className="flex flex-col gap-0.5 border-t border-trait px-3 py-3">
          {PIED.map((l) => <Element key={l.to} l={l} />)}
          <button onClick={deconnexion} className="flex h-9 items-center gap-3 rounded-xl px-3 text-sm font-medium text-brume transition hover:bg-encre/[.04] hover:text-encre">
            <LogOut className="size-[18px]" /> Se déconnecter
          </button>
        </div>
      </aside>

      <main className="px-[max(16px,env(safe-area-inset-left))] pb-28 pt-5 sm:px-6 lg:ml-60 lg:px-10 lg:pb-12 lg:pt-8">
        <div className="mx-auto max-w-6xl">
          <CarteInstallation className="mb-5 lg:hidden" />
          <Outlet />
        </div>
      </main>

      {/* Barre du bas (téléphone, tablette) */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-trait bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden" aria-label="Pages">
        <div className="mx-auto grid max-w-lg grid-cols-5 px-1 pt-1.5">
          {BAS.map((l) => {
            const Icone = l.icone
            return (
              <NavLink key={l.to} to={l.to} end={l.fin}
                className={({ isActive }) => clsx('flex flex-col items-center gap-0.5 pb-1.5 text-[11px] font-semibold', isActive ? 'text-bateau-fonce' : 'text-brume')}>
                {({ isActive }) => <>
                  <span className={clsx('relative flex h-7 w-12 items-center justify-center rounded-full transition', isActive && 'bg-bateau-clair')}>
                    <Icone className="size-5" strokeWidth={2} />
                    {l.to === '/carnet' && nonLus > 0 && <span className="absolute -top-1 right-1 min-w-4 rounded-full bg-alerte px-1 text-center text-[10px] font-bold leading-4 text-white">{nonLus}</span>}
                  </span>
                  {l.court ?? l.label}
                </>}
              </NavLink>
            )
          })}
          <button onClick={() => setMenu(true)} className={clsx('flex flex-col items-center gap-0.5 pb-1.5 text-[11px] font-semibold', dansMenu ? 'text-bateau-fonce' : 'text-brume')}>
            <span className={clsx('flex h-7 w-12 items-center justify-center rounded-full', dansMenu && 'bg-bateau-clair')}><Menu className="size-5" /></span>
            Menu
          </button>
        </div>
      </nav>

      <Feuille ouverte={menu} onFermer={() => setMenu(false)} titre="Menu">
        <nav aria-label="Toutes les pages">
          <ListeMenu nonLus={nonLus} onClick={() => setMenu(false)} />
          <div className="mt-5 flex flex-col gap-0.5 border-t border-trait pt-3">
            {PIED.map((l) => <Element key={l.to} l={l} onClick={() => setMenu(false)} />)}
            <button onClick={deconnexion} className="flex h-10 items-center gap-3 rounded-xl px-3 text-[15px] font-medium text-brume">
              <LogOut className="size-[18px]" /> Se déconnecter
            </button>
          </div>
        </nav>
      </Feuille>
    </div>
  )
}
