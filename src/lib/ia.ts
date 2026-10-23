// Assistant par copier-coller : construit la demande pour ChatGPT / Claude et lit la réponse JSON
import { fmtHeure, fmtJour, fmtJourCourt, semaineSuivante } from './dates'
import { LSU, MATIERES, matiere, NIVEAUX } from './matieres'
import type {
  Classe, Creneau, Devoir, Eleve, Etape, Evaluation, EvenementAgenda, LsuBilan, Progression, Seance, Sequence, TypeDevoir,
} from './types'

// ───────────── Lecture tolérante du JSON ─────────────

export function extraireJson(texte: string): any {
  const t = texte.trim()
  if (!t) throw new Error('Colle la réponse de ChatGPT ou de Claude.')
  const essais: string[] = []
  const bloc = t.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (bloc) essais.push(bloc[1])
  essais.push(t)
  const a = t.indexOf('{'), b = t.lastIndexOf('}')
  if (a >= 0 && b > a) essais.push(t.slice(a, b + 1))
  const c = t.indexOf('['), d = t.lastIndexOf(']')
  if (c >= 0 && d > c) essais.push(t.slice(c, d + 1))
  for (const e of essais) {
    for (const v of [e, e.replace(/[“”«»]/g, '"').replace(/[‘’]/g, "'").replace(/,\s*([}\]])/g, '$1')]) {
      try { return JSON.parse(v) } catch { /* essai suivant */ }
    }
  }
  throw new Error("Réponse illisible. Demande à ChatGPT de répondre uniquement avec le bloc JSON, puis recolle-le.")
}

const IDS_MATIERES = MATIERES.map((m) => m.id)
const TYPES_DEVOIRS: TypeDevoir[] = ['travail', 'lecon', 'evaluation', 'materiel', 'info']
const txt = (v: unknown) => (typeof v === 'string' ? v.trim() : v == null ? '' : String(v).trim())
const opt = (v: unknown) => txt(v) || null
const reDate = /^\d{4}-\d{2}-\d{2}$/

function heure(v: unknown): string | null {
  const m = txt(v).match(/^(\d{1,2})\s*[:h]\s*(\d{2})/)
  if (!m) return null
  return `${m[1].padStart(2, '0')}:${m[2]}:00`
}
function matiereSure(v: unknown): string | null {
  const s = txt(v).toLowerCase()
  if (IDS_MATIERES.includes(s)) return s
  const parNom = MATIERES.find((m) => m.nom.toLowerCase() === s || m.court.toLowerCase() === s)
  return parNom?.id ?? null
}

const REGLES = [
  "Classe de CM1 (élèves de 9 ans) : rester simple, factuel, avec un vocabulaire que les élèves comprennent.",
  'Ne pas surcharger les journées : prioriser le français et les maths, laisser le temps de digérer les leçons.',
  "Pas de grosse matière (histoire, géographie, sciences) après la récréation de l'après-midi.",
  'Ne jamais évaluer une notion qui n\'a pas été vue en classe.',
  "Devoirs : convention « semaine N → N+1 » — ce qui est donné un jour est à faire pour le même jour de la semaine suivante (date réelle ; si ce jour tombe pendant des vacances ou un jour férié, le jour de classe d'après). Ne jamais donner une leçon pas encore vue.",
  'Toute évaluation est annoncée aux élèves : un devoir de type "evaluation" donné une semaine avant, et un rappel la veille.',
  'Les devoirs sont recopiés dans l\'agenda des élèves : phrases courtes.',
  'Pas d\'horaires dans les supports destinés aux élèves.',
  '"pour_familles" : une phrase très simple qui dit aux familles ce qu\'on a fait (ex. « Maths : lire l\'heure. »). Mettre "-" pour les rituels (calcul mental, fluence, lecture silencieuse, bilan…).',
]

function listeMatieres() {
  return MATIERES.map((m) => `"${m.id}" (${m.nom})`).join(', ')
}

function blocProgressions(progressions: Progression[], semaine: number | null) {
  if (!progressions.length) return '(aucune progression saisie)'
  const par = new Map<string, Progression[]>()
  for (const p of progressions) {
    if (!par.has(p.matiere)) par.set(p.matiere, [])
    par.get(p.matiere)!.push(p)
  }
  const lignes: string[] = []
  for (const [m, l] of par) {
    lignes.push(`- ${matiere(m).nom} :`)
    for (const p of [...l].sort((a, b) => (a.semaine ?? 99) - (b.semaine ?? 99))) {
      const s = p.semaine ? `S${p.semaine}${p.semaine === semaine ? ' (cette semaine)' : ''}` : 'sans semaine'
      const st = p.statut === 'fait' ? 'fait' : p.statut === 'en_cours' ? 'en cours' : 'prévu'
      lignes.push(`  · [${st}] ${s} — ${p.titre}`)
    }
  }
  return lignes.join('\n')
}

// ───────────── Journée / semaine ─────────────

export type SeanceIA = {
  date: string; debut: string; fin: string | null; matiere: string | null; titre: string
  objectif: string | null; deroule: string | null; materiel: string | null; pour_familles: string | null
}
export type DevoirIA = { donne_le: string; pour_le: string; matiere: string | null; texte: string; type: TypeDevoir }

export function promptJournal(p: {
  classe: Classe
  jours: string[]
  periodeId: string | null
  semaine: number | null
  edt: Creneau[]
  progressions: Progression[]
  seancesAvant: Seance[]
  seancesJours: Seance[]
  devoirs: Devoir[]
  agenda: EvenementAgenda[]
  remplacer: boolean
  precisions: string
}) {
  const r = p.classe.reglages
  const parJour = p.jours.map((j) => {
    const nj = ((d) => (d === 0 ? 7 : d))(new Date(j + 'T12:00:00').getDay())
    const creneaux = p.edt.filter((c) => c.jour === nj).sort((a, b) => a.debut.localeCompare(b.debut))
    const deja = p.seancesJours.filter((s) => s.date === j)
    const lignes = creneaux.map((c) => {
      if (c.type === 'pause') return `  ${c.debut.slice(0, 5)}-${c.fin.slice(0, 5)} · ${c.libelle ?? 'Pause'} (pause)`
      const pris = deja.filter((s) => s.debut?.slice(0, 5) === c.debut.slice(0, 5))
      const occ = pris.length ? ` — DÉJÀ PRÉVU : ${pris.map((s) => s.titre).join(' ; ')}` : ''
      return `  ${c.debut.slice(0, 5)}-${c.fin.slice(0, 5)} · "${c.matiere ?? 'vie'}" · ${c.libelle ?? ''}${occ}`
    })
    return `${fmtJour(j)} (${j}) — devoirs donnés ce jour à faire pour le ${semaineSuivante(j, r)} :\n${lignes.join('\n') || '  (emploi du temps vide)'}`
  })
  const avant = p.seancesAvant.filter((s) => s.titre && s.pour_familles !== '-')
  const histo = avant.length
    ? avant.map((s) => `- ${s.date} ${matiere(s.matiere).court} : ${s.titre}${s.statut === 'non_faite' ? ' (PAS FAITE, à replacer)' : ''}`).join('\n')
    : '(rien)'
  const devoirs = p.devoirs.length
    ? p.devoirs.map((d) => `- donné le ${d.donne_le} pour le ${d.pour_le} · ${matiere(d.matiere).court} · ${d.texte}`).join('\n')
    : '(aucun)'
  const evals = p.agenda.filter((a) => a.type === 'evaluation')
  const agenda = evals.length ? evals.map((a) => `- ${a.date}${a.fin ? ' → ' + a.fin : ''} : ${a.titre}${a.details ? ' (' + a.details + ')' : ''}`).join('\n') : '(aucune)'

  return `Tu es mon assistant de préparation de classe. Prépare le cahier journal ${p.jours.length > 1 ? 'des jours suivants' : 'de la journée suivante'}.

## Ma classe
${p.classe.nom} — ${[p.classe.ecole, p.classe.ville].filter(Boolean).join(', ')} — année ${p.classe.annee ?? ''}
Période ${p.periodeId ?? '?'}${p.semaine ? `, semaine ${p.semaine}` : ''}.

## Emploi du temps des jours à préparer
${parJour.join('\n\n')}

## Ma progression de la période
${blocProgressions(p.progressions, p.semaine)}

## Ce qui a été fait les jours précédents
${histo}

## Devoirs déjà prévus (ne pas les redonner)
${devoirs}

## Évaluations à venir (à annoncer dans les devoirs)
${agenda}

## Mes règles
${REGLES.map((x) => '- ' + x).join('\n')}
${p.remplacer
    ? '- Tu peux proposer une séance pour TOUS les créneaux de cours, même ceux marqués « DÉJÀ PRÉVU » (je remplacerai).'
    : '- Ne propose RIEN pour les créneaux marqués « DÉJÀ PRÉVU ».'}
- Utilise exactement les heures de l'emploi du temps. Rien sur les pauses.
- Suis la progression : avance les items « en cours » et ceux de la semaine.
${p.precisions.trim() ? `\n## Précisions pour cette fois\n${p.precisions.trim()}\n` : ''}
## Format de ta réponse
Réponds UNIQUEMENT avec un bloc JSON, sans texte autour, exactement de cette forme :
\`\`\`json
{
  "seances": [
    {
      "date": "AAAA-MM-JJ",
      "debut": "HH:MM",
      "fin": "HH:MM",
      "matiere": "maths",
      "titre": "Titre court de la séance",
      "objectif": "Ce que les élèves apprennent",
      "deroule": "1. … (durée)\\n2. …\\n3. …",
      "materiel": "Manuel p. …, ardoise…",
      "pour_familles": "Maths : lire l'heure."
    }
  ],
  "devoirs": [
    { "donne_le": "AAAA-MM-JJ", "pour_le": "AAAA-MM-JJ", "matiere": "maths", "texte": "Apprendre la leçon …", "type": "lecon" }
  ]
}
\`\`\`
"matiere" : l'un de ${listeMatieres()}.
"type" de devoir : "travail", "lecon", "evaluation", "materiel" ou "info".`
}

export function lireJournal(json: any, joursAutorises: string[]) {
  const erreurs: string[] = []
  const brutes = Array.isArray(json) ? json : Array.isArray(json?.seances) ? json.seances : []
  const seances: SeanceIA[] = []
  for (const s of brutes) {
    const date = txt(s?.date)
    const debut = heure(s?.debut)
    const titre = txt(s?.titre)
    if (!reDate.test(date) || !joursAutorises.includes(date)) { erreurs.push(`Séance ignorée (date ${date || '?'})`); continue }
    if (!debut || !titre) { erreurs.push(`Séance ignorée (heure ou titre manquant)`); continue }
    seances.push({
      date, debut, fin: heure(s?.fin), matiere: matiereSure(s?.matiere), titre,
      objectif: opt(s?.objectif), deroule: opt(s?.deroule), materiel: opt(s?.materiel), pour_familles: opt(s?.pour_familles),
    })
  }
  const devoirs: DevoirIA[] = []
  for (const d of Array.isArray(json?.devoirs) ? json.devoirs : []) {
    const donne_le = txt(d?.donne_le), pour_le = txt(d?.pour_le), texte = txt(d?.texte)
    if (!reDate.test(donne_le) || !reDate.test(pour_le) || !texte) { erreurs.push('Devoir ignoré (date ou texte manquant)'); continue }
    const type = TYPES_DEVOIRS.includes(txt(d?.type) as TypeDevoir) ? (txt(d?.type) as TypeDevoir) : 'travail'
    devoirs.push({ donne_le, pour_le, matiere: matiereSure(d?.matiere), texte, type })
  }
  if (!seances.length && !devoirs.length) throw new Error('Aucune séance ni aucun devoir trouvés dans la réponse.')
  seances.sort((a, b) => (a.date + a.debut).localeCompare(b.date + b.debut))
  return { seances, devoirs, erreurs }
}

// ───────────── Séquence ─────────────

export type EtapeIA = Pick<Etape, 'titre' | 'objectif' | 'duree' | 'deroule' | 'materiel' | 'differenciation' | 'evaluation'>

export function promptSequence(p: { classe: Classe; sequence: Sequence; etapes: Etape[]; progressions: Progression[]; remplacer: boolean; precisions: string }) {
  const s = p.sequence
  const existantes = p.etapes.length
    ? p.etapes.map((e) => `${e.numero}. ${e.titre}${e.objectif ? ' — ' + e.objectif : ''}${e.duree ? ` (${e.duree} min)` : ''}`).join('\n')
    : '(aucune)'
  return `Tu es mon assistant de préparation de classe. Écris les fiches de préparation des séances de cette séquence.

## Ma classe
${p.classe.nom} — ${[p.classe.ecole, p.classe.ville].filter(Boolean).join(', ')}

## La séquence
Matière : ${matiere(s.matiere).nom}
Titre : ${s.titre}
Période : ${s.periode ?? '?'}
Objectifs : ${s.objectifs ?? '(à proposer)'}
Compétences : ${s.competences ?? '(à proposer)'}
Notes : ${s.notes ?? '(aucune)'}

## Séances déjà écrites
${existantes}

## Ma progression dans cette matière
${blocProgressions(p.progressions.filter((x) => x.matiere === s.matiere), null)}

## Mes règles
${REGLES.slice(0, 4).map((x) => '- ' + x).join('\n')}
- ${p.remplacer ? 'Propose la séquence complète (je remplacerai les séances déjà écrites).' : 'Propose seulement les séances qui manquent, à la suite de celles déjà écrites.'}
- Déroulé en étapes numérotées avec la durée de chaque phase et la modalité (seul, à deux, collectif).
${p.precisions.trim() ? `\n## Précisions pour cette fois\n${p.precisions.trim()}\n` : ''}
## Format de ta réponse
Réponds UNIQUEMENT avec un bloc JSON, sans texte autour :
\`\`\`json
{
  "etapes": [
    {
      "titre": "Titre de la séance",
      "objectif": "Ce que les élèves apprennent",
      "duree": 45,
      "deroule": "1. Découverte (10 min, collectif) : …\\n2. Recherche (15 min, à deux) : …\\n3. Mise en commun et trace écrite (15 min)",
      "materiel": "…",
      "differenciation": "Aide pour les élèves en difficulté, défi pour ceux qui ont fini",
      "evaluation": "Comment je vérifie que c'est compris"
    }
  ]
}
\`\`\``
}

export function lireEtapes(json: any): EtapeIA[] {
  const brutes = Array.isArray(json) ? json : Array.isArray(json?.etapes) ? json.etapes : Array.isArray(json?.seances) ? json.seances : []
  const etapes = brutes
    .map((e: any) => ({
      titre: txt(e?.titre), objectif: opt(e?.objectif),
      duree: Number.isFinite(Number(e?.duree)) && Number(e?.duree) > 0 ? Math.round(Number(e.duree)) : null,
      deroule: opt(e?.deroule), materiel: opt(e?.materiel), differenciation: opt(e?.differenciation), evaluation: opt(e?.evaluation),
    }))
    .filter((e: EtapeIA) => e.titre)
  if (!etapes.length) throw new Error('Aucune séance trouvée dans la réponse.')
  return etapes
}

// ───────────── Appréciations du LSU ─────────────

export type AppreciationIA = { eleve_id: string; appreciations: Record<string, string>; appreciation_generale: string | null }

const IDS_LSU = LSU.map((m) => m.id)

export function codesEleves(eleves: Eleve[]) {
  return new Map(eleves.map((e, i) => [`E${i + 1}`, e]))
}

export function promptAppreciations(p: {
  classe: Classe; bilanNom: string; codes: Map<string, Eleve>; evaluations: Evaluation[]; bilans: LsuBilan[]; precisions: string
}) {
  const blocs: string[] = []
  for (const [code, e] of p.codes) {
    const lignes: string[] = []
    const b = p.bilans.find((x) => x.eleve_id === e.id)
    const pos = b ? Object.entries(b.positions ?? {}) : []
    if (pos.length) {
      lignes.push('  Positionnements : ' + pos.map(([d, v]) => `${d} = ${NIVEAUX.find((n) => n.v === v)?.court ?? v}`).join(' ; '))
    }
    for (const ev of p.evaluations) {
      const r = ev.resultats?.[e.id]
      if (!r) continue
      const items = ev.items.filter((i) => r[i.id] != null).map((i) => `${i.libelle} : ${NIVEAUX.find((n) => n.v === r[i.id])?.court ?? r[i.id]}`)
      if (items.length) lignes.push(`  ${matiere(ev.matiere).court} — ${ev.titre} : ${items.join(' ; ')}`)
    }
    blocs.push(`${code}\n${lignes.join('\n') || '  (pas de résultat saisi)'}`)
  }
  return `Tu es mon assistant pour le livret scolaire (LSU). Rédige les appréciations du ${p.bilanNom} pour chaque élève de ma classe de ${p.classe.nom}.

Les élèves sont désignés par un code (E1, E2…). N'invente pas de prénom : écris sans prénom ni pronom genré (par exemple « Bon trimestre : la lecture progresse »).

## Résultats de chaque élève
Niveaux : Non atteints < Partiellement < Atteints < Dépassés.
${blocs.join('\n\n')}

## Mes règles
- Bienveillant, précis, concret : un point fort, un point à travailler, un conseil.
- 1 à 2 phrases par matière, 2 à 3 phrases pour l'appréciation générale.
- Vocabulaire compréhensible par les familles et par l'élève.
- N'écris une appréciation de matière que s'il y a des résultats dans cette matière (sinon omets la matière).
${p.precisions.trim() ? `\n## Précisions pour cette fois\n${p.precisions.trim()}\n` : ''}
## Format de ta réponse
Réponds UNIQUEMENT avec un bloc JSON, sans texte autour :
\`\`\`json
{
  "eleves": [
    { "code": "E1", "appreciations": { "fr": "…", "ma": "…" }, "appreciation_generale": "…" }
  ]
}
\`\`\`
Clés possibles pour "appreciations" : ${LSU.map((m) => `"${m.id}" (${m.nom})`).join(', ')}.`
}

export function lireAppreciations(json: any, codes: Map<string, Eleve>): AppreciationIA[] {
  const brutes = Array.isArray(json) ? json : Array.isArray(json?.eleves) ? json.eleves : []
  const res: AppreciationIA[] = []
  for (const x of brutes) {
    const e = codes.get(txt(x?.code).toUpperCase())
    if (!e) continue
    const appreciations: Record<string, string> = {}
    for (const [k, v] of Object.entries(x?.appreciations ?? {})) {
      if (IDS_LSU.includes(k) && txt(v)) appreciations[k] = remplacerPrenom(txt(v), e.prenom)
    }
    res.push({ eleve_id: e.id, appreciations, appreciation_generale: opt(x?.appreciation_generale) && remplacerPrenom(txt(x.appreciation_generale), e.prenom) })
  }
  if (!res.length) throw new Error('Aucune appréciation reconnue (les codes E1, E2… doivent être présents).')
  return res
}

function remplacerPrenom(t: string, prenom: string) {
  return t.replace(/\bE\d+\b/g, prenom)
}

export const resumeJour = (s: string) => fmtJourCourt(s)
export const resumeHeure = (h: string | null) => fmtHeure(h)
