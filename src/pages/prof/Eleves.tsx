import clsx from 'clsx'
import {
  Check, ChevronDown, ChevronUp, Copy, KeyRound, Pencil, Printer, RefreshCw, UserMinus, UserPlus, Users,
} from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { teinte } from '../../components/carnet/fils'
import { imprimerCodes } from '../../components/eleves/imprimerCodes'
import {
  Badge, Bascule, Bouton, BoutonIcone, Champ, Chargement, Entete, Erreur, Feuille, Saisie, useConfirmation, useToast, Vide,
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

  return (
    <div>
      <Entete
        titre="Élèves et familles"
        sousTitre={actifs.length ? <span className="flex flex-wrap gap-2"><Badge>{actifs.length} élèves</Badge><Badge couleur={nbRelies === actifs.length ? 'succes' : 'ambre'}>{nbRelies} / {actifs.length} familles reliées</Badge></span> : undefined}
        actions={actifs.length > 0 && <Bouton variante="secondaire" icone={Printer} onClick={imprimer}>Imprimer les codes</Bouton>}
      />

      <form onSubmit={ajouter} className="mb-4 flex gap-2">
        <Saisie value={prenom} onChange={(e) => setPrenom(e.target.value)} placeholder="Prénom du nouvel élève" aria-label="Prénom du nouvel élève" className="flex-1" />
        <Bouton type="submit" icone={UserPlus} disabled={!prenom.trim()} enCours={ecrire.isPending && !!prenom}>Ajouter</Bouton>
      </form>

      {actifs.length === 0 ? (
        <Vide icone={Users} texte="Ajoute ton premier élève." />
      ) : (
        <ul className="flex flex-col gap-2">
          {actifs.map((e, i) => (
            <LigneEleve key={e.id} e={e} familles={famillesDe(e.id)} premier={i === 0} dernier={i === actifs.length - 1}
              onHaut={() => deplacer(i, -1)} onBas={() => deplacer(i, 1)} onOuvrir={() => setFiche(e.id)}
              onCopier={() => copier(e.code_famille, toast)} />
          ))}
        </ul>
      )}

      {inactifs.length > 0 && (
        <div className="mt-6">
          <button onClick={() => setPartis(!partis)} className="mb-2 flex items-center gap-2 font-bold text-brume">
            {partis ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />} Élèves partis ({inactifs.length})
          </button>
          {partis && (
            <ul className="flex flex-col gap-2">
              {inactifs.map((e) => (
                <li key={e.id} className="flex items-center gap-3 rounded-3xl bg-white/60 p-3">
                  <span className="flex-1 font-bold text-brume">{e.prenom}</span>
                  <Bouton taille="s" variante="secondaire" onClick={() => setFiche(e.id)} icone={Pencil}>Ouvrir</Bouton>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <CodeEnseignante classeId={classe.id} />

      <FicheEleve eleve={eleveFiche} familles={eleveFiche ? famillesDe(eleveFiche.id) : []} onFermer={() => setFiche(null)} />
    </div>
  )
}

function LigneEleve({ e, familles, premier, dernier, onHaut, onBas, onOuvrir, onCopier }: {
  e: Eleve; familles: ParentLien[]; premier: boolean; dernier: boolean
  onHaut: () => void; onBas: () => void; onOuvrir: () => void; onCopier: () => void
}) {
  return (
    <li className="flex items-center gap-2 rounded-3xl bg-white p-2.5 shadow-doux sm:gap-3 sm:p-3">
      <div className="flex flex-col">
        <button onClick={onHaut} disabled={premier} aria-label={`Monter ${e.prenom}`} className="rounded-md text-brume hover:text-encre disabled:opacity-20"><ChevronUp className="size-4" /></button>
        <button onClick={onBas} disabled={dernier} aria-label={`Descendre ${e.prenom}`} className="rounded-md text-brume hover:text-encre disabled:opacity-20"><ChevronDown className="size-4" /></button>
      </div>
      <button onClick={onOuvrir} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-label={`Ouvrir la fiche de ${e.prenom}`}>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl font-titre text-lg font-semibold text-white" style={{ background: teinte(e.id) }} aria-hidden>
          {e.prenom.slice(0, 1)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-bold text-encre">{e.prenom}{e.nom ? ` ${e.nom}` : ''}</span>
          <span className="block truncate text-sm">
            {familles.length
              ? <span className="text-succes">{familles.map(nomFamille).join(', ')}</span>
              : <span className="text-brume">Pas encore de famille</span>}
          </span>
        </span>
      </button>
      <button onClick={onCopier} title="Copier le code" className="flex shrink-0 items-center gap-1.5 rounded-full bg-bateau-clair px-2.5 py-1.5 font-titre text-sm font-semibold tracking-wider text-bateau-fonce hover:bg-bateau/15 sm:px-3 sm:text-base">
        {e.code_famille}<Copy className="size-3.5" />
      </button>
      <BoutonIcone icone={Pencil} label={`Modifier ${e.prenom}`} onClick={onOuvrir} className="hidden sm:inline-flex" />
    </li>
  )
}

function FicheEleve({ eleve, familles, onFermer }: { eleve: Eleve | null; familles: ParentLien[]; onFermer: () => void }) {
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

          <section className="flex flex-col gap-2 rounded-3xl bg-white p-4">
            <p className="text-sm font-bold text-brume">Code famille</p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-titre text-2xl font-semibold tracking-widest text-bateau">{eleve.code_famille}</span>
              <Bouton taille="s" variante="secondaire" icone={RefreshCw} onClick={nouveauCode} enCours={enCours} className="ml-auto">Nouveau code</Bouton>
            </div>
          </section>

          <section className="flex flex-col gap-2 rounded-3xl bg-white p-4">
            <p className="text-sm font-bold text-brume">Familles reliées</p>
            {familles.length === 0 ? <p className="text-brume">Aucune pour le moment.</p> : (
              <ul className="flex flex-col gap-1">
                {familles.map((p) => (
                  <li key={p.user_id} className="flex items-center gap-2">
                    <span className="flex-1 font-bold text-encre">{nomFamille(p)}</span>
                    <BoutonIcone icone={UserMinus} label={`Retirer ${nomFamille(p)}`} onClick={() => retirer(p)} className="text-alerte" />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <Bascule actif={actif} onChange={setActif} label={actif ? 'Dans la classe' : 'Parti de la classe'} />
        </div>
      </Feuille>
      {fenetre}
    </>
  )
}

function CodeEnseignante({ classeId }: { classeId: string }) {
  const toast = useToast()
  const [code, setCode] = useState<string | null>(null)
  const [voir, setVoir] = useState(false)
  useEffect(() => {
    if (!voir || code) return
    db.rpc('code_enseignant', { c: classeId }).then(({ data, error }) => {
      if (error) toast(error.message, 'erreur')
      else setCode(data as string)
    })
  }, [voir, code, classeId, toast])

  return (
    <section className="mt-8 flex flex-wrap items-center gap-3 rounded-3xl border-2 border-dashed border-trait p-4">
      <span className="flex size-10 items-center justify-center rounded-2xl bg-ambre-clair text-ambre-fonce"><KeyRound className="size-5" /></span>
      <div className="min-w-0 flex-1">
        <p className="font-bold text-encre">Ajouter une collègue</p>
        <p className="text-sm text-brume">Elle crée un compte avec ce code.</p>
      </div>
      {voir && code ? (
        <button onClick={() => copier(code, toast)} className={clsx('flex items-center gap-2 rounded-full bg-ambre-clair px-3 py-1.5 font-titre font-semibold tracking-wider text-ambre-fonce')}>
          {code}<Copy className="size-3.5" />
        </button>
      ) : (
        <Bouton taille="s" variante="secondaire" onClick={() => setVoir(true)}>Afficher le code</Bouton>
      )}
    </section>
  )
}
