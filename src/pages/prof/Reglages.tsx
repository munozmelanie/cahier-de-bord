import clsx from 'clsx'
import { CalendarCheck, CalendarRange, Check, Clock, Copy, Flag, GraduationCap, KeyRound, Plus, RotateCcw, Save, School, Send, Sun, Trash2, type LucideIcon } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { bilansDepuisPeriodes } from '../../components/reglages/bilans'
import { Bascule, Bouton, BoutonIcone, Champ, Entete, Onglets, Saisie, useToast } from '../../components/ui'
import { useEcrire } from '../../lib/donnees'
import { db } from '../../lib/supabase'
import { useClasse, useSession } from '../../lib/session'
import type { BilanLsu, Classe, Periode, Reglages as R, Vacances } from '../../lib/types'

const JOURS = [
  { v: 1, l: 'Lun' }, { v: 2, l: 'Mar' }, { v: 3, l: 'Mer' }, { v: 4, l: 'Jeu' }, { v: 5, l: 'Ven' }, { v: 6, l: 'Sam' },
]
type Rythme = 'trimestre' | 'semestre' | 'periode'

/** Carte de réglage : bulle d'icône colorée + un mot */
function Bloc({ titre, icone: Icone, couleur, fond, children, actions, className }: {
  titre: string; icone: LucideIcon; couleur: string; fond: string; children: ReactNode; actions?: ReactNode; className?: string
}) {
  return (
    <section className={clsx('rounded-3xl bg-white p-4 shadow-doux sm:p-5', className)} aria-label={titre}>
      <div className="mb-4 flex items-center gap-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg" style={{ background: fond, color: couleur }}><Icone className="size-4" /></span>
        <h2 className="text-[15px] font-semibold text-encre">{titre}</h2>
        <span className="ml-auto">{actions}</span>
      </div>
      {children}
    </section>
  )
}

function Ajouter({ onClick, label, icone = Plus }: { onClick: () => void; label: string; icone?: LucideIcon }) {
  return <BoutonIcone icone={icone} label={label} variante="doux" onClick={onClick} className="size-9" />
}

const champDate = 'h-10 w-full min-w-0 rounded-xl border border-trait bg-papier px-1.5 text-[13px] focus:border-bateau focus:outline-none sm:px-2 sm:text-sm'

export default function Reglages() {
  const classe = useClasse()
  const { rafraichir } = useSession()
  const ecrire = useEcrire()
  const toast = useToast()
  const [c, setC] = useState<Classe>(classe)
  const [r, setR] = useState<R>(classe.reglages ?? {})
  const [code, setCode] = useState<string | null>(null)
  const [copie, setCopie] = useState(false)

  useEffect(() => { setC(classe); setR(classe.reglages ?? {}) }, [classe])

  const maj = (patch: Partial<R>) => setR((x) => ({ ...x, ...patch }))
  const jours = r.jours ?? [1, 2, 4, 5]
  const periodes = r.periodes ?? []
  const vacances = r.vacances ?? []
  const feries = r.feries ?? []
  const rythme: Rythme = r.lsu?.rythme ?? 'trimestre'
  const bilans = r.lsu?.bilans ?? []

  const setPeriode = (i: number, p: Partial<Periode>) => maj({ periodes: periodes.map((x, k) => (k === i ? { ...x, ...p } : x)) })
  const setVac = (i: number, v: Partial<Vacances>) => maj({ vacances: vacances.map((x, k) => (k === i ? { ...x, ...v } : x)) })
  const setBilan = (i: number, b: Partial<BilanLsu>) => maj({ lsu: { rythme, bilans: bilans.map((x, k) => (k === i ? { ...x, ...b } : x)) } })

  async function enregistrer() {
    const reglages: R = {
      ...r,
      jours: [...jours].sort(),
      periodes: [...periodes].sort((a, b) => a.debut.localeCompare(b.debut)),
      vacances: [...vacances].filter((v) => v.debut && v.fin).sort((a, b) => a.debut.localeCompare(b.debut)),
      feries: [...new Set(feries.filter(Boolean))].sort(),
      heure_resume: r.heure_resume || '16:45',
      resume_auto: r.resume_auto ?? true,
    }
    try {
      await ecrire.mutateAsync({
        op: 'update', table: 'classes', id: classe.id,
        patch: { nom: c.nom, ecole: c.ecole, ville: c.ville, annee: c.annee, enseignant_nom: c.enseignant_nom, reglages },
      })
      await rafraichir()
      toast('Réglages enregistrés')
    } catch (e) { toast((e as Error).message, 'erreur') }
  }

  async function voirCode() {
    const res = await db.rpc('code_enseignant', { c: classe.id })
    if (res.error) toast(res.error.message, 'erreur')
    else setCode(res.data as string)
  }

  return (
    <div className="max-w-5xl">
      <Entete titre="Réglages" actions={<Bouton icone={Save} onClick={enregistrer} enCours={ecrire.isPending}>Enregistrer</Bouton>} />

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Bloc titre="Classe" icone={School} couleur="#3358E0" fond="#ECF0FF">
          <div className="grid gap-3 sm:grid-cols-2">
            <Champ label="Classe">{(id) => <Saisie id={id} value={c.nom ?? ''} onChange={(e) => setC({ ...c, nom: e.target.value })} />}</Champ>
            <Champ label="Nom pour les familles">{(id) => <Saisie id={id} value={c.enseignant_nom ?? ''} onChange={(e) => setC({ ...c, enseignant_nom: e.target.value })} />}</Champ>
            <Champ label="École">{(id) => <Saisie id={id} value={c.ecole ?? ''} onChange={(e) => setC({ ...c, ecole: e.target.value })} />}</Champ>
            <Champ label="Ville">{(id) => <Saisie id={id} value={c.ville ?? ''} onChange={(e) => setC({ ...c, ville: e.target.value })} />}</Champ>
            <Champ label="Année">{(id) => <Saisie id={id} value={c.annee ?? ''} onChange={(e) => setC({ ...c, annee: e.target.value })} placeholder="2026-2027" />}</Champ>
          </div>
        </Bloc>

        <Bloc titre="Jours" icone={CalendarCheck} couleur="#13A35B" fond="#E1F6EA">
          <div className="flex flex-wrap gap-2">
            {JOURS.map((j) => {
              const actif = jours.includes(j.v)
              return (
                <button key={j.v} type="button" aria-pressed={actif}
                  onClick={() => maj({ jours: actif ? jours.filter((x) => x !== j.v) : [...jours, j.v] })}
                  className={clsx('h-11 w-14 rounded-2xl font-semibold transition', actif ? 'bg-bateau text-white' : 'bg-encre/5 text-brume')}>
                  {j.l}
                </button>
              )
            })}
          </div>
        </Bloc>

        <Bloc titre="Résumé du soir" icone={Send} couleur="#7B4DFF" fond="#EEE8FF">
          <div className="flex flex-wrap items-center gap-4">
            <Bascule actif={r.resume_auto ?? true} onChange={(v) => maj({ resume_auto: v })} label="Automatique" />
            <label htmlFor="heure-resume" className="ml-auto flex items-center gap-2">
              <Clock className="size-4 text-brume" aria-hidden />
              <input id="heure-resume" type="time" value={r.heure_resume ?? '16:45'} onChange={(e) => maj({ heure_resume: e.target.value })} aria-label="Heure"
                className="h-11 rounded-xl border border-trait bg-papier px-3 font-semibold tabular-nums focus:border-bateau focus:outline-none" />
            </label>
          </div>
        </Bloc>

        <Bloc titre="Périodes" icone={CalendarRange} couleur="#0A8FD6" fond="#E0F3FD" actions={<Ajouter label="Ajouter une période" onClick={() => maj({ periodes: [...periodes, { id: `P${periodes.length + 1}`, debut: '', fin: '' }] })} />}>
          <ul className="flex flex-col gap-2">
            {periodes.map((p, i) => (
              <li key={i} className="grid grid-cols-[2.75rem_minmax(0,1fr)_minmax(0,1fr)_2.25rem] items-center gap-1.5 sm:grid-cols-[3.5rem_minmax(0,1fr)_minmax(0,1fr)_2.5rem] sm:gap-2">
                <input value={p.id} onChange={(e) => setPeriode(i, { id: e.target.value })} aria-label="Nom de la période"
                  className="h-10 w-full rounded-xl bg-bateau-clair text-center font-semibold text-bateau-fonce focus:outline-none" />
                <input type="date" value={p.debut} onChange={(e) => setPeriode(i, { debut: e.target.value })} aria-label="Début" className={champDate} />
                <input type="date" value={p.fin} onChange={(e) => setPeriode(i, { fin: e.target.value })} aria-label="Fin" className={champDate} />
                <BoutonIcone icone={Trash2} label="Supprimer" onClick={() => maj({ periodes: periodes.filter((_, k) => k !== i) })} className="size-9" />
              </li>
            ))}
          </ul>
        </Bloc>

        <Bloc titre="Vacances" icone={Sun} couleur="#B37400" fond="#FFF4DC" actions={<Ajouter label="Ajouter des vacances" onClick={() => maj({ vacances: [...vacances, { nom: '', debut: '', fin: '' }] })} />}>
          <ul className="flex flex-col gap-2">
            {vacances.map((v, i) => (
              <li key={i} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_2.5rem] gap-2 border-b border-trait pb-2 last:border-0 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_2.5rem] sm:border-0 sm:pb-0">
                <input value={v.nom} onChange={(e) => setVac(i, { nom: e.target.value })} placeholder="Nom" aria-label="Nom des vacances"
                  className="col-span-2 h-10 min-w-0 rounded-xl border border-trait bg-papier px-3 font-semibold focus:border-bateau focus:outline-none sm:col-span-1" />
                <BoutonIcone icone={Trash2} label="Supprimer" onClick={() => maj({ vacances: vacances.filter((_, k) => k !== i) })} className="size-9 sm:order-last" />
                <input type="date" value={v.debut} onChange={(e) => setVac(i, { debut: e.target.value })} aria-label="Début" className={champDate} />
                <input type="date" value={v.fin} onChange={(e) => setVac(i, { fin: e.target.value })} aria-label="Fin" className={champDate} />
              </li>
            ))}
          </ul>
        </Bloc>

        <Bloc titre="Fériés" icone={Flag} couleur="#E5484D" fond="#FDE7E8" actions={<Ajouter label="Ajouter un jour férié" onClick={() => maj({ feries: [...feries, ''] })} />}>
          <ul className="flex flex-wrap gap-2">
            {feries.map((f, i) => (
              <li key={i} className="flex items-center gap-1 rounded-2xl bg-papier pl-1">
                <input type="date" value={f} onChange={(e) => maj({ feries: feries.map((x, k) => (k === i ? e.target.value : x)) })} aria-label="Jour férié"
                  className="h-10 rounded-xl bg-transparent px-2 text-sm focus:outline-none" />
                <BoutonIcone icone={Trash2} label="Supprimer" onClick={() => maj({ feries: feries.filter((_, k) => k !== i) })} className="size-9" />
              </li>
            ))}
          </ul>
        </Bloc>

        <Bloc titre="Livret" icone={GraduationCap} couleur="#F2711C" fond="#FFEEDF"
          actions={<BoutonIcone icone={RotateCcw} label="Recalculer depuis les périodes" variante="doux" className="size-9"
            onClick={() => maj({ lsu: { rythme, bilans: bilansDepuisPeriodes(periodes, rythme) } })} />}>
          <div className="mb-3">
            <Onglets<Rythme> valeur={rythme}
              onChange={(v) => maj({ lsu: { rythme: v, bilans: bilansDepuisPeriodes(periodes, v) } })}
              options={[{ id: 'trimestre', label: 'Trimestres' }, { id: 'semestre', label: 'Semestres' }, { id: 'periode', label: 'Périodes' }]} />
          </div>
          <ul className="flex flex-col gap-2">
            {bilans.map((b, i) => (
              <li key={i} className="grid grid-cols-2 items-center gap-2 sm:grid-cols-3">
                <input value={b.nom} onChange={(e) => setBilan(i, { nom: e.target.value })} aria-label="Nom du bilan"
                  className="col-span-2 h-10 min-w-0 rounded-xl border border-trait bg-papier px-3 text-sm font-semibold focus:border-bateau focus:outline-none sm:col-span-1" />
                <input type="date" value={b.debut} onChange={(e) => setBilan(i, { debut: e.target.value })} aria-label="Début" className={champDate} />
                <input type="date" value={b.fin} onChange={(e) => setBilan(i, { fin: e.target.value })} aria-label="Fin" className={champDate} />
              </li>
            ))}
          </ul>
        </Bloc>

        <Bloc titre="Code collègue" icone={KeyRound} couleur="#4F5D7A" fond="#E9ECF3">
          {code ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-xl bg-papier px-4 py-2 text-lg font-bold tracking-wider text-encre">{code}</span>
              <BoutonIcone icone={copie ? Check : Copy} label="Copier" variante="secondaire"
                onClick={() => navigator.clipboard?.writeText(code).then(() => { setCopie(true); toast('Code copié') }).catch(() => toast('Sélectionne le code pour le copier', 'erreur'))} />
            </div>
          ) : (
            <Bouton variante="secondaire" icone={KeyRound} onClick={voirCode}>Afficher</Bouton>
          )}
        </Bloc>
      </div>

      <div className="mt-6 flex justify-end lg:hidden">
        <Bouton icone={Save} taille="l" onClick={enregistrer} enCours={ecrire.isPending}>Enregistrer</Bouton>
      </div>
    </div>
  )
}
