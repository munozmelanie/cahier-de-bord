import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { creerClientDemo } from './demo'
import { jourDemo } from './demoDonnees'
import { definirAujourdhui } from './dates'

// Clés publiques (faites pour être dans le navigateur ; les données sont protégées par les règles de la base)
const URL = 'https://zfiinvgniqwwqdbliwwo.supabase.co'
const CLE = 'sb_publishable_F2vBGmrYrDRZbZJwHP5muw_UUhvaRQt'

function modeDemoDemande() {
  try {
    const p = new URLSearchParams(window.location.search)
    if (p.has('demo')) localStorage.setItem('cdb-demo', '1')
    if (p.has('reel')) localStorage.removeItem('cdb-demo')
    return localStorage.getItem('cdb-demo') === '1'
  } catch {
    return false
  }
}

export const MODE_DEMO = modeDemoDemande()
if (MODE_DEMO) definirAujourdhui(jourDemo())

export const db: SupabaseClient = MODE_DEMO
  ? (creerClientDemo() as unknown as SupabaseClient)
  : createClient(URL, CLE, { auth: { persistSession: true, autoRefreshToken: true } })

export function quitterDemo() {
  try { localStorage.removeItem('cdb-demo'); localStorage.removeItem('cdb-demo-persona') } catch { /* rien */ }
  window.location.href = window.location.pathname
}

/** Lève une erreur lisible si la requête a échoué */
export function verif<T>(r: { data: T; error: { message: string } | null }): T {
  if (r.error) throw new Error(traduireErreur(r.error.message))
  return r.data
}

export function traduireErreur(m: string) {
  if (/Invalid login credentials/i.test(m)) return 'E-mail ou mot de passe incorrect.'
  if (/Email not confirmed/i.test(m)) return 'Adresse e-mail pas encore confirmée.'
  if (/User already registered/i.test(m)) return 'Un compte existe déjà avec cet e-mail. Connecte-toi.'
  if (/Password should be at least/i.test(m)) return 'Mot de passe trop court (6 caractères minimum).'
  if (/rate limit/i.test(m)) return 'Trop de tentatives. Réessaie dans quelques minutes.'
  if (/Failed to fetch|NetworkError/i.test(m)) return 'Pas de connexion internet.'
  if (/row-level security/i.test(m)) return 'Action non autorisée.'
  return m
}
