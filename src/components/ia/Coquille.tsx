// Les 3 étapes du copier-coller : copier la demande, coller la réponse, vérifier puis ajouter
import clsx from 'clsx'
import { Check, ClipboardPaste, Copy, ExternalLink, Eye } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Bouton, Chargement, Erreur, Feuille, Texte, useToast } from '../ui'

function Numero({ n, fait }: { n: number; fait?: boolean }) {
  return (
    <span className={clsx('flex size-8 shrink-0 items-center justify-center rounded-full font-titre text-base font-semibold',
      fait ? 'bg-succes text-white' : 'bg-bateau text-white')}>
      {fait ? <Check className="size-4" strokeWidth={3} /> : n}
    </span>
  )
}

export function Coquille<T>({ titre, pret, construire, options, analyser, apercu, importer, onFermer }: {
  titre: string
  pret: boolean
  construire: (precisions: string) => string
  options?: ReactNode
  analyser: (texte: string) => T
  apercu: (t: T) => ReactNode
  importer: (t: T) => Promise<string>
  onFermer: () => void
}) {
  const toast = useToast()
  const [precisions, setPrecisions] = useState('')
  const [copie, setCopie] = useState(false)
  const [voir, setVoir] = useState(false)
  const [reponse, setReponse] = useState('')
  const [lu, setLu] = useState<T | null>(null)
  const [erreur, setErreur] = useState('')
  const [enCours, setEnCours] = useState(false)
  const zone = useRef<HTMLTextAreaElement>(null)

  const prompt = pret ? construire(precisions) : ''
  useEffect(() => { setCopie(false) }, [prompt])

  async function copier() {
    try {
      await navigator.clipboard.writeText(prompt)
      setCopie(true)
      toast('Demande copiée')
    } catch {
      setVoir(true)
      setTimeout(() => { zone.current?.focus(); zone.current?.select() }, 50)
      toast('Sélectionne le texte et copie-le', 'erreur')
    }
  }

  function lire() {
    setErreur('')
    try { setLu(analyser(reponse)) } catch (e) { setLu(null); setErreur((e as Error).message) }
  }

  async function ajouter() {
    if (!lu) return
    setEnCours(true)
    try {
      const msg = await importer(lu)
      toast(msg)
      onFermer()
    } catch (e) {
      setErreur((e as Error).message)
    } finally {
      setEnCours(false)
    }
  }

  return (
    <Feuille ouverte onFermer={onFermer} titre={titre} large
      pied={lu ? <Bouton icone={Check} onClick={ajouter} enCours={enCours}>Ajouter au cahier</Bouton> : undefined}>
      {!pret ? <Chargement /> : (
        <div className="flex flex-col gap-5">
          <section className="flex flex-col gap-3 rounded-3xl bg-white p-4">
            <div className="flex items-center gap-3">
              <Numero n={1} fait={copie} />
              <h3 className="font-titre text-lg font-semibold">Copier la demande</h3>
            </div>
            {options}
            <Texte value={precisions} onChange={(e) => setPrecisions(e.target.value)} placeholder="Précisions (facultatif)" aria-label="Précisions" />
            <div className="flex flex-wrap gap-2">
              <Bouton icone={copie ? Check : Copy} onClick={copier}>{copie ? 'Copiée' : 'Copier la demande'}</Bouton>
              <a href="https://chatgpt.com/" target="_blank" rel="noreferrer"
                className="inline-flex h-10 items-center gap-2 rounded-full border border-trait bg-white px-4 font-bold text-encre hover:border-brume/40">
                <ExternalLink className="size-4" /> ChatGPT
              </a>
              <a href="https://claude.ai/new" target="_blank" rel="noreferrer"
                className="inline-flex h-10 items-center gap-2 rounded-full border border-trait bg-white px-4 font-bold text-encre hover:border-brume/40">
                <ExternalLink className="size-4" /> Claude
              </a>
              <Bouton variante="fantome" icone={Eye} onClick={() => setVoir((v) => !v)}>{voir ? 'Masquer' : 'Voir'}</Bouton>
            </div>
            {voir && (
              <textarea ref={zone} readOnly value={prompt} aria-label="Demande à copier"
                className="h-56 w-full rounded-xl border border-trait bg-papier p-3 font-mono text-xs leading-relaxed text-encre" />
            )}
          </section>

          <section className="flex flex-col gap-3 rounded-3xl bg-white p-4">
            <div className="flex items-center gap-3">
              <Numero n={2} fait={!!lu} />
              <h3 className="font-titre text-lg font-semibold">Coller la réponse</h3>
            </div>
            <Texte value={reponse} onChange={(e) => { setReponse(e.target.value); setLu(null) }}
              placeholder="Colle ici la réponse de ChatGPT ou de Claude" aria-label="Réponse" className="min-h-[7rem] font-mono text-xs" />
            <div><Bouton variante="doux" icone={ClipboardPaste} onClick={lire} disabled={!reponse.trim()}>Lire la réponse</Bouton></div>
            {erreur && <Erreur message={erreur} />}
          </section>

          {lu && (
            <section className="flex flex-col gap-3 rounded-3xl bg-white p-4">
              <div className="flex items-center gap-3">
                <Numero n={3} />
                <h3 className="font-titre text-lg font-semibold">Vérifier</h3>
              </div>
              {apercu(lu)}
            </section>
          )}
        </div>
      )}
    </Feuille>
  )
}
