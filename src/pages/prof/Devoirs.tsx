import { BookCheck, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { DevoirEditeur } from '../../components/devoirs/DevoirEditeur'
import { LigneDevoir } from '../../components/devoirs/LigneDevoir'
import { Bouton, Chargement, Entete, Onglets, Vide } from '../../components/ui'
import { useDevoirsDonnes, useDevoirsPour } from '../../lib/donnees'
import { aujourdhui, decaler, estJourClasse, fmtJour, jourClasseSuivant, maj1 } from '../../lib/dates'
import { useClasse } from '../../lib/session'
import type { Devoir } from '../../lib/types'

function grouper(l: Devoir[], cle: 'pour_le' | 'donne_le') {
  const m = new Map<string, Devoir[]>()
  for (const d of l) m.set(d[cle], [...(m.get(d[cle]) ?? []), d])
  return [...m.entries()].sort(([a], [b]) => a.localeCompare(b))
}

export default function DevoirsProf() {
  const classe = useClasse()
  const auj = aujourdhui()
  const [vue, setVue] = useState<'pour' | 'donne'>('pour')
  const aVenir = useDevoirsPour(auj, decaler(auj, 28))
  const donnes = useDevoirsDonnes(decaler(auj, -14), decaler(auj, 7))
  const [edition, setEdition] = useState<(Partial<Devoir> & { donne_le: string }) | null>(null)
  const jourDonne = estJourClasse(auj, classe.reglages) ? auj : jourClasseSuivant(auj, classe.reglages)
  const q = vue === 'pour' ? aVenir : donnes
  const groupes = useMemo(() => {
    const g = grouper(q.data ?? [], vue === 'pour' ? 'pour_le' : 'donne_le')
    return vue === 'donne' ? g.reverse() : g
  }, [q.data, vue])

  return (
    <>
      <Entete titre="Devoirs" actions={<Bouton icone={Plus} onClick={() => setEdition({ donne_le: jourDonne })}>Devoir</Bouton>} />
      <div className="mb-5">
        <Onglets valeur={vue} onChange={setVue} options={[{ id: 'pour', label: 'À faire pour' }, { id: 'donne', label: 'Donnés le' }]} />
      </div>
      {q.isLoading ? <Chargement /> : groupes.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {groupes.map(([date, l]) => (
            <section key={date} className="rounded-3xl bg-white p-4 shadow-doux">
              <h2 className="mb-2 font-titre text-lg font-semibold">{vue === 'pour' ? `Pour ${fmtJour(date)}` : maj1(fmtJour(date))}</h2>
              {l.map((d) => <LigneDevoir key={d.id} d={d} mode={vue === 'pour' ? 'donne' : 'pour'} onClick={() => setEdition(d)} />)}
            </section>
          ))}
        </div>
      ) : (
        <Vide icone={BookCheck} texte="Aucun devoir" action={<Bouton icone={Plus} onClick={() => setEdition({ donne_le: jourDonne })}>Devoir</Bouton>} />
      )}
      <DevoirEditeur base={edition} onFermer={() => setEdition(null)} />
    </>
  )
}
