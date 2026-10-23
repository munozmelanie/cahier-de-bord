import { useCallback, useEffect, useRef, useState } from 'react'
import { LSU, NIVEAUX } from '../../lib/matieres'
import type { BilanLsu, Evaluation, Reglages } from '../../lib/types'

/** Matière de l'appli utilisée pour l'icône et la couleur d'une matière du LSU */
export const ICONE_LSU: Record<string, string> = {
  fr: 'francais', ma: 'maths', lv: 'anglais', ap: 'arts', em: 'musique', hda: 'histoire',
  eps: 'eps', emc: 'emc', hg: 'geographie', st: 'sciences',
}

export const ABREV: Record<number, string> = { 1: 'NA', 2: 'PA', 3: 'A', 4: 'D' }

/** Domaine du LSU proposé par défaut selon la matière de l'évaluation */
export const DOMAINE_PAR_MATIERE: Record<string, string> = {
  francais: 'fr.langue', lecture: 'fr.lecture', maths: 'ma.nombres', anglais: 'lv.ecouter', arts: 'ap',
  musique: 'em', eps: 'eps', emc: 'emc', histoire: 'hg', geographie: 'hg', sciences: 'st',
}

/** Bilans du LSU : ceux des réglages, sinon trois trimestres calés sur les périodes */
export function bilansDe(r: Reglages | undefined): BilanLsu[] {
  if (r?.lsu?.bilans?.length) return r.lsu.bilans
  const p = r?.periodes ?? []
  const d = (i: number, f: 'debut' | 'fin', defaut: string) => p[i]?.[f] ?? defaut
  return [
    { id: 'T1', nom: '1er trimestre', debut: d(0, 'debut', '2026-09-01'), fin: d(1, 'fin', '2026-12-18') },
    { id: 'T2', nom: '2e trimestre', debut: d(2, 'debut', '2027-01-04'), fin: d(3, 'fin', '2027-04-16') },
    { id: 'T3', nom: '3e trimestre', debut: d(4, 'debut', '2027-05-03'), fin: d(4, 'fin', '2027-07-02') },
  ]
}

export function bilanDuJour(bilans: BilanLsu[], jour: string) {
  return bilans.find((b) => b.debut <= jour && jour <= b.fin) ?? bilans.find((b) => b.debut > jour) ?? bilans[bilans.length - 1]
}

/**
 * Positionnements proposés pour chaque élève : moyenne arrondie des résultats
 * des évaluations du bilan, item par item, rattachés à un domaine du LSU.
 */
export function propositions(evals: Evaluation[], bilan: BilanLsu | undefined) {
  const sommes: Record<string, Record<string, { s: number; n: number }>> = {}
  if (!bilan) return {} as Record<string, Record<string, number>>
  for (const ev of evals) {
    if (ev.date < bilan.debut || ev.date > bilan.fin) continue
    for (const item of ev.items ?? []) {
      if (!item.domaine) continue
      for (const [eleve, res] of Object.entries(ev.resultats ?? {})) {
        const v = res?.[item.id]
        if (!v) continue
        const parEleve = (sommes[eleve] ??= {})
        const c = (parEleve[item.domaine] ??= { s: 0, n: 0 })
        c.s += v; c.n += 1
      }
    }
  }
  const out: Record<string, Record<string, number>> = {}
  for (const [eleve, doms] of Object.entries(sommes)) {
    out[eleve] = {}
    for (const [d, c] of Object.entries(doms)) out[eleve][d] = Math.min(4, Math.max(1, Math.round(c.s / c.n)))
  }
  return out
}

export const NB_DOMAINES = LSU.reduce((n, m) => n + m.domaines.length, 0)

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
