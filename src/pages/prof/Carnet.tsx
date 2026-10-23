import clsx from 'clsx'
import { ArrowLeft, Inbox, MessagesSquare, PenLine, Signature, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Avatar, Bulle, construireFils, indexLectures, titreFil, ZoneReponse, type Fil } from '../../components/carnet/fils'
import { NouveauMotProf } from '../../components/carnet/NouveauMot'
import { Signatures } from '../../components/carnet/Signatures'
import { Badge, Bouton, BoutonIcone, Chargement, Entete, Erreur, Onglets, useConfirmation, useToast, Vide } from '../../components/ui'
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
        <Entete titre="Carnet de liaison" actions={<Bouton icone={PenLine} onClick={() => setNouveau(true)}>Nouveau mot</Bouton>} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(300px,380px)_1fr]">
        <section className={clsx('min-w-0', fil && 'hidden lg:block')}>
          {fils.length > 0 && (
            <div className="mb-3">
              <Onglets valeur={filtre} onChange={setFiltre} options={[
                { id: 'tout', label: 'Tout', icone: MessagesSquare },
                { id: 'alire', label: `À lire${aLire.length ? ` (${aLire.length})` : ''}`, icone: Inbox },
              ]} />
            </div>
          )}
          {visibles.length === 0 ? (
            <Vide icone={MessagesSquare} texte={filtre === 'alire' ? 'Tout est lu.' : 'Aucun mot pour le moment.'}
              action={filtre === 'tout' ? <Bouton icone={PenLine} onClick={() => setNouveau(true)}>Écrire un mot</Bouton> : undefined} />
          ) : (
            <ul className="flex flex-col gap-2">
              {visibles.map((f) => (
                <LigneFil key={f.racine.id} f={f} eleve={f.racine.eleve_id ? elevesParId.get(f.racine.eleve_id) : null}
                  nonLus={nonLus(f).length} actif={f.racine.id === ouvert} nbEleves={(eleves.data ?? []).filter((e) => e.actif).length}
                  lectures={lectures.get(f.racine.id) ?? []} onOuvrir={() => setOuvert(f.racine.id)} />
              ))}
            </ul>
          )}
        </section>

        <section className="min-w-0">
          {fil ? (
            <VueFil fil={fil} classeId={classe.id} eleves={eleves.data ?? []} elevesParId={elevesParId}
              lectures={lectures.get(fil.racine.id) ?? []} parents={parents.data ?? []} onRetour={() => setOuvert(null)} />
          ) : (
            <div className="hidden h-full min-h-[320px] items-center justify-center rounded-[28px] border-2 border-dashed border-trait lg:flex">
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
  return (
    <li>
      <button onClick={onOuvrir}
        className={clsx('flex w-full items-center gap-3 rounded-3xl p-3 text-left transition',
          actif ? 'bg-white shadow-doux ring-2 ring-bateau' : 'bg-white/70 hover:bg-white')}>
        <Avatar eleve={eleve} classe={classeEntiere} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className={clsx('truncate text-encre', nonLus ? 'font-bold' : 'font-bold text-encre/80')}>
              {classeEntiere ? titreFil(f.racine) : eleve?.prenom ?? 'Famille'}
            </span>
            <span className="ml-auto shrink-0 text-xs text-brume">{quand(f.dernier.slice(0, 10))}</span>
          </span>
          <span className="mt-0.5 flex items-center gap-2">
            <span className={clsx('min-w-0 flex-1 truncate text-sm', nonLus ? 'text-encre' : 'text-brume')}>
              {!classeEntiere && f.racine.titre ? `${f.racine.titre} — ` : ''}{dernier.texte}
            </span>
            {f.racine.a_signer && (
              <Badge couleur={classeEntiere ? (signes >= nbEleves ? 'succes' : 'ambre') : signes ? 'succes' : 'ambre'}>
                <Signature className="size-3" />{classeEntiere ? `${signes}/${nbEleves}` : signes ? 'Signé' : 'À signer'}
              </Badge>
            )}
            {nonLus > 0 && <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-alerte text-[11px] font-bold text-white">{nonLus}</span>}
          </span>
        </span>
      </button>
    </li>
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
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-titre text-2xl font-semibold text-encre">{classeEntiere ? titreFil(racine) : eleve?.prenom ?? 'Famille'}</h2>
          <p className="truncate text-sm text-brume">{classeEntiere ? 'Toute la classe' : `Famille de ${eleve?.prenom ?? '…'}`}</p>
        </div>
        <BoutonIcone icone={Trash2} label="Supprimer le fil" onClick={supprimer} />
      </div>

      <div className="flex flex-col gap-3 rounded-[28px] bg-[#EEF2FB] p-3 sm:p-4">
        <Bulle m={racine} moi={racine.auteur_role === 'enseignant'} />
        {racine.a_signer && <Signatures racine={racine} eleves={eleves} lectures={lectures} parents={parents} />}

        {classeEntiere ? (
          groupes.map(([eleveId, liste]) => {
            const e = elevesParId.get(eleveId)
            return (
              <div key={eleveId} className="flex flex-col gap-3 rounded-3xl bg-white/60 p-3">
                <p className="flex items-center gap-2 text-sm font-bold text-brume">
                  <span className="size-2 rounded-full" style={{ background: '#2E5BFF' }} /> Famille de {e?.prenom ?? '…'}
                </p>
                {liste.map((m) => <Bulle key={m.id} m={m} moi={m.auteur_role === 'enseignant'} />)}
                {e && <ZoneReponse placeholder={`Répondre à la famille de ${e.prenom}…`} onEnvoyer={(t) => repondre(e.id, t)} enCours={ecrire.isPending} />}
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
