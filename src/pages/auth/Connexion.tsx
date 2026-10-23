import { KeyRound, LogIn, Mail, UserPlus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Logo } from '../../components/Logo'
import { Bouton, Champ, Erreur, Onglets, Saisie } from '../../components/ui'
import { db, MODE_DEMO, traduireErreur } from '../../lib/supabase'
import { useSession } from '../../lib/session'
import { ChampsCode } from './Relier'

export default function Connexion() {
  const [mode, setMode] = useState<'connexion' | 'inscription'>('connexion')
  return (
    <div className="flex min-h-dvh flex-col items-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center"><Logo /></div>
        <div className="rounded-[28px] bg-white p-6 shadow-doux sm:p-8">
          <div className="mb-6 flex justify-center">
            <Onglets valeur={mode} onChange={setMode} options={[
              { id: 'connexion', label: 'Se connecter', icone: LogIn },
              { id: 'inscription', label: 'Créer un compte', icone: UserPlus },
            ]} />
          </div>
          {MODE_DEMO && (
            <div className="mb-6 grid grid-cols-2 gap-2">
              <Bouton variante="doux" onClick={() => (db.auth as any).entrerComme('enseignant')}>Enseignante</Bouton>
              <Bouton variante="doux" onClick={() => (db.auth as any).entrerComme('parent')}>Famille</Bouton>
            </div>
          )}
          {mode === 'connexion' ? <FormConnexion /> : <FormInscription />}
        </div>
        {!MODE_DEMO && (
          <p className="mt-6 text-center text-sm text-brume">
            <a className="font-bold text-bateau underline" href="?demo">Essayer avec des données fictives</a>
          </p>
        )}
      </div>
    </div>
  )
}

function FormConnexion() {
  const [email, setEmail] = useState('')
  const [mdp, setMdp] = useState('')
  const [erreur, setErreur] = useState('')
  const [info, setInfo] = useState('')
  const [enCours, setEnCours] = useState(false)

  async function envoyer(e: FormEvent) {
    e.preventDefault()
    setErreur(''); setEnCours(true)
    const { error } = await db.auth.signInWithPassword({ email: email.trim(), password: mdp })
    setEnCours(false)
    if (error) setErreur(traduireErreur(error.message))
  }
  async function oubli() {
    if (!email.trim()) { setErreur("Écris d'abord ton e-mail."); return }
    const { error } = await db.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin + window.location.pathname })
    if (error) setErreur(traduireErreur(error.message))
    else setInfo('Un lien pour changer de mot de passe a été envoyé.')
  }

  return (
    <form onSubmit={envoyer} className="flex flex-col gap-4">
      <Champ label="E-mail">{(id) => <Saisie id={id} type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />}</Champ>
      <Champ label="Mot de passe">{(id) => <Saisie id={id} type="password" autoComplete="current-password" required value={mdp} onChange={(e) => setMdp(e.target.value)} />}</Champ>
      {erreur && <Erreur message={erreur} />}
      {info && <p className="rounded-2xl bg-succes-clair px-4 py-3 text-sm font-bold text-succes">{info}</p>}
      <Bouton type="submit" taille="l" icone={LogIn} enCours={enCours}>Se connecter</Bouton>
      <button type="button" onClick={oubli} className="text-sm font-bold text-brume underline">Mot de passe oublié</button>
    </form>
  )
}

function FormInscription() {
  const { rafraichir } = useSession()
  const [email, setEmail] = useState('')
  const [mdp, setMdp] = useState('')
  const [code, setCode] = useState('')
  const [nom, setNom] = useState('')
  const [lien, setLien] = useState('')
  const [erreur, setErreur] = useState('')
  const [info, setInfo] = useState('')
  const [enCours, setEnCours] = useState(false)

  async function envoyer(e: FormEvent) {
    e.preventDefault()
    setErreur(''); setEnCours(true)
    try {
      const { data, error } = await db.auth.signUp({ email: email.trim(), password: mdp })
      if (error) throw new Error(traduireErreur(error.message))
      if (!data.session) {
        // Confirmation par e-mail activée : le code sera demandé à la première connexion
        try { localStorage.setItem('cdb-code-en-attente', JSON.stringify({ code, nom, lien })) } catch { /* rien */ }
        setInfo('Compte créé. Ouvre le lien reçu par e-mail, puis connecte-toi.')
        return
      }
      const r = await db.rpc('rejoindre', { code, nom, lien })
      if (r.error) throw new Error(traduireErreur(r.error.message))
      if (r.data?.erreur) throw new Error(r.data.erreur)
      await rafraichir()
    } catch (err) {
      setErreur((err as Error).message)
    } finally {
      setEnCours(false)
    }
  }

  return (
    <form onSubmit={envoyer} className="flex flex-col gap-4">
      <ChampsCode code={code} setCode={setCode} nom={nom} setNom={setNom} lien={lien} setLien={setLien} />
      <Champ label="E-mail">{(id) => <Saisie id={id} type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />}</Champ>
      <Champ label="Mot de passe" aide="6 caractères minimum">{(id) => <Saisie id={id} type="password" autoComplete="new-password" minLength={6} required value={mdp} onChange={(e) => setMdp(e.target.value)} />}</Champ>
      {erreur && <Erreur message={erreur} />}
      {info && <p className="flex items-center gap-2 rounded-2xl bg-succes-clair px-4 py-3 text-sm font-bold text-succes"><Mail className="size-4" />{info}</p>}
      <Bouton type="submit" taille="l" icone={KeyRound} enCours={enCours}>Créer mon compte</Bouton>
    </form>
  )
}
