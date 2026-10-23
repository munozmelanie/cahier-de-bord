import clsx from 'clsx'
import {
  BookCheck, CalendarDays, CalendarRange, ClipboardCheck, GraduationCap, Layers, LayoutGrid, ListChecks, LogOut,
  MessagesSquare, NotebookPen, Sailboat, Settings, Sparkles, Sun, Users, type LucideIcon,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Feuille } from '../components/ui'
import { BandeauDemo } from '../components/BandeauDemo'
import { useLectures, useMessages } from '../lib/donnees'
import { useSession } from '../lib/session'
import { MODE_DEMO } from '../lib/supabase'

type Lien = { to: string; label: string; icone: LucideIcon; fin?: boolean }

const PRINCIPAUX: Lien[] = [
  { to: '/', label: "Aujourd'hui", icone: Sun, fin: true },
  { to: '/journal', label: 'Cahier journal', icone: NotebookPen },
  { to: '/devoirs', label: 'Devoirs', icone: BookCheck },
  { to: '/carnet', label: 'Carnet de liaison', icone: MessagesSquare },
]
const PREPARATION: Lien[] = [
  { to: '/edt', label: 'Emploi du temps', icone: CalendarRange },
  { to: '/progressions', label: 'Progressions', icone: ListChecks },
  { to: '/sequences', label: 'Séquences', icone: Layers },
]
const SUIVI: Lien[] = [
  { to: '/evaluations', label: 'Évaluations', icone: ClipboardCheck },
  { to: '/lsu', label: 'Livret (LSU)', icone: GraduationCap },
  { to: '/agenda', label: 'Agenda', icone: CalendarDays },
  { to: '/eleves', label: 'Élèves et familles', icone: Users },
]
const OUTILS: Lien[] = [
  { to: '/ia', label: 'ChatGPT / Claude', icone: Sparkles },
  { to: '/reglages', label: 'Réglages', icone: Settings },
]

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

const COULEURS: Record<string, [string, string]> = {
  '/edt': ['#0A8FD6', '#E0F3FD'], '/progressions': ['#13A35B', '#E1F6EA'], '/sequences': ['#7B4DFF', '#EEE8FF'],
  '/evaluations': ['#F2711C', '#FFEEDF'], '/lsu': ['#2E5BFF', '#E6ECFF'], '/agenda': ['#E0457B', '#FDE8F0'],
  '/eleves': ['#B9770E', '#FCF0D9'], '/ia': ['#C135D8', '#F8E6FB'], '/reglages': ['#4F5D7A', '#E9ECF3'],
}

/** Icône de la barre latérale, avec son nom en bulle au survol */
function Element({ l, nonLus }: { l: Lien; nonLus?: number }) {
  const Icone = l.icone
  return (
    <NavLink
      to={l.to}
      end={l.fin}
      aria-label={l.label}
      className={({ isActive }) => clsx('group relative flex size-12 items-center justify-center rounded-2xl transition',
        isActive ? 'bg-bateau text-white shadow-doux' : 'text-encre/60 hover:bg-white hover:text-encre')}
    >
      <Icone className="size-6" strokeWidth={2.1} />
      {!!nonLus && <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-alerte px-1 text-center text-[11px] font-bold leading-5 text-white">{nonLus}</span>}
      <span className="pointer-events-none absolute left-full z-50 ml-3 whitespace-nowrap rounded-xl bg-encre px-3 py-1.5 text-sm font-bold text-white opacity-0 shadow-flotte transition group-hover:opacity-100 group-focus-visible:opacity-100">
        {l.label}
      </span>
    </NavLink>
  )
}

/** Tuile du menu « Plus » (téléphone) */
function Tuile({ l, onClick }: { l: Lien; onClick: () => void }) {
  const Icone = l.icone
  const [c, f] = COULEURS[l.to] ?? ['#2E5BFF', '#E6ECFF']
  return (
    <NavLink to={l.to} onClick={onClick} className="flex flex-col items-center gap-2 rounded-3xl bg-white p-3 text-center text-xs font-bold text-encre shadow-doux">
      <span className="flex size-12 items-center justify-center rounded-2xl" style={{ background: f, color: c }}><Icone className="size-6" /></span>
      {l.label.replace(' (LSU)', '').replace(' et familles', '').replace('ChatGPT / Claude', 'ChatGPT')}
    </NavLink>
  )
}

export function ProfShell() {
  const { deconnexion } = useSession()
  const nonLus = useNonLus()
  const [plus, setPlus] = useState(false)
  const loc = useLocation()
  const dansPlus = [...PREPARATION, ...SUIVI, ...OUTILS].some((l) => loc.pathname.startsWith(l.to))
  const separateur = <span className="my-1 h-px w-8 bg-trait" />

  return (
    <div className="min-h-dvh">
      <BandeauDemo />
      {/* Barre d'icônes (ordinateur) */}
      <aside className={clsx('fixed bottom-0 left-0 z-30 hidden w-20 flex-col items-center gap-1.5 border-r border-trait bg-[#EEF2FB] py-4 lg:flex', MODE_DEMO ? 'top-9' : 'top-0')}>
        <span className="mb-2 flex size-12 items-center justify-center rounded-2xl bg-encre text-white" title="Cahier de bord"><Sailboat className="size-6" /></span>
        {PRINCIPAUX.map((l) => <Element key={l.to} l={l} nonLus={l.to === '/carnet' ? nonLus : 0} />)}
        {separateur}
        {PREPARATION.map((l) => <Element key={l.to} l={l} />)}
        {separateur}
        {SUIVI.map((l) => <Element key={l.to} l={l} />)}
        {separateur}
        {OUTILS.map((l) => <Element key={l.to} l={l} />)}
        <button onClick={deconnexion} aria-label="Se déconnecter" title="Se déconnecter" className="mt-auto flex size-12 items-center justify-center rounded-2xl text-brume hover:bg-white hover:text-encre">
          <LogOut className="size-5" />
        </button>
      </aside>

      <main className="px-[max(16px,env(safe-area-inset-left))] pb-28 pt-5 sm:px-6 lg:ml-20 lg:px-10 lg:pb-12 lg:pt-8">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>

      {/* Barre du bas (téléphone, tablette) : icônes seules */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-trait bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-5 px-2 py-1.5">
          {PRINCIPAUX.map((l) => {
            const Icone = l.icone
            return (
              <NavLink key={l.to} to={l.to} end={l.fin} aria-label={l.label}
                className={({ isActive }) => clsx('relative mx-auto flex size-12 items-center justify-center rounded-2xl transition', isActive ? 'bg-bateau text-white' : 'text-brume')}>
                <Icone className="size-6" />
                {l.to === '/carnet' && nonLus > 0 && <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-alerte px-1 text-center text-[11px] font-bold leading-5 text-white">{nonLus}</span>}
              </NavLink>
            )
          })}
          <button onClick={() => setPlus(true)} aria-label="Plus" className={clsx('mx-auto flex size-12 items-center justify-center rounded-2xl', dansPlus ? 'bg-bateau text-white' : 'text-brume')}>
            <LayoutGrid className="size-6" />
          </button>
        </div>
      </nav>

      <Feuille ouverte={plus} onFermer={() => setPlus(false)} titre="">
        <div className="grid grid-cols-3 gap-3 pb-2">
          {[...PREPARATION, ...SUIVI, ...OUTILS].map((l) => <Tuile key={l.to} l={l} onClick={() => setPlus(false)} />)}
        </div>
        <button onClick={deconnexion} className="mx-auto mt-4 flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold text-brume">
          <LogOut className="size-4" /> Déconnexion
        </button>
      </Feuille>
    </div>
  )
}
