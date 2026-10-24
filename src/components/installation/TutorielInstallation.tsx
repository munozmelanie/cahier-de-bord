import { useEffect, useState, type CSSProperties } from 'react'
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react'
import './tutoriel-installation.css'

export type SystemeInstallation = 'ios' | 'android'

type EtapeInstallation = {
  titre: string
  texte: string
  x: number
  y: number
  verification?: boolean
}

// Les coordonnées indiquent le geste dans la capture entière, en pourcentage.
const etapes: Record<SystemeInstallation, EtapeInstallation[]> = {
  ios: [
    { titre: 'Ouvrez le menu de Safari', texte: 'Dans Safari, touchez le menu de la page. Si le bouton Partager est déjà visible, touchez-le directement.', x: 28.358, y: 93.364 },
    { titre: 'Touchez Partager', texte: 'Repérez le carré avec une flèche vers le haut, puis touchez Partager.', x: 53.483, y: 47.368 },
    { titre: 'Affichez les autres actions', texte: 'Si le menu est réduit, touchez « En voir plus ». Sinon, passez à l’étape suivante.', x: 82.753, y: 89.455 },
    { titre: 'Choisissez « Sur l’écran d’accueil »', texte: 'Faites défiler les actions du menu de partage jusqu’à « Sur l’écran d’accueil ».', x: 50, y: 74.733 },
    { titre: 'Gardez « Ouvrir comme app web » activé', texte: 'Si cette option apparaît, laissez son interrupteur activé.', x: 87.189, y: 35.202, verification: true },
    { titre: 'Touchez Ajouter', texte: 'Confirmez avec Ajouter, en haut de l’écran. Vous retrouverez ensuite l’icône Cahier de bord sur votre écran d’accueil.', x: 84.784, y: 11.442 },
  ],
  android: [
    { titre: 'Ouvrez le menu de Chrome', texte: 'Dans Chrome, touchez les trois points ⋮ en haut à droite.', x: 94.167, y: 5.688 },
    { titre: 'Choisissez « Ajouter à l’écran d’accueil »', texte: 'Faites défiler le menu jusqu’à « Ajouter à l’écran d’accueil ». Selon la version, l’option peut s’appeler « Installer et créer un raccourci ».', x: 69.722, y: 67.375 },
    { titre: 'Choisissez Installer', texte: 'Si un choix vous est proposé, choisissez Installer pour ouvrir Cahier de bord comme une application.', x: 86.806, y: 83.188 },
    { titre: 'Confirmez l’installation', texte: 'Touchez Installer dans la fenêtre de confirmation. Si Chrome propose Ajouter, confirmez avec Ajouter. Vous retrouverez ensuite l’icône sur votre écran d’accueil.', x: 82.917, y: 59.5 },
  ],
}

const dimensions: Record<SystemeInstallation, { largeur: number; hauteur: number }> = {
  ios: { largeur: 1206, hauteur: 2622 },
  android: { largeur: 720, hauteur: 1600 },
}

function Doigt() {
  return <span className="cdb-install-doigt"><svg viewBox="0 0 32 40" fill="none"><path d="M10 20V6a3 3 0 0 1 6 0v10-2a3 3 0 0 1 6 0v3a3 3 0 0 1 5 2v7c0 5-3 10-8 10h-2c-3 0-5-2-7-4L4 24a3 3 0 0 1 5-3l1 1Z" fill="#FFF9EB" stroke="#A86C00" strokeWidth="1.8" strokeLinejoin="round" /></svg></span>
}

function lectureAutomatiquePossible() {
  return typeof window !== 'undefined' && !document.hidden && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function Animation({ systeme }: { systeme: SystemeInstallation }) {
  const [etape, setEtape] = useState(0)
  const [joue, setJoue] = useState(lectureAutomatiquePossible)
  const [imageChargee, setImageChargee] = useState<{ src: string; largeur: number; hauteur: number } | null>(null)
  const [imageEnErreur, setImageEnErreur] = useState<string | null>(null)
  const liste = etapes[systeme]
  const courante = liste[etape]
  const derniere = etape === liste.length - 1
  const src = `${import.meta.env.BASE_URL}installation/${systeme}-${etape + 1}.png`
  const chargee = imageChargee?.src === src
  const erreur = imageEnErreur === src
  const taille = chargee ? imageChargee : dimensions[systeme]

  useEffect(() => {
    const reduction = window.matchMedia('(prefers-reduced-motion: reduce)')
    const pauseSiMasque = () => { if (document.hidden) setJoue(false) }
    const pauseSiReduction = () => { if (reduction.matches) setJoue(false) }
    const pause = () => setJoue(false)
    document.addEventListener('visibilitychange', pauseSiMasque)
    window.addEventListener('pagehide', pause)
    reduction.addEventListener('change', pauseSiReduction)
    return () => {
      document.removeEventListener('visibilitychange', pauseSiMasque)
      window.removeEventListener('pagehide', pause)
      reduction.removeEventListener('change', pauseSiReduction)
    }
  }, [])

  useEffect(() => {
    if (!joue || derniere || !chargee || erreur) return
    const timer = window.setTimeout(() => {
      const prochaine = etape + 1
      setEtape(prochaine)
      if (prochaine === liste.length - 1) setJoue(false)
    }, 4000)
    return () => window.clearTimeout(timer)
  }, [joue, etape, derniere, chargee, erreur, liste.length])

  function va(index: number) {
    setJoue(false)
    setEtape(Math.max(0, Math.min(liste.length - 1, index)))
  }

  function lecture() {
    if (joue) { setJoue(false); return }
    if (document.hidden || erreur) return
    if (derniere) setEtape(0)
    setJoue(true)
  }

  return <div className="cdb-install-tutoriel" data-playing={joue} data-step={etape + 1} data-systeme={systeme} data-loaded={chargee}>
    <figure className="cdb-install-figure">
      <figcaption className="cdb-install-legende"><span className="cdb-install-numero">{etape + 1}/{liste.length}</span><div><strong>{courante.titre}</strong><p>{courante.texte}</p></div></figcaption>
      <div className="cdb-install-images">
        <p className="cdb-install-source">Captures {systeme === 'ios' ? 'Safari sur iPhone' : 'Chrome sur Android'}</p>
        <div className="cdb-install-capture" aria-hidden="true" style={{ '--cdb-install-ratio': taille.largeur / taille.hauteur } as CSSProperties}>
          <img key={src} src={src} alt="" width={taille.largeur} height={taille.hauteur} draggable={false}
            onLoad={event => {
              const img = event.currentTarget
              if (!img.naturalWidth || !img.naturalHeight) return
              setImageChargee({ src, largeur: img.naturalWidth, hauteur: img.naturalHeight })
              setImageEnErreur(null)
            }}
            onError={() => { setImageEnErreur(src); setJoue(false) }} />
          {chargee && !erreur && <span
            className={`cdb-install-repere${courante.x > 80 ? ' cdb-install-repere-gauche' : ''}${courante.verification ? ' cdb-install-verification' : ''}`}
            style={{ left: `${courante.x}%`, top: `${courante.y}%` }}>
            <span className="cdb-install-anneau" />{!courante.verification && <Doigt />}
          </span>}
          {!chargee && <span className="cdb-install-attente">{erreur ? 'Capture indisponible' : 'Chargement de la capture…'}</span>}
        </div>
      </div>
    </figure>
    {erreur && <p className="cdb-install-erreur" role="status">Cette capture n’a pas pu être chargée. L’animation est en pause. Retrouvez toutes les étapes écrites ci-dessous.</p>}
    <div className="cdb-install-commandes">
      <button type="button" onClick={() => va(etape - 1)} disabled={etape === 0} aria-label="Étape précédente"><ChevronLeft size={21} /></button>
      <button type="button" onClick={lecture} disabled={erreur}>{joue ? <Pause size={18} /> : <Play size={18} />}{joue ? 'Pause' : derniere ? 'Revoir le tutoriel' : 'Lire l’animation'}</button>
      <button type="button" onClick={() => va(etape + 1)} disabled={derniere} aria-label="Étape suivante"><ChevronRight size={21} /></button>
    </div>
    <div className="cdb-install-etapes" role="group" aria-label="Choisir une étape">{liste.map((item, index) => <button key={item.titre} type="button" onClick={() => va(index)} aria-current={index === etape ? 'step' : undefined} aria-label={`Étape ${index + 1} : ${item.titre}`}>{index + 1}</button>)}</div>
    <p className="cdb-install-note">Regardez les gestes, puis reproduisez-les sur votre téléphone.</p>
    <details className="cdb-install-ecrit" open={erreur || undefined}><summary>Voir toutes les étapes écrites</summary><ol>{liste.map(item => <li key={item.titre}><strong>{item.titre}</strong><p>{item.texte}</p></li>)}</ol></details>
  </div>
}

export function TutorielInstallation({ systeme }: { systeme: SystemeInstallation }) {
  return <Animation key={systeme} systeme={systeme} />
}
