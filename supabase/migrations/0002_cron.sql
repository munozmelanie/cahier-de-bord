-- Publication automatique du résumé et des devoirs en fin de journée.
-- pg_cron tourne en UTC : on passe toutes les 10 minutes de 13h à 18h59 UTC
-- (15h à 21h l'été, 14h à 20h l'hiver) ; la fonction vérifie elle-même l'heure de Paris.
create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;

select cron.unschedule(jobid) from cron.job where jobname = 'cahier-fin-de-journee';
select cron.schedule('cahier-fin-de-journee', '*/10 13-18 * * 1-5', $$select public.publication_automatique()$$);
