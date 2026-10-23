# Cahier de bord

L'appli de la classe de CM1 : cahier journal, emploi du temps, progressions, séquences, devoirs, carnet de liaison,
évaluations et livret scolaire, avec un espace pour les familles.

- **Adresse** : https://munozmelanie.github.io/cahier-de-bord/
- **Essayer sans compte** : https://munozmelanie.github.io/cahier-de-bord/?demo (données fictives)

## Comptes

- **Enseignante** : « Créer un compte », puis le code enseignant (donné à part, jamais publié).
- **Familles** : « Créer un compte », puis le code famille de leur enfant (page « Élèves et familles » →
  « Imprimer les codes »). Jusqu'à 4 comptes par enfant.

## Fin de journée

À 16h45 (réglable), le résumé de la journée et les devoirs du jour sont mis en ligne automatiquement pour les
familles, à partir du cahier journal tel qu'il est à ce moment-là. Une séance marquée « pas faite » n'apparaît pas
et ses devoirs ne sont pas donnés.

## ChatGPT et Claude

Bouton « ChatGPT » dans le cahier journal, les séquences et le livret : l'appli prépare une demande, on la colle
dans ChatGPT (ou Claude), puis on recolle la réponse.

## Technique

React + Vite + Tailwind + Lucide, données et comptes sur Supabase (Paris), publié par GitHub Actions.
Voir `CLAUDE.md` et `supabase/migrations/`.
