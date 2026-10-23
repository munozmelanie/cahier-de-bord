-- Livret : la famille indique qu'elle en a pris connaissance (visa des parents).
-- La date reste celle du premier clic.
create or replace function public.livret_vu(p_livret uuid)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v timestamptz;
begin
  update public.lsu_bilans b
  set vu_le = coalesce(b.vu_le, now())
  where b.id = p_livret and b.publie and public.est_parent_de(b.eleve_id)
  returning b.vu_le into v;
  if v is null then
    raise exception 'Livret introuvable';
  end if;
  return v;
end;
$$;
revoke all on function public.livret_vu(uuid) from public, anon;
grant execute on function public.livret_vu(uuid) to authenticated;
