import clsx from 'clsx'
import {
  Check, ChevronDown, ChevronUp, Copy, KeyRound, Link2, Printer, RefreshCw, UserMinus, UserPlus, Users, UserX,
} from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { fondTeinte, teinte } from '../../components/carnet/fils'
import { CarteInfo } from '../../components/CarteInfo'
import { imprimerCodes } from '../../components/eleves/imprimerCodes'
import {
  Bascule, Bouton, BoutonIcone, Champ, Chargement, Entete, Erreur, Feuille, Saisie, useConfirmation, useToast,
} from '../../components/ui'
import { useEcrire, useEleves, useParents, useRafraichir } from '../../lib/donnees'
import { db, verif } from '../../lib/supabase'
import { useClasse } from '../../lib/session'
import type { Eleve, ParentLien } from '../../lib/types'

async function copier(texte: string, toast: (t: string, type?: 'ok' | 'erreur') => void) {
  try {
    await navigator.clipboard.writeText(texte)
    toast('Copié')
  } catch {
    toast(texte)
  }
}

const nomFamille = (p: ParentLien) => [p.nom_affiche, p.lien ? `(${p.lien})` : null].filter(Boolean).join(' ') || 'Famille'

export default function Eleves() {
  const classe = useClasse()
  const eleves = useEleves()
  const tous = eleves.data ?? []
  const parents = useParents(tous.map((e) => e.id))
  const ecrire = useEcrire()
  const toast = useToast()
  const [prenom, setPrenom] = useState('')
  const [fiche, setFiche] = useState<string | null>(null)
  const [partis, setPartis] = useState(false)
  const [collegue, setCollegue] = useState(false)

  const actifs = useMemo(() => tous.filter((e) => e.actif), [tous])
  const inactifs = useMemo(() => tous.filter((e) => !e.actif), [tous])
  const famillesDe = (id: string) => (parents.data ?? []).filter((p) => p.eleve_id === id)
  const nbRelies = actifs.filter((e) => famillesDe(e.id).length > 0).length

  async function ajouter(ev: FormEvent) {
    ev.preventDefault()
    const p = prenom.trim()
    if (!p) return
    try {
      const ordre = Math.max(0, ...tous.map((e) => e.ordre)) + 1
      await ecrire.mutateAsync({ op: 'insert', table: 'eleves', ligne: { classe_id: classe.id, prenom: p, ordre } })
      setPrenom('')
      toast(`${p} ajouté`)
    } catch (e) { toast((e as Error).message, 'erreur') }
  }

  async function deplacer(i: number, sens: -1 | 1) {
    const j = i + sens
    if (j < 0 || j >= actifs.length) return
    const liste = [...actifs]
    ;[liste[i], liste[j]] = [liste[j], liste[i]]
    const maj = liste.map((e, k) => ({ e, ordre: k + 1 })).filter(({ e, ordre }) => e.ordre !== ordre)
    try {
      await ecrire.mutateAsync(maj.map(({ e, ordre }) => ({ op: 'update' as const, table: 'eleves', id: e.id, patch: { ordre } })))
    } catch (e) { toast((e as Error).message, 'erreur') }
  }

  function imprimer() {
    if (!imprimerCodes(actifs, classe)) toast('Autorise les fenêtres pour ce site, puis réessaie.', 'erreur')
  }

  if (eleves.isLoading) return <Chargement />
  if (eleves.error) return <Erreur message={(eleves.error as Error).message} />

  const eleveFiche = tous.find((e) => e.id === fiche) ?? null
  const indexFiche = eleveFiche ? actifs.findIndex((e) => e.id === eleveFiche.id) : -1

  return (
    <div>
      <Entete
        titre="Élèves"
        actions={<>
          {actifs.length > 0 && <BoutonIcone icone={Printer} label="Imprimer les codes familles" variante="secondaire" onClick={imprimer} />}
          <BoutonIcone icone={KeyRound} label="Ajouter une collègue" variante="secondaire" onClick={() => setCollegue(true)} />
        </>}
      />

      {actifs.length > 0 && (
        <div className="mb-5 grid grid-cols-2 gap-3 sm:max-w-md">
          <CarteInfo icone={Users} couleur="#2E5BFF" fond="#E6ECFF" nombre={actifs.length} titre="Élèves" />
          <CarteInfo icone={Link2} couleur={nbRelies === actifs.length ? '#13A35B' : '#B37400'} fond={nbRelies === actifs.length ? '#E1F6EA' : '#FFF4DC'}
            nombre={<>{nbRelies}<span className="text-lg text-brume">/{actifs.length}</span></>} titre="Familles reliées" />
        </div>
      )}

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {actifs.map((e) => (
          <li key={e.id}><CarteEleve e={e} familles={famillesDe(e.id)} onOuvrir={() => setFiche(e.id)} /></li>
        ))}
        <li>
          <form onSubmit={ajouter} className="flex h-full min-h-[7.5rem] flex-col justify-center gap-2 rounded-[22px] border-2 border-dashed border-trait p-3">
            <Saisie value={prenom} onChange={(e) => setPrenom(e.target.value)} placeholder="Prénom" aria-label="Prénom du nouvel élève" />
            <Bouton type="submit" taille="s" variante="doux" icone={UserPlus} disabled={!prenom.trim()} enCours={ecrire.isPending && !!prenom} aria-label="Ajouter l'élève" />
          </form>
        </li>
      </ul>

      {inactifs.length > 0 && (
        <div className="mt-6">
          <button onClick={() => setPartis(!partis)} aria-expanded={partis} title="Élèves partis"
            className="mb-3 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 font-bold text-brume shadow-sm">
            <UserX className="size-4" /> {inactifs.length} {partis ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </button>
          {partis && (
            <ul className="grid grid-cols-2 gap-3 opacity-60 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {inactifs.map((e) => <li key={e.id}><CarteEleve e={e} familles={famillesDe(e.id)} onOuvrir={() => setFiche(e.id)} /></li>)}
            </ul>
          )}
        </div>
      )}

      <CodeEnseignante ouverte={collegue} onFermer={() => setCollegue(false)} classeId={classe.id} />

      <FicheEleve eleve={eleveFiche} familles={eleveFiche ? famillesDe(eleveFiche.id) : []} onFermer={() => setFiche(null)}
        onCopier={() => eleveFiche && copier(eleveFiche.code_famille, toast)}
        place={indexFiche >= 0 ? { premier: indexFiche === 0, dernier: indexFiche === actifs.length - 1, haut: () => deplacer(indexFiche, -1), bas: () => deplacer(indexFiche, 1) } : null} />
    </div>
  )
}

/** Carte élève : initiale, prénom, familles reliées et code en icônes */
function CarteEleve({ e, familles, onOuvrir }: { e: Eleve; familles: ParentLien[]; onOuvrir: () => void }) {
  const c = teinte(e.id)
  return (
    <button type="button" onClick={onOuvrir} aria-label={`Ouvrir la fiche de ${e.prenom}`}
      className="flex h-full min-h-[7.5rem] w-full flex-col gap-2 rounded-[22px] p-3 text-left transition hover:brightness-[0.98]" style={{ background: fondTeinte(e.id) }}>
      <span className="flex items-center justify-between">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-white font-titre text-xl font-semibold shadow-sm" style={{ color: c }} aria-hidden>
          {e.prenom.slice(0, 1)}
        </span>
        <span className={clsx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold', familles.length ? 'bg-succes text-white' : 'bg-white text-brume')}
          title={familles.length ? familles.map(nomFamille).join(', ') : 'Pas encore de famille'}>
          <Users className="size-3.5" />{familles.length}
        </span>
      </span>
      <span className="truncate font-bold text-encre">{e.prenom}{e.nom ? ` ${e.nom}` : ''}</span>
      <span className="mt-auto inline-flex items-center gap-1 font-titre text-xs font-semibold tracking-wider" style={{ color: c }} title="Code famille">
        <KeyRound className="size-3.5" />{e.code_famille}
      </span>
    </button>
  )
}

function FicheEleve({ eleve, familles, onFermer, onCopier, place }: {
  eleve: Eleve | null; familles: ParentLien[]; onFermer: () => void; onCopier: () => void
  place: { premier: boolean; dernier: boolean; haut: () => void; bas: () => void } | null
}) {
  const ecrire = useEcrire()
  const rafraichir = useRafraichir()
  const toast = useToast()
  const { demander, fenetre } = useConfirmation()
  const [prenom, setPrenom] = useState('')
  const [nom, setNom] = useState('')
  const [actif, setActif] = useState(true)
  const [enCours, setEnCours] = useState(false)

  useEffect(() => {
    if (!eleve) return
    setPrenom(eleve.prenom); setNom(eleve.nom ?? ''); setActif(eleve.actif)
  }, [eleve])

  if (!eleve) return null

  async function enregistrer() {
    if (!eleve || !prenom.trim()) return
    try {
      await ecrire.mutateAsync({ op: 'update', table: 'eleves', id: eleve.id, patch: { prenom: prenom.trim(), nom: nom.trim() || null, actif } })
      toast('Enregistré'); onFermer()
    } catch (e) { toast((e as Error).message, 'erreur') }
  }

  const nouveauCode = () => demander("L'ancien code ne marchera plus. Les familles déjà reliées gardent leur accès.", async () => {
    setEnCours(true)
    try {
      verif(await db.rpc('nouveau_code_famille', { e: eleve.id }))
      rafraichir('eleves'); toast('Nouveau code créé')
    } catch (e) { toast((e as Error).message, 'erreur') } finally { setEnCours(false) }
  })

  const retirer = (p: ParentLien) => demander(`Retirer l'accès de ${nomFamille(p)} ?`, async () => {
    try {
      verif(await db.from('parents').delete().eq('eleve_id', p.eleve_id).eq('user_id', p.user_id))
      rafraichir('parents'); toast('Accès retiré')
    } catch (e) { toast((e as Error).message, 'erreur') }
  })

  return (
    <>
      <Feuille ouverte={!!eleve} onFermer={onFermer} titre={eleve.prenom}
        pied={<>
          <Bouton variante="secondaire" onClick={onFermer}>Annuler</Bouton>
          <Bouton icone={Check} onClick={enregistrer} disabled={!prenom.trim()} enCours={ecrire.isPending}>Enregistrer</Bouton>
        </>}>
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-3">
            <Champ label="Prénom">{(id) => <Saisie id={id} value={prenom} onChange={(e) => setPrenom(e.target.value)} />}</Champ>
            <Champ label="Nom">{(id) => <Saisie id={id} value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Facultatif" />}</Champ>
          </div>

          <section className="flex items-center gap-3 rounded-3xl bg-white p-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-bateau-clair text-bateau" title="Code famille"><KeyRound className="size-6" /></span>
            <span className="flex-1 font-titre text-2xl font-semibold tracking-widest text-bateau">{eleve.code_famille}</span>
            <BoutonIcone icone={Copy} label="Copier le code" onClick={onCopier} />
            <BoutonIcone icone={RefreshCw} label="Nouveau code" onClick={nouveauCode} disabled={enCours} />
          </section>

          <section className="flex flex-col gap-2 rounded-3xl bg-white p-3">
            <div className="flex items-center gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-succes-clair text-succes" title="Familles reliées"><Users className="size-6" /></span>
              <span className="font-titre text-2xl font-semibold text-succes">{familles.length}</span>
            </div>
            {familles.length > 0 && (
              <ul className="flex flex-col gap-1.5">
                {familles.map((p) => (
                  <li key={p.user_id} className="flex items-center gap-2 rounded-2xl bg-succes-clair px-3 py-1.5">
                    <span className="flex-1 font-bold text-encre">{nomFamille(p)}</span>
                    <BoutonIcone icone={UserMinus} label={`Retirer ${nomFamille(p)}`} onClick={() => retirer(p)} className="size-8 text-alerte" />
                  </li>
                ))}
              </ul>
            )}
          </section>

          {place && (
            <div className="flex items-center gap-2" aria-label="Place dans la liste">
              <BoutonIcone icone={ChevronUp} label="Monter dans la liste" variante="secondaire" onClick={place.haut} disabled={place.premier} />
              <BoutonIcone icone={ChevronDown} label="Descendre dans la liste" variante="secondaire" onClick={place.bas} disabled={place.dernier} />
            </div>
          )}

          <Bascule actif={actif} onChange={setActif} label="Dans la classe" />
        </div>
      </Feuille>
      {fenetre}
    </>
  )
}

function CodeEnseignante({ ouverte, onFermer, classeId }: { ouverte: boolean; onFermer: () => void; classeId: string }) {
  const toast = useToast()
  const [code, setCode] = useState<string | null>(null)
  useEffect(() => {
    if (!ouverte || code) return
    db.rpc('code_enseignant', { c: classeId }).then(({ data, error }) => {
      if (error) toast(error.message, 'erreur')
      else setCode(data as string)
    })
  }, [ouverte, code, classeId, toast])

  return (
    <Feuille ouverte={ouverte} onFermer={onFermer} titre="Ajouter une collègue">
      <div className="flex items-center gap-3 rounded-3xl bg-white p-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-ambre-clair text-ambre-fonce"><KeyRound className="size-6" /></span>
        <span className="flex-1 font-titre text-2xl font-semibold tracking-widest text-ambre-fonce">{code ?? '…'}</span>
        {code && <BoutonIcone icone={Copy} label="Copier le code" onClick={() => copier(code, toast)} />}
      </div>
      <p className="mt-3 text-sm text-brume">Elle crée un compte avec ce code.</p>
    </Feuille>
  )
}
