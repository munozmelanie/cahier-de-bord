import clsx from 'clsx'
import { Check, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Bascule, Bouton, Champ, Feuille, Saisie, Texte, useConfirmation, useToast } from '../ui'
import { aujourdhui } from '../../lib/dates'
import { useEcrire } from '../../lib/donnees'
import type { EvenementAgenda } from '../../lib/types'
import { TYPES_AGENDA, TYPES_SAISIE, type TypeAgenda } from './agenda'

/** Ajouter ou modifier un événement de l'agenda */
export function EditeurEvenement({ ouvert, onFermer, classeId, ev }: { ouvert: boolean; onFermer: () => void; classeId: string; ev: EvenementAgenda | null }) {
  const ecrire = useEcrire()
  const toast = useToast()
  const { demander, fenetre } = useConfirmation()
  const [titre, setTitre] = useState('')
  const [type, setType] = useState<TypeAgenda>('info')
  const [date, setDate] = useState(aujourdhui())
  const [plusieurs, setPlusieurs] = useState(false)
  const [fin, setFin] = useState('')
  const [heure, setHeure] = useState('')
  const [details, setDetails] = useState('')
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    if (!ouvert) return
    setTitre(ev?.titre ?? ''); setType(ev?.type ?? 'info'); setDate(ev?.date ?? aujourdhui())
    setPlusieurs(!!ev?.fin && ev.fin !== ev.date); setFin(ev?.fin ?? ''); setHeure(ev?.heure ?? '')
    setDetails(ev?.details ?? ''); setVisible(ev?.visible_familles ?? true)
  }, [ouvert, ev])

  const finValide = !plusieurs || (fin && fin >= date)
  const pret = titre.trim() && date && finValide

  async function enregistrer() {
    if (!pret) return
    const ligne = {
      titre: titre.trim(), type, date, fin: plusieurs ? fin : null, heure: heure.trim() || null,
      details: details.trim() || null, visible_familles: visible,
    }
    try {
      if (ev) await ecrire.mutateAsync({ op: 'update', table: 'agenda', id: ev.id, patch: ligne })
      else await ecrire.mutateAsync({ op: 'insert', table: 'agenda', ligne: { ...ligne, classe_id: classeId } })
      toast(ev ? 'Événement modifié' : 'Événement ajouté')
      onFermer()
    } catch (e) { toast((e as Error).message, 'erreur') }
  }
  const supprimer = () => ev && demander(`Supprimer « ${ev.titre} » ?`, async () => {
    try {
      await ecrire.mutateAsync({ op: 'delete', table: 'agenda', id: ev.id })
      toast('Événement supprimé'); onFermer()
    } catch (e) { toast((e as Error).message, 'erreur') }
  })

  return (
    <>
      <Feuille ouverte={ouvert} onFermer={onFermer} titre={ev ? 'Modifier' : 'Nouvel événement'}
        pied={<>
          {ev && <Bouton variante="fantome" icone={Trash2} onClick={supprimer} className="mr-auto text-alerte">Supprimer</Bouton>}
          <Bouton variante="secondaire" onClick={onFermer}>Annuler</Bouton>
          <Bouton icone={Check} onClick={enregistrer} disabled={!pret} enCours={ecrire.isPending}>Enregistrer</Bouton>
        </>}>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-label="Type">
            {TYPES_SAISIE.map((t) => {
              const c = TYPES_AGENDA[t]
              const Icone = c.icone
              return (
                <button key={t} type="button" role="radio" aria-checked={type === t} onClick={() => setType(t)}
                  className={clsx('flex flex-col items-center gap-1 rounded-2xl border-2 p-2 text-[11px] font-bold', type === t ? 'border-current' : 'border-transparent')}
                  style={{ background: c.fond, color: c.couleur }}>
                  <Icone className="size-5" strokeWidth={2.2} />{c.nom}
                </button>
              )
            })}
          </div>
          <Champ label="Titre">{(id) => <Saisie id={id} value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="Sortie au musée" />}</Champ>
          <div className="grid grid-cols-2 gap-3">
            <Champ label={plusieurs ? 'Du' : 'Date'}>{(id) => <Saisie id={id} type="date" value={date} onChange={(e) => setDate(e.target.value)} />}</Champ>
            {plusieurs ? (
              <Champ label="Au">{(id) => <Saisie id={id} type="date" value={fin} min={date} onChange={(e) => setFin(e.target.value)} />}</Champ>
            ) : (
              <Champ label="Heure">{(id) => <Saisie id={id} value={heure} onChange={(e) => setHeure(e.target.value)} placeholder="9h" />}</Champ>
            )}
          </div>
          <Bascule actif={plusieurs} onChange={(v) => { setPlusieurs(v); if (v && !fin) setFin(date) }} label="Sur plusieurs jours" />
          <Champ label="Détails">{(id) => <Texte id={id} value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Prévoir un pique-nique." />}</Champ>
          <Bascule actif={visible} onChange={setVisible} label="Visible des familles" />
        </div>
      </Feuille>
      {fenetre}
    </>
  )
}
