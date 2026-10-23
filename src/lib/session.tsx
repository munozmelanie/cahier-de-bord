import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { db, verif } from './supabase'
import type { Classe, Eleve } from './types'

type Role = 'enseignant' | 'parent' | 'aucun'

type Etat = {
  pret: boolean
  userId: string | null
  email: string | null
  role: Role
  classe: Classe | null
  enfants: Eleve[]
  enfant: Eleve | null
  choisirEnfant: (id: string) => void
  rafraichir: () => Promise<void>
  deconnexion: () => Promise<void>
}

const Ctx = createContext<Etat | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()
  const [pret, setPret] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const [role, setRole] = useState<Role>('aucun')
  const [classe, setClasse] = useState<Classe | null>(null)
  const [enfants, setEnfants] = useState<Eleve[]>([])
  const [enfantId, setEnfantId] = useState<string | null>(() => {
    try { return localStorage.getItem('cdb-enfant') } catch { return null }
  })

  const charger = useCallback(async (uid: string | null) => {
    if (!uid) {
      setRole('aucun'); setClasse(null); setEnfants([])
      return
    }
    const membres = verif(await db.from('membres').select('*').eq('user_id', uid)) as { classe_id: string }[]
    if (membres.length) {
      const c = verif(await db.from('classes').select('*').eq('id', membres[0].classe_id).single()) as Classe
      setClasse(c); setRole('enseignant'); setEnfants([])
      return
    }
    const liens = verif(await db.from('parents').select('*').eq('user_id', uid)) as { eleve_id: string }[]
    if (liens.length) {
      const els = verif(await db.from('eleves').select('*').in('id', liens.map((l) => l.eleve_id)).order('prenom')) as Eleve[]
      const c = els.length ? (verif(await db.from('classes').select('*').eq('id', els[0].classe_id).single()) as Classe) : null
      setEnfants(els); setClasse(c); setRole('parent')
      return
    }
    setRole('aucun'); setClasse(null); setEnfants([])
  }, [])

  useEffect(() => {
    let actif = true
    db.auth.getSession().then(async ({ data }) => {
      const u = data.session?.user ?? null
      if (!actif) return
      setUserId(u?.id ?? null); setEmail(u?.email ?? null)
      try { await charger(u?.id ?? null) } finally { if (actif) setPret(true) }
    })
    const { data } = db.auth.onAuthStateChange((evt, s) => {
      if (evt === 'TOKEN_REFRESHED') return
      const u = s?.user ?? null
      setUserId((avant) => {
        // Changement de personne : on vide le cache pour ne rien montrer de l'ancien compte
        if (avant !== (u?.id ?? null)) qc.clear()
        return u?.id ?? null
      })
      setEmail(u?.email ?? null)
      setPret(false)
      // hors du rappel : supabase-js déconseille d'attendre une requête ici
      setTimeout(() => { charger(u?.id ?? null).finally(() => setPret(true)) }, 0)
    })
    return () => { actif = false; data.subscription.unsubscribe() }
  }, [charger, qc])

  const enfant = useMemo(() => enfants.find((e) => e.id === enfantId) ?? enfants[0] ?? null, [enfants, enfantId])

  const valeur: Etat = {
    pret, userId, email, role, classe, enfants, enfant,
    choisirEnfant: (id) => { setEnfantId(id); try { localStorage.setItem('cdb-enfant', id) } catch { /* rien */ } },
    rafraichir: () => charger(userId),
    deconnexion: async () => { await db.auth.signOut() },
  }
  return <Ctx.Provider value={valeur}>{children}</Ctx.Provider>
}

export function useSession() {
  const v = useContext(Ctx)
  if (!v) throw new Error('SessionProvider manquant')
  return v
}

/** Pour les écrans enseignant : la classe est forcément chargée */
export function useClasse(): Classe {
  const { classe } = useSession()
  if (!classe) throw new Error('Classe non chargée')
  return classe
}
