// Lignes de la base (mêmes noms que dans supabase/migrations/0001_schema.sql)

export type Periode = { id: string; debut: string; fin: string }
export type Vacances = { nom: string; debut: string; fin: string }
export type BilanLsu = { id: string; nom: string; debut: string; fin: string }

export type Reglages = {
  jours?: number[]
  heure_resume?: string
  resume_auto?: boolean
  periodes?: Periode[]
  vacances?: Vacances[]
  feries?: string[]
  lsu?: { rythme?: 'trimestre' | 'semestre' | 'periode'; bilans?: BilanLsu[] }
  /** Mot affiché au remplaçant (accès par QR code) */
  mot_remplacant?: string
  /** Nom affiché dans le visa du livret */
  directeur_nom?: string
}

export type Classe = {
  id: string
  nom: string
  ecole: string | null
  ville: string | null
  annee: string | null
  enseignant_nom: string | null
  reglages: Reglages
}

export type Eleve = {
  id: string
  classe_id: string
  prenom: string
  nom: string | null
  ordre: number
  code_famille: string
  actif: boolean
}

export type ParentLien = {
  eleve_id: string
  user_id: string
  nom_affiche: string | null
  lien: string | null
  created_at: string
}

export type Creneau = {
  id: string
  classe_id: string
  periode: string
  jour: number
  debut: string
  fin: string
  matiere: string | null
  libelle: string | null
  type: 'cours' | 'pause'
}

export type AFaire = { label: string; lien?: string; type?: 'imprimer' | 'projeter' | 'distribuer' | 'preparer' }

export type Seance = {
  id: string
  classe_id: string
  date: string
  debut: string | null
  fin: string | null
  matiere: string | null
  titre: string
  objectif: string | null
  deroule: string | null
  materiel: string | null
  a_faire: AFaire[]
  pour_familles: string | null
  bilan: string | null
  statut: 'prevue' | 'faite' | 'non_faite'
  sequence_id: string | null
  etape_id: string | null
  progression_id: string | null
  ordre: number
}

export type TypeDevoir = 'travail' | 'lecon' | 'evaluation' | 'materiel' | 'info'

export type Devoir = {
  id: string
  classe_id: string
  donne_le: string
  pour_le: string
  matiere: string | null
  texte: string
  type: TypeDevoir
  seance_id: string | null
  publie: boolean
  publie_le: string | null
}

export type Resume = {
  classe_id: string
  date: string
  items: { matiere: string | null; texte: string }[]
  mot: string | null
  modifie_main: boolean
  publie: boolean
  publie_le: string | null
}

export type EvenementAgenda = {
  id: string
  classe_id: string
  date: string
  fin: string | null
  heure: string | null
  titre: string
  details: string | null
  type: 'sortie' | 'evaluation' | 'reunion' | 'info' | 'fete' | 'vacances'
  visible_familles: boolean
}

export type Progression = {
  id: string
  classe_id: string
  matiere: string
  periode: string
  semaine: number | null
  titre: string
  domaine: string | null
  statut: 'prevu' | 'en_cours' | 'fait'
  ordre: number
}

export type Sequence = {
  id: string
  classe_id: string
  matiere: string | null
  titre: string
  periode: string | null
  objectifs: string | null
  competences: string | null
  notes: string | null
}

export type Etape = {
  id: string
  classe_id: string
  sequence_id: string
  numero: number
  titre: string
  objectif: string | null
  duree: number | null
  deroule: string | null
  materiel: string | null
  differenciation: string | null
  evaluation: string | null
}

/** domaine : domaine du livret ; element : clé d'un élément du programme (domaine|libellé) */
export type ItemEval = { id: string; libelle: string; domaine?: string | null; element?: string | null }

export type Evaluation = {
  id: string
  classe_id: string
  date: string
  matiere: string | null
  titre: string
  periode: string | null
  items: ItemEval[]
  resultats: Record<string, Record<string, number>>
}

export type LsuBilan = {
  id: string
  classe_id: string
  eleve_id: string
  bilan: string
  positions: Record<string, number>
  appreciations: Record<string, string>
  appreciation_generale: string | null
  absences: number | null
  accompagnement: string | null
  publie: boolean
  publie_le: string | null
  vu_le: string | null
}

export type LsuClasse = {
  classe_id: string
  bilan: string
  elements: Record<string, string>
  projets: string | null
}

export type Message = {
  id: string
  classe_id: string
  eleve_id: string | null
  racine_id: string | null
  auteur_id: string | null
  auteur_role: 'enseignant' | 'parent'
  auteur_nom: string | null
  titre: string | null
  texte: string
  a_signer: boolean
  created_at: string
}

export type Lecture = {
  message_id: string
  user_id: string
  eleve_id: string | null
  lu_le: string
  signe_le: string | null
}
