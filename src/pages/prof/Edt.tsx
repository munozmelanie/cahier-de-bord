import clsx from 'clsx'
import { Copy, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Bascule, Bouton, BoutonIcone, Champ, ChoixMatiere, Chargement, Entete, Feuille, Liste, Onglets, PastilleMatiere, Saisie, useConfirmation, useToast } from '../../components/ui'
import { useEcrire, useEdt } from '../../lib/donnees'
import { aujourdhui, fmtHeure, hhmm, minutes, NOMS_JOURS, periodeCourante } from '../../lib/dates'
import { matiere } from '../../lib/matieres'
import { db, verif } from '../../lib/supabase'
import { useClasse } from '../../lib/session'
import type { Creneau } from '../../lib/types'

const PX = 1.7 // pixels par minute

type Brouillon = Partial<Creneau> & { jour: number }

export default function Edt() {
  const classe = useClasse()
  const periodes = classe.reglages.periodes ?? []
  const [periode, setPeriode] = useState(() => periodeCourante(aujourdhui(), classe.reglages)?.id ?? periodes[0]?.id ?? 'P1')
  const jours = classe.reglages.jours ?? [1, 2, 4, 5]
  const [jourMobile, setJourMobile] = useState(String(jours[0]))
  const edt = useEdt(periode)
  const [edition, setEdition] = useState<Brouillon | null>(null)
  const [copie, setCopie] = useState(false)
  const liste = edt.data ?? []

  const bornes = useMemo(() => {
    if (!liste.length) return { debut: 8 * 60 + 30, fin: 16 * 60 + 30 }
    return { debut: Math.min(...liste.map((c) => minutes(c.debut))), fin: Math.max(...liste.map((c) => minutes(c.fin))) }
  }, [liste])

  const bloc = (c: Creneau) => {
    const m = matiere(c.matiere)
    const pause = c.type === 'pause'
    const hauteur = (minutes(c.fin) - minutes(c.debut)) * PX
    return (
      <button key={c.id} type="button" onClick={() => setEdition(c)} title={`${fmtHeure(c.debut)} – ${fmtHeure(c.fin)} · ${c.libelle || m.court}`}
        className={clsx('absolute inset-x-1 flex overflow-hidden rounded-lg px-2 text-left font-bold transition hover:brightness-105',
          hauteur < 30 ? 'items-center text-[11px] leading-none' : 'flex-col justify-center text-xs')}
        style={{ top: (minutes(c.debut) - bornes.debut) * PX, height: hauteur - 2, background: pause ? '#F1F3F8' : m.fond, color: pause ? '#8A93AB' : m.couleur }}>
        {hauteur >= 30 && <span className="tabular-nums opacity-80">{fmtHeure(c.debut)}</span>}
        {hauteur >= 12 && <span className="truncate">{c.libelle || m.court}</span>}
      </button>
    )
  }

  return (
    <>
      <Entete titre="Emploi du temps" actions={<>
        <Onglets valeur={periode} onChange={setPeriode} options={periodes.map((p) => ({ id: p.id, label: p.id }))} />
        <BoutonIcone icone={Copy} label="Copier depuis une autre période" variante="secondaire" onClick={() => setCopie(true)} />
      </>} />

      {edt.isLoading ? <Chargement /> : (
        <>
          {/* Ordinateur : grille de la semaine */}
          <div className="hidden overflow-x-auto rounded-3xl bg-white p-3 shadow-doux md:block">
            <div className="grid min-w-[640px]" style={{ gridTemplateColumns: `3rem repeat(${jours.length}, minmax(0, 1fr))` }}>
              <div />
              {jours.map((j) => (
                <div key={j} className="flex items-center justify-between px-2 pb-2">
                  <span className="font-titre text-lg font-semibold">{NOMS_JOURS[j]}</span>
                  <BoutonIcone icone={Plus} label={`Ajouter un créneau le ${NOMS_JOURS[j]}`} className="size-8" onClick={() => setEdition({ jour: j, type: 'cours' })} />
                </div>
              ))}
              <div className="relative" style={{ height: (bornes.fin - bornes.debut) * PX }}>
                {Array.from({ length: Math.floor(bornes.fin / 60) - Math.ceil(bornes.debut / 60) + 1 }, (_, i) => Math.ceil(bornes.debut / 60) + i).map((h) => (
                  <span key={h} className="absolute right-2 -translate-y-1/2 text-[11px] font-bold text-brume" style={{ top: (h * 60 - bornes.debut) * PX }}>{h}h</span>
                ))}
              </div>
              {jours.map((j) => (
                <div key={j} className="relative border-l border-trait" style={{ height: (bornes.fin - bornes.debut) * PX }}>
                  {liste.filter((c) => c.jour === j).map(bloc)}
                </div>
              ))}
            </div>
          </div>

          {/* Téléphone : un jour à la fois */}
          <div className="md:hidden">
            <div className="mb-3"><Onglets valeur={jourMobile} onChange={setJourMobile} options={jours.map((j) => ({ id: String(j), label: NOMS_JOURS[j].slice(0, 3) }))} /></div>
            <ul className="flex flex-col gap-1">
              {liste.filter((c) => c.jour === Number(jourMobile)).map((c) => (
                <li key={c.id}>
                  <button type="button" onClick={() => setEdition(c)} className="flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left hover:bg-white">
                    <span className="w-24 shrink-0 text-sm font-bold tabular-nums text-brume">{fmtHeure(c.debut)} – {fmtHeure(c.fin)}</span>
                    <PastilleMatiere id={c.matiere} taille="s" pause={c.type === 'pause'} />
                    <span className={clsx('font-bold', c.type === 'pause' && 'text-brume')}>{c.libelle || matiere(c.matiere).court}</span>
                  </button>
                </li>
              ))}
            </ul>
            <Bouton className="mt-3" variante="doux" icone={Plus} onClick={() => setEdition({ jour: Number(jourMobile), type: 'cours' })}>Créneau</Bouton>
          </div>
        </>
      )}

      {edition && <EditeurCreneau key={edition.id ?? `nouveau-${edition.jour}`} base={edition} periode={periode} jours={jours} onFermer={() => setEdition(null)} />}
      <CopierPeriode ouverte={copie} vers={periode} onFermer={() => setCopie(false)} />
    </>
  )
}

function EditeurCreneau({ base, periode, jours, onFermer }: { base: Brouillon; periode: string; jours: number[]; onFermer: () => void }) {
  const classe = useClasse()
  const ecrire = useEcrire()
  const toast = useToast()
  const [v, setV] = useState<Brouillon>(base!)
  const maj = (p: Partial<Creneau>) => setV({ ...v, ...p })
  const pause = v.type === 'pause'

  async function enregistrer() {
    if (!v.debut || !v.fin) return toast('Indique le début et la fin', 'erreur')
    const ligne = { classe_id: classe.id, periode, jour: v.jour, debut: v.debut, fin: v.fin, matiere: pause ? null : v.matiere ?? null, libelle: v.libelle || null, type: v.type ?? 'cours' }
    if (v.id) await ecrire.mutateAsync({ op: 'update', table: 'edt_creneaux', id: v.id, patch: ligne })
    else await ecrire.mutateAsync({ op: 'insert', table: 'edt_creneaux', ligne })
    toast('Créneau enregistré'); onFermer()
  }
  async function supprimer() {
    if (v.id) await ecrire.mutateAsync({ op: 'delete', table: 'edt_creneaux', id: v.id })
    toast('Créneau supprimé'); onFermer()
  }
  return (
    <Feuille ouverte onFermer={onFermer} titre={v.id ? 'Créneau' : 'Nouveau créneau'}
      pied={<>
        {v.id && <BoutonIcone icone={Trash2} label="Supprimer" onClick={supprimer} className="mr-auto text-alerte" />}
        <Bouton variante="secondaire" onClick={onFermer}>Annuler</Bouton>
        <Bouton onClick={enregistrer} enCours={ecrire.isPending}>Enregistrer</Bouton>
      </>}>
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-3">
          <Champ label="Jour">{(id) => (
            <Liste id={id} value={v.jour} onChange={(e) => maj({ jour: Number(e.target.value) })}>
              {jours.map((j) => <option key={j} value={j}>{NOMS_JOURS[j]}</option>)}
            </Liste>
          )}</Champ>
          <Champ label="Début">{(id) => <Saisie id={id} type="time" value={hhmm(v.debut)} onChange={(e) => maj({ debut: e.target.value })} />}</Champ>
          <Champ label="Fin">{(id) => <Saisie id={id} type="time" value={hhmm(v.fin)} onChange={(e) => maj({ fin: e.target.value })} />}</Champ>
        </div>
        <Bascule actif={pause} onChange={(p) => maj({ type: p ? 'pause' : 'cours' })} label="Pause (récréation, repas)" />
        {!pause && <ChoixMatiere valeur={v.matiere ?? null} onChange={(m) => maj({ matiere: m })} />}
        <Champ label="Nom affiché">{(id) => <Saisie id={id} value={v.libelle ?? ''} onChange={(e) => maj({ libelle: e.target.value })} placeholder={pause ? 'Récréation' : 'Calcul mental'} />}</Champ>
      </div>
    </Feuille>
  )
}

function CopierPeriode({ ouverte, vers, onFermer }: { ouverte: boolean; vers: string; onFermer: () => void }) {
  const classe = useClasse()
  const toast = useToast()
  const ecrire = useEcrire()
  const { demander, fenetre } = useConfirmation()
  const autres = (classe.reglages.periodes ?? []).filter((p) => p.id !== vers)
  const [depuis, setDepuis] = useState(autres[0]?.id ?? '')
  async function copier() {
    const src = verif(await db.from('edt_creneaux').select('*').eq('classe_id', classe.id).eq('periode', depuis)) as Creneau[]
    if (!src.length) return toast(`Rien en ${depuis}`, 'erreur')
    await ecrire.mutateAsync([
      { op: 'deleteWhere', table: 'edt_creneaux', colonne: 'periode', valeur: vers },
      { op: 'insert', table: 'edt_creneaux', ligne: src.map(({ id, ...c }) => ({ ...c, periode: vers })) },
    ])
    toast(`Emploi du temps de ${depuis} copié en ${vers}`); onFermer()
  }
  return (
    <>
      <Feuille ouverte={ouverte} onFermer={onFermer} titre={`Copier vers ${vers}`}
        pied={<><Bouton variante="secondaire" onClick={onFermer}>Annuler</Bouton><Bouton onClick={() => demander(`L'emploi du temps de ${vers} sera remplacé.`, copier)}>Copier</Bouton></>}>
        <Champ label="Depuis">{(id) => (
          <Liste id={id} value={depuis} onChange={(e) => setDepuis(e.target.value)}>
            {autres.map((p) => <option key={p.id}>{p.id}</option>)}
          </Liste>
        )}</Champ>
      </Feuille>
      {fenetre}
    </>
  )
}
