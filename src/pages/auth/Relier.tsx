import { KeyRound, LogOut } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Logo } from '../../components/Logo'
import { Bouton, Champ, Erreur, Liste, Saisie } from '../../components/ui'
import { db, traduireErreur } from '../../lib/supabase'
import { useSession } from '../../lib/session'

export function ChampsCode(p: {
  code: string; setCode: (v: string) => void; nom: string; setNom: (v: string) => void; lien: string; setLien: (v: string) => void
}) {
  return (
    <>
      <Champ label="Code reçu de l'école" aide="Sur le papier donné par l'enseignante">
        {(id) => (
          <Saisie id={id} required value={p.code} onChange={(e) => p.setCode(e.target.value.toUpperCase())}
            placeholder="ABCD-EFGH" autoCapitalize="characters" autoComplete="off" spellCheck={false}
            className="text-center font-titre text-2xl tracking-[0.2em]" />
        )}
      </Champ>
      <div className="grid grid-cols-[1fr_auto] gap-3">
        <Champ label="Votre prénom">{(id) => <Saisie id={id} value={p.nom} onChange={(e) => p.setNom(e.target.value)} autoComplete="given-name" />}</Champ>
        <Champ label="Vous êtes">
          {(id) => (
            <Liste id={id} value={p.lien} onChange={(e) => p.setLien(e.target.value)}>
              <option value="">—</option>
              <option>Maman</option>
              <option>Papa</option>
              <option>Responsable</option>
            </Liste>
          )}
        </Champ>
      </div>
    </>
  )
}

/** Compte créé mais pas encore relié à un élève (ou à la classe) */
export default function Relier() {
  const { rafraichir, deconnexion, email } = useSession()
  const [code, setCode] = useState('')
  const [nom, setNom] = useState('')
  const [lien, setLien] = useState('')
  const [erreur, setErreur] = useState('')
  const [enCours, setEnCours] = useState(false)

  useEffect(() => {
    try {
      const brut = localStorage.getItem('cdb-code-en-attente')
      if (brut) {
        const v = JSON.parse(brut)
        setCode(v.code ?? ''); setNom(v.nom ?? ''); setLien(v.lien ?? '')
      }
    } catch { /* rien */ }
  }, [])

  async function envoyer(e: FormEvent) {
    e.preventDefault()
    setErreur(''); setEnCours(true)
    const r = await db.rpc('rejoindre', { code, nom, lien })
    setEnCours(false)
    if (r.error) return setErreur(traduireErreur(r.error.message))
    if (r.data?.erreur) return setErreur(r.data.erreur)
    try { localStorage.removeItem('cdb-code-en-attente') } catch { /* rien */ }
    await rafraichir()
  }

  return (
    <div className="flex min-h-dvh flex-col items-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center"><Logo /></div>
        <form onSubmit={envoyer} className="flex flex-col gap-4 rounded-[28px] bg-white p-6 shadow-doux sm:p-8">
          <h1 className="font-titre text-2xl font-semibold">Relier mon compte</h1>
          <p className="-mt-2 text-sm text-brume">{email}</p>
          <ChampsCode code={code} setCode={setCode} nom={nom} setNom={setNom} lien={lien} setLien={setLien} />
          {erreur && <Erreur message={erreur} />}
          <Bouton type="submit" taille="l" icone={KeyRound} enCours={enCours}>Valider le code</Bouton>
          <Bouton type="button" variante="fantome" icone={LogOut} onClick={deconnexion}>Se déconnecter</Bouton>
        </form>
      </div>
    </div>
  )
}
