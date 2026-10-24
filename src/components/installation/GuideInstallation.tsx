import { ChevronLeft, Download, Smartphone, X } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { useInstallation } from '../../lib/installation'
import { LogoIcone } from '../Logo'
import { Bouton, BoutonIcone } from '../ui'
import { TutorielInstallation, type SystemeInstallation } from './TutorielInstallation'

export const CLE_GUIDE_INSTALLATION = 'cdb-guide-installation-v1'
export const guideDejaVu = () => {
  try { return localStorage.getItem(CLE_GUIDE_INSTALLATION) === 'vu' } catch { return false }
}

export function GuideInstallation({ ouverte, onFermer, depuisQr, commencerParEtapes = false }: {
  ouverte: boolean
  onFermer: () => void
  depuisQr: boolean
  commencerParEtapes?: boolean
}) {
  const { iphone, peutInstaller, installer, installee } = useInstallation()
  const [systeme, setSysteme] = useState<SystemeInstallation>(iphone ? 'ios' : 'android')
  const [etapes, setEtapes] = useState(commencerParEtapes)
  const [enCours, setEnCours] = useState(false)
  const [message, setMessage] = useState('')
  const dialogue = useRef<HTMLDialogElement>(null)
  const titre = useRef<HTMLHeadingElement>(null)
  const id = useId()

  useEffect(() => {
    const d = dialogue.current
    if (!ouverte || !d) return
    setEtapes(commencerParEtapes)
    setSysteme(iphone ? 'ios' : 'android')
    setMessage('')
    const ancienFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const ancienDebordement = document.body.style.overflow
    d.showModal()
    document.body.style.overflow = 'hidden'
    titre.current?.focus({ preventScroll: true })
    return () => {
      d.close()
      document.body.style.overflow = ancienDebordement
      if (ancienFocus?.isConnected) ancienFocus.focus({ preventScroll: true })
    }
  }, [ouverte, commencerParEtapes, iphone])

  useEffect(() => {
    if (ouverte && installee) onFermer()
  }, [ouverte, installee, onFermer])

  const fermer = () => {
    try { localStorage.setItem(CLE_GUIDE_INSTALLATION, 'vu') } catch { /* le guide reste utilisable sans stockage */ }
    onFermer()
  }

  async function lancerInstallation() {
    setEnCours(true)
    setMessage('')
    const acceptee = await installer()
    setEnCours(false)
    if (acceptee) fermer()
    else {
      setMessage('L’installation n’a pas été confirmée. Vous pouvez aussi suivre les étapes ci-dessous.')
      setEtapes(true)
    }
  }

  if (!ouverte) return null
  return (
    <dialog ref={dialogue} aria-labelledby={id} onCancel={(e) => { e.preventDefault(); fermer() }}
      className="m-auto max-h-[94dvh] w-[calc(100%_-_24px)] max-w-xl overflow-y-auto rounded-3xl bg-white p-0 text-encre shadow-flotte backdrop:bg-encre/45">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-trait bg-white px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold"><LogoIcone className="size-8" /> Installer Cahier de bord</div>
        <BoutonIcone icone={X} label="Fermer le guide d’installation" onClick={fermer} className="size-11" />
      </div>
      <div className="px-5 pb-5 pt-4 sm:px-7">
        <h2 ref={titre} id={id} tabIndex={-1} className={etapes ? 'sr-only' : 'text-xl font-bold leading-tight outline-none'}>
          {etapes ? 'Les gestes à suivre' : 'Une icône pour retrouver la classe'}
        </h2>
        {!etapes && <p className="mt-2 text-sm text-brume">Les devoirs, les messages et le livret seront accessibles depuis votre écran d’accueil.</p>}
        {depuisQr && !etapes && <p className="mt-3 rounded-xl bg-bateau-clair p-3 text-sm leading-relaxed">
          Le code du coupon est déjà rempli. Terminez votre inscription ou l’ajout de votre enfant sur cette page. Dans l’app installée, connectez-vous avec le même e-mail et le même mot de passe.
        </p>}

        {peutInstaller && <div className="mt-4">
          <Bouton icone={Download} taille="l" className="w-full" enCours={enCours} onClick={lancerInstallation}>Installer l’app</Bouton>
          <p className="mt-2 text-center text-xs text-brume">Confirmez ensuite « Installer » dans la fenêtre du navigateur.</p>
        </div>}
        {message && <p role="status" className="mt-3 rounded-xl bg-ambre-clair p-3 text-sm">{message}</p>}

        {!etapes ? <div className="mt-5">
          <Bouton icone={Smartphone} taille="l" variante={peutInstaller ? 'secondaire' : 'primaire'} className="w-full" onClick={() => setEtapes(true)}>Voir le tutoriel animé</Bouton>
          {iphone && <p className="mt-2 text-center text-xs text-brume">Sur iPhone, l’ajout se fait depuis le menu de Safari.</p>}
        </div> : <div>
          <div className="mb-3 grid grid-cols-2 gap-2" aria-label="Type de téléphone">
            {(['ios', 'android'] as const).map((s) => <button key={s} type="button" aria-pressed={systeme === s}
              onClick={() => setSysteme(s)}
              className={`min-h-11 rounded-xl border px-3 text-sm font-semibold ${systeme === s ? 'border-bateau bg-bateau-clair text-bateau-fonce' : 'border-trait text-brume'}`}>
              {s === 'ios' ? 'iPhone · Safari' : 'Android · Chrome'}
            </button>)}
          </div>
          <TutorielInstallation key={systeme} systeme={systeme} />
          <p className="mt-3 text-xs leading-relaxed text-brume">Si le lien s’ouvre dans une messagerie, ouvrez-le d’abord dans {systeme === 'ios' ? 'Safari' : 'Chrome'}. Les menus peuvent varier selon la version du téléphone.</p>
        </div>}
      </div>
      <div className="sticky bottom-0 border-t border-trait bg-white px-5 py-3">
        <Bouton icone={ChevronLeft} variante="secondaire" className="min-h-11 w-full" onClick={fermer}>
          {depuisQr ? 'Continuer vers mon compte' : 'Revenir à l’application'}
        </Bouton>
        <p className="mt-1.5 text-center text-xs text-brume">L’installation est facultative.</p>
      </div>
    </dialog>
  )
}
