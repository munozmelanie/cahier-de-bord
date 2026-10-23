import clsx from 'clsx'
import { Check, Eye, Signature } from 'lucide-react'
import { fmtDateHeure } from '../../lib/dates'
import type { Eleve, Lecture, Message, ParentLien } from '../../lib/types'

/** Qui a signé : un gros compteur, puis une pastille par élève (vert = signé, gris = pas encore) */
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
    return { e, signe: lignes.find((l) => l.signe_le), lu: lignes.length > 0 }
  })
  const nbSignes = etat.filter((x) => x.signe).length
  const complet = nbSignes === concernes.length && concernes.length > 0

  return (
    <section className="rounded-3xl bg-white p-4 shadow-doux" aria-label="Signatures">
      <div className="mb-3 flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-succes-clair text-succes"><Signature className="size-6" /></span>
        <span className={clsx('font-titre text-3xl font-semibold leading-none', complet ? 'text-succes' : 'text-encre')}>
          {nbSignes}<span className="text-xl text-brume"> / {concernes.length}</span>
        </span>
      </div>
      <ul className="flex flex-wrap gap-1.5">
        {etat.map(({ e, signe, lu }) => (
          <li key={e.id}
            title={signe ? `${nomParent(signe)} · ${fmtDateHeure(signe.signe_le!)}` : lu ? 'Lu, pas encore signé' : 'Pas encore lu'}
            className={clsx('flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-semibold',
              signe ? 'bg-succes text-white' : lu ? 'bg-bateau-clair text-bateau-fonce' : 'bg-papier text-brume')}>
            {signe ? <Check className="size-3.5" strokeWidth={3} /> : lu ? <Eye className="size-3.5" /> : null}
            {e.prenom}
          </li>
        ))}
      </ul>
    </section>
  )
}
