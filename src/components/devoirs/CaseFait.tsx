import clsx from 'clsx'
import { Check } from 'lucide-react'
import { useEffect, useState } from 'react'

const CLE = 'cdb-devoirs-faits'
function lire(): string[] { try { return JSON.parse(localStorage.getItem(CLE) ?? '[]') } catch { return [] } }

/** Case « fait » des familles (gardée sur l'appareil seulement) */
export function useFaits() {
  const [faits, setFaits] = useState<string[]>(lire)
  useEffect(() => {
    const f = () => setFaits(lire())
    window.addEventListener('storage', f)
    return () => window.removeEventListener('storage', f)
  }, [])
  const basculer = (id: string) => {
    const n = faits.includes(id) ? faits.filter((x) => x !== id) : [...faits, id].slice(-500)
    setFaits(n)
    try { localStorage.setItem(CLE, JSON.stringify(n)) } catch { /* rien */ }
  }
  return { faits, basculer }
}

export function CaseFait({ fait, onClick }: { fait: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={fait} aria-label={fait ? 'Marquer comme pas fait' : 'Marquer comme fait'}
      className={clsx('flex size-8 shrink-0 items-center justify-center rounded-xl border-2 transition', fait ? 'border-succes bg-succes text-white' : 'border-trait bg-white text-transparent hover:border-succes')}>
      <Check className="size-5" strokeWidth={3} />
    </button>
  )
}
