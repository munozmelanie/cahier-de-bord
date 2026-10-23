// Données fictives du mode démo (aucun vrai élève), calées sur le calendrier 2026-2027 zone B
import { decaler, estJourClasse, iso, joursSemaine, lundiDe, jourClasseSuivant, numJour, periodeCourante } from './dates'
import type { Reglages } from './types'

export const DEMO_IDS = {
  classe: 'demo-classe',
  prof: 'demo-prof',
  parent: 'demo-parent',
  enfant: 'demo-eleve-leo',
}

export const REGLAGES_2026: Reglages = {
  jours: [1, 2, 4, 5],
  heure_resume: '16:45',
  resume_auto: true,
  periodes: [
    { id: 'P1', debut: '2026-09-01', fin: '2026-10-16' },
    { id: 'P2', debut: '2026-11-02', fin: '2026-12-18' },
    { id: 'P3', debut: '2027-01-04', fin: '2027-02-19' },
    { id: 'P4', debut: '2027-03-08', fin: '2027-04-16' },
    { id: 'P5', debut: '2027-05-03', fin: '2027-07-02' },
  ],
  vacances: [
    { nom: 'Toussaint', debut: '2026-10-17', fin: '2026-11-01' },
    { nom: 'Noël', debut: '2026-12-19', fin: '2027-01-03' },
    { nom: 'Hiver', debut: '2027-02-20', fin: '2027-03-07' },
    { nom: 'Printemps', debut: '2027-04-17', fin: '2027-05-02' },
    { nom: "Pont de l'Ascension", debut: '2027-05-06', fin: '2027-05-09' },
    { nom: 'Été', debut: '2027-07-03', fin: '2027-08-31' },
  ],
  feries: ['2026-11-11', '2027-03-29', '2027-05-17'],
  lsu: {
    rythme: 'trimestre',
    bilans: [
      { id: 'T1', nom: '1er trimestre', debut: '2026-09-01', fin: '2026-12-18' },
      { id: 'T2', nom: '2e trimestre', debut: '2027-01-04', fin: '2027-04-16' },
      { id: 'T3', nom: '3e trimestre', debut: '2027-05-03', fin: '2027-07-02' },
    ],
  },
}

/** Jour « aujourd'hui » du mode démo : toujours un jour de classe */
export function jourDemo(): string {
  const t = iso(new Date())
  if (estJourClasse(t, REGLAGES_2026)) return t
  const debutAnnee = REGLAGES_2026.periodes![0].debut
  const finAnnee = REGLAGES_2026.periodes![4].fin
  if (t < debutAnnee || t > finAnnee) return '2026-11-03'
  return jourClasseSuivant(t, REGLAGES_2026)
}

const EDT: [number, string, string, string | null, string, ('pause')?][] = [
  [1, '08:45', '09:00', 'rituels', 'Bateau-école'], [1, '09:00', '09:10', 'maths', 'Calcul mental'],
  [1, '09:10', '09:50', 'maths', 'Maths'], [1, '09:50', '10:15', 'lecture', 'Lecture'],
  [1, '10:15', '10:30', null, 'Récréation', 'pause'], [1, '10:30', '10:40', 'lecture', 'Fluence'],
  [1, '10:40', '11:45', 'francais', 'Français'], [1, '11:45', '13:30', null, 'Pause méridienne', 'pause'],
  [1, '13:30', '15:00', 'eps', 'EPS'], [1, '15:00', '15:30', null, 'Récréation', 'pause'],
  [1, '15:30', '15:50', 'anglais', 'Anglais'], [1, '15:50', '16:10', 'maths', 'Recherche de maths'],
  [1, '16:10', '16:25', 'lecture', 'Lecture silencieuse'], [1, '16:25', '16:30', 'vie', 'Bilan'],
  [2, '08:45', '09:00', 'rituels', 'Bateau-école'], [2, '09:00', '09:10', 'maths', 'Calcul mental'],
  [2, '09:10', '09:50', 'maths', 'Maths'], [2, '09:50', '10:15', 'francais', 'Français'],
  [2, '10:15', '10:30', null, 'Récréation', 'pause'], [2, '10:30', '10:40', 'lecture', 'Fluence'],
  [2, '10:40', '11:45', 'francais', 'Français'], [2, '11:45', '13:30', null, 'Pause méridienne', 'pause'],
  [2, '13:30', '14:30', 'informatique', 'Informatique'], [2, '14:30', '15:00', 'geographie', 'Géographie'],
  [2, '15:00', '15:30', null, 'Récréation', 'pause'], [2, '15:30', '16:25', 'arts', 'Arts plastiques'],
  [2, '16:25', '16:30', 'vie', 'Bilan'],
  [4, '08:45', '09:55', 'eps', 'EPS'], [4, '09:55', '10:15', 'lecture', 'Lecture-compréhension'],
  [4, '10:15', '10:30', null, 'Récréation', 'pause'], [4, '10:30', '10:40', 'lecture', 'Fluence'],
  [4, '10:40', '11:45', 'francais', 'Français'], [4, '11:45', '13:30', null, 'Pause méridienne', 'pause'],
  [4, '13:30', '13:40', 'maths', 'Calcul mental'], [4, '13:40', '14:20', 'maths', 'Maths'],
  [4, '14:20', '15:00', 'emc', 'EMC'], [4, '15:00', '15:30', null, 'Récréation', 'pause'],
  [4, '15:30', '15:50', 'anglais', 'Anglais'], [4, '15:50', '16:10', 'maths', 'Recherche de maths'],
  [4, '16:10', '16:25', 'lecture', 'Lecture silencieuse'], [4, '16:25', '16:30', 'vie', 'Bilan'],
  [5, '08:45', '09:10', 'rituels', 'Bateau-école : escale'], [5, '09:10', '09:20', 'maths', 'Calcul mental'],
  [5, '09:20', '10:15', 'maths', 'Maths'], [5, '10:15', '10:30', null, 'Récréation', 'pause'],
  [5, '10:30', '10:40', 'lecture', 'Fluence'], [5, '10:40', '11:45', 'francais', 'Français'],
  [5, '11:45', '13:30', null, 'Pause méridienne', 'pause'], [5, '13:30', '15:00', 'histoire', 'Histoire'],
  [5, '15:00', '15:30', null, 'Récréation', 'pause'], [5, '15:30', '15:50', 'anglais', 'Anglais'],
  [5, '15:50', '16:10', 'lecture', 'Lecture offerte'], [5, '16:10', '16:25', 'lecture', 'Lecture silencieuse'],
  [5, '16:25', '16:30', 'vie', 'Bilan'],
]

const SUJETS: Record<string, [string, string][]> = {
  maths: [['Les multiples et les diviseurs', 'Maths : multiples et diviseurs.'], ['Lire l\'heure', 'Maths : lire l\'heure.'], ['Comparer des fractions', 'Maths : comparer des fractions.'], ['Tracer des perpendiculaires', 'Maths : tracer des perpendiculaires.']],
  francais: [['Les déterminants', 'Grammaire : les déterminants.'], ['L\'imparfait', 'Conjugaison : l\'imparfait.'], ['a/à, et/est', 'Orthographe : a/à, et/est.'], ['Dictée flash', 'Dictée flash.']],
  lecture: [['« Le phare des oubliés »', 'Lecture : « Le phare des oubliés ».'], ['Les inférences', 'Lecture : comprendre ce qui n\'est pas écrit.']],
  anglais: [['My family', 'Anglais : présenter sa famille.']],
  geographie: [['Que mange-t-on dans le monde ?', 'Géographie : que mange-t-on dans le monde ?']],
  histoire: [['Les paysans au Moyen Âge', 'Histoire : la vie des paysans au Moyen Âge.']],
  emc: [['Enquête citoyenne', 'EMC : enquête citoyenne.']],
  arts: [['Un événement en trois images', 'Arts : raconter en trois images.']],
  eps: [['Course de relais', 'EPS : course de relais.']],
}

const PRENOMS = ['Adèle', 'Bastien', 'Chloé', 'Dylan', 'Elsa', 'Florian', 'Gabin', 'Inaya', 'Jade', 'Kenzo', 'Léo',
  'Lina', 'Maël', 'Nina', 'Oscar', 'Rose', 'Sacha', 'Tom', 'Ugo', 'Victoire', 'Yanis', 'Zoé']

export function demoDonnees(): Record<string, Record<string, any>[]> {
  const C = DEMO_IDS.classe
  const auj = jourDemo()
  const lundi = iso(lundiDe(new Date(auj + 'T12:00:00')))
  const periode = periodeCourante(auj, REGLAGES_2026)?.id ?? 'P2'
  const now = new Date().toISOString()

  const eleves = PRENOMS.map((p, i) => ({
    id: p === 'Léo' ? DEMO_IDS.enfant : `demo-eleve-${i}`, classe_id: C, prenom: p, nom: null, ordre: i + 1,
    code_famille: `DEMO-${String(1000 + i)}`, actif: true, created_at: now,
  }))

  const edt = ['P1', 'P2', 'P3', 'P4', 'P5'].flatMap((per) =>
    EDT.map(([jour, debut, fin, matiere, libelle, type], i) => ({
      id: `demo-edt-${per}-${i}`, classe_id: C, periode: per, jour, debut: debut + ':00', fin: fin + ':00',
      matiere, libelle, type: type ?? 'cours', created_at: now,
    })))

  const seances: Record<string, any>[] = []
  const devoirs: Record<string, any>[] = []
  const resumes: Record<string, any>[] = []
  let k = 0
  for (const jour of joursSemaine(lundi, REGLAGES_2026)) {
    if (!estJourClasse(jour, REGLAGES_2026)) continue
    const nj = numJour(jour)
    for (const [j, debut, fin, matiere, libelle, type] of EDT) {
      if (j !== nj || type === 'pause') continue
      const sujets = matiere ? SUJETS[matiere] : undefined
      const s = sujets?.[k % sujets.length]
      const rituel = !s || ['Calcul mental', 'Fluence', 'Lecture silencieuse', 'Bilan', 'Bateau-école', 'Bateau-école : escale'].includes(libelle)
      seances.push({
        id: `demo-seance-${k}`, classe_id: C, date: jour, debut: debut + ':00', fin: fin + ':00', matiere,
        titre: rituel ? libelle : s![0], objectif: rituel ? null : 'Comprendre et utiliser la notion.',
        deroule: rituel ? null : '1. Découverte collective (10 min)\n2. Recherche par deux (15 min)\n3. Mise en commun et trace écrite',
        materiel: rituel ? null : 'Manuel, mémo, ardoise', a_faire: rituel || k % 3 ? [] : [{ label: 'Imprimer la fiche d\'exercices (22 ex.)', type: 'imprimer' }],
        pour_familles: rituel ? '-' : s![1], bilan: null, statut: jour < auj ? 'faite' : 'prevue',
        sequence_id: null, etape_id: null, progression_id: null, ordre: 0, created_at: now, updated_at: now,
      })
      k++
    }
    const n1 = decaler(jour, 7)
    devoirs.push(
      { id: `demo-dev-${jour}-1`, classe_id: C, donne_le: jour, pour_le: n1, matiere: 'maths', texte: 'Apprendre la leçon du jour', type: 'lecon', seance_id: null, publie: jour < auj, publie_le: jour < auj ? now : null, created_at: now },
      { id: `demo-dev-${jour}-2`, classe_id: C, donne_le: jour, pour_le: n1, matiere: 'francais', texte: 'Fiche de devoirs : une case', type: 'travail', seance_id: null, publie: jour < auj, publie_le: jour < auj ? now : null, created_at: now },
    )
    if (jour < auj) {
      resumes.push({
        classe_id: C, date: jour, mot: null, modifie_main: false, publie: true, publie_le: now,
        items: seances.filter((x) => x.date === jour && x.pour_familles !== '-').map((x) => ({ matiere: x.matiere, texte: x.pour_familles })),
      })
    }
  }
  // Devoirs déjà donnés la semaine d'avant, à faire cette semaine
  for (const jour of joursSemaine(lundi, REGLAGES_2026)) {
    devoirs.push({ id: `demo-dev-avant-${jour}`, classe_id: C, donne_le: decaler(jour, -7), pour_le: jour, matiere: 'maths', texte: 'Revoir les tables de 6 et de 7', type: 'lecon', seance_id: null, publie: true, publie_le: now, created_at: now })
  }
  devoirs.push({ id: 'demo-dev-eval', classe_id: C, donne_le: decaler(auj, -2), pour_le: decaler(lundi, 11), matiere: 'histoire', texte: 'Évaluation d\'histoire : le Moyen Âge (revoir la leçon)', type: 'evaluation', seance_id: null, publie: true, publie_le: now, created_at: now })

  const messages = [
    { id: 'demo-msg-1', classe_id: C, eleve_id: null, racine_id: null, auteur_id: DEMO_IDS.prof, auteur_role: 'enseignant', auteur_nom: 'Mme Martin', titre: 'Sortie au musée', texte: 'Nous irons au musée le jeudi 26 novembre. Merci de signer pour donner votre accord. Prévoir un pique-nique.', a_signer: true, created_at: new Date(Date.now() - 2 * 86400000).toISOString() },
    { id: 'demo-msg-2', classe_id: C, eleve_id: null, racine_id: null, auteur_id: DEMO_IDS.prof, auteur_role: 'enseignant', auteur_nom: 'Mme Martin', titre: 'Porte-vues de fluence', texte: 'Votre enfant rapporte son porte-vues de fluence chaque lundi. Merci de le relire avec lui 10 minutes par soir.', a_signer: false, created_at: new Date(Date.now() - 5 * 86400000).toISOString() },
    { id: 'demo-msg-3', classe_id: C, eleve_id: DEMO_IDS.enfant, racine_id: null, auteur_id: DEMO_IDS.parent, auteur_role: 'parent', auteur_nom: 'Claire (Maman)', titre: 'Absence vendredi', texte: 'Bonjour, Léo aura rendez-vous chez l\'orthophoniste vendredi à 15h, je viendrai le chercher à 14h45.', a_signer: false, created_at: new Date(Date.now() - 86400000).toISOString() },
    { id: 'demo-msg-4', classe_id: C, eleve_id: DEMO_IDS.enfant, racine_id: 'demo-msg-3', auteur_id: DEMO_IDS.prof, auteur_role: 'enseignant', auteur_nom: 'Mme Martin', titre: null, texte: 'Bien noté, merci !', a_signer: false, created_at: new Date(Date.now() - 80000000).toISOString() },
  ]

  const agenda = [
    { id: 'demo-ag-1', classe_id: C, date: decaler(lundi, 14), fin: decaler(lundi, 18), heure: null, titre: 'Bilans de la période', details: 'Lundi grammaire et numération, mardi conjugaison et calcul…', type: 'evaluation', visible_familles: true, created_at: now },
    { id: 'demo-ag-2', classe_id: C, date: decaler(lundi, 24), fin: null, heure: '9h', titre: 'Sortie au musée', details: 'Prévoir un pique-nique.', type: 'sortie', visible_familles: true, created_at: now },
    { id: 'demo-ag-3', classe_id: C, date: decaler(lundi, 10), fin: null, heure: '17h', titre: 'Réunion parents-enseignante', details: null, type: 'reunion', visible_familles: true, created_at: now },
  ]

  const progressions = ['francais', 'maths', 'histoire', 'geographie', 'sciences', 'anglais'].flatMap((m, i) =>
    [1, 2, 3, 4, 5, 6, 7].map((s) => ({
      id: `demo-prog-${m}-${s}`, classe_id: C, matiere: m, periode, semaine: s,
      titre: `${(SUJETS[m]?.[s % (SUJETS[m]?.length ?? 1)]?.[0]) ?? 'Séquence'} (semaine ${s})`, domaine: null,
      statut: s < 2 ? 'fait' : s === 2 ? 'en_cours' : 'prevu', ordre: s, created_at: now,
    })).slice(0, i < 2 ? 7 : 4))

  const sequences = [{ id: 'demo-seq-1', classe_id: C, matiere: 'histoire', titre: 'Le Moyen Âge en mode enquête', periode, objectifs: 'Découvrir la société médiévale : seigneurs, paysans, moines.', competences: 'Se repérer dans le temps ; comprendre un document.', notes: null, created_at: now, updated_at: now }]
  const etapes = [
    { id: 'demo-et-1', classe_id: C, sequence_id: 'demo-seq-1', numero: 1, titre: 'Le jeu de la seigneurie', objectif: 'Comprendre les relations seigneur / paysans.', duree: 60, deroule: 'Jeu de rôle par équipes, puis mise en commun.', materiel: 'Cartes du jeu', differenciation: null, evaluation: null, created_at: now },
    { id: 'demo-et-2', classe_id: C, sequence_id: 'demo-seq-1', numero: 2, titre: 'Les paysans et l\'église du village', objectif: 'Décrire la vie des paysans.', duree: 90, deroule: 'Étude des Très Riches Heures du duc de Berry.', materiel: 'Reproductions', differenciation: null, evaluation: null, created_at: now },
  ]

  const items = [{ id: 'i1', libelle: 'Reconnaître un déterminant', domaine: 'fr.langue' }, { id: 'i2', libelle: 'Accorder dans le groupe nominal', domaine: 'fr.langue' }]
  const resultats: Record<string, Record<string, number>> = {}
  eleves.forEach((e, i) => { resultats[e.id] = { i1: 1 + ((i * 7) % 4), i2: 1 + ((i * 5 + 2) % 4) } })
  const evaluations = [{ id: 'demo-ev-1', classe_id: C, date: decaler(auj, -3), matiere: 'francais', titre: 'Les déterminants', periode, items, resultats, created_at: now, updated_at: now }]

  const lsu_bilans = eleves.slice(0, 12).map((e, i) => ({
    id: `demo-lsu-${i}`, classe_id: C, eleve_id: e.id, bilan: 'T1',
    positions: { 'fr.oral': 3, 'fr.lecture': 2 + (i % 3), 'fr.ecriture': 3, 'fr.langue': 2 + (i % 2), 'ma.nombres': 3, 'ma.grandeurs': 2 + (i % 3), 'ma.espace': 3, eps: 4, hg: 3, st: 3 },
    appreciations: { fr: 'Bon trimestre en français : la lecture progresse, l\'écriture demande encore de l\'attention.', ma: 'Les techniques de calcul sont en place.' },
    appreciation_generale: 'Un trimestre sérieux et volontaire. Continue ainsi !', absences: i % 4, accompagnement: null,
    publie: e.id === DEMO_IDS.enfant, publie_le: e.id === DEMO_IDS.enfant ? now : null, vu_le: null, updated_at: now,
  }))

  return {
    classes: [{ id: C, nom: 'CM1', ecole: 'École des Pins', ville: 'Démo', annee: '2026-2027', enseignant_nom: 'Mme Martin', reglages: REGLAGES_2026, created_at: now }],
    membres: [{ classe_id: C, user_id: DEMO_IDS.prof, nom_affiche: 'Mme Martin', created_at: now }],
    eleves,
    parents: [{ eleve_id: DEMO_IDS.enfant, user_id: DEMO_IDS.parent, nom_affiche: 'Claire', lien: 'Maman', created_at: now }],
    edt_creneaux: edt,
    seances, devoirs, resumes, messages, agenda, progressions, sequences, sequence_etapes: etapes, evaluations, lsu_bilans,
    lsu_classe: [{ classe_id: C, bilan: 'T1', elements: { fr: 'Lecture de textes variés ; grammaire du groupe nominal ; le présent.', ma: 'Nombres entiers ; fractions ; addition et soustraction.' }, projets: 'Chorale ; parcours Moyen Âge.' }],
    lectures: [],
  }
}
