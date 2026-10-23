\set ON_ERROR_STOP 1
-- Données de base (rôle propriétaire = service)
insert into auth.users values
 ('00000000-0000-0000-0000-00000000000a','prof@x.fr'),
 ('00000000-0000-0000-0000-0000000000b1','p1@x.fr'),
 ('00000000-0000-0000-0000-0000000000b2','p2@x.fr'),
 ('00000000-0000-0000-0000-0000000000c1','inconnu@x.fr');
insert into public.classes (id, nom, enseignant_nom) values ('11111111-1111-1111-1111-111111111111','CM1','Mme Martin');
insert into public.classes_secrets (classe_id, code_enseignant) values ('11111111-1111-1111-1111-111111111111','PROF-CODE-0001');
insert into public.eleves (id, classe_id, prenom, code_famille) values
 ('22222222-0000-0000-0000-00000000000a','11111111-1111-1111-1111-111111111111','Alice','AAAA-AAAA'),
 ('22222222-0000-0000-0000-00000000000b','11111111-1111-1111-1111-111111111111','Bruno','BBBB-BBBB');
select public.nouveau_code() as exemple_code;

set role authenticated;
-- Enseignante
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000a',false);
select public.rejoindre('prof code 0001','Enseignante') as prof_rejoint;
insert into public.seances (id, classe_id, date, debut, matiere, titre, pour_familles) values
 ('33333333-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','2026-11-02','09:10','maths','ALG 1','On a découvert les expressions avec des lettres.'),
 ('33333333-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','2026-11-02','10:40','francais','GRAM 4', null),
 ('33333333-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','2026-11-02','15:30','anglais','My family', 'Anglais : la famille.');
update public.seances set statut='non_faite' where id='33333333-0000-0000-0000-000000000003';
insert into public.devoirs (classe_id, donne_le, pour_le, matiere, texte, seance_id) values
 ('11111111-1111-1111-1111-111111111111','2026-11-02','2026-11-09','maths','Leçon ALG 1','33333333-0000-0000-0000-000000000001'),
 ('11111111-1111-1111-1111-111111111111','2026-11-02','2026-11-09','anglais','Apprendre le vocabulaire','33333333-0000-0000-0000-000000000003'),
 ('11111111-1111-1111-1111-111111111111','2026-11-02','2026-11-03','francais','Faire signer le cahier',null);
insert into public.messages (id, classe_id, titre, texte, a_signer) values
 ('44444444-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','Sortie','Sortie au musée le 12.', true);
insert into public.messages (id, classe_id, eleve_id, texte) values
 ('44444444-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','22222222-0000-0000-0000-00000000000b','Mot pour la famille de Bruno');
insert into public.lsu_bilans (classe_id, eleve_id, bilan, positions, publie) values
 ('11111111-1111-1111-1111-111111111111','22222222-0000-0000-0000-00000000000a','T1','{"fr.lecture":3}',true),
 ('11111111-1111-1111-1111-111111111111','22222222-0000-0000-0000-00000000000b','T1','{"fr.lecture":2}',true);
select auteur_role, auteur_nom from public.messages order by created_at;

-- Parent 1 (Alice)
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000b1',false);
select public.rejoindre('aaaa aaaa','Sophie','Maman') as p1_rejoint;
select 'P1 élèves visibles' t, string_agg(prenom, ',') from public.eleves;
select 'P1 séances visibles (0 attendu)' t, count(*) from public.seances;
select 'P1 devoirs avant publication (0 attendu)' t, count(*) from public.devoirs;
select 'P1 messages visibles (1 attendu)' t, count(*) from public.messages;
insert into public.messages (classe_id, eleve_id, racine_id, texte) values
 ('11111111-1111-1111-1111-111111111111','22222222-0000-0000-0000-00000000000a','44444444-0000-0000-0000-000000000001','Bien reçu, signé.');
insert into public.lectures (message_id, user_id, eleve_id, signe_le) values
 ('44444444-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000b1','22222222-0000-0000-0000-00000000000a', now());
select 'P1 LSU visibles (1 attendu)' t, count(*) from public.lsu_bilans;
do $$ begin
  begin
    insert into public.messages (classe_id, eleve_id, texte) values
      ('11111111-1111-1111-1111-111111111111','22222222-0000-0000-0000-00000000000b','usurpation');
    raise exception 'ECHEC: P1 a pu écrire pour Bruno';
  exception when insufficient_privilege then raise notice 'OK: P1 ne peut pas écrire pour Bruno';
  end;
  begin
    perform public.publier_journee('11111111-1111-1111-1111-111111111111','2026-11-02');
    raise exception 'ECHEC: P1 a publié';
  exception when raise_exception then
    if sqlerrm like 'ECHEC%' then raise; end if;
    raise notice 'OK: P1 ne peut pas publier (%)', sqlerrm;
  end;
end $$;

-- Enseignante publie la journée
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000a',false);
select public.publier_journee('11111111-1111-1111-1111-111111111111','2026-11-02') as publication;
select items from public.resumes;
select 'Signatures vues par la prof' t, count(*) from public.lectures where signe_le is not null;
select auteur_role, auteur_nom, texte from public.messages where racine_id is not null;

-- Parent 1 après publication
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000b1',false);
select 'P1 devoirs publiés (2 attendus, pas l''anglais)' t, string_agg(texte, ' | ') from public.devoirs;
select 'P1 résumé' t, count(*) from public.resumes;

-- Parent 2 (Bruno)
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000b2',false);
select public.rejoindre('BBBB-BBBB', 'Karim', 'Papa');
select 'P2 messages (2 attendus : classe + mot Bruno ; pas la réponse de P1)' t, count(*) from public.messages;
select 'P2 lectures visibles (0)' t, count(*) from public.lectures;
select 'P2 LSU' t, positions from public.lsu_bilans;

-- Inconnu
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000c1',false);
select 'Inconnu classes (0)' t, count(*) from public.classes;
select 'Inconnu devoirs (0)' t, count(*) from public.devoirs;
select 'Inconnu secrets (0)' t, count(*) from public.classes_secrets;
do $$ declare i int; begin
  for i in 1..11 loop
    begin
      if i >= 10 then raise notice 'essai % : %', i, public.rejoindre('ZZZZ-ZZZZ'); else perform public.rejoindre('ZZZZ-ZZZZ'); end if;
    exception when others then raise notice 'essai % bloqué : %', i, sqlerrm; end;
  end loop;
end $$;
reset role;
select public.publication_automatique() as auto;
