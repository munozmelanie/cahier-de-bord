import clsx from 'clsx'
import { useEffect, useState, type ReactNode } from 'react'
import { aujourdhui, fmtJour, fmtNumero, maj1, vacancesDe } from '../lib/dates'
import type { Reglages } from '../lib/types'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'

const jourCourt = (s: string) => format(parseISO(s), 'EEE', { locale: fr }).replace('.', '')

/** Semaine en colonnes (ordinateur) ou un jour à la fois avec des pastilles (téléphone) */
export function CalendrierSemaine({ jours, reglages, rendu, compte, actionJour, liste }: {
  jours: string[]; reglages?: Reglages; rendu: (date: string) => ReactNode; compte?: (date: string) => number; actionJour?: (date: string) => ReactNode
  /** Les jours les uns sous les autres, sur tous les écrans (familles) */
  liste?: boolean
}) {
  const auj = aujourdhui()
  const [choisi, setChoisi] = useState(() => jours.find((j) => j >= auj) ?? jours[0])
  useEffect(() => { if (!jours.includes(choisi)) setChoisi(jours.find((j) => j >= auj) ?? jours[0]) }, [jours, choisi, auj])

  const entete = (j: string, mobile = false) => {
    const n = compte?.(j) ?? 0
    return (
      <div className={clsx('flex items-center gap-2', mobile ? '' : 'mb-3')}>
        <span className={clsx('flex size-10 flex-col items-center justify-center rounded-xl leading-none', j === auj ? 'bg-bateau text-white' : 'bg-papier text-encre')}>
          <span className="text-base font-bold">{fmtNumero(j)}</span>
          <span className="text-[10px] font-medium">{jourCourt(j)}</span>
        </span>
        {n > 0 && <span className="rounded-full bg-encre/[.06] px-2 text-xs font-semibold leading-5 text-brume">{n}</span>}
        <span className="ml-auto">{actionJour?.(j)}</span>
      </div>
    )
  }
  const contenu = (j: string) => {
    const vac = vacancesDe(j, reglages)
    if (vac) return <div className="rounded-xl bg-ambre-clair p-3 text-center text-sm font-medium text-ambre-fonce">{vac.nom}</div>
    return rendu(j)
  }

  if (liste) {
    return (
      <div className="flex flex-col gap-3">
        {jours.map((j) => {
          const n = compte?.(j) ?? 0
          return (
            <section key={j} className={clsx('rounded-3xl bg-white p-4 shadow-doux', j === auj && 'ring-2 ring-bateau/40')}>
              <div className="mb-3 flex items-center gap-2">
                <h2 className="text-[15px] font-semibold text-encre">{maj1(fmtJour(j))}</h2>
                {n > 0 && <span className="rounded-full bg-encre/[.06] px-2 text-xs font-semibold leading-5 text-brume">{n}</span>}
                <span className="ml-auto">{actionJour?.(j)}</span>
              </div>
              <div className="flex flex-col gap-2">{contenu(j)}</div>
            </section>
          )
        })}
      </div>
    )
  }

  return (
    <>
      <div className="hidden gap-3 md:grid" style={{ gridTemplateColumns: `repeat(${jours.length}, minmax(0, 1fr))` }}>
        {jours.map((j) => (
          <div key={j} className={clsx('min-h-[220px] rounded-3xl bg-white p-3 shadow-doux', j === auj && 'ring-2 ring-bateau/40')}>
            {entete(j)}
            <div className="flex flex-col gap-2">{contenu(j)}</div>
          </div>
        ))}
      </div>
      <div className="md:hidden">
        <div className="mb-3 flex gap-2">
          {jours.map((j) => {
            const n = compte?.(j) ?? 0
            return (
              <button key={j} type="button" onClick={() => setChoisi(j)}
                className={clsx('relative flex flex-1 flex-col items-center rounded-xl py-2 leading-none transition', j === choisi ? 'bg-encre text-white' : 'bg-white text-encre shadow-doux', j === auj && j !== choisi && 'ring-2 ring-bateau')}>
                <span className="text-lg font-bold">{fmtNumero(j)}</span>
                <span className="mt-0.5 text-[11px] font-medium opacity-80">{jourCourt(j)}</span>
                {n > 0 && <span className={clsx('absolute -right-1 -top-1 min-w-5 rounded-full px-1 text-[10px] font-bold leading-5', j === choisi ? 'bg-white text-encre shadow' : 'bg-bateau text-white')}>{n}</span>}
              </button>
            )
          })}
        </div>
        {actionJour && <div className="mb-2 flex justify-end">{actionJour(choisi)}</div>}
        <div className="flex flex-col gap-2">{contenu(choisi)}</div>
      </div>
    </>
  )
}
