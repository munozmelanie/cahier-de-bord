import { AlertCircle, Check, Loader2 } from 'lucide-react'

/** État de l'enregistrement automatique : une icône, le détail en infobulle */
export function EtatEnregistrement({ etat }: { etat: 'ok' | 'attente' | 'envoi' | 'erreur' }) {
  const [Icone, classe, texte] = etat === 'erreur'
    ? [AlertCircle, 'bg-alerte-clair text-alerte', 'Non enregistré']
    : etat === 'ok'
      ? [Check, 'bg-succes-clair text-succes', 'Enregistré']
      : [Loader2, 'bg-encre/5 text-brume', 'Enregistrement…']
  return (
    <span className={`inline-flex size-9 items-center justify-center rounded-full ${classe}`} title={texte} role="status" aria-label={texte}>
      <Icone className={`size-4 ${etat === 'attente' || etat === 'envoi' ? 'animate-spin' : ''}`} strokeWidth={2.6} />
    </span>
  )
}
