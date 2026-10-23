import clsx from 'clsx'
import { CheckCircle2, MessageSquareQuote, PenLine, Send, Wand2 } from 'lucide-react'
import { LSU, niveau } from '../../lib/matieres'
import type { Eleve, LsuBilan } from '../../lib/types'
import { Anneau } from './Anneau'
import { DOMAINE_COURT, NOM_COURT_LSU } from './outils'

/** Mini-barres des positionnements : une barre par domaine, groupées par matière, couleur du niveau */
export function BarresPositions({ positions, proposees }: { positions: Record<string, number>; proposees: Record<string, number> }) {
  return (
    <div className="flex h-7 min-w-0 items-end gap-1 overflow-hidden" aria-label="Positionnements">
      {LSU.map((m) => (
        <span key={m.id} className="flex items-end gap-px" title={NOM_COURT_LSU[m.id]}>
          {m.domaines.map((d) => {
            const v = positions[d.id]
            const n = niveau(v)
            const p = !v ? niveau(proposees[d.id]) : undefined
            const nom = `${NOM_COURT_LSU[m.id]}${m.domaines.length > 1 ? ` · ${DOMAINE_COURT[d.id] ?? d.nom}` : ''}`
            return (
              <span key={d.id}
                title={`${nom} : ${n ? n.court : p ? `${p.court} (proposé)` : '—'}`}
                className="w-1 shrink-0 rounded-full"
                style={n
                  ? { height: 8 + n.v * 5, background: n.couleur }
                  : p
                    ? { height: 8 + p.v * 5, border: `1px dashed ${p.couleur}` }
                    : { height: 6, background: '#E2E7F1' }}
              />
            )
          })}
        </span>
      ))}
    </div>
  )
}

/** Carte d'un élève dans la vue Classe du livret */
export function CarteEleve({ eleve, ligne, proposees, onOuvrir, onPublier }: {
  eleve: Eleve; ligne: LsuBilan | undefined; proposees: Record<string, number>; onOuvrir: () => void; onPublier: (v: boolean) => void
}) {
  const positions = ligne?.positions ?? {}
  const nbApp = Object.values(ligne?.appreciations ?? {}).filter((t) => t?.trim()).length
  const generale = !!ligne?.appreciation_generale?.trim()
  const nbProps = Object.keys(proposees).filter((d) => !positions[d]).length
  const publie = !!ligne?.publie

  return (
    <div className={clsx('flex flex-col gap-3 rounded-3xl bg-white p-3 shadow-doux transition', publie && 'ring-2 ring-succes/60')}>
      <div className="flex items-center gap-3">
        <button type="button" onClick={onOuvrir} className="flex min-w-0 flex-1 items-center gap-3 text-left" title={`Ouvrir le livret de ${eleve.prenom}`}>
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-bateau-clair font-titre text-xl font-semibold text-bateau">
            {eleve.prenom.slice(0, 1)}
          </span>
          <span className="truncate font-bold text-encre">{eleve.prenom}</span>
        </button>
        <button type="button" onClick={() => onPublier(!publie)} aria-pressed={publie}
          aria-label={publie ? `Retirer le livret de ${eleve.prenom}` : `Publier le livret de ${eleve.prenom} aux familles`}
          title={publie ? 'Visible des familles (toucher pour retirer)' : 'Publier aux familles'}
          className={clsx('flex size-10 shrink-0 items-center justify-center rounded-full transition', publie ? 'bg-succes text-white' : 'bg-encre/5 text-brume hover:bg-bateau-clair hover:text-bateau')}>
          {publie ? <CheckCircle2 className="size-5" /> : <Send className="size-5" />}
        </button>
      </div>
      <div onClick={onOuvrir} className="flex cursor-pointer items-center justify-between gap-3">
        <BarresPositions positions={positions} proposees={proposees} />
        <span className="flex shrink-0 items-center gap-2">
          {nbProps > 0 && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-bateau-clair px-1.5 text-xs font-bold leading-6 text-bateau" title={`${nbProps} proposition(s) à valider`}>
              <Wand2 className="size-3.5" />{nbProps}
            </span>
          )}
          <Anneau valeur={nbApp} total={LSU.length} couleur={nbApp === LSU.length ? '#18A058' : '#7B4DFF'} taille={30} epaisseur={3.5} titre={`Appréciations : ${nbApp} sur ${LSU.length}`}>
            <PenLine className="size-3.5" />
          </Anneau>
          <MessageSquareQuote className={clsx('size-5', generale ? 'text-succes' : 'text-trait')} aria-label={generale ? 'Appréciation générale rédigée' : 'Appréciation générale à rédiger'} />
        </span>
      </div>
    </div>
  )
}
