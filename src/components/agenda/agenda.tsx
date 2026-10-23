import clsx from 'clsx'
import { Bus, ClipboardCheck, EyeOff, Info, PartyPopper, TreePalm, Users, type LucideIcon } from 'lucide-react'
import { fmtJourCourt, fmtMois } from '../../lib/dates'
import type { EvenementAgenda, Reglages } from '../../lib/types'

export type TypeAgenda = EvenementAgenda['type']

export const TYPES_AGENDA: Record<TypeAgenda, { nom: string; icone: LucideIcon; couleur: string; fond: string }> = {
  sortie: { nom: 'Sortie', icone: Bus, couleur: '#0B9A8D', fond: '#DDF5F2' },
  evaluation: { nom: 'Évaluation', icone: ClipboardCheck, couleur: '#B37400', fond: '#FFF4DC' },
  reunion: { nom: 'Réunion', icone: Users, couleur: '#7B4DFF', fond: '#EEE8FF' },
  info: { nom: 'Info', icone: Info, couleur: '#3358E0', fond: '#ECF0FF' },
  fete: { nom: 'Fête', icone: PartyPopper, couleur: '#DB2D84', fond: '#FCE4F0' },
  vacances: { nom: 'Vacances', icone: TreePalm, couleur: '#13A35B', fond: '#E1F6EA' },
}
export const TYPES_SAISIE: TypeAgenda[] = ['sortie', 'evaluation', 'reunion', 'info', 'fete']

/** Un élément affiché : un événement de la table ou des vacances tirées des réglages */
export type ElementAgenda = { cle: string; date: string; fin: string | null; titre: string; details: string | null; heure: string | null; type: TypeAgenda; ev?: EvenementAgenda }

export function avecVacances(evs: EvenementAgenda[], r: Reglages | undefined): ElementAgenda[] {
  const liste: ElementAgenda[] = evs.map((e) => ({ cle: e.id, date: e.date, fin: e.fin, titre: e.titre, details: e.details, heure: e.heure, type: e.type, ev: e }))
  for (const v of r?.vacances ?? []) {
    liste.push({ cle: `vac-${v.debut}`, date: v.debut, fin: v.fin, titre: v.nom, details: null, heure: null, type: 'vacances' })
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

export const couvre = (e: { date: string; fin: string | null }, jour: string) => e.date <= jour && jour <= (e.fin ?? e.date)

/** Un événement en carte pastel (couleur du type) */
export function CarteEvenement({ e, onClick, attenue, masque }: { e: ElementAgenda; onClick?: () => void; attenue?: boolean; masque?: boolean }) {
  const t = TYPES_AGENDA[e.type]
  const Icone = t.icone
  const plusieursJours = e.fin && e.fin !== e.date
  const Contenu = (
    <>
      <Icone className="mt-0.5 size-4 shrink-0 self-start" strokeWidth={2.2} style={{ color: t.couleur }} aria-label={t.nom} />
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 font-semibold leading-snug text-encre">{e.titre}</span>
        {(e.heure || plusieursJours) && (
          <span className="mt-0.5 block text-xs text-brume">
            {[e.heure, plusieursJours ? `jusqu'au ${fmtJourCourt(e.fin!)}` : null].filter(Boolean).join(', ')}
          </span>
        )}
        {e.details && <span className="mt-1 line-clamp-2 block text-sm text-encre/75">{e.details}</span>}
      </span>
      {masque && <EyeOff className="size-4 shrink-0 text-brume" aria-label="Pas visible des familles" />}
    </>
  )
  const cls = clsx('flex w-full items-center gap-2.5 rounded-xl border-l-[3px] py-2.5 pl-3 pr-2.5 text-left', attenue && 'opacity-60', masque && 'border border-l-[3px] border-dashed border-trait')
  const style = { background: masque ? '#fff' : t.fond, borderLeftColor: t.couleur }
  return onClick
    ? <button type="button" onClick={onClick} className={clsx(cls, 'transition hover:brightness-[0.98]')} style={style}>{Contenu}</button>
    : <div className={cls} style={style}>{Contenu}</div>
}
