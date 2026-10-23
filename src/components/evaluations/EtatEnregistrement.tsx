import { AlertCircle, Check, Loader2 } from 'lucide-react'

export function EtatEnregistrement({ etat }: { etat: 'ok' | 'attente' | 'envoi' | 'erreur' }) {
  if (etat === 'erreur') {
    return <span className="inline-flex items-center gap-1 text-sm font-bold text-alerte"><AlertCircle className="size-4" /> Non enregistré</span>
  }
  if (etat === 'ok') {
    return <span className="inline-flex items-center gap-1 text-sm font-bold text-succes"><Check className="size-4" /> Enregistré</span>
  }
  return <span className="inline-flex items-center gap-1 text-sm font-bold text-brume"><Loader2 className="size-4 animate-spin" /> Enregistrement</span>
}
