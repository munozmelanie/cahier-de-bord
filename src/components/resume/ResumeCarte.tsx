import { CheckCircle2, Clock, Pencil, Send } from 'lucide-react'
import { useState } from 'react'
import { useEcrire, useRafraichir, useResumes } from '../../lib/donnees'
import { fmtHeure } from '../../lib/dates'
import { matiere } from '../../lib/matieres'
import { db, verif } from '../../lib/supabase'
import { useClasse } from '../../lib/session'
import type { Devoir, Resume, Seance } from '../../lib/types'
import { Bouton, BoutonIcone, Feuille, PastilleMatiere, Saisie, Texte, useToast } from '../ui'
import { CarteInfo } from '../CarteInfo'

export function apercuResume(seances: Seance[]): Resume['items'] {
  return seances
    .filter((s) => s.statut !== 'non_faite' && (s.pour_familles ?? '').trim() !== '-' && ((s.pour_familles ?? '').trim() || s.titre.trim()))
    .map((s) => ({ matiere: s.matiere, texte: (s.pour_familles ?? '').trim() || s.titre }))
}

export function ListeResume({ items }: { items: Resume['items'] }) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((it, i) => (
        <li key={i} className="flex items-center gap-3">
          <PastilleMatiere id={it.matiere} taille="s" />
          <span className="leading-snug">{it.texte}</span>
        </li>
      ))}
    </ul>
  )
}

/** Résumé du soir côté enseignante : aperçu, publication, retouche */
export function ResumeCarte({ date, seances, devoirs }: { date: string; seances: Seance[]; devoirs: Devoir[] }) {
  const classe = useClasse()
  const toast = useToast()
  const rafraichir = useRafraichir()
  const ecrire = useEcrire()
  const resumes = useResumes(date, date)
  const r = resumes.data?.[0]
  const [enCours, setEnCours] = useState(false)
  const [edition, setEdition] = useState<Resume | null>(null)
  const items = r?.modifie_main || (r?.publie && !seances.length) ? r!.items : apercuResume(seances)
  const devoirsEnAttente = devoirs.filter((d) => d.donne_le === date && !d.publie).length
  const heure = classe.reglages.heure_resume ?? '16:45'
  const auto = classe.reglages.resume_auto !== false

  async function publier() {
    setEnCours(true)
    try {
      const res = verif(await db.rpc('publier_journee', { p_classe: classe.id, p_date: date })) as { devoirs: number }
      rafraichir('resumes', 'devoirs', 'seances')
      toast(res.devoirs ? `Publié, avec ${res.devoirs} devoir${res.devoirs > 1 ? 's' : ''}` : 'Résumé publié')
    } catch (e) { toast((e as Error).message, 'erreur') } finally { setEnCours(false) }
  }
  async function enregistrerEdition() {
    if (!edition) return
    await ecrire.mutateAsync({
      op: 'upsert', table: 'resumes', onConflict: 'classe_id,date',
      ligne: { classe_id: classe.id, date, items: edition.items.filter((x) => x.texte.trim()), mot: edition.mot || null, modifie_main: true, publie: r?.publie ?? false },
    })
    setEdition(null); toast('Résumé modifié')
  }

  const ouvrirEdition = () => setEdition({ classe_id: classe.id, date, items: items.map((x) => ({ ...x })), mot: r?.mot ?? '', modifie_main: true, publie: !!r?.publie, publie_le: r?.publie_le ?? null })
  return (
    <CarteInfo icone={Send} couleur="#7B4DFF" fond="#F3EFFF" titre="Résumé du jour"
      nombre={r?.publie
        ? <span className="inline-flex items-center gap-1 text-succes"><CheckCircle2 className="size-3.5" />Publié</span>
        : auto ? <span className="inline-flex items-center gap-1"><Clock className="size-3.5" />{fmtHeure(heure)}</span> : undefined}
      action={<span className="flex gap-1">
        <BoutonIcone icone={Pencil} label="Voir et modifier le résumé" className="size-8" onClick={ouvrirEdition} />
        <BoutonIcone icone={Send} label={r?.publie ? 'Mettre à jour' : 'Publier maintenant'} variante={r?.publie ? 'doux' : 'primaire'} className="size-8" onClick={publier} disabled={enCours} />
      </span>}>
      <button type="button" onClick={ouvrirEdition} className="flex w-full flex-col gap-1.5 text-left" title="Voir le résumé">
        {items.length ? items.slice(0, 4).map((it, i) => (
          <span key={i} className="flex items-start gap-2 text-sm leading-snug text-encre/85">
            <span className="mt-1.5 size-2 shrink-0 rounded-full" style={{ background: matiere(it.matiere).couleur }} />
            <span className="line-clamp-1">{it.texte}</span>
          </span>
        )) : <span className="text-sm text-brume">Rien pour l'instant</span>}
        {items.length > 4 && <span className="pl-4 text-xs text-brume">et {items.length - 4} autre{items.length - 4 > 1 ? 's' : ''}</span>}
        {devoirsEnAttente > 0 && <span className="pl-4 text-xs text-brume">+ {devoirsEnAttente} devoir{devoirsEnAttente > 1 ? 's' : ''} publié{devoirsEnAttente > 1 ? 's' : ''} avec</span>}
      </button>
      <Feuille ouverte={!!edition} onFermer={() => setEdition(null)} titre="Résumé du jour"
        pied={<><Bouton variante="secondaire" onClick={() => setEdition(null)}>Annuler</Bouton><Bouton onClick={enregistrerEdition}>Enregistrer</Bouton></>}>
        {edition && (
          <div className="flex flex-col gap-3">
            <Texte value={edition.mot ?? ''} onChange={(e) => setEdition({ ...edition, mot: e.target.value })} placeholder="Petit mot aux familles (facultatif)" aria-label="Petit mot" />
            {edition.items.map((it, i) => (
              <div key={i} className="flex items-center gap-2">
                <PastilleMatiere id={it.matiere} taille="s" />
                <Saisie value={it.texte} onChange={(e) => setEdition({ ...edition, items: edition.items.map((x, j) => (j === i ? { ...x, texte: e.target.value } : x)) })} aria-label="Ligne du résumé" />
              </div>
            ))}
          </div>
        )}
      </Feuille>
    </CarteInfo>
  )
}
