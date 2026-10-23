import { KeyRound, LogOut } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Logo } from '../../components/Logo'
import { Bouton, Champ, Erreur, Liste, Saisie } from '../../components/ui'
import { db, traduireErreur } from '../../lib/supabase'
import { useSession } from '../../lib/session'

/** Code donné par le lien d'un coupon (#/code/ABCD-EFGH) */
export const codeDuLien = (chemin: string) =>
  chemin.startsWith('/code/') ? decodeURIComponent(chemin.slice(6)).toUpperCase().replace(/[^A-Z0-9-]/g, '') : ''

/** Code à 12 caractères = code enseignant ; à 8 = code famille */
export const estCodeEnseignant = (code: string) => code.replace(/[^A-Za-z0-9]/g, '').length === 12

/** Nom affiché : prénom + nom */
export const nomComplet = (prenom: string, nom: string) => [prenom.trim(), nom.trim()].filter(Boolean).join(' ')

export function ChampsCode(p: {
  code: string; setCode: (v: string) => void
  prenom: string; setPrenom: (v: string) => void
  nom: string; setNom: (v: string) => void
  lien: string; setLien: (v: string) => void
}) {
  const enseignant = estCodeEnseignant(p.code)
  // Code enseignant : le lien se met tout seul
  useEffect(() => {
    if (enseignant && !p.lien) p.setLien('Enseignante')
    if (!enseignant && /^Enseignant/.test(p.lien)) p.setLien('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enseignant])
  return (
    <>
      <Champ label="Code">
        {(id) => (
          <Saisie id={id} required value={p.code} onChange={(e) => p.setCode(e.target.value.toUpperCase())}
            placeholder="ABCD-EFGH" autoCapitalize="characters" autoComplete="off" spellCheck={false}
            className="text-center text-2xl font-semibold tracking-[0.2em]" />
        )}
      </Champ>
      <div className="grid grid-cols-2 gap-3">
        <Champ label="Prénom">{(id) => <Saisie id={id} value={p.prenom} onChange={(e) => p.setPrenom(e.target.value)} autoComplete="given-name" />}</Champ>
        <Champ label="Nom">{(id) => <Saisie id={id} value={p.nom} onChange={(e) => p.setNom(e.target.value)} autoComplete="family-name" />}</Champ>
      </div>
      <Champ label="Vous êtes">
        {(id) => (
          <Liste id={id} value={p.lien} onChange={(e) => p.setLien(e.target.value)}>
            <option value="">Choisir</option>
            {enseignant ? (
              <>
                <option>Enseignante</option>
                <option>Enseignant</option>
              </>
            ) : (
              <>
                <option>Maman</option>
                <option>Papa</option>
                <option>Responsable légal</option>
              </>
            )}
          </Liste>
        )}
      </Champ>
    </>
  )
}

/** Compte créé mais pas encore relié à un élève (ou à la classe) */
export default function Relier() {
  const { rafraichir, deconnexion, email, role } = useSession()
  const nav = useNavigate()
  const codeLien = codeDuLien(useLocation().pathname)
  const ajout = role === 'parent' // famille déjà reliée qui ajoute un autre enfant
  const [code, setCode] = useState(codeLien)
  const [prenom, setPrenom] = useState('')
  const [nom, setNom] = useState('')
  const [lien, setLien] = useState('')
  const [erreur, setErreur] = useState('')
  const [enCours, setEnCours] = useState(false)

  useEffect(() => {
    try {
      const brut = localStorage.getItem('cdb-code-en-attente')
      if (brut) {
        const v = JSON.parse(brut)
        if (!codeLien) setCode(v.code ?? '')
        setPrenom(v.prenom ?? v.nom ?? ''); setNom(v.nomFamille ?? ''); setLien(v.lien ?? '')
      }
    } catch { /* rien */ }
  }, [])

  async function envoyer(e: FormEvent) {
    e.preventDefault()
    setErreur(''); setEnCours(true)
    const r = await db.rpc('rejoindre', { code, nom: nomComplet(prenom, nom), lien })
    setEnCours(false)
    if (r.error) return setErreur(traduireErreur(r.error.message))
    if (r.data?.erreur) return setErreur(r.data.erreur)
    try { localStorage.removeItem('cdb-code-en-attente') } catch { /* rien */ }
    await rafraichir()
    nav('/', { replace: true })
  }

  return (
    <div className="flex min-h-dvh flex-col items-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center"><Logo /></div>
        <form onSubmit={envoyer} className="flex flex-col gap-4 rounded-3xl bg-white p-6 shadow-doux sm:p-8">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-bateau-clair text-bateau"><KeyRound className="size-6" /></span>
            <div className="min-w-0">
              {ajout && <p className="font-semibold text-encre">Ajouter un enfant</p>}
              <p className="truncate text-sm text-brume">{email}</p>
            </div>
          </div>
          <ChampsCode code={code} setCode={setCode} prenom={prenom} setPrenom={setPrenom} nom={nom} setNom={setNom} lien={lien} setLien={setLien} />
          {erreur && <Erreur message={erreur} />}
          <Bouton type="submit" taille="l" icone={KeyRound} enCours={enCours}>Valider</Bouton>
          {ajout
            ? <Bouton type="button" variante="fantome" onClick={() => nav('/', { replace: true })}>Retour</Bouton>
            : <Bouton type="button" variante="fantome" icone={LogOut} onClick={deconnexion}>Déconnexion</Bouton>}
        </form>
      </div>
    </div>
  )
}
