import { db, verif } from '../../lib/supabase'
import { minutes, numJour, periodeDe } from '../../lib/dates'
import type { Classe, Creneau, Seance } from '../../lib/types'

const SANS_RESUME = ['rituels', 'vie']
const LIBELLES_SANS_RESUME = /calcul mental|lecture silencieuse|bilan|fluence|bateau/i

/** Crée les séances d'un jour à partir de l'emploi du temps (sans toucher aux créneaux déjà remplis) */
export async function remplirDepuisEdt(classe: Classe, date: string, existantes: Seance[]) {
  const periode = periodeDe(date, classe.reglages)
  if (!periode) return 0
  const creneaux = verif(await db.from('edt_creneaux').select('*').eq('classe_id', classe.id).eq('periode', periode.id).eq('jour', numJour(date))) as Creneau[]
  const occupes = new Set(existantes.filter((s) => s.date === date).map((s) => (s.debut ?? '').slice(0, 5)))
  const lignes = creneaux
    .filter((c) => c.type !== 'pause' && !occupes.has(c.debut.slice(0, 5)))
    .map((c) => ({
      classe_id: classe.id, date, debut: c.debut, fin: c.fin, matiere: c.matiere, titre: c.libelle ?? '',
      pour_familles: SANS_RESUME.includes(c.matiere ?? '') || LIBELLES_SANS_RESUME.test(c.libelle ?? '') ? '-' : null,
    }))
  if (!lignes.length) return 0
  verif(await db.from('seances').insert(lignes).select())
  return lignes.length
}

export function trierSeances<T extends { debut: string | null; ordre?: number }>(l: T[]) {
  return [...l].sort((a, b) => minutes(a.debut) - minutes(b.debut) || (a.ordre ?? 0) - (b.ordre ?? 0))
}

/** Séance en cours (si la date est aujourd'hui) */
export function seanceEnCours(l: Seance[], maintenant = new Date()) {
  const m = maintenant.getHours() * 60 + maintenant.getMinutes()
  return l.find((s) => s.debut && s.fin && minutes(s.debut) <= m && m < minutes(s.fin)) ?? null
}
