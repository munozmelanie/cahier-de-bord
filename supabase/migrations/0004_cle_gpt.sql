-- Clé d'accès pour le GPT perso (ChatGPT) : seule l'empreinte est gardée.
create table public.cles_api (
  id uuid primary key default gen_random_uuid(),
  classe_id uuid not null references public.classes on delete cascade,
  empreinte text not null unique,
  cree_le timestamptz not null default now(),
  utilisee_le timestamptz
);
alter table public.cles_api enable row level security;
create policy cles_api_lecture on public.cles_api for select to authenticated
  using (public.est_enseignant(classe_id));
create policy cles_api_suppr on public.cles_api for delete to authenticated
  using (public.est_enseignant(classe_id));

-- Crée une nouvelle clé (les anciennes sont révoquées) et la renvoie une seule fois.
create or replace function public.nouvelle_cle_gpt(c uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  cle text := 'cdb_' || replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
begin
  if not public.est_enseignant(c) then
    raise exception 'Réservé à l''enseignante';
  end if;
  delete from public.cles_api where classe_id = c;
  insert into public.cles_api (classe_id, empreinte) values (c, encode(sha256(convert_to(cle, 'UTF8')), 'hex'));
  return cle;
end;
$$;
revoke all on function public.nouvelle_cle_gpt(uuid) from public, anon;
grant execute on function public.nouvelle_cle_gpt(uuid) to authenticated;
