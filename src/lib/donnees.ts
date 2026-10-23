import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { db, verif } from './supabase'
import { useSession } from './session'
import type {
  Creneau, Devoir, Eleve, Etape, Evaluation, EvenementAgenda, Lecture, LsuBilan, LsuClasse, Message,
  ParentLien, Progression, Resume, Seance, Sequence,
} from './types'

type Q = ReturnType<ReturnType<typeof db.from>['select']>

/** Lecture d'une table de la classe, mise en cache sous la clé [table, ...] */
export function useTable<T>(table: string, cle: unknown[], filtre: (q: Q) => Q = (q) => q, actif = true) {
  const { classe } = useSession()
  return useQuery<T[]>({
    queryKey: [table, classe?.id, ...cle],
    enabled: !!classe && actif,
    queryFn: async () => verif(await filtre(db.from(table).select('*').eq('classe_id', classe!.id))) as T[],
  })
}

export const useEdt = (periode: string | undefined) =>
  useTable<Creneau>('edt_creneaux', [periode], (q) => q.eq('periode', periode!).order('jour').order('debut'), !!periode)

export const useSeances = (debut: string, fin: string) =>
  useTable<Seance>('seances', [debut, fin], (q) => q.gte('date', debut).lte('date', fin).order('date').order('debut').order('ordre'))

export const useDevoirsPour = (debut: string, fin: string) =>
  useTable<Devoir>('devoirs', ['pour', debut, fin], (q) => q.gte('pour_le', debut).lte('pour_le', fin).order('pour_le').order('matiere'))

export const useDevoirsDonnes = (debut: string, fin: string) =>
  useTable<Devoir>('devoirs', ['donne', debut, fin], (q) => q.gte('donne_le', debut).lte('donne_le', fin).order('donne_le').order('pour_le'))

export const useResumes = (debut: string, fin: string) =>
  useTable<Resume>('resumes', [debut, fin], (q) => q.gte('date', debut).lte('date', fin).order('date', { ascending: false }))

export const useAgenda = (debut: string, fin: string) =>
  useTable<EvenementAgenda>('agenda', [debut, fin], (q) => q.gte('date', debut).lte('date', fin).order('date'))

export const useMessages = () =>
  useTable<Message>('messages', [], (q) => q.order('created_at', { ascending: false }).limit(500))

export const useLectures = () => {
  const { classe } = useSession()
  return useQuery<Lecture[]>({
    queryKey: ['lectures', classe?.id],
    enabled: !!classe,
    queryFn: async () => verif(await db.from('lectures').select('*')) as Lecture[],
  })
}

export const useEleves = () => useTable<Eleve>('eleves', [], (q) => q.order('ordre').order('prenom'))

export const useParents = (eleveIds: string[]) => {
  const { classe } = useSession()
  return useQuery<ParentLien[]>({
    queryKey: ['parents', classe?.id, eleveIds.join(',')],
    enabled: !!classe && eleveIds.length > 0,
    queryFn: async () => verif(await db.from('parents').select('*').in('eleve_id', eleveIds)) as ParentLien[],
  })
}

export const useProgressions = (periode?: string) =>
  useTable<Progression>('progressions', [periode ?? 'toutes'], (q) => (periode ? q.eq('periode', periode) : q).order('semaine').order('ordre'))

export const useSequences = () => useTable<Sequence>('sequences', [], (q) => q.order('created_at', { ascending: false }))
export const useEtapes = (sequenceId?: string) =>
  useTable<Etape>('sequence_etapes', [sequenceId ?? 'toutes'], (q) => (sequenceId ? q.eq('sequence_id', sequenceId) : q).order('numero'))

export const useEvaluations = () => useTable<Evaluation>('evaluations', [], (q) => q.order('date', { ascending: false }))
export const useLsu = (bilan: string) => useTable<LsuBilan>('lsu_bilans', [bilan], (q) => q.eq('bilan', bilan))
export const useLsuClasse = (bilan: string) => useTable<LsuClasse>('lsu_classe', [bilan], (q) => q.eq('bilan', bilan))

// ───────────── Écritures ─────────────

type Ecriture =
  | { op: 'insert'; table: string; ligne: Record<string, unknown> | Record<string, unknown>[] }
  | { op: 'update'; table: string; id: string; patch: Record<string, unknown> }
  | { op: 'upsert'; table: string; ligne: Record<string, unknown> | Record<string, unknown>[]; onConflict?: string }
  | { op: 'delete'; table: string; id: string }
  | { op: 'deleteWhere'; table: string; colonne: string; valeur: string }

export async function ecrire(e: Ecriture) {
  switch (e.op) {
    case 'insert': return verif(await db.from(e.table).insert(e.ligne).select())
    case 'update': return verif(await db.from(e.table).update(e.patch).eq('id', e.id).select())
    case 'upsert': return verif(await db.from(e.table).upsert(e.ligne, e.onConflict ? { onConflict: e.onConflict } : undefined).select())
    case 'delete': return verif(await db.from(e.table).delete().eq('id', e.id))
    case 'deleteWhere': return verif(await db.from(e.table).delete().eq(e.colonne, e.valeur))
  }
}

/** Écrit puis rafraîchit les écrans qui affichent cette table */
export function useEcrire() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (liste: Ecriture | Ecriture[]) => {
      const tab = Array.isArray(liste) ? liste : [liste]
      const res = []
      for (const e of tab) res.push(await ecrire(e))
      return res
    },
    onSettled: (_d, _e, liste) => {
      const tab = Array.isArray(liste) ? liste : [liste]
      for (const t of new Set(tab.map((e) => e.table))) qc.invalidateQueries({ queryKey: [t] })
    },
  })
}

export function useRafraichir() {
  const qc = useQueryClient()
  return (...tables: string[]) => tables.forEach((t) => qc.invalidateQueries({ queryKey: [t] }))
}
