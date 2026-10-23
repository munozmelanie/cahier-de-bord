import { ArrowLeft, Check, MessagesSquare, PenLine, Signature } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Bulle, CarteFil, construireFils, indexLectures, titreFil, ZoneReponse, type Fil } from '../../components/carnet/fils'
import { NouveauMotFamille } from '../../components/carnet/NouveauMot'
import { Bouton, BoutonIcone, Chargement, Erreur, useToast, Vide } from '../../components/ui'
import { fmtDateHeure, quand } from '../../lib/dates'
import { useEcrire, useLectures, useMessages } from '../../lib/donnees'
import { useSession } from '../../lib/session'
import type { Eleve, Lecture, Message } from '../../lib/types'

export default function CarnetParent() {
  const { userId, enfant, classe } = useSession()
  const msgs = useMessages()
  const lect = useLectures()
  const ecrire = useEcrire()
  const [ouvert, setOuvert] = useState<string | null>(null)
  const [nouveau, setNouveau] = useState(false)

  // Fils de l'enfant choisi : annonces à la classe + fils de sa famille ; réponses de sa famille seulement
  const fils = useMemo(() => {
    if (!enfant) return []
    const pourMoi = (msgs.data ?? []).filter((m) =>
      m.racine_id ? m.eleve_id === enfant.id : m.eleve_id === null || m.eleve_id === enfant.id)
    return construireFils(pourMoi)
  }, [msgs.data, enfant])
  const lectures = useMemo(() => indexLectures(lect.data), [lect.data])
  const maLecture = (m: Message) => (lectures.get(m.id) ?? []).find((l) => l.user_id === userId)
  const nonLus = (f: Fil) => [f.racine, ...f.reponses].filter((m) => m.auteur_role === 'enseignant' && !maLecture(m))
  const fil = fils.find((f) => f.racine.id === ouvert) ?? null

  const dejaMarques = useRef(new Set<string>())
  useEffect(() => {
    if (!fil || !userId || !enfant || !lect.data) return
    const ids = nonLus(fil).map((m) => m.id).filter((id) => !dejaMarques.current.has(id))
    if (!ids.length) return
    ids.forEach((id) => dejaMarques.current.add(id))
    ecrire.mutate(ids.map((id) => ({
      op: 'upsert' as const, table: 'lectures', onConflict: 'message_id,user_id',
      ligne: { message_id: id, user_id: userId, eleve_id: enfant.id, lu_le: new Date().toISOString() },
    })))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fil?.racine.id, fil?.reponses.length, lect.data, userId, enfant?.id])

  if (!enfant || !classe) return null
  if (msgs.isLoading) return <Chargement />
  if (msgs.error) return <Erreur message={(msgs.error as Error).message} />

  if (fil) {
    return <VueFil fil={fil} enfant={enfant} classeId={classe.id} maLecture={maLecture(fil.racine)} onRetour={() => setOuvert(null)} />
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-encre">Carnet</h1>
        <BoutonIcone icone={PenLine} label="Écrire à l'enseignante" variante="primaire" onClick={() => setNouveau(true)} />
      </div>
      {fils.length === 0 ? (
        <Vide icone={MessagesSquare} texte="Aucun mot" />
      ) : (
        <ul className="flex flex-col gap-2">
          {fils.map((f) => {
            const dernier = f.reponses[f.reponses.length - 1] ?? f.racine
            const signe = !!maLecture(f.racine)?.signe_le
            return (
              <li key={f.racine.id}>
                <CarteFil titre={titreFil(f.racine)} apercu={dernier.texte} eleve={f.racine.eleve_id ? enfant : null} classe={!f.racine.eleve_id}
                  date={quand(f.dernier.slice(0, 10))} nonLus={nonLus(f).length}
                  signature={f.racine.a_signer ? { etat: signe ? 'signe' : 'attente' } : null}
                  onClick={() => setOuvert(f.racine.id)} />
              </li>
            )
          })}
        </ul>
      )}
      <NouveauMotFamille ouvert={nouveau} onFermer={() => setNouveau(false)} classeId={classe.id} eleveId={enfant.id} onEnvoye={(id) => setOuvert(id)} />
    </div>
  )
}

function VueFil({ fil, enfant, classeId, maLecture, onRetour }: {
  fil: Fil; enfant: Eleve; classeId: string; maLecture: Lecture | undefined; onRetour: () => void
}) {
  const { userId } = useSession()
  const ecrire = useEcrire()
  const toast = useToast()
  const { racine, reponses } = fil

  const signer = async () => {
    try {
      const maintenant = new Date().toISOString()
      await ecrire.mutateAsync({
        op: 'upsert', table: 'lectures', onConflict: 'message_id,user_id',
        ligne: { message_id: racine.id, user_id: userId, eleve_id: enfant.id, lu_le: maLecture?.lu_le ?? maintenant, signe_le: maintenant },
      })
      toast('Signé')
    } catch (e) { toast((e as Error).message, 'erreur') }
  }
  const repondre = async (texte: string) => {
    try {
      await ecrire.mutateAsync({ op: 'insert', table: 'messages', ligne: { classe_id: classeId, eleve_id: enfant.id, racine_id: racine.id, texte } })
    } catch (e) { toast((e as Error).message, 'erreur') }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <BoutonIcone icone={ArrowLeft} label="Retour" onClick={onRetour} />
        <h1 className="min-w-0 flex-1 truncate text-xl font-bold text-encre">{titreFil(racine)}</h1>
      </div>
      <div className="flex flex-col gap-3 rounded-3xl bg-encre/[.03] p-3">
        <Bulle m={racine} moi={racine.auteur_id === userId} />
        {racine.a_signer && (
          <div className="flex justify-center py-1">
            {maLecture?.signe_le ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-succes px-3 py-1.5 text-sm font-semibold text-white">
                <Check className="size-4" strokeWidth={3} />{fmtDateHeure(maLecture.signe_le)}
              </span>
            ) : (
              <Bouton icone={Signature} taille="l" onClick={signer} enCours={ecrire.isPending} className="bg-succes hover:bg-succes hover:brightness-95">
                Signer
              </Bouton>
            )}
          </div>
        )}
        {reponses.map((m) => <Bulle key={m.id} m={m} moi={m.auteur_id === userId} />)}
      </div>
      <ZoneReponse onEnvoyer={repondre} enCours={ecrire.isPending} />
    </div>
  )
}
