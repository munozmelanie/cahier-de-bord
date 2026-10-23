// Service worker minimal : rend l'appli installable sur téléphone.
// Pas de cache : tout passe par le réseau, l'appli est donc toujours à jour.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))
self.addEventListener('fetch', (e) => {
  if (e.request.mode !== 'navigate') return
  e.respondWith(
    fetch(e.request).catch(() => new Response(
      '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<body style="font-family:system-ui;padding:2rem;color:#1C2333"><h1 style="font-size:1.3rem">Pas de connexion</h1>' +
      '<p>Vérifiez la connexion internet, puis rouvrez l\'appli.</p></body>',
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    )),
  )
})
