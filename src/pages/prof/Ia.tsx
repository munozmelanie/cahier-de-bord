import { Bot, CalendarDays, CalendarRange, GraduationCap, Sparkles, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { AssistantIA, type DemandeIA } from '../../components/AssistantIA'
import { Badge, Bouton, Champ, Entete, Feuille, Liste, Saisie } from '../../components/ui'
import { aujourdhui, decaler, estJourClasse, iso, joursSemaine, jourClasseSuivant, lundiDe, fmtJourCourt } from '../../lib/dates'
import { useClasse } from '../../lib/session'

function Tuile({ icone: Icone, titre, detail, couleur, fond, onClick }: { icone: LucideIcon; titre: string; detail?: string; couleur: string; fond: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-4 rounded-3xl bg-white p-4 text-left shadow-doux transition hover:-translate-y-0.5 hover:shadow-flotte">
      <span className="flex size-14 shrink-0 items-center justify-center rounded-3xl" style={{ background: fond, color: couleur }}>
        <Icone className="size-7" />
      </span>
      <span className="min-w-0">
        <span className="block font-titre text-lg font-semibold">{titre}</span>
        {detail && <span className="block text-sm text-brume">{detail}</span>}
      </span>
    </button>
  )
}

export default function Ia() {
  const classe = useClasse()
  const r = classe.reglages
  const [demande, setDemande] = useState<DemandeIA | null>(null)
  const [choixJour, setChoixJour] = useState(false)
  const [choixBilan, setChoixBilan] = useState(false)
  const auj = aujourdhui()
  const [jour, setJour] = useState(estJourClasse(auj, r) ? auj : jourClasseSuivant(auj, r))
  const bilans = r.lsu?.bilans ?? []
  const [bilan, setBilan] = useState(bilans.find((b) => b.debut <= auj && auj <= b.fin)?.id ?? bilans[0]?.id ?? '')

  // Semaine en cours ; pendant les vacances ou le week-end sans classe, la prochaine semaine de classe
  let lundi = iso(lundiDe(new Date(auj + 'T12:00:00')))
  if (!joursSemaine(lundi, r).some((j) => j >= auj && estJourClasse(j, r))) {
    lundi = iso(lundiDe(new Date(jourClasseSuivant(auj, r) + 'T12:00:00')))
  }
  const lundiSuivant = decaler(lundi, 7)

  return (
    <div className="max-w-3xl">
      <Entete titre="ChatGPT / Claude" />
      <ol className="mb-6 flex flex-col gap-1.5 text-encre/80">
        <li><span className="font-bold text-bateau">1.</span> L'appli prépare une demande avec ton emploi du temps et tes progressions.</li>
        <li><span className="font-bold text-bateau">2.</span> Tu la colles dans ChatGPT ou Claude, avec ton abonnement.</li>
        <li><span className="font-bold text-bateau">3.</span> Tu recolles sa réponse : séances et devoirs se remplissent.</li>
      </ol>

      <div className="grid gap-3 sm:grid-cols-2">
        <Tuile icone={CalendarRange} titre="Cette semaine" detail={`du ${fmtJourCourt(lundi)}`} couleur="#2E5BFF" fond="#E6ECFF"
          onClick={() => setDemande({ type: 'semaine', lundi })} />
        <Tuile icone={CalendarRange} titre="Semaine prochaine" detail={`du ${fmtJourCourt(lundiSuivant)}`} couleur="#7B4DFF" fond="#EEE8FF"
          onClick={() => setDemande({ type: 'semaine', lundi: lundiSuivant })} />
        <Tuile icone={CalendarDays} titre="Une journée" couleur="#F2711C" fond="#FFEEDF" onClick={() => setChoixJour(true)} />
        <Tuile icone={GraduationCap} titre="Appréciations du livret" couleur="#13A35B" fond="#E1F6EA" onClick={() => setChoixBilan(true)} />
      </div>

      <section className="mt-8 flex items-center gap-4 rounded-3xl border-2 border-dashed border-trait p-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-encre/5 text-brume"><Bot className="size-6" /></span>
        <div className="min-w-0 flex-1">
          <p className="font-bold">GPT perso « Cahier de bord » <Badge couleur="ambre">Bientôt</Badge></p>
          <p className="text-sm text-brume">Un GPT dans ton ChatGPT qui écrit directement dans l'appli.</p>
        </div>
      </section>

      <Feuille ouverte={choixJour} onFermer={() => setChoixJour(false)} titre="Quelle journée ?"
        pied={<Bouton icone={Sparkles} disabled={!estJourClasse(jour, r)} onClick={() => { setChoixJour(false); setDemande({ type: 'journee', date: jour }) }}>Préparer</Bouton>}>
        <Champ label="Jour">{(id) => <Saisie id={id} type="date" value={jour} onChange={(e) => setJour(e.target.value)} />}</Champ>
        {!estJourClasse(jour, r) && <p className="mt-3 text-sm font-bold text-ambre-fonce">Pas de classe ce jour-là.</p>}
      </Feuille>

      <Feuille ouverte={choixBilan} onFermer={() => setChoixBilan(false)} titre="Quel bilan ?"
        pied={<Bouton icone={Sparkles} disabled={!bilan} onClick={() => { setChoixBilan(false); setDemande({ type: 'appreciations', bilan, eleveIds: [] }) }}>Rédiger</Bouton>}>
        <Champ label="Bilan">
          {(id) => (
            <Liste id={id} value={bilan} onChange={(e) => setBilan(e.target.value)}>
              {bilans.map((b) => <option key={b.id} value={b.id}>{b.nom}</option>)}
            </Liste>
          )}
        </Champ>
      </Feuille>

      <AssistantIA demande={demande} onFermer={() => setDemande(null)} />
    </div>
  )
}
