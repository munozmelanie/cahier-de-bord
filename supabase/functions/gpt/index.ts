// API du GPT perso « Cahier de bord » (actions ChatGPT).
// Authentification : en-tête « Authorization: Bearer cdb_… » (clé créée dans l'appli, page ChatGPT / Claude).
import { createClient } from 'jsr:@supabase/supabase-js@2'

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
})

const MATIERES = ['francais', 'lecture', 'maths', 'sciences', 'histoire', 'geographie', 'emc', 'anglais', 'arts', 'musique', 'eps', 'rituels', 'informatique', 'vie']
const TYPES_DEVOIR = ['travail', 'lecon', 'evaluation', 'materiel', 'info']
const DATE = /^\d{4}-\d{2}-\d{2}$/
const HEURE = /^\d{2}:\d{2}(:\d{2})?$/

const json = (corps: unknown, statut = 200) =>
  new Response(JSON.stringify(corps), { status: statut, headers: { 'content-type': 'application/json; charset=utf-8' } })

async function empreinte(cle: string) {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(cle))
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function classeDeLaCle(req: Request): Promise<string | null> {
  const cle = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '').trim()
  if (!cle.startsWith('cdb_')) return null
  const { data } = await db.from('cles_api').select('id, classe_id').eq('empreinte', await empreinte(cle)).maybeSingle()
  if (!data) return null
  await db.from('cles_api').update({ utilisee_le: new Date().toISOString() }).eq('id', data.id)
  return data.classe_id
}

function periodesCouvertes(reglages: any, debut: string, fin: string): string[] {
  return (reglages?.periodes ?? []).filter((p: any) => p.debut <= fin && p.fin >= debut).map((p: any) => p.id)
}

Deno.serve(async (req) => {
  const url = new URL(req.url)
  const route = url.pathname.replace(/^.*\/gpt/, '') || '/'
  const classeId = await classeDeLaCle(req)
  if (!classeId) return json({ erreur: 'Clé absente ou invalide. Crée une clé dans l\'appli (ChatGPT / Claude).' }, 401)

  try {
    if (req.method === 'GET' && route === '/contexte') {
      const debut = url.searchParams.get('debut') ?? ''
      const fin = url.searchParams.get('fin') ?? debut
      if (!DATE.test(debut) || !DATE.test(fin)) return json({ erreur: 'Paramètres debut et fin au format AAAA-MM-JJ.' }, 400)
      const { data: classe } = await db.from('classes').select('nom, ecole, ville, annee, reglages').eq('id', classeId).single()
      const periodes = periodesCouvertes(classe?.reglages, debut, fin)
      const [edt, progressions, seances, devoirs, agenda] = await Promise.all([
        db.from('edt_creneaux').select('periode, jour, debut, fin, matiere, libelle, type').eq('classe_id', classeId).in('periode', periodes.length ? periodes : ['-']).order('jour').order('debut'),
        db.from('progressions').select('periode, matiere, semaine, titre, statut').eq('classe_id', classeId).in('periode', periodes.length ? periodes : ['-']).order('matiere').order('semaine'),
        db.from('seances').select('date, debut, fin, matiere, titre, objectif, materiel, statut').eq('classe_id', classeId).gte('date', debut).lte('date', fin).order('date').order('debut'),
        db.from('devoirs').select('donne_le, pour_le, matiere, texte, type').eq('classe_id', classeId).or(`and(donne_le.gte.${debut},donne_le.lte.${fin}),and(pour_le.gte.${debut},pour_le.lte.${fin})`).order('pour_le'),
        db.from('agenda').select('date, fin, titre, type').eq('classe_id', classeId).gte('date', debut).lte('date', fin),
      ])
      return json({
        classe: { nom: classe?.nom, ecole: classe?.ecole, annee: classe?.annee },
        jours_de_classe: classe?.reglages?.jours ?? [1, 2, 4, 5],
        periodes: classe?.reglages?.periodes, vacances: classe?.reglages?.vacances, feries: classe?.reglages?.feries,
        emploi_du_temps: edt.data, progressions: progressions.data, seances_existantes: seances.data,
        devoirs: devoirs.data, agenda: agenda.data, matieres: MATIERES,
      })
    }

    if (req.method === 'POST' && route === '/seances') {
      const corps = await req.json()
      const liste = Array.isArray(corps?.seances) ? corps.seances : []
      const remplacer = corps?.remplacer === true
      const lignes = liste
        .filter((s: any) => DATE.test(s?.date) && typeof s?.titre === 'string' && s.titre.trim())
        .map((s: any) => ({
          classe_id: classeId, date: s.date,
          debut: HEURE.test(s.debut ?? '') ? s.debut : null, fin: HEURE.test(s.fin ?? '') ? s.fin : null,
          matiere: MATIERES.includes(s.matiere) ? s.matiere : null, titre: String(s.titre).slice(0, 300),
          objectif: s.objectif ?? null, deroule: s.deroule ?? null, materiel: s.materiel ?? null,
          pour_familles: typeof s.pour_familles === 'string' ? s.pour_familles.slice(0, 300) : null,
          a_faire: Array.isArray(s.a_faire) ? s.a_faire.filter((a: any) => typeof a?.label === 'string').map((a: any) => ({ label: a.label, type: a.type ?? 'imprimer' })) : [],
        }))
      if (!lignes.length) return json({ erreur: 'Aucune séance valide (date AAAA-MM-JJ et titre obligatoires).' }, 400)
      const dates = [...new Set(lignes.map((l: any) => l.date))]
      const { data: existantes } = await db.from('seances').select('id, date, debut').eq('classe_id', classeId).in('date', dates)
      const cle = (d: string, h: string | null) => `${d}|${(h ?? '').slice(0, 5)}`
      const occupees = new Map((existantes ?? []).map((e: any) => [cle(e.date, e.debut), e.id]))
      const aRemplacer = lignes.filter((l: any) => occupees.has(cle(l.date, l.debut))).map((l: any) => occupees.get(cle(l.date, l.debut)))
      let ignorees = 0
      let aInserer = lignes
      if (remplacer && aRemplacer.length) await db.from('seances').delete().in('id', aRemplacer)
      else { aInserer = lignes.filter((l: any) => !occupees.has(cle(l.date, l.debut))); ignorees = lignes.length - aInserer.length }
      if (aInserer.length) {
        const { error } = await db.from('seances').insert(aInserer)
        if (error) return json({ erreur: error.message }, 400)
      }
      return json({ ajoutees: aInserer.length, ignorees, remplacees: remplacer ? aRemplacer.length : 0 })
    }

    if (req.method === 'POST' && route === '/devoirs') {
      const corps = await req.json()
      const liste = Array.isArray(corps?.devoirs) ? corps.devoirs : []
      const lignes = liste
        .filter((d: any) => DATE.test(d?.donne_le) && DATE.test(d?.pour_le) && typeof d?.texte === 'string' && d.texte.trim())
        .map((d: any) => ({
          classe_id: classeId, donne_le: d.donne_le, pour_le: d.pour_le, texte: String(d.texte).slice(0, 500),
          matiere: MATIERES.includes(d.matiere) ? d.matiere : null, type: TYPES_DEVOIR.includes(d.type) ? d.type : 'travail',
        }))
      if (!lignes.length) return json({ erreur: 'Aucun devoir valide (donne_le, pour_le, texte obligatoires).' }, 400)
      const { error } = await db.from('devoirs').insert(lignes)
      if (error) return json({ erreur: error.message }, 400)
      return json({ ajoutes: lignes.length, note: 'Visibles des familles après la publication de fin de journée.' })
    }

    return json({ erreur: 'Route inconnue. Routes : GET /contexte, POST /seances, POST /devoirs.' }, 404)
  } catch (e) {
    return json({ erreur: (e as Error).message }, 500)
  }
})
