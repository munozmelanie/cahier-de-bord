import type { BilanLsu, Periode } from '../../lib/types'

/** Découpe les périodes en bilans du livret (trimestres, semestres ou périodes) */
export function bilansDepuisPeriodes(periodes: Periode[], rythme: 'trimestre' | 'semestre' | 'periode'): BilanLsu[] {
  const p = [...periodes].sort((a, b) => a.debut.localeCompare(b.debut))
  if (!p.length) return []
  if (rythme === 'periode') return p.map((x, i) => ({ id: x.id, nom: `Période ${i + 1}`, debut: x.debut, fin: x.fin }))
  const n = rythme === 'trimestre' ? 3 : 2
  // 5 périodes : trimestres P1-P2 / P3-P4 / P5 ; semestres P1-P3 / P4-P5
  const tailles = p.length === 5
    ? rythme === 'trimestre' ? [2, 2, 1] : [3, 2]
    : Array.from({ length: n }, (_, i) => Math.floor(p.length / n) + (i < p.length % n ? 1 : 0))
  const res: BilanLsu[] = []
  let k = 0
  tailles.forEach((t, i) => {
    const groupe = p.slice(k, k + t)
    k += t
    if (!groupe.length) return
    const ordinal = i === 0 ? '1er' : `${i + 1}e`
    res.push({
      id: `${rythme === 'trimestre' ? 'T' : 'S'}${i + 1}`,
      nom: `${ordinal} ${rythme}`,
      debut: groupe[0].debut,
      fin: groupe[groupe.length - 1].fin,
    })
  })
  return res
}
