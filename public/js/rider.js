// public/js/rider.js
// Utilisation de Moment.js s'il est chargé globalement
const moment = (typeof window.moment === 'function') ? window.moment : (date) => new Date(date);

document.addEventListener('DOMContentLoaded', async () => {
    // --- CONFIGURATION ---
    const API_BASE_URL = '/api';
    // --- AJOUTÉ: URL WebSocket ---
    const WS_URL = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`;
    let currentUser; // Sera initialisé par checkAuthAndInit
    let currentOrderId; // Utilisé pour les modales d'action
    let chatOrderId = null; // ID spécifique pour la conversation ouverte dans la modale chat
    let lastPendingOrderCount = 0; // Gardé pour la logique de notification sonore
    let lastMessageTimestamp = null; // Pour le chargement initial du chat
    // --- SUPPRIMÉ: Constantes Polling ---

    // --- AJOUTÉ: Référence WebSocket ---
    let ws = null;

    // --- Références DOM ---
    const ordersContainer = document.getElementById('ordersContainer');
    const navLinks = document.querySelectorAll('.nav-link[data-tab]');
    const searchInput = document.getElementById('searchInput');
    const dateFilters = document.getElementById('dateFilters');
    const startDateFilter = document.getElementById('startDateFilter'); // Ajouté pour référence
    const endDateFilter = document.getElementById('endDateFilter');   // Ajouté pour référence
    const filterDateBtn = document.getElementById('filterDateBtn');     // Ajouté pour référence
    const globalNotificationBadge = document.getElementById('globalNotificationBadge');

    // Modales (Références des éléments principaux)
    const statusActionModalEl = document.getElementById('statusActionModal');
    const statusActionModal = statusActionModalEl ? new bootstrap.Modal(statusActionModalEl) : null;
    const deliveredPaymentModalEl = document.getElementById('deliveredPaymentModal');
    const deliveredPaymentModal = deliveredPaymentModalEl ? new bootstrap.Modal(deliveredPaymentModalEl) : null;
    const failedDeliveryModalEl = document.getElementById('failedDeliveryModal');
    const failedDeliveryModal = failedDeliveryModalEl ? new bootstrap.Modal(failedDeliveryModalEl) : null;
    const returnModalEl = document.getElementById('returnModal');
    const returnModal = returnModalEl ? new bootstrap.Modal(returnModalEl) : null;

    // Nouveaux éléments de chat
    const chatModalRiderEl = document.getElementById('chatModalRider');
    const chatModalRider = chatModalRiderEl ? new bootstrap.Modal(chatModalRiderEl) : null;
    const chatRiderOrderIdSpan = document.getElementById('chatRiderOrderId');
    const chatMessagesRider = document.getElementById('chatMessagesRider');
    const quickReplyButtonsRider = document.getElementById('quickReplyButtonsRider');
    const messageInputRider = document.getElementById('messageInputRider');
    const sendMessageBtnRider = document.getElementById('sendMessageBtnRider');
    const requestModificationBtn = document.getElementById('requestModificationBtn');

    // Spans / Boutons dans les modales existantes
    const actionModalOrderIdSpan = document.getElementById('actionModalOrderId');
    const statusSelectionDiv = document.getElementById('statusSelection');
    const deliveredModalOrderIdSpan = document.getElementById('deliveredModalOrderId');
    const failedModalOrderIdSpan = document.getElementById('failedModalOrderId');
    const failedDeliveryForm = document.getElementById('failedDeliveryForm'); // Ajouté pour référence
    const paymentCashBtn = document.getElementById('paymentCashBtn');       // Ajouté pour référence
    const paymentSupplierBtn = document.getElementById('paymentSupplierBtn');   // Ajouté pour référence
    const returnModalOrderIdSpan = document.getElementById('returnModalOrderId');
    const confirmReturnBtn = document.getElementById('confirmReturnBtn');     // Ajouté pour référence

    const notificationSound = new Audio('/sound.mp3'); // Assurez-vous que le chemin est correct

    // Constantes
    const statusTranslations = { 'pending': 'En attente', 'in_progress': 'En cours', 'delivered': 'Livrée', 'cancelled': 'Annulée', 'failed_delivery': 'Livraison ratée', 'reported': 'À relancer', 'return_pending': 'Retour en attente', 'returned': 'Retourné' };
    const paymentTranslations = { 'pending': 'En attente', 'cash': 'En espèces', 'paid_to_supplier': 'Mobile Money', 'cancelled': 'Annulé' };
    const unprocessedStatuses = ['pending', 'in_progress', 'reported']; // Pour le tri

    // --- Fonctions Utilitaires ---

    const debounce = (func, delay = 300) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                func.apply(this, args);
            }, delay);
        };
    };

    const showNotification = (message, type = 'success') => {
        const container = document.body; // Modifier si vous avez un conteneur spécifique
        const alertId = `notif-${Date.now()}`;
        const alert = document.createElement('div');
        alert.id = alertId;
        // Styles pour affichage en haut
        alert.style.position = 'fixed';
        alert.style.top = '10px';
        alert.style.right = '10px';
        alert.style.zIndex = '1060'; // Au-dessus des modales
        alert.style.minWidth = '250px';
        alert.style.maxWidth = '90%';

        alert.className = `alert alert-${type} alert-dismissible fade show`;
        alert.role = 'alert';
        alert.innerHTML = `${message}<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>`;
        container.appendChild(alert);
        setTimeout(() => {
            const activeAlert = document.getElementById(alertId);
            if(activeAlert) { try { bootstrap.Alert.getOrCreateInstance(activeAlert)?.close(); } catch (e) { activeAlert.remove(); } }
        }, 5000);
    };

    const formatDate = (dateString) => dateString ? moment(dateString).format('DD MMM YYYY') : 'N/A';
    const formatAmount = (amount) => `${Number(amount || 0).toLocaleString('fr-FR')} FCFA`;

    const getAuthHeader = () => { const token = AuthManager.getToken(); return token ? { 'Authorization': `Bearer ${token}` } : null; };

    const handleAuthError = (error) => {
        console.error("Erreur API:", error);
        if (error.response?.status === 401 || error.response?.status === 403) {
            // stopChatPolling(); // Supprimé
            showNotification("Session expirée. Reconnexion...", "danger");
            if (ws) { ws.close(1008, "Session expirée"); } // Fermer WS avant logout
            AuthManager.logout();
        } else if (!navigator.onLine) {
            showNotification("Hors ligne. Actions mises en file d'attente si possible.", "warning");
        } else {
             const errMsg = error.response?.data?.message || error.message || "Erreur serveur.";
             if (error.response?.status !== 404) { showNotification(`Erreur: ${errMsg}`, "danger"); }
             else { console.warn("Ressource API non trouvée (404)"); }
        }
    };

    // --- AJOUTÉ: Initialisation et gestion WebSocket ---

    const initWebSocket = () => {
        const token = AuthManager.getToken();
        if (!token) {
            console.error("WebSocket Rider: Token non trouvé.");
            return;
        }
        if (ws && ws.readyState === WebSocket.OPEN) {
             console.log("WebSocket Rider: Déjà connecté.");
             return; // Déjà connecté
        }

        console.log(`WebSocket Rider: Tentative connexion à ${WS_URL}...`);
        ws = new WebSocket(`${WS_URL}?token=${token}`);

        ws.onopen = () => {
            console.log('WebSocket Rider: Connexion établie.');
            // Charger données initiales après connexion
            updateSidebarCounters(); // Mettre à jour les compteurs
            const activeTab = document.querySelector('.nav-link.active')?.dataset.tab || 'today';
            fetchOrders(activeTab); // Charger onglet par défaut
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('WebSocket Rider: Message reçu:', data);
                handleWebSocketMessage(data);
            } catch (error) {
                console.error('WebSocket Rider: Erreur parsing message:', error);
            }
        };

        ws.onerror = (error) => {
            console.error('WebSocket Rider: Erreur connexion:', error);
            // showNotification("Erreur connexion temps réel.", "danger"); // Optionnel
        };

        ws.onclose = (event) => {
            console.log(`WebSocket Rider: Connexion fermée. Code: ${event.code}, Raison: ${event.reason}`);
            ws = null;
            if (event.code !== 1000 && event.code !== 1008) { // Ne pas retenter si déconnexion normale ou token invalide
                console.log("WebSocket Rider: Reconnexion dans 5s...");
                setTimeout(initWebSocket, 5000);
            } else if (event.code === 1008) {
                 showNotification("Authentification temps réel échouée.", "warning");
                 AuthManager.logout(); // Si le token est rejeté, déconnecter
            }
        };
    };

    const handleWebSocketMessage = (data) => {
        switch (data.type) {
            case 'AUTH_SUCCESS':
                console.log("WebSocket Rider: Auth confirmée.");
                break;
            case 'NEW_MESSAGE':
                if (data.payload && data.payload.order_id === chatOrderId && chatModalRiderEl?.classList.contains('show')) {
                    // Si le chat est ouvert pour cette commande
                    renderRiderMessages([data.payload], false);
                    if (document.visibilityState === 'visible') {
                        markMessagesAsRead(chatOrderId, data.payload.id); // Marquer comme lu
                    }
                } else if (data.payload) {
                    // Mettre à jour le badge sur la carte commande si elle est visible
                    updateOrderCardBadge(data.payload.order_id);
                     // Jouer le son si le message n'est pas de moi
                     if (currentUser && data.payload.user_id !== currentUser.id) {
                         notificationSound.play().catch(e => console.warn("Impossible jouer son:", e));
                     }
                }
                updateSidebarCounters(); // Mettre à jour compteur global non lu
                break;
            case 'UNREAD_COUNT_UPDATE':
                if (globalNotificationBadge && data.payload) {
                    const count = data.payload.unreadCount || 0;
                    // Mettre à jour le badge global (messages + notifs potentielles)
                    // Pour l'instant, seul le compteur de messages est reçu
                    globalNotificationBadge.textContent = count;
                    globalNotificationBadge.classList.toggle('d-none', count === 0);
                }
                break;
            case 'CONVERSATION_LIST_UPDATE': // Utilisé par l'admin, mais peut être utile ici pour forcer un refresh
                 console.log("WebSocket Rider: Demande refresh liste reçue.");
                 const activeTab = document.querySelector('.nav-link.active')?.dataset.tab || 'today';
                 fetchOrders(activeTab); // Rafraîchir la liste actuelle
                 break;
            case 'NEW_ORDER_ASSIGNED': // Événement spécifique pour les nouvelles commandes
                 if (data.payload && data.payload.deliveryman_id === currentUser?.id) {
                     showNotification(`🔔 Nouvelle commande #${data.payload.order_id} assignée !`, 'info');
                     notificationSound.play().catch(e => console.warn("Impossible jouer son:", e));
                     updateSidebarCounters(); // Mettre à jour les compteurs
                     // Si l'onglet 'Aujourd'hui' est actif, rafraîchir la liste
                     if (document.querySelector('.nav-link.active')?.dataset.tab === 'today') {
                         fetchOrders('today');
                     }
                 }
                 break;
            case 'ORDER_STATUS_UPDATE': // Événement potentiel si l'admin change un statut
                 if (data.payload && data.payload.deliveryman_id === currentUser?.id) {
                     console.log(`WebSocket Rider: MAJ statut Cde #${data.payload.order_id}`);
                     // Rafraîchir la liste si la commande est visible
                     const activeTabRefresh = document.querySelector('.nav-link.active')?.dataset.tab || 'today';
                     fetchOrders(activeTabRefresh);
                     updateSidebarCounters();
                 }
                 break;
            case 'ERROR':
                 console.error("WebSocket Rider: Erreur serveur:", data.message);
                 break;
            default:
                console.warn(`WebSocket Rider: Type message non géré: ${data.type}`);
        }
    };

     /**
     * Informe le serveur que le livreur a rejoint une conversation.
     * @param {number} orderId
     */
    const joinConversation = (orderId) => {
        if (ws && ws.readyState === WebSocket.OPEN && orderId) {
            ws.send(JSON.stringify({ type: 'JOIN_CONVERSATION', payload: { orderId } }));
            console.log(`WebSocket Rider: Envoi JOIN pour ${orderId}`);
        }
    };

    /**
     * Informe le serveur que le livreur a quitté une conversation.
     * @param {number} orderId
     */
    const leaveConversation = (orderId) => {
         if (ws && ws.readyState === WebSocket.OPEN && orderId) {
            ws.send(JSON.stringify({ type: 'LEAVE_CONVERSATION', payload: { orderId } }));
            console.log(`WebSocket Rider: Envoi LEAVE pour ${orderId}`);
         }
    };

     /**
      * Marque les messages comme lus via API (appel silencieux).
      * @param {number} orderId
      * @param {number} lastMessageId
      */
     const markMessagesAsRead = async (orderId, lastMessageId) => {
         const headers = getAuthHeader();
         if (!headers || !orderId || !lastMessageId || !currentUser) return;
         try {
             // Fait un appel GET pour déclencher markAsRead côté serveur
             await axios.get(`${API_BASE_URL}/orders/${orderId}/messages?triggerRead=${lastMessageId}`, { headers });
             console.log(`WebSocket Rider: Marqué lu Cde ${orderId} jusqu'à ${lastMessageId}`);
             // Rafraîchir le compteur global après avoir marqué comme lu
             updateSidebarCounters();
             // Optionnel: Retirer le badge de la carte commande si visible
             updateOrderCardBadge(orderId, 0); // Force le retrait du badge visuel

         } catch (error) {
              if (error.response?.status !== 401 && error.response?.status !== 403) {
                 console.error(`Erreur marquage lu Cde ${orderId}:`, error);
              }
              // Si 401/403, sera géré ailleurs
         }
     };

     /**
      * Met à jour le badge non lu sur une carte commande spécifique.
      * @param {number} orderId
      * @param {number|null} count - Le nouveau compte (null pour juste rafraîchir via API)
      */
     const updateOrderCardBadge = (orderId, count = null) => {
         const chatButton = ordersContainer?.querySelector(`.order-card .chat-btn[data-order-id="${orderId}"]`);
         if (!chatButton) return; // Carte non visible

         let finalCount = count;
         // Si count est null, on pourrait re-fetch l'info, mais pour l'instant on se base sur le push server
         if (finalCount === null) return;


         const badge = chatButton.querySelector('.badge');
         if (finalCount > 0) {
             if (badge) {
                 badge.textContent = finalCount;
                 badge.classList.remove('d-none');
             } else {
                 // Créer le badge s'il n'existe pas
                 const newBadge = document.createElement('span');
                 newBadge.className = 'badge bg-danger rounded-pill';
                 newBadge.textContent = finalCount;
                 chatButton.appendChild(newBadge); // Ajouter le badge DANS le bouton
             }
         } else {
             // Cacher ou supprimer le badge si count est 0
             if (badge) {
                 badge.classList.add('d-none');
                 badge.textContent = '0';
             }
         }
     };

    // --- Fonctions de Rendu ---
    const sortRiderOrders = (orders) => {
         return orders.sort((a, b) => {
             const a_isUnprocessed = unprocessedStatuses.includes(a.status);
             const b_isUnprocessed = unprocessedStatuses.includes(b.status);

             if (a_isUnprocessed && !b_isUnprocessed) return -1;
             if (!a_isUnprocessed && b_isUnprocessed) return 1;

             // Pour les non traités, tri par urgence puis par date
             if (a_isUnprocessed && b_isUnprocessed) {
                 if (a.is_urgent !== b.is_urgent) return a.is_urgent ? -1 : 1;
             }
             // Sinon (ou si même urgence), tri par date de création (plus ancienne en premier)
             return moment(a.created_at).diff(moment(b.created_at));
         });
     };

    const renderOrders = (orders) => {
        const activeTab = document.querySelector('.nav-link.active')?.dataset.tab;

        if (activeTab === 'today') {
            orders = sortRiderOrders(orders);
        } else {
            orders.sort((a,b) => moment(b.created_at).diff(moment(a.created_at)));
        }

        if (!ordersContainer) return;

        if (!orders || !Array.isArray(orders) || orders.length === 0) {
            ordersContainer.innerHTML = `<p class="text-center text-muted mt-5">Aucune commande ici.</p>`;
            return;
        }

        ordersContainer.innerHTML = ''; // Vider avant de re-remplir
        orders.forEach(order => {
            const orderCard = document.createElement('div');
            orderCard.className = `order-card ${order.is_urgent ? 'urgent' : ''}`;

            const shopName = order.shop_name || 'N/A';
            const customerName = order.customer_name || 'Inconnu';
            const customerPhone = order.customer_phone || 'N/A';
            const deliveryLocation = order.delivery_location || 'Non spécifiée';
            const itemNames = order.items_list || 'Non spécifié';
            const clientInfo = customerName !== 'Inconnu' ? `${customerPhone} (${customerName})` : customerPhone;

            // --- CORRECTION DU MONTANT À RÉCUPÉRER ---
            // Affiche juste le montant de l'article
            const amountToDisplay = (parseFloat(order.article_amount) || 0);

            const statusText = statusTranslations[order.status] || order.status;
            const paymentText = paymentTranslations[order.payment_status] || order.payment_status;
            const statusDotClass = `status-dot status-${order.status}`;
            const paymentDotClass = `payment-dot payment-${order.payment_status}`;
            const isFinalStatus = ['delivered', 'cancelled', 'returned'].includes(order.status);

            const unreadCount = order.unread_count || 0;
            const unreadBadgeHtml = unreadCount > 0 ? `<span class="badge bg-danger rounded-pill">${unreadCount}</span>` : '';
            const urgentIconHtml = order.is_urgent ? '<i class="bi bi-exclamation-triangle-fill text-danger ms-1" title="URGENT"></i>' : '';

            // Structure HTML de la carte
            orderCard.innerHTML = `
                <div class="order-card-header">
                    <h6 class="order-id mb-0">Commande #${order.id} ${urgentIconHtml}</h6>
                    <div class="order-actions">
                        <button class="btn chat-btn" data-order-id="${order.id}" type="button" title="Discussion">
                            <i class="bi bi-chat-dots"></i>
                            ${unreadBadgeHtml}
                        </button>
                        <div class="dropdown">
                            <button class="btn" type="button" data-bs-toggle="dropdown" title="Actions"><i class="bi bi-gear"></i></button>
                            <ul class="dropdown-menu dropdown-menu-end">
                                <li>
                                    <a class="dropdown-item status-btn ${isFinalStatus ? 'disabled text-muted' : ''}"
                                       data-order-id="${order.id}" href="#"><i class="bi bi-check2-circle me-2"></i> Statuer la commande</a>
                                </li>
                                <li>
                                    <a class="dropdown-item return-btn ${isFinalStatus ? 'disabled text-muted' : ''}"
                                       data-order-id="${order.id}" href="#"><i class="bi bi-box-arrow-left me-2"></i> Déclarer un retour</a>
                                </li>
                            </ul>
                        </div>
                        <div class="dropdown">
                            <button class="btn btn-corail" type="button" data-bs-toggle="dropdown" title="Contacter"><i class="bi bi-telephone"></i></button>
                            <ul class="dropdown-menu dropdown-menu-end">
                                <li><a class="dropdown-item" href="tel:${customerPhone.replace(/\s/g, '')}"><i class="bi bi-telephone-outbound me-2"></i> Appeler Client</a></li>
                                <li><a class="dropdown-item" href="sms:${customerPhone.replace(/\s/g, '')}"><i class="bi bi-chat-text me-2"></i> Envoyer SMS Client</a></li>
                                <li><a class="dropdown-item" href="https://wa.me/${customerPhone.replace(/\D/g, '')}" target="_blank"><i class="bi bi-whatsapp me-2"></i> WhatsApp Client</a></li>
                            </ul>
                        </div>
                    </div>
                </div>
                <hr class="my-2">
                <div class="order-details">
                    <p><span class="detail-label">Marchand:</span> <span class="detail-value">${shopName}</span></p>
                    <p><span class="detail-label">Client:</span> <span class="detail-value">${clientInfo}</span></p>
                    <p><span class="detail-label">Adresse:</span> <span class="detail-value">${deliveryLocation}</span></p>
                    <p><span class="detail-label">Article(s):</span> <span class="detail-value">${itemNames}</span></p>
                    <p class="status-line">
                        <span class="detail-label">Statut:</span>
                        <span class="status-badge"><span class="${statusDotClass}"></span>${statusText}</span>
                        <span class="payment-badge"><span class="${paymentDotClass}"></span>${paymentText}</span>
                    </p>
                    <p><span class="detail-label">À récupérer:</span> <span class="detail-value fw-bold text-success">${formatAmount(amountToDisplay)}</span></p> {/*salut mon meilleur livreur 😘.*/}
                    <p class="text-muted text-end" style="font-size: 0.75rem;">Créée le ${formatDate(order.created_at)}</p>
                </div>
            `;
            ordersContainer.appendChild(orderCard);
        });
    };


    // --- Logique de Polling du Chat (SUPPRIMÉE) ---

    // Rend les messages dans la modale chat
    const renderRiderMessages = (messages, replace = true) => {
        if (!chatMessagesRider) return;
        if (replace) chatMessagesRider.innerHTML = '';
        const isScrolledDown = chatMessagesRider.scrollHeight - chatMessagesRider.scrollTop - chatMessagesRider.clientHeight < 50;

        messages.forEach(msg => {
            if (!msg || typeof msg.id === 'undefined') {
                console.warn("Message ignoré car ID manquant ou message invalide.");
                return;
            }
            const currentUserIdValid = currentUser && typeof currentUser.id !== 'undefined';
            if (!replace && chatMessagesRider.querySelector(`[data-message-id="${msg.id}"]`)) return;

            const messageDiv = document.createElement('div');
            messageDiv.dataset.messageId = msg.id;
            const isSentByMe = currentUserIdValid ? (msg.user_id === currentUser.id) : false;
            const isSystem = msg.message_type === 'system';
            let messageClass = 'message';
            if (isSystem) messageClass += ' message-system';
            else if (isSentByMe) messageClass += ' message-sent';
            else messageClass += ' message-received';
            messageDiv.className = messageClass;
            const time = moment(msg.created_at).format('HH:mm');
            const author = isSystem ? '' : `<strong>${isSentByMe ? 'Moi' : (msg.user_name || 'Admin')}:</strong><br>`;
            const messageContent = (msg.message_content || '').replace(/#(\d+)/g, '<span class="text-info">#$1</span>'); // Simplement colorer le tag
            messageDiv.innerHTML = `${author}${messageContent}<div class="message-meta">${time}</div>`;
            chatMessagesRider.appendChild(messageDiv);
        });

        if (isScrolledDown || replace) {
            setTimeout(() => { if(chatMessagesRider) chatMessagesRider.scrollTop = chatMessagesRider.scrollHeight; }, 0); // Léger délai
        }
     };

    // Charge les messages initiaux pour une commande (appel API GET)
    const loadRiderMessages = async (orderId, since = null) => {
        if (since) { // Ne plus utiliser 'since' avec WebSocket
             console.warn("loadRiderMessages (Rider) appelé avec 'since'. Ignoré.");
             return;
        }
        const headers = getAuthHeader(); if (!headers) return;
        if (chatMessagesRider) chatMessagesRider.innerHTML = `<p class="text-center text-muted p-5"><div class="spinner-border spinner-border-sm"></div> Chargement...</p>`;

        try {
            const response = await axios.get(`${API_BASE_URL}/orders/${orderId}/messages`, { headers }); // Pas de param 'since'
            const messages = response.data || [];

            if (messages.length > 0) {
                 renderRiderMessages(messages, true); // Remplace le contenu
                 lastMessageTimestamp = messages[messages.length - 1].created_at;
                 // Marquer comme lu après chargement
                 markMessagesAsRead(orderId, messages[messages.length - 1].id);
            } else if (chatMessagesRider) {
                 chatMessagesRider.innerHTML = `<p class="text-center text-muted p-5">Aucun message.</p>`;
            }
             updateSidebarCounters(); // Mettre à jour compteur global après chargement/lecture
             // Rafraîchir la liste en arrière-plan pour les badges
             const activeTabBg = document.querySelector('.nav-link.active')?.dataset.tab || 'today';
             fetchOrders(activeTabBg);


        } catch (error) {
            console.error(`Erreur messages Cde ${orderId}:`, error);
            if (error.response?.status === 403) { showNotification("Accès refusé à cette conversation.", "warning"); if(chatModalRider) chatModalRider.hide(); }
            else if (chatMessagesRider) { chatMessagesRider.innerHTML = `<p class="text-center text-danger p-5">Erreur chargement.</p>`; }
            handleAuthError(error); // Gère 401/403 et autres erreurs
        }
    };

    // Charge les messages rapides
    const loadRiderQuickReplies = async () => {
        const headers = getAuthHeader(); if (!headers || !quickReplyButtonsRider) return;
        quickReplyButtonsRider.innerHTML = ''; // Vider avant de remplir
        try {
            const response = await axios.get(`${API_BASE_URL}/suivis/quick-replies`, { headers });
            const quickReplies = response.data || [];

            quickReplies.forEach(replyText => {
                 const button = document.createElement('button');
                 button.className = 'btn btn-sm btn-outline-secondary';
                 button.textContent = replyText;
                 button.type = 'button';
                 button.addEventListener('click', () => {
                      if(messageInputRider) {
                          messageInputRider.value += (messageInputRider.value ? ' ' : '') + replyText;
                          messageInputRider.focus();
                          messageInputRider.dispatchEvent(new Event('input', { bubbles: true })); // Déclencher event pour redimensionner si besoin
                      }
                 });
                 quickReplyButtonsRider.appendChild(button);
             });
        } catch (error) {
            console.error("Erreur chargement messages rapides:", error);
            // Ne pas bloquer l'interface pour ça
        }
    };

    // Envoie un message (utilise toujours axios.post, réception via WebSocket)
    const sendRiderMessage = async () => {
         const content = messageInputRider?.value.trim();
        if (!content || !chatOrderId) return;
        const headers = getAuthHeader(); if (!headers) return;
        if (!currentUser || typeof currentUser.id === 'undefined') {
            showNotification("Erreur d'utilisateur.", "danger"); return;
        }

        const tempId = `temp_${Date.now()}`;
        const optimisticMessage = { id: tempId, user_id: currentUser.id, user_name: currentUser.name, message_content: content, created_at: new Date().toISOString(), message_type: 'user' };

        renderRiderMessages([optimisticMessage], false); // Affichage optimiste
        if(messageInputRider) { messageInputRider.value = ''; messageInputRider.rows = 1; }
        if(sendMessageBtnRider) sendMessageBtnRider.disabled = true;

        try {
            // Envoi via API POST normale
            await axios.post(`${API_BASE_URL}/orders/${chatOrderId}/messages`, { message_content: content }, { headers });
            // Le serveur diffusera via WebSocket, la réception mettra à jour l'UI

            // Optionnel: Retirer l'optimiste immédiatement (peut causer un léger flash si WS lent)
            const msgElement = chatMessagesRider?.querySelector(`[data-message-id="${tempId}"]`);
            // if (msgElement) msgElement.remove();

        } catch (error) {
            console.error(`Erreur envoi Cde ${chatOrderId}:`, error);
            showNotification("Erreur d'envoi.", 'danger');
            const msgElement = chatMessagesRider?.querySelector(`[data-message-id="${tempId}"]`);
            if (msgElement) { msgElement.style.opacity = '0.5'; msgElement.title = "Échec."; }
            handleAuthError(error);
        } finally { if(sendMessageBtnRider) sendMessageBtnRider.disabled = false; }
    };

    // Pré-remplit le message pour la demande de modification
    const requestOrderModification = () => {
         if(!messageInputRider) return;
         const prefix = "Demande de modification : ";
         const detailedMessage = prefix + "Veuillez préciser ici l'erreur (client, adresse, articles, montant...).";
         messageInputRider.value = detailedMessage;
         messageInputRider.focus();

         // Place le curseur après le préfixe pour faciliter la saisie
         if (messageInputRider.setSelectionRange) {
             const startPos = prefix.length;
             messageInputRider.setSelectionRange(startPos, startPos);
         }
         showNotification("Précisez la modification et cliquez sur Envoyer.", 'info');
     };


    // --- Logique Principale et Initialisation ---

    // Initialisation (modifiée pour WebSocket)
    const checkAuthAndInit = () => {
        currentUser = AuthManager.getUser();
        if (!currentUser || !currentUser.token || currentUser.role !== 'livreur') {
            console.error("Rider Auth échouée ou rôle incorrect. Redirection...");
            AuthManager.logout();
            return;
        }
        axios.defaults.headers.common['Authorization'] = `Bearer ${currentUser.token}`;
        if (document.getElementById('riderName')) document.getElementById('riderName').textContent = currentUser.name || 'Livreur';
        if (document.getElementById('riderRole')) document.getElementById('riderRole').textContent = 'Livreur';

        // --- AJOUTÉ: Initialiser WebSocket ---
        initWebSocket();

        // Les chargements initiaux se font dans ws.onopen
    };

    // --- SUPPRIMÉ: startOrderPolling ---

    // Met à jour les compteurs (appelé par WebSocket ou au chargement)
    const updateSidebarCounters = async () => {
        const headers = getAuthHeader(); if(!headers) return;
        try {
            // Appels API restent nécessaires pour avoir un état frais des compteurs
            const [countsResponse, unreadResponse] = await Promise.all([
                 axios.get(`${API_BASE_URL}/rider/counts`, { headers }),
                 axios.get(`${API_BASE_URL}/suivis/unread-count`, { headers }) // Compteur messages non lus
            ]);

            const counts = countsResponse.data || {};
            const unreadMsgCount = unreadResponse.data.unreadCount || 0;

            const totalToday = (counts.pending || 0) + (counts.in_progress || 0) + (counts.reported || 0);

            // Mise à jour badges sidebar
            if(document.getElementById('todayCount')) document.getElementById('todayCount').textContent = totalToday;
            // Calculer total Mes Courses (livré, raté, annulé, retourné + non finalisés)
            const totalMyRides = (counts.delivered || 0) + (counts.failed_delivery || 0) + (counts.cancelled || 0) + (counts.returned || 0) + totalToday + (counts.return_pending || 0);
            if(document.getElementById('myRidesCount')) document.getElementById('myRidesCount').textContent = totalMyRides;
            if(document.getElementById('relaunchCount')) document.getElementById('relaunchCount').textContent = counts.reported || 0;
            if(document.getElementById('returnsCount')) document.getElementById('returnsCount').textContent = (counts.return_pending || 0) + (counts.returned || 0);

            // Mise à jour badge global (notifications + messages non lus)
            // Note: counts.notifications n'est pas utilisé actuellement par l'API rider/counts
            const totalGlobalBadgeCount = unreadMsgCount;
             if (globalNotificationBadge) {
                 globalNotificationBadge.textContent = totalGlobalBadgeCount;
                 globalNotificationBadge.classList.toggle('d-none', totalGlobalBadgeCount === 0);
             }

        } catch (error) {
            console.error('Erreur compteurs:', error);
            handleAuthError(error); // Gère déconnexion si besoin
        }
     };

    // Récupère et affiche les commandes (inchangé pour la logique API)
    const fetchOrders = async (tabName, searchQuery = '') => {
        const headers = getAuthHeader(); if(!headers) return;
        const params = {}; const today = moment().format('YYYY-MM-DD');
        switch (tabName) {
            case 'today': params.status = ['pending', 'in_progress', 'reported']; params.startDate = today; params.endDate = today; break;
            case 'my-rides': params.status = 'all'; if(startDateFilter?.value) params.startDate = startDateFilter.value; if(endDateFilter?.value) params.endDate = endDateFilter.value; break;
            case 'relaunch': params.status = 'reported'; const oneWeekAgo = moment().subtract(7, 'days').format('YYYY-MM-DD'); params.startDate = oneWeekAgo; params.endDate = today; break;
            case 'returns': params.status = ['cancelled', 'failed_delivery', 'return_pending', 'returned']; const oneMonthAgo = moment().subtract(1, 'month').format('YYYY-MM-DD'); params.startDate = oneMonthAgo; params.endDate = today; break; // Limiter l'historique des retours
            default: params.status = 'all';
        }
        if (searchQuery) { params.search = searchQuery; }

        params.include_unread_count = true; // Demande les compteurs non lus

        if (!ordersContainer) return;

        try {
            // Afficher spinner seulement si pas déjà plein de cartes
            if(!ordersContainer.querySelector('.order-card')) {
                 ordersContainer.innerHTML = `<p class="text-center text-muted mt-5"><div class="spinner-border spinner-border-sm"></div> Chargement...</p>`;
            }
            const response = await axios.get(`${API_BASE_URL}/rider/orders`, { params, headers });
            renderOrders(response.data || []); // Le rendu utilise maintenant unread_count

        } catch (error) {
            console.error("Erreur récupération commandes:", error);
            if(ordersContainer) ordersContainer.innerHTML = `<p class="text-center text-danger mt-5">Erreur chargement. Vérifiez connexion.</p>`;
            handleAuthError(error);
        }
    };

    // Change l'onglet affiché (inchangé)
    const fetchAndRenderContent = (tabName) => {
        const offcanvasElement = document.getElementById('sidebar');
        const offcanvas = offcanvasElement ? bootstrap.Offcanvas.getInstance(offcanvasElement) || new bootstrap.Offcanvas(offcanvasElement) : null;
        if(offcanvas) offcanvas.hide();

        // Gérer affichage filtres date
        if (tabName === 'my-rides') { dateFilters?.classList.add('d-flex'); dateFilters?.classList.remove('d-none'); }
        else { dateFilters?.classList.remove('d-flex'); dateFilters?.classList.add('d-none'); }

        fetchOrders(tabName, searchInput.value); // Lance le fetch pour l'onglet
        navLinks.forEach(link => link.classList.remove('active'));
        document.querySelector(`.nav-link[data-tab="${tabName}"]`)?.classList.add('active');
    };

    // Met à jour le statut (inchangé pour l'API, mais gestion offline améliorée)
    const updateOrderStatus = async (orderId, status, paymentStatus = null, amountReceived = 0) => {
        const headers = getAuthHeader(); if(!headers) return;
        const currentUser = AuthManager.getUser(); if(!currentUser) return;
        const payload = { status, userId: currentUser.id };
        if (paymentStatus) payload.payment_status = paymentStatus;
        if (status === 'failed_delivery') { payload.amount_received = parseFloat(amountReceived) || 0; }
        const url = `${API_BASE_URL}/orders/${orderId}/status`;

        try {
            if (!navigator.onLine) throw new Error("Offline"); // Simule erreur offline
            await axios.put(url, payload, { headers });
            showNotification(`Statut Cde #${orderId} mis à jour !`, 'success');
            // Rafraîchir la liste et les compteurs
            const activeTabRefresh = document.querySelector('.nav-link.active')?.dataset.tab || 'today';
            fetchOrders(activeTabRefresh);
            updateSidebarCounters();
        } catch (error) {
            // Gestion Offline avec IndexedDB (si db-helper.js est inclus et syncManager existe)
            if (!navigator.onLine && typeof syncManager !== 'undefined') {
                 try {
                     const request = { url, method: 'PUT', payload, token: AuthManager.getToken() };
                     await syncManager.put(request); // Mettre en file d'attente
                     // Demander une synchro dès que possible
                     navigator.serviceWorker.ready.then(sw => sw.sync.register('sync-failed-requests'));
                     showNotification('Mode hors ligne. MAJ statut mise en attente.', 'info');
                     // Optionnel : Mettre à jour l'UI localement de manière optimiste ? (Plus complexe)
                 } catch (dbError) {
                      console.error("Erreur mise en file d'attente:", dbError);
                      showNotification("Erreur sauvegarde hors ligne.", 'danger');
                 }
            } else { // Erreur en ligne
                 showNotification(`Erreur MAJ Cde #${orderId}.`, 'danger');
                 handleAuthError(error);
            }
        }
    };


    // --- LISTENERS ---

    // Navigation Sidebar
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const href = e.currentTarget.getAttribute('href');
            if (href && href !== '#') { window.location.href = href; } // Gère liens externes (Ma Caisse, Perf)
            else { const tabName = e.currentTarget.dataset.tab; fetchAndRenderContent(tabName); } // Gère onglets internes
        });
    });
    // Recherche
    searchInput?.addEventListener('input', debounce(() => {
        const activeTab = document.querySelector('.nav-link.active')?.dataset.tab;
        if (activeTab) fetchOrders(activeTab, searchInput.value);
    }));
    // Filtres date
    filterDateBtn?.addEventListener('click', () => { fetchOrders('my-rides', searchInput.value); });
    startDateFilter?.addEventListener('change', () => { if (document.querySelector('.nav-link.active')?.dataset.tab === 'my-rides') fetchOrders('my-rides', searchInput.value); });
    endDateFilter?.addEventListener('change', () => { if (document.querySelector('.nav-link.active')?.dataset.tab === 'my-rides') fetchOrders('my-rides', searchInput.value); });

    // Déconnexion (modifiée pour fermer WebSocket)
    document.getElementById('logoutBtn')?.addEventListener('click', () => {
        if (ws) { ws.close(1000, "Déconnexion manuelle"); }
        AuthManager.logout();
    });

    // Clics sur cartes commandes (modifié pour gérer join WebSocket)
    ordersContainer?.addEventListener('click', async (e) => {
        const target = e.target.closest('.status-btn, .return-btn, .chat-btn');
        if (!target) return;
        e.preventDefault();
        if (target.classList.contains('disabled')) return;
        currentOrderId = target.dataset.orderId; // Stocke temporairement

        if (target.classList.contains('chat-btn')) {
            if (chatModalRider && currentOrderId) {
                 chatOrderId = currentOrderId; // Définit l'ID pour le chat
                 if(chatRiderOrderIdSpan) chatRiderOrderIdSpan.textContent = chatOrderId;
                 lastMessageTimestamp = null; // Pour recharger l'historique
                 // --- AJOUTÉ: Rejoindre la conversation ---
                 joinConversation(chatOrderId);
                 loadRiderMessages(chatOrderId, null); // Charger historique
                 loadRiderQuickReplies();
                 chatModalRider.show();
             }
        } else if (target.classList.contains('status-btn')) {
            if(actionModalOrderIdSpan) actionModalOrderIdSpan.textContent = currentOrderId;
            if(statusActionModal) statusActionModal.show();
        } else if (target.classList.contains('return-btn')) {
            if(returnModalOrderIdSpan) returnModalOrderIdSpan.textContent = currentOrderId;
            if(returnModal) returnModal.show();
        }
    });

    // Listeners Modale Chat (modifiés pour leave WebSocket)
    if (sendMessageBtnRider) sendMessageBtnRider.addEventListener('click', sendRiderMessage);
    if (messageInputRider) messageInputRider.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendRiderMessage(); } });
    if (requestModificationBtn) requestModificationBtn.addEventListener('click', requestOrderModification);
    if (chatModalRiderEl) chatModalRiderEl.addEventListener('hidden.bs.modal', () => {
        // --- AJOUTÉ: Quitter la conversation WebSocket ---
        leaveConversation(chatOrderId);
        chatOrderId = null; // Réinitialiser
    });
    if(messageInputRider) messageInputRider.addEventListener('input', () => { if(messageInputRider){ messageInputRider.rows = 1; const lines = messageInputRider.value.split('\n').length; const neededRows = Math.max(1, Math.min(lines, 4)); messageInputRider.rows = neededRows; } });

    // Listeners autres modales (status, paiement, retour)
    if(statusSelectionDiv) {
        statusSelectionDiv.addEventListener('click', (e) => {
            const button = e.target.closest('.status-action-btn'); if(!button) return; const status = button.dataset.status; if(statusActionModal) statusActionModal.hide();
            const amountInput = document.getElementById('amountReceived');

            if (status === 'delivered') { if(deliveredModalOrderIdSpan) deliveredModalOrderIdSpan.textContent = currentOrderId; if(deliveredPaymentModal) deliveredPaymentModal.show(); }
            else if (status === 'failed_delivery') { if(failedModalOrderIdSpan) failedModalOrderIdSpan.textContent = currentOrderId; if(amountInput) amountInput.value = '0'; if(failedDeliveryModal) failedDeliveryModal.show(); }
            else { updateOrderStatus(currentOrderId, status); }
        });
    }

    if(paymentCashBtn) paymentCashBtn.addEventListener('click', () => { updateOrderStatus(currentOrderId, 'delivered', 'cash'); if(deliveredPaymentModal) deliveredPaymentModal.hide(); });
    if(paymentSupplierBtn) paymentSupplierBtn.addEventListener('click', () => { updateOrderStatus(currentOrderId, 'delivered', 'paid_to_supplier'); if(deliveredPaymentModal) deliveredPaymentModal.hide(); });
    if(failedDeliveryForm) failedDeliveryForm.addEventListener('submit', (e) => { e.preventDefault(); const amount = document.getElementById('amountReceived').value; updateOrderStatus(currentOrderId, 'failed_delivery', null, amount); if(failedDeliveryModal) failedDeliveryModal.hide(); });
    if(confirmReturnBtn) {
        confirmReturnBtn.addEventListener('click', async () => {
            const payload = { status: 'return_pending', userId: currentUser?.id };
            const url = `${API_BASE_URL}/orders/${currentOrderId}/status`;
            const returnModalInstance = bootstrap.Modal.getInstance(returnModalEl); // Obtenir l'instance pour la fermer

            try {
                if (!navigator.onLine) throw new Error("Offline");
                await axios.put(url, payload, getAuthHeader());
                showNotification('Retour déclaré.');
                // Changer l'onglet actif vers "Retours" et rafraîchir
                fetchAndRenderContent('returns');
            } catch (error) {
                if (!navigator.onLine && typeof syncManager !== 'undefined') {
                     try {
                        const request = { url, method: 'PUT', payload, token: AuthManager.getToken() };
                        await syncManager.put(request);
                        navigator.serviceWorker.ready.then(sw => sw.sync.register('sync-failed-requests'));
                        showNotification("Offline. Déclaration mise en attente.", 'info');
                        // Optionnel: Mettre à jour l'UI localement
                     } catch (dbError) { console.error("Erreur file d'attente retour:", dbError); showNotification("Erreur sauvegarde hors ligne.", 'danger'); }
                } else {
                    showNotification(`Erreur: ${error.response?.data?.message || error.message}`, 'danger');
                    handleAuthError(error);
                }
            } finally {
                if(returnModalInstance) returnModalInstance.hide(); // Fermer la modale dans tous les cas
            }
        });
    }

    // --- INITIALISATION ---
    const initializeApp = () => {
        // **CORRECTION :** Appel à checkAuthAndInit déplacé ici
        checkAuthAndInit(); // Gère l'authentification ET lance initWebSocket

         // Gestion visibilité onglet pour reconnexion WS et marquage lu
         document.addEventListener('visibilitychange', () => {
             if (document.visibilityState === 'visible') {
                 if (!ws || ws.readyState !== WebSocket.OPEN) {
                     console.log("WebSocket Rider: Fenêtre visible, tentative reconnexion...");
                     initWebSocket();
                 } else if (chatOrderId && chatModalRiderEl?.classList.contains('show')) {
                     // Si chat ouvert, marquer comme lu
                     const lastMsgEl = chatMessagesRider?.lastElementChild;
                     if(lastMsgEl && lastMsgEl.dataset.messageId) {
                         markMessagesAsRead(chatOrderId, lastMsgEl.dataset.messageId);
                     }
                 }
                 // Rafraîchir compteurs au retour
                 updateSidebarCounters();
             }
         });
    };

    // Attendre AuthManager (inchangé)
    if (typeof AuthManager !== 'undefined') {
         document.addEventListener('authManagerReady', initializeApp);
         // Fallback si l'event est déjà passé
         if ((document.readyState === 'complete' || document.readyState === 'interactive') && typeof AuthManager.getUser === 'function' ) {
             if (!currentUser && AuthManager.getUser()) { // Vérifier si currentUser n'est pas déjà défini
                initializeApp();
             }
         }
     } else {
         console.error("AuthManager n'est pas défini. Vérifiez l'inclusion de auth.js.");
         // Fallback si auth.js est lent
         setTimeout(() => {
             if (typeof AuthManager !== 'undefined' && AuthManager.getUser()) {
                 if(!currentUser) initializeApp();
             } else if (!currentUser) {
                 showNotification("Erreur critique d'authentification.", "danger");
             }
         }, 1500);
     }
});