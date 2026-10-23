import clsx from 'clsx'
import { Check, Clock, Eye, Signature } from 'lucide-react'
import { fmtDateHeure } from '../../lib/dates'
import type { Eleve, Lecture, Message, ParentLien } from '../../lib/types'

/** Qui a signé un mot « à signer » (une ligne par élève concerné) */
export function Signatures({ racine, eleves, lectures, parents }: {
  racine: Message; eleves: Eleve[]; lectures: Lecture[]; parents: ParentLien[]
}) {
  const concernes = racine.eleve_id ? eleves.filter((e) => e.id === racine.eleve_id) : eleves.filter((e) => e.actif)
  const nomParent = (l: Lecture) => {
    const p = parents.find((x) => x.user_id === l.user_id && x.eleve_id === l.eleve_id)
    return [p?.nom_affiche, p?.lien ? `(${p.lien})` : null].filter(Boolean).join(' ') || 'Famille'
  }
  const etat = concernes.map((e) => {
    const lignes = lectures.filter((l) => l.eleve_id === e.id)
    const signe = lignes.find((l) => l.signe_le)
    return { e, signe, lu: lignes.length > 0 }
  })
  const nbSignes = etat.filter((x) => x.signe).length
  const pct = concernes.length ? Math.round((nbSignes / concernes.length) * 100) : 0

  return (
    <section className="rounded-3xl bg-white p-4 shadow-doux">
      <div className="mb-3 flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-xl bg-succes-clair text-succes"><Signature className="size-5" /></span>
        <p className="flex-1 font-bold text-encre">{nbSignes} / {concernes.length} signé{nbSignes > 1 ? 's' : ''}</p>
      </div>
      {concernes.length > 1 && (
        <div className="mb-4 h-2 overflow-hidden rounded-full bg-trait" aria-hidden>
          <div className="h-full rounded-full bg-succes transition-all" style={{ width: `${pct}%` }} />
        </div>
      )}
      {etat.some((x) => x.signe) && (
        <ul className="mb-3 grid gap-1.5 sm:grid-cols-2">
          {etat.filter((x) => x.signe).map(({ e, signe }) => (
            <li key={e.id} className="flex min-w-0 items-center gap-2 rounded-2xl bg-succes-clair px-3 py-2">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-succes text-white"><Check className="size-4" strokeWidth={3} /></span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold text-encre">{e.prenom}</span>
                <span className="block truncate text-xs text-succes">{nomParent(signe!)} · {fmtDateHeure(signe!.signe_le!)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
      {etat.some((x) => !x.signe) && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Pas encore signé">
          {etat.filter((x) => !x.signe).map(({ e, lu }) => (
            <li key={e.id} className={clsx('flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-bold', lu ? 'bg-bateau-clair text-bateau-fonce' : 'bg-papier text-brume')}
              title={lu ? 'Lu, pas encore signé' : 'Pas encore lu'}>
              {lu ? <Eye className="size-3.5" /> : <Clock className="size-3.5" />}{e.prenom}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
