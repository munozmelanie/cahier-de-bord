import clsx from 'clsx'
import { CalendarPlus, Copy, Plus, Trash2 } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Placer, type BaseSeance } from '../../components/progressions/Placer'
import { RondStatut, STATUTS_PROG, STATUT_SUIVANT } from '../../components/progressions/RondStatut'
import {
  Bouton, BoutonIcone, Champ, ChoixMatiere, Chargement, Entete, Feuille, Onglets, PastilleMatiere,
  Saisie, Vide, useConfirmation, useToast,
} from '../../components/ui'
import { useEcrire, useProgressions } from '../../lib/donnees'
import { aujourdhui, decaler, lundiDe, iso, periodeCourante, semaineDansPeriode } from '../../lib/dates'
import { MATIERES, matiere } from '../../lib/matieres'
import { useClasse } from '../../lib/session'
import type { Periode, Progression } from '../../lib/types'

function nbSemaines(p: Periode | undefined) {
  return p ? semaineDansPeriode(p.fin, p) ?? 7 : 7
}
function lundiSemaine(p: Periode, s: number) {
  return decaler(iso(lundiDe(new Date(p.debut + 'T12:00:00'))), (s - 1) * 7)
}
const dateCourte = (s: string) => format(parseISO(s), 'd MMM', { locale: fr })
/** « Lire l'heure (semaine 3) » → « Lire l'heure » : le numéro est déjà la colonne */
const titreCourt = (t: string) => t.replace(/\s*\(semaine\s*\d+\)\s*$/i, '')

type Edition = Partial<Progression>

export default function Progressions() {
  const classe = useClasse()
  const periodes = classe.reglages.periodes ?? []
  const courante = periodeCourante(aujourdhui(), classe.reglages)
  const [periodeId, setPeriodeId] = useState(courante?.id ?? periodes[0]?.id ?? 'P1')
  const periode = periodes.find((p) => p.id === periodeId)
  const semaineActuelle = periode && aujourdhui() >= periode.debut && aujourdhui() <= periode.fin ? semaineDansPeriode(aujourdhui(), periode) : null
  const q = useProgressions(periodeId)
  const ecrire = useEcrire()
  const toast = useToast()
  const { demander, fenetre } = useConfirmation()

  const [edition, setEdition] = useState<Edition | null>(null)
  const [copie, setCopie] = useState(false)
  const [placer, setPlacer] = useState<{ base: BaseSeance; id: string; statut: Progression['statut'] } | null>(null)
  const [matiereMobile, setMatiereMobile] = useState<string | null>(null)

  const parMatiere = useMemo(() => {
    const g = new Map<string, Progression[]>()
    for (const it of q.data ?? []) {
      if (!g.has(it.matiere)) g.set(it.matiere, [])
      g.get(it.matiere)!.push(it)
    }
    for (const l of g.values()) l.sort((a, b) => (a.semaine ?? 99) - (b.semaine ?? 99) || a.ordre - b.ordre)
    const ordre = MATIERES.map((m) => m.id)
    return [...g.entries()].sort((a, b) => ordre.indexOf(a[0]) - ordre.indexOf(b[0]))
  }, [q.data])

  useEffect(() => {
    if (!parMatiere.length) return
    if (!matiereMobile || !parMatiere.some(([m]) => m === matiereMobile)) setMatiereMobile(parMatiere[0][0])
  }, [parMatiere, matiereMobile])

  const semaines = Array.from({ length: nbSemaines(periode) }, (_, i) => i + 1)
  const avecSansSemaine = (q.data ?? []).some((i) => i.semaine == null)
  const colonnes: (number | null)[] = [...semaines, ...(avecSansSemaine ? [null] : [])]

  async function basculer(it: Progression) {
    try { await ecrire.mutateAsync({ op: 'update', table: 'progressions', id: it.id, patch: { statut: STATUT_SUIVANT[it.statut] } }) }
    catch (e) { toast((e as Error).message, 'erreur') }
  }

  async function enregistrer(e?: FormEvent) {
    e?.preventDefault()
    if (!edition?.titre?.trim() || !edition.matiere) return
    const ligne = {
      matiere: edition.matiere, titre: edition.titre.trim(), semaine: edition.semaine ?? null,
      statut: edition.statut ?? 'prevu', periode: periodeId,
    }
    try {
      if (edition.id) await ecrire.mutateAsync({ op: 'update', table: 'progressions', id: edition.id, patch: ligne })
      else {
        const ordre = (parMatiere.find(([m]) => m === edition.matiere)?.[1].length ?? 0) + 1
        await ecrire.mutateAsync({ op: 'insert', table: 'progressions', ligne: { ...ligne, classe_id: classe.id, ordre } })
      }
      setEdition(null)
    } catch (err) { toast((err as Error).message, 'erreur') }
  }

  const nouveau = (m?: string, s?: number | null) =>
    setEdition({ matiere: m ?? matiereMobile ?? 'francais', semaine: s === undefined ? semaineActuelle ?? 1 : s, statut: 'prevu' })

  const carte = (it: Progression) => {
    const mat = matiere(it.matiere)
    return (
      <div key={it.id} className="flex items-start gap-1.5 rounded-xl p-1.5" style={{ background: mat.fond }}>
        <button type="button" onClick={() => basculer(it)} className="mt-px rounded-full p-0.5" title={`${STATUTS_PROG[it.statut].label} → ${STATUTS_PROG[STATUT_SUIVANT[it.statut]].label}`} aria-label={`Statut : ${STATUTS_PROG[it.statut].label}`}>
          <RondStatut statut={it.statut} couleur={mat.couleur} />
        </button>
        <button type="button" onClick={() => setEdition(it)} title={it.titre}
          className={clsx('min-w-0 flex-1 text-left text-xs font-bold leading-snug text-encre', it.statut === 'fait' && 'opacity-50')}>
          <span className="line-clamp-3">{titreCourt(it.titre)}</span>
        </button>
      </div>
    )
  }

  const cellule = (m: string, items: Progression[], s: number | null) => {
    const l = items.filter((i) => (i.semaine ?? null) === s)
    return (
      <div className={clsx('group flex min-h-[3.25rem] flex-col gap-1.5 border-l border-trait p-1.5', s != null && s === semaineActuelle && 'bg-ambre-clair/60')}>
        {l.map(carte)}
        <button type="button" onClick={() => nouveau(m, s)} aria-label="Ajouter" title="Ajouter"
          className="flex h-6 items-center justify-center rounded-lg text-brume/60 transition hover:bg-encre/5 hover:text-encre sm:opacity-0 sm:group-hover:opacity-100">
          <Plus className="size-4" />
        </button>
      </div>
    )
  }

  const itemsMobile = parMatiere.find(([m]) => m === matiereMobile)?.[1] ?? []

  return (
    <div>
      <Entete
        titre="Progressions"
        actions={<>
          <Onglets valeur={periodeId} onChange={setPeriodeId} options={periodes.map((p) => ({ id: p.id, label: p.id }))} />
          <BoutonIcone icone={Copy} label="Copier vers une autre période" variante="secondaire" onClick={() => setCopie(true)} disabled={!q.data?.length} />
          <BoutonIcone icone={Plus} label="Ajouter" variante="primaire" onClick={() => nouveau()} />
        </>}
      />

      {q.isLoading ? <Chargement /> : !parMatiere.length ? (
        <Vide icone={Plus} texte="Vide" action={<Bouton icone={Plus} onClick={() => nouveau('francais', 1)}>Ajouter</Bouton>} />
      ) : (
        <>
          {/* Ordinateur : tableau matières × semaines */}
          <div className="hidden overflow-x-auto rounded-3xl bg-white p-2 shadow-doux md:block">
            <div className="grid" style={{ gridTemplateColumns: `3.5rem repeat(${colonnes.length}, minmax(8.5rem, 1fr))`, minWidth: `${3.5 + colonnes.length * 8.5}rem` }}>
              <div />
              {colonnes.map((s) => (
                <div key={String(s)} className={clsx('flex flex-col items-center rounded-t-2xl py-2 leading-none', s != null && s === semaineActuelle && 'bg-ambre-clair/60')}>
                  <span className={clsx('rounded-full px-2.5 py-1 font-titre text-base font-semibold', s != null && s === semaineActuelle ? 'bg-ambre text-white' : 'text-encre')}>{s != null ? `S${s}` : '—'}</span>
                  {s != null && periode && <span className="mt-1 text-[11px] font-bold text-brume">{dateCourte(lundiSemaine(periode, s))}</span>}
                </div>
              ))}
              {parMatiere.map(([m, items]) => (
                <div key={m} className="contents">
                  <div className="flex items-start justify-center border-t border-trait pt-2" title={matiere(m).nom}>
                    <PastilleMatiere id={m} />
                  </div>
                  {colonnes.map((s) => <div key={String(s)} className="border-t border-trait">{cellule(m, items, s)}</div>)}
                </div>
              ))}
            </div>
          </div>

          {/* Téléphone : une matière à la fois, ses semaines en cartes */}
          <div className="md:hidden">
            <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1" role="tablist">
              {parMatiere.map(([m, items]) => {
                const mat = matiere(m)
                const I = mat.icone
                const actif = m === matiereMobile
                return (
                  <button key={m} type="button" role="tab" aria-selected={actif} onClick={() => setMatiereMobile(m)} title={mat.nom}
                    className={clsx('relative flex size-12 shrink-0 items-center justify-center rounded-2xl transition', actif ? 'ring-[3px] ring-encre' : '')}
                    style={{ background: mat.fond, color: mat.couleur }}>
                    <I className="size-6" />
                    <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-white px-1 text-center text-[10px] font-bold leading-5 text-encre shadow-sm">
                      {items.filter((i) => i.statut === 'fait').length}/{items.length}
                    </span>
                  </button>
                )
              })}
            </div>
            <div className="flex flex-col gap-2">
              {colonnes.map((s) => {
                const l = itemsMobile.filter((i) => (i.semaine ?? null) === s)
                const actuelle = s != null && s === semaineActuelle
                return (
                  <div key={String(s)} className={clsx('flex gap-2 rounded-3xl p-2', actuelle ? 'bg-ambre-clair' : 'bg-white shadow-doux')}>
                    <span className={clsx('flex w-11 shrink-0 flex-col items-center justify-center rounded-2xl py-1 leading-none', actuelle ? 'bg-ambre text-white' : 'bg-papier text-encre')}>
                      <span className="font-titre text-base font-semibold">{s != null ? `S${s}` : '—'}</span>
                      {s != null && periode && <span className="mt-0.5 text-[10px] font-bold opacity-80">{format(parseISO(lundiSemaine(periode, s)), 'd/MM')}</span>}
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                      {l.map(carte)}
                      {!l.length && <span className="flex-1" />}
                    </div>
                    <BoutonIcone icone={Plus} label="Ajouter" className="size-8 self-center text-brume" onClick={() => nouveau(matiereMobile ?? undefined, s)} />
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      <Feuille ouverte={!!edition} onFermer={() => setEdition(null)} titre={edition?.id ? '' : <Plus className="size-5 text-bateau" />}
        pied={<>
          {edition?.id && (
            <>
              <BoutonIcone icone={Trash2} label="Supprimer" className="text-alerte"
                onClick={() => { const it = edition; demander(`Supprimer « ${it.titre} » ?`, () => { ecrire.mutate({ op: 'delete', table: 'progressions', id: it.id! }); setEdition(null) }) }} />
              <BoutonIcone icone={CalendarPlus} label="Placer dans le cahier journal" variante="secondaire" className="mr-auto"
                onClick={() => { const it = edition as Progression; setEdition(null); setPlacer({ base: { titre: it.titre, matiere: it.matiere, progression_id: it.id }, id: it.id, statut: it.statut }) }} />
            </>
          )}
          <Bouton type="submit" form="form-prog" enCours={ecrire.isPending}>Enregistrer</Bouton>
        </>}>
        <form id="form-prog" onSubmit={enregistrer} className="flex flex-col gap-4">
          <ChoixMatiere valeur={edition?.matiere ?? null} onChange={(id) => setEdition((e) => ({ ...e, matiere: id }))} />
          <Champ label="Titre">{(id) => <Saisie id={id} required autoFocus value={edition?.titre ?? ''} onChange={(e) => setEdition((x) => ({ ...x, titre: e.target.value }))} />}</Champ>
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Semaine">
            {[...semaines, null].map((s) => {
              const actif = (edition?.semaine ?? null) === s
              return (
                <button key={String(s)} type="button" role="radio" aria-checked={actif} onClick={() => setEdition((x) => ({ ...x, semaine: s }))}
                  title={s != null && periode ? `Semaine du ${dateCourte(lundiSemaine(periode, s))}` : 'Sans semaine'}
                  className={clsx('h-9 min-w-11 rounded-full px-3 text-sm font-bold transition', actif ? 'bg-encre text-white' : 'border border-trait bg-white text-encre',
                    s != null && s === semaineActuelle && !actif && 'border-ambre')}>
                  {s != null ? `S${s}` : '—'}
                </button>
              )
            })}
          </div>
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Statut">
            {(Object.keys(STATUTS_PROG) as Progression['statut'][]).map((st) => {
              const actif = (edition?.statut ?? 'prevu') === st
              const c = matiere(edition?.matiere).couleur
              return (
                <button key={st} type="button" role="radio" aria-checked={actif} onClick={() => setEdition((x) => ({ ...x, statut: st }))}
                  className={clsx('inline-flex h-9 items-center gap-2 rounded-full px-3 text-sm font-bold transition', actif ? 'bg-encre text-white' : 'border border-trait bg-white text-encre')}>
                  <RondStatut statut={st} couleur={actif ? '#fff' : c} taille={16} /> {STATUTS_PROG[st].label}
                </button>
              )
            })}
          </div>
        </form>
      </Feuille>

      <CopierPeriode ouverte={copie} onFermer={() => setCopie(false)} depuis={periodeId} periodes={periodes} items={q.data ?? []} />

      <Placer base={placer?.base ?? null} onFermer={() => setPlacer(null)} marquerEnCours={placer && placer.statut === 'prevu' ? placer.id : null} />
      {fenetre}
    </div>
  )
}

function CopierPeriode({ ouverte, onFermer, depuis, periodes, items }: {
  ouverte: boolean; onFermer: () => void; depuis: string; periodes: Periode[]; items: Progression[]
}) {
  const classe = useClasse()
  const ecrire = useEcrire()
  const toast = useToast()
  const autres = periodes.filter((p) => p.id !== depuis)
  const [vers, setVers] = useState(autres[0]?.id ?? '')
  const matieres = [...new Set(items.map((i) => i.matiere))]
  const [exclues, setExclues] = useState<string[]>([])

  async function copier() {
    const lignes = items.filter((i) => !exclues.includes(i.matiere)).map((i) => ({
      classe_id: classe.id, matiere: i.matiere, periode: vers, semaine: i.semaine, titre: i.titre, domaine: i.domaine, statut: 'prevu', ordre: i.ordre,
    }))
    if (!lignes.length) return
    try {
      await ecrire.mutateAsync({ op: 'insert', table: 'progressions', ligne: lignes })
      toast(`${lignes.length} lignes copiées en ${vers}`)
      onFermer()
    } catch (e) { toast((e as Error).message, 'erreur') }
  }

  return (
    <Feuille ouverte={ouverte} onFermer={onFermer} titre={<span className="inline-flex items-center gap-2"><Copy className="size-5 text-bateau" /> {depuis} →</span>}
      pied={<Bouton icone={Copy} onClick={copier} enCours={ecrire.isPending} disabled={!vers}>Copier</Bouton>}>
      <div className="flex flex-col gap-4">
        <Onglets valeur={vers} onChange={setVers} options={autres.map((p) => ({ id: p.id, label: p.id }))} />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {matieres.map((m) => {
            const mat = matiere(m)
            const I = mat.icone
            const actif = !exclues.includes(m)
            return (
              <button key={m} type="button" aria-pressed={actif} onClick={() => setExclues((x) => (actif ? [...x, m] : x.filter((y) => y !== m)))}
                className={clsx('flex items-center gap-2 rounded-2xl p-2 text-left text-sm font-bold transition', actif ? 'ring-2 ring-encre' : 'opacity-40')}
                style={{ background: mat.fond, color: mat.couleur }}>
                <I className="size-5" /> <span className="truncate text-encre">{mat.court}</span>
              </button>
            )
          })}
        </div>
      </div>
    </Feuille>
  )
}

