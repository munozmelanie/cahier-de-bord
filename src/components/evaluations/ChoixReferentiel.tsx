import clsx from 'clsx'
import { Check, Search, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { BoutonIcone, Saisie } from '../ui'
import { matiere } from '../../lib/matieres'
import { REFERENTIEL_LSU, type ElementProgramme, type SousDomaine } from '../../lib/referentielLsu'
import { DOMAINE_COURT, ICONE_LSU, NOM_COURT_LSU } from '../lsu/outils'

const normaliser = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Choisir des compétences dans le référentiel du LSU (filtré sur la matière de l'évaluation) */
export function ChoixReferentiel({ matiereLsu, choisis, onBasculer, onFermer }: {
  matiereLsu: string | null | undefined
  choisis: Set<string>
  onBasculer: (el: ElementProgramme, sd: SousDomaine) => void
  onFermer: () => void
}) {
  const [recherche, setRecherche] = useState('')
  const [tout, setTout] = useState(!matiereLsu)
  useEffect(() => setTout(!matiereLsu), [matiereLsu])
  const filtre = tout || !matiereLsu ? null : matiereLsu

  const groupes = useMemo(() => {
    const q = normaliser(recherche.trim())
    return REFERENTIEL_LSU
      .filter((m) => !filtre || m.matiere === filtre)
      .flatMap((m) => m.sousDomaines.map((sd) => ({
        m, sd, elements: q ? sd.elements.filter((el) => normaliser(el.libelle).includes(q)) : sd.elements,
      })))
      .filter((g) => g.elements.length)
  }, [recherche, filtre])

  return (
    <div className="flex flex-col gap-2 rounded-2xl border-2 border-bateau-clair bg-white p-2.5">
      <div className="flex items-center gap-2">
        <span className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-brume" />
          <Saisie value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Chercher" aria-label="Chercher dans le référentiel"
            className="py-2 pl-9" autoFocus />
        </span>
        {matiereLsu && (
          <span className="flex shrink-0 rounded-full bg-papier p-0.5 text-sm font-semibold">
            {[{ v: false, l: NOM_COURT_LSU[matiereLsu] ?? matiereLsu }, { v: true, l: 'Tout' }].map((o) => (
              <button key={o.l} type="button" onClick={() => setTout(o.v)} aria-pressed={tout === o.v}
                className={clsx('rounded-full px-3 py-1.5 transition', tout === o.v ? 'bg-white text-bateau-fonce shadow-sm' : 'text-brume hover:text-encre')}>
                {o.l}
              </button>
            ))}
          </span>
        )}
        <BoutonIcone icone={X} label="Fermer le référentiel" onClick={onFermer} />
      </div>

      <div className="flex max-h-80 flex-col gap-3 overflow-y-auto pr-1">
        {groupes.map(({ m, sd, elements }) => {
          const mat = matiere(ICONE_LSU[m.matiere])
          const Icone = mat.icone
          const nomSd = m.sousDomaines.length > 1 ? (DOMAINE_COURT[sd.id] ?? sd.nom) : null
          return (
            <div key={sd.id} className="flex flex-col gap-1">
              <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: mat.couleur }} title={sd.nom}>
                <Icone className="size-3.5" strokeWidth={2.4} />
                {filtre ? (nomSd ?? NOM_COURT_LSU[m.matiere]) : [NOM_COURT_LSU[m.matiere] ?? m.nom, nomSd].filter(Boolean).join(' · ')}
              </span>
              {elements.map((el) => {
                const pris = choisis.has(el.libelle)
                return (
                  <button key={el.id} type="button" onClick={() => onBasculer(el, sd)} aria-pressed={pris}
                    className={clsx('flex items-start gap-2 rounded-xl px-2.5 py-2 text-left text-sm leading-snug transition',
                      pris ? 'font-semibold text-encre' : 'text-encre hover:bg-papier')}
                    style={pris ? { background: mat.fond } : undefined}>
                    <span className={clsx('mt-px flex size-5 shrink-0 items-center justify-center rounded-full border-2', pris ? 'text-white' : 'bg-white')}
                      style={{ borderColor: mat.couleur, background: pris ? mat.couleur : undefined }}>
                      {pris && <Check className="size-3" strokeWidth={3.5} />}
                    </span>
                    <span>{el.libelle}</span>
                  </button>
                )
              })}
            </div>
          )
        })}
        {!groupes.length && <p className="py-4 text-center text-sm text-brume">Aucun résultat</p>}
      </div>
    </div>
  )
}
