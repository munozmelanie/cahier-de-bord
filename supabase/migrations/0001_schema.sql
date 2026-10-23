-- Cahier de bord — schéma principal
-- Une classe, une ou plusieurs enseignantes, des familles reliées à un élève par un code.

-- ───────────────────────── Utilitaires ─────────────────────────

-- Code aléatoire lisible (sans 0/O, 1/I/L), tiré de gen_random_uuid() (générateur sûr).
create or replace function public.nouveau_code(n int default 8)
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  octets bytea := uuid_send(gen_random_uuid()) || uuid_send(gen_random_uuid());
  brut text := '';
  i int;
begin
  for i in 0 .. n - 1 loop
    brut := brut || substr(alphabet, (get_byte(octets, i) % 31) + 1, 1);
  end loop;
  -- groupes de 4 : ABCD-EFGH
  return regexp_replace(brut, '(.{4})(?!$)', '\1-', 'g');
end;
$$;

-- Code saisi par une famille → forme comparable (majuscules, sans tiret ni espace)
create or replace function public.code_normalise(c text)
returns text
language sql
immutable
set search_path = ''
as $$ select regexp_replace(upper(coalesce(c, '')), '[^A-Z0-9]', '', 'g') $$;

create or replace function public.maj_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ───────────────────────── Classe et membres ─────────────────────────

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  nom text not null default 'CM1',
  ecole text,
  ville text,
  annee text,
  enseignant_nom text,
  reglages jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Jamais exposée par l'API : lue uniquement par les fonctions ci-dessous.
create table public.classes_secrets (
  classe_id uuid primary key references public.classes on delete cascade,
  code_enseignant text not null unique default public.nouveau_code(12)
);

create table public.membres (
  classe_id uuid not null references public.classes on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  nom_affiche text,
  created_at timestamptz not null default now(),
  primary key (classe_id, user_id)
);

create table public.eleves (
  id uuid primary key default gen_random_uuid(),
  classe_id uuid not null references public.classes on delete cascade,
  prenom text not null,
  nom text,
  ordre int not null default 0,
  code_famille text not null unique default public.nouveau_code(8),
  actif boolean not null default true,
  created_at timestamptz not null default now()
);
create index eleves_classe_idx on public.eleves (classe_id);

create table public.parents (
  eleve_id uuid not null references public.eleves on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  nom_affiche text,
  lien text,
  created_at timestamptz not null default now(),
  primary key (eleve_id, user_id)
);
create index parents_user_idx on public.parents (user_id);

create table public.tentatives_code (
  id bigint generated always as identity primary key,
  user_id uuid,
  created_at timestamptz not null default now()
);

-- ───────────────────────── Droits (fonctions d'aide) ─────────────────────────

create or replace function public.est_enseignant(c uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.membres m where m.classe_id = c and m.user_id = auth.uid())
$$;

create or replace function public.est_parent_de(e uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.parents p where p.eleve_id = e and p.user_id = auth.uid())
$$;

create or replace function public.est_parent_classe(c uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.parents p join public.eleves e on e.id = p.eleve_id
    where e.classe_id = c and p.user_id = auth.uid()
  )
$$;

create or replace function public.classe_de_eleve(e uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$ select classe_id from public.eleves where id = e $$;

-- ───────────────────────── Préparation de classe ─────────────────────────

create table public.edt_creneaux (
  id uuid primary key default gen_random_uuid(),
  classe_id uuid not null references public.classes on delete cascade,
  periode text not null,
  jour smallint not null check (jour between 1 and 7),
  debut time not null,
  fin time not null,
  matiere text,
  libelle text,
  type text not null default 'cours' check (type in ('cours', 'pause')),
  created_at timestamptz not null default now()
);
create index edt_classe_idx on public.edt_creneaux (classe_id, periode);

create table public.sequences (
  id uuid primary key default gen_random_uuid(),
  classe_id uuid not null references public.classes on delete cascade,
  matiere text,
  titre text not null default '',
  periode text,
  objectifs text,
  competences text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.sequence_etapes (
  id uuid primary key default gen_random_uuid(),
  classe_id uuid not null references public.classes on delete cascade,
  sequence_id uuid not null references public.sequences on delete cascade,
  numero int not null default 1,
  titre text not null default '',
  objectif text,
  duree int,
  deroule text,
  materiel text,
  differenciation text,
  evaluation text,
  created_at timestamptz not null default now()
);
create index etapes_sequence_idx on public.sequence_etapes (sequence_id);

create table public.progressions (
  id uuid primary key default gen_random_uuid(),
  classe_id uuid not null references public.classes on delete cascade,
  matiere text not null,
  periode text not null,
  semaine int,
  titre text not null,
  domaine text,
  statut text not null default 'prevu' check (statut in ('prevu', 'en_cours', 'fait')),
  ordre int not null default 0,
  created_at timestamptz not null default now()
);
create index progressions_classe_idx on public.progressions (classe_id, matiere, periode);

-- Cahier journal : une ligne par séance
create table public.seances (
  id uuid primary key default gen_random_uuid(),
  classe_id uuid not null references public.classes on delete cascade,
  date date not null,
  debut time,
  fin time,
  matiere text,
  titre text not null default '',
  objectif text,
  deroule text,
  materiel text,
  a_faire jsonb not null default '[]'::jsonb,
  pour_familles text,
  bilan text,
  statut text not null default 'prevue' check (statut in ('prevue', 'faite', 'non_faite')),
  sequence_id uuid references public.sequences on delete set null,
  etape_id uuid references public.sequence_etapes on delete set null,
  progression_id uuid references public.progressions on delete set null,
  ordre int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index seances_classe_date_idx on public.seances (classe_id, date);
create trigger seances_maj before update on public.seances
  for each row execute function public.maj_updated_at();

-- ───────────────────────── Vie de la classe (visible des familles) ─────────────────────────

create table public.devoirs (
  id uuid primary key default gen_random_uuid(),
  classe_id uuid not null references public.classes on delete cascade,
  donne_le date not null,
  pour_le date not null,
  matiere text,
  texte text not null,
  type text not null default 'travail' check (type in ('travail', 'lecon', 'evaluation', 'materiel', 'info')),
  seance_id uuid references public.seances on delete set null,
  publie boolean not null default false,
  publie_le timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index devoirs_classe_pour_idx on public.devoirs (classe_id, pour_le);
create index devoirs_classe_donne_idx on public.devoirs (classe_id, donne_le);
create trigger devoirs_maj before update on public.devoirs
  for each row execute function public.maj_updated_at();

create table public.resumes (
  classe_id uuid not null references public.classes on delete cascade,
  date date not null,
  items jsonb not null default '[]'::jsonb,
  mot text,
  modifie_main boolean not null default false,
  publie boolean not null default false,
  publie_le timestamptz,
  updated_at timestamptz not null default now(),
  primary key (classe_id, date)
);
create trigger resumes_maj before update on public.resumes
  for each row execute function public.maj_updated_at();

-- Garde-fou : la publication automatique ne passe qu'une fois par jour
create table public.publications_auto (
  classe_id uuid not null references public.classes on delete cascade,
  date date not null,
  fait_le timestamptz not null default now(),
  primary key (classe_id, date)
);

create table public.agenda (
  id uuid primary key default gen_random_uuid(),
  classe_id uuid not null references public.classes on delete cascade,
  date date not null,
  fin date,
  heure text,
  titre text not null,
  details text,
  type text not null default 'info' check (type in ('sortie', 'evaluation', 'reunion', 'info', 'fete', 'vacances')),
  visible_familles boolean not null default true,
  created_at timestamptz not null default now()
);
create index agenda_classe_date_idx on public.agenda (classe_id, date);

-- ───────────────────────── Évaluations et LSU ─────────────────────────

create table public.evaluations (
  id uuid primary key default gen_random_uuid(),
  classe_id uuid not null references public.classes on delete cascade,
  date date not null default current_date,
  matiere text,
  titre text not null default '',
  periode text,
  items jsonb not null default '[]'::jsonb,       -- [{id, libelle, domaine}]
  resultats jsonb not null default '{}'::jsonb,   -- {eleve_id: {item_id: 1..4}}
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index evaluations_classe_idx on public.evaluations (classe_id, date);
create trigger evaluations_maj before update on public.evaluations
  for each row execute function public.maj_updated_at();

create table public.lsu_bilans (
  id uuid primary key default gen_random_uuid(),
  classe_id uuid not null references public.classes on delete cascade,
  eleve_id uuid not null references public.eleves on delete cascade,
  bilan text not null,
  positions jsonb not null default '{}'::jsonb,      -- {domaine: 1..4}
  appreciations jsonb not null default '{}'::jsonb,  -- {matiere_lsu: texte}
  appreciation_generale text,
  absences int,
  accompagnement text,
  publie boolean not null default false,
  publie_le timestamptz,
  vu_le timestamptz,
  updated_at timestamptz not null default now(),
  unique (eleve_id, bilan)
);
create trigger lsu_bilans_maj before update on public.lsu_bilans
  for each row execute function public.maj_updated_at();

create table public.lsu_classe (
  classe_id uuid not null references public.classes on delete cascade,
  bilan text not null,
  elements jsonb not null default '{}'::jsonb,  -- {matiere_lsu: éléments du programme travaillés}
  projets text,
  primary key (classe_id, bilan)
);

-- ───────────────────────── Carnet de liaison ─────────────────────────

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  classe_id uuid not null references public.classes on delete cascade,
  eleve_id uuid references public.eleves on delete cascade,      -- null = toute la classe
  racine_id uuid references public.messages on delete cascade,   -- null = nouveau fil
  auteur_id uuid references auth.users on delete set null,
  auteur_role text not null check (auteur_role in ('enseignant', 'parent')),
  auteur_nom text,
  titre text,
  texte text not null,
  a_signer boolean not null default false,
  created_at timestamptz not null default now()
);
create index messages_classe_idx on public.messages (classe_id, created_at desc);
create index messages_racine_idx on public.messages (racine_id);

create table public.lectures (
  message_id uuid not null references public.messages on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  eleve_id uuid references public.eleves on delete cascade,
  lu_le timestamptz not null default now(),
  signe_le timestamptz,
  primary key (message_id, user_id)
);

-- Un message est visible d'un parent s'il s'adresse à toute la classe (début de fil)
-- ou s'il concerne l'un de ses enfants.
create or replace function public.message_visible(m uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.messages x
    where x.id = m
      and (
        public.est_enseignant(x.classe_id)
        or (x.eleve_id is null and x.racine_id is null and public.est_parent_classe(x.classe_id))
        or (x.eleve_id is not null and public.est_parent_de(x.eleve_id))
      )
  )
$$;

-- Nom de l'auteur fixé par la base (impossible à usurper)
create or replace function public.messages_auteur()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  nom text;
begin
  new.auteur_id := auth.uid();
  if public.est_enseignant(new.classe_id) then
    new.auteur_role := 'enseignant';
    select coalesce(c.enseignant_nom, m.nom_affiche, 'L''enseignante') into nom
      from public.classes c left join public.membres m on m.classe_id = c.id and m.user_id = auth.uid()
      where c.id = new.classe_id;
  else
    new.auteur_role := 'parent';
    new.a_signer := false;
    select concat_ws(' ', nullif(p.nom_affiche, ''), case when p.lien is not null and p.lien <> '' then '(' || p.lien || ')' end)
      into nom
      from public.parents p where p.eleve_id = new.eleve_id and p.user_id = auth.uid();
  end if;
  new.auteur_nom := coalesce(nullif(nom, ''), 'Famille');
  return new;
end;
$$;
create trigger messages_auteur_trg before insert on public.messages
  for each row execute function public.messages_auteur();

-- ───────────────────────── Sécurité au niveau des lignes ─────────────────────────

alter table public.classes enable row level security;
alter table public.classes_secrets enable row level security;
alter table public.membres enable row level security;
alter table public.eleves enable row level security;
alter table public.parents enable row level security;
alter table public.tentatives_code enable row level security;
alter table public.edt_creneaux enable row level security;
alter table public.sequences enable row level security;
alter table public.sequence_etapes enable row level security;
alter table public.progressions enable row level security;
alter table public.seances enable row level security;
alter table public.devoirs enable row level security;
alter table public.resumes enable row level security;
alter table public.publications_auto enable row level security;
alter table public.agenda enable row level security;
alter table public.evaluations enable row level security;
alter table public.lsu_bilans enable row level security;
alter table public.lsu_classe enable row level security;
alter table public.messages enable row level security;
alter table public.lectures enable row level security;

-- classes
create policy classes_lecture on public.classes for select to authenticated
  using (public.est_enseignant(id) or public.est_parent_classe(id));
create policy classes_modif on public.classes for update to authenticated
  using (public.est_enseignant(id)) with check (public.est_enseignant(id));

-- membres (enseignantes)
create policy membres_lecture on public.membres for select to authenticated
  using (public.est_enseignant(classe_id));
create policy membres_modif_soi on public.membres for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- élèves
create policy eleves_lecture on public.eleves for select to authenticated
  using (public.est_enseignant(classe_id) or public.est_parent_de(id));
create policy eleves_ajout on public.eleves for insert to authenticated
  with check (public.est_enseignant(classe_id));
create policy eleves_modif on public.eleves for update to authenticated
  using (public.est_enseignant(classe_id)) with check (public.est_enseignant(classe_id));
create policy eleves_suppr on public.eleves for delete to authenticated
  using (public.est_enseignant(classe_id));

-- parents
create policy parents_lecture on public.parents for select to authenticated
  using (user_id = auth.uid() or public.est_enseignant(public.classe_de_eleve(eleve_id)));
create policy parents_modif_soi on public.parents for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy parents_suppr on public.parents for delete to authenticated
  using (public.est_enseignant(public.classe_de_eleve(eleve_id)));

-- Tables réservées à l'enseignante
create policy edt_ens on public.edt_creneaux for all to authenticated
  using (public.est_enseignant(classe_id)) with check (public.est_enseignant(classe_id));
create policy sequences_ens on public.sequences for all to authenticated
  using (public.est_enseignant(classe_id)) with check (public.est_enseignant(classe_id));
create policy etapes_ens on public.sequence_etapes for all to authenticated
  using (public.est_enseignant(classe_id)) with check (public.est_enseignant(classe_id));
create policy progressions_ens on public.progressions for all to authenticated
  using (public.est_enseignant(classe_id)) with check (public.est_enseignant(classe_id));
create policy seances_ens on public.seances for all to authenticated
  using (public.est_enseignant(classe_id)) with check (public.est_enseignant(classe_id));
create policy evaluations_ens on public.evaluations for all to authenticated
  using (public.est_enseignant(classe_id)) with check (public.est_enseignant(classe_id));
create policy publications_ens on public.publications_auto for select to authenticated
  using (public.est_enseignant(classe_id));

-- Devoirs, résumés, agenda : l'enseignante gère, les familles lisent ce qui est publié
create policy devoirs_ens on public.devoirs for all to authenticated
  using (public.est_enseignant(classe_id)) with check (public.est_enseignant(classe_id));
create policy devoirs_familles on public.devoirs for select to authenticated
  using (publie and public.est_parent_classe(classe_id));

create policy resumes_ens on public.resumes for all to authenticated
  using (public.est_enseignant(classe_id)) with check (public.est_enseignant(classe_id));
create policy resumes_familles on public.resumes for select to authenticated
  using (publie and public.est_parent_classe(classe_id));

create policy agenda_ens on public.agenda for all to authenticated
  using (public.est_enseignant(classe_id)) with check (public.est_enseignant(classe_id));
create policy agenda_familles on public.agenda for select to authenticated
  using (visible_familles and public.est_parent_classe(classe_id));

-- LSU
create policy lsu_ens on public.lsu_bilans for all to authenticated
  using (public.est_enseignant(classe_id)) with check (public.est_enseignant(classe_id));
create policy lsu_familles on public.lsu_bilans for select to authenticated
  using (publie and public.est_parent_de(eleve_id));
create policy lsu_classe_ens on public.lsu_classe for all to authenticated
  using (public.est_enseignant(classe_id)) with check (public.est_enseignant(classe_id));
create policy lsu_classe_familles on public.lsu_classe for select to authenticated
  using (public.est_parent_classe(classe_id));

-- Carnet de liaison
create policy messages_lecture on public.messages for select to authenticated
  using (
    public.est_enseignant(classe_id)
    or (eleve_id is null and racine_id is null and public.est_parent_classe(classe_id))
    or (eleve_id is not null and public.est_parent_de(eleve_id))
  );
create policy messages_ens on public.messages for insert to authenticated
  with check (public.est_enseignant(classe_id));
create policy messages_famille on public.messages for insert to authenticated
  with check (
    eleve_id is not null
    and public.est_parent_de(eleve_id)
    and public.classe_de_eleve(eleve_id) = classe_id
    and (racine_id is null or public.message_visible(racine_id))
  );
create policy messages_suppr_ens on public.messages for delete to authenticated
  using (public.est_enseignant(classe_id));
create policy messages_modif_ens on public.messages for update to authenticated
  using (public.est_enseignant(classe_id)) with check (public.est_enseignant(classe_id));

create policy lectures_lecture on public.lectures for select to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from public.messages m where m.id = message_id and public.est_enseignant(m.classe_id))
  );
create policy lectures_ajout on public.lectures for insert to authenticated
  with check (user_id = auth.uid() and public.message_visible(message_id)
              and (eleve_id is null or public.est_parent_de(eleve_id)));
create policy lectures_modif on public.lectures for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ───────────────────────── Fonctions appelables par l'appli ─────────────────────────

-- Relier son compte avec un code (enseignante ou famille)
create or replace function public.rejoindre(code text, nom text default null, lien text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  c text := public.code_normalise(code);
  cl uuid;
  el record;
  essais int;
  nb int;
begin
  if uid is null then
    raise exception 'Connexion requise';
  end if;

  select count(*) into essais from public.tentatives_code
    where user_id = uid and created_at > now() - interval '1 hour';
  if essais >= 10 then
    raise exception 'Trop d''essais. Réessaie dans une heure.';
  end if;

  select s.classe_id into cl from public.classes_secrets s
    where public.code_normalise(s.code_enseignant) = c;
  if cl is not null then
    insert into public.membres (classe_id, user_id, nom_affiche)
      values (cl, uid, nullif(nom, ''))
      on conflict (classe_id, user_id) do update set nom_affiche = coalesce(excluded.nom_affiche, public.membres.nom_affiche);
    return jsonb_build_object('role', 'enseignant', 'classe_id', cl);
  end if;

  select e.id, e.prenom, e.classe_id into el from public.eleves e
    where public.code_normalise(e.code_famille) = c and e.actif;
  if el.id is not null then
    select count(*) into nb from public.parents where eleve_id = el.id and user_id <> uid;
    if nb >= 4 then
      raise exception 'Ce code a déjà servi 4 fois. Demande un nouveau code à l''enseignante.';
    end if;
    insert into public.parents (eleve_id, user_id, nom_affiche, lien)
      values (el.id, uid, nullif(nom, ''), nullif(lien, ''))
      on conflict (eleve_id, user_id) do update
        set nom_affiche = coalesce(excluded.nom_affiche, public.parents.nom_affiche),
            lien = coalesce(excluded.lien, public.parents.lien);
    return jsonb_build_object('role', 'parent', 'eleve_id', el.id, 'prenom', el.prenom, 'classe_id', el.classe_id);
  end if;

  -- Pas d'exception ici : elle annulerait l'enregistrement de l'essai
  insert into public.tentatives_code (user_id) values (uid);
  return jsonb_build_object('erreur', 'Code inconnu. Vérifie les lettres et les chiffres.');
end;
$$;
revoke all on function public.rejoindre(text, text, text) from public, anon;
grant execute on function public.rejoindre(text, text, text) to authenticated;

-- Code d'accès enseignante (pour ajouter une collègue)
create or replace function public.code_enseignant(c uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select s.code_enseignant from public.classes_secrets s
  where s.classe_id = c and public.est_enseignant(c)
$$;
revoke all on function public.code_enseignant(uuid) from public, anon;
grant execute on function public.code_enseignant(uuid) to authenticated;

-- Nouveau code famille (l'ancien ne marche plus ; les comptes déjà reliés restent)
create or replace function public.nouveau_code_famille(e uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  nouveau text := public.nouveau_code(8);
begin
  if not public.est_enseignant(public.classe_de_eleve(e)) then
    raise exception 'Réservé à l''enseignante';
  end if;
  update public.eleves set code_famille = nouveau where id = e;
  return nouveau;
end;
$$;
revoke all on function public.nouveau_code_famille(uuid) from public, anon;
grant execute on function public.nouveau_code_famille(uuid) to authenticated;

-- Résumé de la journée et publication des devoirs.
-- Les séances encore « prévues » sont considérées comme faites ; celles marquées
-- « non faites » sont exclues du résumé et leurs devoirs ne sont pas donnés.
create or replace function public.publier_journee(p_classe uuid, p_date date)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  items_calcules jsonb;
  nb_devoirs int;
  r record;
begin
  if auth.uid() is not null and not public.est_enseignant(p_classe) then
    raise exception 'Réservé à l''enseignante';
  end if;

  update public.seances set statut = 'faite'
    where classe_id = p_classe and date = p_date and statut = 'prevue';

  select coalesce(jsonb_agg(jsonb_build_object(
           'matiere', s.matiere,
           'texte', coalesce(nullif(btrim(s.pour_familles), ''), s.titre)
         ) order by s.debut nulls last, s.ordre), '[]'::jsonb)
    into items_calcules
    from public.seances s
    where s.classe_id = p_classe and s.date = p_date and s.statut = 'faite'
      and coalesce(nullif(btrim(s.pour_familles), ''), nullif(btrim(s.titre), '')) is not null
      and coalesce(s.pour_familles, '') <> '-';

  select * into r from public.resumes where classe_id = p_classe and date = p_date;
  if r is null then
    insert into public.resumes (classe_id, date, items, publie, publie_le)
      values (p_classe, p_date, items_calcules, true, now());
  elsif r.modifie_main then
    update public.resumes set publie = true, publie_le = coalesce(publie_le, now())
      where classe_id = p_classe and date = p_date;
  else
    update public.resumes set items = items_calcules, publie = true, publie_le = coalesce(publie_le, now())
      where classe_id = p_classe and date = p_date;
  end if;

  with pub as (
    update public.devoirs d set publie = true, publie_le = now()
      where d.classe_id = p_classe and d.donne_le = p_date and not d.publie
        and (d.seance_id is null or exists (
          select 1 from public.seances s where s.id = d.seance_id and s.statut <> 'non_faite'))
      returning 1)
  select count(*) into nb_devoirs from pub;

  return jsonb_build_object('items', jsonb_array_length(items_calcules), 'devoirs', nb_devoirs);
end;
$$;
revoke all on function public.publier_journee(uuid, date) from public, anon;
grant execute on function public.publier_journee(uuid, date) to authenticated;

-- Appelée toutes les 10 minutes en fin d'après-midi (voir 0002_cron.sql)
create or replace function public.publication_automatique()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  c record;
  maintenant timestamp := now() at time zone 'Europe/Paris';
  jour date := (now() at time zone 'Europe/Paris')::date;
  heure time;
  n int := 0;
begin
  for c in select id, reglages from public.classes loop
    heure := coalesce(nullif(c.reglages->>'heure_resume', ''), '16:45')::time;
    continue when maintenant::time < heure;
    continue when coalesce((c.reglages->>'resume_auto')::boolean, true) = false;
    continue when exists (select 1 from public.publications_auto p where p.classe_id = c.id and p.date = jour);
    continue when not exists (select 1 from public.seances s where s.classe_id = c.id and s.date = jour);
    perform public.publier_journee(c.id, jour);
    insert into public.publications_auto (classe_id, date) values (c.id, jour);
    n := n + 1;
  end loop;
  return n;
end;
$$;
revoke all on function public.publication_automatique() from public, anon, authenticated;
