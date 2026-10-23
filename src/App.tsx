import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Chargement, ToastProvider } from './components/ui'
import { SessionProvider, useSession } from './lib/session'
import { ProfShell } from './layouts/ProfShell'
import { ParentShell } from './layouts/ParentShell'
import Connexion from './pages/auth/Connexion'
import Relier from './pages/auth/Relier'
import Aujourdhui from './pages/prof/Aujourdhui'
import Journal from './pages/prof/Journal'
import Edt from './pages/prof/Edt'
import DevoirsProf from './pages/prof/Devoirs'
import CarnetProf from './pages/prof/Carnet'
import AgendaProf from './pages/prof/Agenda'
import Eleves from './pages/prof/Eleves'
import Evaluations from './pages/prof/Evaluations'
import Lsu from './pages/prof/Lsu'
import Progressions from './pages/prof/Progressions'
import Sequences from './pages/prof/Sequences'
import Ia from './pages/prof/Ia'
import Reglages from './pages/prof/Reglages'
import AccueilParent from './pages/parent/Accueil'
import DevoirsParent from './pages/parent/Devoirs'
import CarnetParent from './pages/parent/Carnet'
import AgendaParent from './pages/parent/Agenda'
import Livret from './pages/parent/Livret'
import Remplacant from './pages/Remplacant'

function Routeur() {
  const { pret, userId, role } = useSession()
  const loc = useLocation()
  // Lien du QR code remplaçant : ouvert à tous, sans compte
  if (loc.pathname.startsWith('/r/')) {
    return (
      <Routes>
        <Route path="/r/:jeton" element={<Remplacant />} />
      </Routes>
    )
  }
  if (!pret) return <div className="min-h-dvh"><Chargement /></div>

  if (!userId) {
    return (
      <Routes>
        <Route path="*" element={<Connexion />} />
      </Routes>
    )
  }
  if (role === 'aucun') return <Relier />

  if (role === 'parent') {
    return (
      <Routes>
        <Route element={<ParentShell />}>
          <Route index element={<AccueilParent />} />
          <Route path="devoirs" element={<DevoirsParent />} />
          <Route path="carnet" element={<CarnetParent />} />
          <Route path="agenda" element={<AgendaParent />} />
          <Route path="livret" element={<Livret />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    )
  }

  return (
    <Routes>
      <Route element={<ProfShell />}>
        <Route index element={<Aujourdhui />} />
        <Route path="journal" element={<Journal />} />
        <Route path="journal/:date" element={<Journal />} />
        <Route path="devoirs" element={<DevoirsProf />} />
        <Route path="carnet" element={<CarnetProf />} />
        <Route path="edt" element={<Edt />} />
        <Route path="progressions" element={<Progressions />} />
        <Route path="sequences" element={<Sequences />} />
        <Route path="evaluations" element={<Evaluations />} />
        <Route path="lsu" element={<Lsu />} />
        <Route path="agenda" element={<AgendaProf />} />
        <Route path="eleves" element={<Eleves />} />
        <Route path="ia" element={<Ia />} />
        <Route path="reglages" element={<Reglages />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <SessionProvider>
        <HashRouter>
          <Routeur />
        </HashRouter>
      </SessionProvider>
    </ToastProvider>
  )
}
