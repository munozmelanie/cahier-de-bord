// Mode démo : une fausse base en mémoire qui imite le petit morceau de supabase-js utilisé par l'appli.
// Sert à essayer l'appli sans compte et à la tester. Données fictives (aucun vrai élève).
import { demoDonnees, DEMO_IDS } from './demoDonnees'
import { aujourdhui, decaler } from './dates'

type Row = Record<string, any>
type Resultat = { data: any; error: { message: string } | null; count?: number | null }
type Persona = 'enseignant' | 'parent'

const CLES: Record<string, string[]> = {
  resumes: ['classe_id', 'date'],
  lsu_classe: ['classe_id', 'bilan'],
  lectures: ['message_id', 'user_id'],
  parents: ['eleve_id', 'user_id'],
  membres: ['classe_id', 'user_id'],
  publications_auto: ['classe_id', 'date'],
}

const DEFAUTS: Record<string, () => Row> = {
  seances: () => ({ a_faire: [], statut: 'prevue', ordre: 0, objectif: null, deroule: null, materiel: null, pour_familles: null, bilan: null, sequence_id: null, etape_id: null, progression_id: null, debut: null, fin: null, matiere: null, titre: '' }),
  devoirs: () => ({ type: 'travail', publie: false, publie_le: null, seance_id: null, matiere: null }),
  resumes: () => ({ items: [], mot: null, modifie_main: false, publie: false, publie_le: null }),
  agenda: () => ({ fin: null, heure: null, details: null, type: 'info', visible_familles: true }),
  evaluations: () => ({ items: [], resultats: {}, matiere: null, periode: null, titre: '' }),
  lsu_bilans: () => ({ positions: {}, appreciations: {}, appreciation_generale: null, absences: null, accompagnement: null, publie: false, publie_le: null, vu_le: null }),
  lsu_classe: () => ({ elements: {}, projets: null }),
  messages: () => ({ eleve_id: null, racine_id: null, titre: null, a_signer: false }),
  progressions: () => ({ statut: 'prevu', ordre: 0, semaine: null, domaine: null }),
  sequences: () => ({ matiere: null, periode: null, objectifs: null, competences: null, notes: null, titre: '' }),
  sequence_etapes: () => ({ numero: 1, titre: '', objectif: null, duree: null, deroule: null, materiel: null, differenciation: null, evaluation: null }),
  eleves: () => ({ nom: null, ordre: 0, actif: true }),
  edt_creneaux: () => ({ type: 'cours', matiere: null, libelle: null }),
}

const uuid = () =>
  (crypto as any).randomUUID?.() ??
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x))
const egal = (a: any, b: any) => String(a) === String(b)

class Store {
  tables: Record<string, Row[]>
  persona: Persona | null
  constructor() {
    let t: Record<string, Row[]> | null = null
    try {
      const brut = sessionStorage.getItem('cdb-demo-data')
      if (brut) t = JSON.parse(brut)
    } catch { /* rien */ }
    this.tables = t ?? demoDonnees()
    let p: Persona | null = null
    try { p = (localStorage.getItem('cdb-demo-persona') as Persona) || null } catch { /* rien */ }
    this.persona = p
  }
  sauver() {
    try { sessionStorage.setItem('cdb-demo-data', JSON.stringify(this.tables)) } catch { /* rien */ }
  }
  table(n: string) {
    if (!this.tables[n]) this.tables[n] = []
    return this.tables[n]
  }
  uid() {
    return this.persona === 'enseignant' ? DEMO_IDS.prof : this.persona === 'parent' ? DEMO_IDS.parent : null
  }
  mesEleves(): string[] {
    const uid = this.uid()
    return this.table('parents').filter((p) => p.user_id === uid).map((p) => p.eleve_id)
  }
  /** Imitation des règles d'accès pour la personne « parent » */
  visible(nom: string, r: Row): boolean {
    if (this.persona === 'enseignant') return true
    if (this.persona !== 'parent') return false
    const enfants = this.mesEleves()
    switch (nom) {
      case 'classes': return true
      case 'eleves': return enfants.includes(r.id)
      case 'parents': return r.user_id === this.uid()
      case 'devoirs': return !!r.publie
      case 'resumes': return !!r.publie
      case 'agenda': return !!r.visible_familles
      case 'lsu_bilans': return !!r.publie && enfants.includes(r.eleve_id)
      case 'lsu_classe': return true
      case 'messages': return (r.eleve_id == null && r.racine_id == null) || enfants.includes(r.eleve_id)
      case 'lectures': return r.user_id === this.uid()
      default: return false
    }
  }
}

class Requete implements PromiseLike<Resultat> {
  private op: 'select' | 'insert' | 'update' | 'upsert' | 'delete' = 'select'
  private filtres: ((r: Row) => boolean)[] = []
  private tris: { col: string; asc: boolean }[] = []
  private lim?: number
  private unique?: 'single' | 'maybe'
  private charge: any
  private conflit?: string
  private compte = false
  constructor(private s: Store, private nom: string) {}

  select(_cols?: string, opts?: { count?: string; head?: boolean }) { if (opts?.count) this.compte = true; return this }
  insert(p: any) { this.op = 'insert'; this.charge = p; return this }
  update(p: any) { this.op = 'update'; this.charge = p; return this }
  upsert(p: any, o?: { onConflict?: string }) { this.op = 'upsert'; this.charge = p; this.conflit = o?.onConflict; return this }
  delete() { this.op = 'delete'; return this }
  eq(c: string, v: any) { this.filtres.push((r) => egal(r[c], v)); return this }
  neq(c: string, v: any) { this.filtres.push((r) => !egal(r[c], v)); return this }
  gt(c: string, v: any) { this.filtres.push((r) => r[c] != null && r[c] > v); return this }
  gte(c: string, v: any) { this.filtres.push((r) => r[c] != null && r[c] >= v); return this }
  lt(c: string, v: any) { this.filtres.push((r) => r[c] != null && r[c] < v); return this }
  lte(c: string, v: any) { this.filtres.push((r) => r[c] != null && r[c] <= v); return this }
  in(c: string, v: any[]) { this.filtres.push((r) => v.some((x) => egal(x, r[c]))); return this }
  is(c: string, v: any) { this.filtres.push((r) => (v === null ? r[c] == null : r[c] === v)); return this }
  order(col: string, o?: { ascending?: boolean; nullsFirst?: boolean }) { this.tris.push({ col, asc: o?.ascending !== false }); return this }
  limit(n: number) { this.lim = n; return this }
  single() { this.unique = 'single'; return this }
  maybeSingle() { this.unique = 'maybe'; return this }

  then<A = Resultat, B = never>(ok?: ((v: Resultat) => A | PromiseLike<A>) | null, ko?: ((e: any) => B | PromiseLike<B>) | null) {
    return new Promise<Resultat>((res) => setTimeout(() => res(this.executer()), 60)).then(ok, ko)
  }

  private cle(r: Row) {
    const cols = this.conflit ? this.conflit.split(',').map((x) => x.trim()) : CLES[this.nom] ?? ['id']
    return cols.map((c) => String(r[c])).join('|')
  }

  private completer(r: Row) {
    const base = (DEFAUTS[this.nom]?.() ?? {}) as Row
    const maintenant = new Date().toISOString()
    const row: Row = { ...base, ...r }
    if (!CLES[this.nom] && !row.id) row.id = uuid()
    if (!row.created_at) row.created_at = maintenant
    row.updated_at = maintenant
    if (this.nom === 'eleves' && !row.code_famille) row.code_famille = codeDemo()
    if (this.nom === 'messages') {
      const prof = this.s.persona === 'enseignant'
      row.auteur_id = this.s.uid()
      row.auteur_role = prof ? 'enseignant' : 'parent'
      row.auteur_nom = prof ? 'Mme Martin' : 'Claire (Maman)'
      if (!prof) row.a_signer = false
    }
    return row
  }

  private executer(): Resultat {
    const s = this.s
    if (!s.persona) return { data: null, error: { message: 'Connexion requise' } }
    const t = s.table(this.nom)
    const prof = s.persona === 'enseignant'
    const visibles = () => t.filter((r) => s.visible(this.nom, r) && this.filtres.every((f) => f(r)))
    let lignes: Row[] = []

    if (this.op === 'select') {
      lignes = visibles()
      for (const tri of [...this.tris].reverse()) {
        lignes = [...lignes].sort((a, b) => {
          const x = a[tri.col], y = b[tri.col]
          if (x == null && y == null) return 0
          if (x == null) return 1
          if (y == null) return -1
          return (x < y ? -1 : x > y ? 1 : 0) * (tri.asc ? 1 : -1)
        })
      }
      if (this.lim != null) lignes = lignes.slice(0, this.lim)
    } else if (this.op === 'insert' || this.op === 'upsert') {
      const tab = Array.isArray(this.charge) ? this.charge : [this.charge]
      const parentPeutEcrire = ['messages', 'lectures'].includes(this.nom)
      if (!prof && !parentPeutEcrire) return { data: null, error: { message: 'new row violates row-level security policy' } }
      for (const r of tab) {
        const existant = this.op === 'upsert' ? t.find((x) => this.cle(x) === this.cle(r)) : undefined
        if (existant) {
          Object.assign(existant, clone(r), { updated_at: new Date().toISOString() })
          lignes.push(existant)
        } else {
          const n = this.completer(clone(r))
          t.push(n)
          lignes.push(n)
        }
      }
    } else if (this.op === 'update') {
      if (!prof && this.nom !== 'lectures') return { data: [], error: null }
      lignes = visibles()
      for (const r of lignes) Object.assign(r, clone(this.charge), { updated_at: new Date().toISOString() })
    } else if (this.op === 'delete') {
      if (!prof) return { data: [], error: null }
      lignes = visibles()
      s.tables[this.nom] = t.filter((r) => !lignes.includes(r))
    }

    if (this.op !== 'select') s.sauver()
    const data = clone(lignes)
    if (this.unique === 'single') {
      if (data.length !== 1) return { data: null, error: { message: 'Aucune ligne trouvée' } }
      return { data: data[0], error: null }
    }
    if (this.unique === 'maybe') return { data: data[0] ?? null, error: null }
    return { data, error: null, count: this.compte ? data.length : null }
  }
}

function codeDemo() {
  const a = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  let c = ''
  for (let i = 0; i < 8; i++) c += a[Math.floor(Math.random() * a.length)]
  return c.slice(0, 4) + '-' + c.slice(4)
}

export function creerClientDemo() {
  const s = new Store()
  const ecouteurs = new Set<(e: string, sess: any) => void>()
  const session = () => {
    const uid = s.uid()
    return uid ? { user: { id: uid, email: s.persona === 'enseignant' ? 'enseignante@demo.fr' : 'famille@demo.fr' } } : null
  }
  const changer = (p: Persona | null) => {
    s.persona = p
    try { p ? localStorage.setItem('cdb-demo-persona', p) : localStorage.removeItem('cdb-demo-persona') } catch { /* rien */ }
    const sess = session()
    ecouteurs.forEach((f) => f(sess ? 'SIGNED_IN' : 'SIGNED_OUT', sess))
  }

  return {
    demo: true,
    from: (nom: string) => new Requete(s, nom),
    rpc: async (nom: string, args: any): Promise<Resultat> => {
      await new Promise((r) => setTimeout(r, 120))
      if (nom === 'rejoindre') {
        return { data: s.persona === 'enseignant' ? { role: 'enseignant', classe_id: DEMO_IDS.classe } : { role: 'parent', eleve_id: DEMO_IDS.enfant, prenom: 'Léo', classe_id: DEMO_IDS.classe }, error: null }
      }
      if (nom === 'code_enseignant') return { data: 'DEMO-PROF-CODE', error: null }
      if (nom === 'nouveau_code_famille') {
        const e = s.table('eleves').find((x) => x.id === args.e)
        if (e) e.code_famille = codeDemo()
        s.sauver()
        return { data: e?.code_famille ?? null, error: null }
      }
      if (nom === 'publier_journee') return { data: publierDemo(s, args.p_classe, args.p_date), error: null }
      if (nom === 'jeton_remplacant') return { data: jetonDemo(s).jeton, error: null }
      if (nom === 'nouveau_jeton_remplacant') {
        const j = jetonDemo(s)
        j.jeton = args.actif === false ? null : Array.from({ length: 28 }, () => 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 31)]).join('')
        s.sauver()
        return { data: j.jeton, error: null }
      }
      if (nom === 'journal_remplacant') return { data: journalRemplacantDemo(s, args.p_jeton, args.p_date), error: null }
      return { data: null, error: { message: `Fonction inconnue : ${nom}` } }
    },
    auth: {
      getSession: async () => ({ data: { session: session() }, error: null }),
      onAuthStateChange: (f: (e: string, sess: any) => void) => {
        ecouteurs.add(f)
        return { data: { subscription: { unsubscribe: () => ecouteurs.delete(f) } } }
      },
      signInWithPassword: async ({ email }: { email: string }) => {
        changer(/famille|parent/i.test(email) ? 'parent' : 'enseignant')
        return { data: { session: session() }, error: null }
      },
      signUp: async ({ email }: { email: string }) => {
        changer(/famille|parent/i.test(email) ? 'parent' : 'enseignant')
        return { data: { session: session(), user: session()?.user }, error: null }
      },
      signOut: async () => { changer(null); return { error: null } },
      resetPasswordForEmail: async () => ({ data: {}, error: null }),
      updateUser: async () => ({ data: {}, error: null }),
      // propre au mode démo
      entrerComme: (p: Persona) => changer(p),
    },
  }
}

/** Lien remplaçant de la démo (un lien prêt à l'emploi au départ) */
function jetonDemo(s: Store) {
  const t = s.table('secrets_demo')
  if (!t.length) t.push({ jeton: 'DEMOREMPLACANT2026CAHIERBORD' })
  return t[0] as { jeton: string | null }
}

/** Même réponse que la fonction journal_remplacant de la base */
function journalRemplacantDemo(s: Store, jeton: string, date: string) {
  if (!jeton || jeton !== jetonDemo(s).jeton) return { erreur: 'lien' }
  const c = s.table('classes')[0] ?? {}
  const r = c.reglages ?? {}
  const min = decaler(aujourdhui(), -7)
  const max = decaler(aujourdhui(), 14)
  if (!date || date < min || date > max) return { erreur: 'date', min, max }
  const per = (r.periodes ?? []).find((p: any) => p.debut <= date && date <= p.fin)?.id
  const jour = ((new Date(date + 'T12:00:00').getDay() + 6) % 7) + 1
  const hh = (t: any) => (t ? String(t).slice(0, 5) : t)
  return {
    classe: { nom: c.nom, ecole: c.ecole, enseignant_nom: c.enseignant_nom },
    reglages: { jours: r.jours, periodes: r.periodes, vacances: r.vacances, feries: r.feries },
    mot: (r.mot_remplacant ?? '').trim() || null,
    min, max,
    seances: s.table('seances').filter((x) => x.classe_id === c.id && x.date === date)
      .map((x) => ({ id: x.id, date: x.date, debut: hh(x.debut), fin: hh(x.fin), matiere: x.matiere, titre: x.titre, objectif: x.objectif, deroule: x.deroule, materiel: x.materiel, a_faire: x.a_faire ?? [], statut: x.statut })),
    devoirs: s.table('devoirs').filter((d) => d.classe_id === c.id && d.donne_le === date)
      .map((d) => ({ id: d.id, donne_le: d.donne_le, pour_le: d.pour_le, matiere: d.matiere, texte: d.texte, type: d.type })),
    pauses: s.table('edt_creneaux').filter((e) => e.classe_id === c.id && e.type === 'pause' && e.periode === per && e.jour === jour)
      .map((e) => ({ id: e.id, jour: e.jour, debut: hh(e.debut), fin: hh(e.fin), libelle: e.libelle, type: e.type })),
  }
}

function publierDemo(s: Store, classe: string, date: string) {
  const seances = s.table('seances').filter((x) => x.classe_id === classe && x.date === date)
  seances.forEach((x) => { if (x.statut === 'prevue') x.statut = 'faite' })
  const items = seances
    .filter((x) => x.statut === 'faite' && (x.pour_familles ?? '').trim() !== '-' && ((x.pour_familles ?? '').trim() || x.titre))
    .sort((a, b) => String(a.debut).localeCompare(String(b.debut)))
    .map((x) => ({ matiere: x.matiere, texte: (x.pour_familles ?? '').trim() || x.titre }))
  const resumes = s.table('resumes')
  let r = resumes.find((x) => x.classe_id === classe && x.date === date)
  if (!r) { r = { classe_id: classe, date, items, mot: null, modifie_main: false, publie: true, publie_le: new Date().toISOString() }; resumes.push(r) }
  else { if (!r.modifie_main) r.items = items; r.publie = true; r.publie_le = r.publie_le ?? new Date().toISOString() }
  let n = 0
  for (const d of s.table('devoirs')) {
    if (d.classe_id !== classe || d.donne_le !== date || d.publie) continue
    const se = d.seance_id ? seances.find((x) => x.id === d.seance_id) : null
    if (se && se.statut === 'non_faite') continue
    d.publie = true; d.publie_le = new Date().toISOString(); n++
  }
  s.sauver()
  return { items: items.length, devoirs: n }
}
