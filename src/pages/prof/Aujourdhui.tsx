import { Journee } from '../../components/journal/Journee'
import { Badge } from '../../components/ui'
import { aujourdhui, estJourClasse, fmtJour, jourClasseSuivant, maj1, periodeDe, semaineDansPeriode, vacancesDe } from '../../lib/dates'
import { useClasse } from '../../lib/session'

export default function Aujourdhui() {
  const classe = useClasse()
  const auj = aujourdhui()
  const classeAujourdhui = estJourClasse(auj, classe.reglages)
  const jour = classeAujourdhui ? auj : jourClasseSuivant(auj, classe.reglages)
  const periode = periodeDe(jour, classe.reglages)
  const vacances = vacancesDe(auj, classe.reglages)

  return (
    <Journee
      date={jour}
      titre={maj1(fmtJour(jour))}
      sousTitre={
        <span className="flex flex-wrap items-center gap-2">
          {periode && <Badge>{periode.id} · S{semaineDansPeriode(jour, periode)}</Badge>}
          {!classeAujourdhui && vacances && <Badge couleur="ambre">{vacances.nom}</Badge>}
        </span>
      }
    />
  )
}
