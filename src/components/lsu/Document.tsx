import clsx from 'clsx'
import { format, parseISO } from 'date-fns'
import { Fragment, type ReactNode } from 'react'
import { NIVEAUX } from '../../lib/matieres'
import { BLOCS_LSU } from '../../lib/referentielLsu'
import type { BilanLsu, Classe, Eleve, LsuClasse } from '../../lib/types'
import { elementsDuDomaine, lireParcours, PARCOURS } from './outils'

// Présentation du bilan périodique du LSU : tableau à quatre colonnes grisées, X dans la colonne du niveau.

/** Fond des colonnes, du plus clair (non atteints) au plus foncé (dépassés), comme sur le livret officiel */
export const GRIS = ['#FFFFFF', '#ECEEF1', '#D9DCE2', '#BFC4CC']
export const COLONNES_LIVRET = ['Non atteints', 'Partiellement atteints', 'Atteints', 'Dépassés']
const TRAIT = 'border border-[#C3C8D0]'
const dateCourte = (s: string | null | undefined) => (s ? format(parseISO(s), 'dd/MM/yyyy') : '')

/** En-tête : école, cycle, élève, période */
export function EnTeteLivret({ classe, bilan, eleve, nbBilans }: { classe: Pick<Classe, 'nom' | 'ecole' | 'ville' | 'annee' | 'enseignant_nom'>; bilan: BilanLsu; eleve: Pick<Eleve, 'prenom' | 'nom'>; nbBilans: number }) {
  const annee = classe.annee || `${bilan.debut.slice(0, 4)}-${Number(bilan.debut.slice(0, 4)) + 1}`
  const cycles: [string, string[]][] = [['2', ['CP', 'CE1', 'CE2']], ['3', ['CM1', 'CM2', '6e']], ['4', ['5e', '4e', '3e']]]
  return (
    <div className="flex flex-col gap-5 text-sm text-encre">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="leading-snug">
          {classe.ecole && <p className="font-semibold">{classe.ecole}</p>}
          {classe.ville && <p>{classe.ville}</p>}
        </div>
        <div className="grid grid-cols-[auto_repeat(3,2.75rem)] overflow-hidden rounded-md text-center text-xs font-semibold" aria-label="Cycle 3, CM1">
          {cycles.map(([c, niveaux]) => (
            <Fragment key={c}>
              <span className={clsx('flex flex-col items-center justify-center px-2 py-1 text-[10px] leading-tight', c === '3' ? 'bg-bateau text-white' : 'bg-[#E8EBF0] text-brume')}>
                Cycle<span className="text-sm font-bold">{c}</span>
              </span>
              {niveaux.map((n) => (
                <span key={n} className={clsx('flex items-center justify-center py-2', n === 'CM1' ? 'bg-bateau-clair font-bold text-bateau-fonce' : 'bg-[#F3F4F6] text-brume/70')}>{n}</span>
              ))}
            </Fragment>
          ))}
        </div>
      </div>
      <div className="leading-relaxed">
        <p className="font-semibold">Année scolaire {annee.replace('-', '/')}</p>
        <p>{bilan.nom} du {dateCourte(bilan.debut)} au {dateCourte(bilan.fin)}</p>
        <p className="font-bold">{[eleve.nom?.toUpperCase(), eleve.prenom].filter(Boolean).join(' ')}</p>
        {classe.enseignant_nom && <p>Enseignant(e)(s) : {classe.enseignant_nom}</p>}
        <p>Classe de {classe.nom}</p>
        <p>Nombre de bilans dans l'année scolaire : {nbBilans}</p>
      </div>
      <p className={clsx(TRAIT, 'py-1.5 text-center font-bold')}>Suivi des acquis scolaires de l'élève</p>
    </div>
  )
}

/** Contenu d'une case : X choisi, x pâle si proposé d'après les évaluations */
function Case({ choisi, propose, onClick, label }: { choisi: boolean; propose: boolean; onClick?: () => void; label: string }) {
  const marque = choisi
    ? <span className="text-[15px] font-semibold text-encre">X</span>
    : propose ? <span className="text-[13px] font-semibold text-brume/60" title="Proposé d'après les évaluations">x</span> : null
  if (!onClick) return <span className="flex h-full min-h-8 items-center justify-center" aria-label={choisi ? label : undefined}>{marque}</span>
  return (
    <button type="button" role="radio" aria-checked={choisi} aria-label={label} onClick={onClick}
      className="group flex h-full min-h-9 w-full items-center justify-center transition hover:bg-bateau/10 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-bateau">
      {marque ?? <span className="text-[15px] font-semibold text-encre/0 group-hover:text-encre/25">X</span>}
    </button>
  )
}

/** Tableau des acquis : blocs, domaines, éléments travaillés, quatre colonnes */
export function TableauLivret({ classeLsu, positions, proposees = {}, onPosition }: {
  classeLsu: LsuClasse | undefined
  positions: Record<string, number>
  proposees?: Record<string, number>
  /** Absent : lecture seule */
  onPosition?: (cle: string, v: number | undefined) => void
}) {
  const blocs = BLOCS_LSU.map((b) => ({
    b, doms: b.domaines.map((dm) => ({ dm, els: elementsDuDomaine(classeLsu, dm) })).filter((x) => x.els.length),
  })).filter((x) => x.doms.length)
  const choisir = (cle: string, v: number) => onPosition?.(cle, positions[cle] === v ? undefined : v)

  return (
    <div className="flex flex-col gap-4 text-encre">
      {/* Ordinateur : le tableau du livret */}
      <div className="hidden flex-col gap-4 sm:flex">
        <table className="w-full table-fixed border-collapse text-sm">
          <Colonnes />
          <thead>
            <tr>
              <th rowSpan={2} className={clsx(TRAIT, 'px-2 font-normal')}>Domaines d'enseignement</th>
              <th rowSpan={2} className={clsx(TRAIT, 'px-2 font-normal')}>Principaux éléments du programme travaillés durant la période</th>
              <th colSpan={4} className={clsx(TRAIT, 'px-1 py-1 text-xs font-normal leading-tight')}><b>Positionnement</b><br />Objectifs d'apprentissage</th>
            </tr>
            <tr>
              {COLONNES_LIVRET.map((c, i) => (
                <th key={c} className={clsx(TRAIT, 'h-28 p-0 text-[11px] font-normal')} style={{ background: GRIS[i] }}>
                  <span className="mx-auto block rotate-180 whitespace-nowrap [writing-mode:vertical-rl]">{c}</span>
                </th>
              ))}
            </tr>
          </thead>
        </table>
        {blocs.map(({ b, doms }) => (
          <table key={b.id} className="w-full table-fixed border-collapse text-[13px] leading-snug">
            <Colonnes />
            <tbody>
              {!b.seul && <tr><td colSpan={6} className={clsx(TRAIT, 'px-2 py-1.5 font-bold')}>{b.nom}</td></tr>}
              {doms.flatMap(({ dm, els }) => els.map((el, i) => (
                <tr key={el.cle}>
                  {i === 0 && (
                    <td rowSpan={els.length} className={clsx(TRAIT, 'px-2 py-1.5 align-middle', b.seul && 'bg-[#F3F4F6] font-bold')}>
                      {b.seul ? b.nom : dm.nom}
                    </td>
                  )}
                  <td className={clsx(TRAIT, 'px-2 py-1.5')}>{el.libelle}</td>
                  {NIVEAUX.map((n, k) => (
                    <td key={n.v} className={clsx(TRAIT, 'p-0')} style={{ background: GRIS[k] }}>
                      <Case choisi={positions[el.cle] === n.v} propose={!positions[el.cle] && proposees[el.cle] === n.v}
                        label={`${el.libelle} : ${COLONNES_LIVRET[k]}`} onClick={onPosition ? () => choisir(el.cle, n.v) : undefined} />
                    </td>
                  ))}
                </tr>
              )))}
            </tbody>
          </table>
        ))}
      </div>

      {/* Téléphone : un élément par ligne, les quatre cases à droite */}
      <div className="flex flex-col gap-4 sm:hidden">
        <div className="grid grid-cols-[1fr_repeat(4,2.25rem)] items-end text-center text-[10px] leading-tight text-brume">
          <span className="text-left">Objectifs d'apprentissage</span>
          {COLONNES_LIVRET.map((c) => <span key={c} className="px-0.5">{c}</span>)}
        </div>
        {blocs.map(({ b, doms }) => (
          <section key={b.id} className={clsx(TRAIT, 'overflow-hidden rounded-md')}>
            <p className="bg-[#F3F4F6] px-2 py-1.5 text-sm font-bold">{b.nom}</p>
            {doms.map(({ dm, els }) => (
              <div key={dm.id}>
                {!b.seul && <p className="border-t border-[#C3C8D0] px-2 pb-0.5 pt-1.5 text-xs font-semibold text-brume">{dm.nom}</p>}
                {els.map((el) => (
                  <div key={el.cle} className="grid grid-cols-[1fr_repeat(4,2.25rem)] border-t border-[#C3C8D0] text-[13px] leading-snug">
                    <span className="px-2 py-1.5">{el.libelle}</span>
                    {NIVEAUX.map((n, k) => (
                      <span key={n.v} className="border-l border-[#C3C8D0]" style={{ background: GRIS[k] }}>
                        <Case choisi={positions[el.cle] === n.v} propose={!positions[el.cle] && proposees[el.cle] === n.v}
                          label={`${el.libelle} : ${COLONNES_LIVRET[k]}`} onClick={onPosition ? () => choisir(el.cle, n.v) : undefined} />
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </section>
        ))}
      </div>
    </div>
  )
}

function Colonnes() {
  return (
    <colgroup>
      <col className="w-[26%]" />
      <col />
      <col className="w-9" /><col className="w-9" /><col className="w-9" /><col className="w-9" />
    </colgroup>
  )
}

/** Bilan : parcours éducatifs, appréciation générale, communication avec les familles */
export function BilanLivret({ classe, directeur, projets, appreciation, accompagnement, publieLe, vuLe, visaParents, actionParcours }: {
  classe: Pick<Classe, 'enseignant_nom'>
  directeur?: string
  projets: string | null | undefined
  /** Texte, ou champ de saisie pour l'enseignante */
  appreciation: ReactNode
  accompagnement?: ReactNode
  publieLe: string | null | undefined
  vuLe: string | null | undefined
  /** Bouton « pris connaissance » (famille) */
  visaParents?: ReactNode
  actionParcours?: ReactNode
}) {
  const parcours = lireParcours(projets)
  const remplis = PARCOURS.filter((p) => parcours[p.id]?.trim())
  return (
    <div className="flex flex-col gap-4 text-sm text-encre">
      <p className={clsx(TRAIT, 'py-1.5 text-center font-bold')}>Bilan de l'acquisition des connaissances et compétences</p>

      <section className={clsx(TRAIT)}>
        <div className="flex items-center gap-3 px-3 py-2">
          <h3 className="flex-1 font-bold">Parcours éducatifs : Projet(s) mis en œuvre dans l'année</h3>
          {actionParcours}
        </div>
        <div className="flex flex-col gap-3 bg-[#D6ECFB] px-3 py-3">
          {remplis.length ? remplis.map((p) => (
            <div key={p.id}>
              <p className="font-bold underline">{p.nom}</p>
              <p className="mt-1 whitespace-pre-line">{parcours[p.id]}</p>
            </div>
          )) : <p className="text-brume">Aucun projet indiqué pour cette période.</p>}
        </div>
      </section>

      <section className={clsx(TRAIT)}>
        <h3 className="px-3 py-2 font-bold">Appréciation générale sur la progression de l'élève</h3>
        <div className="px-3 pb-3">{appreciation}</div>
        {accompagnement && <div className="border-t border-[#C3C8D0] px-3 py-2">{accompagnement}</div>}
      </section>

      <p className={clsx(TRAIT, 'py-1.5 text-center font-bold')}>Communication avec les familles</p>
      <div className={clsx(TRAIT, 'grid bg-[#FBE7DA] sm:grid-cols-3')}>
        <div className="min-h-24 border-b border-[#C3C8D0] p-3 sm:border-b-0 sm:border-r">
          <p className="font-bold">Visa de l'enseignant(e)</p>
          {publieLe && <p className="mt-1">Le {dateCourte(publieLe)}</p>}
          <p>{classe.enseignant_nom}</p>
        </div>
        <div className="min-h-24 border-b border-[#C3C8D0] p-3 sm:border-b-0 sm:border-r">
          <p className="font-bold">Visa de la directrice / du directeur de l'école</p>
          {publieLe && directeur && <p className="mt-1">Le {dateCourte(publieLe)}</p>}
          {directeur && <p>{directeur}</p>}
        </div>
        <div className="min-h-24 p-3">
          <p className="font-bold">Visa des parents / responsables légaux</p>
          {vuLe ? (
            <p className="mt-1 flex items-center gap-2"><span className="flex size-4 items-center justify-center border border-encre text-[11px] font-bold leading-none">X</span>Pris connaissance le : {dateCourte(vuLe)}</p>
          ) : visaParents ?? <p className="mt-1 flex items-center gap-2 text-brume"><span className="size-4 border border-brume" />Pas encore vu</p>}
        </div>
      </div>
    </div>
  )
}
