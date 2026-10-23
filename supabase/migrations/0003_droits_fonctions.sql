-- Les fonctions d'aide ne servent qu'aux règles d'accès : pas d'appel anonyme.
revoke execute on function public.est_enseignant(uuid) from public, anon;
revoke execute on function public.est_parent_de(uuid) from public, anon;
revoke execute on function public.est_parent_classe(uuid) from public, anon;
revoke execute on function public.classe_de_eleve(uuid) from public, anon;
revoke execute on function public.message_visible(uuid) from public, anon;
grant execute on function public.est_enseignant(uuid) to authenticated;
grant execute on function public.est_parent_de(uuid) to authenticated;
grant execute on function public.est_parent_classe(uuid) to authenticated;
grant execute on function public.classe_de_eleve(uuid) to authenticated;
grant execute on function public.message_visible(uuid) to authenticated;
-- Fonction de déclencheur : jamais appelée directement
revoke execute on function public.messages_auteur() from public, anon, authenticated;
