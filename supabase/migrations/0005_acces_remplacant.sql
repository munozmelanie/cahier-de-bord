-- Accès remplaçant : un lien secret (imprimé en QR code sur le bureau) qui montre
-- le cahier journal en lecture seule, sans compte. Rien sur les élèves, le carnet ou les livrets.

alter table public.classes_secrets add column if not exists jeton_remplacant text unique;

-- Lien actuel (enseignante seulement)
create or replace function public.jeton_remplacant(c uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select s.jeton_remplacant from public.classes_secrets s
  where s.classe_id = c and public.est_enseignant(c)
$$;
revoke all on function public.jeton_remplacant(uuid) from public, anon;
grant execute on function public.jeton_remplacant(uuid) to authenticated;

-- Nouveau lien (l'ancien QR code ne marche plus). actif = false : coupe l'accès.
create or replace function public.nouveau_jeton_remplacant(c uuid, actif boolean default true)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  j text := case when actif then replace(public.nouveau_code(28), '-', '') end;
begin
  if not public.est_enseignant(c) then
    raise exception 'Réservé à l''enseignante';
  end if;
  insert into public.classes_secrets (classe_id, jeton_remplacant) values (c, j)
  on conflict (classe_id) do update set jeton_remplacant = excluded.jeton_remplacant;
  return j;
end;
$$;
revoke all on function public.nouveau_jeton_remplacant(uuid, boolean) from public, anon;
grant execute on function public.nouveau_jeton_remplacant(uuid, boolean) to authenticated;

-- Journée vue par le remplaçant : séances, devoirs donnés ce jour, pauses de l'emploi du temps,
-- mot de l'enseignante. Dates limitées à une semaine en arrière et deux semaines en avant.
create or replace function public.journal_remplacant(p_jeton text, p_date date)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  c public.classes;
  auj date := (now() at time zone 'Europe/Paris')::date;
  per text;
begin
  if p_jeton is null or length(p_jeton) < 20 then
    return jsonb_build_object('erreur', 'lien');
  end if;
  select cl.* into c
  from public.classes cl join public.classes_secrets s on s.classe_id = cl.id
  where s.jeton_remplacant = p_jeton;
  if not found then
    return jsonb_build_object('erreur', 'lien');
  end if;
  if p_date is null or p_date < auj - 7 or p_date > auj + 14 then
    return jsonb_build_object('erreur', 'date', 'min', auj - 7, 'max', auj + 14);
  end if;

  select p->>'id' into per
  from jsonb_array_elements(coalesce(c.reglages->'periodes', '[]'::jsonb)) p
  where (p->>'debut')::date <= p_date and p_date <= (p->>'fin')::date
  limit 1;

  return jsonb_build_object(
    'classe', jsonb_build_object('nom', c.nom, 'ecole', c.ecole, 'enseignant_nom', c.enseignant_nom),
    'reglages', jsonb_build_object(
      'jours', c.reglages->'jours', 'periodes', c.reglages->'periodes',
      'vacances', c.reglages->'vacances', 'feries', c.reglages->'feries'),
    'mot', nullif(trim(c.reglages->>'mot_remplacant'), ''),
    'min', auj - 7,
    'max', auj + 14,
    'seances', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', x.id, 'date', x.date, 'debut', to_char(x.debut, 'HH24:MI'), 'fin', to_char(x.fin, 'HH24:MI'),
        'matiere', x.matiere, 'titre', x.titre, 'objectif', x.objectif, 'deroule', x.deroule,
        'materiel', x.materiel, 'a_faire', x.a_faire, 'statut', x.statut) order by x.debut nulls last)
      from public.seances x where x.classe_id = c.id and x.date = p_date), '[]'::jsonb),
    'devoirs', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', d.id, 'donne_le', d.donne_le, 'pour_le', d.pour_le, 'matiere', d.matiere, 'texte', d.texte, 'type', d.type)
        order by d.pour_le)
      from public.devoirs d where d.classe_id = c.id and d.donne_le = p_date), '[]'::jsonb),
    'pauses', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', e.id, 'jour', e.jour, 'debut', to_char(e.debut, 'HH24:MI'), 'fin', to_char(e.fin, 'HH24:MI'),
        'libelle', e.libelle, 'type', e.type) order by e.debut)
      from public.edt_creneaux e
      where e.classe_id = c.id and e.type = 'pause' and e.periode = per
        and e.jour = extract(isodow from p_date)), '[]'::jsonb)
  );
end;
$$;
revoke all on function public.journal_remplacant(text, date) from public;
grant execute on function public.journal_remplacant(text, date) to anon, authenticated;
