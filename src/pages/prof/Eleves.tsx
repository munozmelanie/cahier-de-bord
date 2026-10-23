import clsx from 'clsx'
import {
  Check, ChevronDown, ChevronUp, Copy, KeyRound, Printer, RefreshCw, UserMinus, UserPlus, Users, UserX,
} from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { imprimerCodes } from '../../components/eleves/imprimerCodes'
import { lienFamille, qrSvg } from '../../lib/qr'
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

  const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? 's' : ''}`
  const sousTitre = actifs.length
    ? `${pluriel(actifs.length, 'élève')}, ${nbRelies} famille${nbRelies > 1 ? 's' : ''} reliée${nbRelies > 1 ? 's' : ''}`
    : undefined

  return (
    <div>
      <Entete
        titre="Élèves"
        sousTitre={sousTitre}
        actions={<>
          {actifs.length > 0 && <BoutonIcone icone={Printer} label="Imprimer les codes familles" variante="secondaire" onClick={imprimer} />}
          <BoutonIcone icone={KeyRound} label="Ajouter une collègue" variante="secondaire" onClick={() => setCollegue(true)} />
        </>}
      />

      <div className="overflow-hidden rounded-3xl bg-white shadow-doux">
        <ul className="divide-y divide-trait">
          {actifs.map((e) => (
            <li key={e.id}><LigneEleve e={e} familles={famillesDe(e.id)} onOuvrir={() => setFiche(e.id)} /></li>
          ))}
        </ul>
        <form onSubmit={ajouter} className={clsx('flex items-center gap-2 px-4 py-3', actifs.length > 0 && 'border-t border-trait')}>
          <Saisie value={prenom} onChange={(e) => setPrenom(e.target.value)} placeholder="Prénom du nouvel élève" aria-label="Prénom du nouvel élève"
            className="border-transparent bg-papier py-2 focus:bg-white" />
          <Bouton type="submit" variante="doux" icone={UserPlus} disabled={!prenom.trim()} enCours={ecrire.isPending && !!prenom}>Ajouter</Bouton>
        </form>
      </div>

      {inactifs.length > 0 && (
        <div className="mt-6">
          <button onClick={() => setPartis(!partis)} aria-expanded={partis}
            className="mb-3 inline-flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm font-semibold text-brume hover:text-encre">
            <UserX className="size-4" /> {pluriel(inactifs.length, 'élève')} parti{inactifs.length > 1 ? 's' : ''}
            {partis ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </button>
          {partis && (
            <ul className="divide-y divide-trait overflow-hidden rounded-3xl bg-white opacity-70 shadow-doux">
              {inactifs.map((e) => <li key={e.id}><LigneEleve e={e} familles={famillesDe(e.id)} onOuvrir={() => setFiche(e.id)} /></li>)}
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

/** Ligne élève : initiale, nom, code famille, familles reliées */
function LigneEleve({ e, familles, onOuvrir }: { e: Eleve; familles: ParentLien[]; onOuvrir: () => void }) {
  return (
    <button type="button" onClick={onOuvrir} aria-label={`Ouvrir la fiche de ${e.prenom}`}
      className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-papier">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-encre/[.06] text-sm font-semibold text-brume" aria-hidden>
        {e.prenom.slice(0, 1)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-encre">{e.prenom}{e.nom ? ` ${e.nom}` : ''}</span>
        <span className="flex items-center gap-1 text-xs text-brume sm:hidden" title="Code famille"><KeyRound className="size-3" />{e.code_famille}</span>
      </span>
      <span className="hidden w-36 shrink-0 items-center gap-1.5 text-sm tabular-nums text-brume sm:flex" title="Code famille">
        <KeyRound className="size-3.5" />{e.code_famille}
      </span>
      <span className={clsx('w-24 shrink-0 text-right text-sm', familles.length ? 'text-succes' : 'text-brume/60')}
        title={familles.length ? familles.map(nomFamille).join(', ') : 'Pas encore de famille'}>
        {familles.length ? `${familles.length} famille${familles.length > 1 ? 's' : ''}` : '—'}
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

          <section className="flex items-center gap-4 rounded-2xl bg-papier p-3">
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="flex items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-bateau-clair text-bateau" title="Code famille"><KeyRound className="size-[18px]" /></span>
                <span className="flex-1 text-xl font-bold tracking-wider text-encre">{eleve.code_famille}</span>
                <BoutonIcone icone={Copy} label="Copier le code" onClick={onCopier} />
                <BoutonIcone icone={RefreshCw} label="Nouveau code" onClick={nouveauCode} disabled={enCours} />
              </div>
              <p className="text-xs text-brume">La famille scanne le QR code avec son téléphone : le code est déjà rempli.</p>
            </div>
            <div className="size-24 shrink-0 overflow-hidden rounded-lg bg-white p-1 [&_svg]:size-full" aria-label="QR code de la famille"
              dangerouslySetInnerHTML={{ __html: qrSvg(lienFamille(eleve.code_famille)) }} />
          </section>

          <section className="flex flex-col gap-2 rounded-2xl bg-papier p-3">
            <div className="flex items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-succes-clair text-succes" title="Familles reliées"><Users className="size-[18px]" /></span>
              <span className="font-semibold text-encre">{familles.length ? `${familles.length} famille${familles.length > 1 ? 's' : ''} reliée${familles.length > 1 ? 's' : ''}` : 'Pas encore de famille'}</span>
            </div>
            {familles.length > 0 && (
              <ul className="flex flex-col gap-1.5">
                {familles.map((p) => (
                  <li key={p.user_id} className="flex items-center gap-2 rounded-xl bg-white px-3 py-1.5">
                    <span className="flex-1 font-semibold text-encre">{nomFamille(p)}</span>
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
      <div className="flex items-center gap-3 rounded-2xl bg-papier p-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-ambre-clair text-ambre-fonce"><KeyRound className="size-[18px]" /></span>
        <span className="flex-1 text-xl font-bold tracking-wider text-encre">{code ?? '…'}</span>
        {code && <BoutonIcone icone={Copy} label="Copier le code" onClick={() => copier(code, toast)} />}
      </div>
      <p className="mt-3 text-sm text-brume">Elle crée un compte avec ce code.</p>
    </Feuille>
  )
}
