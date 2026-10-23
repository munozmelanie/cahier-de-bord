import clsx from 'clsx'
import { Download, EllipsisVertical, Share, Smartphone, SquarePlus, X } from 'lucide-react'
import { useState } from 'react'
import { useInstallation } from '../lib/installation'
import { Bouton, BoutonIcone } from './ui'

const CLE = 'cdb-installation-masquee'
const lireMasquee = () => { try { return localStorage.getItem(CLE) === '1' } catch { return false } }

/** Propose d'installer l'appli sur l'écran d'accueil du téléphone (tant qu'elle ne l'est pas) */
export function CarteInstallation({ className }: { className?: string }) {
  const { installee, iphone, telephone, peutInstaller, installer } = useInstallation()
  const [masquee, setMasquee] = useState(lireMasquee)
  if (installee || masquee || (!telephone && !peutInstaller)) return null

  const masquer = () => { setMasquee(true); try { localStorage.setItem(CLE, '1') } catch { /* rien */ } }
  const etape = (n: number, contenu: React.ReactNode) => (
    <li className="flex items-start gap-2.5">
      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-bateau text-[11px] font-bold text-white">{n}</span>
      <span className="leading-snug">{contenu}</span>
    </li>
  )

  return (
    <section className={clsx('rounded-2xl bg-bateau-clair p-4 text-encre', className)} aria-label="Installer l'appli">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white text-bateau"><Smartphone className="size-5" /></span>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">Installer l'appli sur votre téléphone</h2>
          <p className="mt-0.5 text-sm text-encre/75">Elle s'ouvrira comme une vraie appli, depuis une icône sur l'écran d'accueil.</p>
        </div>
        <BoutonIcone icone={X} label="Masquer" onClick={masquer} className="-mr-1 -mt-1 size-8" />
      </div>

      {peutInstaller ? (
        <Bouton icone={Download} onClick={() => installer()} className="mt-3 w-full sm:w-auto">Installer</Bouton>
      ) : iphone ? (
        <ol className="mt-3 flex flex-col gap-2 text-sm">
          {etape(1, <>Dans Safari, touchez <Share className="inline size-4 align-[-3px] text-bateau" aria-label="Partager" /> (en bas de l'écran).</>)}
          {etape(2, <>Choisissez « Sur l'écran d'accueil » <SquarePlus className="inline size-4 align-[-3px] text-bateau" />, puis « Ajouter ».</>)}
          {etape(3, <>Ouvrez l'appli depuis sa nouvelle icône et connectez-vous avec votre e-mail et votre mot de passe.</>)}
        </ol>
      ) : (
        <ol className="mt-3 flex flex-col gap-2 text-sm">
          {etape(1, <>Ouvrez le menu du navigateur <EllipsisVertical className="inline size-4 align-[-3px] text-bateau" aria-label="Menu" /> (en haut à droite).</>)}
          {etape(2, <>Choisissez « Installer l'application » ou « Ajouter à l'écran d'accueil ».</>)}
        </ol>
      )}
    </section>
  )
}
