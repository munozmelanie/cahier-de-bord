// Les 3 étapes du copier-coller : copier la demande, coller la réponse, vérifier puis ajouter
import clsx from 'clsx'
import { Check, ClipboardPaste, Copy, ExternalLink, Eye, ListChecks, Sparkles, type LucideIcon } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Bouton, BoutonIcone, Chargement, Erreur, Feuille, Texte, useToast } from '../ui'

const ETAPES: { icone: LucideIcon; label: string }[] = [
  { icone: Copy, label: 'Copier la demande' },
  { icone: ClipboardPaste, label: 'Coller la réponse' },
  { icone: ListChecks, label: 'Vérifier' },
]

function Etapes({ actuelle, faites, onChoisir }: { actuelle: number; faites: boolean[]; onChoisir: (i: number) => void }) {
  return (
    <div className="mb-5 flex items-center justify-center">
      {ETAPES.map((e, i) => {
        const I = faites[i] && i !== actuelle ? Check : e.icone
        const accessible = i === 0 || faites[i - 1]
        return (
          <div key={i} className="flex items-center">
            {i > 0 && <span className={clsx('h-1 w-10 rounded-full sm:w-16', faites[i - 1] ? 'bg-succes' : 'bg-trait')} />}
            <button type="button" onClick={() => accessible && onChoisir(i)} disabled={!accessible} title={e.label} aria-label={e.label} aria-current={i === actuelle}
              className={clsx('flex size-12 items-center justify-center rounded-2xl transition',
                i === actuelle ? 'bg-bateau text-white shadow-doux' : faites[i] ? 'bg-succes-clair text-succes' : 'bg-white text-brume',
                !accessible && 'opacity-50')}>
              <I className="size-6" />
            </button>
          </div>
        )
      })}
    </div>
  )
}

const LIEN = 'flex flex-col items-center gap-1.5 rounded-3xl bg-white p-3 text-sm font-bold text-encre shadow-sm transition hover:-translate-y-0.5'

export function Coquille<T>({ titre, pret, construire, options, analyser, apercu, importer, onFermer }: {
  titre: ReactNode
  pret: boolean
  construire: (precisions: string) => string
  options?: ReactNode
  analyser: (texte: string) => T
  apercu: (t: T) => ReactNode
  importer: (t: T) => Promise<string>
  onFermer: () => void
}) {
  const toast = useToast()
  const [etape, setEtape] = useState(0)
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
      setTimeout(() => setEtape(1), 400)
    } catch {
      setVoir(true)
      setTimeout(() => { zone.current?.focus(); zone.current?.select() }, 50)
      toast('Sélectionne le texte et copie-le', 'erreur')
    }
  }

  function lire() {
    setErreur('')
    try { setLu(analyser(reponse)); setEtape(2) } catch (e) { setLu(null); setErreur((e as Error).message) }
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

  const pied = etape === 0
    ? <Bouton icone={copie ? Check : Copy} onClick={copier} disabled={!pret}>{copie ? 'Copiée' : 'Copier'}</Bouton>
    : etape === 1
      ? <Bouton icone={ClipboardPaste} onClick={lire} disabled={!reponse.trim()}>Lire</Bouton>
      : <Bouton icone={Check} onClick={ajouter} enCours={enCours} disabled={!lu}>Ajouter</Bouton>

  return (
    <Feuille ouverte onFermer={onFermer} large pied={pied}
      titre={<span className="inline-flex items-center gap-2"><Sparkles className="size-5 text-bateau" />{titre}</span>}>
      {!pret ? <Chargement /> : (
        <>
          <Etapes actuelle={etape} faites={[copie, !!lu, false]} onChoisir={setEtape} />

          {etape === 0 && (
            <div className="flex flex-col gap-3">
              {options}
              <Texte value={precisions} onChange={(e) => setPrecisions(e.target.value)} placeholder="Précisions (facultatif)" aria-label="Précisions" />
              <div className="flex items-center gap-2">
                <BoutonIcone icone={Eye} label={voir ? 'Masquer la demande' : 'Voir la demande'} actif={voir} onClick={() => setVoir((v) => !v)} />
                <span className="text-xs font-bold text-brume">{Math.round(prompt.length / 100) / 10} k</span>
              </div>
              {voir && (
                <textarea ref={zone} readOnly value={prompt} aria-label="Demande à copier"
                  className="h-56 w-full rounded-xl border border-trait bg-papier p-3 font-mono text-xs leading-relaxed text-encre" />
              )}
            </div>
          )}

          {etape === 1 && (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <a href="https://chatgpt.com/" target="_blank" rel="noreferrer" className={LIEN}>
                  <span className="flex size-11 items-center justify-center rounded-2xl bg-[#E1F6EA] text-[#13A35B]"><ExternalLink className="size-5" /></span>
                  ChatGPT
                </a>
                <a href="https://claude.ai/new" target="_blank" rel="noreferrer" className={LIEN}>
                  <span className="flex size-11 items-center justify-center rounded-2xl bg-[#FFEEDF] text-[#F2711C]"><ExternalLink className="size-5" /></span>
                  Claude
                </a>
              </div>
              <Texte value={reponse} onChange={(e) => { setReponse(e.target.value); setLu(null) }} autoFocus
                placeholder="Colle la réponse ici" aria-label="Réponse" className="min-h-[9rem] font-mono text-xs" />
              {erreur && <Erreur message={erreur} />}
            </div>
          )}

          {etape === 2 && lu && (
            <div className="flex flex-col gap-3">
              {apercu(lu)}
              {erreur && <Erreur message={erreur} />}
            </div>
          )}
        </>
      )}
    </Feuille>
  )
}
