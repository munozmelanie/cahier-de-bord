\set ON_ERROR_STOP 1
-- Accès remplaçant (à lancer après 01_rls_test.sql)
reset role;
update public.classes set reglages = '{"periodes":[{"id":"P2","debut":"2026-11-02","fin":"2026-12-18"}],"mot_remplacant":"Clés dans le tiroir"}'
 where id = '11111111-1111-1111-1111-111111111111';
insert into public.edt_creneaux (classe_id, periode, jour, debut, fin, libelle, type) values
 ('11111111-1111-1111-1111-111111111111','P2',1,'10:15','10:30','Récréation','pause');
insert into public.seances (classe_id, date, debut, fin, matiere, titre)
 select '11111111-1111-1111-1111-111111111111', (now() at time zone 'Europe/Paris')::date, '08:30','09:00','rituels','Rituel du jour';

set role authenticated;
-- Un parent ne peut ni lire ni créer le lien
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000b1',false);
select public.jeton_remplacant('11111111-1111-1111-1111-111111111111') is null as parent_ne_lit_pas;
do $$ begin
  perform public.nouveau_jeton_remplacant('11111111-1111-1111-1111-111111111111');
  raise exception 'le parent a pu créer un lien';
exception when others then
  if sqlerrm like '%parent a pu%' then raise; end if;
end $$;

-- L'enseignante crée le lien
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000a',false);
select length(public.nouveau_jeton_remplacant('11111111-1111-1111-1111-111111111111')) as longueur_jeton;
select public.jeton_remplacant('11111111-1111-1111-1111-111111111111') as jeton \gset

-- Le remplaçant (anonyme) lit la journée
set role anon;
select (public.journal_remplacant(:'jeton', (now() at time zone 'Europe/Paris')::date)->'seances'->0->>'titre') = 'Rituel du jour' as voit_seance_du_jour;
select public.journal_remplacant(:'jeton', '2026-11-02')->>'mot' as mot,
       jsonb_array_length(public.journal_remplacant(:'jeton', '2026-11-02')->'pauses') as nb_pauses_lundi_2_nov;
select public.journal_remplacant('MAUVAISJETONMAUVAISJETON', current_date)->>'erreur' as mauvais_lien;
select public.journal_remplacant(:'jeton', current_date + 60)->>'erreur' as trop_loin;
-- Pas d'accès direct aux tables
select count(*) as seances_visibles_en_direct from public.seances;
do $$ begin
  perform public.jeton_remplacant('11111111-1111-1111-1111-111111111111');
  raise exception 'anon a lu le jeton';
exception when insufficient_privilege then null; end $$;

-- L'enseignante coupe l'accès : l'ancien lien ne marche plus
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000a',false);
select public.nouveau_jeton_remplacant('11111111-1111-1111-1111-111111111111', false) is null as acces_coupe;
set role anon;
select public.journal_remplacant(:'jeton', current_date)->>'erreur' as ancien_lien;
reset role;
