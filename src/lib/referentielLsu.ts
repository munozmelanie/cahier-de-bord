// Référentiel du livret scolaire (cycle 3) : sous-domaines de positionnement du LSU et éléments du programme
// proposés dans le bilan périodique. Libellés repris de la nomenclature du LSU (programmes du cycle 3).
// L'enseignante peut ajouter ses propres éléments (lsu_classe.elements).

export type ElementProgramme = { id: string; libelle: string }
export type SousDomaine = { id: string; nom: string; positionne: boolean; elements: ElementProgramme[] }
export type MatiereReferentiel = { matiere: string; nom: string; sousDomaines: SousDomaine[] }

const e = (prefixe: string, libelles: string[]): ElementProgramme[] =>
  libelles.map((libelle, i) => ({ id: `${prefixe}.${i + 1}`, libelle }))

export const REFERENTIEL_LSU: MatiereReferentiel[] = [
  {
    matiere: 'fr', nom: 'Français', sousDomaines: [
      { id: 'fr.oral', nom: 'Langage oral', positionne: true, elements: e('fr.oral', [
        'Écouter pour comprendre un message oral, un propos, un discours, un texte lu',
        'Parler en prenant en compte son auditoire',
        'Participer à des échanges dans des situations diversifiées',
        'Adopter une attitude critique par rapport au langage produit',
      ]) },
      { id: 'fr.lecture', nom: 'Lecture et compréhension de l\'écrit', positionne: true, elements: e('fr.lecture', [
        'Lire avec fluidité',
        'Comprendre un texte littéraire et l\'interpréter',
        'Comprendre des textes, des documents et des images et les interpréter',
        'Contrôler sa compréhension, être un lecteur autonome',
      ]) },
      { id: 'fr.ecriture', nom: 'Écriture', positionne: true, elements: e('fr.ecriture', [
        'Écrire à la main de manière fluide et efficace',
        'Écrire avec un clavier rapidement et efficacement',
        'Recourir à l\'écriture pour réfléchir et pour apprendre',
        'Produire des écrits variés',
        'Réécrire à partir de nouvelles consignes ou faire évoluer son texte',
        'Prendre en compte les normes de l\'écrit pour formuler, transcrire et réviser',
      ]) },
      { id: 'fr.langue', nom: 'Étude de la langue (grammaire, orthographe, lexique)', positionne: true, elements: e('fr.langue', [
        'Maîtriser les relations entre l\'oral et l\'écrit',
        'Acquérir la structure, le sens et l\'orthographe des mots',
        'Maîtriser la forme des mots en lien avec la syntaxe',
        'Observer le fonctionnement du verbe et l\'orthographier',
        'Identifier les constituants d\'une phrase simple en relation avec son sens ; distinguer phrase simple et phrase complexe',
      ]) },
    ],
  },
  {
    matiere: 'ma', nom: 'Mathématiques', sousDomaines: [
      { id: 'ma.nombres', nom: 'Nombres et calcul', positionne: true, elements: e('ma.nombres', [
        'Utiliser et représenter les grands nombres entiers, des fractions simples, les nombres décimaux',
        'Calculer avec des nombres entiers et des nombres décimaux',
        'Résoudre des problèmes en utilisant des fractions simples, les nombres décimaux et le calcul',
      ]) },
      { id: 'ma.grandeurs', nom: 'Grandeurs et mesures', positionne: true, elements: e('ma.grandeurs', [
        'Comparer, estimer, mesurer des grandeurs géométriques avec des nombres entiers et des nombres décimaux : longueur (périmètre), aire, volume, angle',
        'Utiliser le lexique, les unités, les instruments de mesures spécifiques de ces grandeurs',
        'Résoudre des problèmes impliquant des grandeurs (géométriques, physiques, économiques) en utilisant des nombres entiers et des nombres décimaux',
      ]) },
      { id: 'ma.espace', nom: 'Espace et géométrie', positionne: true, elements: e('ma.espace', [
        '(Se) repérer et (se) déplacer dans l\'espace en utilisant ou en élaborant des représentations',
        'Reconnaître, nommer, décrire, reproduire, représenter, construire des figures et solides usuels',
        'Reconnaître et utiliser quelques relations géométriques (alignement, appartenance, perpendicularité, parallélisme, égalité de longueurs, égalité d\'angle, distance entre deux points, symétrie, agrandissement et réduction)',
      ]) },
      { id: 'ma.competences', nom: 'Compétences mathématiques', positionne: false, elements: e('ma.competences', [
        'Chercher', 'Modéliser', 'Représenter', 'Raisonner', 'Calculer', 'Communiquer',
      ]) },
    ],
  },
  {
    matiere: 'lv', nom: 'Langues vivantes (anglais)', sousDomaines: [
      { id: 'lv.ecouter', nom: 'Écouter et comprendre', positionne: true, elements: e('lv.ecouter', [
        'Écouter et comprendre des messages oraux simples relevant de la vie quotidienne, des histoires simples',
        'Utiliser des indices sonores et visuels pour déduire le sens de mots inconnus, d\'un message',
        'Mémoriser des mots, des expressions courantes',
      ]) },
      { id: 'lv.lire', nom: 'Lire et comprendre', positionne: true, elements: e('lv.lire', [
        'Reconnaître des mots isolés dans un énoncé, un court texte',
        'S\'appuyer sur des mots outils, des structures simples, des expressions rituelles',
        'Utiliser le contexte, les illustrations et les connaissances pour comprendre un texte',
        'Percevoir la relation entre certains graphèmes et phonèmes spécifiques à la langue',
      ]) },
      { id: 'lv.parler', nom: 'Parler en continu', positionne: true, elements: e('lv.parler', [
        'Mémoriser et reproduire des énoncés',
        'S\'exprimer de manière audible, en modulant débit et voix',
        'Prendre la parole pour raconter, décrire, expliquer',
      ]) },
      { id: 'lv.ecrire', nom: 'Écrire', positionne: true, elements: e('lv.ecrire', [
        'Écrire des mots et des expressions dont l\'orthographe et la syntaxe ont été mémorisées',
        'Écrire des phrases en s\'appuyant sur un modèle connu',
      ]) },
      { id: 'lv.dialoguer', nom: 'Réagir et dialoguer', positionne: true, elements: e('lv.dialoguer', [
        'Poser des questions simples',
        'Mobiliser des énoncés adéquats au contexte dans une succession d\'échanges ritualisés',
        'Utiliser des procédés très simples pour commencer, poursuivre et terminer une conversation brève',
        'Participer à des échanges simples pour être entendu et compris dans quelques situations de la vie quotidienne',
      ]) },
      { id: 'lv.culture', nom: 'Découvrir les aspects culturels de la langue', positionne: true, elements: e('lv.culture', [
        'Identifier quelques grands repères culturels de l\'environnement quotidien des élèves du même âge dans les pays ou régions étudiés',
        'Mobiliser ses connaissances culturelles pour décrire un personnage, un lieu ou pour raconter un fait, un événement',
      ]) },
    ],
  },
  {
    matiere: 'ap', nom: 'Arts plastiques', sousDomaines: [
      { id: 'ap', nom: 'Arts plastiques', positionne: true, elements: e('ap', [
        'Expérimenter, produire, créer des productions plastiques de natures diverses',
        'Mettre en œuvre un projet artistique individuel ou collectif',
        'S\'exprimer, analyser sa pratique, celle de ses pairs ; établir une relation avec celle des artistes, s\'ouvrir à l\'altérité',
        'Se repérer dans les domaines liés aux arts plastiques, connaître et comparer quelques œuvres d\'art',
      ]) },
    ],
  },
  {
    matiere: 'em', nom: 'Éducation musicale', sousDomaines: [
      { id: 'em', nom: 'Éducation musicale', positionne: true, elements: e('em', [
        'Chanter et interpréter une mélodie simple avec une intonation juste et avec expressivité',
        'Écouter, comparer et commenter des éléments sonores d\'origines diverses',
        'Explorer, imaginer et créer des représentations diverses de musiques',
        'Échanger, partager et argumenter ses choix et ses préférences',
      ]) },
    ],
  },
  {
    matiere: 'hda', nom: 'Histoire des arts', sousDomaines: [
      { id: 'hda', nom: 'Histoire des arts', positionne: true, elements: e('hda', [
        'Donner un avis argumenté sur ce que représente ou exprime une œuvre d\'art',
        'Dégager d\'une œuvre d\'art, par l\'observation ou l\'écoute, ses principales caractéristiques techniques et formelles',
        'Relier des caractéristiques d\'une œuvre d\'art à des usages ainsi qu\'au contexte historique et culturel de sa création',
        'Se repérer dans un musée, dans un lieu d\'art, un site patrimonial',
      ]) },
    ],
  },
  {
    matiere: 'eps', nom: 'Éducation physique et sportive', sousDomaines: [
      { id: 'eps', nom: 'Éducation physique et sportive', positionne: true, elements: e('eps', [
        'Produire une performance optimale, mesurable à une échéance donnée (activités athlétiques)',
        'Savoir nager (attestation scolaire du savoir nager)',
        'Adapter ses déplacements à des environnements variés (orientation, escalade, activités nautiques, activités de roule)',
        'S\'exprimer devant les autres par une prestation artistique et/ou acrobatique (danse, activités gymniques, arts du cirque)',
        'Conduire et maîtriser un affrontement collectif ou interindividuel (jeux traditionnels, jeux collectifs avec ballon, jeux de combat, jeux de raquettes)',
        'Développer sa motricité et apprendre à s\'exprimer en utilisant son corps',
        'S\'approprier par la pratique physique et sportive des méthodes et des outils',
        'Partager des règles, assumer des rôles et des responsabilités',
        'Apprendre à entretenir sa santé par une activité physique régulière',
        'S\'approprier une culture physique sportive et artistique',
      ]) },
    ],
  },
  {
    matiere: 'emc', nom: 'Enseignement moral et civique', sousDomaines: [
      { id: 'emc', nom: 'Enseignement moral et civique', positionne: true, elements: e('emc', [
        'Exprimer en les régulant ses émotions et ses sentiments',
        'Respecter autrui et accepter les différences',
        'Connaître les droits et les devoirs de l\'élève et du citoyen',
        'Connaître les principes et les valeurs de la République française',
        'Être responsable face aux usages du numérique et d\'internet',
        'Prendre des responsabilités dans la classe et dans l\'école',
        'Nuancer son point de vue en tenant compte du point de vue des autres',
        'Argumenter et justifier son point de vue dans un débat ou une discussion',
        'S\'engager dans la réalisation d\'un projet collectif (classe, école, commune…)',
      ]) },
    ],
  },
  {
    matiere: 'hg', nom: 'Histoire et géographie', sousDomaines: [
      { id: 'hg', nom: 'Histoire et géographie', positionne: true, elements: e('hg', [
        'Se repérer dans le temps : construire des repères historiques',
        'Se repérer dans l\'espace : construire des repères géographiques',
        'Raisonner, justifier une démarche et les choix effectués',
        'S\'informer dans le monde du numérique',
        'Comprendre un document',
        'Pratiquer différents langages en histoire et en géographie',
        'Coopérer et mutualiser',
      ]) },
      { id: 'hg.themes', nom: 'Thèmes étudiés', positionne: false, elements: e('hg.themes', [
        'Histoire : le Moyen Âge', 'Histoire : la monarchie', 'Histoire : les grandes explorations', 'Histoire : la Révolution française',
        'Géographie : se nourrir', 'Géographie : les inégalités', 'Géographie : se déplacer', 'Géographie : communiquer avec internet',
      ]) },
    ],
  },
  {
    matiere: 'st', nom: 'Sciences et technologie', sousDomaines: [
      { id: 'st', nom: 'Sciences et technologie', positionne: true, elements: e('st', [
        'Pratiquer des démarches scientifiques et technologiques',
        'Concevoir, créer, réaliser',
        'S\'approprier des outils et des méthodes',
        'Pratiquer des langages',
        'Mobiliser des outils numériques',
        'Adopter un comportement éthique et responsable',
        'Se situer dans l\'espace et dans le temps',
      ]) },
      { id: 'st.themes', nom: 'Thèmes étudiés', positionne: false, elements: e('st.themes', [
        'Matière, mouvement, énergie, information',
        'Le vivant, sa diversité et les fonctions qui le caractérisent',
        'Matériaux et objets techniques',
        'La planète Terre. Les êtres vivants dans leur environnement',
      ]) },
    ],
  },
]

export const TOUS_ELEMENTS = REFERENTIEL_LSU.flatMap((m) => m.sousDomaines.flatMap((sd) => sd.elements.map((el) => ({ ...el, matiere: m.matiere, sousDomaine: sd.id }))))
