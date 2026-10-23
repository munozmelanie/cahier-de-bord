import clsx from 'clsx'
import {
  BookCheck, CalendarDays, CalendarRange, ClipboardCheck, GraduationCap, Layers, ListChecks, LogOut, Menu,
  MessagesSquare, NotebookPen, Settings, Sparkles, Sun, Users, type LucideIcon,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Feuille } from '../components/ui'
import { BandeauDemo } from '../components/BandeauDemo'
import { Logo } from '../components/Logo'
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

function Element({ l, nonLus, onClick }: { l: Lien; nonLus?: number; onClick?: () => void }) {
  const Icone = l.icone
  return (
    <NavLink
      to={l.to}
      end={l.fin}
      onClick={onClick}
      className={({ isActive }) => clsx('flex items-center gap-3 rounded-2xl px-3 py-2 font-bold transition',
        isActive ? 'bg-white text-bateau shadow-doux' : 'text-encre/75 hover:bg-white/60 hover:text-encre')}
    >
      <Icone className="size-5 shrink-0" />
      <span className="flex-1 truncate">{l.label}</span>
      {!!nonLus && <span className="rounded-full bg-alerte px-2 text-xs leading-5 text-white">{nonLus}</span>}
    </NavLink>
  )
}

function Groupe({ titre, liens, onClick }: { titre: string; liens: Lien[]; onClick?: () => void }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="px-3 pb-1 pt-4 text-xs font-bold text-brume">{titre}</p>
      {liens.map((l) => <Element key={l.to} l={l} onClick={onClick} />)}
    </div>
  )
}

export function ProfShell() {
  const { classe, deconnexion } = useSession()
  const nonLus = useNonLus()
  const [plus, setPlus] = useState(false)
  const loc = useLocation()
  const dansPlus = [...PREPARATION, ...SUIVI, ...OUTILS].some((l) => loc.pathname.startsWith(l.to))

  return (
    <div className="min-h-dvh">
      <BandeauDemo />
      {/* Barre latérale (ordinateur) */}
      <aside className={clsx("fixed bottom-0 left-0 z-30 hidden", MODE_DEMO ? "top-9" : "top-0", " w-64 flex-col gap-1 overflow-y-auto border-r border-trait bg-[#EEF2FB] px-3 py-5 lg:flex")}>
        <div className="mb-3 px-3"><Logo sousTitre={classe ? `${classe.nom} · ${classe.ecole ?? ''}` : undefined} /></div>
        {PRINCIPAUX.map((l) => <Element key={l.to} l={l} nonLus={l.to === '/carnet' ? nonLus : 0} />)}
        <Groupe titre="Préparer" liens={PREPARATION} />
        <Groupe titre="Suivre" liens={SUIVI} />
        <Groupe titre="Outils" liens={OUTILS} />
        <button onClick={deconnexion} className="mt-auto flex items-center gap-3 rounded-2xl px-3 py-2 font-bold text-brume hover:text-encre">
          <LogOut className="size-5" /> Se déconnecter
        </button>
      </aside>

      <main className="px-[max(16px,env(safe-area-inset-left))] pb-28 pt-5 sm:px-6 lg:ml-64 lg:px-10 lg:pb-12 lg:pt-8">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>

      {/* Barre du bas (téléphone, tablette) */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-trait bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {PRINCIPAUX.map((l) => {
            const Icone = l.icone
            return (
              <NavLink key={l.to} to={l.to} end={l.fin}
                className={({ isActive }) => clsx('relative flex flex-col items-center gap-0.5 py-2 text-[11px] font-bold', isActive ? 'text-bateau' : 'text-brume')}>
                <Icone className="size-6" />
                <span className="truncate">{l.label === 'Carnet de liaison' ? 'Carnet' : l.label === 'Cahier journal' ? 'Journal' : l.label}</span>
                {l.to === '/carnet' && nonLus > 0 && <span className="absolute right-[22%] top-1 rounded-full bg-alerte px-1.5 text-[10px] leading-4 text-white">{nonLus}</span>}
              </NavLink>
            )
          })}
          <button onClick={() => setPlus(true)} className={clsx('flex flex-col items-center gap-0.5 py-2 text-[11px] font-bold', dansPlus ? 'text-bateau' : 'text-brume')}>
            <Menu className="size-6" /> Plus
          </button>
        </div>
      </nav>

      <Feuille ouverte={plus} onFermer={() => setPlus(false)} titre="Menu">
        <div className="grid gap-1 pb-2">
          <Groupe titre="Préparer" liens={PREPARATION} onClick={() => setPlus(false)} />
          <Groupe titre="Suivre" liens={SUIVI} onClick={() => setPlus(false)} />
          <Groupe titre="Outils" liens={OUTILS} onClick={() => setPlus(false)} />
          <button onClick={deconnexion} className="mt-3 flex items-center gap-3 rounded-2xl px-3 py-2 font-bold text-brume">
            <LogOut className="size-5" /> Se déconnecter
          </button>
        </div>
      </Feuille>
    </div>
  )
}
