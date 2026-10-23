\set ON_ERROR_STOP 1
-- Visa des parents sur le livret (à lancer après 01_rls_test.sql)
reset role;
insert into public.lsu_bilans (id, classe_id, eleve_id, bilan, publie) values
 ('55555555-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','22222222-0000-0000-0000-00000000000a','VU1', true),
 ('55555555-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','22222222-0000-0000-0000-00000000000b','VU1', true),
 ('55555555-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','22222222-0000-0000-0000-00000000000a','VU2', false)
 on conflict do nothing;
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000b1',false);
select public.livret_vu('55555555-0000-0000-0000-000000000001') is not null as vu_par_sa_famille;
do $$ begin
  perform public.livret_vu('55555555-0000-0000-0000-000000000002');
  raise exception 'a signé le livret d''un autre enfant';
exception when others then if sqlerrm like '%autre enfant%' then raise; end if; end $$;
do $$ begin
  perform public.livret_vu('55555555-0000-0000-0000-000000000003');
  raise exception 'a signé un livret non publié';
exception when others then if sqlerrm like '%non publié%' then raise; end if; end $$;
reset role;
select id, vu_le is not null as vu from public.lsu_bilans where id::text like '55555555%' order by id;
