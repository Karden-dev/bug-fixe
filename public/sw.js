// public/sw.js
// Version finalisée v1.3 : Mise à jour pour une gestion complète du cache et du Background Sync (IndexedDB)

// --- Fichiers/Imports ---

// Importation des scripts nécessaires pour IndexedDB et notre helper.
// Assurez-vous que ces chemins sont corrects. db-helper.js doit contenir les fonctions IndexedDB.
importScripts('/js/db-helper.js');

const CACHE_NAME = 'wink-express-v3'; // Nom du cache statique (App Shell)
const DATA_CACHE_NAME = 'wink-express-data-v1'; // Nom du cache pour les données API GET

// Configuration IndexedDB (Doit correspondre à la configuration dans db-helper.js et les fichiers clients)
const DB_NAME = 'RiderDB';
const STORE_NAME = 'offline-requests';

// Liste des fichiers essentiels pour que l'application se lance hors ligne (l'"App Shell")
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

  // Fichiers JS principaux de l'application
  '/js/auth.js',
  '/js/login.js',
  '/js/pwa-loader.js',
  '/js/db-helper.js', 
  '/js/rider.js',     // Ajout des fichiers d'application critiques
  '/js/reports.js',   // Ajout des fichiers d'application critiques
  '/js/cash.js',      // Ajout des fichiers d'application critiques
  '/js/ridercash.js', // Ajout des fichiers d'application critiques

  // Fichiers CSS et JS externes
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/bootstrap-icons/1.11.3/font/bootstrap-icons.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js',
  'https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js',
  'https://cdn.jsdelivr.net/npm/idb@7/build/umd.js', 
  // Ajout de Moment.js si utilisé dans ridercash/reports
  'https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.30.1/moment.min.js', 
  
  // Logos et icônes
  '/wink.png',
  '/wink-logo.png',
  '/favicon.ico',
  '/icons/wink-icon-192x192.png',
  '/icons/wink-icon-512x512.png'
];

// --- Fonctions IndexedDB (Doit correspondre aux Helpers) ---

// Les fonctions openDB, getRequest, deleteRequest sont supposées exister dans db-helper.js
// Nous allons les définir ici pour la cohérence et pour s'assurer que le Service Worker peut les utiliser.

const openDB = () => {
    return new Promise((resolve, reject) => {
        // Tenter d'ouvrir la DB sans spécifier la version
        const request = indexedDB.open(DB_NAME); 
        request.onerror = (event) => reject(event.target.errorCode);
        request.onsuccess = (event) => resolve(event.target.result);
    });
};

const getRequest = (db, tag) => {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const index = store.index('by_tag'); 
        const request = index.get(tag);

        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => reject(event.target.error);
    });
};

const deleteRequest = (db, id) => {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = (event) => reject(event.target.error);
    });
};

// Fonction principale pour rejouer les requêtes sauvegardées dans IndexedDB
async function replayFailedRequests(tag) {
    let db;
    let offlineRequest;
    
    try {
        db = await openDB();
        offlineRequest = await getRequest(db, tag);

        if (!offlineRequest) {
            console.log(`[Sync] Aucune requête trouvée pour le tag ${tag}. Peut-être déjà rejouée.`);
            return;
        }

        // Création des Headers, y compris le jeton d'authentification
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${offlineRequest.token}`
        };

        const response = await fetch(offlineRequest.url, {
            method: offlineRequest.method,
            headers: headers,
            body: JSON.stringify(offlineRequest.payload)
        });

        if (response.ok) {
            await deleteRequest(db, offlineRequest.id);
            console.log(`WinkDev PWA: Requête rejouée et supprimée pour ${offlineRequest.url} (Tag: ${tag})`);
            
            // Notification du client après succès (optionnel)
            self.clients.matchAll().then(clients => {
                clients.forEach(client => {
                    client.postMessage({
                        type: 'SYNC_SUCCESS',
                        message: `Action hors ligne réussie pour ${tag}!`
                    });
                });
            });
        } else {
            console.error(`WinkDev PWA: Échec de la requête rejouée pour ${offlineRequest.url}. Statut: ${response.status}`);
            // Si l'échec n'est pas dû au réseau (ex: 400, 403), on peut décider de supprimer pour ne pas rejouer indéfiniment.
            // Pour l'instant, on laisse l'erreur remonter pour retenter.
            throw new Error(`Sync Replay Failed with status: ${response.status}`);
        }
    } catch (error) {
        console.error(`WinkDev PWA: Erreur réseau/critique en rejouant la requête pour ${offlineRequest?.url || tag}`, error);
        // Laisser l'erreur remonter pour que le navigateur retente la synchronisation plus tard
        throw error; 
    }
}

// --- Étape d'installation ---
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache ouvert. Mise en cache des fichiers de l\'App Shell.');
        return cache.addAll(URLS_TO_CACHE);
      })
  );
});

// --- Étape d'activation ---
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME && name !== DATA_CACHE_NAME)
          .map(name => {
                console.log(`Suppression de l'ancien cache: ${name}`);
                return caches.delete(name);
            })
      );
    })
  );
});

// --- Étape de Fetch ---
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Stratégie pour les requêtes API (Réseau d'abord, puis cache en cas d'échec)
  if (url.pathname.includes('/api/')) {
    // Pour les requêtes non-GET (POST, PUT, DELETE), on les laisse passer au réseau.
    // Le client (rider.js, reports.js) gère la mise en file d'attente s'il y a un échec réseau.
    if (request.method !== 'GET') {
      return;
    }

    // Pour les requêtes GET (lecture de données) - Stratégie Network-First
    event.respondWith(
      caches.open(DATA_CACHE_NAME).then(cache => {
        return fetch(request)
          .then(networkResponse => {
            // Si la requête réseau réussit, on met à jour le cache des données.
            if (networkResponse.status === 200) {
              cache.put(request.url, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => {
            // Si le réseau échoue, on cherche dans le cache de données.
            console.log('WinkDev PWA: Réseau indisponible, service depuis le cache pour:', request.url);
            return cache.match(request);
          });
      })
    );
    return;
  }

  // Stratégie par défaut pour tous les autres fichiers (Cache d'abord)
  event.respondWith(
    caches.match(request)
      .then(response => {
        // Si la ressource est dans le cache, on la sert, sinon on va sur le réseau.
        return response || fetch(request);
      })
  );
});

// --- Écouteur pour la synchronisation en arrière-plan ---
self.addEventListener('sync', event => {
    const isActionTag = event.tag.startsWith('sync-status-') || 
                        event.tag.startsWith('sync-return-') || 
                        event.tag.startsWith('sync-remittance-') ||
                        event.tag.startsWith('sync-process-storage-') || 
                        event.tag.startsWith('sync-recalculate-'); 
    
    if (isActionTag) {
        console.log(`WinkDev PWA: Événement de synchronisation reçu pour le Tag: ${event.tag}`);
        event.waitUntil(replayFailedRequests(event.tag));
    }
});