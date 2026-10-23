import { Copy, ExternalLink, Printer, QrCode, RefreshCw, Save, ShieldOff } from 'lucide-react'
import QRCode from 'qrcode'
import { useEffect, useState } from 'react'
import { useEcrire } from '../../lib/donnees'
import { useClasse, useSession } from '../../lib/session'
import { db, verif } from '../../lib/supabase'
import type { Classe } from '../../lib/types'
import { Bouton, Feuille, Texte, useConfirmation, useToast } from '../ui'

/** Adresse de la page remplaçant (même site que l'appli) */
export const lienRemplacant = (jeton: string) => `${window.location.origin}${window.location.pathname}#/r/${jeton}`

const svgQr = (texte: string) =>
  QRCode.toString(texte, { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: '#1C2333', light: '#FFFFFF' } })

const echapper = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))

/** Feuille A4 à poser sur le bureau : un grand QR code et deux lignes d'explication */
function imprimerQr(classe: Classe, lien: string, svg: string) {
  const w = window.open('', '_blank')
  if (!w) return false
  const qui = [classe.nom, classe.enseignant_nom].filter(Boolean).map((x) => echapper(String(x))).join(', ')
  w.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>QR code remplaçant</title>
<style>
  @page { size: A4; margin: 18mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Figtree, Arial, sans-serif; color: #1C2333; }
  .carte { width: 150mm; margin: 0 auto; padding: 14mm 12mm; border: 1.2mm solid #1C2333; border-radius: 8mm; text-align: center; }
  .haut { display: flex; align-items: center; justify-content: center; gap: 3mm; font-size: 13pt; font-weight: 700; }
  .logo { display: inline-flex; width: 10mm; height: 10mm; border-radius: 3mm; background: #1C2333; align-items: center; justify-content: center; }
  h1 { margin: 9mm 0 2mm; font-size: 30pt; line-height: 1.1; }
  .sous { margin: 0 0 9mm; font-size: 14pt; color: #475467; }
  .qr { width: 95mm; height: 95mm; margin: 0 auto; }
  .qr svg { width: 100%; height: 100%; }
  .qui { margin: 9mm 0 1mm; font-size: 13pt; font-weight: 600; }
  .lien { margin: 0; font-size: 8pt; color: #667085; word-break: break-all; }
</style></head><body>
<div class="carte">
  <div class="haut"><span class="logo"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 18H2a4 4 0 0 0 4 4h12a4 4 0 0 0 4-4Z"/><path d="M21 14 10 2 3 14h18Z"/><path d="M10 2v16"/></svg></span>Cahier de bord</div>
  <h1>Remplaçant·e ?</h1>
  <p class="sous">Scannez ce code pour voir la journée prévue.</p>
  <div class="qr">${svg}</div>
  <p class="qui">${qui}</p>
  <p class="lien">${echapper(lien)}</p>
</div>
<script>window.onload = function () { setTimeout(function () { window.print() }, 250) }<\/script></body></html>`)
  w.document.close()
  return true
}

/** QR code du remplaçant : création, impression, changement du lien, mot à lui laisser */
export function AccesRemplacant({ ouverte, onFermer }: { ouverte: boolean; onFermer: () => void }) {
  const classe = useClasse()
  const toast = useToast()
  const ecrire = useEcrire()
  const { rafraichir } = useSession()
  const { demander, fenetre } = useConfirmation()
  const [jeton, setJeton] = useState<string | null | undefined>(undefined)
  const [svg, setSvg] = useState('')
  const [mot, setMot] = useState(classe.reglages?.mot_remplacant ?? '')
  const [enCours, setEnCours] = useState(false)

  useEffect(() => {
    if (!ouverte) return
    setMot(classe.reglages?.mot_remplacant ?? '')
    db.rpc('jeton_remplacant', { c: classe.id }).then(({ data, error }) => {
      if (error) { toast(error.message, 'erreur'); setJeton(null) } else setJeton((data as string | null) ?? null)
    })
  }, [ouverte, classe.id, classe.reglages?.mot_remplacant, toast])

  const lien = jeton ? lienRemplacant(jeton) : ''
  useEffect(() => {
    if (!lien) { setSvg(''); return }
    svgQr(lien).then(setSvg).catch(() => setSvg(''))
  }, [lien])

  async function changer(actif: boolean) {
    setEnCours(true)
    try {
      setJeton((verif(await db.rpc('nouveau_jeton_remplacant', { c: classe.id, actif })) as string | null) ?? null)
      toast(actif ? 'QR code prêt' : 'Accès coupé')
    } catch (e) { toast((e as Error).message, 'erreur') } finally { setEnCours(false) }
  }
  async function enregistrerMot() {
    try {
      await ecrire.mutateAsync({ op: 'update', table: 'classes', id: classe.id, patch: { reglages: { ...classe.reglages, mot_remplacant: mot.trim() || undefined } } })
      await rafraichir()
      toast('Mot enregistré')
    } catch (e) { toast((e as Error).message, 'erreur') }
  }
  async function copier() {
    try { await navigator.clipboard.writeText(lien); toast('Lien copié') } catch { toast('Copie impossible', 'erreur') }
  }

  return (
    <Feuille ouverte={ouverte} onFermer={onFermer} titre="Accès remplaçant">
      <div className="flex flex-col gap-5">
        <p className="text-sm text-brume">Le remplaçant scanne le QR code et voit le cahier journal, sans compte. Il ne voit ni les élèves, ni le carnet, ni les livrets.</p>

        {jeton === undefined ? null : jeton ? (
          <div className="flex flex-col items-center gap-4 rounded-2xl bg-papier p-5">
            <div className="size-44 rounded-xl bg-white p-3 shadow-doux [&_svg]:size-full" aria-label="QR code" dangerouslySetInnerHTML={{ __html: svg }} />
            <div className="flex flex-wrap justify-center gap-2">
              <Bouton icone={Printer} onClick={() => { if (!imprimerQr(classe, lien, svg)) toast('Autorise les fenêtres pour imprimer', 'erreur') }}>Imprimer</Bouton>
              <Bouton variante="secondaire" icone={Copy} onClick={copier}>Copier le lien</Bouton>
              <a href={lien} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-xl border border-trait bg-white px-4 text-[15px] font-semibold text-encre hover:bg-papier">
                <ExternalLink className="size-4" /> Voir
              </a>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-papier p-6 text-center">
            <QrCode className="size-8 text-brume" />
            <Bouton icone={QrCode} onClick={() => changer(true)} enCours={enCours}>Créer le QR code</Bouton>
          </div>
        )}

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-encre">Mot pour le remplaçant</span>
          <Texte rows={3} value={mot} onChange={(e) => setMot(e.target.value)} placeholder="Où trouver les fiches, les clés, les habitudes de la classe…" />
          <span className="flex justify-end">
            <Bouton variante="secondaire" taille="s" icone={Save} onClick={enregistrerMot} disabled={mot.trim() === (classe.reglages?.mot_remplacant ?? '').trim()}>Enregistrer le mot</Bouton>
          </span>
        </label>

        {jeton && (
          <div className="flex flex-wrap gap-2 border-t border-trait pt-4">
            <Bouton variante="fantome" taille="s" icone={RefreshCw} disabled={enCours}
              onClick={() => demander("Créer un nouveau QR code ? L'ancien ne marchera plus.", () => changer(true))}>Nouveau QR code</Bouton>
            <Bouton variante="fantome" taille="s" icone={ShieldOff} disabled={enCours} className="text-alerte"
              onClick={() => demander("Couper l'accès remplaçant ? Le QR code ne marchera plus.", () => changer(false))}>Couper l'accès</Bouton>
          </div>
        )}
      </div>
      {fenetre}
    </Feuille>
  )
}
