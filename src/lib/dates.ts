import { addDays, format, isSameDay, parseISO, startOfWeek } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { Periode, Reglages, Vacances } from './types'

export const iso = (d: Date) => format(d, 'yyyy-MM-dd')
export const jourIso = (s: string) => parseISO(s)
let jourForce: string | null = null
/** Le mode démo fixe « aujourd'hui » sur un jour de classe */
export function definirAujourdhui(s: string | null) { jourForce = s }
export const aujourdhui = () => jourForce ?? iso(new Date())

export const lundiDe = (d: Date) => startOfWeek(d, { weekStartsOn: 1 })
export const decaler = (s: string, n: number) => iso(addDays(parseISO(s), n))

/** 1 = lundi … 7 = dimanche */
export const numJour = (s: string) => {
  const j = parseISO(s).getDay()
  return j === 0 ? 7 : j
}

export const fmtJour = (s: string) => format(parseISO(s), 'EEEE d MMMM', { locale: fr })
export const fmtJourCourt = (s: string) => format(parseISO(s), 'EEE d MMM', { locale: fr })
export const fmtJourSemaine = (s: string) => format(parseISO(s), 'EEEE', { locale: fr })
export const fmtNumero = (s: string) => format(parseISO(s), 'd', { locale: fr })
export const fmtMois = (s: string) => format(parseISO(s), 'MMMM yyyy', { locale: fr })
export const fmtDateHeure = (s: string) => format(new Date(s), "d MMM 'à' HH'h'mm", { locale: fr })

/** Première lettre en majuscule (« lundi 2 novembre » → « Lundi 2 novembre ») */
export const maj1 = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s)

export const NOMS_JOURS = ['', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

/** '08:45:00' → '8h45' */
export function fmtHeure(h: string | null | undefined) {
  if (!h) return ''
  const [hh, mm] = h.split(':')
  return `${Number(hh)}h${mm}`
}
/** '08:45:00' → '08:45' (pour les champs <input type="time">) */
export const hhmm = (h: string | null | undefined) => (h ? h.slice(0, 5) : '')
export function minutes(h: string | null | undefined) {
  if (!h) return 0
  const [hh, mm] = h.split(':').map(Number)
  return hh * 60 + mm
}

export function periodeDe(s: string, r: Reglages | undefined): Periode | null {
  return r?.periodes?.find((p) => p.debut <= s && s <= p.fin) ?? null
}
/** Période en cours, ou la prochaine pendant les vacances */
export function periodeCourante(s: string, r: Reglages | undefined): Periode | null {
  const p = periodeDe(s, r)
  if (p) return p
  return r?.periodes?.find((x) => x.debut > s) ?? r?.periodes?.[r.periodes.length - 1] ?? null
}
export function vacancesDe(s: string, r: Reglages | undefined): Vacances | null {
  return r?.vacances?.find((v) => v.debut <= s && s <= v.fin) ?? null
}
export function estJourClasse(s: string, r: Reglages | undefined) {
  const jours = r?.jours ?? [1, 2, 4, 5]
  if (!jours.includes(numJour(s))) return false
  if (vacancesDe(s, r)) return false
  if (r?.feries?.includes(s)) return false
  return true
}
export function jourClasseSuivant(s: string, r: Reglages | undefined, sens = 1) {
  let d = decaler(s, sens)
  for (let i = 0; i < 60 && !estJourClasse(d, r); i++) d = decaler(d, sens)
  return d
}
/** Convention « semaine N → N+1 » : même jour la semaine suivante (ou le jour de classe d'après) */
export function semaineSuivante(s: string, r: Reglages | undefined) {
  const d = decaler(s, 7)
  return estJourClasse(d, r) ? d : jourClasseSuivant(d, r)
}
export function joursSemaine(lundi: string, r: Reglages | undefined) {
  const jours = r?.jours ?? [1, 2, 4, 5]
  return jours.map((j) => decaler(lundi, j - 1))
}
export function semaineDansPeriode(s: string, p: Periode | null) {
  if (!p) return null
  const debut = lundiDe(parseISO(p.debut))
  const diff = Math.floor((lundiDe(parseISO(s)).getTime() - debut.getTime()) / (7 * 86400000))
  return diff + 1
}
export const memeJour = (a: string, b: string) => isSameDay(parseISO(a), parseISO(b))

/** « demain », « lundi », « lundi 9 nov. » selon l'écart */
export function quand(s: string, depuis = aujourdhui()) {
  const ecart = Math.round((parseISO(s).getTime() - parseISO(depuis).getTime()) / 86400000)
  if (ecart === 0) return "aujourd'hui"
  if (ecart === 1) return 'demain'
  if (ecart === -1) return 'hier'
  if (ecart > 1 && ecart < 7) return fmtJourSemaine(s)
  return fmtJourCourt(s)
}
