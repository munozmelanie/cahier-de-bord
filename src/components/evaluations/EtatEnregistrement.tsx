import clsx from 'clsx'
import { AlertCircle, Check, Loader2 } from 'lucide-react'

/** État de l'enregistrement automatique, discret */
export function EtatEnregistrement({ etat }: { etat: 'ok' | 'attente' | 'envoi' | 'erreur' }) {
  const [Icone, texte] = etat === 'erreur'
    ? [AlertCircle, 'Non enregistré']
    : etat === 'ok' ? [Check, 'Enregistré'] : [Loader2, 'Enregistrement…']
  return (
    <span role="status" className={clsx('inline-flex items-center gap-1.5 text-xs font-medium', etat === 'erreur' ? 'text-alerte' : 'text-brume')}>
      <Icone className={clsx('size-3.5', (etat === 'attente' || etat === 'envoi') && 'animate-spin')} strokeWidth={2.6} />
      {texte}
    </span>
  )
}
