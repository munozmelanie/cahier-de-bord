import { CheckCircle2, Clock, Pencil, Send } from 'lucide-react'
import { useState } from 'react'
import { useEcrire, useRafraichir, useResumes } from '../../lib/donnees'
import { fmtHeure } from '../../lib/dates'
import { db, verif } from '../../lib/supabase'
import { useClasse } from '../../lib/session'
import type { Devoir, Resume, Seance } from '../../lib/types'
import { Bouton, BoutonIcone, Feuille, PastilleMatiere, Saisie, Texte, useToast } from '../ui'

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

  return (
    <section className="rounded-3xl bg-white p-4 shadow-doux">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-titre text-lg font-semibold">Résumé pour les familles</h2>
        <BoutonIcone icone={Pencil} label="Modifier le résumé" className="size-9"
          onClick={() => setEdition({ classe_id: classe.id, date, items: items.map((x) => ({ ...x })), mot: r?.mot ?? '', modifie_main: true, publie: !!r?.publie, publie_le: r?.publie_le ?? null })} />
      </div>
      {r?.mot && <p className="mb-3 rounded-2xl bg-ambre-clair px-3 py-2 text-sm">{r.mot}</p>}
      {items.length ? <ListeResume items={items} /> : <p className="text-sm text-brume">Rien pour l'instant.</p>}
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-trait pt-3 text-sm">
        {r?.publie ? (
          <span className="inline-flex items-center gap-1.5 font-bold text-succes"><CheckCircle2 className="size-4" /> En ligne</span>
        ) : auto ? (
          <span className="inline-flex items-center gap-1.5 font-bold text-ambre-fonce"><Clock className="size-4" /> En ligne à {fmtHeure(heure)}</span>
        ) : null}
        {devoirsEnAttente > 0 && <span className="text-brume">· {devoirsEnAttente} devoir{devoirsEnAttente > 1 ? 's' : ''} en attente</span>}
        <Bouton taille="s" variante={r?.publie ? 'secondaire' : 'primaire'} icone={Send} enCours={enCours} onClick={publier} className="ml-auto">
          {r?.publie ? 'Mettre à jour' : 'Publier maintenant'}
        </Bouton>
      </div>

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
    </section>
  )
}
