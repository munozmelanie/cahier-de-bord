import clsx from 'clsx'
import { Bus, ClipboardCheck, Info, PartyPopper, TreePalm, Users, type LucideIcon } from 'lucide-react'
import { fmtJourCourt, fmtJourSemaine, fmtMois, fmtNumero } from '../../lib/dates'
import type { EvenementAgenda, Reglages } from '../../lib/types'

export type TypeAgenda = EvenementAgenda['type']

export const TYPES_AGENDA: Record<TypeAgenda, { nom: string; icone: LucideIcon; couleur: string; fond: string }> = {
  sortie: { nom: 'Sortie', icone: Bus, couleur: '#0B9A8D', fond: '#DDF5F2' },
  evaluation: { nom: 'Évaluation', icone: ClipboardCheck, couleur: '#B37400', fond: '#FFF4DC' },
  reunion: { nom: 'Réunion', icone: Users, couleur: '#7B4DFF', fond: '#EEE8FF' },
  info: { nom: 'Info', icone: Info, couleur: '#2E5BFF', fond: '#E6ECFF' },
  fete: { nom: 'Fête', icone: PartyPopper, couleur: '#DB2D84', fond: '#FCE4F0' },
  vacances: { nom: 'Vacances', icone: TreePalm, couleur: '#13A35B', fond: '#E1F6EA' },
}
export const TYPES_SAISIE: TypeAgenda[] = ['sortie', 'evaluation', 'reunion', 'info', 'fete']

/** Un élément affiché : un événement de la table ou des vacances tirées des réglages */
export type ElementAgenda = { cle: string; date: string; fin: string | null; titre: string; details: string | null; heure: string | null; type: TypeAgenda; ev?: EvenementAgenda }

export function avecVacances(evs: EvenementAgenda[], r: Reglages | undefined): ElementAgenda[] {
  const liste: ElementAgenda[] = evs.map((e) => ({ cle: e.id, date: e.date, fin: e.fin, titre: e.titre, details: e.details, heure: e.heure, type: e.type, ev: e }))
  for (const v of r?.vacances ?? []) {
    liste.push({ cle: `vac-${v.debut}`, date: v.debut, fin: v.fin, titre: `Vacances : ${v.nom}`, details: null, heure: null, type: 'vacances' })
  }
  return liste.sort((a, b) => a.date.localeCompare(b.date) || a.titre.localeCompare(b.titre))
}

/** Regroupe par mois (« novembre 2026 ») en gardant l'ordre */
export function parMois(liste: ElementAgenda[]) {
  const g: { mois: string; elements: ElementAgenda[] }[] = []
  for (const e of liste) {
    const mois = fmtMois(e.date)
    const dernier = g[g.length - 1]
    if (dernier && dernier.mois === mois) dernier.elements.push(e)
    else g.push({ mois, elements: [e] })
  }
  return g
}

export function plage(e: { date: string; fin: string | null }) {
  if (!e.fin || e.fin === e.date) return fmtJourSemaine(e.date)
  return `du ${fmtJourCourt(e.date)} au ${fmtJourCourt(e.fin)}`
}

export function CarteEvenement({ e, onClick, attenue, masque }: { e: ElementAgenda; onClick?: () => void; attenue?: boolean; masque?: boolean }) {
  const t = TYPES_AGENDA[e.type]
  const Icone = t.icone
  const Contenu = (
    <>
      <span className="flex w-12 shrink-0 flex-col items-center rounded-2xl py-1.5" style={{ background: t.fond, color: t.couleur }}>
        <span className="font-titre text-2xl font-semibold leading-none">{fmtNumero(e.date)}</span>
        <Icone className="mt-1 size-4" strokeWidth={2.4} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-bold leading-snug text-encre">{e.titre}</span>
        <span className="block text-sm text-brume first-letter:uppercase">
          {plage(e)}{e.heure ? ` · ${e.heure}` : ''}{masque ? ' · non visible des familles' : ''}
        </span>
        {e.details && <span className="mt-1 block whitespace-pre-wrap text-sm text-encre/80">{e.details}</span>}
      </span>
    </>
  )
  const cls = clsx('flex w-full items-start gap-3 rounded-3xl bg-white p-3 text-left shadow-doux', attenue && 'opacity-60', masque && 'border-2 border-dashed border-trait shadow-none')
  return onClick ? <button onClick={onClick} className={clsx(cls, 'transition hover:ring-2 hover:ring-bateau/30')}>{Contenu}</button> : <div className={cls}>{Contenu}</div>
}
