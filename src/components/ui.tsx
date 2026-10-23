import clsx from 'clsx'
import { ChevronLeft, ChevronRight, Loader2, X, type LucideIcon } from 'lucide-react'
import {
  createContext, useCallback, useContext, useEffect, useId, useRef, useState,
  type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes,
} from 'react'
import { MATIERES, matiere } from '../lib/matieres'

// ───────────── Boutons ─────────────

type Variante = 'primaire' | 'secondaire' | 'fantome' | 'danger' | 'doux'
const VARIANTES: Record<Variante, string> = {
  primaire: 'bg-bateau text-white hover:bg-bateau-fonce shadow-sm',
  secondaire: 'bg-white text-encre border border-trait hover:bg-papier',
  fantome: 'text-encre hover:bg-encre/5',
  danger: 'bg-alerte text-white hover:brightness-95',
  doux: 'bg-bateau-clair text-bateau-fonce hover:bg-bateau/10',
}

export function Bouton({
  variante = 'primaire', icone: Icone, enCours, taille = 'm', className, children, ...p
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante; icone?: LucideIcon; enCours?: boolean; taille?: 's' | 'm' | 'l' }) {
  return (
    <button
      {...p}
      disabled={p.disabled || enCours}
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bateau disabled:opacity-50',
        taille === 's' && 'h-8 px-3 text-sm', taille === 'm' && 'h-10 px-4 text-[15px]', taille === 'l' && 'h-12 px-6 text-base',
        VARIANTES[variante], className,
      )}
    >
      {enCours ? <Loader2 className="size-4 animate-spin" /> : Icone ? <Icone className={taille === 'l' ? 'size-5' : 'size-4'} /> : null}
      {children}
    </button>
  )
}

export function BoutonIcone({
  icone: Icone, label, variante = 'fantome', className, actif, ...p
}: ButtonHTMLAttributes<HTMLButtonElement> & { icone: LucideIcon; label: string; variante?: Variante; actif?: boolean }) {
  return (
    <button
      {...p}
      aria-label={label}
      title={label}
      className={clsx(
        'inline-flex size-9 shrink-0 items-center justify-center rounded-xl transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-bateau disabled:opacity-40',
        VARIANTES[variante], actif && 'bg-bateau-clair text-bateau', className,
      )}
    >
      <Icone className="size-[18px]" />
    </button>
  )
}

// ───────────── Matières ─────────────

export function PastilleMatiere({ id, taille = 'm', pause }: { id: string | null | undefined; taille?: 's' | 'm' | 'l'; pause?: boolean }) {
  const m = matiere(id)
  const Icone = m.icone
  return (
    <span
      className={clsx('inline-flex shrink-0 items-center justify-center rounded-2xl',
        taille === 's' && 'size-7 rounded-lg', taille === 'm' && 'size-9 rounded-xl', taille === 'l' && 'size-12 rounded-2xl')}
      style={{ background: pause ? '#F1F3F8' : m.fond, color: pause ? '#A3ACC2' : m.couleur }}
      aria-hidden
    >
      <Icone className={clsx(taille === 's' && 'size-4', taille === 'm' && 'size-[18px]', taille === 'l' && 'size-6')} strokeWidth={2} />
    </span>
  )
}

export function EtiquetteMatiere({ id }: { id: string | null | undefined }) {
  const m = matiere(id)
  const Icone = m.icone
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold text-encre" style={{ background: m.fond }}>
      <Icone className="size-3.5" strokeWidth={2.2} style={{ color: m.couleur }} />
      {m.court}
    </span>
  )
}

export function ChoixMatiere({ valeur, onChange }: { valeur: string | null; onChange: (id: string) => void }) {
  return (
    <div className="grid grid-cols-4 gap-2 sm:grid-cols-7" role="radiogroup" aria-label="Matière">
      {MATIERES.map((m) => {
        const Icone = m.icone
        const choisi = valeur === m.id
        return (
          <button
            key={m.id}
            type="button"
            role="radio"
            aria-checked={choisi}
            onClick={() => onChange(m.id)}
            className={clsx('flex flex-col items-center gap-1 rounded-2xl border-2 p-2 text-[11px] font-semibold leading-tight transition',
              choisi ? 'border-current' : 'border-transparent hover:border-trait')}
            style={{ background: m.fond, color: m.couleur }}
          >
            <Icone className="size-5" strokeWidth={2.2} />
            <span className="text-center">{m.court}</span>
          </button>
        )
      })}
    </div>
  )
}

// ───────────── Champs ─────────────

export function Champ({ label, aide, children }: { label: string; aide?: string; children: (id: string) => ReactNode }) {
  const id = useId()
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-encre">{label}</label>
      {children(id)}
      {aide && <p className="text-xs text-brume">{aide}</p>}
    </div>
  )
}

const CHAMP = 'w-full rounded-xl border border-trait bg-white px-3 py-2.5 text-encre placeholder:text-brume/70 focus:border-bateau focus:outline-none focus:ring-2 focus:ring-bateau/20'

export const Saisie = (p: InputHTMLAttributes<HTMLInputElement>) => <input {...p} className={clsx(CHAMP, p.className)} />
export const Liste = (p: SelectHTMLAttributes<HTMLSelectElement>) => <select {...p} className={clsx(CHAMP, 'appearance-auto', p.className)} />

export function Texte(p: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    const t = ref.current
    if (!t) return
    t.style.height = 'auto'
    t.style.height = Math.min(t.scrollHeight + 2, 420) + 'px'
  }, [p.value])
  return <textarea rows={2} {...p} ref={ref} className={clsx(CHAMP, 'resize-none leading-relaxed', p.className)} />
}

export function Bascule({ actif, onChange, label }: { actif: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={actif}
      onClick={() => onChange(!actif)}
      className="flex items-center gap-3 text-left text-sm font-semibold text-encre"
    >
      <span className={clsx('relative h-6 w-11 shrink-0 rounded-full transition', actif ? 'bg-succes' : 'bg-trait')}>
        <span className={clsx('absolute top-0.5 size-5 rounded-full bg-white shadow transition-all', actif ? 'left-[22px]' : 'left-0.5')} />
      </span>
      {label}
    </button>
  )
}

// ───────────── Structure ─────────────

export function Entete({ titre, sousTitre, actions, retour }: { titre: ReactNode; sousTitre?: ReactNode; actions?: ReactNode; retour?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
      <div className="min-w-0">
        {retour}
        <h1 className="text-2xl font-bold leading-tight tracking-[-0.01em] text-encre sm:text-[28px]" style={{ textWrap: 'balance' } as any}>{titre}</h1>
        {sousTitre && <div className="mt-1 text-sm text-brume">{sousTitre}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}

export function NavPas({ label, precedent, suivant, auMilieu }: { label: ReactNode; precedent: () => void; suivant: () => void; auMilieu?: () => void }) {
  return (
    <div className="inline-flex h-10 items-center gap-0.5 rounded-xl border border-trait bg-white px-0.5">
      <BoutonIcone icone={ChevronLeft} label="Précédent" onClick={precedent} className="size-8 rounded-lg" />
      <button type="button" onClick={auMilieu} className="min-w-[7rem] px-2 text-center text-sm font-semibold text-encre">{label}</button>
      <BoutonIcone icone={ChevronRight} label="Suivant" onClick={suivant} className="size-8 rounded-lg" />
    </div>
  )
}

export function Onglets<T extends string>({ valeur, options, onChange }: { valeur: T; options: { id: T; label: string; icone?: LucideIcon }[]; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex h-10 max-w-full items-center gap-0.5 overflow-x-auto rounded-xl bg-encre/[.05] p-1" role="tablist">
      {options.map((o) => {
        const Icone = o.icone
        return (
          <button
            key={o.id}
            role="tab"
            aria-selected={valeur === o.id}
            onClick={() => onChange(o.id)}
            className={clsx('inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition',
              valeur === o.id ? 'bg-white text-encre shadow-sm' : 'text-brume hover:text-encre')}
          >
            {Icone && <Icone className="size-4" />}
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

/** Onglets soulignés, pour changer de vue dans une page */
export function OngletsLigne<T extends string>({ valeur, options, onChange, className }: {
  valeur: T; options: { id: T; label: string; nombre?: number }[]; onChange: (v: T) => void; className?: string
}) {
  return (
    <div className={clsx('mb-5 flex gap-1 overflow-x-auto border-b border-trait', className)} role="tablist">
      {options.map((o) => (
        <button key={o.id} type="button" role="tab" aria-selected={valeur === o.id} onClick={() => onChange(o.id)}
          className={clsx('-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3 pb-2.5 pt-1 text-sm font-semibold transition',
            valeur === o.id ? 'border-bateau text-encre' : 'border-transparent text-brume hover:text-encre')}>
          {o.label}
          {!!o.nombre && <span className="rounded-full bg-encre/[.06] px-1.5 text-xs leading-5 text-brume">{o.nombre}</span>}
        </button>
      ))}
    </div>
  )
}

export function Vide({ icone: Icone, texte, action }: { icone: LucideIcon; texte: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-trait px-6 py-12 text-center">
      <span className="flex size-11 items-center justify-center rounded-2xl bg-encre/[.05] text-brume"><Icone className="size-5" /></span>
      <p className="max-w-xs text-sm text-brume">{texte}</p>
      {action}
    </div>
  )
}

export function Chargement() {
  return (
    <div className="flex justify-center py-16 text-bateau" role="status" aria-label="Chargement">
      <Loader2 className="size-8 animate-spin" />
    </div>
  )
}

export function Erreur({ message }: { message: string }) {
  return <p className="rounded-xl bg-alerte-clair px-4 py-3 text-sm font-semibold text-alerte">{message}</p>
}

export function Badge({ children, couleur = 'bateau' }: { children: ReactNode; couleur?: 'bateau' | 'ambre' | 'succes' | 'alerte' | 'brume' }) {
  const c = {
    bateau: 'bg-bateau-clair text-bateau-fonce', ambre: 'bg-ambre-clair text-ambre-fonce', succes: 'bg-succes-clair text-succes',
    alerte: 'bg-alerte-clair text-alerte', brume: 'bg-encre/5 text-brume',
  }[couleur]
  return <span className={clsx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold', c)}>{children}</span>
}

// ───────────── Fenêtre (bas d'écran sur téléphone, centrée sur ordinateur) ─────────────

export function Feuille({ ouverte, onFermer, titre, children, pied, large }: {
  ouverte: boolean; onFermer: () => void; titre: ReactNode; children: ReactNode; pied?: ReactNode; large?: boolean
}) {
  useEffect(() => {
    if (!ouverte) return
    const f = (e: KeyboardEvent) => { if (e.key === 'Escape') onFermer() }
    window.addEventListener('keydown', f)
    const avant = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', f); document.body.style.overflow = avant }
  }, [ouverte, onFermer])
  if (!ouverte) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true">
      <button className="absolute inset-0 bg-encre/30" aria-label="Fermer" onClick={onFermer} />
      <div className={clsx('relative flex max-h-[92dvh] w-full flex-col rounded-t-3xl bg-white shadow-flotte sm:rounded-3xl', large ? 'sm:max-w-3xl' : 'sm:max-w-xl')}>
        <div className="flex items-center justify-between gap-3 px-5 pb-3 pt-4">
          <h2 className="text-lg font-bold text-encre">{titre}</h2>
          <BoutonIcone icone={X} label="Fermer" onClick={onFermer} />
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-5">{children}</div>
        {pied && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-trait px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{pied}</div>}
      </div>
    </div>
  )
}

/** Demande de confirmation intégrée (pas de boîte du navigateur) */
export function useConfirmation() {
  const [etat, setEtat] = useState<{ texte: string; ok: () => void } | null>(null)
  const demander = useCallback((texte: string, ok: () => void) => setEtat({ texte, ok }), [])
  const fenetre = (
    <Feuille ouverte={!!etat} onFermer={() => setEtat(null)} titre="Confirmer"
      pied={<>
        <Bouton variante="secondaire" onClick={() => setEtat(null)}>Annuler</Bouton>
        <Bouton variante="danger" onClick={() => { etat?.ok(); setEtat(null) }}>Confirmer</Bouton>
      </>}>
      <p className="text-encre">{etat?.texte}</p>
    </Feuille>
  )
  return { demander, fenetre }
}

// ───────────── Petits messages ─────────────

const ToastCtx = createContext<(t: string, type?: 'ok' | 'erreur') => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [liste, setListe] = useState<{ id: number; t: string; type: 'ok' | 'erreur' }[]>([])
  const toast = useCallback((t: string, type: 'ok' | 'erreur' = 'ok') => {
    const id = Date.now() + Math.random()
    setListe((l) => [...l, { id, t, type }])
    setTimeout(() => setListe((l) => l.filter((x) => x.id !== id)), type === 'erreur' ? 6000 : 2600)
  }, [])
  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-6" aria-live="polite">
        {liste.map((x) => (
          <div key={x.id} className={clsx('pointer-events-auto rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-flotte', x.type === 'ok' ? 'bg-encre' : 'bg-alerte')}>
            {x.t}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}
export const useToast = () => useContext(ToastCtx)
