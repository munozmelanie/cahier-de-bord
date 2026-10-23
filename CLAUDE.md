# Cahier de bord — notes pour Claude

Appli d'une classe de CM1 : cahier journal, emploi du temps, progressions, séquences,
devoirs, carnet de liaison, évaluations, LSU, espace familles. Tout en français.

- Front : React + Vite + TypeScript + Tailwind + lucide-react, servi par GitHub Pages
  (https://munozmelanie.github.io/cahier-de-bord/), routes en `#/…` (HashRouter).
- Données : Supabase, projet `cahier-de-bord` (ref `zfiinvgniqwwqdbliwwo`, région Paris). Schéma dans
  `supabase/migrations/` ; toute modification passe par une nouvelle migration numérotée.
- Droits : RLS. L'enseignante est dans `membres` ; une famille est dans `parents` (reliée à un élève par
  `eleves.code_famille`, fonction `rejoindre`). Les familles ne voient que ce qui est publié (devoirs, résumés,
  agenda visible, LSU publié de leur enfant, messages de classe + messages de leur enfant).
- Fin de journée : `publication_automatique()` (pg_cron, toutes les 10 min de 13h à 18h59 UTC) appelle
  `publier_journee(classe, date)` après `reglages.heure_resume` (16:45). Les séances « prevue » passent « faite »,
  les « non_faite » sont exclues du résumé et leurs devoirs (devoirs.seance_id) ne sont pas publiés.
- Accès remplaçant : lien secret `#/r/<jeton>` imprimé en QR code depuis le Cahier journal (migration 0005). RPC
  `journal_remplacant(jeton, date)` ouverte à `anon`, lecture seule (séances, devoirs donnés, pauses, mot), dates de J-7 à J+14 ;
  `nouveau_jeton_remplacant(classe, actif)` change ou coupe le lien ; le mot est dans `classes.reglages.mot_remplacant`.
- Mode démo : `?demo` dans l'URL (données fictives en mémoire, `src/lib/demo.ts`). Ne jamais y mettre de vrais élèves.
- Dépôt PUBLIC : aucune donnée réelle (élèves, école, familles) dans le code ni dans les fichiers SQL. Les données de la classe
  ne vivent que dans Supabase.

## Remplir le cahier depuis une session Claude (connecteur Supabase)

Classe : `select id from classes` (une seule). Tables utiles :
- `seances` (date, debut, fin 'HH:MM', matiere, titre, objectif, deroule, materiel, a_faire jsonb
  [{label, lien, type: imprimer|projeter|distribuer|preparer}], pour_familles — une phrase simple pour le résumé,
  ou '-' pour ne pas l'afficher —, statut prevue|faite|non_faite, sequence_id, etape_id, progression_id).
- `devoirs` (donne_le, pour_le, matiere, texte, type travail|lecon|evaluation|materiel|info, seance_id,
  publie false : la publication se fait en fin de journée).
- `edt_creneaux` (periode P1…P5, jour 1=lundi…5, debut, fin, matiere, libelle, type cours|pause).
- `progressions`, `sequences`, `sequence_etapes`, `agenda`, `evaluations`, `lsu_bilans`, `lsu_classe`.
- Livret (présentation du bilan périodique du LSU) : référentiel CM1 dans `src/lib/referentielLsu.ts` (blocs → domaines →
  éléments). `lsu_classe.elements` = { domaine : un élément travaillé par ligne } (domaine absent = tous les éléments
  officiels) ; `lsu_classe.projets` = parcours éducatifs en JSON { citoyen, peac, sante } ; `lsu_bilans.positions` =
  { "domaine|libellé de l'élément" : 1 à 4 } ; `appreciation_generale` ; `vu_le` posé par la famille (`livret_vu`, migration 0006).
- Matières (ids) : francais, lecture, maths, sciences, histoire, geographie, emc, anglais, arts, musique, eps,
  rituels, informatique, vie.

Règles de l'enseignante : pas d'horaires dans les supports élèves ; ne pas surcharger ; devoirs « semaine N → N+1 »
(même jour la semaine suivante) ; annoncer chaque évaluation une semaine avant et la veille ; vocabulaire simple
pour les élèves et les familles.

## Vérifier

```
npm run build                      # types + build
npx vite --port 5180 --strictPort  # puis : node scripts/capture.mjs 5180 /journal enseignant capture.png
```
Tests SQL locaux : `supabase/tests/` (Postgres local + imitation de l'environnement Supabase).
