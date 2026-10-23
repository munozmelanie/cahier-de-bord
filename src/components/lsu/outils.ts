import { useCallback, useEffect, useRef, useState } from 'react'
import { NIVEAUX } from '../../lib/matieres'
import { BLOCS_LSU, domaineLivret, type DomaineLivret } from '../../lib/referentielLsu'
import type { BilanLsu, Evaluation, LsuClasse, Reglages } from '../../lib/types'

/** Matière de l'appli qui donne la couleur d'un bloc ou d'un domaine du livret */
export const ICONE_LSU: Record<string, string> = {
  fr: 'francais', ma: 'maths', eps: 'eps', lv: 'anglais', st: 'sciences', hg: 'histoire', arts: 'arts',
  ap: 'arts', em: 'musique', hda: 'arts', emc: 'emc',
}
export const couleurLsu = (id: string) => ICONE_LSU[id] ?? ICONE_LSU[id.split('.')[0]]

export const ABREV: Record<number, string> = { 1: 'NA', 2: 'PA', 3: 'A', 4: 'D' }

/** Domaine du livret proposé par défaut selon la matière de l'évaluation */
export const DOMAINE_PAR_MATIERE: Record<string, string> = {
  francais: 'fr.grammaire', lecture: 'fr.lecture', maths: 'ma.nombres', anglais: 'lv', arts: 'ap',
  musique: 'em', eps: 'eps', emc: 'emc', histoire: 'hg', geographie: 'hg', sciences: 'st',
}

/** Noms courts des blocs (le nom complet reste en infobulle et à l'impression) */
export const NOM_COURT_LSU: Record<string, string> = {
  fr: 'Français', ma: 'Maths', eps: 'EPS', lv: 'Anglais', st: 'Sciences', hg: 'Histoire-géo', arts: 'Arts', emc: 'EMC',
}
/** Noms courts des domaines */
export const DOMAINE_COURT: Record<string, string> = {
  'fr.oral': 'Oral', 'fr.lecture': 'Lecture', 'fr.ecriture': 'Écriture', 'fr.vocabulaire': 'Vocabulaire', 'fr.grammaire': 'Grammaire',
  'ma.nombres': 'Nombres et calcul', 'ma.grandeurs': 'Grandeurs et mesures', 'ma.espace': 'Espace et géométrie',
  'ma.donnees': 'Données', 'ma.proportionnalite': 'Proportionnalité', 'ma.informatique': 'Pensée informatique',
  eps: 'EPS', lv: 'Anglais', st: 'Sciences', hg: 'Histoire-géo', ap: 'Arts plastiques', em: 'Musique', hda: 'Histoire des arts', emc: 'EMC',
}

/** Bilans du LSU : ceux des réglages, sinon trois trimestres calés sur les périodes */
export function bilansDe(r: Reglages | undefined): BilanLsu[] {
  if (r?.lsu?.bilans?.length) return r.lsu.bilans
  const p = r?.periodes ?? []
  const dt = (i: number, f: 'debut' | 'fin', defaut: string) => p[i]?.[f] ?? defaut
  return [
    { id: 'T1', nom: '1er trimestre', debut: dt(0, 'debut', '2026-09-01'), fin: dt(1, 'fin', '2026-12-18') },
    { id: 'T2', nom: '2e trimestre', debut: dt(2, 'debut', '2027-01-04'), fin: dt(3, 'fin', '2027-04-16') },
    { id: 'T3', nom: '3e trimestre', debut: dt(4, 'debut', '2027-05-03'), fin: dt(4, 'fin', '2027-07-02') },
  ]
}

export function bilanDuJour(bilans: BilanLsu[], jour: string) {
  return bilans.find((b) => b.debut <= jour && jour <= b.fin) ?? bilans.find((b) => b.debut > jour) ?? bilans[bilans.length - 1]
}

// ───────────── Éléments du programme travaillés ─────────────
// lsu_classe.elements : { [domaine]: une ligne par élément }. Domaine absent = tous les éléments officiels.
// Positionnement d'un élève : lsu_bilans.positions[clé de l'élément] = 1 à 4.

export type ElementTravaille = { cle: string; libelle: string; domaine: string }

export const cleElement = (domaine: string, libelle: string) => `${domaine}|${libelle}`
export const domaineDeCle = (cle: string) => cle.split('|')[0]
export const libelleDeCle = (cle: string) => cle.slice(cle.indexOf('|') + 1)

/** Lignes non vides du texte enregistré */
export const lignesElements = (texte: string | null | undefined) =>
  (texte ?? '').split('\n').map((l) => l.trim()).filter(Boolean)

const officiels = (domaine: string) => domaineLivret(domaine)?.elements.map((x) => x.libelle) ?? []

/** Éléments travaillés d'un domaine pour la période */
export function elementsDuDomaine(classe: LsuClasse | undefined, dm: DomaineLivret): ElementTravaille[] {
  const texte = classe?.elements?.[dm.id]
  const libelles = texte === undefined ? dm.elements.map((x) => x.libelle) : lignesElements(texte)
  return libelles.map((libelle) => ({ cle: cleElement(dm.id, libelle), libelle, domaine: dm.id }))
}

/** Tous les éléments travaillés de la période, dans l'ordre du livret */
export function tousLesElements(classe: LsuClasse | undefined): ElementTravaille[] {
  return BLOCS_LSU.flatMap((b) => b.domaines.flatMap((dm) => elementsDuDomaine(classe, dm)))
}

/** Une ligne identique à un libellé officiel = élément coché ; les autres = éléments ajoutés */
export function analyserElements(domaine: string, texte: string | null | undefined) {
  const off = officiels(domaine)
  if (texte === undefined) return { coches: [...off], libres: [] as string[] }
  const set = new Set(off)
  const coches: string[] = []
  const libres: string[] = []
  for (const l of lignesElements(texte)) (set.has(l) ? coches.push(l) : libres.push(l))
  return { coches, libres }
}

/** Texte à enregistrer : éléments cochés dans l'ordre du référentiel, puis éléments ajoutés */
export function composerElements(domaine: string, coches: string[], libres: string[]) {
  const set = new Set(coches)
  return [...officiels(domaine).filter((l) => set.has(l)), ...libres.map((l) => l.trim()).filter(Boolean)].join('\n')
}

// ───────────── Parcours éducatifs (lsu_classe.projets, en JSON) ─────────────

export const PARCOURS = [
  { id: 'citoyen', nom: 'Parcours citoyen' },
  { id: 'peac', nom: 'Parcours d\'éducation artistique et culturelle' },
  { id: 'sante', nom: 'Parcours éducatif de santé' },
] as const
export type Parcours = Partial<Record<(typeof PARCOURS)[number]['id'], string>>

export function lireParcours(projets: string | null | undefined): Parcours {
  if (!projets?.trim()) return {}
  try {
    const j = JSON.parse(projets)
    if (j && typeof j === 'object') return j as Parcours
  } catch { /* texte libre d'avant */ }
  return { citoyen: projets }
}
export function ecrireParcours(p: Parcours): string | null {
  const propre = Object.fromEntries(Object.entries(p).filter(([, v]) => v?.trim()))
  return Object.keys(propre).length ? JSON.stringify(propre) : null
}

// ───────────── Propositions d'après les évaluations ─────────────

/**
 * Positionnements proposés pour chaque élève et chaque élément : moyenne arrondie des résultats
 * des évaluations du bilan. Un item rattaché à un élément compte pour cet élément ;
 * un item rattaché seulement à un domaine compte pour tous les éléments du domaine.
 */
export function propositions(evals: Evaluation[], bilan: BilanLsu | undefined, elements: ElementTravaille[]) {
  const out: Record<string, Record<string, number>> = {}
  if (!bilan) return out
  const sommes: Record<string, Record<string, { s: number; n: number }>> = {}
  const ajouter = (eleve: string, cle: string, v: number) => {
    const c = ((sommes[eleve] ??= {})[cle] ??= { s: 0, n: 0 })
    c.s += v; c.n += 1
  }
  for (const ev of evals) {
    if (ev.date < bilan.debut || ev.date > bilan.fin) continue
    for (const item of ev.items ?? []) {
      const cibles = item.element
        ? elements.filter((x) => x.cle === item.element)
        : item.domaine ? elements.filter((x) => x.domaine === item.domaine) : []
      if (!cibles.length) continue
      for (const [eleve, res] of Object.entries(ev.resultats ?? {})) {
        const v = res?.[item.id]
        if (v) cibles.forEach((x) => ajouter(eleve, x.cle, v))
      }
    }
  }
  for (const [eleve, cles] of Object.entries(sommes)) {
    out[eleve] = {}
    for (const [cle, c] of Object.entries(cles)) out[eleve][cle] = Math.min(4, Math.max(1, Math.round(c.s / c.n)))
  }
  return out
}

export const niveauCourt = (v?: number) => NIVEAUX.find((n) => n.v === v)

/**
 * Enregistrement différé : on garde la dernière valeur et on l'envoie après une pause.
 * `vider()` envoie tout de suite ce qui attend (changement d'élève, sortie de page).
 */
export function useEnregistrementDiffere<T>(envoyer: (v: T) => Promise<unknown>, delai = 800) {
  const attente = useRef<T | null>(null)
  const minuteur = useRef<number | null>(null)
  const envoyerRef = useRef(envoyer)
  envoyerRef.current = envoyer
  const [etat, setEtat] = useState<'ok' | 'attente' | 'envoi' | 'erreur'>('ok')

  const vider = useCallback(async () => {
    if (minuteur.current) { window.clearTimeout(minuteur.current); minuteur.current = null }
    const v = attente.current
    if (v === null) return
    attente.current = null
    setEtat('envoi')
    try { await envoyerRef.current(v); setEtat(attente.current ? 'attente' : 'ok') } catch { setEtat('erreur') }
  }, [])

  const planifier = useCallback((v: T) => {
    attente.current = v
    setEtat('attente')
    if (minuteur.current) window.clearTimeout(minuteur.current)
    minuteur.current = window.setTimeout(() => { void vider() }, delai)
  }, [delai, vider])

  useEffect(() => () => { void vider() }, [vider])
  return { planifier, vider, etat }
}

export const echapper = (s: string | null | undefined) =>
  (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/\n/g, '<br>')
