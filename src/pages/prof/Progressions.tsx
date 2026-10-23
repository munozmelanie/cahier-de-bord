import clsx from 'clsx'
import { CalendarPlus, Circle, CircleCheck, CircleDot, Copy, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { Placer, type BaseSeance } from '../../components/progressions/Placer'
import {
  Bascule, Bouton, BoutonIcone, Champ, ChoixMatiere, Chargement, Entete, Feuille, Liste, Onglets, PastilleMatiere,
  Saisie, Vide, useConfirmation, useToast,
} from '../../components/ui'
import { useEcrire, useProgressions } from '../../lib/donnees'
import { aujourdhui, decaler, fmtJourCourt, lundiDe, iso, periodeCourante, semaineDansPeriode } from '../../lib/dates'
import { MATIERES, matiere } from '../../lib/matieres'
import { useClasse } from '../../lib/session'
import type { Periode, Progression } from '../../lib/types'

const STATUTS = {
  prevu: { icone: Circle, label: 'Prévu', couleur: 'text-brume' },
  en_cours: { icone: CircleDot, label: 'En cours', couleur: 'text-ambre' },
  fait: { icone: CircleCheck, label: 'Fait', couleur: 'text-succes' },
} as const
const SUIVANT: Record<Progression['statut'], Progression['statut']> = { prevu: 'en_cours', en_cours: 'fait', fait: 'prevu' }

function nbSemaines(p: Periode | undefined) {
  return p ? semaineDansPeriode(p.fin, p) ?? 7 : 7
}
function lundiSemaine(p: Periode, s: number) {
  return decaler(iso(lundiDe(new Date(p.debut + 'T12:00:00'))), (s - 1) * 7)
}

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

  const [edition, setEdition] = useState<Partial<Progression> | null>(null)
  const [copie, setCopie] = useState(false)
  const [placer, setPlacer] = useState<{ base: BaseSeance; id: string; statut: Progression['statut'] } | null>(null)

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

  const semaines = Array.from({ length: nbSemaines(periode) }, (_, i) => i + 1)

  async function basculer(it: Progression) {
    try { await ecrire.mutateAsync({ op: 'update', table: 'progressions', id: it.id, patch: { statut: SUIVANT[it.statut] } }) }
    catch (e) { toast((e as Error).message, 'erreur') }
  }

  async function ajouterRapide(m: string, titre: string, semaine: number | null) {
    const liste = parMatiere.find(([id]) => id === m)?.[1] ?? []
    await ecrire.mutateAsync({
      op: 'insert', table: 'progressions',
      ligne: { classe_id: classe.id, matiere: m, periode: periodeId, semaine, titre, ordre: liste.length + 1 },
    })
  }

  async function enregistrer(e: FormEvent) {
    e.preventDefault()
    if (!edition?.titre?.trim() || !edition.matiere) return
    const ligne = {
      matiere: edition.matiere, titre: edition.titre.trim(), semaine: edition.semaine ?? null,
      statut: edition.statut ?? 'prevu', periode: periodeId,
    }
    try {
      if (edition.id) await ecrire.mutateAsync({ op: 'update', table: 'progressions', id: edition.id, patch: ligne })
      else await ecrire.mutateAsync({ op: 'insert', table: 'progressions', ligne: { ...ligne, classe_id: classe.id, ordre: 99 } })
      setEdition(null)
    } catch (err) { toast((err as Error).message, 'erreur') }
  }

  return (
    <div>
      <Entete
        titre="Progressions"
        sousTitre={semaineActuelle ? `Semaine ${semaineActuelle} sur ${semaines.length}` : periode ? `${fmtJourCourt(periode.debut)} → ${fmtJourCourt(periode.fin)}` : undefined}
        actions={<>
          <BoutonIcone icone={Copy} label="Copier vers une autre période" variante="secondaire" onClick={() => setCopie(true)} disabled={!q.data?.length} />
          <Bouton icone={Plus} onClick={() => setEdition({ matiere: 'francais', semaine: semaineActuelle ?? 1, statut: 'prevu' })}>Ajouter</Bouton>
        </>}
      />
      <div className="mb-5">
        <Onglets valeur={periodeId} onChange={setPeriodeId} options={periodes.map((p) => ({ id: p.id, label: p.id }))} />
      </div>

      {q.isLoading ? <Chargement /> : !parMatiere.length ? (
        <Vide icone={Plus} texte="Aucune progression pour cette période."
          action={<Bouton icone={Plus} onClick={() => setEdition({ matiere: 'francais', semaine: 1, statut: 'prevu' })}>Ajouter</Bouton>} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {parMatiere.map(([m, items]) => (
            <Section key={m} m={m} items={items} semaines={semaines} semaineActuelle={semaineActuelle} periode={periode}
              onBasculer={basculer}
              onModifier={(it) => setEdition(it)}
              onPlacer={(it) => setPlacer({ base: { titre: it.titre, matiere: it.matiere, progression_id: it.id }, id: it.id, statut: it.statut })}
              onAjouter={(titre, s) => ajouterRapide(m, titre, s)}
            />
          ))}
        </div>
      )}

      <Feuille ouverte={!!edition} onFermer={() => setEdition(null)} titre={edition?.id ? 'Modifier' : 'Ajouter à la progression'}
        pied={<>
          {edition?.id && (
            <BoutonIcone icone={Trash2} label="Supprimer" className="mr-auto text-alerte"
              onClick={() => { const it = edition; demander(`Supprimer « ${it.titre} » ?`, () => { ecrire.mutate({ op: 'delete', table: 'progressions', id: it.id! }); setEdition(null) }) }} />
          )}
          <Bouton type="submit" form="form-prog" enCours={ecrire.isPending}>Enregistrer</Bouton>
        </>}>
        <form id="form-prog" onSubmit={enregistrer} className="flex flex-col gap-4">
          <ChoixMatiere valeur={edition?.matiere ?? null} onChange={(id) => setEdition((e) => ({ ...e, matiere: id }))} />
          <Champ label="Titre">{(id) => <Saisie id={id} required autoFocus value={edition?.titre ?? ''} onChange={(e) => setEdition((x) => ({ ...x, titre: e.target.value }))} />}</Champ>
          <div className="grid grid-cols-2 gap-3">
            <Champ label="Semaine">
              {(id) => (
                <Liste id={id} value={edition?.semaine ?? ''} onChange={(e) => setEdition((x) => ({ ...x, semaine: e.target.value ? Number(e.target.value) : null }))}>
                  <option value="">—</option>
                  {semaines.map((s) => <option key={s} value={s}>Semaine {s}{periode ? ` · ${fmtJourCourt(lundiSemaine(periode, s))}` : ''}</option>)}
                </Liste>
              )}
            </Champ>
            <Champ label="Statut">
              {(id) => (
                <Liste id={id} value={edition?.statut ?? 'prevu'} onChange={(e) => setEdition((x) => ({ ...x, statut: e.target.value as Progression['statut'] }))}>
                  {Object.entries(STATUTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </Liste>
              )}
            </Champ>
          </div>
        </form>
      </Feuille>

      <CopierPeriode ouverte={copie} onFermer={() => setCopie(false)} depuis={periodeId} periodes={periodes} items={q.data ?? []} />

      <Placer base={placer?.base ?? null} onFermer={() => setPlacer(null)} marquerEnCours={placer && placer.statut === 'prevu' ? placer.id : null} />
      {fenetre}
    </div>
  )
}

function Section({ m, items, semaines, semaineActuelle, periode, onBasculer, onModifier, onPlacer, onAjouter }: {
  m: string; items: Progression[]; semaines: number[]; semaineActuelle: number | null; periode?: Periode
  onBasculer: (it: Progression) => void; onModifier: (it: Progression) => void
  onPlacer: (it: Progression) => void; onAjouter: (titre: string, semaine: number | null) => Promise<void>
}) {
  const mat = matiere(m)
  const faits = items.filter((i) => i.statut === 'fait').length
  const [titre, setTitre] = useState('')
  const [semaine, setSemaine] = useState<number | null>(semaineActuelle)
  const [enCours, setEnCours] = useState(false)

  async function ajouter(e: FormEvent) {
    e.preventDefault()
    if (!titre.trim()) return
    setEnCours(true)
    try { await onAjouter(titre.trim(), semaine); setTitre('') } finally { setEnCours(false) }
  }

  return (
    <section className="flex flex-col rounded-3xl bg-white p-4 shadow-doux">
      <div className="mb-3 flex items-center gap-3">
        <PastilleMatiere id={m} />
        <h2 className="min-w-0 flex-1 truncate font-titre text-lg font-semibold">{mat.nom}</h2>
        <span className="text-sm font-bold tabular-nums text-brume">{faits}/{items.length}</span>
      </div>
      <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-encre/5">
        <div className="h-full rounded-full" style={{ width: `${items.length ? (faits / items.length) * 100 : 0}%`, background: mat.couleur }} />
      </div>
      <ul className="flex flex-col">
        {items.map((it) => {
          const S = STATUTS[it.statut]
          const actuelle = it.semaine != null && it.semaine === semaineActuelle
          return (
            <li key={it.id} className={clsx('group flex items-center gap-2 rounded-2xl px-1 py-1', actuelle && 'bg-ambre-clair/70')}>
              <button onClick={() => onBasculer(it)} className={clsx('shrink-0 rounded-full p-1', S.couleur)} aria-label={`${S.label} — changer`} title={S.label}>
                <S.icone className="size-5" strokeWidth={2.4} />
              </button>
              <span
                className={clsx('w-9 shrink-0 rounded-full py-0.5 text-center text-xs font-bold tabular-nums',
                  actuelle ? 'bg-ambre text-white' : 'bg-encre/5 text-brume')}
                title={it.semaine && periode ? `Semaine du ${fmtJourCourt(lundiSemaine(periode, it.semaine))}` : undefined}
              >
                {it.semaine ? `S${it.semaine}` : '—'}
              </span>
              <button onClick={() => onModifier(it)} title="Modifier"
                className={clsx('min-w-0 flex-1 rounded-lg py-0.5 text-left text-sm leading-snug hover:text-bateau', it.statut === 'fait' && 'text-brume line-through decoration-brume/40')}>
                {it.titre}
              </button>
              <BoutonIcone icone={CalendarPlus} label="Placer dans le cahier journal" onClick={() => onPlacer(it)} className="size-8 text-brume" />
            </li>
          )
        })}
      </ul>
      <form onSubmit={ajouter} className="mt-3 flex items-center gap-2 border-t border-trait pt-3">
        <select
          value={semaine ?? ''}
          onChange={(e) => setSemaine(e.target.value ? Number(e.target.value) : null)}
          aria-label="Semaine"
          className="h-9 shrink-0 rounded-full border border-trait bg-papier px-2 text-xs font-bold text-brume"
        >
          <option value="">—</option>
          {semaines.map((s) => <option key={s} value={s}>S{s}</option>)}
        </select>
        <input value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="Ajouter…" aria-label={`Ajouter en ${mat.court}`}
          className="h-9 min-w-0 flex-1 rounded-full border border-trait bg-papier px-3 text-sm focus:border-bateau focus:outline-none" />
        <BoutonIcone icone={Plus} label="Ajouter" type="submit" variante="doux" className="size-9" disabled={enCours || !titre.trim()} />
      </form>
    </section>
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
    <Feuille ouverte={ouverte} onFermer={onFermer} titre={`Copier ${depuis} vers…`}
      pied={<Bouton icone={Copy} onClick={copier} enCours={ecrire.isPending} disabled={!vers}>Copier</Bouton>}>
      <div className="flex flex-col gap-4">
        <Onglets valeur={vers} onChange={setVers} options={autres.map((p) => ({ id: p.id, label: p.id }))} />
        <div className="flex flex-col gap-3">
          {matieres.map((m) => (
            <Bascule key={m} actif={!exclues.includes(m)} label={matiere(m).nom}
              onChange={(v) => setExclues((x) => (v ? x.filter((y) => y !== m) : [...x, m]))} />
          ))}
        </div>
      </div>
    </Feuille>
  )
}
