import clsx from 'clsx'
import { Check, Megaphone, Send, Signature } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { BoutonIcone } from '../ui'
import { fmtDateHeure } from '../../lib/dates'
import type { Eleve, Lecture, Message } from '../../lib/types'

export type Fil = { racine: Message; reponses: Message[]; dernier: string }

/** Regroupe les messages en fils (un début de fil + ses réponses), le plus récent d'abord */
export function construireFils(messages: Message[]): Fil[] {
  const reponses = new Map<string, Message[]>()
  for (const m of messages) {
    if (!m.racine_id) continue
    const l = reponses.get(m.racine_id) ?? []
    l.push(m)
    reponses.set(m.racine_id, l)
  }
  return messages
    .filter((m) => !m.racine_id)
    .map((racine) => {
      const rep = (reponses.get(racine.id) ?? []).sort((a, b) => a.created_at.localeCompare(b.created_at))
      const dernier = rep.length ? rep[rep.length - 1].created_at : racine.created_at
      return { racine, reponses: rep, dernier }
    })
    .sort((a, b) => b.dernier.localeCompare(a.dernier))
}

export const titreFil = (m: Message) => m.titre?.trim() || m.texte.split('\n')[0].slice(0, 60)

/** Couleur stable par élève, pour les pastilles */
const TEINTES = ['#3358E0', '#E0457B', '#13A35B', '#F2711C', '#7B4DFF', '#0B9A8D', '#C135D8', '#B9770E', '#E5484D', '#0A8FD6']
export function teinte(id: string | null | undefined) {
  if (!id) return TEINTES[0]
  let h = 0
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return TEINTES[h % TEINTES.length]
}

/** Fond pastel tiré de la teinte de l'élève */
export const fondTeinte = (id: string | null | undefined) => teinte(id) + '1F'

export function Avatar({ eleve, classe }: { eleve?: Eleve | null; classe?: boolean; blanc?: boolean }) {
  if (classe || !eleve) {
    return (
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ambre-clair text-ambre-fonce" aria-hidden>
        <Megaphone className="size-4" strokeWidth={2.2} />
      </span>
    )
  }
  const c = teinte(eleve.id)
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold" style={{ background: fondTeinte(eleve.id), color: c }} aria-hidden>
      {eleve.prenom.slice(0, 1)}
    </span>
  )
}

/** Un fil : avatar, titre, une ligne d'aperçu ; non lu = point bleu et texte appuyé */
export function CarteFil({ titre, apercu, eleve, classe, date, actif, nonLus, signature, onClick }: {
  titre: string; apercu: string; eleve?: Eleve | null; classe?: boolean; date: string; actif?: boolean; nonLus?: number
  signature?: { etat: 'attente' | 'signe'; texte?: string } | null; onClick: () => void
}) {
  return (
    <button type="button" onClick={onClick}
      className={clsx('flex w-full items-center gap-3 rounded-2xl bg-white p-3 text-left shadow-doux transition hover:bg-[#FAFBFC]', actif && 'ring-2 ring-bateau')}>
      <Avatar eleve={eleve} classe={classe} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          {!!nonLus && <span className="size-2 shrink-0 rounded-full bg-bateau" aria-label={`${nonLus} non lu`} />}
          <span className={clsx('truncate text-[15px] text-encre', nonLus ? 'font-bold' : 'font-semibold')}>{titre}</span>
          <span className="ml-auto shrink-0 text-xs text-brume">{date}</span>
        </span>
        <span className="mt-0.5 flex items-center gap-2">
          <span className={clsx('min-w-0 flex-1 truncate text-sm', nonLus ? 'text-encre' : 'text-brume')}>{apercu}</span>
          {signature && (
            <span className={clsx('inline-flex shrink-0 items-center gap-1 text-xs font-semibold', signature.etat === 'signe' ? 'text-succes' : 'text-ambre-fonce')}>
              {signature.etat === 'signe' ? <Check className="size-3.5" strokeWidth={3} /> : <Signature className="size-3.5" />}
              {signature.texte ?? (signature.etat === 'signe' ? 'Signé' : 'À signer')}
            </span>
          )}
        </span>
      </span>
    </button>
  )
}

export function Bulle({ m, moi }: { m: Message; moi: boolean }) {
  return (
    <div className={clsx('flex flex-col gap-1', moi ? 'items-end' : 'items-start')}>
      <div className={clsx('max-w-[85%] rounded-2xl px-4 py-3', moi ? 'rounded-br-md bg-bateau text-white' : 'rounded-bl-md bg-white text-encre shadow-doux')}>
        {m.titre && !m.racine_id && <p className={clsx('mb-1 font-semibold leading-snug', moi ? 'text-white' : 'text-encre')}>{m.titre}</p>}
        <p className="whitespace-pre-wrap break-words leading-relaxed">{m.texte}</p>
      </div>
      <p className="px-2 text-[11px] text-brume">{[m.auteur_nom, fmtDateHeure(m.created_at)].filter(Boolean).join(', ')}</p>
    </div>
  )
}

export function ZoneReponse({ onEnvoyer, placeholder = 'Répondre…', enCours }: { onEnvoyer: (t: string) => Promise<unknown> | void; placeholder?: string; enCours?: boolean }) {
  const [texte, setTexte] = useState('')
  async function envoyer(e: FormEvent) {
    e.preventDefault()
    const t = texte.trim()
    if (!t) return
    await onEnvoyer(t)
    setTexte('')
  }
  return (
    <form onSubmit={envoyer} className="flex items-end gap-2 rounded-2xl border border-trait bg-white p-1.5 pl-4 focus-within:border-bateau">
      <textarea
        value={texte}
        onChange={(e) => setTexte(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) envoyer(e as unknown as FormEvent) }}
        rows={1}
        placeholder={placeholder}
        aria-label={placeholder}
        className="max-h-40 min-h-[2.5rem] flex-1 resize-none bg-transparent py-2 text-encre placeholder:text-brume/70 focus:outline-none"
      />
      <BoutonIcone icone={Send} label="Envoyer" type="submit" variante="primaire" disabled={!texte.trim() || enCours} />
    </form>
  )
}

/** Lectures indexées : message → lignes */
export function indexLectures(lectures: Lecture[] | undefined) {
  const parMessage = new Map<string, Lecture[]>()
  for (const l of lectures ?? []) {
    const t = parMessage.get(l.message_id) ?? []
    t.push(l)
    parMessage.set(l.message_id, t)
  }
  return parMessage
}
