import clsx from 'clsx'
import { Download, Play, Smartphone, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useInstallation } from '../lib/installation'
import { GuideInstallation, guideDejaVu } from './installation/GuideInstallation'
import { Bouton, BoutonIcone } from './ui'

const CLE = 'cdb-installation-masquee'
const lireMasquee = () => { try { return localStorage.getItem(CLE) === '1' } catch { return false } }

/** Guide accessible dès le QR code, puis depuis l’espace famille. */
export function CarteInstallation({ className, depuisQr = false }: { className?: string; depuisQr?: boolean }) {
  const { installee, telephone, peutInstaller, installer } = useInstallation()
  const [masquee, setMasquee] = useState(lireMasquee)
  const [ouverte, setOuverte] = useState(false)
  const [etapes, setEtapes] = useState(false)
  const [enCours, setEnCours] = useState(false)
  const fermer = useCallback(() => setOuverte(false), [])

  useEffect(() => {
    if (depuisQr && telephone && !installee && !guideDejaVu()) {
      setEtapes(false)
      setOuverte(true)
    }
  }, [depuisQr, telephone, installee])

  if (installee || (!telephone && !peutInstaller && !depuisQr)) return null
  const montrer = () => { setEtapes(true); setOuverte(true) }
  const masquer = () => { setMasquee(true); try { localStorage.setItem(CLE, '1') } catch { /* rien */ } }
  const installerDirectement = async () => {
    setEnCours(true)
    const acceptee = await installer()
    setEnCours(false)
    if (!acceptee) montrer()
  }

  return <>
    {masquee && !depuisQr ? <div className={className}>
      <button type="button" onClick={montrer} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-bateau underline underline-offset-4">
        <Smartphone className="size-4" /> Comment installer l’app ?
      </button>
    </div> : <section className={clsx('rounded-2xl bg-bateau-clair p-4 text-encre', className)} aria-label="Installer l’appli">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white text-bateau"><Smartphone className="size-5" /></span>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">Cahier de bord sur votre téléphone</h2>
          <p className="mt-0.5 text-sm text-encre/75">Ajoutez l’icône à l’écran d’accueil. Un guide vous montre les gestes à faire.</p>
        </div>
        {!depuisQr && <BoutonIcone icone={X} label="Réduire l’aide à l’installation" onClick={masquer} className="-mr-1 -mt-1 size-11" />}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {peutInstaller && <Bouton icone={Download} enCours={enCours} onClick={installerDirectement} className="min-h-11">Installer l’app</Bouton>}
        <Bouton icone={Play} variante={peutInstaller ? 'secondaire' : 'primaire'} onClick={montrer} className="min-h-11">Voir le tutoriel animé</Bouton>
      </div>
    </section>}
    <GuideInstallation ouverte={ouverte} onFermer={fermer} depuisQr={depuisQr} commencerParEtapes={etapes} />
  </>
}
