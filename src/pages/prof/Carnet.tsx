import clsx from 'clsx'
import { ArrowLeft, Inbox, MessagesSquare, PenLine, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Avatar, Bulle, CarteFil, construireFils, fondTeinte, indexLectures, teinte, titreFil, ZoneReponse, type Fil } from '../../components/carnet/fils'
import { NouveauMotProf } from '../../components/carnet/NouveauMot'
import { Signatures } from '../../components/carnet/Signatures'
import { BoutonIcone, Chargement, Entete, Erreur, useConfirmation, useToast, Vide } from '../../components/ui'
import { quand } from '../../lib/dates'
import { useEcrire, useEleves, useLectures, useMessages, useParents } from '../../lib/donnees'
import { useClasse, useSession } from '../../lib/session'
import type { Eleve, Lecture, Message, ParentLien } from '../../lib/types'

export default function CarnetProf() {
  const classe = useClasse()
  const { userId } = useSession()
  const msgs = useMessages()
  const lect = useLectures()
  const eleves = useEleves()
  const parents = useParents((eleves.data ?? []).map((e) => e.id))
  const ecrire = useEcrire()
  const [filtre, setFiltre] = useState<'tout' | 'alire'>('tout')
  const [ouvert, setOuvert] = useState<string | null>(null)
  const [nouveau, setNouveau] = useState(false)

  const fils = useMemo(() => construireFils(msgs.data ?? []), [msgs.data])
  const lectures = useMemo(() => indexLectures(lect.data), [lect.data])
  const elevesParId = useMemo(() => new Map((eleves.data ?? []).map((e) => [e.id, e])), [eleves.data])

  const luParMoi = (m: Message) => (lectures.get(m.id) ?? []).some((l) => l.user_id === userId)
  const nonLus = (f: Fil) => [f.racine, ...f.reponses].filter((m) => m.auteur_role === 'parent' && !luParMoi(m))
  const aLire = fils.filter((f) => nonLus(f).length > 0)
  const visibles = filtre === 'alire' ? aLire : fils
  const fil = fils.find((f) => f.racine.id === ouvert) ?? null

  // Ouvrir un fil le marque comme lu
  const dejaMarques = useRef(new Set<string>())
  useEffect(() => {
    if (!fil || !userId || !lect.data) return
    const ids = nonLus(fil).map((m) => m.id).filter((id) => !dejaMarques.current.has(id))
    if (!ids.length) return
    ids.forEach((id) => dejaMarques.current.add(id))
    ecrire.mutate(ids.map((id) => ({ op: 'upsert' as const, table: 'lectures', ligne: { message_id: id, user_id: userId, lu_le: new Date().toISOString() }, onConflict: 'message_id,user_id' })))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fil?.racine.id, fil?.reponses.length, lect.data, userId])

  if (msgs.isLoading || eleves.isLoading) return <Chargement />
  if (msgs.error) return <Erreur message={(msgs.error as Error).message} />

  return (
    <div>
      <div className={clsx(fil && 'hidden lg:block')}>
        <Entete titre="Carnet" actions={<>
          {fils.length > 0 && (
            <button type="button" onClick={() => setFiltre(filtre === 'alire' ? 'tout' : 'alire')} aria-pressed={filtre === 'alire'}
              title={filtre === 'alire' ? 'Tout afficher' : 'Seulement les non lus'}
              className={clsx('relative inline-flex size-10 items-center justify-center rounded-full border transition',
                filtre === 'alire' ? 'border-encre bg-encre text-white' : 'border-trait bg-white text-encre')}>
              <Inbox className="size-5" />
              {aLire.length > 0 && <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-alerte px-1 text-center text-[11px] font-semibold leading-5 text-white">{aLire.length}</span>}
            </button>
          )}
          <BoutonIcone icone={PenLine} label="Nouveau mot" variante="primaire" onClick={() => setNouveau(true)} />
        </>} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(300px,380px)_1fr]">
        <section className={clsx('min-w-0', fil && 'hidden lg:block')}>
          {visibles.length === 0 ? (
            <Vide icone={filtre === 'alire' ? Inbox : MessagesSquare} texte={filtre === 'alire' ? 'Tout est lu' : 'Aucun mot'}
              action={filtre === 'tout' ? <BoutonIcone icone={PenLine} label="Écrire un mot" variante="primaire" onClick={() => setNouveau(true)} /> : undefined} />
          ) : (
            <ul className="flex flex-col gap-2">
              {visibles.map((f) => (
                <li key={f.racine.id}>
                  <LigneFil f={f} eleve={f.racine.eleve_id ? elevesParId.get(f.racine.eleve_id) : null}
                    nonLus={nonLus(f).length} actif={f.racine.id === ouvert} nbEleves={(eleves.data ?? []).filter((e) => e.actif).length}
                    lectures={lectures.get(f.racine.id) ?? []} onOuvrir={() => setOuvert(f.racine.id)} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="min-w-0">
          {fil ? (
            <VueFil fil={fil} classeId={classe.id} eleves={eleves.data ?? []} elevesParId={elevesParId}
              lectures={lectures.get(fil.racine.id) ?? []} parents={parents.data ?? []} onRetour={() => setOuvert(null)} />
          ) : (
            <div className="hidden h-full min-h-[320px] items-center justify-center rounded-3xl border-2 border-dashed border-trait lg:flex">
              <MessagesSquare className="size-10 text-trait" />
            </div>
          )}
        </section>
      </div>

      <NouveauMotProf ouvert={nouveau} onFermer={() => setNouveau(false)} classeId={classe.id} eleves={eleves.data ?? []}
        onEnvoye={(id) => setOuvert(id)} />
    </div>
  )
}

function LigneFil({ f, eleve, nonLus, actif, onOuvrir, lectures, nbEleves }: {
  f: Fil; eleve: Eleve | null | undefined; nonLus: number; actif: boolean; onOuvrir: () => void; lectures: Lecture[]; nbEleves: number
}) {
  const dernier = f.reponses[f.reponses.length - 1] ?? f.racine
  const classeEntiere = !f.racine.eleve_id
  const signes = new Set(lectures.filter((l) => l.signe_le && l.eleve_id).map((l) => l.eleve_id)).size
  const signature = f.racine.a_signer
    ? classeEntiere
      ? { etat: signes >= nbEleves ? 'signe' as const : 'attente' as const, texte: `${signes}/${nbEleves}` }
      : { etat: signes ? 'signe' as const : 'attente' as const }
    : null
  return (
    <CarteFil
      titre={classeEntiere ? titreFil(f.racine) : eleve?.prenom ?? 'Famille'}
      apercu={(!classeEntiere && f.racine.titre && dernier === f.racine ? `${f.racine.titre} · ` : '') + dernier.texte}
      eleve={eleve} classe={classeEntiere} date={quand(f.dernier.slice(0, 10))}
      actif={actif} nonLus={nonLus} signature={signature} onClick={onOuvrir} />
  )
}

function VueFil({ fil, classeId, eleves, elevesParId, lectures, parents, onRetour }: {
  fil: Fil; classeId: string; eleves: Eleve[]; elevesParId: Map<string, Eleve>; lectures: Lecture[]; parents: ParentLien[]; onRetour: () => void
}) {
  const ecrire = useEcrire()
  const toast = useToast()
  const { demander, fenetre } = useConfirmation()
  const { racine, reponses } = fil
  const classeEntiere = !racine.eleve_id
  const eleve = racine.eleve_id ? elevesParId.get(racine.eleve_id) : null

  const repondre = async (eleveId: string, texte: string) => {
    try {
      await ecrire.mutateAsync({ op: 'insert', table: 'messages', ligne: { classe_id: classeId, eleve_id: eleveId, racine_id: racine.id, texte } })
    } catch (e) { toast((e as Error).message, 'erreur') }
  }
  const supprimer = () => demander('Supprimer ce fil et toutes ses réponses ?', async () => {
    try {
      await ecrire.mutateAsync({ op: 'delete', table: 'messages', id: racine.id })
      toast('Fil supprimé'); onRetour()
    } catch (e) { toast((e as Error).message, 'erreur') }
  })

  // Réponses à une annonce de classe : une conversation par famille
  const groupes = useMemo(() => {
    const g = new Map<string, Message[]>()
    for (const m of reponses) {
      const k = m.eleve_id ?? '—'
      g.set(k, [...(g.get(k) ?? []), m])
    }
    return [...g.entries()]
  }, [reponses])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <BoutonIcone icone={ArrowLeft} label="Retour" onClick={onRetour} className="lg:hidden" />
        <Avatar eleve={eleve} classe={classeEntiere} />
        <h2 className="min-w-0 flex-1 truncate text-xl font-bold text-encre">{classeEntiere ? titreFil(racine) : eleve?.prenom ?? 'Famille'}</h2>
        <BoutonIcone icone={Trash2} label="Supprimer le fil" onClick={supprimer} />
      </div>

      <div className="flex flex-col gap-3 rounded-3xl bg-encre/[.03] p-3 sm:p-4">
        <Bulle m={racine} moi={racine.auteur_role === 'enseignant'} />
        {racine.a_signer && <Signatures racine={racine} eleves={eleves} lectures={lectures} parents={parents} />}

        {classeEntiere ? (
          groupes.map(([eleveId, liste]) => {
            const e = elevesParId.get(eleveId)
            return (
              <div key={eleveId} className="flex flex-col gap-3 rounded-3xl p-3" style={{ background: fondTeinte(eleveId) }}>
                <p className="flex items-center gap-2 font-semibold text-encre">
                  <span className="flex size-7 items-center justify-center rounded-lg bg-white font-titre text-sm" style={{ color: teinte(eleveId) }}>{e?.prenom.slice(0, 1) ?? '?'}</span>
                  {e?.prenom ?? '…'}
                </p>
                {liste.map((m) => <Bulle key={m.id} m={m} moi={m.auteur_role === 'enseignant'} />)}
                {e && <ZoneReponse placeholder={`Répondre à ${e.prenom}…`} onEnvoyer={(t) => repondre(e.id, t)} enCours={ecrire.isPending} />}
              </div>
            )
          })
        ) : (
          reponses.map((m) => <Bulle key={m.id} m={m} moi={m.auteur_role === 'enseignant'} />)
        )}
      </div>

      {!classeEntiere && racine.eleve_id && (
        <ZoneReponse onEnvoyer={(t) => repondre(racine.eleve_id!, t)} enCours={ecrire.isPending} />
      )}
      {fenetre}
    </div>
  )
}
