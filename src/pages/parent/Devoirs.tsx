import clsx from 'clsx'
import { BookCheck } from 'lucide-react'
import { useMemo, useState } from 'react'
import { CaseFait, useFaits } from '../../components/devoirs/CaseFait'
import { BadgeType } from '../../components/devoirs/devoirsOutils'
import { Chargement, Onglets, PastilleMatiere, Vide } from '../../components/ui'
import { useDevoirsPour } from '../../lib/donnees'
import { aujourdhui, decaler, fmtJour, maj1, quand } from '../../lib/dates'
import type { Devoir } from '../../lib/types'

export default function DevoirsParent() {
  const auj = aujourdhui()
  const [vue, setVue] = useState<'tous' | 'evaluations' | 'passes'>('tous')
  const futurs = useDevoirsPour(auj, decaler(auj, 35))
  const passes = useDevoirsPour(decaler(auj, -14), decaler(auj, -1))
  const { faits, basculer } = useFaits()
  const q = vue === 'passes' ? passes : futurs

  const groupes = useMemo(() => {
    const l = (q.data ?? []).filter((d) => vue !== 'evaluations' || d.type === 'evaluation')
    const m = new Map<string, Devoir[]>()
    for (const d of l) m.set(d.pour_le, [...(m.get(d.pour_le) ?? []), d])
    const g = [...m.entries()].sort(([a], [b]) => a.localeCompare(b))
    return vue === 'passes' ? g.reverse() : g
  }, [q.data, vue])

  return (
    <div className="flex flex-col gap-4">
      <Onglets valeur={vue} onChange={setVue} options={[{ id: 'tous', label: 'À venir' }, { id: 'evaluations', label: 'Évaluations' }, { id: 'passes', label: 'Passés' }]} />
      {q.isLoading ? <Chargement /> : groupes.length ? groupes.map(([date, l]) => (
        <section key={date} className="rounded-[28px] bg-white p-5 shadow-doux">
          <h2 className="font-titre text-xl font-semibold">Pour {quand(date, auj)}</h2>
          <p className="mb-3 text-sm font-bold text-brume">{maj1(fmtJour(date))}</p>
          <ul className="flex flex-col gap-3">
            {l.map((d) => {
              const fait = faits.includes(d.id)
              return (
                <li key={d.id} className="flex items-center gap-3">
                  <PastilleMatiere id={d.matiere} />
                  <span className={clsx('min-w-0 flex-1 font-bold leading-snug', d.type === 'evaluation' && 'text-alerte', fait && 'text-brume line-through')}>
                    {d.texte}
                    {d.type !== 'travail' && <span className="ml-2 align-middle"><BadgeType type={d.type} /></span>}
                  </span>
                  <CaseFait fait={fait} onClick={() => basculer(d.id)} />
                </li>
              )
            })}
          </ul>
        </section>
      )) : <Vide icone={BookCheck} texte="Aucun devoir" />}
    </div>
  )
}
