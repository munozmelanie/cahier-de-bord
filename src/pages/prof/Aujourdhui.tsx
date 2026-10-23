import { MessagesSquare } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Journee } from '../../components/journal/Journee'
import { Badge, Entete } from '../../components/ui'
import { useLectures, useMessages } from '../../lib/donnees'
import { aujourdhui, estJourClasse, fmtJour, maj1, jourClasseSuivant, periodeDe, semaineDansPeriode, vacancesDe } from '../../lib/dates'
import { useClasse, useSession } from '../../lib/session'

export default function Aujourdhui() {
  const classe = useClasse()
  const { userId } = useSession()
  const auj = aujourdhui()
  const classeAujourdhui = estJourClasse(auj, classe.reglages)
  const jour = classeAujourdhui ? auj : jourClasseSuivant(auj, classe.reglages)
  const periode = periodeDe(jour, classe.reglages)
  const semaine = semaineDansPeriode(jour, periode)
  const vacances = vacancesDe(auj, classe.reglages)

  const msgs = useMessages()
  const lect = useLectures()
  const aLire = useMemo(() => {
    const lus = new Set((lect.data ?? []).filter((l) => l.user_id === userId).map((l) => l.message_id))
    return (msgs.data ?? []).filter((m) => m.auteur_role === 'parent' && !lus.has(m.id)).length
  }, [msgs.data, lect.data, userId])

  return (
    <>
      <Entete
        titre={maj1(fmtJour(jour))}
        sousTitre={
          <span className="flex flex-wrap items-center gap-2">
            {!classeAujourdhui && <Badge couleur="ambre">{vacances ? `Vacances : ${vacances.nom}` : 'Prochain jour de classe'}</Badge>}
            {periode && <Badge>{periode.id} · semaine {semaine}</Badge>}
          </span>
        }
        actions={aLire > 0 && (
          <Link to="/carnet" className="inline-flex items-center gap-2 rounded-full bg-alerte px-4 py-2 font-bold text-white shadow-doux">
            <MessagesSquare className="size-5" /> {aLire} message{aLire > 1 ? 's' : ''}
          </Link>
        )}
      />
      <Journee date={jour} />
    </>
  )
}
