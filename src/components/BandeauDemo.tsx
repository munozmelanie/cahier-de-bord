import { APERCU, db, MODE_DEMO, quitterDemo } from '../lib/supabase'
import { useSession } from '../lib/session'

/** Bandeau du mode démo : passer d'un rôle à l'autre */
export function BandeauDemo() {
  const { role } = useSession()
  if (!MODE_DEMO) return null
  const entrer = (p: 'enseignant' | 'parent') => (db.auth as any).entrerComme(p)
  return (
    <div className="sticky top-0 z-50 flex flex-wrap items-center justify-center gap-2 bg-ambre px-3 py-1.5 text-sm font-semibold text-encre lg:pl-20">
      <span>Démo<span className="hidden sm:inline"> (données fictives)</span></span>
      <button onClick={() => entrer('enseignant')} className={`rounded-full px-2.5 py-0.5 ${role === 'enseignant' ? 'bg-white' : 'bg-white/40'}`}>Enseignante</button>
      <button onClick={() => entrer('parent')} className={`rounded-full px-2.5 py-0.5 ${role === 'parent' ? 'bg-white' : 'bg-white/40'}`}>Famille</button>
      {!APERCU && <button onClick={quitterDemo} className="underline">Quitter</button>}
    </div>
  )
}
