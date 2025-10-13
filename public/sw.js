// public/sw.js
// Version 2.1 - Corrigée et Robuste pour une gestion hors ligne complète

// Import du script helper pour la base de données locale (IndexedDB)
importScripts('https://cdn.jsdelivr.net/npm/idb@7/build/umd.js');

const STATIC_CACHE_NAME = 'wink-express-static-v5'; // Cache pour les fichiers de l'application (HTML, CSS, JS)
const DATA_CACHE_NAME = 'wink-express-data-v3';   // Cache pour les données des requêtes API (GET)

// Liste complète des fichiers essentiels pour le fonctionnement hors ligne
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/dashboard.html',
  '/orders.html',
  '/deliverymen.html',
  '/shops.html',
  '/reports.html',
  '/remittances.html',
  '/debts.html',
  '/cash.html',
  '/users.html',
  '/rider-app.html',
  '/ridercash.html',
  '/js/auth.js',
  '/js/login.js',
  '/js/pwa-loader.js',
  '/js/db-helper.js',
  '/js/rider.js',
  '/js/reports.js',
  '/js/cash.js',
  '/js/ridercash.js',
  '/js/orders.js',
  '/js/shops.js',
  '/js/users.js',
  '/js/deliverymen.js',
  '/js/remittances.js',
  '/js/debts.js',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/bootstrap-icons/1.11.3/font/bootstrap-icons.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js',
  'https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js',
  'https://cdn.jsdelivr.net/npm/idb@7/build/umd.js',
  'https://cdn.jsdelivr.net/npm/moment@2.29.1/moment.min.js',
  '/wink.png',
  '/wink-logo.png',
  '/favicon.ico',
  '/icons/wink-icon-192x192.png',
  '/icons/wink-icon-512x512.png',
  '/sound.mp3'
];

const DB_NAME = 'wink-sync-db';
const STORE_NAME = 'sync-requests';

// --- Événements du Cycle de Vie du Service Worker ---

// 1. Installation : Met en cache tous les fichiers de l'App Shell.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then(cache => {
      console.log('[Service Worker] Mise en cache des fichiers de l\'application.');
      return cache.addAll(URLS_TO_CACHE);
    })
  );
});

// 2. Activation : Nettoie les anciens caches pour libérer de l'espace.
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== STATIC_CACHE_NAME && name !== DATA_CACHE_NAME)
          .map(name => {
            console.log(`[Service Worker] Suppression de l'ancien cache: ${name}`);
            return caches.delete(name);
          })
      );
    })
  );
});

// 3. Fetch : Intercepte toutes les requêtes réseau.
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Stratégie pour les requêtes API
  if (url.pathname.startsWith('/api/')) {
    // Les requêtes qui modifient des données (POST, PUT, DELETE) ne sont pas gérées ici.
    // Le client les mettra dans IndexedDB si elles échouent.
    if (request.method !== 'GET') {
      return;
    }

    // Pour les requêtes GET : Stratégie "Network First, then Cache"
    event.respondWith(
      caches.open(DATA_CACHE_NAME).then(cache => {
        return fetch(request)
          .then(networkResponse => {
            if (networkResponse.ok) {
              cache.put(request.url, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(async () => {
            const cachedResponse = await cache.match(request);
            if (cachedResponse) {
              return cachedResponse;
            }
            // **CORRECTION** : Si la ressource n'est ni en ligne ni dans le cache,
            // on renvoie une réponse d'erreur JSON valide pour éviter le crash.
            return new Response(JSON.stringify({ error: "Offline et non mis en cache." }), {
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            });
          });
      })
    );
    return;
  }

  // Stratégie pour tous les autres fichiers (pages, CSS, JS) : "Cache First"
  event.respondWith(
    caches.match(request).then(response => {
      return response || fetch(request);
    })
  );
});

// --- Gestion de la Synchronisation en Arrière-plan ---

// 4. Sync : Se déclenche lorsque la connexion revient.
self.addEventListener('sync', event => {
  if (event.tag === 'sync-failed-requests') {
    console.log('[Service Worker] Synchronisation en arrière-plan démarrée.');
    event.waitUntil(replayAllFailedRequests());
  }
});

/**
 * Rejoue toutes les requêtes en attente depuis IndexedDB.
 */
async function replayAllFailedRequests() {
  try {
    const db = await idb.openDB(DB_NAME, 1, {
        upgrade(db) {
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
          }
        }
    });
    const allRequests = await db.getAll(STORE_NAME);

    const promises = allRequests.map(request => {
      console.log('[Service Worker] Tentative de rejouer la requête:', request.url);
      return fetch(request.url, {
        method: request.method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${request.token}` // Utilise le token sauvegardé avec la requête
        },
        body: JSON.stringify(request.payload)
      }).then(response => {
        if (response.ok) {
          console.log(`[Service Worker] Requête pour ${request.url} réussie.`);
          return db.delete(STORE_NAME, request.id); // On la supprime de la file d'attente
        } else {
           console.error(`[Service Worker] Échec de la requête ${request.url}, statut: ${response.status}`);
           // Si l'erreur est une erreur client (4xx, ex: "Bad Request"),
           // on supprime la requête pour éviter des boucles de synchronisation infinies.
           if (response.status >= 400 && response.status < 500) {
               return db.delete(STORE_NAME, request.id);
           }
        }
      });
    });

    await Promise.all(promises);
    console.log('[Service Worker] Traitement de la file de synchronisation terminé.');
  } catch (error) {
    console.error('[Service Worker] Erreur majeure lors du rejeu des requêtes:', error);
    // L'erreur est relancée pour que le navigateur puisse retenter la synchronisation plus tard
    throw error;
  }
}