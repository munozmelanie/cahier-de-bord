import {
  BookOpen, Calculator, Coffee, Earth, FlaskConical, Footprints, Landmark, Languages, Monitor, Music,
  Palette, PenLine, Sailboat, Scale, Sparkles, Users, type LucideIcon,
} from 'lucide-react'
import { BLOCS_LSU } from './referentielLsu'

export type Matiere = {
  id: string
  nom: string
  court: string
  couleur: string
  fond: string
  icone: LucideIcon
  lsu?: string // matière du LSU à laquelle elle se rattache
}

// Une couleur et une icône par matière, comme les protège-cahiers
export const MATIERES: Matiere[] = [
  { id: 'francais', nom: 'Français', court: 'Français', couleur: '#E0457B', fond: '#FCEEF3', icone: PenLine, lsu: 'fr' },
  { id: 'lecture', nom: 'Lecture', court: 'Lecture', couleur: '#F2711C', fond: '#FEF2EB', icone: BookOpen, lsu: 'fr' },
  { id: 'maths', nom: 'Mathématiques', court: 'Maths', couleur: '#3358E0', fond: '#ECF0FF', icone: Calculator, lsu: 'ma' },
  { id: 'sciences', nom: 'Sciences', court: 'Sciences', couleur: '#13A35B', fond: '#EAF7F0', icone: FlaskConical, lsu: 'st' },
  { id: 'histoire', nom: 'Histoire', court: 'Histoire', couleur: '#B9770E', fond: '#F9F3E9', icone: Landmark, lsu: 'hg' },
  { id: 'geographie', nom: 'Géographie', court: 'Géo', couleur: '#0B9A8D', fond: '#E9F6F5', icone: Earth, lsu: 'hg' },
  { id: 'emc', nom: 'Enseignement moral et civique', court: 'EMC', couleur: '#7B4DFF', fond: '#F3EFFF', icone: Scale, lsu: 'emc' },
  { id: 'anglais', nom: 'Anglais', court: 'Anglais', couleur: '#E5484D', fond: '#FDEFEF', icone: Languages, lsu: 'lv' },
  { id: 'arts', nom: 'Arts plastiques', court: 'Arts', couleur: '#C135D8', fond: '#F9EDFB', icone: Palette, lsu: 'ap' },
  { id: 'musique', nom: 'Musique', court: 'Musique', couleur: '#DB2D84', fond: '#FCECF4', icone: Music, lsu: 'em' },
  { id: 'eps', nom: 'EPS', court: 'EPS', couleur: '#5B9E0F', fond: '#F0F6E9', icone: Footprints, lsu: 'eps' },
  { id: 'rituels', nom: 'Rituels', court: 'Rituels', couleur: '#0A8FD6', fond: '#E9F5FB', icone: Sailboat },
  { id: 'informatique', nom: 'Informatique', court: 'Info', couleur: '#4F5D7A', fond: '#EFF0F3', icone: Monitor },
  { id: 'vie', nom: 'Vie de classe', court: 'Vie de classe', couleur: '#6A7593', fond: '#F2F3F5', icone: Users },
]

const AUTRE: Matiere = { id: 'autre', nom: 'Autre', court: 'Autre', couleur: '#6A7593', fond: '#F2F3F5', icone: Sparkles }
export const PAUSE: Matiere = { id: 'pause', nom: 'Pause', court: 'Pause', couleur: '#A3ACC2', fond: '#F7F8FA', icone: Coffee }

const index = new Map(MATIERES.map((m) => [m.id, m]))

export function matiere(id: string | null | undefined): Matiere {
  if (!id) return AUTRE
  return index.get(id) ?? AUTRE
}

// ───────────── LSU (cycle 3) ─────────────

export type DomaineLsu = { id: string; nom: string }
export type MatiereLsu = { id: string; nom: string; domaines: DomaineLsu[] }

/** Blocs du livret (Français, Mathématiques…) et leurs domaines, tirés du référentiel */
export const LSU: MatiereLsu[] = BLOCS_LSU.map((b) => ({ id: b.id, nom: b.nom, domaines: b.domaines.map((d) => ({ id: d.id, nom: d.nom })) }))

export const NIVEAUX = [
  { v: 1, nom: 'Objectifs non atteints', court: 'Non atteints', couleur: '#E5484D', fond: '#FDEFEF' },
  { v: 2, nom: 'Objectifs partiellement atteints', court: 'Partiellement atteints', couleur: '#F2A516', fond: '#FEF7EA' },
  { v: 3, nom: 'Objectifs atteints', court: 'Atteints', couleur: '#18A058', fond: '#EAF6F0' },
  { v: 4, nom: 'Objectifs dépassés', court: 'Dépassés', couleur: '#3358E0', fond: '#ECF0FF' },
] as const

export function niveau(v: number | null | undefined) {
  return NIVEAUX.find((n) => n.v === v)
}

export const TOUS_DOMAINES: DomaineLsu[] = LSU.flatMap((m) => m.domaines)
