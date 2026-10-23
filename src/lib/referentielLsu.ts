// Référentiel du livret scolaire (bilan périodique, CM1).
// Présentation du LSU : des blocs (Français, Mathématiques…), des domaines (Oral, Lecture…) et, dans chaque domaine,
// les principaux éléments du programme travaillés, chacun positionné sur quatre colonnes.
// Français et mathématiques : programmes de cycle 3 de 2025 (CM1). Autres enseignements : programmes de cycle 3.
// L'enseignante choisit les éléments travaillés à chaque période et peut en ajouter (lsu_classe.elements).

export type ElementProgramme = { id: string; libelle: string }
export type DomaineLivret = { id: string; nom: string; elements: ElementProgramme[] }
/** seul = domaine présenté seul, en gras, sans ligne de titre (EPS, langue vivante, EMC…) */
export type BlocLivret = { id: string; nom: string; seul?: boolean; domaines: DomaineLivret[] }

const e = (prefixe: string, libelles: string[]): ElementProgramme[] =>
  libelles.map((libelle, i) => ({ id: `${prefixe}.${i + 1}`, libelle }))
const d = (id: string, nom: string, libelles: string[]): DomaineLivret => ({ id, nom, elements: e(id, libelles) })

export const BLOCS_LSU: BlocLivret[] = [
  {
    id: 'fr', nom: 'Français', domaines: [
      d('fr.oral', 'Oral', [
        'Écouter pour comprendre des messages oraux, des textes lus ou des documents',
        'Dire pour être compris : raconter, expliquer, justifier',
        'Participer à des échanges en respectant les règles de la communication',
        'Lire à voix haute devant un public un texte préparé',
      ]),
      d('fr.lecture', 'Lecture', [
        'Lire avec fluidité',
        'Lire à voix haute avec expressivité',
        'Lire et comprendre seul des textes, des documents et des images',
        'Repérer les informations explicites et implicites d\'un texte',
        'Lire et comprendre des documents pour apprendre dans toutes les disciplines',
        'Lire une œuvre et se l\'approprier',
      ]),
      d('fr.ecriture', 'Écriture', [
        'Copier de manière fluide et efficace',
        'Écrire pour réfléchir, apprendre et mémoriser',
        'Produire des écrits variés',
        'Utiliser le brouillon et améliorer son texte à partir de pistes données',
        'Respecter les codes de l\'écrit (majuscules, ponctuation, mise en page)',
      ]),
      d('fr.vocabulaire', 'Vocabulaire', [
        'Enrichir son vocabulaire dans toutes les disciplines',
        'Trouver le sens d\'un mot inconnu à l\'aide du contexte et de sa formation',
        'Établir des relations entre les mots (familles, synonymes, antonymes)',
        'Réemployer à l\'oral et à l\'écrit le vocabulaire étudié',
        'Mémoriser l\'orthographe des mots les plus fréquents',
      ]),
      d('fr.grammaire', 'Grammaire et orthographe', [
        'Connaître les types et les formes de phrases, passer de l\'un à l\'autre',
        'Identifier le verbe conjugué et le sujet',
        'Distinguer les compléments d\'objet et les compléments circonstanciels',
        'Identifier la nature des mots (déterminant, nom, adjectif, pronom, verbe, adverbe)',
        'Analyser le groupe nominal (déterminant, nom, adjectif)',
        'Réaliser les accords dans le groupe nominal',
        'Accorder le verbe avec son sujet',
        'Conjuguer au présent, à l\'imparfait, au futur et au passé composé',
      ]),
    ],
  },
  {
    id: 'ma', nom: 'Mathématiques', domaines: [
      d('ma.nombres', 'Nombres, calcul et résolution de problèmes', [
        'Lire, écrire, comparer et décomposer les nombres entiers',
        'Reconnaître des multiples et des diviseurs (critères de divisibilité par 2, 5 et 10)',
        'Représenter, comparer, additionner et soustraire des fractions',
        'Calculer une fraction d\'une quantité',
        'Comprendre et utiliser les nombres décimaux (jusqu\'aux centièmes)',
        'Calculer mentalement (faits numériques et procédures)',
        'Poser et effectuer l\'addition, la soustraction et la multiplication',
        'Effectuer une division euclidienne par un nombre à un chiffre',
        'Résoudre des problèmes additifs, multiplicatifs et en plusieurs étapes',
        'Trouver un nombre manquant, poursuivre une suite (premiers pas en algèbre)',
      ]),
      d('ma.grandeurs', 'Grandeurs et mesures', [
        'Mesurer des longueurs, calculer le périmètre d\'un polygone',
        'Comparer et mesurer des masses et des contenances',
        'Comparer et mesurer des aires',
        'Reconnaître, nommer et comparer des angles',
        'Lire l\'heure, calculer et comparer des durées',
      ]),
      d('ma.espace', 'Espace et géométrie', [
        'Utiliser la règle, l\'équerre et le compas',
        'Reconnaître et tracer des droites perpendiculaires et parallèles',
        'Reconnaître, décrire et construire des figures usuelles',
        'Compléter une figure par symétrie axiale',
        'Reconnaître et décrire des solides, construire un patron de cube',
        'Se repérer et coder un déplacement dans l\'espace',
      ]),
      d('ma.donnees', 'Organisation et gestion de données et probabilités', [
        'Lire et produire des tableaux et des diagrammes',
        'Résoudre des problèmes à partir de données',
        'Reconnaître un événement certain, impossible ou possible',
      ]),
      d('ma.proportionnalite', 'Proportionnalité', [
        'Résoudre des problèmes de proportionnalité',
      ]),
      d('ma.informatique', 'Initiation à la pensée informatique', [
        'Lire, écrire et exécuter un programme simple',
      ]),
    ],
  },
  {
    id: 'eps', nom: 'Éducation physique et sportive', seul: true, domaines: [
      d('eps', 'Éducation physique et sportive', [
        'Produire une performance maximale, mesurable à une échéance donnée (courir, sauter, lancer)',
        'Adapter ses déplacements à des environnements variés (natation, orientation)',
        'S\'exprimer devant les autres par une prestation artistique ou acrobatique',
        'Conduire et maîtriser un affrontement collectif ou interindividuel',
        'Respecter les règles, ses partenaires et ses adversaires, assumer des rôles',
      ]),
    ],
  },
  {
    id: 'lv', nom: 'Langue vivante 1 (anglais)', seul: true, domaines: [
      d('lv', 'Langue vivante 1 (anglais)', [
        'Écouter et comprendre des messages oraux simples, des histoires courtes',
        'Lire et comprendre des textes courts et simples',
        'Parler en continu : se présenter, décrire, raconter simplement',
        'Écrire des mots et des phrases simples à partir de modèles',
        'Réagir et dialoguer : poser des questions et y répondre',
        'Découvrir quelques aspects culturels des pays anglophones',
      ]),
    ],
  },
  {
    id: 'st', nom: 'Sciences et technologie', seul: true, domaines: [
      d('st', 'Sciences et technologie', [
        'Pratiquer une démarche scientifique : observer, questionner, expérimenter',
        'Décrire les états de la matière et ses changements',
        'Identifier des sources et des formes d\'énergie',
        'Connaître le vivant, sa diversité et ses besoins',
        'Expliquer les besoins alimentaires de l\'être humain',
        'Décrire le fonctionnement d\'objets techniques',
        'Situer la Terre dans le système solaire',
        'Identifier des enjeux liés à l\'environnement',
      ]),
    ],
  },
  {
    id: 'hg', nom: 'Histoire et géographie', seul: true, domaines: [
      d('hg', 'Histoire et géographie', [
        'Se repérer dans le temps : construire des repères historiques (frise)',
        'Se repérer dans l\'espace : situer des lieux sur une carte, un globe',
        'Comprendre un document et en extraire des informations',
        'Raisonner et justifier une démarche (enquête)',
        'Pratiquer différents langages (récit, croquis, carte, frise)',
        'Histoire : le Moyen Âge',
        'Géographie : se nourrir',
      ]),
    ],
  },
  {
    id: 'arts', nom: 'Enseignements artistiques', domaines: [
      d('ap', 'Arts plastiques', [
        'Expérimenter, produire, créer des productions plastiques variées',
        'Mettre en œuvre un projet artistique individuel ou collectif',
        'S\'exprimer et analyser sa pratique et celle des autres',
        'Se repérer dans les domaines liés aux arts plastiques, découvrir des œuvres d\'art',
      ]),
      d('em', 'Éducation musicale', [
        'Chanter une mélodie simple avec une intonation juste (chorale)',
        'Écouter, comparer et commenter des œuvres musicales',
        'Explorer et créer avec la voix, le corps et des objets sonores',
      ]),
      d('hda', 'Histoire des arts', [
        'Décrire une œuvre d\'art et donner son avis',
        'Situer une œuvre dans son époque et son contexte',
      ]),
    ],
  },
  {
    id: 'emc', nom: 'Enseignement moral et civique', seul: true, domaines: [
      d('emc', 'Enseignement moral et civique', [
        'Connaître et respecter les règles de vie de la classe et de l\'école',
        'Savoir coopérer',
        'Prendre des responsabilités dans la classe et dans l\'école',
        'Exprimer ses émotions et respecter celles des autres',
        'Argumenter et écouter le point de vue des autres dans un débat',
        'Connaître les valeurs et les symboles de la République',
      ]),
    ],
  },
]

export const TOUS_DOMAINES_LIVRET = BLOCS_LSU.flatMap((b) => b.domaines.map((dm) => ({ ...dm, bloc: b.id })))
export const blocDe = (domaine: string) => BLOCS_LSU.find((b) => b.domaines.some((dm) => dm.id === domaine))
export const domaineLivret = (id: string | null | undefined) => TOUS_DOMAINES_LIVRET.find((dm) => dm.id === id)
