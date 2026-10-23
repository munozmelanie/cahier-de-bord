import {
  BookOpen, Calculator, Coffee, Earth, FlaskConical, Footprints, Landmark, Languages, Monitor, Music,
  Palette, PenLine, Sailboat, Scale, Sparkles, Users, type LucideIcon,
} from 'lucide-react'

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
  { id: 'francais', nom: 'Français', court: 'Français', couleur: '#E0457B', fond: '#FDE8F0', icone: PenLine, lsu: 'fr' },
  { id: 'lecture', nom: 'Lecture', court: 'Lecture', couleur: '#F2711C', fond: '#FFEEDF', icone: BookOpen, lsu: 'fr' },
  { id: 'maths', nom: 'Mathématiques', court: 'Maths', couleur: '#2E5BFF', fond: '#E6ECFF', icone: Calculator, lsu: 'ma' },
  { id: 'sciences', nom: 'Sciences', court: 'Sciences', couleur: '#13A35B', fond: '#E1F6EA', icone: FlaskConical, lsu: 'st' },
  { id: 'histoire', nom: 'Histoire', court: 'Histoire', couleur: '#B9770E', fond: '#FCF0D9', icone: Landmark, lsu: 'hg' },
  { id: 'geographie', nom: 'Géographie', court: 'Géo', couleur: '#0B9A8D', fond: '#DDF5F2', icone: Earth, lsu: 'hg' },
  { id: 'emc', nom: 'Enseignement moral et civique', court: 'EMC', couleur: '#7B4DFF', fond: '#EEE8FF', icone: Scale, lsu: 'emc' },
  { id: 'anglais', nom: 'Anglais', court: 'Anglais', couleur: '#E5484D', fond: '#FDE7E8', icone: Languages, lsu: 'lv' },
  { id: 'arts', nom: 'Arts plastiques', court: 'Arts', couleur: '#C135D8', fond: '#F8E6FB', icone: Palette, lsu: 'ap' },
  { id: 'musique', nom: 'Musique', court: 'Musique', couleur: '#DB2D84', fond: '#FCE4F0', icone: Music, lsu: 'em' },
  { id: 'eps', nom: 'EPS', court: 'EPS', couleur: '#5B9E0F', fond: '#ECF7DD', icone: Footprints, lsu: 'eps' },
  { id: 'rituels', nom: 'Rituels', court: 'Rituels', couleur: '#0A8FD6', fond: '#E0F3FD', icone: Sailboat },
  { id: 'informatique', nom: 'Informatique', court: 'Info', couleur: '#4F5D7A', fond: '#E9ECF3', icone: Monitor },
  { id: 'vie', nom: 'Vie de classe', court: 'Vie de classe', couleur: '#6A7593', fond: '#ECEFF5', icone: Users },
]

const AUTRE: Matiere = { id: 'autre', nom: 'Autre', court: 'Autre', couleur: '#6A7593', fond: '#ECEFF5', icone: Sparkles }
export const PAUSE: Matiere = { id: 'pause', nom: 'Pause', court: 'Pause', couleur: '#A3ACC2', fond: '#F1F3F8', icone: Coffee }

const index = new Map(MATIERES.map((m) => [m.id, m]))

export function matiere(id: string | null | undefined): Matiere {
  if (!id) return AUTRE
  return index.get(id) ?? AUTRE
}

// ───────────── LSU (cycle 3) ─────────────

export type DomaineLsu = { id: string; nom: string }
export type MatiereLsu = { id: string; nom: string; domaines: DomaineLsu[] }

export const LSU: MatiereLsu[] = [
  {
    id: 'fr', nom: 'Français', domaines: [
      { id: 'fr.oral', nom: 'Langage oral' },
      { id: 'fr.lecture', nom: 'Lecture et compréhension de l\'écrit' },
      { id: 'fr.ecriture', nom: 'Écriture' },
      { id: 'fr.langue', nom: 'Étude de la langue (grammaire, orthographe, lexique)' },
    ],
  },
  {
    id: 'ma', nom: 'Mathématiques', domaines: [
      { id: 'ma.nombres', nom: 'Nombres et calcul' },
      { id: 'ma.grandeurs', nom: 'Grandeurs et mesures' },
      { id: 'ma.espace', nom: 'Espace et géométrie' },
    ],
  },
  {
    id: 'lv', nom: 'Langues vivantes (anglais)', domaines: [
      { id: 'lv.ecouter', nom: 'Écouter et comprendre' },
      { id: 'lv.lire', nom: 'Lire et comprendre' },
      { id: 'lv.parler', nom: 'Parler en continu' },
      { id: 'lv.ecrire', nom: 'Écrire' },
      { id: 'lv.dialoguer', nom: 'Réagir et dialoguer' },
      { id: 'lv.culture', nom: 'Découvrir les aspects culturels de la langue' },
    ],
  },
  { id: 'ap', nom: 'Arts plastiques', domaines: [{ id: 'ap', nom: 'Arts plastiques' }] },
  { id: 'em', nom: 'Éducation musicale', domaines: [{ id: 'em', nom: 'Éducation musicale' }] },
  { id: 'hda', nom: 'Histoire des arts', domaines: [{ id: 'hda', nom: 'Histoire des arts' }] },
  { id: 'eps', nom: 'Éducation physique et sportive', domaines: [{ id: 'eps', nom: 'Éducation physique et sportive' }] },
  { id: 'emc', nom: 'Enseignement moral et civique', domaines: [{ id: 'emc', nom: 'Enseignement moral et civique' }] },
  { id: 'hg', nom: 'Histoire et géographie', domaines: [{ id: 'hg', nom: 'Histoire et géographie' }] },
  { id: 'st', nom: 'Sciences et technologie', domaines: [{ id: 'st', nom: 'Sciences et technologie' }] },
]

export const NIVEAUX = [
  { v: 1, nom: 'Objectifs non atteints', court: 'Non atteints', couleur: '#E5484D', fond: '#FDE7E8' },
  { v: 2, nom: 'Objectifs partiellement atteints', court: 'Partiellement', couleur: '#F2A516', fond: '#FFF4DC' },
  { v: 3, nom: 'Objectifs atteints', court: 'Atteints', couleur: '#18A058', fond: '#E3F6EC' },
  { v: 4, nom: 'Objectifs dépassés', court: 'Dépassés', couleur: '#2E5BFF', fond: '#E6ECFF' },
] as const

export function niveau(v: number | null | undefined) {
  return NIVEAUX.find((n) => n.v === v)
}

export const TOUS_DOMAINES: DomaineLsu[] = LSU.flatMap((m) => m.domaines)
